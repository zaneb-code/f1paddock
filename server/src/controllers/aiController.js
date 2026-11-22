
import { getPrediction, aiProvider } from '../ai/provider.js'
export function status(_req, res) {
  res.json({
    provider: aiProvider,
    isLanguageModel: aiProvider !== 'heuristic',
  })
}

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
