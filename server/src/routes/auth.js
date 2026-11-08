/**
 * Authentication routes.
 *
 * The registration flow is three steps, which is what the email-verification
 * requirement asks for:
 *
 *   POST /api/auth/register   create the account (unverified), email a 6-digit code
 *   POST /api/auth/verify     submit the code -> account verified -> JWT issued
 *   POST /api/auth/login      email + password -> JWT issued (verified accounts only)
 *
 * Plus:
 *   POST /api/auth/resend     send a fresh code
 *   GET  /api/auth/me         who am I? (proves the token works)
 */

import { Router } from 'express'
import bcrypt from 'bcryptjs'

import {
  createUser,
  findUserByEmail,
  findUserByUsername,
  markVerified,
  generateCode,
  saveCode,
  checkCode,
} from '../lib/store.js'
import { sendVerificationEmail } from '../lib/mailer.js'
import { signToken, publicUser, requireAuth } from '../lib/jwt.js'

const router = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

/** Server-side validation. Never trust the browser's checks. */
function validateRegistration({ email, username, password }) {
  const errors = {}

  if (!email || !EMAIL_RE.test(email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (!username || !USERNAME_RE.test(username)) {
    errors.username = 'Username must be 3-20 characters: letters, numbers or underscores.'
  }
  if (!password || password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
  }

  return errors
}

/* ------------------------------------------------------------------
 *  POST /api/auth/register
 * ------------------------------------------------------------------ */
router.post('/register', async (req, res) => {
  const { email, username, password } = req.body ?? {}

  const errors = validateRegistration({ email, username, password })
  if (Object.keys(errors).length) {
    return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors })
  }

  const existing = findUserByEmail(email)

  // An account that exists but was never verified can simply start over —
  // otherwise a typo'd signup would lock that email address forever.
  if (existing && existing.emailVerified) {
    return res.status(409).json({
      error: 'An account with this email already exists.',
      fields: { email: 'Already registered — try logging in.' },
    })
  }

  if (!existing && findUserByUsername(username)) {
    return res.status(409).json({
      error: 'That username is taken.',
      fields: { username: 'Already taken.' },
    })
  }

  // bcrypt is deliberately slow, which is what makes a stolen hash expensive
  // to brute-force. 10 rounds is the usual default.
  const passwordHash = await bcrypt.hash(password, 10)

  if (existing) {
    existing.username = username
    existing.passwordHash = passwordHash
  } else {
    createUser({ email, username, passwordHash })
  }

  const code = generateCode()
  saveCode(email, code)
  const mail = await sendVerificationEmail(email, code)

  res.status(201).json({
    message: 'Account created. Check your email for a 6-digit code.',
    email: String(email).toLowerCase(),
    delivery: mail,
  })
})

/* ------------------------------------------------------------------
 *  POST /api/auth/verify
 * ------------------------------------------------------------------ */
router.post('/verify', (req, res) => {
  const { email, code } = req.body ?? {}

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are both required.' })
  }

  const user = findUserByEmail(email)
  if (!user) {
    return res.status(404).json({ error: 'No account found for that email.' })
  }

  if (user.emailVerified) {
    return res.status(409).json({ error: 'This email is already verified. Please log in.' })
  }

  const result = checkCode(email, code)

  if (!result.ok) {
    const messages = {
      missing: 'No code is pending for this email. Request a new one.',
      expired: 'That code has expired. Request a new one.',
      locked: 'Too many incorrect attempts. Request a new code.',
      mismatch: 'That code is not correct.',
    }
    return res.status(400).json({
      error: messages[result.reason] ?? 'Verification failed.',
      reason: result.reason,
      attemptsLeft: result.attemptsLeft,
    })
  }

  markVerified(email)

  // Verifying logs you straight in — no reason to make someone who just
  // proved they own the address type their password again.
  res.json({
    message: 'Email verified.',
    token: signToken(user),
    user: publicUser(user),
  })
})

/* ------------------------------------------------------------------
 *  POST /api/auth/resend
 * ------------------------------------------------------------------ */
router.post('/resend', async (req, res) => {
  const { email } = req.body ?? {}
  const user = findUserByEmail(email)

  if (!user) return res.status(404).json({ error: 'No account found for that email.' })
  if (user.emailVerified) return res.status(409).json({ error: 'Already verified.' })

  const code = generateCode()
  saveCode(email, code)
  const mail = await sendVerificationEmail(email, code)

  res.json({ message: 'A new code is on its way.', delivery: mail })
})

/* ------------------------------------------------------------------
 *  POST /api/auth/login
 * ------------------------------------------------------------------ */
router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {}

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }

  const user = findUserByEmail(email)

  // One message for "no such user" and "wrong password" on purpose: telling
  // them apart would let someone discover which emails have accounts.
  const invalid = () => res.status(401).json({ error: 'Incorrect email or password.' })

  if (!user) return invalid()

  const matches = await bcrypt.compare(password, user.passwordHash)
  if (!matches) return invalid()

  if (!user.emailVerified) {
    return res.status(403).json({
      error: 'Please verify your email before logging in.',
      needsVerification: true,
      email: user.email,
    })
  }

  res.json({ token: signToken(user), user: publicUser(user) })
})

/* ------------------------------------------------------------------
 *  GET /api/auth/me
 * ------------------------------------------------------------------ */
router.get('/me', requireAuth, (req, res) => {
  const user = findUserByEmail(req.auth.email)
  if (!user) return res.status(404).json({ error: 'Account no longer exists.' })
  res.json({ user: publicUser(user) })
})

export default router
