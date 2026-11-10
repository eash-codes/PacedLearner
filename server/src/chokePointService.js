import vm from 'node:vm';
import { generateAICompletion } from './aiService.js';
import { chatWithPacey } from './paceyBrainService.js';

/**
 * Deep equality helper for test case comparison
 */
function isDeepEqual(actual, expected) {
  if (actual === expected) return true;
  if (actual === null || expected === null) return actual === expected;
  if (typeof actual !== typeof expected) return false;

  // Handle arrays
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return false;
    for (let i = 0; i < actual.length; i++) {
      if (!isDeepEqual(actual[i], expected[i])) return false;
    }
    return true;
  }

  // Handle objects
  if (typeof actual === 'object' && typeof expected === 'object') {
    const actKeys = Object.keys(actual).sort();
    const expKeys = Object.keys(expected).sort();
    if (actKeys.length !== expKeys.length) return false;
    for (let i = 0; i < actKeys.length; i++) {
      const key = actKeys[i];
      if (key !== expKeys[i] || !isDeepEqual(actual[key], expected[key])) return false;
    }
    return true;
  }

  // Handle sets
  if (actual instanceof Set && expected instanceof Set) {
    if (actual.size !== expected.size) return false;
    for (const item of actual) {
      if (!expected.has(item)) return false;
    }
    return true;
  }

  return false;
}

/**
 * Executes user code inside the scaffold code against defined test cases in a sandboxed VM.
 */
export function runChokeCode({ scaffoldCode, userCode, testCases = [], targetFunction = '', language = 'javascript' }) {
  const startTime = Date.now();

  // If user didn't write anything
  if (!userCode || !userCode.trim()) {
    return {
      passed: false,
      total: testCases.length,
      passedCount: 0,
      executionTimeMs: 0,
      syntaxError: 'No code submitted for choke point.',
      results: []
    };
  }

  // Replace placeholder with user code
  const placeholderRegex = /(\/\/\s*___CHOKE_POINT___|\/\*\s*___CHOKE_POINT___\s*\*\/|___CHOKE_POINT___)/g;
  let fullCode = '';

  if (placeholderRegex.test(scaffoldCode)) {
    fullCode = scaffoldCode.replace(placeholderRegex, userCode);
  } else {
    // If no placeholder, append
    fullCode = `${scaffoldCode}\n\n// User Choke Point:\n${userCode}`;
  }

  // Sandbox execution environment
  const sandbox = {
    console: {
      log: () => {},
      warn: () => {},
      error: () => {}
    },
    Math,
    Array,
    Object,
    Set,
    Map,
    RegExp,
    String,
    Number,
    Boolean,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    Buffer: undefined,
    process: undefined,
    require: undefined
  };

  const context = vm.createContext(sandbox);

  // 1. Compile & run the combined code
  try {
    const script = new vm.Script(fullCode, {
      filename: 'choke_point_runner.js'
    });
    script.runInContext(context, { timeout: 1500 });
  } catch (err) {
    return {
      passed: false,
      total: testCases.length,
      passedCount: 0,
      executionTimeMs: Date.now() - startTime,
      syntaxError: `Compilation / Syntax Error: ${err.message}`,
      results: []
    };
  }

  // 2. Identify the function to test
  let fnToTest = null;
  if (targetFunction && typeof context[targetFunction] === 'function') {
    fnToTest = context[targetFunction];
  } else {
    // Auto-detect the last defined function in the sandbox
    for (const key of Object.keys(sandbox)) {
      if (typeof context[key] === 'function') {
        fnToTest = context[key];
      }
    }
  }

  if (typeof fnToTest !== 'function') {
    return {
      passed: false,
      total: testCases.length,
      passedCount: 0,
      executionTimeMs: Date.now() - startTime,
      syntaxError: targetFunction
        ? `Target function "${targetFunction}" was not defined in the code.`
        : 'No callable function found in the compiled code.',
      results: []
    };
  }

  // 3. Run all test cases
  const results = [];
  let passedCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const testIndex = i + 1;
    const desc = tc.description || `Test Case #${testIndex}`;
    const input = tc.input;
    const expected = tc.expected;

    let actual = undefined;
    let errMessage = null;
    let testPassed = false;
    const t0 = Date.now();

    try {
      // Inputs can be an array of arguments, or a single argument
      const args = Array.isArray(input) ? input : [input];
      // Clone args to prevent mutation side-effects between tests
      const clonedArgs = JSON.parse(JSON.stringify(args));
      actual = fnToTest(...clonedArgs);
      testPassed = isDeepEqual(actual, expected);
      if (testPassed) passedCount++;
    } catch (err) {
      errMessage = err.message || String(err);
      testPassed = false;
    }

    results.push({
      testIndex,
      description: desc,
      input,
      expected,
      actual: actual !== undefined ? actual : (errMessage ? `[Error] ${errMessage}` : 'undefined'),
      passed: testPassed,
      timeMs: Date.now() - t0,
      error: errMessage
    });
  }

  const allPassed = passedCount === testCases.length && testCases.length > 0;
  const executionTimeMs = Date.now() - startTime;

  return {
    passed: allPassed,
    total: testCases.length,
    passedCount,
    executionTimeMs,
    syntaxError: null,
    results
  };
}

