/**
 * Reporting and the stewards' queue.
 *
 * Note where requireModerator sits: on the server, in front of the handler.
 * In Phase 1 the moderator check ran in the browser, which hid the admin page
 * from honest users and stopped nobody who opened devtools.
 */

import { Router } from 'express'

import * as reports from '../controllers/reportController.js'
import { requireAuth, requireModerator } from '../middleware/auth.js'
import { sanitizeBody } from '../middleware/sanitize.js'
import { validate, rule, validateObjectId } from '../middleware/validate.js'

const router = Router()

router.post(
  '/',
  requireAuth,
  sanitizeBody('reason'),
  validate({
    targetType: [
      rule.required('What are you reporting?'),
      rule.oneOf(['post', 'comment', 'user'], 'You can report a post, a comment or a user'),
    ],
    targetId: [rule.required('Missing the id of the thing being reported')],
    reason: [
      rule.required('Say why you are reporting this'),
      rule.minLength(4, 'A little more detail, please'),
      rule.maxLength(300, 'At most 300 characters'),
    ],
  }),
  reports.createReport,
)

router.get('/', requireAuth, requireModerator, reports.listReports)

router.patch(
  '/:id',
  validateObjectId(),
  requireAuth,
  requireModerator,
  validate({
    action: [
      rule.required('Say what you did'),
      rule.oneOf(['dismissed', 'removed'], 'Dismiss it or remove the content'),
    ],
  }),
  reports.resolveReport,
)

export default router
