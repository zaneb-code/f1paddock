/** Profile routes: favourites, follows and fan matching. */

import { Router } from 'express'

import * as profiles from '../controllers/profileController.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { sanitizeBody } from '../middleware/sanitize.js'
import { validate, rule } from '../middleware/validate.js'

const router = Router()

const idListRule = [rule.array({ max: 60, unique: true }, 'Too many, or there is a duplicate')]

// Specific paths before parameterised ones: /me must be matched before
// /:username, or "me" is read as somebody's username.
router.get('/me', requireAuth, profiles.getMyProfile)
router.get('/me/similar', requireAuth, profiles.findSimilarFans)

router.patch(
  '/me',
  requireAuth,
  sanitizeBody('displayName', 'bio'),
  validate({
    displayName: [rule.string(), rule.maxLength(40, 'At most 40 characters')],
    bio: [rule.string(), rule.maxLength(200, 'At most 200 characters')],
    favouriteDrivers: idListRule,
    favouriteTeams: idListRule,
    favouriteCircuits: idListRule,
    favouriteEras: idListRule,
    followedDrivers: idListRule,
    followedTeams: idListRule,
  }),
  profiles.updateMyProfile,
)

router.put(
  '/me/follows/:kind/:entityId',
  requireAuth,
  (req, res, next) => {
    if (!['driver', 'team'].includes(req.params.kind)) {
      return res.status(400).json({ error: 'You can follow a driver or a team.' })
    }
    next()
  },
  profiles.toggleFollowEntity,
)

router.get('/', optionalAuth, profiles.listProfiles)
router.get('/:username', optionalAuth, profiles.getProfileByUsername)
router.put('/:username/follow', requireAuth, profiles.toggleFollowUser)

export default router
