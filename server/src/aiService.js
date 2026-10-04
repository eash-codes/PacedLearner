import 'dotenv/config';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'groq/compound';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/auto';

/**
 * Universal resilient completion helper.
 * Tries Google Gemini first -> falls back to OpenRouter (auto-mode) -> falls back to Groq.
 */
export async function generateAICompletion(prompt, systemInstruction = '') {
  // 1. Try Google Gemini (Gemini 3.6 Flash)
  if (GEMINI_API_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const payload = {
        contents: [
          {
            parts: [
              { text: (systemInstruction ? `${systemInstruction}\n\n` : '') + prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      } else {
        const errText = await res.text();
        console.warn(`[AI Service] Gemini returned status ${res.status}: ${errText}. Falling back to OpenRouter...`);
      }
    } catch (err) {
      console.warn('[AI Service] Gemini call failed:', err.message, 'Trying OpenRouter...');
    }
  }

  // 2. Fallback to OpenRouter (Automatic failover model routing)
  if (OPENROUTER_API_KEY) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'PacedLearner'
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 1024
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.trim();
      } else {
        console.warn(`[AI Service] OpenRouter returned ${res.status}. Falling back to Groq...`);
      }
    } catch (err) {
      console.warn('[AI Service] OpenRouter call failed:', err.message, 'Trying Groq...');
    }
  }

  // 3. Fallback to Groq
  if (GROQ_API_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 1024
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.trim();
      }
    } catch (err) {
      console.warn('[AI Service] Groq call failed:', err.message);
    }
  }

  throw new Error('All AI model providers (Gemini, OpenRouter, Groq) failed or are unconfigured.');
}

/**
 * Analyze an algorithmic solution using Gemini
 */
export async function analyzeCodeWithGemini(code, tags = [], title = '') {
  const prompt = `You are an elite algorithms expert for FAANG interview preparation.
Analyze this LeetCode solution for problem: "${title}".
Tags provided: ${tags.join(', ')}

Code:
\`\`\`
${code}
\`\`\`

Return a strictly valid JSON object with the following fields:
{
  "patterns": ["Primary Pattern", "Secondary Pattern"],
  "time_complexity": "O(...)",
  "space_complexity": "O(...)",
  "intuition": "2-3 concise sentences explaining the core mathematical or algorithmic invariant.",
  "pitfalls": "Key edge cases, bounds, or potential bugs to remember."
}
Return ONLY valid JSON. No markdown ticks, no commentary.`;

  try {
    const raw = await generateAICompletion(prompt, 'You are an automated JSON API that outputs only raw JSON.');
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[AI Service] Failed to parse AI analysis response:', err);
    return null;
  }
}

/**
 * Generate a progressive Socratic recall hint for Flashcard Review
 */
export async function generateSocraticHint(problem, hintLevel = 1) {
  const prompt = `You are a Socratic algorithmic recall coach.
The user is reviewing the LeetCode problem: "${problem.title}".
Tags: ${(problem.tags || []).join(', ')}
Difficulty: ${problem.difficulty}
Their recorded intuition: "${problem.intuition || 'None'}"

Generate a Hint Level ${hintLevel} out of 3:
- Level 1: A subtle conceptual question or high-level spark that jogs memory without revealing the algorithm name or solution.
- Level 2: A structural nudge indicating what property, invariant, or data structure to consider.
- Level 3: A direct invariant reminder detailing the core insight and crucial edge cases, without writing the code.

Keep the response concise (1-2 sentences), motivating, and intellectually rigorous. Do NOT reveal the code snippet.`;

  return await generateAICompletion(prompt, 'You are a concise, world-class algorithmic mentor.');
}
