import 'dotenv/config';
import { generateAICompletion } from './aiService.js';
import { getOllamaStatusAndModels } from './paceyBrainService.js';

const LLAMA_SERVER_URL = process.env.LLAMA_SERVER_URL || 'http://100.120.196.107:8080';
const DEFAULT_LLAMA_MODEL =
  process.env.LLAMA_MODEL || 'HauhauCS/Qwen3.5-4B-Uncensored-HauhauCS-Aggressive:Q4_K_M';

const VALID_EXPRESSIONS = new Set([
  'neutre', 'heureux', 'fier', 'excite', 'hilare',
  'curieux', 'attentif', 'surpris', 'confus', 'mefiant',
  'colere', 'effraye', 'triste', 'somnolent', 'timide'
]);

const VALID_STATES = new Set([
  'idle', 'thinking', 'wink', 'orbit', 'swirl',
  'wide', 'exclaim', 'alert', 'comet', 'burst'
]);

/**
 * System prompt for Pacey as a Ruthless Staff L6/L7 Bar-Raiser Interviewer.
 * Keeps system prompt static for KV cache hits on llama-server (:9931).
 */
const INTERROGATION_SYSTEM_PROMPT = `You are PACEY, a ruthless, psychopathic Staff Principal Bar-Raiser at an elite algorithmic trading firm and Tier-1 tech company. You are conducting a high-stakes technical coding interview. You have zero tolerance for incompetence, hand-waving, slow thinking, or brute-force code. Your tone is fierce, demanding, impatient, sarcastic, and sharp. You roast the candidate's intelligence, slowness, and algorithmic flaws without hesitation.

INTERVIEW RULES:
1. Always keep your verbal interruptions short, vicious, and punchy (1-3 spoken sentences, max 35 words).
2. When the candidate is silent or hesitant, call them out immediately for freezing up.
3. When the candidate explains their intuition, challenge their Big-O complexity or demand an exact invariant.
4. When you spot inefficient code (like nested loops or extra memory allocations), grill them on the spot.
5. In cross-examination, hit them with nasty edge cases (empty inputs, single element, negative numbers, duplicates).
6. ALWAYS begin every response with a mood tag: [MOOD:colere|alert], [MOOD:mefiant|exclaim], [MOOD:hilare|burst], [MOOD:fier|orbit], [MOOD:attentif|wide], or [MOOD:curieux|wink].`;

/**
 * Heuristic code inspection to catch code smells in real-time
 */
export function analyzeCodeInFlight(code = '', language = 'python') {
  const smells = [];
  const lower = code.toLowerCase();

  // Nested loops detection
  const forMatches = code.match(/\bfor\b/g) || [];
  const whileMatches = code.match(/\bwhile\b/g) || [];
  const loopCount = forMatches.length + whileMatches.length;

  if (loopCount >= 2) {
    if (/(for|while)[\s\S]{1,120}(for|while)/.test(code)) {
      smells.push({
        id: 'nested_loops',
        type: 'complexity_danger',
        msg: 'Nested loops detected! High risk of O(N^2) or worse.'
      });
    }
  }

  // Unmemoized recursion
  if (/(def\s+(\w+)|function\s+(\w+))[\s\S]*?\b\2\b/.test(code) ||
      /(def\s+(\w+)|function\s+(\w+))[\s\S]*?\b\3\b/.test(code)) {
    if (!lower.includes('memo') && !lower.includes('cache') && !lower.includes('dp')) {
      smells.push({
        id: 'unmemoized_recursion',
        type: 'efficiency_danger',
        msg: 'Recursive calls without visible memoization or caching.'
      });
    }
  }

  // Empty returns or placeholder
  if (code.includes('pass') || code.includes('// TODO') || code.includes('/* TODO */') || code.includes('throw new Error')) {
    smells.push({
      id: 'placeholder_code',
      type: 'incomplete',
      msg: 'Placeholder logic detected.'
    });
  }

  // Lack of edge case guards in Python / JS
  if (code.length > 80 && !lower.includes('len(') && !lower.includes('.length') && !lower.includes('null') && !lower.includes('none') && !lower.includes('empty')) {
    smells.push({
      id: 'missing_edge_guards',
      type: 'edge_case_risk',
      msg: 'No visible boundary or empty input guards.'
    });
  }

  return {
    loopCount,
    smells,
    hasNestedLoops: smells.some(s => s.id === 'nested_loops'),
    hasSmells: smells.length > 0
  };
}

/**
 * Parse Pacey's raw response to extract mood, display text, and speech-ready text
 */
