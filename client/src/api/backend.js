import { request, ApiError, forgetCsrfToken } from './http.js'

export { ApiError }


export const auth = {
  register: (payload) => request.post('/auth/register', payload),
  verify: (payload) => request.post('/auth/verify', payload),
  resend: (email) => request.post('/auth/resend', { email }),
  login: (payload) => request.post('/auth/login', payload),

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

export const ai = {
  async status() {
    const data = await request.get('/ai/status')
    return { provider: data.provider, isLlm: Boolean(data.isLanguageModel) }
  },

  async predict(context) {
    const { prediction } = await request.post('/ai/predict', context)
    return prediction
  },
}

export const health = () => request.get('/health')