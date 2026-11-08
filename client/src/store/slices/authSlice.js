/**
 * ============================================================
 *  authSlice — account, JWT, and email verification
 * ============================================================
 *
 * Unlike a typical course project, authentication here is real: the token is
 * a genuine JWT signed by the Express server, and registration requires a
 * six-digit code delivered by email. This slice is the client half of that.
 *
 * The registration flow has three states the UI has to handle:
 *
 *   idle        -> nothing in progress
 *   awaiting    -> account created, waiting for the code to be entered
 *   verified    -> code accepted, token issued, user logged in
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { auth, setToken, getToken, ApiError } from '../../api/backend'

/** Shared error unwrapping, so every rejected action carries the same shape. */
function toRejection(error) {
  if (error instanceof ApiError) {
    return { message: error.message, fields: error.fields, reason: error.reason, status: error.status }
  }
  return { message: error?.message ?? 'Something went wrong.', fields: null, reason: null }
}

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    return await auth.register(payload)
  } catch (error) {
    return rejectWithValue(toRejection(error))
  }
})

export const verifyEmail = createAsyncThunk('auth/verifyEmail', async (payload, { rejectWithValue }) => {
  try {
    return await auth.verify(payload)
  } catch (error) {
    return rejectWithValue(toRejection(error))
  }
})

export const resendCode = createAsyncThunk('auth/resendCode', async (email, { rejectWithValue }) => {
  try {
    return await auth.resend(email)
  } catch (error) {
    return rejectWithValue(toRejection(error))
  }
})

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    return await auth.login(payload)
  } catch (error) {
    return rejectWithValue(toRejection(error))
  }
})

/**
 * Called once when the app starts. If a token is in localStorage we ask the
 * server who it belongs to — which also proves the token has not expired.
 */
export const loadSession = createAsyncThunk('auth/loadSession', async (_, { rejectWithValue }) => {
  if (!getToken()) return { user: null }

  try {
    return await auth.me()
  } catch (error) {
    setToken(null) // expired or tampered with — drop it
    return rejectWithValue(toRejection(error))
  }
})

const initialState = {
  user: null,
  isAuthenticated: false,

  // 'idle' | 'loading' | 'succeeded' | 'failed'
  status: 'idle',
  sessionChecked: false,

  error: null,
  fieldErrors: null,
  notice: null,

  // Registration: which email is waiting for a code, if any
  pendingEmail: null,
  verificationStage: 'idle', // 'idle' | 'awaiting' | 'verified'
  lastDelivery: null, // how the code was sent (console / ethereal / smtp)
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      setToken(null)
      state.user = null
      state.isAuthenticated = false
      state.status = 'idle'
      state.error = null
      state.fieldErrors = null
      state.pendingEmail = null
      state.verificationStage = 'idle'
    },

    clearAuthMessages(state) {
      state.error = null
      state.fieldErrors = null
      state.notice = null
    },

    /** Lets the user go back from the code screen to edit their details. */
    cancelVerification(state) {
      state.pendingEmail = null
      state.verificationStage = 'idle'
      state.error = null
      state.fieldErrors = null
    },

    /** Login can discover an unverified account and redirect into verification. */
    startVerification(state, action) {
      state.pendingEmail = action.payload
      state.verificationStage = 'awaiting'
    },
  },

  extraReducers: (builder) => {
    builder
      // ---- register ----
      .addCase(register.pending, (state) => {
        state.status = 'loading'
        state.error = null
        state.fieldErrors = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.pendingEmail = action.payload.email
        state.verificationStage = 'awaiting'
        state.lastDelivery = action.payload.delivery ?? null
        state.notice = action.payload.message
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload?.message ?? 'Could not create the account.'
        state.fieldErrors = action.payload?.fields ?? null
      })

      // ---- verify ----
      .addCase(verifyEmail.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        setToken(action.payload.token)
        state.status = 'succeeded'
        state.user = action.payload.user
        state.isAuthenticated = true
        state.verificationStage = 'verified'
        state.pendingEmail = null
        state.notice = null
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload?.message ?? 'Verification failed.'
      })

      // ---- resend ----
      .addCase(resendCode.fulfilled, (state, action) => {
        state.notice = 'A new code has been sent.'
        state.lastDelivery = action.payload.delivery ?? null
        state.error = null
      })
      .addCase(resendCode.rejected, (state, action) => {
        state.error = action.payload?.message ?? 'Could not resend the code.'
      })

      // ---- login ----
      .addCase(login.pending, (state) => {
        state.status = 'loading'
        state.error = null
        state.fieldErrors = null
      })
      .addCase(login.fulfilled, (state, action) => {
        setToken(action.payload.token)
        state.status = 'succeeded'
        state.user = action.payload.user
        state.isAuthenticated = true
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload?.message ?? 'Could not log in.'

        // Logging in with an unverified account sends you to the code screen
        // rather than leaving you stuck on a refusal you cannot act on.
        if (action.payload?.needsVerification) {
          state.pendingEmail = action.payload.email
          state.verificationStage = 'awaiting'
        }
      })

      // ---- session restore ----
      .addCase(loadSession.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(loadSession.fulfilled, (state, action) => {
        state.status = 'idle'
        state.sessionChecked = true
        state.user = action.payload.user ?? null
        state.isAuthenticated = Boolean(action.payload.user)
      })
      .addCase(loadSession.rejected, (state) => {
        state.status = 'idle'
        state.sessionChecked = true
        state.user = null
        state.isAuthenticated = false
      })
  },
})

export const { logout, clearAuthMessages, cancelVerification, startVerification } = authSlice.actions

/* ---------- Selectors ---------- */
export const selectUser = (state) => state.auth.user
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export const selectAuthStatus = (state) => state.auth.status
export const selectAuthError = (state) => state.auth.error
export const selectFieldErrors = (state) => state.auth.fieldErrors
export const selectAuthNotice = (state) => state.auth.notice
export const selectPendingEmail = (state) => state.auth.pendingEmail
export const selectVerificationStage = (state) => state.auth.verificationStage
export const selectLastDelivery = (state) => state.auth.lastDelivery
export const selectSessionChecked = (state) => state.auth.sessionChecked

export default authSlice.reducer
