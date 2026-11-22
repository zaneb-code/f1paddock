/**
 * The AI race-prediction provider.
 *
 * One function, getPrediction(), with four implementations behind it. Which
 * one runs is decided by AI_PROVIDER in .env:
 *
 *   heuristic  (default) - no LLM. A transparent points-and-form calculation.
 *                          Used when no API key is configured so the feature
 *                          always works. It is clearly labelled as such in the
 *                          response and in the UI: it is NOT an AI prediction.
 *   gemini     - Google Gemini            (GEMINI_API_KEY)
 *   openai     - OpenAI                   (OPENAI_API_KEY)
 *   anthropic  - Anthropic Claude         (ANTHROPIC_API_KEY)
 *
 * Why the key lives here and not in the React app: anything in frontend code
 * is downloadable by anyone who opens devtools. An API key in the browser is
 * a published API key. That is the whole reason this small server exists.
 */

const PROVIDER = (process.env.AI_PROVIDER || 'heuristic').toLowerCase()

/* ------------------------------------------------------------------
 *  Shared prompt
 * ------------------------------------------------------------------ */

function buildPrompt(context) {
  const { race, standings = [], recentForm = [] } = context

  const standingsText = standings
    .slice(0, 12)
    .map(
      (s) => `${s.position}. ${s.driverName} (${s.constructor}) — ${s.points} pts, ${s.wins} wins`,
    )
    .join('\n')

  const formText = recentForm.length
    ? recentForm.map((r) => `${r.raceName}: ${r.top3.join(', ')}`).join('\n')
    : 'No recent results supplied.'

  return `You are a Formula 1 analyst. Predict the podium for an upcoming Grand Prix.

RACE
${race.raceName}, round ${race.round} of the ${race.season} season.
Circuit: ${race.circuitName}, ${race.locality}, ${race.country}.
Race date: ${race.date}.

CURRENT DRIVERS' CHAMPIONSHIP
${standingsText}

RECENT RACE WINNERS AND PODIUMS
${formText}

TASK
Predict first, second and third place. Then give one short paragraph of
reasoning (maximum 60 words) that refers to actual evidence above — championship
position, recent form, or a known characteristic of this circuit.

Respond with JSON only, no markdown fence, in exactly this shape:
{
  "podium": [
    { "position": 1, "driverName": "...", "constructor": "...", "confidence": 0.0 },
    { "position": 2, "driverName": "...", "constructor": "...", "confidence": 0.0 },
    { "position": 3, "driverName": "...", "constructor": "...", "confidence": 0.0 }
  ],
  "rationale": "..."
}
confidence is between 0 and 1. Only use driver names that appear in the standings above.`
}

/** Pulls a JSON object out of a model response that may be wrapped in prose or a code fence. */
function parseModelJson(text) {
  const cleaned = String(text)
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        /* fall through */
      }
    }
    return null
  }
}

/* ------------------------------------------------------------------
 *  Heuristic fallback (no LLM)
 * ------------------------------------------------------------------ */

/**
 * Ranks drivers by championship points plus a small bonus for appearing on
 * recent podiums. Deliberately simple and explainable — its job is to keep
 * the feature usable without a key, not to pretend to be a model.
 */
