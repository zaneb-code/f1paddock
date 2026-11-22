
import { Router } from 'express'

import * as posts from '../controllers/postController.js'
import * as comments from '../controllers/commentController.js'
import { requireAuth, optionalAuth, requireVerified } from '../middleware/auth.js'
import { sanitizeBody } from '../middleware/sanitize.js'
import { validate, rule, validateObjectId } from '../middleware/validate.js'

const router = Router()

const bodyRules = [
  rule.required('Write something first'),
  rule.string(),
  rule.minLength(2, 'A little more than that'),
  rule.maxLength(1000, 'At most 1000 characters'),
]

router.get('/', optionalAuth, posts.listPosts)

router.post(
  '/',
  requireAuth,
  requireVerified,
  sanitizeBody('body'),
  validate({
    body: bodyRules,
    raceRound: [rule.integer({ min: 1, max: 30 }, 'That is not a round number')],
    season: [rule.integer({ min: 1950 }, 'That is not a season')],
  }),
  posts.createPost,
)

router.get('/:id', validateObjectId(), optionalAuth, posts.getPost)
router.delete('/:id', validateObjectId(), requireAuth, posts.deletePost)
router.put('/:id/like', validateObjectId(), requireAuth, posts.toggleLike)

/* ---- nested: the comments of one post ---- */

router.get('/:postId/comments', validateObjectId('postId'), comments.listComments)

router.post(
  '/:postId/comments',
  validateObjectId('postId'),
  requireAuth,
  requireVerified,
  sanitizeBody('body'),
  validate({
    body: [
      rule.required('Write something first'),
      rule.minLength(2, 'A little more than that'),
      rule.maxLength(500, 'At most 500 characters'),
    ],
  }),
  comments.createComment,
)

export default router
