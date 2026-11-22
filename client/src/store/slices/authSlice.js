import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { auth, ApiError } from '../../api/backend'
function toRejection(error) {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      fields: error.fields,
      reason: error.reason,
      status: error.status,
    }
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

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (payload, { rejectWithValue }) => {
    try {
      return await auth.verify(payload)
    } catch (error) {
      return rejectWithValue(toRejection(error))
    }
  },
)

export const resendCode = createAsyncThunk(
  'auth/resendCode',
  async (email, { rejectWithValue }) => {
    try {
      return await auth.resend(email)
    } catch (error) {
      return rejectWithValue(toRejection(error))
    }
  },
)

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    return await auth.login(payload)
  } catch (error) {
    return rejectWithValue(toRejection(error))
  }
})
export const loadSession = createAsyncThunk('auth/loadSession', async (_, { rejectWithValue }) => {
  try {
    return await auth.me()
  } catch (error) {
    return rejectWithValue(toRejection(error))
  }
})
export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try {
    await auth.logout()
  } catch {
  }
  return true
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


  pendingEmail: null,
  verificationStage: 'idle', // 'idle' | 'awaiting' | 'verified'
  lastDelivery: null, // how the code was sent (console / ethereal / smtp)
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
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
    cancelVerification(state) {
      state.pendingEmail = null
      state.verificationStage = 'idle'
      state.error = null
      state.fieldErrors = null
    },

   
    startVerification(state, action) {
      state.pendingEmail = action.payload
      state.verificationStage = 'awaiting'
    },
  },

  extraReducers: (builder) => {
    builder
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

      // ---- logout ----
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated = false
        state.status = 'idle'
        state.error = null
        state.fieldErrors = null
        state.verificationStage = 'none'
        state.pendingEmail = null
      })

      // ---- verify ----
      .addCase(verifyEmail.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
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
        state.status = 'succeeded'
        state.user = action.payload.user
        state.isAuthenticated = true
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload?.message ?? 'Could not log in.'
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

export const { logout, clearAuthMessages, cancelVerification, startVerification } =
  authSlice.actions

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
