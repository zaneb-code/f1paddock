import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

import User from '../models/User.js'
import Profile from '../models/Profile.js'
import { signToken } from '../lib/jwt.js'
import { sendVerificationEmail } from '../lib/mailer.js'
import { SESSION_COOKIE, sessionCookieOptions } from '../middleware/auth.js'
import { httpError } from '../middleware/errorHandler.js'

const CODE_TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5

const MODERATOR_USERNAMES = (process.env.MODERATOR_USERNAMES ?? 'admin,moderator,steward')
  .split(',')
  .map((name) => name.trim().toLowerCase())
  .filter(Boolean)

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

async function issueCode(user) {
  const code = generateCode()

  user.verification = {
    codeHash: await bcrypt.hash(code, 10),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
    attempts: 0,
  }
  await user.save()

  return sendVerificationEmail(user.email, code)
}

function startSession(res, user) {
  res.cookie(
    SESSION_COOKIE,
    signToken({ id: user._id.toString(), email: user.email, username: user.username }),
    sessionCookieOptions(),
  )
}

export async function register(req, res) {
  const { email, username, password } = req.body

  const clash = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] })

  if (clash) {
    const field = clash.email === email.toLowerCase() ? 'email' : 'username'
    return res.status(409).json({
      error: field === 'email' ? 'That email is already registered.' : 'That username is taken.',
      fields: { [field]: field === 'email' ? 'Already registered' : 'Already taken' },
    })
  }

  const user = new User({
    email,
    username,
    emailVerified: false,
    role: MODERATOR_USERNAMES.includes(username.toLowerCase()) ? 'moderator' : 'member',
  })

  await user.setPassword(password)
  await user.save()

  await Profile.create({ user: user._id, username: user.username })

  const delivery = await issueCode(user)

  res.status(201).json({
    message: 'Account created. Check your email for a six-digit code.',
    email: user.email,
    needsVerification: true,
    delivery,
  })
}

export async function verify(req, res) {
  const { email, code } = req.body

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+verification.codeHash +verification.expiresAt +verification.attempts',
  )

  const generic = { error: 'That code is not right. Request a new one if it has expired.' }

  if (!user || !user.verification?.codeHash) return res.status(400).json(generic)

  if (user.verification.expiresAt && user.verification.expiresAt.getTime() < Date.now()) {
    return res
      .status(400)
      .json({ error: 'That code has expired. Send yourself a new one.', reason: 'expired' })
  }

  if (user.verification.attempts >= MAX_ATTEMPTS) {
    return res.status(429).json({
      error: 'Too many wrong attempts. Request a new code.',
      reason: 'locked',
    })
  }

  const matches = await bcrypt.compare(String(code), user.verification.codeHash)

  if (!matches) {
    user.verification.attempts += 1
    await user.save()

    return res.status(400).json({
      ...generic,
      attemptsLeft: MAX_ATTEMPTS - user.verification.attempts,
    })
  }

  user.emailVerified = true
  user.verification = { codeHash: undefined, expiresAt: undefined, attempts: 0 }
  await user.save()

  startSession(res, user)
  res.json({ message: 'Email verified.', user: user.toPublic() })
}

export async function resend(req, res) {
  const user = await User.findOne({ email: req.body.email.toLowerCase() })

  const reply = { message: 'If that address has an unverified account, a new code is on its way.' }

  if (user && !user.emailVerified) reply.delivery = await issueCode(user)

  res.json(reply)
}

export async function login(req, res) {
  const { email, password } = req.body

  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash')

  const wrong = { error: 'Email or password is incorrect.' }

  if (!user) return res.status(401).json(wrong)

  const ok = await user.checkPassword(password)
  if (!ok) return res.status(401).json(wrong)

  if (!user.emailVerified) {
    const delivery = await issueCode(user)

    return res.status(403).json({
      error: 'Verify your email first. We have sent you a fresh code.',
      reason: 'unverified',
      email: user.email,
      needsVerification: true,
      delivery,
    })
  }

  startSession(res, user)
  res.json({ message: 'Welcome back.', user: user.toPublic() })
}

export function logout(_req, res) {
  res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(), maxAge: undefined })
  res.json({ message: 'Logged out.' })
}

export function me(req, res) {
  res.json({ user: req.user.toPublic() })
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body

  const user = await User.findById(req.userId).select('+passwordHash')
  if (!user) throw httpError(404, 'Account not found.')

  const ok = await user.checkPassword(currentPassword)
  if (!ok) {
    return res.status(400).json({
      error: 'Your current password is not right.',
      fields: { currentPassword: 'Incorrect password' },
    })
  }

  await user.setPassword(newPassword)
  await user.save()

  res.json({ message: 'Password changed.' })
}