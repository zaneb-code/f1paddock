/**
 * AI prediction route.
 */

import { Router } from 'express'
import { getPrediction, aiProvider } from '../ai/provider.js'
import { requireAuth } from '../lib/jwt.js'

const router = Router()
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
