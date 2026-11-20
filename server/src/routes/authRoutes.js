/**
 * Auth routes.
 *
 * Read the middleware chain on each route left to right — it is the request's
 * journey, and the order is deliberate:
 *
 *   rateLimit  →  sanitizeBody  →  validate  →  controller
 *
 * Sanitising before validating means length limits are measured on what will
 * actually be stored, so a 25-character username cannot be smuggled past a
 * 20-character rule by padding it with markup that is about to be stripped.
 */

import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import * as auth from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'
import { sanitizeBody } from '../middleware/sanitize.js'
import { validate, rule } from '../middleware/validate.js'

const router = Router()

/**
 * Brute force costs an attacker nothing if we let them try forever. Twenty
 * attempts per quarter hour per IP is generous for a person and useless for
 * a script. CORS does not help here at all — it governs what a browser may
 * read, and an attacker uses curl.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Wait a few minutes and try again.' },
})

const passwordRules = [
  rule.required('Choose a password'),
  rule.string(),
  rule.minLength(8, 'Use at least 8 characters'),
  rule.maxLength(100, 'That is longer than necessary'),
]

router.post(
  '/register',
  authLimiter,
  sanitizeBody('email', 'username'),
  validate({
    email: [rule.required('Enter your email'), rule.email()],
    username: [
      rule.required('Pick a username'),
      rule.minLength(3, 'At least 3 characters'),
      rule.maxLength(20, 'At most 20 characters'),
      rule.username(),
    ],
    password: passwordRules,
  }),
  auth.register,
)

router.post(
  '/verify',
  authLimiter,
  sanitizeBody('email', 'code'),
  validate({
    email: [rule.required('Enter your email'), rule.email()],
    code: [rule.required('Enter the code'), rule.match(/^\d{6}$/, 'The code is six digits')],
  }),
  auth.verify,
)

router.post(
  '/resend',
  authLimiter,
  sanitizeBody('email'),
  validate({ email: [rule.required('Enter your email'), rule.email()] }),
  auth.resend,
)

router.post(
  '/login',
  authLimiter,
  sanitizeBody('email'),
  validate({
    email: [rule.required('Enter your email'), rule.email()],
    password: [rule.required('Enter your password')],
  }),
  auth.login,
)

router.post('/logout', auth.logout)

router.get('/me', requireAuth, auth.me)

router.patch(
  '/password',
  requireAuth,
  validate({
    currentPassword: [rule.required('Enter your current password')],
    newPassword: passwordRules,
    confirmPassword: [
      rule.required('Confirm the new password'),
      rule.matchesField('newPassword', 'The two passwords do not match'),
    ],
  }),
  auth.changePassword,
)

export default router
