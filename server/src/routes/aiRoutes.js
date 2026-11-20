/** AI prediction routes. */

import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import * as ai from '../controllers/aiController.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

/**
 * A model call costs money and takes a second or two. Without a limit, one
 * impatient click-through could run up a bill or stall the server for
 * everyone else.
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Give the engine a moment — try again shortly.' },
})

router.get('/status', ai.status)
router.post('/predict', requireAuth, aiLimiter, ai.predict)

export default router
