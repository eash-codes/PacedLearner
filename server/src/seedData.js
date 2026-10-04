/**
 * Seed data with iconic LeetCode problems demonstrating:
 * - A problem DUE TODAY for flashcard review
 * - Problems across Easy, Medium, Hard
 * - Problems with varied FSRS Stability and Mastery tiers
 */

export const INITIAL_PROBLEMS = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: 'Easy',
    url: 'https://leetcode.com/problems/two-sum/',
    tags: JSON.stringify(['Array', 'Hash Table']),
    patterns: JSON.stringify(['Hash Map Invariant', 'Complement Lookup']),
    intuition: 'Store each number\'s complement (`target - num`) in a hash map as we iterate. When a matching complement is seen, return the stored index and current index in a single $O(N)$ pass.',
    time_complexity: 'O(N)',
    space_complexity: 'O(N)',
    code_snippet: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []`,
    language: 'python3',
    pitfalls: 'Using the same element twice (e.g. target=6, num=3). Check complement in map before saving current index.',
    fsrs_stability: 3.2,
    fsrs_difficulty: 3.5,
    fsrs_reps: 2,
    fsrs_lapses: 0,
    fsrs_state: 'Review',
    retrievability: 0.84, // Below 0.90 -> DUE FOR REVIEW TODAY!
    interval_days: 3,
    // Set next review to yesterday so it appears directly in Due Today queue
    next_review_date: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    last_reviewed_at: new Date(Date.now() - 3600 * 1000 * 24 * 3).toISOString(),
    mastery_level: 'Reviewing',
    consecutive_clean: 2
  },
  {
    id: 'longest-substring-without-repeating-characters',
    title: 'Longest Substring Without Repeating Characters',
    slug: 'longest-substring-without-repeating-characters',
    difficulty: 'Medium',
    url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
    tags: JSON.stringify(['Hash Table', 'String', 'Sliding Window']),
    patterns: JSON.stringify(['Sliding Window', 'Last-Seen Index Map']),
    intuition: 'Use a dynamic sliding window `[left, right]`. Maintain a map of each character\'s last seen position. If character at `right` was seen inside the current window, fast-forward `left = map[char] + 1`.',
    time_complexity: 'O(N)',
    space_complexity: 'O(min(N, AlphabetSize))',
    code_snippet: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        char_idx = {}
        max_len = 0
        left = 0
        
        for right, ch in enumerate(s):
            if ch in char_idx and char_idx[ch] >= left:
                left = char_idx[ch] + 1
            char_idx[ch] = right
            max_len = max(max_len, right - left + 1)
            
        return max_len`,
    language: 'python3',
    pitfalls: 'Forgetting to check `char_idx[ch] >= left`. If an old character appeared before `left`, do not move `left` backward!',
    fsrs_stability: 1.2,
    fsrs_difficulty: 5.8,
    fsrs_reps: 1,
    fsrs_lapses: 0,
    fsrs_state: 'Learning',
    retrievability: 0.88, // Due today
    interval_days: 1,
    next_review_date: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    last_reviewed_at: new Date(Date.now() - 3600 * 1000 * 24 * 1.5).toISOString(),
    mastery_level: 'Learning',
    consecutive_clean: 1
  },
  {
    id: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    slug: 'trapping-rain-water',
    difficulty: 'Hard',
    url: 'https://leetcode.com/problems/trapping-rain-water/',
    tags: JSON.stringify(['Array', 'Two Pointers', 'Dynamic Programming', 'Stack']),
    patterns: JSON.stringify(['Two Pointers', 'Monotonic Boundary']),
    intuition: 'Water trapped above an index depends on `min(max_left, max_right) - height[i]`. Using two pointers from left and right, the smaller boundary always dictates the water height, allowing $O(1)$ space.',
    time_complexity: 'O(N)',
    space_complexity: 'O(1)',
    code_snippet: `class Solution:
    def trap(self, height: list[int]) -> int:
        if not height: return 0
        left, right = 0, len(height) - 1
        left_max, right_max = height[left], height[right]
        water = 0
        
        while left < right:
            if left_max < right_max:
                left += 1
                left_max = max(left_max, height[left])
                water += left_max - height[left]
            else:
                right -= 1
                right_max = max(right_max, height[right])
                water += right_max - height[right]
                
        return water`,
    language: 'python3',
    pitfalls: 'Advancing the pointer before updating max or calculating negative water. Update max and subtract height in clean order.',
    fsrs_stability: 94.5,
    fsrs_difficulty: 6.2,
    fsrs_reps: 5,
    fsrs_lapses: 0,
    fsrs_state: 'Review',
    retrievability: 0.98,
    interval_days: 90,
    next_review_date: new Date(Date.now() + 3600 * 1000 * 24 * 65).toISOString(),
    last_reviewed_at: new Date(Date.now() - 3600 * 1000 * 24 * 25).toISOString(),
    mastery_level: 'Mastered',
    consecutive_clean: 4
  },
  {
    id: 'coin-change',
    title: 'Coin Change',
    slug: 'coin-change',
    difficulty: 'Medium',
    url: 'https://leetcode.com/problems/coin-change/',
    tags: JSON.stringify(['Array', 'Dynamic Programming', 'Breadth-First Search']),
    patterns: JSON.stringify(['Bottom-Up DP', 'Unbounded Knapsack']),
    intuition: 'Define `dp[a]` as fewest coins to make amount `a`. For each amount from 1 to `amount`, test all coins `c <= a`: `dp[a] = min(dp[a], 1 + dp[a - c])`.',
    time_complexity: 'O(amount * len(coins))',
    space_complexity: 'O(amount)',
    code_snippet: `class Solution:
    def coinChange(self, coins: list[int], amount: int) -> int:
        dp = [float('inf')] * (amount + 1)
        dp[0] = 0
        
        for a in range(1, amount + 1):
            for c in coins:
                if a - c >= 0:
                    dp[a] = min(dp[a], 1 + dp[a - c])
                    
        return dp[amount] if dp[amount] != float('inf') else -1`,
    language: 'python3',
    pitfalls: 'Greedy approach fails on arbitrary coin denominations (e.g. coins=[1,3,4], amount=6: greedy gives 4+1+1=3, DP gives 3+3=2).',
    fsrs_stability: 18.4,
    fsrs_difficulty: 4.8,
    fsrs_reps: 3,
    fsrs_lapses: 0,
    fsrs_state: 'Review',
    retrievability: 0.94,
    interval_days: 18,
    next_review_date: new Date(Date.now() + 3600 * 1000 * 24 * 12).toISOString(),
    last_reviewed_at: new Date(Date.now() - 3600 * 1000 * 24 * 6).toISOString(),
    mastery_level: 'Retained',
    consecutive_clean: 3
  }
];
