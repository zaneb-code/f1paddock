/**
 * Race predictions and the leaderboard.
 *
 * Scoring moved to the server in Phase 2. In Phase 1 it ran in a reducer in
 * the browser, which meant the score was computed by the same machine that
 * benefits from it — fine for a demo, meaningless as a competition. Points
 * are now calculated here, from the real result, and written to the database.
 */

import Prediction from '../models/Prediction.js'
import User from '../models/User.js'
import { httpError } from '../middleware/errorHandler.js'

/** Points: exact placing, right driver in the wrong place, and pole. */
const POINTS = {
  exactPlacing: 10,
  rightDriverWrongPlace: 4,
  pole: 5,
}

/**
 * Compares a predicted podium against the real one.
 * Pure arithmetic, no database — which makes it easy to reason about and
 * easy to test.
 */
export function scorePodium(predicted = [], actual = [], predictedPole = null, actualPole = null) {
  let points = 0
  const breakdown = []

  predicted.forEach((driverId, index) => {
    if (actual[index] === driverId) {
      points += POINTS.exactPlacing
      breakdown.push({
        driverId,
        position: index + 1,
        result: 'exact',
        points: POINTS.exactPlacing,
      })
    } else if (actual.includes(driverId)) {
      points += POINTS.rightDriverWrongPlace
      breakdown.push({
        driverId,
        position: index + 1,
        result: 'podium',
        points: POINTS.rightDriverWrongPlace,
      })
    } else {
      breakdown.push({ driverId, position: index + 1, result: 'miss', points: 0 })
    }
  })

  if (predictedPole && actualPole && predictedPole === actualPole) {
    points += POINTS.pole
    breakdown.push({
      driverId: predictedPole,
      position: 'pole',
      result: 'exact',
      points: POINTS.pole,
    })
  }

  return { points, breakdown }
}

/* ------------------------------------------------------------------ */

/** GET /api/predictions/me?season=2026 */
export async function listMyPredictions(req, res) {
  const filter = { user: req.userId }
  if (req.query.season) filter.season = Number(req.query.season)
  if (req.query.round) filter.round = Number(req.query.round)

  const predictions = await Prediction.find(filter).sort({ season: -1, round: -1 })

  const totalPoints = predictions.reduce((sum, p) => sum + p.points, 0)
  res.json({ count: predictions.length, totalPoints, predictions })
}

/**
 * PUT /api/predictions/:season/:round
 *
 * PUT, because it is "make my prediction for this race be exactly this" —
 * sending it twice leaves the same single prediction, which is what
 * idempotent means. upsert creates it the first time and replaces it after.
 */
export async function savePrediction(req, res) {
  const season = Number(req.params.season)
  const round = Number(req.params.round)
  const { raceName, podium, poleDriverId } = req.body

  const existing = await Prediction.findOne({ user: req.userId, season, round })

  // Once a race has been scored the prediction is history, not a draft.
  if (existing?.scored) {
    return res
      .status(409)
      .json({ error: 'That race has already been scored — predictions are locked.' })
  }

  const prediction = await Prediction.findOneAndUpdate(
    { user: req.userId, season, round },
    { user: req.userId, season, round, raceName, podium, poleDriverId: poleDriverId ?? null },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  )

  res.status(existing ? 200 : 201).json({ prediction })
}

/**
 * POST /api/predictions/:season/:round/scores
 *
 * Scores every prediction for one race against the real result. A noun —
 * what is being created is a set of scores.
 *
 * The real finishing order comes from the client, which read it from the F1
 * API. That is a weakness worth naming: a determined user could post a
 * flattering result. Fixing it properly means the server fetching the result
 * itself, which is a small change to this function and a scheduled job to
 * call it.
 */
export async function scoreRace(req, res) {
  const season = Number(req.params.season)
  const round = Number(req.params.round)
  const { podium, poleDriverId } = req.body

  const predictions = await Prediction.find({ season, round, scored: false })

  const scored = []
  for (const prediction of predictions) {
    const { points } = scorePodium(prediction.podium, podium, prediction.poleDriverId, poleDriverId)

    prediction.points = points
    prediction.scored = true
    prediction.scoredAt = new Date()
    await prediction.save()

    scored.push(prediction)
  }

  res.json({ scored: scored.length, predictions: scored })
}

/**
 * POST /api/predictions/:id/scores
 *
 * Scores a single prediction — your own — against the real result. The
 * race-wide version above is the one a scheduled job would call; this one
 * exists because the race page scores your prediction the moment you open it
 * and the result is in.
 */
export async function scoreOne(req, res) {
  const prediction = await Prediction.findById(req.params.id)
  if (!prediction) throw httpError(404, 'That prediction no longer exists.')

  if (!prediction.user.equals(req.userId)) {
    return res.status(403).json({ error: 'You can only score your own prediction.' })
  }

  if (prediction.scored) return res.json({ prediction })

  const { podium, poleDriverId } = req.body
  const { points } = scorePodium(prediction.podium, podium, prediction.poleDriverId, poleDriverId)

  prediction.points = points
  prediction.scored = true
  prediction.scoredAt = new Date()
  await prediction.save()

  res.json({ prediction })
}

/**
 * GET /api/predictions/leaderboard
 *
 * One aggregation rather than reading every prediction into Node and adding
 * them up there. The database is better at this than we are.
 */
export async function leaderboard(_req, res) {
  const rows = await Prediction.aggregate([
    { $match: { scored: true } },
    {
      $group: {
        _id: '$user',
        totalPoints: { $sum: '$points' },
        racesScored: { $sum: 1 },
        bestRace: { $max: '$points' },
      },
    },
    { $sort: { totalPoints: -1, racesScored: 1 } },
    { $limit: 50 },
  ])

  // Attach usernames. One query for all of them, not one per row.
  const users = await User.find({ _id: { $in: rows.map((row) => row._id) } }).select('username')
  const nameById = Object.fromEntries(users.map((user) => [user._id.toString(), user.username]))

  res.json({
    count: rows.length,
    leaderboard: rows.map((row, index) => ({
      position: index + 1,
      userId: row._id.toString(),
      username: nameById[row._id.toString()] ?? 'Unknown',
      totalPoints: row.totalPoints,
      racesScored: row.racesScored,
      bestRace: row.bestRace,
    })),
  })
}
