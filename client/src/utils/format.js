/**
 * Formatting and validation helpers.
 *
 * Pure functions only — no React, no Redux. Input in, output out, which makes
 * them trivial to reason about and to reuse anywhere.
 */

/* ------------------------------------------------------------------
 *  Dates and times
 * ------------------------------------------------------------------ */

/**
 * The F1 API publishes session times in UTC. Browsers convert to the viewer's
 * own timezone automatically, which is what a fan actually wants: "when is
 * qualifying, for me".
 */
export function formatSessionTime(isoString) {
  if (!isoString) return 'TBC'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return 'TBC'

  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function formatSessionDay(isoString) {
  if (!isoString) return 'TBC'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return 'TBC'

  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatRaceDate(dateString) {
  if (!dateString) return 'Date TBC'
  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateString

  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatShortDate(dateString) {
  if (!dateString) return 'TBC'
  const date = new Date(dateString.length <= 10 ? `${dateString}T00:00:00` : dateString)
  if (Number.isNaN(date.getTime())) return 'TBC'

  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/** The viewer's timezone name, so the UI can say which clock it is showing. */
export function localTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'local time'
  }
}

/** "3 hours ago", "2 days ago". */
export function timeAgo(isoString) {
  if (!isoString) return ''
  const then = new Date(isoString).getTime()
  if (Number.isNaN(then)) return ''

  const seconds = Math.round((Date.now() - then) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}d ago`

  return new Date(isoString).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/**
 * Breaks the gap to a future time into days/hours/minutes/seconds.
 * Returns null once the moment has passed, which is how the countdown
 * component knows to stop rendering.
 */
export function countdownTo(isoString) {
  if (!isoString) return null

  const target = new Date(isoString).getTime()
  if (Number.isNaN(target)) return null

  const ms = target - Date.now()
  if (ms <= 0) return null

  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
    seconds: Math.floor((ms % 60_000) / 1000),
    totalMs: ms,
  }
}

export function isPast(isoString) {
  if (!isoString) return false
  const time = new Date(isoString).getTime()
  return !Number.isNaN(time) && time < Date.now()
}

/* ------------------------------------------------------------------
 *  Text
 * ------------------------------------------------------------------ */

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
}

/**
 * Picks a stable colour for an avatar from a string, so the same username
 * always gets the same colour without storing one.
 */
export function avatarHue(seed = '') {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360
  }
  return hash
}

export function ordinal(n) {
  const num = Number(n)
  if (!Number.isFinite(num)) return String(n)

  const mod100 = num % 100
  if (mod100 >= 11 && mod100 <= 13) return `${num}th`

  return `${num}${['th', 'st', 'nd', 'rd'][num % 10] ?? 'th'}`
}

export function pluralise(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

/* ------------------------------------------------------------------
 *  Form validation
 * ------------------------------------------------------------------ */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

/**
 * Validates the signup form. Returns an object of messages keyed by field —
 * an empty object means valid. The server runs the same rules again, because
 * client-side validation is a convenience, never a security control.
 */
export function validateRegister({ email, username, password, confirmPassword }) {
  const errors = {}

  if (!email?.trim()) errors.email = 'Enter your email address.'
  else if (!EMAIL_RE.test(email)) errors.email = 'That does not look like a valid email.'

  if (!username?.trim()) errors.username = 'Choose a username.'
  else if (!USERNAME_RE.test(username)) {
    errors.username = '3-20 characters: letters, numbers or underscores only.'
  }

  if (!password) errors.password = 'Choose a password.'
  else if (password.length < 8) errors.password = 'At least 8 characters.'

  if (confirmPassword !== undefined && password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

export function validateLogin({ email, password }) {
  const errors = {}

  if (!email?.trim()) errors.email = 'Enter your email address.'
  else if (!EMAIL_RE.test(email)) errors.email = 'That does not look like a valid email.'

  if (!password) errors.password = 'Enter your password.'

  return errors
}

/** Rough password strength, 0-5, for the signup meter. */
export function passwordStrength(password = '') {
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  return {
    score,
    label: ['Too short', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'][score],
  }
}
