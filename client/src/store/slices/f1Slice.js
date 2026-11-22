import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as f1 from '../../api/jolpica'
import { CURRENT_SEASON } from '../../api/jolpica'

const reject = (error, rejectWithValue) =>
  rejectWithValue(error?.message ?? 'Could not load F1 data.')

export const fetchSchedule = createAsyncThunk(
  'f1/fetchSchedule',
  async (season = CURRENT_SEASON, { rejectWithValue }) => {
    try {
      return { season, races: await f1.fetchSeasonSchedule(season) }
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  },
)

export const fetchStandings = createAsyncThunk(
  'f1/fetchStandings',
  async (season = CURRENT_SEASON, { rejectWithValue }) => {
    try {
      const [drivers, constructors] = await Promise.all([
        f1.fetchDriverStandings(season),
        f1.fetchConstructorStandings(season),
      ])
      return { season, drivers, constructors }
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  },
)

export const fetchGrid = createAsyncThunk(
  'f1/fetchGrid',
  async (season = CURRENT_SEASON, { rejectWithValue }) => {
    try {
      const [drivers, constructors, circuits] = await Promise.all([
        f1.fetchDrivers(season),
        f1.fetchConstructors(season),
        f1.fetchCircuits(season),
      ])
      return { season, drivers, constructors, circuits }
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  },
)
export const fetchRaceDetail = createAsyncThunk(
  'f1/fetchRaceDetail',
  async ({ season, round }, { rejectWithValue }) => {
    try {
      const [raceSettled, resultsSettled, qualifyingSettled] = await Promise.allSettled([
        f1.fetchRace(season, round),
        f1.fetchRaceResults(season, round),
        f1.fetchQualifyingResults(season, round),
      ])

      if (raceSettled.status === 'rejected') throw raceSettled.reason

      return {
        round: Number(round),
        race: raceSettled.value,
        results: resultsSettled.status === 'fulfilled' ? resultsSettled.value : null,
        qualifying: qualifyingSettled.status === 'fulfilled' ? qualifyingSettled.value : null,
      }
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  },
)

const initialState = {
  season: CURRENT_SEASON,

  races: [],
  scheduleStatus: 'idle',
  scheduleError: null,

  driverStandings: [],
  constructorStandings: [],
  standingsRound: 0,
  standingsStatus: 'idle',
  standingsError: null,

  drivers: [],
  constructors: [],
  circuits: [],
  gridStatus: 'idle',
  gridError: null,

  raceDetail: {}, // round -> { race, results, qualifying }
  detailStatus: 'idle',
  detailError: null,
}

const f1Slice = createSlice({
  name: 'f1',
  initialState,
  reducers: {
    setSeason(state, action) {
      state.season = action.payload
      state.races = []
      state.scheduleStatus = 'idle'
      state.driverStandings = []
      state.constructorStandings = []
      state.standingsStatus = 'idle'
      state.drivers = []
      state.constructors = []
      state.circuits = []
      state.gridStatus = 'idle'
      state.raceDetail = {}
      state.detailStatus = 'idle'
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchSchedule.pending, (state) => {
        state.scheduleStatus = 'loading'
        state.scheduleError = null
      })
      .addCase(fetchSchedule.fulfilled, (state, action) => {
        state.scheduleStatus = 'succeeded'
        state.races = action.payload.races
      })
      .addCase(fetchSchedule.rejected, (state, action) => {
        state.scheduleStatus = 'failed'
        state.scheduleError = action.payload
      })

      .addCase(fetchStandings.pending, (state) => {
        state.standingsStatus = 'loading'
        state.standingsError = null
      })
      .addCase(fetchStandings.fulfilled, (state, action) => {
        state.standingsStatus = 'succeeded'
        state.driverStandings = action.payload.drivers.standings
        state.constructorStandings = action.payload.constructors.standings
        state.standingsRound = action.payload.drivers.round
      })
      .addCase(fetchStandings.rejected, (state, action) => {
        state.standingsStatus = 'failed'
        state.standingsError = action.payload
      })

      .addCase(fetchGrid.pending, (state) => {
        state.gridStatus = 'loading'
        state.gridError = null
      })
      .addCase(fetchGrid.fulfilled, (state, action) => {
        state.gridStatus = 'succeeded'
        state.drivers = action.payload.drivers
        state.constructors = action.payload.constructors
        state.circuits = action.payload.circuits
      })
      .addCase(fetchGrid.rejected, (state, action) => {
        state.gridStatus = 'failed'
        state.gridError = action.payload
      })

      .addCase(fetchRaceDetail.pending, (state) => {
        state.detailStatus = 'loading'
        state.detailError = null
      })
      .addCase(fetchRaceDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded'
        state.raceDetail[action.payload.round] = {
          race: action.payload.race,
          results: action.payload.results,
          qualifying: action.payload.qualifying,
        }
      })
      .addCase(fetchRaceDetail.rejected, (state, action) => {
        state.detailStatus = 'failed'
        state.detailError = action.payload
      })
  },
})

export const { setSeason } = f1Slice.actions

/* ---------- Selectors ---------- */

export const selectSeason = (state) => state.f1.season
export const selectRaces = (state) => state.f1.races
export const selectScheduleStatus = (state) => state.f1.scheduleStatus
export const selectScheduleError = (state) => state.f1.scheduleError

export const selectDriverStandings = (state) => state.f1.driverStandings
export const selectConstructorStandings = (state) => state.f1.constructorStandings
export const selectStandingsStatus = (state) => state.f1.standingsStatus
export const selectStandingsError = (state) => state.f1.standingsError
export const selectStandingsRound = (state) => state.f1.standingsRound

export const selectDrivers = (state) => state.f1.drivers
export const selectConstructors = (state) => state.f1.constructors
export const selectCircuits = (state) => state.f1.circuits
export const selectGridStatus = (state) => state.f1.gridStatus

export const selectDetailStatus = (state) => state.f1.detailStatus
export const selectDetailError = (state) => state.f1.detailError
export const selectRaceDetail = (round) => (state) => state.f1.raceDetail[Number(round)] ?? null
export const selectNextRace = (state) => {
  const now = Date.now()
  return state.f1.races.find((race) => new Date(race.startsAt ?? race.date).getTime() > now) ?? null
}

export const selectLastRace = (state) => {
  const now = Date.now()
  const past = state.f1.races.filter(
    (race) => new Date(race.startsAt ?? race.date).getTime() <= now,
  )
  return past.length ? past[past.length - 1] : null
}
export const selectChampionshipLeader = (state) => state.f1.driverStandings[0] ?? null
export const selectDriverById = (driverId) => (state) => {
  if (!driverId) return null
  return (
    state.f1.drivers.find((d) => d.driverId === driverId) ??
    state.f1.driverStandings.find((s) => s.driver.driverId === driverId)?.driver ??
    null
  )
}

export default f1Slice.reducer