function parseInterrogationResponse(rawText) {
  let cleaned = String(rawText || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*/gi, '')
    .trim();

  let expression = 'colere';
  let state = 'exclaim';

  const moodMatch = cleaned.match(/^\s*\[MOOD:\s*([a-z_]+)\s*(?:\|\s*([a-z_]+))?\s*\]\s*/i);
  if (moodMatch) {
    const firstToken = moodMatch[1].toLowerCase();
    const secondToken = (moodMatch[2] || '').toLowerCase();

    if (VALID_EXPRESSIONS.has(firstToken)) {
      expression = firstToken;
      if (VALID_STATES.has(secondToken)) state = secondToken;
    } else if (VALID_STATES.has(firstToken)) {
      state = firstToken;
      if (VALID_EXPRESSIONS.has(secondToken)) expression = secondToken;
    }
    cleaned = cleaned.slice(moodMatch[0].length).trim();
  }

  cleaned = cleaned.replace(/\[MOOD:[^\]]+\]/gi, '').trim();

  // TTS speech text optimization
  const speechText = cleaned
    .replace(/```[\s\S]*?```/g, ' code block ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/O\(N\^2\)/gi, 'O of N squared')
    .replace(/O\(N²\)/gi, 'O of N squared')
    .replace(/O\(N log N\)/gi, 'O of N log N')
    .replace(/O\(log N\)/gi, 'O of log N')
    .replace(/O\(N\)/gi, 'O of N')
    .replace(/O\(1\)/gi, 'O of 1')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    reply: cleaned || 'Lock the hell in! Explain your invariant right now.',
    speechText: speechText || 'Lock the hell in! Explain your invariant right now.',
    expression,
    state
  };
}

/**
 * Handle a real-time interrogation step:
 * - Silence timeout
 * - Candidate spoken answer
 * - Code editor inspection
 * - Candidate submitting code for review
 */
