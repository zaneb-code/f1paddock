/**
 * Client for our own Express server: authentication and the AI prediction.
 *
 * WHAT CHANGED IN PHASE 2
 *
 * Phase 1 kept the JWT in localStorage and attached it as an
 * `Authorization: Bearer` header. Any successful XSS can read localStorage,
 * so one injected script was one stolen session.
 *
 * The token now lives in an httpOnly cookie the browser attaches by itself.
 * JavaScript — ours and an attacker's alike — cannot read it. That is why
 * there is no getToken/setToken in this file any more: there is nothing for
 * the client to hold. The cookie is paired with a CSRF token, because a
 * cookie the browser sends automatically is a cookie another site can cause
 * to be sent; http.js handles that side.
 */

import { request, ApiError, forgetCsrfToken } from './http.js'

export { ApiError }

/* ------------------------------------------------------------------
 *  Auth
 * ------------------------------------------------------------------ */

export const auth = {
  register: (payload) => request.post('/auth/register', payload),
  verify: (payload) => request.post('/auth/verify', payload),
  resend: (email) => request.post('/auth/resend', { email }),
  login: (payload) => request.post('/auth/login', payload),

  /**
   * Who am I? Answers { user: null } rather than throwing when nobody is
   * logged in, because "no session" is the normal state for a visitor, not
   * an error the UI should show.
   */
  async me() {
    try {
      return await request.get('/auth/me')
    } catch (error) {
      if (error.status === 401) return { user: null }
      throw error
    }
  },

  async logout() {
    const result = await request.post('/auth/logout')
    // The next session should get a CSRF token of its own.
    forgetCsrfToken()
    return result
  },

  changePassword: (payload) => request.patch('/auth/password', payload),
}

/* ------------------------------------------------------------------
 *  AI predictions
 * ------------------------------------------------------------------ */

export const ai = {
  status: () => request.get('/ai/status'),
  predict: (context) => request.post('/ai/predict', context),
}

export const health = () => request.get('/health')
