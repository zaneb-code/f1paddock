/**
 * Authentication and authorisation.
 */

import { verifyToken } from '../lib/jwt.js'
import User from '../models/User.js'

export const SESSION_COOKIE = 'session'

export function sessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, matching the token's lifetime
  }
}

function readToken(req) {
  return req.cookies?.[SESSION_COOKIE] ?? null
}

async function loadUser(req) {
  const token = readToken(req)
  if (!token) return { user: null, reason: 'missing' }

  const result = verifyToken(token)
  if (!result.ok) return { user: null, reason: result.reason }

  const user = await User.findById(result.payload.sub)
  if (!user) return { user: null, reason: 'gone' }

  return { user, reason: null }
}

export async function requireAuth(req, res, next) {
  const { user, reason } = await loadUser(req)

  if (!user) {
    const message =
      reason === 'expired'
        ? 'Your session has expired — please log in again.'
        : 'You need to be logged in to do that.'

    return res.status(401).json({ error: message, reason })
  }

  req.user = user
  req.userId = user._id
  next()
}

export async function optionalAuth(req, _res, next) {
  const { user } = await loadUser(req)

  if (user) {
    req.user = user
    req.userId = user._id
  }

  next()
}

export function requireModerator(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'You need to be logged in to do that.' })
  }

  if (req.user.role !== 'moderator') {
   
    return res.status(403).json({ error: 'This area is for stewards only.' })
  }

  next()
}

export function requireVerified(req, res, next) {
  if (!req.user?.emailVerified) {
    return res.status(403).json({
      error: 'Verify your email address before doing that.',
      reason: 'unverified',
    })
  }
  next()
}
