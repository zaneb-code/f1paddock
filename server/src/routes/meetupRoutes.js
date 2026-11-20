/** Meetup routes. */

import { Router } from 'express'

import * as meetups from '../controllers/meetupController.js'
import { requireAuth, optionalAuth, requireVerified } from '../middleware/auth.js'
import { sanitizeBody } from '../middleware/sanitize.js'
import { validate, rule, validateObjectId } from '../middleware/validate.js'

const router = Router()

router.get('/', optionalAuth, meetups.listMeetups)

router.post(
  '/',
  requireAuth,
  requireVerified,
  sanitizeBody('title', 'description', 'location'),
  validate({
    title: [
      rule.required('Give the meetup a title'),
      rule.minLength(4, 'At least 4 characters'),
      rule.maxLength(80, 'At most 80 characters'),
    ],
    location: [
      rule.required('Where is it? A place, or a link for online'),
      rule.maxLength(120, 'At most 120 characters'),
    ],
    description: [rule.maxLength(400, 'At most 400 characters')],
    startsAt: [rule.required('When does it start?'), rule.isoDate()],
    isOnline: [rule.boolean()],
    raceRound: [rule.integer({ min: 1, max: 30 }, 'That is not a round number')],
    capacity: [rule.integer({ min: 2, max: 500 }, 'Between 2 and 500')],
  }),
  meetups.createMeetup,
)

router.put('/:id/attendance', validateObjectId(), requireAuth, meetups.toggleAttendance)
router.delete('/:id', validateObjectId(), requireAuth, meetups.deleteMeetup)

export default router