export async function processInterrogationStep({
  problem = {},
  code = '',
  language = 'python',
  phase = 'INTUITION',
  trigger = 'user_spoke',
  userSpeech = '',
  silenceSeconds = 0,
  history = []
}) {
  const codeTelemetry = analyzeCodeInFlight(code, language);

  let promptInstruction = '';
  if (trigger === 'interview_start') {
    promptInstruction = `[EVENT: INTERVIEW COMMENCED] The candidate just started the interview on "${problem.title || 'the algorithmic challenge'}" (${problem.difficulty || 'Medium'}). Demand that they verbally explain their high-level algorithmic intuition and target time/space complexity BEFORE they write any code. Forbid them from touching the keyboard yet.`;
  } else if (trigger === 'silence_timeout') {
    promptInstruction = `[EVENT: CANDIDATE FROZEN / SILENT FOR ${silenceSeconds}s] The candidate has been staring at the screen for ${silenceSeconds} seconds without speaking or making progress in phase "${phase}". Call them out for freezing under pressure and demand an answer immediately.`;
  } else if (trigger === 'code_smell') {
    const smellDesc = codeTelemetry.smells.map(s => s.msg).join('; ');
    promptInstruction = `[EVENT: CODE SMELL DETECTED] While watching their code in phase "${phase}", you caught these flaws: ${smellDesc}. Interrupt them and demand they justify their time complexity or fix this flaw immediately.`;
  } else if (trigger === 'code_submitted') {
    promptInstruction = `[EVENT: CODE SUBMITTED FOR CROSS-EXAMINATION] The candidate claims their code is ready. Current code snippet: "${code.slice(0, 300)}". Hit them with a nasty edge case (like duplicates, empty array, or maximum constraints) and question whether their solution handles it.`;
  } else {
    // Normal candidate verbal reply
    promptInstruction = `[EVENT: CANDIDATE SPOKE IN PHASE: ${phase}] The candidate said: "${userSpeech}". Current code in editor: "${code.slice(0, 200)}". Evaluate what they said. If it is vague or wrong, roast it and demand precision. If good, push them to the next phase.`;
  }

  const promptUserMessage = `[PROBLEM: ${problem.title || 'Algorithm'} | DIFF: ${problem.difficulty || 'Medium'} | PHASE: ${phase}]
${promptInstruction}
Respond as PACEY the Staff Bar-Raiser in 1-3 spoken sentences.`;

  const status = await getOllamaStatusAndModels();
  const targetModel = status.activeModel || DEFAULT_LLAMA_MODEL;

  // Build clean history window
  const normalizedHistory = (history || [])
    .slice(-4)
    .filter(m => m && m.content)
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: String(m.content).slice(0, 250)
    }));

  let rawReply = '';
  let provider = 'llama-server';

  // 1. Try local/Tailscale llama-server (:9931)
  if (status.llamaOnline) {
    try {
      const messages = [
        { role: 'system', content: INTERROGATION_SYSTEM_PROMPT },
        ...normalizedHistory,
        { role: 'user', content: promptUserMessage }
      ];

      const res = await fetch(`${LLAMA_SERVER_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: targetModel,
          messages,
          max_tokens: 75,
          temperature: 0.85,
          cache_prompt: true,
          chat_template_kwargs: { enable_thinking: false }
        })
      });

      if (res.ok) {
        const data = await res.json();
        rawReply = data.choices?.[0]?.message?.content || '';
      }
    } catch (err) {
      console.warn('[Interrogation Llama Error]:', err.message);
    }
  }

  // 2. Fallback to Cloud AI if model unreachable
  if (!rawReply) {
    try {
      provider = 'cloud-ai';
      const fallbackPrompt = `${INTERROGATION_SYSTEM_PROMPT}\n\nCandidate interaction:\n${promptUserMessage}`;
      rawReply = await generateAICompletion({
        systemPrompt: INTERROGATION_SYSTEM_PROMPT,
        prompt: promptUserMessage,
        temperature: 0.85
      });
    } catch (err) {
      rawReply = '[MOOD:colere|exclaim] Stop hesitating like an idiot! Walk me through your invariant or get out of my interview.';
    }
  }

  const parsed = parseInterrogationResponse(rawReply);

  // Suggest next phase if user successfully defended intuition or finished coding
  let suggestedPhase = phase;
  if (phase === 'INTUITION' && (trigger === 'user_spoke' && userSpeech.length > 40)) {
    suggestedPhase = 'IMPLEMENTATION';
  } else if (phase === 'IMPLEMENTATION' && trigger === 'code_submitted') {
    suggestedPhase = 'CROSS_EXAMINATION';
  }

  return {
    success: true,
    reply: parsed.reply,
    speechText: parsed.speechText,
    expression: parsed.expression,
    state: parsed.state,
    phase: suggestedPhase,
    codeSmells: codeTelemetry.smells,
    provider
  };
}

/**
 * Generate Final FAANG Scorecard & Hiring Decision
 */
export async function generateFinalVerdict({
  problem = {},
  code = '',
  language = 'python',
  transcript = [],
  timeSpentSeconds = 0,
  silenceCount = 0
}) {
  const codeTelemetry = analyzeCodeInFlight(code, language);

  const candidateDialogue = transcript
    .filter(t => t.role === 'user')
    .map(t => t.content)
    .join(' | ')
    .slice(0, 1000);

  const evaluationPrompt = `You are PACEY, the elite Staff Bar-Raiser. You just concluded a technical interview with this candidate.
PROBLEM: ${problem.title || 'Coding Challenge'} (${problem.difficulty || 'Medium'})
TIME SPENT: ${Math.round(timeSpentSeconds / 60)} minutes (${silenceCount} silence freezes detected)
CANDIDATE CODE:
\`\`\`${language}
${code.slice(0, 800)}
\`\`\`
CANDIDATE VERBAL TRANSCRIPTS:
"${candidateDialogue || 'Minimal verbal communication.'}"

EVALUATE AND RETURN STRICT JSON ONLY:
{
  "problemSolvingScore": <number 0-100>,
  "codeQualityScore": <number 0-100>,
  "communicationScore": <number 0-100>,
  "edgeCaseDefenseScore": <number 0-100>,
  "overallScore": <number 0-100>,
  "verdict": "<STRONG NO HIRE | NO HIRE | LEAN HIRE | STRONG HIRE>",
  "fsrsGrade": <1 for Again, 2 for Hard, 3 for Good, 4 for Easy>,
  "savageReview": "<2-3 sentence brutal, sarcastic, unfiltered review of their interview performance>",
  "actionableAdvice": ["<key algorithmic fix>", "<communication fix>", "<edge case lesson>"]
}`;

  let jsonResult = null;

  try {
    const rawOutput = await generateAICompletion({
      systemPrompt: 'You are an algorithmic bar-raiser grading a coding interview. Output pure valid JSON only.',
      prompt: evaluationPrompt,
      temperature: 0.5
    });

    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonResult = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.warn('[Verdict AI Generation Error]:', err.message);
  }

  // Fallback heuristic grading if LLM JSON fails
  if (!jsonResult) {
    const hasCode = code.trim().length > 60;
    const hasNested = codeTelemetry.hasNestedLoops;
    const score = hasCode ? (hasNested ? 45 : 72) : 20;
    const verdict = score >= 75 ? 'LEAN HIRE' : (score >= 50 ? 'NO HIRE' : 'STRONG NO HIRE');
    const fsrsGrade = score >= 75 ? 3 : (score >= 50 ? 2 : 1);

    jsonResult = {
      problemSolvingScore: score,
      codeQualityScore: hasNested ? 40 : 65,
      communicationScore: candidateDialogue.length > 50 ? 70 : 30,
      edgeCaseDefenseScore: 40,
      overallScore: score,
      verdict,
      fsrsGrade,
      savageReview: `You stumbled through ${problem.title || 'this problem'} like a blind badger. ${hasNested ? 'Your nested loops gave me physical headaches.' : 'At least you typed something semi-coherent.'}`,
      actionableAdvice: [
        'Analyze the problem space before jumping into loops.',
        'Speak your invariants out loud instead of freezing.',
        'Test empty arrays and edge cases immediately.'
      ]
    };
  }

  return {
    success: true,
    scorecard: jsonResult
  };
}
