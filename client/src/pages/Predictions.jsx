/**
 * The prediction page: pick a race, make your call, generate the AI's call,
 * compare the two, and review your past predictions.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import { PageHeading, Loading, EmptyState, Notice, SectionHeading, Tag, Stat } from '../components/ui'
import {
  PredictionForm,
  AiPredictionPanel,
  PredictionComparison,
} from '../components/predictions/PredictionPanels'

import {
  fetchSchedule,
  fetchStandings,
  selectRaces,
  selectScheduleStatus,
  selectDriverStandings,
  selectStandingsStatus,
  selectSeason,
  selectNextRace,
} from '../store/slices/f1Slice'
import {
  loadMyPredictions,
  loadAiStatus,
  scoreMyPrediction,
  clearPredictionMessages,
  selectMyPredictions,
  selectMyPredictionFor,
  selectMyTotalPoints,
  selectAiFor,
  selectPredictionError,
  selectPredictionNotice,
} from '../store/slices/predictionsSlice'
import { selectUser } from '../store/slices/authSlice'
import { formatRaceDate, isPast } from '../utils/format'
import { fetchRaceResults, fetchQualifyingResults } from '../api/jolpica'

export default function Predictions() {
  const dispatch = useDispatch()

  const season = useSelector(selectSeason)
  const races = useSelector(selectRaces)
  const scheduleStatus = useSelector(selectScheduleStatus)
  const standings = useSelector(selectDriverStandings)
  const standingsStatus = useSelector(selectStandingsStatus)
  const nextRace = useSelector(selectNextRace)

  const user = useSelector(selectUser)
  const myPredictions = useSelector(selectMyPredictions)
  const totalPoints = useSelector(selectMyTotalPoints)
  const error = useSelector(selectPredictionError)
  const notice = useSelector(selectPredictionNotice)

  const [round, setRound] = useState(null)

  useEffect(() => {
    if (scheduleStatus === 'idle') dispatch(fetchSchedule(season))
    if (standingsStatus === 'idle') dispatch(fetchStandings(season))
    dispatch(loadAiStatus())
  }, [dispatch, season, scheduleStatus, standingsStatus])

  useEffect(() => {
    if (user) dispatch(loadMyPredictions(user.id))
  }, [dispatch, user])

  // Default to the next race once the calendar arrives.
  useEffect(() => {
    if (round == null && nextRace) setRound(nextRace.round)
  }, [round, nextRace])

  const race = races.find((r) => r.round === Number(round)) ?? null
  const existing = useSelector(selectMyPredictionFor(season, round))
  const aiPrediction = useSelector(selectAiFor(String(season), String(round)))

  const loading = scheduleStatus === 'loading' || standingsStatus === 'loading'
  const locked = race ? isPast(race.startsAt ?? race.date) : false

  const scored = myPredictions.filter((p) => p.points != null).length

  return (
    <div className="shell py-10">
      <PageHeading
        eyebrow="Call the podium"
        title="Race predictions"
        subtitle="Pick your top three, then see what the machine thinks. Points are awarded once the race has run."
        action={
          <Link to="/leaderboard" className="btn btn-sm btn-ghost">
            Leaderboard →
          </Link>
        }
      />

      {(error || notice) && (
        <div className="mb-5">
          <Notice
            tone={error ? 'error' : 'success'}
            onDismiss={() => dispatch(clearPredictionMessages())}
          >
            {error ?? notice}
          </Notice>
        </div>
      )}

      {user && (
        <div className="mb-8 grid grid-cols-3 gap-3">
          <Stat label="Total points" value={totalPoints} tone="accent" />
          <Stat label="Predictions" value={myPredictions.length} />
          <Stat label="Scored" value={scored} />
        </div>
      )}

      {loading && <Loading label="Loading race data…" />}

      {!loading && races.length > 0 && (
        <>
          {/* Race picker */}
          <div className="mb-6">
            <label className="field-label" htmlFor="race-pick">
              Which race?
            </label>
            <select
              id="race-pick"
              className="input max-w-md"
              value={round ?? ''}
              onChange={(e) => setRound(Number(e.target.value))}
            >
              {races.map((r) => {
                const done = isPast(r.startsAt ?? r.date)
                return (
                  <option key={r.round} value={r.round}>
                    R{r.round} · {r.raceName} · {formatRaceDate(r.date)}
                    {done ? ' (started)' : ''}
                  </option>
                )
              })}
            </select>
          </div>

          {race && (
            <>
              <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Tag tone="accent">Round {race.round}</Tag>
                    {locked && <Tag tone="stop">Closed</Tag>}
                    {existing && !locked && <Tag tone="go">Prediction saved</Tag>}
                  </div>
                  <h2 className="text-2xl">{race.raceName}</h2>
                  <p className="text-sm text-muted">
                    {race.circuitName} · {formatRaceDate(race.date)}
                  </p>
                </div>

                <Link to={`/races/${race.round}`} className="btn btn-sm btn-ghost">
                  Race page →
                </Link>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <PredictionForm
                  race={race}
                  standings={standings}
                  existing={existing}
                  locked={locked}
                />
                <AiPredictionPanel race={race} standings={standings} />
              </div>

              {existing && aiPrediction && (
                <div className="mt-6">
                  <PredictionComparison mine={existing} ai={aiPrediction} standings={standings} />
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Past predictions */}
      {user && myPredictions.length > 0 && (
        <section className="mt-12">
          <SectionHeading eyebrow="Your history" title="Past predictions" />

          <div className="space-y-3">
            {myPredictions.map((prediction) => {
              const predRace = races.find((r) => r.round === prediction.round)
              const started = predRace ? isPast(predRace.startsAt ?? predRace.date) : false

              return (
                <div
                  key={prediction.id}
                  className="card flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-chalk">{prediction.raceName}</p>
                    <p className="text-xs text-dim">
                      Round {prediction.round} ·{' '}
                      {prediction.podium
                        .map(
                          (id) =>
                            standings.find((s) => s.driver.driverId === id)?.driver.familyName ?? id
                        )
                        .join(' › ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {prediction.points != null ? (
                      <span className="font-display text-xl font-bold text-accent">
                        {prediction.points} pts
                      </span>
                    ) : started ? (
                      <ScoreButton prediction={prediction} season={season} />
                    ) : (
                      <Tag>Pending</Tag>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {user && myPredictions.length === 0 && !loading && (
        <div className="mt-12">
          <EmptyState
            title="No predictions yet"
            message="Pick a race above and call the podium. You can change it right up until the race starts."
            icon="◎"
          />
        </div>
      )}
    </div>
  )
}

/**
 * Scores a prediction against the real result.
 *
 * In Phase 2 this happens on the server when results arrive. Doing it here
 * for now keeps the scoring rules visible and lets the leaderboard be
 * demonstrated without waiting for a real race to finish.
 */
function ScoreButton({ prediction, season }) {
  const dispatch = useDispatch()
  const [busy, setBusy] = useState(false)

  async function handleScore() {
    setBusy(true)

    const [results, qualifying] = await Promise.all([
      fetchRaceResults(season, prediction.round).catch(() => null),
      fetchQualifyingResults(season, prediction.round).catch(() => null),
    ])

    if (results?.results?.length) {
      await dispatch(
        scoreMyPrediction({
          predictionId: prediction.id,
          actualPodium: results.results.slice(0, 3).map((r) => r.driver.driverId),
          actualPole: qualifying?.[0]?.driver.driverId ?? null,
        })
      )
    }

    setBusy(false)
  }

  return (
    <button className="btn btn-sm btn-ghost" onClick={handleScore} disabled={busy}>
      {busy ? 'Scoring…' : 'Score it'}
    </button>
  )
}
