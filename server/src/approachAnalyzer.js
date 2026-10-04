/**
 * Approach & Pattern Analyzer
 * Analyzes code, submission history, and problem metadata to extract:
 * 1. Algorithmic patterns & data structures
 * 2. Estimated Time & Space complexity
 * 3. Heuristic difficulty / effort rating for initial FSRS seeding
 */

export function analyzeCodeAndApproach(code = '', tags = [], title = '') {
  const codeLower = code.toLowerCase();
  const detectedPatterns = [];

  // Pattern detection heuristics
  if (/(\bstack\b|\.pop\(\)|\.push\(\)).*(\bwhile\b.*(<|>|<=|>=))/s.test(codeLower) ||
      codeLower.includes('monotonic')) {
    detectedPatterns.push('Monotonic Stack');
  } else if (codeLower.includes('stack') || codeLower.includes('deque')) {
    detectedPatterns.push('Stack / Queue');
  }

  if (/(left\s*<=\s*right|low\s*<=\s*high|mid\s*=|binary_search)/i.test(code)) {
    detectedPatterns.push('Binary Search');
  }

  if (/(slow.*fast|fast.*slow|hare.*tortoise)/i.test(code)) {
    detectedPatterns.push('Fast & Slow Pointers');
  } else if (/(left\s*<\s*right|start\s*<\s*end|two_pointer)/i.test(code)) {
    detectedPatterns.push('Two Pointers');
  }

  if (/(window|window_size|left.*right.*max_len|min_len.*map)/i.test(codeLower) && 
      (codeLower.includes('while') || codeLower.includes('for'))) {
    detectedPatterns.push('Sliding Window');
  }

  if (/(dp\[|memo\[|@cache|@lru_cache|memoization|tabulation)/i.test(code)) {
    detectedPatterns.push('Dynamic Programming');
  }

  if (/(backtrack|dfs\s*\(.*path|choices|subsets|permute)/i.test(codeLower) && codeLower.includes('pop()')) {
    detectedPatterns.push('Backtracking');
  } else if (/(queue|deque|visited|adj|adjacency|bfs)/i.test(codeLower) && codeLower.includes('while')) {
    detectedPatterns.push('Breadth-First Search (BFS)');
  } else if (/(dfs|depth_first|recursive|visited)/i.test(codeLower)) {
    detectedPatterns.push('Depth-First Search (DFS)');
  }

  if (/(parent|find\(|union\(|disjoint_set|dsu)/i.test(codeLower)) {
    detectedPatterns.push('Union Find / Disjoint Set');
  }

  if (/(heapq|priorityqueue|min_heap|max_heap)/i.test(codeLower)) {
    detectedPatterns.push('Heap / Priority Queue');
  }

  if (/(trienode|prefix_tree|children\[)/i.test(codeLower)) {
    detectedPatterns.push('Trie (Prefix Tree)');
  }

  // Combine with explicit tags if none detected
  const finalPatterns = detectedPatterns.length > 0 
    ? detectedPatterns 
    : (tags.length > 0 ? tags.slice(0, 2) : ['Direct / Greedy Simulation']);

  // Complexity estimation
  let timeComplexity = 'O(N)';
  let spaceComplexity = 'O(1)';

  // Nested loop count
  const forLoops = (code.match(/\bfor\b/g) || []).length;
  const whileLoops = (code.match(/\bwhile\b/g) || []).length;
  const totalLoops = forLoops + whileLoops;

  if (codeLower.includes('.sort(') || codeLower.includes('sorted(') || codeLower.includes('arrays.sort')) {
    timeComplexity = 'O(N log N)';
  } else if (finalPatterns.includes('Binary Search')) {
    timeComplexity = 'O(log N)';
  } else if (totalLoops >= 2 && !finalPatterns.includes('Two Pointers') && !finalPatterns.includes('Sliding Window')) {
    timeComplexity = 'O(N²)';
  } else if (finalPatterns.includes('Dynamic Programming')) {
    timeComplexity = totalLoops >= 2 ? 'O(N * M)' : 'O(N)';
  }

  if (codeLower.includes('dp[') || codeLower.includes('memo') || codeLower.includes('map') || 
      codeLower.includes('dict') || codeLower.includes('hashset') || codeLower.includes('set()') ||
      codeLower.includes('queue') || codeLower.includes('stack')) {
    spaceComplexity = 'O(N)';
  }

  // Intuition Summary Generation
  const primaryPattern = finalPatterns[0];
  let intuition = `Applied **${primaryPattern}** to efficiently process the problem state in ${timeComplexity} time.`;
  if (primaryPattern === 'Two Pointers') {
    intuition = `Maintained two directional pointers to converge on the optimal boundary without extra nested scans (${timeComplexity}, ${spaceComplexity}).`;
  } else if (primaryPattern === 'Sliding Window') {
    intuition = `Expanded right boundary while conditionally contracting left boundary to maintain invariant substring/subarray properties in ${timeComplexity}.`;
  } else if (primaryPattern === 'Monotonic Stack') {
    intuition = `Used a monotonic stack to resolve next greater/smaller element queries in linear time $O(N)$.`;
  } else if (primaryPattern === 'Dynamic Programming') {
    intuition = `Identified overlapping subproblems and optimal substructure, tracking optimal values via memoization/tabulation (${timeComplexity}, ${spaceComplexity}).`;
  } else if (primaryPattern === 'Binary Search') {
    intuition = `Recognized monotonic search space property to bisect answer boundaries in logarithmic time ${timeComplexity}.`;
  }

  return {
    patterns: finalPatterns,
    time_complexity: timeComplexity,
    space_complexity: spaceComplexity,
    intuition
  };
}

/**
 * Recommends an initial FSRS rating (1: Again, 2: Hard, 3: Good, 4: Easy)
 * based on concrete session metrics (time taken, failed attempts, hints)
 */
export function recommendEffortRating({
  timeSpentSeconds = 0,
  failedAttempts = 0,
  hintsViewed = 0,
  difficulty = 'Medium'
}) {
  const minutes = timeSpentSeconds / 60;

  // Severe struggle or solution peeked
  if (hintsViewed > 1 || failedAttempts >= 4) {
    return {
      rating: 1, // Again
      reason: 'Multiple failed attempts or hints consulted; recommended for immediate 1-day spaced review.'
    };
  }

  // Hard struggle
  const isHighTime = (difficulty === 'Easy' && minutes > 20) ||
                     (difficulty === 'Medium' && minutes > 35) ||
                     (difficulty === 'Hard' && minutes > 55);

  if (failedAttempts >= 2 || isHighTime) {
    return {
      rating: 2, // Hard
      reason: 'Required substantial debugging or extended solve time; short interval scheduled.'
    };
  }

  // Easy / First Try Master
  const isQuick = (difficulty === 'Easy' && minutes < 8 && failedAttempts === 0) ||
                  (difficulty === 'Medium' && minutes < 15 && failedAttempts === 0) ||
                  (difficulty === 'Hard' && minutes < 25 && failedAttempts === 0);

  if (isQuick && hintsViewed === 0) {
    return {
      rating: 4, // Easy
      reason: 'Solved rapidly on first attempt with zero hints; aggressive interval scheduled.'
    };
  }

  // Standard Good solve
  return {
    rating: 3, // Good
    reason: 'Solved within standard benchmark time with clean execution.'
  };
}
