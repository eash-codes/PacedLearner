import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fsrsEngine, Rating, State } from './fsrs.js';
import { INITIAL_PROBLEMS } from './seedData.js';
import { Problem as MongoProblem } from './mongoDb.js';

// Non-blocking sync to MongoDB Atlas
async function syncProblemToMongo(problemId) {
  try {
    const p = getProblemById(problemId);
    if (!p) return;
    await MongoProblem.findOneAndUpdate(
      { id: p.id },
      {
        id: p.id,
        title: p.title,
        slug: p.slug,
        difficulty: p.difficulty,
        url: p.url,
        tags: p.tags,
        patterns: p.patterns,
        intuition: p.intuition,
        time_complexity: p.time_complexity,
        space_complexity: p.space_complexity,
        code_snippet: p.code_snippet,
        language: p.language,
        pitfalls: p.pitfalls,
        fsrs_stability: p.fsrs_stability,
        fsrs_difficulty: p.fsrs_difficulty,
        fsrs_reps: p.fsrs_reps,
        fsrs_lapses: p.fsrs_lapses,
        fsrs_state: p.fsrs_state,
        retrievability: p.retrievability,
        interval_days: p.interval_days,
        next_review_date: new Date(p.next_review_date),
        last_reviewed_at: p.last_reviewed_at ? new Date(p.last_reviewed_at) : null,
        timeSpentSeconds: p.total_time_spent || 0,
        attempts_count: p.attempts_count || 1,
        failedAttempts: p.failedAttempts || 0,
        reviews: (p.reviews || []).map(r => ({
          rating: r.rating,
          reviewed_at: new Date(r.reviewed_at),
          interval_days: r.interval_days,
          stability_before: r.stability_before,
          stability_after: r.stability_after,
          notes: r.notes || ''
        }))
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    // Non-blocking: fail quietly if offline or network slow
    console.warn(`[Mongo Sync Warning for ${problemId}]:`, err.message);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = path.resolve(__dirname, '../data');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'paced_learner.db');
export const db = new DatabaseSync(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS problems (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    url TEXT NOT NULL,
    tags TEXT NOT NULL,
    patterns TEXT NOT NULL,
    intuition TEXT,
    time_complexity TEXT,
    space_complexity TEXT,
    code_snippet TEXT,
    language TEXT DEFAULT 'python3',
    pitfalls TEXT,
    fsrs_stability REAL DEFAULT 1.0,
    fsrs_difficulty REAL DEFAULT 5.0,
    fsrs_reps INTEGER DEFAULT 0,
    fsrs_lapses INTEGER DEFAULT 0,
    fsrs_state TEXT DEFAULT 'Learning',
    retrievability REAL DEFAULT 1.0,
    interval_days INTEGER DEFAULT 1,
    next_review_date TEXT NOT NULL,
    last_reviewed_at TEXT,
    mastery_level TEXT DEFAULT 'Learning',
    consecutive_clean INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0,
    attempts_count INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    time_spent_seconds INTEGER DEFAULT 0,
    failed_attempts INTEGER DEFAULT 0,
    stability_before REAL,
    stability_after REAL,
    interval_days INTEGER,
    notes TEXT,
    reviewed_at TEXT NOT NULL,
    FOREIGN KEY(problem_id) REFERENCES problems(id)
  );

  CREATE TABLE IF NOT EXISTS streaks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    reviews_completed INTEGER DEFAULT 0,
    solves_completed INTEGER DEFAULT 0
  );
`);

// Migration for GitHub sync tracking columns
try {
  db.exec(`ALTER TABLE problems ADD COLUMN github_synced_at TEXT`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE problems ADD COLUMN github_url TEXT`);
} catch (e) {}

export function markProblemGithubSynced(problemId, githubUrl) {
  const now = new Date().toISOString();
  db.prepare('UPDATE problems SET github_synced_at = ?, github_url = ? WHERE id = ? OR slug = ?').run(now, githubUrl, problemId, problemId);
  return getProblemById(problemId);
}


// Seed initial data only if explicitly requested via SEED_INITIAL_DATA=true
if (process.env.SEED_INITIAL_DATA === 'true') {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM problems');
  const rowCount = countStmt.get();
  if (rowCount.count === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO problems (
        id, title, slug, difficulty, url, tags, patterns, intuition,
        time_complexity, space_complexity, code_snippet, language, pitfalls,
        fsrs_stability, fsrs_difficulty, fsrs_reps, fsrs_lapses, fsrs_state,
        retrievability, interval_days, next_review_date, last_reviewed_at,
        mastery_level, consecutive_clean, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    const now = new Date().toISOString();
    for (const p of INITIAL_PROBLEMS) {
      insertStmt.run(
        p.id, p.title, p.slug, p.difficulty, p.url, p.tags, p.patterns, p.intuition,
        p.time_complexity, p.space_complexity, p.code_snippet, p.language, p.pitfalls,
        p.fsrs_stability, p.fsrs_difficulty, p.fsrs_reps, p.fsrs_lapses, p.fsrs_state,
        p.retrievability, p.interval_days, p.next_review_date, p.last_reviewed_at,
        p.mastery_level, p.consecutive_clean, now, now
      );
    }
  }
}

/**
 * DB Helper API Methods
 */

export function getAllProblems({ search = '', difficulty = 'all', topic = 'all', status = 'all' } = {}) {
  let query = 'SELECT * FROM problems WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (title LIKE ? OR tags LIKE ? OR patterns LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  if (difficulty && difficulty !== 'all') {
    query += ' AND difficulty = ?';
    params.push(difficulty);
  }

  if (status && status !== 'all') {
    query += ' AND mastery_level = ?';
    params.push(status);
  }

  if (topic && topic !== 'all') {
    query += ' AND (tags LIKE ? OR patterns LIKE ?)';
    const t = `%${topic}%`;
    params.push(t, t);
  }

  query += ' ORDER BY next_review_date ASC';
  const stmt = db.prepare(query);
  const rows = stmt.all(...params);

  // Recalculate live retrievability for every card
  const now = Date.now();
  return rows.map(r => {
    const lastTime = r.last_reviewed_at ? new Date(r.last_reviewed_at).getTime() : new Date(r.created_at).getTime();
    const elapsedDays = Math.max(0, (now - lastTime) / (1000 * 60 * 60 * 24));
    const liveR = fsrsEngine.getRetrievability(elapsedDays, r.fsrs_stability);
    return {
      ...r,
      tags: JSON.parse(r.tags || '[]'),
      patterns: JSON.parse(r.patterns || '[]'),
      retrievability: Number(liveR.toFixed(3)),
      is_due: new Date(r.next_review_date).getTime() <= now || liveR < 0.90
    };
  });
}

export function getProblemById(id) {
  const stmt = db.prepare('SELECT * FROM problems WHERE id = ? OR slug = ?');
  const r = stmt.get(id, id);
  if (!r) return null;

  const now = Date.now();
  const lastTime = r.last_reviewed_at ? new Date(r.last_reviewed_at).getTime() : new Date(r.created_at).getTime();
  const elapsedDays = Math.max(0, (now - lastTime) / (1000 * 60 * 60 * 24));
  const liveR = fsrsEngine.getRetrievability(elapsedDays, r.fsrs_stability);

  // Get reviews history
  const reviewsStmt = db.prepare('SELECT * FROM reviews WHERE problem_id = ? ORDER BY reviewed_at DESC');
  const reviews = reviewsStmt.all(r.id);

  // Previews for the 4 FSRS options
  const preview = fsrsEngine.previewRatings({
    stability: r.fsrs_stability,
    difficulty: r.fsrs_difficulty,
    reps: r.fsrs_reps,
    lapses: r.fsrs_lapses,
    last_review: r.last_reviewed_at
  });

  return {
    ...r,
    tags: JSON.parse(r.tags || '[]'),
    patterns: JSON.parse(r.patterns || '[]'),
    retrievability: Number(liveR.toFixed(3)),
    is_due: new Date(r.next_review_date).getTime() <= now || liveR < 0.90,
    reviews,
    preview
  };
}

export function getDueReviews() {
  const all = getAllProblems();
  return all.filter(p => p.is_due).sort((a, b) => a.retrievability - b.retrievability);
}

export function logSolveSession({
  id,
  title,
  slug,
  difficulty = 'Medium',
  url,
  tags = [],
  patterns = [],
  intuition = '',
  time_complexity = 'O(N)',
  space_complexity = 'O(1)',
  code_snippet = '',
  language = 'python3',
  pitfalls = '',
  timeSpentSeconds = 0,
  failedAttempts = 0,
  rating = 3 // 1: Again, 2: Hard, 3: Good, 4: Easy
}) {
  const problemId = id || slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const problemSlug = slug || problemId;
  const now = new Date().toISOString();

  // Check if exists
  const existing = db.prepare('SELECT * FROM problems WHERE id = ?').get(problemId);

  let fsrsState;
  let masteryLevel = 'Learning';
  let consecutive = 1;

  if (existing) {
    // Treat as subsequent review
    fsrsState = fsrsEngine.review({
      stability: existing.fsrs_stability,
      difficulty: existing.fsrs_difficulty,
      reps: existing.fsrs_reps,
      lapses: existing.fsrs_lapses,
      last_review: existing.last_reviewed_at
    }, rating);

    consecutive = rating >= 3 ? (existing.consecutive_clean + 1) : 0;
    if (fsrsEngine.isMastered(fsrsState.stability, fsrsState.reps, consecutive)) {
      masteryLevel = 'Mastered';
    } else if (fsrsState.stability > 14) {
      masteryLevel = 'Retained';
    } else if (fsrsState.stability > 3) {
      masteryLevel = 'Reviewing';
    } else {
      masteryLevel = 'Learning';
    }

    const updateStmt = db.prepare(`
      UPDATE problems SET
        title = ?,
        difficulty = ?,
        url = ?,
        tags = ?,
        patterns = ?,
        intuition = COALESCE(?, intuition),
        time_complexity = COALESCE(?, time_complexity),
        space_complexity = COALESCE(?, space_complexity),
        code_snippet = COALESCE(?, code_snippet),
        language = ?,
        pitfalls = COALESCE(?, pitfalls),
        fsrs_stability = ?,
        fsrs_difficulty = ?,
        fsrs_reps = ?,
        fsrs_lapses = ?,
        fsrs_state = ?,
        retrievability = ?,
        interval_days = ?,
        next_review_date = ?,
        last_reviewed_at = ?,
        mastery_level = ?,
        consecutive_clean = ?,
        total_time_spent = total_time_spent + ?,
        attempts_count = attempts_count + ?,
        updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      title, difficulty, url, JSON.stringify(tags), JSON.stringify(patterns),
      intuition, time_complexity, space_complexity, code_snippet, language, pitfalls,
      fsrsState.stability, fsrsState.difficulty, fsrsState.reps, fsrsState.lapses,
      fsrsState.state, fsrsState.retrievability, fsrsState.interval_days,
      fsrsState.next_review_date, now, masteryLevel, consecutive,
      timeSpentSeconds, failedAttempts, now, problemId
    );
  } else {
    // Brand new problem
    fsrsState = fsrsEngine.initReview(rating);
    masteryLevel = fsrsState.stability >= 5 ? 'Reviewing' : 'Learning';

    const insertStmt = db.prepare(`
      INSERT INTO problems (
        id, title, slug, difficulty, url, tags, patterns, intuition,
        time_complexity, space_complexity, code_snippet, language, pitfalls,
        fsrs_stability, fsrs_difficulty, fsrs_reps, fsrs_lapses, fsrs_state,
        retrievability, interval_days, next_review_date, last_reviewed_at,
        mastery_level, consecutive_clean, total_time_spent, attempts_count,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?
      )
    `);

    insertStmt.run(
      problemId, title, problemSlug, difficulty, url, JSON.stringify(tags), JSON.stringify(patterns),
      intuition, time_complexity, space_complexity, code_snippet, language, pitfalls,
      fsrsState.stability, fsrsState.difficulty, fsrsState.reps, fsrsState.lapses,
      fsrsState.state, 1.0, fsrsState.interval_days, fsrsState.next_review_date, now,
      masteryLevel, consecutive, timeSpentSeconds, failedAttempts + 1, now, now
    );
  }

  // Record review log
  const revStmt = db.prepare(`
    INSERT INTO reviews (
      problem_id, rating, time_spent_seconds, failed_attempts,
      stability_before, stability_after, interval_days, notes, reviewed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  revStmt.run(
    problemId, rating, timeSpentSeconds, failedAttempts,
    existing ? existing.fsrs_stability : 0, fsrsState.stability,
    fsrsState.interval_days, intuition || 'Solved via LeetCode Watcher', now
  );

  // Update daily streak
  recordStreakDay(now, 1, 0);

  syncProblemToMongo(problemId);
  return getProblemById(problemId);
}

export function gradeReview(problemId, rating, notes = '') {
  const p = db.prepare('SELECT * FROM problems WHERE id = ?').get(problemId);
  if (!p) throw new Error('Problem not found');

  const now = new Date().toISOString();
  const fsrsState = fsrsEngine.review({
    stability: p.fsrs_stability,
    difficulty: p.fsrs_difficulty,
    reps: p.fsrs_reps,
    lapses: p.fsrs_lapses,
    last_review: p.last_reviewed_at
  }, rating);

  const consecutive = rating >= 3 ? (p.consecutive_clean + 1) : 0;
  let masteryLevel = p.mastery_level;
  if (fsrsEngine.isMastered(fsrsState.stability, fsrsState.reps, consecutive)) {
    masteryLevel = 'Mastered';
  } else if (fsrsState.stability > 14) {
    masteryLevel = 'Retained';
  } else if (fsrsState.stability > 3) {
    masteryLevel = 'Reviewing';
  } else {
    masteryLevel = 'Learning';
  }

  const updateStmt = db.prepare(`
    UPDATE problems SET
      fsrs_stability = ?,
      fsrs_difficulty = ?,
      fsrs_reps = ?,
      fsrs_lapses = ?,
      fsrs_state = ?,
      retrievability = ?,
      interval_days = ?,
      next_review_date = ?,
      last_reviewed_at = ?,
      mastery_level = ?,
      consecutive_clean = ?,
      updated_at = ?
    WHERE id = ?
  `);

  updateStmt.run(
    fsrsState.stability, fsrsState.difficulty, fsrsState.reps, fsrsState.lapses,
    fsrsState.state, fsrsState.retrievability, fsrsState.interval_days,
    fsrsState.next_review_date, now, masteryLevel, consecutive, now, problemId
  );

  const revStmt = db.prepare(`
    INSERT INTO reviews (
      problem_id, rating, time_spent_seconds, failed_attempts,
      stability_before, stability_after, interval_days, notes, reviewed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  revStmt.run(
    problemId, rating, 0, 0,
    p.fsrs_stability, fsrsState.stability, fsrsState.interval_days, notes, now
  );

  recordStreakDay(now, 0, 1);
  syncProblemToMongo(problemId);
  return getProblemById(problemId);
}

export function updateProblemNotes(id, { intuition, pitfalls, tags, patterns, time_complexity, space_complexity }) {
  const fields = [];
  const params = [];

  if (intuition !== undefined) { fields.push('intuition = ?'); params.push(intuition); }
  if (pitfalls !== undefined) { fields.push('pitfalls = ?'); params.push(pitfalls); }
  if (tags !== undefined) { fields.push('tags = ?'); params.push(JSON.stringify(tags)); }
  if (patterns !== undefined) { fields.push('patterns = ?'); params.push(JSON.stringify(patterns)); }
  if (time_complexity !== undefined) { fields.push('time_complexity = ?'); params.push(time_complexity); }
  if (space_complexity !== undefined) { fields.push('space_complexity = ?'); params.push(space_complexity); }

  if (fields.length === 0) return getProblemById(id);

  fields.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  db.prepare(`UPDATE problems SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  syncProblemToMongo(id);
  return getProblemById(id);
}

function recordStreakDay(isoDate, solves = 0, reviews = 0) {
  const day = isoDate.split('T')[0];
  const existing = db.prepare('SELECT * FROM streaks WHERE date = ?').get(day);
  if (existing) {
    db.prepare('UPDATE streaks SET solves_completed = solves_completed + ?, reviews_completed = reviews_completed + ? WHERE date = ?')
      .run(solves, reviews, day);
  } else {
    db.prepare('INSERT INTO streaks (date, solves_completed, reviews_completed) VALUES (?, ?, ?)')
      .run(day, solves, reviews);
  }
}

export function getAnalyticsStats() {
  const problems = getAllProblems();
  const total = problems.length;
  const dueToday = problems.filter(p => p.is_due).length;

  const masteryCounts = {
    Learning: 0,
    Reviewing: 0,
    Retained: 0,
    Mastered: 0
  };

  const difficultyCounts = {
    Easy: 0,
    Medium: 0,
    Hard: 0
  };

  const topicMap = {};
  let totalRetention = 0;

  for (const p of problems) {
    masteryCounts[p.mastery_level] = (masteryCounts[p.mastery_level] || 0) + 1;
    difficultyCounts[p.difficulty] = (difficultyCounts[p.difficulty] || 0) + 1;
    totalRetention += p.retrievability;

    for (const t of (p.patterns.length > 0 ? p.patterns : p.tags)) {
      topicMap[t] = (topicMap[t] || 0) + 1;
    }
  }

  const avgRetention = total > 0 ? Number((totalRetention / total).toFixed(2)) : 1.0;

  // Streaks
  const streaks = db.prepare('SELECT * FROM streaks ORDER BY date DESC LIMIT 30').all();

  return {
    total_problems: total,
    due_today: dueToday,
    mastered_count: masteryCounts.Mastered,
    learning_count: masteryCounts.Learning,
    reviewing_count: masteryCounts.Reviewing,
    retained_count: masteryCounts.Retained,
    avg_retention: avgRetention,
    mastery_breakdown: masteryCounts,
    difficulty_breakdown: difficultyCounts,
    topic_distribution: topicMap,
    recent_activity: streaks
  };
}
