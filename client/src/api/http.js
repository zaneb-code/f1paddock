const BASE = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  constructor(message, { status, fields = null, reason = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
    this.reason = reason
  }
}

let csrfToken = null
let inFlight = null
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
const REQUEST_TIMEOUT_MS = 30_000

/* ------------------------------------------------------------------ */

async function send(path, { method = 'GET', body, retrying = false } = {}) {
  const headers = {}

  if (body !== undefined) headers['Content-Type'] = 'application/json'
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
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new ApiError('The server took too long to answer. Try again.', { status: 0 })
    }
    throw new ApiError('Cannot reach the server. Is it running?', { status: 0 })
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
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
export function forgetCsrfToken() {
  csrfToken = null
}

export function query(params = {}) {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }

  const string = search.toString()
  return string ? `?${string}` : ''
}