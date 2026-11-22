const BASE = 'https://api.jolpi.ca/ergast/f1'

export const CURRENT_SEASON = new Date().getUTCFullYear()

const REQUEST_TIMEOUT_MS = 12_000

async function request(path) {
  let response

  try {
    response = await fetch(`${BASE}${path}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error('The F1 data service did not respond in time. Try again in a moment.')
    }
    throw new Error('Could not reach the F1 data service. Check your connection.')
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('F1 data is rate limited right now — wait a few seconds and retry.')
    }
    if (response.status === 404) {
      throw new Error('That season or round does not exist in the F1 archive.')
    }
    throw new Error(`F1 data request failed (${response.status}).`)
  }

  return response.json()
}

const SESSION_FIELDS = [
  ['FirstPractice', 'Practice 1', 'FP1'],
  ['SecondPractice', 'Practice 2', 'FP2'],
  ['ThirdPractice', 'Practice 3', 'FP3'],
  ['SprintQualifying', 'Sprint Qualifying', 'SQ'],
  ['Sprint', 'Sprint', 'SPR'],
  ['Qualifying', 'Qualifying', 'QLF'],
]

function buildSchedule(race) {
  const sessions = SESSION_FIELDS.filter(([field]) => race[field]).map(([field, name, short]) => ({
    key: field,
    name,
    short,
    date: race[field].date,
    time: race[field].time ?? null,
    startsAt: toIso(race[field].date, race[field].time),
  }))

  sessions.push({
    key: 'Race',
    name: 'Grand Prix',
    short: 'RACE',
    date: race.date,
    time: race.time ?? null,
    startsAt: toIso(race.date, race.time),
    isRace: true,
  })

  return sessions.sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''))
}

function toIso(date, time) {
  if (!date) return null
  if (!time) return `${date}T00:00:00Z`
  return `${date}T${time.endsWith('Z') ? time : `${time}Z`}`
}

export function normaliseRace(race) {
  const schedule = buildSchedule(race)

  return {
    season: race.season,
    round: Number(race.round),
    raceName: race.raceName,
    url: race.url ?? null,
    date: race.date,
    time: race.time ?? null,
    startsAt: toIso(race.date, race.time),

    circuitId: race.Circuit?.circuitId ?? null,
    circuitName: race.Circuit?.circuitName ?? 'Circuit to be confirmed',
    locality: race.Circuit?.Location?.locality ?? null,
    country: race.Circuit?.Location?.country ?? null,
    lat: race.Circuit?.Location?.lat ?? null,
    long: race.Circuit?.Location?.long ?? null,

    schedule,
    isSprintWeekend: schedule.some((s) => s.key === 'Sprint'),
  }
}

function normaliseDriver(driver) {
  return {
    driverId: driver.driverId,
    code: driver.code ?? driver.familyName.slice(0, 3).toUpperCase(),
    number: driver.permanentNumber ?? null,
    givenName: driver.givenName,
    familyName: driver.familyName,
    fullName: `${driver.givenName} ${driver.familyName}`,
    nationality: driver.nationality,
    url: driver.url ?? null,
  }
}

export async function fetchSeasonSchedule(season = CURRENT_SEASON) {
  const data = await request(`/${season}/races/?format=json&limit=100`)
  const races = data.MRData?.RaceTable?.Races ?? []
  return races.map(normaliseRace)
}

export async function fetchRace(season, round) {
  const data = await request(`/${season}/${round}/races/?format=json`)
  const race = data.MRData?.RaceTable?.Races?.[0]
  if (!race) throw new Error('Race not found.')
  return normaliseRace(race)
}

export async function fetchRaceResults(season, round) {
  const data = await request(`/${season}/${round}/results/?format=json&limit=100`)
  const race = data.MRData?.RaceTable?.Races?.[0]
  if (!race) return null

  return {
    round: Number(race.round),
    raceName: race.raceName,
    results: (race.Results ?? []).map((row) => ({
      position: Number(row.position),
      positionText: row.positionText,
      points: Number(row.points),
      gridPosition: Number(row.grid),
      laps: Number(row.laps),
      status: row.status,
      finished: row.positionText === String(row.position),
      time: row.Time?.time ?? null,
      fastestLap: row.FastestLap
        ? { rank: Number(row.FastestLap.rank), time: row.FastestLap.Time?.time ?? null }
        : null,
      driver: normaliseDriver(row.Driver),
      constructor: { id: row.Constructor.constructorId, name: row.Constructor.name },
    })),
  }
}

export async function fetchQualifyingResults(season, round) {
  const data = await request(`/${season}/${round}/qualifying/?format=json&limit=100`)
  const race = data.MRData?.RaceTable?.Races?.[0]
  if (!race) return null

  return (race.QualifyingResults ?? []).map((row) => ({
    position: Number(row.position),
    q1: row.Q1 ?? null,
    q2: row.Q2 ?? null,
    q3: row.Q3 ?? null,
    driver: normaliseDriver(row.Driver),
    constructor: { id: row.Constructor.constructorId, name: row.Constructor.name },
  }))
}

export async function fetchDriverStandings(season = CURRENT_SEASON) {
  const data = await request(`/${season}/driverstandings/?format=json&limit=100`)
  const list = data.MRData?.StandingsTable?.StandingsLists?.[0]
  if (!list) return { round: 0, standings: [] }

  return {
    round: Number(list.round),
    standings: (list.DriverStandings ?? []).map((row) => ({
      position: Number(row.position),
      points: Number(row.points),
      wins: Number(row.wins),
      driver: normaliseDriver(row.Driver),
      constructor: {
        id: row.Constructors?.[0]?.constructorId ?? null,
        name: row.Constructors?.[0]?.name ?? 'Unknown',
      },
    })),
  }
}

export async function fetchConstructorStandings(season = CURRENT_SEASON) {
  const data = await request(`/${season}/constructorstandings/?format=json&limit=100`)
  const list = data.MRData?.StandingsTable?.StandingsLists?.[0]
  if (!list) return { round: 0, standings: [] }

  return {
    round: Number(list.round),
    standings: (list.ConstructorStandings ?? []).map((row) => ({
      position: Number(row.position),
      points: Number(row.points),
      wins: Number(row.wins),
      constructor: {
        id: row.Constructor.constructorId,
        name: row.Constructor.name,
        nationality: row.Constructor.nationality,
        url: row.Constructor.url ?? null,
      },
    })),
  }
}

export async function fetchDrivers(season = CURRENT_SEASON) {
  const data = await request(`/${season}/drivers/?format=json&limit=100`)
  return (data.MRData?.DriverTable?.Drivers ?? []).map(normaliseDriver)
}

export async function fetchConstructors(season = CURRENT_SEASON) {
  const data = await request(`/${season}/constructors/?format=json&limit=100`)
  return (data.MRData?.ConstructorTable?.Constructors ?? []).map((c) => ({
    id: c.constructorId,
    name: c.name,
    nationality: c.nationality,
    url: c.url ?? null,
  }))
}

export async function fetchCircuits(season = CURRENT_SEASON) {
  const data = await request(`/${season}/circuits/?format=json&limit=100`)
  return (data.MRData?.CircuitTable?.Circuits ?? []).map((c) => ({
    id: c.circuitId,
    name: c.circuitName,
    locality: c.Location?.locality ?? null,
    country: c.Location?.country ?? null,
    url: c.url ?? null,
  }))
}

export async function fetchRecentForm(season, upToRound, count = 3) {
  const rounds = []
  for (let r = upToRound; r > 0 && rounds.length < count; r -= 1) rounds.push(r)

  const settled = await Promise.allSettled(rounds.map((r) => fetchRaceResults(season, r)))

  return settled
    .filter((s) => s.status === 'fulfilled' && s.value?.results?.length)
    .map((s) => ({
      raceName: s.value.raceName,
      top3: s.value.results.slice(0, 3).map((r) => r.driver.fullName),
    }))
}