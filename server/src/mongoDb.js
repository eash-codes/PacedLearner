import mongoose from 'mongoose';
import 'dotenv/config';

// Define Review Log Sub-schema
const ReviewLogSchema = new mongoose.Schema({
  rating: { type: Number, required: true },
  reviewed_at: { type: Date, default: Date.now },
  interval_days: { type: Number, default: 1 },
  stability_before: { type: Number, default: 1.0 },
  stability_after: { type: Number, default: 1.0 },
  difficulty_before: { type: Number, default: 5.0 },
  difficulty_after: { type: Number, default: 5.0 },
  state: { type: String, default: 'Learning' },
  notes: { type: String, default: '' }
}, { _id: false });

// Define Problem Schema
const ProblemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  difficulty: { type: String, required: true, enum: ['Easy', 'Medium', 'Hard'] },
  url: { type: String, required: true },
  tags: [{ type: String }],
  patterns: [{ type: String }],
  intuition: { type: String, default: '' },
  time_complexity: { type: String, default: 'O(N)' },
  space_complexity: { type: String, default: 'O(1)' },
  code_snippet: { type: String, default: '' },
  language: { type: String, default: 'python3' },
  pitfalls: { type: String, default: '' },

  // FSRS Core Metrics
  fsrs_stability: { type: Number, default: 1.0 },
  fsrs_difficulty: { type: Number, default: 5.0 },
  fsrs_reps: { type: Number, default: 0 },
  fsrs_lapses: { type: Number, default: 0 },
  fsrs_state: { type: String, default: 'Learning' },
  retrievability: { type: Number, default: 1.0 },
  last_reviewed_at: { type: Date, default: null },
  next_review_date: { type: Date, default: Date.now },
  interval_days: { type: Number, default: 1 },

  // Study stats
  timeSpentSeconds: { type: Number, default: 0 },
  attempts_count: { type: Number, default: 1 },
  failedAttempts: { type: Number, default: 0 },

  // Embedded Reviews Array
  reviews: [ReviewLogSchema]
}, {
  timestamps: true
});

export const Problem = mongoose.models.Problem || mongoose.model('Problem', ProblemSchema);

/**
 * Connect to MongoDB with auto-reconnect and error resilience
 */
export async function connectMongo(uri) {
  const targetUri = uri || process.env.MONGODB_URI;
  if (!targetUri) {
    throw new Error('MONGODB_URI is not set in .env');
  }

  try {
    await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 8000
    });
    console.log(`🍃 Connected to MongoDB (${mongoose.connection.host}/${mongoose.connection.name})`);
    return true;
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    throw err;
  }
}
