/**
 * CSRF protection, using the double-submit cookie pattern.
 *
 * THE ATTACK, from the lecture. You are logged into bank.com and your session
 * cookie is still valid. You open evil.com, which contains:
 *
 *     <img src="http://bank.com/transfer?amount=1000&to=attacker" />
 *
 * The browser makes that request and — because cookies are attached
 * automatically by origin, not by who asked — sends your bank session with
 * it. The bank sees a correctly authenticated request and does as it is told.
 * The attacker never read anything; they simply made your browser act.
 *
 * THE DEFENCE. Every state-changing request must carry a secret that an
 * attacker's page cannot obtain:
 *
 *   1. The server generates a random token and puts it in a cookie that is
 *      deliberately NOT httpOnly, so our own JavaScript can read it.
 *   2. Our client reads it and sends it back in an X-CSRF-Token header.
 *   3. This middleware checks that the header matches the cookie.
 *
 * evil.com can cause the cookie to be sent — but the Same-Origin Policy stops
 * it READING the cookie, so it cannot set the matching header. No match, no
 * request. The whole trick rests on the difference between sending a cookie
 * and reading one.
 *
 * This sits on top of sameSite: 'strict' on the session cookie. Either alone
 * would stop the classic attack; both together means one of them being
 * misconfigured is not enough to open the hole.
 */

import crypto from 'node:crypto'

export const CSRF_COOKIE = 'csrfToken'
export const CSRF_HEADER = 'x-csrf-token'

/** Methods that only read. They are safe, so they do not need a token. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function csrfCookieOptions() {
  return {
    // NOT httpOnly on purpose: our own script has to read this one.
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }
}

/**
 * Route handler for GET /api/csrf-token.
 * Issues a token if the browser does not have one, and returns it either way.
 */
export function issueCsrfToken(req, res) {
  let token = req.cookies?.[CSRF_COOKIE]

  if (!token) {
    token = crypto.randomBytes(32).toString('hex')
    res.cookie(CSRF_COOKIE, token, csrfCookieOptions())
  }

  res.json({ csrfToken: token })
}

/**
 * Compares two strings without leaking, through how long the comparison
 * takes, how much of them matched. Overkill for a CSRF token, but it is the
 * correct habit for comparing any secret.
 */
function safeEqual(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))

  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

/** Rejects any state-changing request whose token is missing or wrong. */
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
