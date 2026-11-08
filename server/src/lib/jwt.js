/**
 * JSON Web Token helpers.
 *
 * A JWT is three base64 parts joined by dots: a header, a payload of claims,
 * and a signature. The signature is made with a secret only the server knows,
 * so the server can verify a token it issued without storing it anywhere.
 * Anyone can *read* the payload — never put a password or anything private in it.
 */

import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me'
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production')
}

/** Builds the public view of a user — the shape the client is allowed to see. */
export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  }
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, username: user.username },
    SECRET,
    { expiresIn: EXPIRES_IN }
  )
}

export function verifyToken(token) {
  try {
    return { ok: true, payload: jwt.verify(token, SECRET) }
  } catch (error) {
    // Distinguishing these lets the client decide whether to refresh or re-login.
    return { ok: false, reason: error.name === 'TokenExpiredError' ? 'expired' : 'invalid' }
  }
}

/**
 * Express middleware. Reads "Authorization: Bearer <token>", verifies it,
 * and puts the claims on req.auth. Responds 401 if anything is wrong.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token.' })
  }

  const result = verifyToken(token)
  if (!result.ok) {
    return res.status(401).json({
      error: result.reason === 'expired' ? 'Session expired, please log in again.' : 'Invalid token.',
      reason: result.reason,
    })
  }

  req.auth = result.payload
  next()
}
