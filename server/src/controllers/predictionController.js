import Prediction from '../models/Prediction.js'
import User from '../models/User.js'
import { httpError } from '../middleware/errorHandler.js'

const POINTS = {
  exactPlacing: 10,
  rightDriverWrongPlace: 4,
  pole: 5,
}

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

export async function listMyPredictions(req, res) {
  const filter = { user: req.userId }
  if (req.query.season) filter.season = Number(req.query.season)
  if (req.query.round) filter.round = Number(req.query.round)

  const predictions = await Prediction.find(filter).sort({ season: -1, round: -1 })

  const totalPoints = predictions.reduce((sum, p) => sum + p.points, 0)
  res.json({ count: predictions.length, totalPoints, predictions })
}

export async function savePrediction(req, res) {
  const season = Number(req.params.season)
  const round = Number(req.params.round)
  const { raceName, podium, poleDriverId } = req.body

  const existing = await Prediction.findOne({ user: req.userId, season, round })

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