/**
 * Intelligent Choke Point Extraction from problem code
 */
export async function extractChokePoint({ code, language = 'javascript', title = '', intuition = '', problemId = null }) {
  if (!code || !code.trim()) {
    throw new Error('Code snippet is required for choke point extraction.');
  }

  // Attempt AI extraction via LLM first
  try {
    const prompt = `You are an elite competitive programmer and algorithmic surgeon.
Analyze the following ${language} solution for "${title || 'Algorithmic Problem'}":

\`\`\`${language}
${code}
\`\`\`

YOUR MISSION:
Identify the single most critical "Choke Point" of the algorithm (the 3 to 8 lines where the core hinge, recurrence relation, pointer exchange, sliding window boundary, or state transition occurs).

Return a strict, valid JSON object with the following fields:
1. "title": Short descriptive title of this choke point (e.g., "Two-Pointer Inward Scan", "DP State Transition", "Binary Search Mid Condition").
2. "target_function": The exact function name being implemented (e.g. "twoSum", "maxProfit", "search").
3. "description": A concise 1-2 sentence instruction telling the user what logic to write from memory (e.g., "Write the while loop condition and the two-pointer adjustments based on sum comparison.").
4. "choke_code": The exact 3 to 8 canonical lines of code extracted from the solution.
5. "scaffold_code": The entire code snippet with the choke_code replaced by exactly "// ___CHOKE_POINT___". Must be valid runnable syntax when the choke point is filled in.
6. "test_cases": An array of 3 to 4 test case objects:
   [
     {
       "description": "Standard case",
       "input": [param1, param2],
       "expected": expected_result
     }
   ]

Return ONLY the raw JSON object. Do not wrap in markdown quotes if possible.`;

    const aiRes = await generateAICompletion({
      prompt,
      systemPrompt: 'You are an automated algorithmic code extraction engine. Return ONLY valid JSON.',
      temperature: 0.2
    });

    if (aiRes) {
      // Clean up markdown fences if present
      const cleaned = aiRes.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.choke_code && parsed.scaffold_code && Array.isArray(parsed.test_cases)) {
        return {
          id: `cp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          problem_id: problemId,
          title: parsed.title || `${title} Choke Point`,
          target_function: parsed.target_function || '',
          description: parsed.description || 'Implement the core algorithmic hinge.',
          language,
          choke_code: parsed.choke_code.trim(),
          scaffold_code: parsed.scaffold_code.trim(),
          test_cases: parsed.test_cases
        };
      }
    }
  } catch (err) {
    console.warn('[ChokePoint AI Extraction Fallback]:', err.message);
  }

  // Programmatic fallback extraction if AI is unavailable or offline
  return extractChokePointFallback({ code, language, title, problemId });
}

/**
 * Robust programmatic AST/regex-based extraction fallback
 */
export function extractChokePointFallback({ code, language = 'javascript', title = '', problemId = null }) {
  const lines = code.split('\n');

  // Detect function name
  let targetFunction = 'solution';
  const fnMatch = code.match(/(?:function\s+([a-zA-Z0-9_$]+)|(?:var|let|const)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:function|\([^)]*\)\s*=>))/);
  if (fnMatch) {
    targetFunction = fnMatch[1] || fnMatch[2] || 'solution';
  }

  // Look for algorithmic hinge indicators: while, for, if inside loop, return condition
  let startIdx = -1;
  let endIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('while') || line.startsWith('for') || line.includes('dp[') || line.includes('left <') || line.includes('low <=')) {
      startIdx = i;
      break;
    }
  }

  if (startIdx === -1) {
    // If no loop found, take the middle 4 lines
    startIdx = Math.max(1, Math.floor(lines.length / 3));
  }

  endIdx = Math.min(lines.length - 2, startIdx + 5);

  const chokeLines = lines.slice(startIdx, endIdx + 1);
  const chokeCode = chokeLines.join('\n');

  const scaffoldLines = [
    ...lines.slice(0, startIdx),
    '  // ___CHOKE_POINT___',
    ...lines.slice(endIdx + 1)
  ];
  const scaffoldCode = scaffoldLines.join('\n');

  // Generate generic default test cases
  const defaultTestCases = [
    {
      description: 'Standard Example 1',
      input: [1, 2],
      expected: 3
    },
    {
      description: 'Standard Example 2',
      input: [0, 0],
      expected: 0
    }
  ];

  return {
    id: `cp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    problem_id: problemId,
    title: `${title || 'Algorithmic'} Hinge`,
    target_function: targetFunction,
    description: `Complete the core ${targetFunction} algorithmic logic.`,
    language,
    choke_code: chokeCode,
    scaffold_code: scaffoldCode,
    test_cases: defaultTestCases
  };
}

/**
 * Generates psychological Pacey commentary on surgery completion
 */
export async function generatePaceyChokeVerdict({ chokePoint, passed, elapsedMs, passedCount, total, error }) {
  const elapsedSec = Math.round(elapsedMs / 1000);
  const title = chokePoint.title || 'the algorithmic hinge';

  if (!passed) {
    if (elapsedSec >= 90) {
      return {
        verdict: 'TIME OVER // FLATLINED',
        expression: 'colere',
        state: 'burst',
        rating: 1, // Again
        critique: `TIME EXPIRED. 90 seconds and you completely choked on ${title}. In an actual onsite interview, you'd be packing your bag right now. FSRS stability lapsed.`
      };
    }

    return {
      verdict: 'SURGERY FAILED // SYNTAX MASSACRE',
      expression: 'mefiant',
      state: 'exclaim',
      rating: 1, // Again
      critique: `REJECTED. You failed ${total - passedCount} of ${total} assertions. ${error ? `Error: ${error}` : 'Output mismatch'}. Go review your fundamentals before touching code again.`
    };
  }

  // Passed cases
  if (elapsedSec <= 25) {
    return {
      verdict: 'SURGICAL PRECISION // FLAWLESS RECALL',
      expression: 'fier',
      state: 'orbit',
      rating: 4, // Easy
      critique: `Hmph. ${elapsedSec}s on ${title}? That was actually crisp. Your synapses actually fired without short-circuiting. Stability boosted.`
    };
  }

  if (elapsedSec <= 60) {
    return {
      verdict: 'ACCEPTED // PASSABLE EXECUTION',
      expression: 'heureux',
      state: 'wink',
      rating: 3, // Good
      critique: `Passed in ${elapsedSec} seconds. Acceptable execution on ${title}. Not fast enough to brag, but enough to survive the round.`
    };
  }

  return {
    verdict: 'MARGINAL PASS // TREMBLING HANDS',
    expression: 'attentif',
    state: 'swirl',
    rating: 2, // Hard
    critique: `${elapsedSec} seconds? You barely squeaked past the wire. Your muscle memory is hesitating on ${title}. Card scheduled for rapid re-drill.`
  };
}
