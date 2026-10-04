import { DatabaseSync } from 'node:sqlite';
import os from 'node:os';
import path from 'node:path';
import 'dotenv/config';
import { db } from './db.js';
import { connectMongo, Problem as MongoProblem } from './mongoDb.js';
import { fsrsEngine } from './fsrs.js';

function cleanHtml(str = '') {
  return str
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function extractLeetCodeUrl(text = '') {
  const match = text.match(/https?:\/\/(?:www\.)?leetcode\.com\/problems\/([a-z0-9-]+)/i);
  if (match) {
    return {
      url: `https://leetcode.com/problems/${match[1]}/`,
      slug: match[1]
    };
  }
  return null;
}

export async function importLearningFromAnkiAndNotion() {
  console.log('🔄 Starting learning transfer from local Anki & Notion...');

  const ankiDbPath = path.join(os.homedir(), 'Library/Application Support/Anki2/User 1/collection.anki2');
  const notionDbPath = path.join(os.homedir(), 'Library/Application Support/Notion/notion.db');

  let ankiDb, notionDb;
  try {
    ankiDb = new DatabaseSync(ankiDbPath);
  } catch (err) {
    console.error('Failed to open Anki database:', err.message);
    return;
  }

  try {
    notionDb = new DatabaseSync(notionDbPath);
  } catch (err) {
    console.warn('Could not open Notion database directly (using Anki embedded links):', err.message);
  }

  // 1. Build Notion Lookup by title/slug
  const notionMap = new Map();
  if (notionDb) {
    try {
      const notionPages = notionDb.prepare(`
        SELECT id, properties FROM block 
        WHERE parent_id = 'd06630f2-a956-4a15-a9b2-fccb98ae7c92' AND alive = 1
      `).all();

      for (const p of notionPages) {
        try {
          const props = JSON.parse(p.properties || '{}');
          const title = props.title?.[0]?.[0]?.trim();
          if (!title || title.includes('Template')) continue;

          const difficulty = props.AJyo?.[0]?.[0] || 'Medium';
          const topic = props['Mr^I']?.[0]?.[0] || 'Algorithms';
          const status = props['`f;?']?.[0]?.[0] || 'Learning';
          const confidence = props['mD|K']?.[0]?.[0] || '';
          const solveDate = props['\\Kaq']?.[0]?.[1]?.[0]?.[1]?.start_date || null;
          const intuitionNotes = props['Zzb^']?.[0]?.[0] || '';

          const normalizedKey = title.toLowerCase().replace(/[^a-z0-9]/g, '');
          notionMap.set(normalizedKey, {
            id: p.id,
            title,
            difficulty,
            topic,
            status,
            confidence,
            solveDate,
            intuitionNotes
          });
        } catch (e) {}
      }
      console.log(`📑 Indexed ${notionMap.size} problem entries from Notion database.`);
    } catch (e) {
      console.warn('Could not parse Notion blocks:', e.message);
    }
  }

  // 2. Fetch all Anki Notes, Cards, and Revlogs
  const ankiNotes = ankiDb.prepare('SELECT id, flds, tags FROM notes').all();
  console.log(`🗂️ Found ${ankiNotes.length} Anki problem notes to import.`);

  const now = new Date();
  const importedProblems = [];

  for (const note of ankiNotes) {
    const fields = note.flds.split('\x1f');
    const rawTitleAndUrl = fields[0] || '';
    const rawQuestion = fields[1] || '';
    const rawIntuition = fields[2] || '';
    const rawComplexity = fields[3] || '';
    const rawNotionLink = fields[4] || '';

    // Extract title
    let title = cleanHtml(rawTitleAndUrl.split('&nbsp;')[0].split('http')[0]).trim();
    if (!title) title = 'Untitled Problem';

    // Normalize key
    const normalizedKey = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const notionData = notionMap.get(normalizedKey) || {};

    // URL & Slug
    let lcInfo = extractLeetCodeUrl(rawTitleAndUrl);
    if (!lcInfo && rawNotionLink) {
      lcInfo = extractLeetCodeUrl(rawNotionLink);
    }
    const slug = lcInfo ? lcInfo.slug : title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const url = lcInfo ? lcInfo.url : `https://leetcode.com/problems/${slug}/`;

    // Difficulty
    let difficulty = notionData.difficulty || 'Medium';
    if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
      difficulty = 'Medium';
    }

    // Tags & Patterns
    const tags = [];
    if (notionData.topic) tags.push(notionData.topic);
    if (note.tags) {
      note.tags.split(' ').filter(Boolean).forEach(t => tags.push(t));
    }
    if (tags.length === 0) tags.push('Algorithms');

    const patterns = [];
    if (rawQuestion) patterns.push(cleanHtml(rawQuestion));

    // Complexity parse
    const cleanComp = cleanHtml(rawComplexity);
    let timeComp = 'O(N)';
    let spaceComp = 'O(1)';
    const timeMatch = cleanComp.match(/Time:\s*([^\n,]+)/i) || cleanComp.match(/(O\([^)]+\))/i);
    if (timeMatch) timeComp = timeMatch[1].trim();
    const spaceMatch = cleanComp.match(/Space:\s*([^\n,]+)/i) || cleanComp.match(/Auxiliary Space:\s*([^\n,]+)/i);
    if (spaceMatch) spaceComp = spaceMatch[1].trim();

    // Intuition & Pitfalls
    let intuition = cleanHtml(rawIntuition);
    if (notionData.intuitionNotes && !intuition.includes(notionData.intuitionNotes)) {
      intuition += '\n\n' + notionData.intuitionNotes;
    }
    let pitfalls = '';
    if (intuition.includes('Critical Edge Case') || intuition.includes('Bug to Avoid')) {
      const split = intuition.split(/⚠️|Critical Edge Case/);
      intuition = split[0].trim();
      pitfalls = (split[1] || '').trim();
    }

    // Card scheduling & FSRS parameters
    const card = ankiDb.prepare('SELECT * FROM cards WHERE nid = ?').get(note.id);
    let stability = 2.5;
    let cardDifficulty = 5.0;
    let reps = 0;
    let lapses = 0;
    let intervalDays = 1;
    let nextReviewDate = new Date();
    let lastReviewedAt = null;

    if (card) {
      reps = card.reps || 0;
      lapses = card.lapses || 0;
      intervalDays = Math.max(1, card.ivl || 1);

      // Check if FSRS JSON data is present in card
      if (card.data) {
        try {
          const parsedData = JSON.parse(card.data);
          if (parsedData.s) stability = Number(parsedData.s);
          if (parsedData.d) cardDifficulty = Number(parsedData.d);
          if (parsedData.lrt) lastReviewedAt = new Date(parsedData.lrt * 1000).toISOString();
        } catch (e) {}
      }

      if (!lastReviewedAt && card.mod) {
        lastReviewedAt = new Date(card.mod * 1000).toISOString();
      }

      // Next review calculation
      if (lastReviewedAt) {
        const lastTime = new Date(lastReviewedAt).getTime();
        nextReviewDate = new Date(lastTime + intervalDays * 24 * 60 * 60 * 1000);
      } else {
        nextReviewDate = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);
      }
    }

    // Mastery status
    let masteryLevel = 'Learning';
    if (notionData.status === 'Mastered' || stability > 21 || reps >= 3) {
      masteryLevel = 'Mastered';
    } else if (stability > 10) {
      masteryLevel = 'Retained';
    } else if (stability > 3 || reps >= 1) {
      masteryLevel = 'Reviewing';
    }

    // Revlog
    const revlogs = card ? ankiDb.prepare('SELECT * FROM revlog WHERE cid = ? ORDER BY id ASC').all(card.id) : [];
    const formattedReviews = revlogs.map(r => {
      const revDate = new Date(r.id).toISOString();
      return {
        rating: Math.min(4, Math.max(1, r.ease)),
        time_spent_seconds: Math.round((r.time || 30000) / 1000),
        failed_attempts: r.ease === 1 ? 1 : 0,
        stability_before: stability,
        stability_after: stability,
        interval_days: r.ivl,
        notes: `Imported from Anki review (${r.ease === 4 ? 'Easy' : r.ease === 3 ? 'Good' : r.ease === 2 ? 'Hard' : 'Again'})`,
        reviewed_at: revDate
      };
    });

    const elapsedDays = lastReviewedAt ? Math.max(0, (now.getTime() - new Date(lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const retrievability = Number(fsrsEngine.getRetrievability(elapsedDays, stability).toFixed(3));

    const problemRecord = {
      id: slug,
      title,
      slug,
      difficulty,
      url,
      tags,
      patterns,
      intuition,
      time_complexity: timeComp,
      space_complexity: spaceComp,
      code_snippet: '',
      language: 'python3',
      pitfalls,
      fsrs_stability: stability,
      fsrs_difficulty: cardDifficulty,
      fsrs_reps: reps,
      fsrs_lapses: lapses,
      fsrs_state: masteryLevel === 'Mastered' ? 'Review' : 'Learning',
      retrievability,
      interval_days: intervalDays,
      next_review_date: nextReviewDate.toISOString(),
      last_reviewed_at: lastReviewedAt,
      mastery_level: masteryLevel,
      consecutive_clean: reps,
      total_time_spent: formattedReviews.reduce((sum, r) => sum + r.time_spent_seconds, 0),
      attempts_count: Math.max(1, reps),
      created_at: notionData.solveDate ? new Date(notionData.solveDate).toISOString() : (lastReviewedAt || now.toISOString()),
      updated_at: now.toISOString(),
      reviews: formattedReviews
    };

    // Save to SQLite
    upsertProblemToSqlite(problemRecord);

    importedProblems.push(problemRecord);
  }

  console.log(`✅ Successfully loaded & merged ${importedProblems.length} problems into local SQLite.`);

  // 3. Sync to MongoDB Atlas
  try {
    await connectMongo();
    for (const p of importedProblems) {
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
          timeSpentSeconds: p.total_time_spent,
          attempts_count: p.attempts_count,
          failedAttempts: 0,
          reviews: p.reviews.map(r => ({
            rating: r.rating,
            reviewed_at: new Date(r.reviewed_at),
            interval_days: r.interval_days,
            stability_before: r.stability_before,
            stability_after: r.stability_after,
            notes: r.notes
          }))
        },
        { upsert: true, new: true }
      );
    }
    console.log(`🍃 Synced all ${importedProblems.length} problems and review logs to MongoDB Atlas!`);
  } catch (err) {
    console.warn('MongoDB Atlas sync warning during import:', err.message);
  }

  return importedProblems;
}

