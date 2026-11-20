/**
 * Authentication and authorisation.
 *
 *   Authentication = who are you          (do you hold a valid session?)
 *   Authorisation  = what may you do      (are you a moderator?)
 *
 * WHERE THE TOKEN LIVES, AND WHY IT MOVED
 *
 * Phase 1 kept the JWT in localStorage and sent it as `Authorization: Bearer`.
 * That works, but any successful XSS can read localStorage — one injected
 * script and the attacker has the session.
 *
 * Phase 2 puts it in a cookie with three flags, which is the arrangement the
 * security lecture recommends:
 *
 *   httpOnly: true    JavaScript cannot read it, so XSS cannot steal it
 *   sameSite: 'strict' the browser will not attach it to requests started by
 *                     another site, which is the CSRF attack from the lecture
 *                     (<img src="http://bank.com/transfer?...">)
 *   secure: true      only sent over HTTPS — on in production, off on
 *                     localhost where there is no certificate
 *
 * Cookies are sent automatically by the browser, which is exactly what makes
 * CSRF possible in the first place. SameSite closes most of it; middleware/csrf.js
 * adds a token on top, because defence in depth is the point.
 */

import { verifyToken } from '../lib/jwt.js'
import User from '../models/User.js'

export const SESSION_COOKIE = 'session'

/** The cookie options used wherever the session cookie is set or cleared. */
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

/** Pulls the token out of the cookie. */
function readToken(req) {
  return req.cookies?.[SESSION_COOKIE] ?? null
}

/**
 * Loads the signed-in user, or null.
 *
 * It reads the user from the database on every request rather than trusting
 * the claims baked into the token. That costs one indexed lookup, and buys
 * correctness: a promotion to moderator, or a deleted account, takes effect
 * immediately instead of whenever the token happens to expire. A token is a
 * claim about the past; the database is the present.
 */
async function loadUser(req) {
  const token = readToken(req)
  if (!token) return { user: null, reason: 'missing' }

  const result = verifyToken(token)
  if (!result.ok) return { user: null, reason: result.reason }

  const user = await User.findById(result.payload.sub)
  if (!user) return { user: null, reason: 'gone' }

  return { user, reason: null }
}

/**
 * Hard gate: 401 unless there is a valid session.
 * Puts the user document on req.user for the controller.
 */
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

/**
 * Soft version: attaches the user when there is one, carries on when there
 * is not. Used by routes that are public but show extra detail to a member,
 * like a post list that marks which posts you have liked.
 */
export async function optionalAuth(req, _res, next) {
  const { user } = await loadUser(req)

  if (user) {
    req.user = user
    req.userId = user._id
  }

  next()
}

/**
 * Authorisation. Must come after requireAuth.
 *
 * In Phase 1 the moderator check ran in the browser, which hid the admin page
 * from honest users and stopped nobody else. The role now lives on the user
 * document and is checked here, on the server, for every moderation request.
 */
export function requireModerator(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'You need to be logged in to do that.' })
  }

  if (req.user.role !== 'moderator') {
    // 403, not 404: you are authenticated, you are simply not allowed.
    return res.status(403).json({ error: 'This area is for stewards only.' })
  }

  next()
}

/** Blocks accounts that have not entered their emailed code yet. */
export function requireVerified(req, res, next) {
  if (!req.user?.emailVerified) {
    return res.status(403).json({
      error: 'Verify your email address before doing that.',
      reason: 'unverified',
    })
  }
  next()
}
