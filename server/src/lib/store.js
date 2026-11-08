/**
 * In-memory data store for Phase 1.
 *
 * Phase 2 replaces every function here with a Mongoose model, and nothing
 * outside this file has to change. That is the point of keeping all the
 * storage calls behind one module: the route handlers never touch the data
 * structure directly, so swapping Map for MongoDB is a contained change.
 *
 * Because it is in memory, everything is lost when the server restarts.
 * That is expected for Phase 1 and is called out in the README.
 */

/** email (lowercase) -> user record */
const usersByEmail = new Map()

/** email (lowercase) -> { code, expiresAt, attempts } */
const pendingCodes = new Map()

let nextId = 1

export function createUser({ email, username, passwordHash }) {
  const user = {
    id: `u_${nextId++}`,
    email: email.toLowerCase(),
    username,
    passwordHash,
    emailVerified: false,
    createdAt: new Date().toISOString(),
  }
  usersByEmail.set(user.email, user)
  return user
}

export function findUserByEmail(email) {
  return usersByEmail.get(String(email).toLowerCase()) ?? null
}

export function findUserByUsername(username) {
  const wanted = String(username).toLowerCase()
  for (const user of usersByEmail.values()) {
    if (user.username.toLowerCase() === wanted) return user
  }
  return null
}

export function markVerified(email) {
  const user = findUserByEmail(email)
  if (user) user.emailVerified = true
  return user
}

/* ------------------------------------------------------------------
 *  Verification codes
 * ------------------------------------------------------------------ */

const CODE_TTL_MS = 10 * 60 * 1000 // ten minutes
const MAX_ATTEMPTS = 5

/** Six digits, always padded, so "004321" is possible. */
export function generateCode() {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
}

export function saveCode(email, code) {
  pendingCodes.set(String(email).toLowerCase(), {
    code,
    expiresAt: Date.now() + CODE_TTL_MS,
    attempts: 0,
  })
}

/**
 * Checks a submitted code.
 * Returns { ok: true } or { ok: false, reason: 'missing' | 'expired' | 'locked' | 'mismatch' }
 */
export function checkCode(email, submitted) {
  const key = String(email).toLowerCase()
  const entry = pendingCodes.get(key)

  if (!entry) return { ok: false, reason: 'missing' }

  if (Date.now() > entry.expiresAt) {
    pendingCodes.delete(key)
    return { ok: false, reason: 'expired' }
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    pendingCodes.delete(key)
    return { ok: false, reason: 'locked' }
  }

  entry.attempts += 1

  // Comparing as strings keeps a leading zero significant.
  if (String(submitted) !== entry.code) {
    return { ok: false, reason: 'mismatch', attemptsLeft: MAX_ATTEMPTS - entry.attempts }
  }

  pendingCodes.delete(key)
  return { ok: true }
}

export function clearCode(email) {
  pendingCodes.delete(String(email).toLowerCase())
}

/** Only used by the dev-only inspection route. */
export function debugSnapshot() {
  return {
    users: [...usersByEmail.values()].map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      emailVerified: u.emailVerified,
    })),
    pendingCodes: [...pendingCodes.entries()].map(([email, v]) => ({
      email,
      code: v.code,
      expiresInSeconds: Math.max(0, Math.round((v.expiresAt - Date.now()) / 1000)),
    })),
  }
}
