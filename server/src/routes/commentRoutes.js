/** Shallow comment routes — one comment, by its own id. */

import { Router } from 'express'

import * as comments from '../controllers/commentController.js'
import { requireAuth } from '../middleware/auth.js'
import { validateObjectId } from '../middleware/validate.js'

const router = Router()

router.delete('/:id', validateObjectId(), requireAuth, comments.deleteComment)

export default router
