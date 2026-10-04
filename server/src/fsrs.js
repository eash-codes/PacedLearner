/**
 * Free Spaced Repetition Scheduler (FSRS v5) Engine
 * Designed for LeetCode algorithmic problem retention and mastery.
 */

// Default weights calibrated for retention optimization
const DEFAULT_WEIGHTS = [
  0.4072, 1.1829, 3.1262, 15.4722, // w[0..3]: initial stability for grades 1..4
  7.2102, 0.5316, 1.0651, 0.0234,  // w[4..7]: difficulty parameters
  1.6160, 0.1544, 1.0824,          // w[8..10]: stability recall parameters
  1.9813, 0.0953, 0.2975, 0.2204,  // w[11..14]: stability forget parameters
  0.2407, 2.9466                   // w[15..16]: hard penalty, easy bonus
];

const DECAY = -0.5;
const FACTOR = 19 / 81;

export const Rating = {
  AGAIN: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4
};

export const State = {
  NEW: 'New',
  LEARNING: 'Learning',
  REVIEW: 'Review',
  RELEARNING: 'Relearning'
};

export class FSRS {
  constructor(weights = DEFAULT_WEIGHTS, requestRetention = 0.9) {
    this.w = weights;
    this.requestRetention = requestRetention;
  }

  /**
   * Calculates current probability of recall (Retrievability)
   * R(t, S) = (1 + FACTOR * (t / S))^DECAY
   */
  getRetrievability(elapsedDays, stability) {
    if (!stability || stability <= 0) return 0;
    if (elapsedDays <= 0) return 1.0;
    return Math.pow(1 + FACTOR * (elapsedDays / stability), DECAY);
  }

  /**
   * Calculates optimal interval (in days) to achieve target retention
   */
  nextInterval(stability) {
    if (!stability || stability <= 0) return 1;
    const interval = (stability / FACTOR) * (Math.pow(this.requestRetention, 1 / DECAY) - 1);
    return Math.max(1, Math.round(interval));
  }

  /**
   * Initial review calculation for newly solved problem
   */
  initReview(rating) {
    const grade = Math.max(1, Math.min(4, rating));
    const stability = Math.max(0.1, this.w[grade - 1]);
    const difficulty = Math.max(1, Math.min(10, this.w[4] - Math.exp(this.w[5] * (grade - 1)) + 1));
    const interval = grade === Rating.AGAIN ? 1 : this.nextInterval(stability);
    
    return {
      stability: Number(stability.toFixed(2)),
      difficulty: Number(difficulty.toFixed(2)),
      reps: 1,
      lapses: grade === Rating.AGAIN ? 1 : 0,
      state: grade === Rating.AGAIN ? State.LEARNING : State.REVIEW,
      last_review: new Date().toISOString(),
      interval_days: interval,
      next_review_date: this.addDays(new Date(), interval).toISOString()
    };
  }

  /**
   * Subsequent review calculation
   */
  review(currentState, rating, elapsedDays = null) {
    const grade = Math.max(1, Math.min(4, rating));
    let { stability = 1.0, difficulty = 5.0, reps = 0, lapses = 0 } = currentState;
    
    // Calculate elapsed time since last review
    if (elapsedDays === null) {
      if (currentState.last_review) {
        const lastDate = new Date(currentState.last_review).getTime();
        const now = Date.now();
        elapsedDays = Math.max(0, (now - lastDate) / (1000 * 60 * 60 * 24));
      } else {
        elapsedDays = 1;
      }
    }

    const retrievability = this.getRetrievability(elapsedDays, stability);

    // Next Difficulty with mean reversion
    const meanReversionTarget = this.w[4];
    const diffDelta = -this.w[6] * (grade - 3);
    const rawDiff = difficulty + diffDelta;
    let nextDifficulty = this.w[7] * meanReversionTarget + (1 - this.w[7]) * rawDiff;
    nextDifficulty = Math.max(1, Math.min(10, nextDifficulty));

    let nextStability;
    let nextState;
    let nextLapses = lapses;

    if (grade === Rating.AGAIN) {
      // Memory Lapse (Forgot)
      nextLapses += 1;
      nextState = State.RELEARNING;
      const sLapse = this.w[11] * 
        Math.pow(difficulty, -this.w[12]) * 
        (Math.pow(stability + 1, this.w[13]) - 1) * 
        Math.exp(this.w[14] * (1 - retrievability));
      nextStability = Math.min(stability, Math.max(0.1, sLapse));
    } else {
      // Successful Recall (Hard, Good, Easy)
      nextState = State.REVIEW;
      const hardPenalty = grade === Rating.HARD ? this.w[15] : 1.0;
      const easyBonus = grade === Rating.EASY ? this.w[16] : 1.0;

      const stabilityRecall = stability * (
        1 + Math.exp(this.w[8]) * 
        (11 - difficulty) * 
        Math.pow(stability, -this.w[9]) * 
        (Math.exp(this.w[10] * (1 - retrievability)) - 1) * 
        hardPenalty * 
        easyBonus
      );
      nextStability = Math.max(stability, stabilityRecall);
    }

    const interval = grade === Rating.AGAIN ? 1 : this.nextInterval(nextStability);

    return {
      stability: Number(nextStability.toFixed(2)),
      difficulty: Number(nextDifficulty.toFixed(2)),
      reps: reps + 1,
      lapses: nextLapses,
      state: nextState,
      last_review: new Date().toISOString(),
      interval_days: interval,
      next_review_date: this.addDays(new Date(), interval).toISOString(),
      retrievability: Number(retrievability.toFixed(3))
    };
  }

  /**
   * Previews upcoming intervals for all 4 grading options (1: Again, 2: Hard, 3: Good, 4: Easy)
   */
  previewRatings(currentState) {
    if (!currentState || !currentState.stability) {
      return {
        1: { days: 1, label: '1 day' },
        2: { days: Math.max(1, Math.round(this.w[1])), label: `${Math.max(1, Math.round(this.w[1]))} days` },
        3: { days: Math.max(2, Math.round(this.w[2])), label: `${Math.max(2, Math.round(this.w[2]))} days` },
        4: { days: Math.max(5, Math.round(this.w[3])), label: `${Math.max(5, Math.round(this.w[3]))} days` }
      };
    }

    const previews = {};
    for (let g = 1; g <= 4; g++) {
      const outcome = this.review(currentState, g);
      previews[g] = {
        days: outcome.interval_days,
        label: outcome.interval_days === 1 ? '1 day' : `${outcome.interval_days} days`,
        stability: outcome.stability
      };
    }
    return previews;
  }

  /**
   * Evaluates if problem has achieved "Mastered" criteria
   */
  isMastered(stability, reps, consecutiveGoodOrEasy) {
    return stability >= 90 && reps >= 3 && consecutiveGoodOrEasy >= 3;
  }

  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}

export const fsrsEngine = new FSRS();
