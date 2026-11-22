/**
 * CSRF protection, using the double-submit cookie pattern.
 */

import crypto from 'node:crypto'

export const CSRF_COOKIE = 'csrfToken'
export const CSRF_HEADER = 'x-csrf-token'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function csrfCookieOptions() {
  return {
    
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }
}

export function issueCsrfToken(req, res) {
  let token = req.cookies?.[CSRF_COOKIE]

  if (!token) {
    token = crypto.randomBytes(32).toString('hex')
    res.cookie(CSRF_COOKIE, token, csrfCookieOptions())
  }

  res.json({ csrfToken: token })
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))

  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

export function requireCsrfToken(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next()

  const cookieToken = req.cookies?.[CSRF_COOKIE]
  const headerToken = req.get(CSRF_HEADER)

  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return res.status(403).json({
      error: 'Security check failed. Refresh the page and try again.',
      reason: 'csrf',
    })
  }

  next()
}
