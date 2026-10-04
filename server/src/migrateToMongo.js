import 'dotenv/config';
import { Problem, connectMongo } from './mongoDb.js';
import { getAllProblems, getProblemById } from './db.js';
import mongoose from 'mongoose';

export async function migrateSqliteToMongo(mongoUri) {
  console.log('🔄 Starting migration from SQLite to MongoDB...');
  await connectMongo(mongoUri);

  const sqliteProblems = getAllProblems();
  console.log(`Found ${sqliteProblems.length} problems in SQLite.`);

  let inserted = 0;
  let updated = 0;

  for (const p of sqliteProblems) {
    const full = getProblemById(p.id) || p;

    const doc = {
      id: full.id,
      title: full.title,
      slug: full.slug || full.id,
      difficulty: full.difficulty,
      url: full.url,
      tags: full.tags || [],
      patterns: full.patterns || [],
      intuition: full.intuition || '',
      time_complexity: full.time_complexity || 'O(N)',
      space_complexity: full.space_complexity || 'O(1)',
      code_snippet: full.code_snippet || '',
      language: full.language || 'python3',
      pitfalls: full.pitfalls || '',
      fsrs_stability: full.fsrs_stability || 1.0,
      fsrs_difficulty: full.fsrs_difficulty || 5.0,
      fsrs_reps: full.fsrs_reps || 0,
      fsrs_lapses: full.fsrs_lapses || 0,
      fsrs_state: full.fsrs_state || 'Learning',
      retrievability: full.retrievability || 1.0,
      last_reviewed_at: full.last_reviewed_at ? new Date(full.last_reviewed_at) : null,
      next_review_date: full.next_review_date ? new Date(full.next_review_date) : new Date(),
      interval_days: full.interval_days || 1,
      timeSpentSeconds: full.timeSpentSeconds || 0,
      attempts_count: full.attempts_count || 1,
      failedAttempts: full.failedAttempts || 0,
      reviews: (full.reviews || []).map(r => ({
        rating: r.rating,
        reviewed_at: r.reviewed_at ? new Date(r.reviewed_at) : new Date(),
        interval_days: r.interval_days || 1,
        stability_before: r.stability_before || 1.0,
        stability_after: r.stability_after || 1.0,
        difficulty_before: r.difficulty_before || 5.0,
        difficulty_after: r.difficulty_after || 5.0,
        state: r.state || 'Learning',
        notes: r.notes || ''
      }))
    };

    const res = await Problem.findOneAndUpdate(
      { id: full.id },
      doc,
      { upsert: true, new: true }
    );
    if (res.isNew) inserted++;
    else updated++;
  }

  console.log(`✅ Migration complete! Processed ${sqliteProblems.length} problems (${inserted} inserted, ${updated} updated).`);
}

// If executed directly from CLI: node src/migrateToMongo.js
if (process.argv[1]?.endsWith('migrateToMongo.js')) {
  migrateSqliteToMongo(process.env.MONGODB_URI)
    .then(() => mongoose.disconnect())
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
