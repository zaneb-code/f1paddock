/**
 * ============================================================
 *  meetupsSlice — create and join F1 fan meetups
 * ============================================================
 *
 * A meetup is either online (a voice chat during a session) or in person
 * (a watch party). It can optionally be tied to a race round, which is how
 * the race page knows to show "2 meetups for this Grand Prix".
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as db from '../../api/mockDb'

const reject = (error, rejectWithValue) =>
  rejectWithValue(error?.message ?? 'Something went wrong.')

export const loadMeetups = createAsyncThunk('meetups/load', async (_, { rejectWithValue }) => {
  try {
    return await db.listMeetups()
  } catch (error) {
    return reject(error, rejectWithValue)
  }
})

export const addMeetup = createAsyncThunk('meetups/add', async (payload, { rejectWithValue }) => {
  try {
    return await db.createMeetup(payload)
  } catch (error) {
    return reject(error, rejectWithValue)
  }
})

export const toggleAttendance = createAsyncThunk(
  'meetups/toggleAttendance',
  async ({ meetupId, userId }, { rejectWithValue }) => {
    try {
      return await db.toggleMeetupAttendance(meetupId, userId)
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

const initialState = {
  items: [],
  status: 'idle',
  error: null,
  notice: null,
  filter: 'all', // 'all' | 'online' | 'in-person' | 'mine'
}

const meetupsSlice = createSlice({
  name: 'meetups',
  initialState,
  reducers: {
    setMeetupFilter(state, action) {
      state.filter = action.payload
    },
    clearMeetupMessages(state) {
      state.error = null
      state.notice = null
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(loadMeetups.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadMeetups.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(loadMeetups.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

      .addCase(addMeetup.fulfilled, (state, action) => {
        state.items.push(action.payload)
        state.items.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
        state.notice = 'Meetup created.'
      })
      .addCase(addMeetup.rejected, (state, action) => {
        state.error = action.payload
      })

      .addCase(toggleAttendance.fulfilled, (state, action) => {
        state.items = state.items.map((m) => (m.id === action.payload.id ? action.payload : m))
      })
      .addCase(toggleAttendance.rejected, (state, action) => {
        state.error = action.payload
      })
  },
})

export const { setMeetupFilter, clearMeetupMessages } = meetupsSlice.actions

/* ---------- Selectors ---------- */
export const selectMeetupsStatus = (state) => state.meetups.status
export const selectMeetupError = (state) => state.meetups.error
export const selectMeetupNotice = (state) => state.meetups.notice
export const selectMeetupFilter = (state) => state.meetups.filter

/** Applies the active filter. */
export const selectVisibleMeetups = (state) => {
  const { items, filter } = state.meetups
  const userId = state.auth.user?.id

  if (filter === 'mine') return items.filter((m) => m.attendeeIds.includes(userId))
  if (filter === 'all') return items
  return items.filter((m) => m.mode === filter)
}

/** Meetups attached to one race round, for the race page. */
export const selectMeetupsForRace = (round) => (state) =>
  state.meetups.items.filter((m) => Number(m.raceRound) === Number(round))

export default meetupsSlice.reducer