function upsertProblemToSqlite(p) {
  const existing = db.prepare('SELECT id FROM problems WHERE id = ?').get(p.id);

  if (existing) {
    const updateStmt = db.prepare(`
      UPDATE problems SET
        title = ?,
        slug = ?,
        difficulty = ?,
        url = ?,
        tags = ?,
        patterns = ?,
        intuition = ?,
        time_complexity = ?,
        space_complexity = ?,
        pitfalls = ?,
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
        total_time_spent = ?,
        attempts_count = ?,
        updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      p.title, p.slug, p.difficulty, p.url, JSON.stringify(p.tags), JSON.stringify(p.patterns),
      p.intuition, p.time_complexity, p.space_complexity, p.pitfalls,
      p.fsrs_stability, p.fsrs_difficulty, p.fsrs_reps, p.fsrs_lapses,
      p.fsrs_state, p.retrievability, p.interval_days, p.next_review_date,
      p.last_reviewed_at, p.mastery_level, p.consecutive_clean, p.total_time_spent,
      p.attempts_count, p.updated_at, p.id
    );
  } else {
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
      p.id, p.title, p.slug, p.difficulty, p.url, JSON.stringify(p.tags), JSON.stringify(p.patterns),
      p.intuition, p.time_complexity, p.space_complexity, p.code_snippet, p.language, p.pitfalls,
      p.fsrs_stability, p.fsrs_difficulty, p.fsrs_reps, p.fsrs_lapses,
      p.fsrs_state, p.retrievability, p.interval_days, p.next_review_date,
      p.last_reviewed_at, p.mastery_level, p.consecutive_clean, p.total_time_spent,
      p.attempts_count, p.created_at, p.updated_at
    );
  }

  // Insert review logs
  if (p.reviews && p.reviews.length > 0) {
    db.prepare('DELETE FROM reviews WHERE problem_id = ?').run(p.id);
    const revStmt = db.prepare(`
      INSERT INTO reviews (
        problem_id, rating, time_spent_seconds, failed_attempts,
        stability_before, stability_after, interval_days, notes, reviewed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const r of p.reviews) {
      revStmt.run(
        p.id, r.rating, r.time_spent_seconds, r.failed_attempts,
        r.stability_before, r.stability_after, r.interval_days, r.notes, r.reviewed_at
      );
    }
  }
}

// Allow CLI execution
if (process.argv[1]?.endsWith('importAnkiAndNotion.js')) {
  importLearningFromAnkiAndNotion().then(() => {
    console.log('🎉 Transfer complete!');
    process.exit(0);
  }).catch(err => {
    console.error('Import error:', err);
    process.exit(1);
  });
}
