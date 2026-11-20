/**
 * JSON Web Token helpers.
 *
 * A JWT is three base64 parts joined by dots: a header, a payload of claims,
 * and a signature. The signature is made with a secret only the server knows,
 * so the server can verify a token it issued without storing it anywhere.
 *
 * Anyone can READ the payload — it is encoded, not encrypted. Never put a
 * password or anything private in it.
 *
 * Reading the token out of the request is not done here; that is
 * middleware/auth.js, which takes it from the httpOnly session cookie.
 */

import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me'
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production')
}

/** Signs a token for a user. `sub` is the standard claim for "who this is about". */
export function signToken({ id, email, username }) {
  return jwt.sign({ sub: id, email, username }, SECRET, { expiresIn: EXPIRES_IN })
}

/**
 * Verifies a token.
 * Returns { ok: true, payload } or { ok: false, reason: 'expired' | 'invalid' },
 * because the caller wants to word those two differently.
 */
export function verifyToken(token) {
  try {
    return { ok: true, payload: jwt.verify(token, SECRET) }
  } catch (error) {
    return { ok: false, reason: error.name === 'TokenExpiredError' ? 'expired' : 'invalid' }
  }
}
