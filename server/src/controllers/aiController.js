/**
 * The AI prediction endpoint.
 *
 * This route is the reason the project has a backend at all: a language
 * model needs an API key, and anything in React code is downloadable by
 * anyone who opens devtools. A key in the frontend is a published key.
 */

import { getPrediction, aiProvider } from '../ai/provider.js'

/** GET /api/ai/status — which engine is configured. */
export function status(_req, res) {
  res.json({
    provider: aiProvider,
    isLanguageModel: aiProvider !== 'heuristic',
  })
}

/** POST /api/ai/predict */
export async function predict(req, res) {
  const { race, standings, recentForm } = req.body ?? {}

  if (!race?.raceName || !Array.isArray(standings) || standings.length === 0) {
    return res.status(400).json({
      error: 'Send the race and the current standings so there is something to reason about.',
    })
  }

  const prediction = await getPrediction({
    race,
    standings: standings.slice(0, 24),
    recentForm: Array.isArray(recentForm) ? recentForm.slice(0, 5) : [],
  })

  res.json({ prediction })
}
