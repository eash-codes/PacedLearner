import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
  getAllProblems,
  getProblemById,
  getDueReviews,
  logSolveSession,
  gradeReview,
  updateProblemNotes,
  getAnalyticsStats,
  markProblemGithubSynced
} from './db.js';
import { analyzeCodeAndApproach, recommendEffortRating } from './approachAnalyzer.js';
import { analyzeCodeWithGemini, generateSocraticHint } from './aiService.js';
import { fsrsEngine } from './fsrs.js';
import { connectMongo } from './mongoDb.js';
import {
  getGitHubStatus,
  getGitHubConfig,
  saveGitHubConfig,
  listUserRepos,
  createRepository,
  pushProblemSolution,
  pushAllProblems
} from './githubService.js';

const app = express();
const PORT = process.env.PORT || 4100;

// Enable CORS for frontend and Chrome Extension
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'PacedLearner Core Engine',
    ai_models: {
      gemini: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      openrouter: process.env.OPENROUTER_MODEL || 'openrouter/auto',
      groq: process.env.GROQ_MODEL || 'groq/compound'
    },
    timestamp: new Date().toISOString()
  });
});

// Problems list with filters
app.get('/api/problems', (req, res) => {
  try {
    const { search, difficulty, topic, status } = req.query;
    const problems = getAllProblems({ search, difficulty, topic, status });
    res.json({ problems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Due reviews queue (Anki Mode)
app.get('/api/reviews/due', (req, res) => {
  try {
    const dueProblems = getDueReviews();
    res.json({
      due_count: dueProblems.length,
      problems: dueProblems
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single problem deep detail
app.get('/api/problems/:id', (req, res) => {
  try {
    const problem = getProblemById(req.params.id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    res.json({ problem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Socratic Recall Hint Endpoint (Powered by Gemini + OpenRouter Failover)
app.post('/api/reviews/:id/hint', async (req, res) => {
  try {
    const { hintLevel = 1 } = req.body;
    const problem = getProblemById(req.params.id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const hint = await generateSocraticHint(problem, Number(hintLevel));
    res.json({
      success: true,
      hintLevel: Number(hintLevel),
      hint
    });
  } catch (err) {
    console.error('[AI Hint Error]:', err);
    res.status(500).json({ error: 'Failed to generate AI hint: ' + err.message });
  }
});

// Submit review grade (FSRS)
app.post('/api/reviews/:id/grade', (req, res) => {
  try {
    const { rating, notes } = req.body;
    if (!rating || rating < 1 || rating > 4) {
      return res.status(400).json({ error: 'Rating must be between 1 (Again) and 4 (Easy)' });
    }
    const updated = gradeReview(req.params.id, Number(rating), notes || '');
    res.json({ success: true, problem: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Log solve from Chrome Extension or Manual submission
app.post('/api/sessions/log', async (req, res) => {
  try {
    const {
      id,
      title,
      slug,
      difficulty,
      url,
      tags = [],
      code = '',
      language = 'python3',
      timeSpentSeconds = 0,
      failedAttempts = 0,
      hintsViewed = 0,
      rating: explicitRating,
      customIntuition,
      customPitfalls
    } = req.body;

    if (!title || !url) {
      return res.status(400).json({ error: 'Title and URL are required' });
    }

    // Run baseline heuristic analysis
    let analysis = analyzeCodeAndApproach(code, tags, title);

    // If Gemini is available and code was provided, attempt deep AI analysis
    if (code && code.trim().length > 10) {
      try {
        const aiAnalysis = await analyzeCodeWithGemini(code, tags, title);
        if (aiAnalysis) {
          analysis = {
            patterns: aiAnalysis.patterns?.length ? aiAnalysis.patterns : analysis.patterns,
            time_complexity: aiAnalysis.time_complexity || analysis.time_complexity,
            space_complexity: aiAnalysis.space_complexity || analysis.space_complexity,
            intuition: aiAnalysis.intuition || analysis.intuition,
            pitfalls: aiAnalysis.pitfalls || ''
          };
        }
      } catch (aiErr) {
        console.warn('[AI Analysis] Fallback to regex analysis:', aiErr.message);
      }
    }

    // Heuristic rating suggestion if not explicitly provided
    let finalRating = explicitRating;
    if (!finalRating) {
      const recommendation = recommendEffortRating({
        timeSpentSeconds,
        failedAttempts,
        hintsViewed,
        difficulty
      });
      finalRating = recommendation.rating;
    }

    const savedProblem = logSolveSession({
      id: id || slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title,
      slug: slug || id,
      difficulty: difficulty || 'Medium',
      url,
      tags,
      patterns: analysis.patterns,
      intuition: customIntuition || analysis.intuition,
      time_complexity: analysis.time_complexity,
      space_complexity: analysis.space_complexity,
      code_snippet: code,
      language,
      pitfalls: customPitfalls || analysis.pitfalls || '',
      timeSpentSeconds,
      failedAttempts,
      rating: Number(finalRating)
    });

    // Auto-push to GitHub if requested or if auto-push is enabled in settings
    let githubPushResult = null;
    const ghConfig = getGitHubConfig();
    const shouldPush = req.body.pushToGitHub !== undefined ? !!req.body.pushToGitHub : ghConfig.autoPush;

    if (shouldPush && code && code.trim().length > 0) {
      try {
        const pushRes = await pushProblemSolution(savedProblem);
        markProblemGithubSynced(savedProblem.id, pushRes.fileUrl);
        githubPushResult = pushRes;
        console.log(`[GitHub Auto-Push] Synced ${savedProblem.title} -> ${pushRes.fileUrl}`);
      } catch (ghErr) {
        console.warn(`[GitHub Auto-Push Warning]: Failed for ${savedProblem.title}:`, ghErr.message);
      }
    }

    res.json({
      success: true,
      problem: savedProblem,
      analysis,
      fsrs_rating: finalRating,
      github_synced: !!githubPushResult,
      github_url: githubPushResult?.fileUrl || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update notes / intuition for a problem
app.put('/api/problems/:id/notes', (req, res) => {
  try {
    const updated = updateProblemNotes(req.params.id, req.body);
    res.json({ success: true, problem: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Code analyzer endpoint (used by extension or UI)
app.post('/api/analyze', async (req, res) => {
  try {
    const { code = '', tags = [], title = '', timeSpentSeconds = 0, failedAttempts = 0, difficulty = 'Medium' } = req.body;
    let analysis = analyzeCodeAndApproach(code, tags, title);

    if (code && code.trim().length > 10) {
      try {
        const aiAnalysis = await analyzeCodeWithGemini(code, tags, title);
        if (aiAnalysis) {
          analysis = { ...analysis, ...aiAnalysis };
        }
      } catch (err) {
        console.warn('[AI Analyze] Defaulting to heuristic:', err.message);
      }
    }

    const recommendation = recommendEffortRating({
      timeSpentSeconds,
      failedAttempts,
      hintsViewed: 0,
      difficulty
    });
    res.json({ analysis, recommendation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analytics & Retention metrics
app.get('/api/analytics', (req, res) => {
  try {
    const stats = getAnalyticsStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GitHub Integration Endpoints
app.get('/api/github/status', async (req, res) => {
  try {
    const status = await getGitHubStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/github/repos', async (req, res) => {
  try {
    const repos = await listUserRepos();
    res.json({ repos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/github/config', (req, res) => {
  try {
    const updated = saveGitHubConfig(req.body);
    res.json({ success: true, config: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/github/create-repo', async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Repository name is required' });
    }
    const repo = await createRepository({ name, description, isPrivate });
    res.json({ success: true, repo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/github/push/:id', async (req, res) => {
  try {
    const problem = getProblemById(req.params.id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    const pushResult = await pushProblemSolution(problem);
    markProblemGithubSynced(problem.id, pushResult.fileUrl);
    res.json({ success: true, ...pushResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/github/push-all', async (req, res) => {
  try {
    const problems = getAllProblems();
    const batchResult = await pushAllProblems(problems);
    
    // Mark successfully pushed problems in DB
    for (const r of batchResult.results) {
      if (r.success) {
        markProblemGithubSynced(r.id, r.url);
      }
    }
    res.json(batchResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, async () => {
  console.log(`🚀 PacedLearner Core Server running at http://localhost:${PORT}`);
  console.log(`✨ AI Engines loaded: Gemini 3.6 Flash (Primary), OpenRouter Auto-Routing (Fallback), Groq (Fast Inference)`);
  
  if (process.env.MONGODB_URI) {
    try {
      await connectMongo();
    } catch (err) {
      console.warn('⚠️ MongoDB Atlas initial connection deferred (running on local SQLite cache):', err.message);
    }
  }
});
