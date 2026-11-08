/**
 * AI prediction route.
 *
 * POST /api/ai/predict
 *
 * The client sends the F1 context it already fetched from Jolpica (the race,
 * the current standings, recent podiums) and gets back a predicted podium.
 * Sending the context rather than fetching it again here keeps the server
 * stateless and means one less API round trip.
 *
 * Protected by requireAuth: an LLM call costs money, so it is not left open
 * to anyone who finds the URL.
 */

import { Router } from 'express'
import { getPrediction, aiProvider } from '../ai/provider.js'
import { requireAuth } from '../lib/jwt.js'

const router = Router()

/** Very small in-memory rate limit: one prediction per user per race per minute. */
const lastCall = new Map()
const COOLDOWN_MS = 60 * 1000

router.get('/status', (req, res) => {
  res.json({
    provider: aiProvider,
    isLlm: aiProvider !== 'heuristic',
  })
})

router.post('/predict', requireAuth, async (req, res) => {
  const { race, standings, recentForm } = req.body ?? {}

  if (!race?.raceName || !Array.isArray(standings) || standings.length === 0) {
    return res.status(400).json({
      error: 'A race and a non-empty standings array are required.',
    })
  }

  const key = `${req.auth.sub}:${race.season}:${race.round}`
  const previous = lastCall.get(key)

  if (previous && Date.now() - previous < COOLDOWN_MS) {
    const waitSeconds = Math.ceil((COOLDOWN_MS - (Date.now() - previous)) / 1000)
    return res.status(429).json({
      error: `Please wait ${waitSeconds}s before requesting another prediction for this race.`,
      retryAfterSeconds: waitSeconds,
    })
  }

  lastCall.set(key, Date.now())

  try {
    const prediction = await getPrediction({ race, standings, recentForm: recentForm ?? [] })
    res.json(prediction)
  } catch (error) {
    console.error('[ai] prediction failed:', error)
    res.status(502).json({ error: 'Could not generate a prediction right now.' })
  }
})

export default router
