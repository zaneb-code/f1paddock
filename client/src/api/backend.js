/**
 * Client for our own Express server.
 *
 * Only two things live here, because only two things genuinely need a server:
 *   - authentication (JWT signing, and emailing the verification code)
 *   - the AI prediction (the API key must never reach the browser)
 *
 * Vite proxies /api to http://localhost:4000 in development, so these are
 * all relative URLs and there is no CORS handling to do.
 */

const TOKEN_KEY = 'f1p_token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private browsing — the app still works, just not across refreshes */
  }
}

/**
 * One error type so callers can read `error.fields` for per-input messages
 * without checking whether the response happened to include them.
 */
export class ApiError extends Error {
  constructor(message, { status, fields, reason, ...rest } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields ?? null
    this.reason = reason ?? null
    Object.assign(this, rest)
  }
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'

  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    // fetch only rejects when the request never reached a server.
    throw new ApiError(
      'Cannot reach the F1Paddock server. Is it running on port 4000?',
      { status: 0 }
    )
  }

  const text = await response.text()
  const data = text ? safeJson(text) : null

  if (!response.ok) {
    throw new ApiError(data?.error ?? `Request failed (${response.status})`, {
      status: response.status,
      fields: data?.fields,
      reason: data?.reason,
      ...(data ?? {}),
    })
  }

  return data
}

function safeJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------
 *  Auth
 * ------------------------------------------------------------------ */

export const auth = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  verify: (payload) => request('/auth/verify', { method: 'POST', body: payload }),
  resend: (email) => request('/auth/resend', { method: 'POST', body: { email } }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: () => request('/auth/me', { auth: true }),
}

/* ------------------------------------------------------------------
 *  AI predictions
 * ------------------------------------------------------------------ */

export const ai = {
  status: () => request('/ai/status'),
  predict: (context) => request('/ai/predict', { method: 'POST', body: context, auth: true }),
}

export const health = () => request('/health')
