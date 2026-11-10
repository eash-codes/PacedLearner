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
  markProblemGithubSynced,
  getAllChokePoints,
  getDueChokePoints,
  getChokePointById,
  createChokePoint,
  deleteChokePoint,
  gradeChokeReview,
  getChokePointStats
} from './db.js';
import { analyzeCodeAndApproach, recommendEffortRating } from './approachAnalyzer.js';
import { analyzeCodeWithGemini, generateSocraticHint } from './aiService.js';
import {
  getOllamaStatusAndModels,
  chatWithPacey,
  synthesizePaceySpeech,
  transcribePaceyAudio
} from './paceyBrainService.js';
import {
  processInterrogationStep,
  generateFinalVerdict,
  analyzeCodeInFlight
} from './interrogationService.js';
import {
  runChokeCode,
  extractChokePoint,
  generatePaceyChokeVerdict
} from './chokePointService.js';
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

app.use(express.json({ limit: '25mb' }));

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

// =========================================================================
// PACEY MIND // LOCAL OLLAMA BRAIN & VOICE STUDIO READY ENDPOINTS
// =========================================================================

app.get('/api/pacey/models', async (req, res) => {
  try {
    const status = await getOllamaStatusAndModels();
    res.json(status);
  } catch (err) {
    res.status(500).json({ online: false, error: err.message });
  }
});

app.get('/api/pacey/voices', async (req, res) => {
  try {
    const status = await getOllamaStatusAndModels();
    res.json({ success: true, voices: status.voices || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, voices: [] });
  }
});

