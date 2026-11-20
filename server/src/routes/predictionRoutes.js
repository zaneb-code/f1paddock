/** Prediction and leaderboard routes. */

import { Router } from 'express'

import * as predictions from '../controllers/predictionController.js'
import { requireAuth, requireVerified } from '../middleware/auth.js'
import { sanitizeBody } from '../middleware/sanitize.js'
import { validate, rule, validateObjectId } from '../middleware/validate.js'

const router = Router()

const podiumRules = [
  rule.required('Pick your podium'),
  rule.array({ min: 3, max: 3, unique: true }, 'Pick three different drivers'),
]

// The leaderboard is public — it is the scoreboard of a competition.
router.get('/leaderboard', predictions.leaderboard)

router.get('/me', requireAuth, predictions.listMyPredictions)

router.put(
  '/:season/:round',
  requireAuth,
  requireVerified,
  sanitizeBody('raceName'),
  validate({
    raceName: [rule.required('Which race?'), rule.maxLength(80)],
    podium: podiumRules,
  }),
  predictions.savePrediction,
)

router.post(
  '/:id/scores',
  validateObjectId(),
  requireAuth,
  validate({ podium: podiumRules }),
  predictions.scoreOne,
)

router.post(
  '/:season/:round/scores',
  requireAuth,
  validate({ podium: podiumRules }),
  predictions.scoreRace,
)

export default router
