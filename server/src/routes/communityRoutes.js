/** Community routes. */

import { Router } from 'express'

import * as communities from '../controllers/communityController.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { sanitizeBody } from '../middleware/sanitize.js'
import { validate, rule } from '../middleware/validate.js'

const router = Router()

router.get('/', optionalAuth, communities.listCommunities)
router.get('/:slug', optionalAuth, communities.getCommunity)

router.post(
  '/',
  requireAuth,
  sanitizeBody('name', 'description'),
  validate({
    name: [
      rule.required('Give the community a name'),
      rule.minLength(3, 'At least 3 characters'),
      rule.maxLength(50, 'At most 50 characters'),
    ],
    description: [rule.maxLength(280, 'At most 280 characters')],
    type: [rule.oneOf(['driver', 'team', 'general'], 'Pick driver, team or general')],
  }),
  communities.createCommunity,
)

// The membership is the resource being changed, so the URL says `membership`
// and not `join`. The verb is already the HTTP method.
router.put('/:slug/membership', requireAuth, communities.toggleMembership)

export default router