app.post('/api/pacey/chat', async (req, res) => {
  try {
    const { message, history = [], model = '', context = {} } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Enrich context with live vault telemetry if not already passed
    const enrichedContext = { ...context };
    if (enrichedContext.dueCount === undefined) {
      try {
        enrichedContext.dueCount = getDueReviews().length;
      } catch (e) {}
    }
    if (enrichedContext.totalProblems === undefined) {
      try {
        enrichedContext.totalProblems = getAllProblems().length;
      } catch (e) {}
    }

    const result = await chatWithPacey({
      message: String(message).trim(),
      history,
      model,
      context: enrichedContext
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('[Pacey Chat Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// VoiceStudio Text-to-Speech (POST http://127.0.0.1:3900/generate & /v1/audio/speech)
app.post('/api/pacey/tts', async (req, res) => {
  try {
    const {
      text,
      model = 'tts-1',
      voice = 'PaceyChinese',
      profile_id = '683e5f78',
      seed = 307702207,
      instruct = 'child, high pitch, chinese accent',
      num_step = 12,
      response_format = 'wav'
    } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }
    const audio = await synthesizePaceySpeech({
      text: String(text).trim(),
      model,
      voice,
      profileId: profile_id,
      seed,
      instruct,
      numStep: num_step,
      responseFormat: response_format
    });
    res.setHeader('Content-Type', audio.contentType || 'audio/wav');
    res.send(audio.buffer);
  } catch (err) {
    console.error('[Pacey VoiceStudio TTS Error]:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// VoiceStudio Speech-to-Text (POST http://127.0.0.1:3900/v1/audio/transcriptions)
app.post('/api/pacey/stt', async (req, res) => {
  try {
    const { audioBase64, filename = 'speech.wav', mimeType = 'audio/wav', model = 'whisper-1' } = req.body || {};
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required for transcription' });
    }
    const cleanB64 = String(audioBase64).replace(/^data:audio\/[^;]+;base64,/, '');
    const audioBuffer = Buffer.from(cleanB64, 'base64');
    const result = await transcribePaceyAudio({
      audioBuffer,
      filename,
      mimeType,
      model
    });
    res.json({
      success: true,
      text: result.text
    });
  } catch (err) {
    console.error('[Pacey VoiceStudio STT Error]:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// =========================================================================
// PACEY LIVE INTERROGATION ENGINE // MOCK INTERVIEWER ENDPOINTS
// =========================================================================

// Real-time interrogation dialogue & interruption step
app.post('/api/pacey/interrogate', async (req, res) => {
  try {
    const {
      problem = {},
      code = '',
      language = 'python',
      phase = 'INTUITION',
      trigger = 'user_spoke',
      userSpeech = '',
      silenceSeconds = 0,
      history = []
    } = req.body || {};

    const stepResult = await processInterrogationStep({
      problem,
      code,
      language,
      phase,
      trigger,
      userSpeech,
      silenceSeconds,
      history
    });

    res.json(stepResult);
  } catch (err) {
    console.error('[Interrogate Step Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Real-time code telemetry analyzer for active editor
app.post('/api/pacey/interrogate/analyze-code', (req, res) => {
  try {
    const { code = '', language = 'python' } = req.body || {};
    const telemetry = analyzeCodeInFlight(code, language);
    res.json({ success: true, telemetry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Conclude interview & generate FAANG Scorecard
app.post('/api/pacey/interrogate/verdict', async (req, res) => {
  try {
    const {
      problem = {},
      code = '',
      language = 'python',
      transcript = [],
      timeSpentSeconds = 0,
      silenceCount = 0
    } = req.body || {};

    const verdictResult = await generateFinalVerdict({
      problem,
      code,
      language,
      transcript,
      timeSpentSeconds,
      silenceCount
    });

    // If problem ID exists and scorecard has an FSRS grade, log it directly to FSRS
    if (problem.id && verdictResult.scorecard?.fsrsGrade) {
      try {
        const grade = Math.max(1, Math.min(4, Math.round(Number(verdictResult.scorecard.fsrsGrade) || 1)));
        gradeReview(problem.id, grade);
      } catch (e) {
        console.warn('[FSRS Auto-grade deferred]:', e.message);
      }
    }

    res.json(verdictResult);
  } catch (err) {
    console.error('[Verdict Generation Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// CHOKE-POINT SURGERY API ROUTES
// ==========================================

// Get all choke points
app.get('/api/choke-points', (req, res) => {
  try {
    const chokePoints = getAllChokePoints();
    res.json({ success: true, choke_points: chokePoints });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get due choke points for today
app.get('/api/choke-points/due', (req, res) => {
  try {
    const dueChokePoints = getDueChokePoints();
    res.json({ success: true, choke_points: dueChokePoints });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get choke points statistics
app.get('/api/choke-points/stats', (req, res) => {
  try {
    const stats = getChokePointStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get a single choke point by ID
app.get('/api/choke-points/:id', (req, res) => {
  try {
    const cp = getChokePointById(req.params.id);
    if (!cp) return res.status(404).json({ success: false, error: 'Choke point not found' });
    res.json({ success: true, choke_point: cp });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Auto-extract choke point from problem code
app.post('/api/choke-points/extract', async (req, res) => {
  try {
    const { code, language = 'javascript', title = '', intuition = '', problemId = null } = req.body || {};
    if (!code) {
      return res.status(400).json({ success: false, error: 'Code is required for extraction' });
    }
    const extracted = await extractChokePoint({ code, language, title, intuition, problemId });
    res.json({ success: true, choke_point: extracted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create/Save a choke point
app.post('/api/choke-points', (req, res) => {
  try {
    const {
      id,
      problem_id,
      title,
      target_function,
      description,
      language = 'javascript',
      choke_code,
      scaffold_code,
      test_cases = []
    } = req.body || {};

    if (!title || !choke_code || !scaffold_code) {
      return res.status(400).json({ success: false, error: 'title, choke_code, and scaffold_code are required' });
    }

    const created = createChokePoint({
      id,
      problem_id,
      title,
      target_function,
      description: description || `Complete the ${target_function || 'algorithmic'} hinge`,
      language,
      choke_code,
      scaffold_code,
      test_cases
    });

    res.json({ success: true, choke_point: created });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dry-run user code against choke point tests (no review logged)
app.post('/api/choke-points/:id/run', (req, res) => {
  try {
    const cp = getChokePointById(req.params.id);
    if (!cp) return res.status(404).json({ success: false, error: 'Choke point not found' });

    const { user_code = '' } = req.body || {};
    const testRun = runChokeCode({
      scaffoldCode: cp.scaffold_code,
      userCode: user_code,
      testCases: cp.test_cases,
      targetFunction: cp.target_function,
      language: cp.language
    });

    res.json({ success: true, test_run: testRun });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Submit final surgery drill review (grades FSRS and generates Pacey roast/verdict)
app.post('/api/choke-points/:id/review', async (req, res) => {
  try {
    const cp = getChokePointById(req.params.id);
    if (!cp) return res.status(404).json({ success: false, error: 'Choke point not found' });

    const { user_code = '', elapsed_ms = 0, explicit_rating = null } = req.body || {};

    // 1. Run unit tests
    const testRun = runChokeCode({
      scaffoldCode: cp.scaffold_code,
      userCode: user_code,
      testCases: cp.test_cases,
      targetFunction: cp.target_function,
      language: cp.language
    });

    // 2. Generate Pacey's psychological verdict
    const paceyVerdict = await generatePaceyChokeVerdict({
      chokePoint: cp,
      passed: testRun.passed,
      elapsedMs: elapsed_ms,
      passedCount: testRun.passedCount,
      total: testRun.total,
      error: testRun.syntaxError || (testRun.results.find(r => !r.passed)?.error)
    });

    // 3. Determine FSRS rating (use explicit if provided, otherwise derived from verdict)
    const rating = explicit_rating || paceyVerdict.rating;

    // 4. Record review in DB and update FSRS intervals
    const updatedChokePoint = gradeChokeReview(cp.id, {
      rating,
      elapsed_ms,
      user_code,
      passed: testRun.passed ? 1 : 0,
      test_results: testRun.results,
      pacey_critique: paceyVerdict.critique
    });

    res.json({
      success: true,
      choke_point: updatedChokePoint,
      test_run: testRun,
      pacey_verdict: paceyVerdict
    });
  } catch (err) {
    console.error('[Choke Review Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete choke point
app.delete('/api/choke-points/:id', (req, res) => {
  try {
    const success = deleteChokePoint(req.params.id);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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