function heuristicPrediction(context) {
  const { standings = [], recentForm = [] } = context

  const formBonus = new Map()
  recentForm.forEach((race, index) => {
    // The most recent race counts most.
    const weight = Math.max(1, recentForm.length - index)
    race.top3?.forEach((name, place) => {
      const value = weight * (3 - place)
      formBonus.set(name, (formBonus.get(name) ?? 0) + value)
    })
  })

  const maxPoints = Math.max(1, ...standings.map((s) => Number(s.points) || 0))

  const ranked = standings
    .map((s) => {
      const championship = (Number(s.points) || 0) / maxPoints
      const form = (formBonus.get(s.driverName) ?? 0) / 30
      return { ...s, score: championship * 0.75 + Math.min(form, 1) * 0.25 }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const total = ranked.reduce((sum, d) => sum + d.score, 0) || 1

  return {
    podium: ranked.map((d, index) => ({
      position: index + 1,
      driverName: d.driverName,
      constructor: d.constructor,
      confidence: Number((d.score / total).toFixed(2)),
    })),
    rationale:
      'Calculated from championship points (75%) and podium finishes in the last few rounds (25%). ' +
      'This is arithmetic, not a language model — configure an AI provider on the server for a real prediction.',
  }
}

/* ------------------------------------------------------------------
 *  LLM providers
 * ------------------------------------------------------------------ */

/**
 * How long any one provider gets before we give up and fall back.
 *
 * Deliberately shorter than the browser's own 30s ceiling on this request:
 * if the model is slow we want the SERVER to notice first and return the
 * heuristic podium, rather than the client timing out and showing nothing.
 * A slow third party should degrade the answer, never remove it.
 */
const LLM_TIMEOUT_MS = 12_000

/**
 * 429 and 5xx mean "busy, ask again" rather than "your request is wrong", so
 * one retry is worth it — a 503 from an overloaded model clears in seconds.
 * Anything else (401 for a bad key, 400 for a malformed request) will fail
 * identically the second time, so retrying it only wastes the user's wait.
 */
const RETRYABLE = new Set([429, 500, 502, 503, 504])
const RETRY_DELAY_MS = 1200

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Runs `attempt` once, and once more after a pause if it failed in a way
 * worth retrying. Two tries at 12s plus the pause stays inside the 30s the
 * browser allows, so the fallback still gets its chance.
 */
async function withRetry(attempt) {
  try {
    return await attempt()
  } catch (error) {
    if (!error.retryable) throw error

    console.warn(`  [ai] ${error.message} — retrying once`)
    await pause(RETRY_DELAY_MS)
    return attempt()
  }
}

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set')

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'

  return withRetry(() => askGemini(key, model, prompt))
}

async function askGemini(key, model, prompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // The key goes in a header, not the query string. A URL ends up in
        // server logs, proxy logs and error reports; a header does not. Same
        // reason a password never belongs in a GET parameter.
        'x-goog-api-key': key,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    },
  )

  if (!response.ok) {
    const error = new Error(`Gemini returned ${response.status}`)
    error.retryable = RETRYABLE.has(response.status)
    error.detail = await response.text()
    throw error
  }

  const data = await response.json()
  return { text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '', model }
}

async function callOpenAI(prompt) {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not set')

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  })

  if (!response.ok) throw new Error(`OpenAI returned ${response.status}: ${await response.text()}`)

  const data = await response.json()
  return { text: data.choices?.[0]?.message?.content ?? '', model }
}

async function callAnthropic(prompt) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set')

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5'
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  })

  if (!response.ok)
    throw new Error(`Anthropic returned ${response.status}: ${await response.text()}`)

  const data = await response.json()
  return { text: data.content?.[0]?.text ?? '', model }
}

const CALLERS = { gemini: callGemini, openai: callOpenAI, anthropic: callAnthropic }

/* ------------------------------------------------------------------
 *  Public entry point
 * ------------------------------------------------------------------ */

export async function getPrediction(context) {
  const base = {
    race: context.race,
    generatedAt: new Date().toISOString(),
  }

  if (PROVIDER === 'heuristic' || !CALLERS[PROVIDER]) {
    return { ...base, ...heuristicPrediction(context), source: 'heuristic', model: null }
  }

  try {
    const { text, model } = await CALLERS[PROVIDER](buildPrompt(context))
    const parsed = parseModelJson(text)

    if (!parsed?.podium?.length) {
      throw new Error('Model did not return a usable podium')
    }

    return {
      ...base,
      podium: parsed.podium.slice(0, 3),
      rationale: parsed.rationale ?? '',
      source: PROVIDER,
      model,
    }
  } catch (error) {
    // A provider outage must not take the page down. Fall back, and say so
    // honestly rather than passing arithmetic off as a model's answer.
    console.error(`[ai] ${PROVIDER} failed, falling back to heuristic:`, error.message)
    return {
      ...base,
      ...heuristicPrediction(context),
      source: 'heuristic',
      model: null,
      fallbackFrom: PROVIDER,
      fallbackReason: error.message,
    }
  }
}

export const aiProvider = PROVIDER
