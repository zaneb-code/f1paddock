/**
 * ============================================================
 *  moderationSlice — reporting and admin moderation
 * ============================================================
 *
 * Any signed-in user can report a post or comment. A moderator sees the
 * queue and either hides the content or dismisses the report.
 *
 * Who counts as a moderator: in Phase 1, any account whose username is in
 * MODERATOR_USERNAMES below. Phase 2 replaces that with a `role` field on
 * the user document, checked by the server on every moderation route —
 * a client-side check alone is a convenience, never a security control.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as db from '../../api/mockDb'

const reject = (error, rejectWithValue) =>
  rejectWithValue(error?.message ?? 'Something went wrong.')

/** Demo moderator accounts. Register with one of these to see the admin page. */
export const MODERATOR_USERNAMES = ['admin', 'moderator', 'steward']

export const reportContent = createAsyncThunk(
  'moderation/report',
  async (payload, { rejectWithValue }) => {
    try {
      return await db.createReport(payload)
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

export const loadReports = createAsyncThunk('moderation/loadReports', async (_, { rejectWithValue }) => {
  try {
    return await db.listReports()
  } catch (error) {
    return reject(error, rejectWithValue)
  }
})

export const resolveReport = createAsyncThunk(
  'moderation/resolve',
  async ({ reportId, action }, { rejectWithValue }) => {
    try {
      return await db.resolveReport(reportId, action)
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

const initialState = {
  reports: [],
  status: 'idle',
  error: null,
  notice: null,
}

const moderationSlice = createSlice({
  name: 'moderation',
  initialState,
  reducers: {
    clearModerationMessages(state) {
      state.error = null
      state.notice = null
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(reportContent.fulfilled, (state) => {
        state.notice = 'Reported. A moderator will review it.'
      })
      .addCase(reportContent.rejected, (state, action) => {
        state.error = action.payload
      })

      .addCase(loadReports.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(loadReports.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.reports = action.payload
      })
      .addCase(loadReports.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

      .addCase(resolveReport.fulfilled, (state, action) => {
        state.reports = state.reports.map((r) =>
          r.id === action.payload.id ? { ...r, ...action.payload } : r
        )
        state.notice =
          action.payload.status === 'actioned' ? 'Content hidden.' : 'Report dismissed.'
      })
  },
})

export const { clearModerationMessages } = moderationSlice.actions

/* ---------- Selectors ---------- */
export const selectReports = (state) => state.moderation.reports
export const selectOpenReports = (state) => state.moderation.reports.filter((r) => r.status === 'open')
export const selectModerationStatus = (state) => state.moderation.status
export const selectModerationError = (state) => state.moderation.error
export const selectModerationNotice = (state) => state.moderation.notice

/** Is the signed-in user a moderator? */
export const selectIsModerator = (state) => {
  const username = state.auth.user?.username?.toLowerCase()
  return Boolean(username && MODERATOR_USERNAMES.includes(username))
}

export default moderationSlice.reducer
