/**
 * ============================================================
 *  predictionsSlice — user predictions, AI predictions, scoring
 * ============================================================
 *
 * Two kinds of prediction live here and they are deliberately kept apart:
 *
 *   myPredictions  — what human users picked, stored in the mock DB
 *   aiPrediction   — what the server's AI (or heuristic) suggested
 *
 * They are shown side by side rather than merged. The point of the feature,
 * as specified, is the comparison: seeing the machine's answer next to your
 * own is what makes a prediction interesting, and the leaderboard only ever
 * scores humans.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as db from '../../api/mockDb'
import { ai } from '../../api/backend'
import { fetchRecentForm } from '../../api/jolpica'

const reject = (error, rejectWithValue) =>
  rejectWithValue(error?.message ?? 'Something went wrong.')

/* ---------- Human predictions ---------- */

export const loadMyPredictions = createAsyncThunk(
  'predictions/loadMine',
  async (userId, { rejectWithValue }) => {
    try {
      return await db.listPredictions({ userId })
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

export const loadRacePredictions = createAsyncThunk(
  'predictions/loadForRace',
  async ({ season, round }, { rejectWithValue }) => {
    try {
      return await db.listPredictions({ season, round })
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

export const submitPrediction = createAsyncThunk(
  'predictions/submit',
  async (payload, { rejectWithValue }) => {
    try {
      return await db.savePrediction(payload)
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

/**
 * Scores one prediction against the real podium.
 *
 * In Phase 2 this runs on the server when results land. For now the client
 * triggers it from the race page once the result exists, which keeps the
 * scoring rules visible and testable.
 */
export const scoreMyPrediction = createAsyncThunk(
  'predictions/score',
  async ({ predictionId, actualPodium, actualPole }, { rejectWithValue }) => {
    try {
      return await db.scorePrediction(predictionId, actualPodium, actualPole)
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

export const loadLeaderboard = createAsyncThunk(
  'predictions/loadLeaderboard',
  async (_, { rejectWithValue }) => {
    try {
      return await db.getLeaderboard()
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

/* ---------- AI prediction ---------- */

export const loadAiStatus = createAsyncThunk(
  'predictions/aiStatus',
  async (_, { rejectWithValue }) => {
    try {
      return await ai.status()
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

/**
 * Asks the server for an AI prediction.
 *
 * The client assembles the context — the race, the standings it already has
 * in Redux, and the podiums from the last three rounds — and posts it up.
 * The server does not refetch any of that, so one user action costs one
 * request to our API plus (at most) one to the LLM.
 */
export const requestAiPrediction = createAsyncThunk(
  'predictions/requestAi',
  async ({ race, standings }, { rejectWithValue }) => {
    try {
      const recentForm = await fetchRecentForm(race.season, Math.max(0, race.round - 1), 3)

      return await ai.predict({
        race: {
          season: String(race.season),
          round: String(race.round),
          raceName: race.raceName,
          circuitName: race.circuitName,
          locality: race.locality,
          country: race.country,
          date: race.date,
        },
        standings: standings.slice(0, 12).map((row) => ({
          position: row.position,
          driverName: row.driver.fullName,
          constructor: row.constructor.name,
          points: row.points,
          wins: row.wins,
        })),
        recentForm,
      })
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

const initialState = {
  myPredictions: [],
  myStatus: 'idle',

  racePredictions: [],
  raceStatus: 'idle',

  leaderboard: [],
  leaderboardStatus: 'idle',

  // AI prediction, keyed by "season-round" so switching races does not
  // show the previous race's answer while the new one loads.
  aiByRace: {},
  aiStatus: 'idle',
  aiError: null,
  aiProvider: null,
  aiIsLlm: false,

  error: null,
  notice: null,
}

const predictionsSlice = createSlice({
  name: 'predictions',
  initialState,
  reducers: {
    clearPredictionMessages(state) {
      state.error = null
      state.notice = null
      state.aiError = null
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(loadMyPredictions.pending, (state) => {
        state.myStatus = 'loading'
      })
      .addCase(loadMyPredictions.fulfilled, (state, action) => {
        state.myStatus = 'succeeded'
        state.myPredictions = action.payload
      })
      .addCase(loadMyPredictions.rejected, (state, action) => {
        state.myStatus = 'failed'
        state.error = action.payload
      })

      .addCase(loadRacePredictions.pending, (state) => {
        state.raceStatus = 'loading'
      })
      .addCase(loadRacePredictions.fulfilled, (state, action) => {
        state.raceStatus = 'succeeded'
        state.racePredictions = action.payload
      })

      .addCase(submitPrediction.fulfilled, (state, action) => {
        const saved = action.payload
        const index = state.myPredictions.findIndex((p) => p.id === saved.id)

        if (index >= 0) state.myPredictions[index] = saved
        else state.myPredictions.unshift(saved)

        state.notice = 'Prediction locked in.'
      })
      .addCase(submitPrediction.rejected, (state, action) => {
        state.error = action.payload
      })

      .addCase(scoreMyPrediction.fulfilled, (state, action) => {
        const scored = action.payload
        state.myPredictions = state.myPredictions.map((p) => (p.id === scored.id ? scored : p))
        state.notice = `Scored: ${scored.points} points.`
      })

      .addCase(loadLeaderboard.pending, (state) => {
        state.leaderboardStatus = 'loading'
      })
      .addCase(loadLeaderboard.fulfilled, (state, action) => {
        state.leaderboardStatus = 'succeeded'
        state.leaderboard = action.payload
      })

      .addCase(loadAiStatus.fulfilled, (state, action) => {
        state.aiProvider = action.payload.provider
        state.aiIsLlm = action.payload.isLlm
      })

      .addCase(requestAiPrediction.pending, (state) => {
        state.aiStatus = 'loading'
        state.aiError = null
      })
      .addCase(requestAiPrediction.fulfilled, (state, action) => {
        state.aiStatus = 'succeeded'
        const { season, round } = action.payload.race
        state.aiByRace[`${season}-${round}`] = action.payload
      })
      .addCase(requestAiPrediction.rejected, (state, action) => {
        state.aiStatus = 'failed'
        state.aiError = action.payload
      })
  },
})

export const { clearPredictionMessages } = predictionsSlice.actions

/* ---------- Selectors ---------- */
export const selectMyPredictions = (state) => state.predictions.myPredictions
export const selectMyPredictionsStatus = (state) => state.predictions.myStatus
export const selectRacePredictions = (state) => state.predictions.racePredictions
export const selectLeaderboard = (state) => state.predictions.leaderboard
export const selectLeaderboardStatus = (state) => state.predictions.leaderboardStatus

export const selectAiStatus = (state) => state.predictions.aiStatus
export const selectAiError = (state) => state.predictions.aiError
export const selectAiProvider = (state) => state.predictions.aiProvider
export const selectAiIsLlm = (state) => state.predictions.aiIsLlm
export const selectAiFor = (season, round) => (state) =>
  state.predictions.aiByRace[`${season}-${round}`] ?? null

export const selectPredictionError = (state) => state.predictions.error
export const selectPredictionNotice = (state) => state.predictions.notice

/** My prediction for one specific race, if I made one. */
export const selectMyPredictionFor = (season, round) => (state) =>
  state.predictions.myPredictions.find(
    (p) => String(p.season) === String(season) && Number(p.round) === Number(round)
  ) ?? null

/** Total points across every scored prediction — shown on the dashboard. */
export const selectMyTotalPoints = (state) =>
  state.predictions.myPredictions.reduce((sum, p) => sum + (p.points ?? 0), 0)

export default predictionsSlice.reducer
