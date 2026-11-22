/**
 * The one place this app talks to its own API.
 *
 * Everything else — the slices, the adapter in social.js — goes through
 * `request()`, so the three things that must happen on every call happen in
 * exactly one place:
 *
 *   1. credentials: 'include'
 *      The session is an httpOnly cookie now, not a token in localStorage.
 *      The browser will not attach a cookie to a cross-origin request unless
 *      we ask, and our client (:5173) and API (:4000) are different origins.
 *      This is the `credentials: 'include'` from the Node lecture.
 *
 *   2. the CSRF token
 *      Cookies are sent automatically, by origin and not by intent, which is
 *      what makes CSRF possible. The server issues a token in a cookie our
 *      script CAN read, and expects it echoed back in a header. An attacker's
 *      page can make the browser send our cookie but cannot read it, so it
 *      cannot set the header.
 *
 *   3. one error shape
 *      The server answers failures with { error, fields? }. ApiError carries
 *      both, so a form can show `error.fields.email` under the right input
 *      without every caller unpacking the response itself.
 */

const BASE = import.meta.env.VITE_API_URL ?? '/api'

/** An error that knows which fields the server rejected. */
export class ApiError extends Error {
  constructor(message, { status, fields = null, reason = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
    this.reason = reason
  }
}

/* ------------------------------------------------------------------ */
/*  CSRF token                                                         */
/* ------------------------------------------------------------------ */

let csrfToken = null
let inFlight = null

/**
 * Fetches the token once and remembers it. Concurrent callers share the one
 * request rather than each starting their own — without `inFlight`, a page
 * that fires four thunks on mount would ask for four tokens.
 */
async function getCsrfToken() {
  if (csrfToken) return csrfToken
  if (inFlight) return inFlight

  inFlight = fetch(`${BASE}/csrf-token`, { credentials: 'include' })
    .then((response) => (response.ok ? response.json() : { csrfToken: null }))
    .then((data) => {
      csrfToken = data.csrfToken
      inFlight = null
      return csrfToken
    })
    .catch(() => {
      inFlight = null
      return null
    })

  return inFlight
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * How long to wait for our own API.
 *
 * Same reasoning as the F1 client: `fetch` never times out on its own, so a
 * request the server accepts but never answers leaves the caller awaiting
 * forever. Every thunk in the app awaits one of these, and a thunk that never
 * settles is a loading spinner that never stops.
 *
 * Generous, because one of these routes calls a language model.
 */
const REQUEST_TIMEOUT_MS = 30_000

/* ------------------------------------------------------------------ */

async function send(path, { method = 'GET', body, retrying = false } = {}) {
  const headers = {}

  if (body !== undefined) headers['Content-Type'] = 'application/json'

  // Reads do not need a token, so do not pay for one on the first page load.
  if (!SAFE_METHODS.has(method)) {
    const token = await getCsrfToken()
    if (token) headers['X-CSRF-Token'] = token
  }

  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    // fetch only rejects when the request never completed at all.
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new ApiError('The server took too long to answer. Try again.', { status: 0 })
    }
    throw new ApiError('Cannot reach the server. Is it running?', { status: 0 })
  }

  // 204 and friends have no body to read.
  const data = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
    // A token can go stale — the cookie expires, or the server restarted.
    // Get a fresh one and try once more before bothering the user.
    if (response.status === 403 && data?.reason === 'csrf' && !retrying) {
      csrfToken = null
      return send(path, { method, body, retrying: true })
    }

    throw new ApiError(data?.error ?? `Request failed (${response.status})`, {
      status: response.status,
      fields: data?.fields ?? null,
      reason: data?.reason ?? null,
    })
  }

  return data
}

export const request = {
  get: (path) => send(path),
  post: (path, body) => send(path, { method: 'POST', body }),
  put: (path, body) => send(path, { method: 'PUT', body }),
  patch: (path, body) => send(path, { method: 'PATCH', body }),
  delete: (path) => send(path, { method: 'DELETE' }),
}

/** Called on logout, so the next session gets a token of its own. */
export function forgetCsrfToken() {
  csrfToken = null
}

/** Turns a query object into "?a=1&b=2", skipping empty values. */
export function query(params = {}) {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }

  const string = search.toString()
  return string ? `?${string}` : ''
}