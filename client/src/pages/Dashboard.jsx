/**
 * The personalised F1 dashboard — the landing page.
 *
 * Signed out it works as a front page: next race, countdown, standings.
 * Signed in it becomes personal: your followed drivers highlighted in the
 * standings, your prediction status for the next race, your communities,
 * and meetups you have joined.
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import { SectionHeading, Stat, Loading, ErrorState, SkeletonGrid, Tag } from '../components/ui'
import RaceCard from '../components/f1/RaceCard'
import CircuitOutline from '../components/f1/CircuitOutline'
import WeekendSchedule from '../components/f1/WeekendSchedule'
import Countdown from '../components/f1/Countdown'
import { DriverStandingsTable } from '../components/f1/StandingsTable'
import { formatRaceDate } from '../utils/format'

import { selectUser, selectIsAuthenticated } from '../store/slices/authSlice'
import { selectMyProfile } from '../store/slices/profileSlice'
import {
  fetchSchedule,
  fetchStandings,
  selectRaces,
  selectScheduleStatus,
  selectScheduleError,
  selectDriverStandings,
  selectStandingsStatus,
  selectStandingsRound,
  selectNextRace,
  selectLastRace,
  selectSeason,
} from '../store/slices/f1Slice'
import {
  loadMyPredictions,
  selectMyPredictionFor,
  selectMyTotalPoints,
} from '../store/slices/predictionsSlice'
import { loadMeetups, selectMeetupsForRace } from '../store/slices/meetupsSlice'
import { loadCommunities, selectMyCommunities } from '../store/slices/socialSlice'

export default function Dashboard() {
  const dispatch = useDispatch()

  const user = useSelector(selectUser)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const profile = useSelector(selectMyProfile)

  const season = useSelector(selectSeason)
  const races = useSelector(selectRaces)
  const scheduleStatus = useSelector(selectScheduleStatus)
  const scheduleError = useSelector(selectScheduleError)
  const standings = useSelector(selectDriverStandings)
  const standingsStatus = useSelector(selectStandingsStatus)
  const standingsRound = useSelector(selectStandingsRound)

  const nextRace = useSelector(selectNextRace)
  const lastRace = useSelector(selectLastRace)

  const myPoints = useSelector(selectMyTotalPoints)
  const myPrediction = useSelector(selectMyPredictionFor(season, nextRace?.round))
  const raceMeetups = useSelector(selectMeetupsForRace(nextRace?.round))
  const myCommunities = useSelector(selectMyCommunities)

  // Only fetch what has not been fetched. Coming back from another page
  // should not refire these requests.
  useEffect(() => {
    if (scheduleStatus === 'idle') dispatch(fetchSchedule(season))
    if (standingsStatus === 'idle') dispatch(fetchStandings(season))
    dispatch(loadMeetups())
    dispatch(loadCommunities())
  }, [dispatch, season, scheduleStatus, standingsStatus])

  useEffect(() => {
    if (user) dispatch(loadMyPredictions(user.id))
  }, [dispatch, user])

  const upcoming = races
    .filter((race) => new Date(race.startsAt ?? race.date).getTime() > Date.now())
    .slice(0, 3)

  const followedDriverIds = profile?.followedDrivers ?? []

  // For the hero strip: who leads, and by how much.
  const leader = standings[0]
  const gapToSecond =
    standings.length > 1 ? Number(standings[0].points) - Number(standings[1].points) : 0

  return (
    <div>
      {/* ---------------- Hero ----------------
          Full bleed: it sits outside .shell so the photograph reaches the
          window edges. The image and its gradients come from .photo-hero
          in index.css rather than an <img>, so no layout shift while it
          loads and the text never has to wait for it. */}
      <section className="photo-hero border-b border-line">
        <div className="shell pt-16 pb-10 sm:pt-24 sm:pb-12">
          <p className="eyebrow mb-3">{season} Formula 1 season</p>

          <h1 className="max-w-3xl text-5xl leading-[0.95] font-bold sm:text-7xl">
            {isAuthenticated ? (
              <>
                Welcome back,
                <br />
                <span className="text-accent">{user.username}</span>
              </>
            ) : (
              <>
                The paddock,
                <br />
                for the people
                <br />
                <span className="text-accent">in the stands</span>
              </>
            )}
          </h1>

          <p className="mt-5 max-w-xl text-muted sm:text-lg">
            {isAuthenticated
              ? 'Here is what is happening across the grid and in your communities.'
              : 'Follow every session, argue about strategy, predict the podium and find fans who care as much as you do.'}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {isAuthenticated ? (
              <>
                <Link to="/predictions" className="btn btn-primary">
                  Make a prediction
                </Link>
                <Link to="/races" className="btn btn-ghost">
                  Race calendar
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary">
                  Create an account
                </Link>
                <Link to="/races" className="btn btn-ghost">
                  Browse the calendar
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Three cards across the foot of the hero: what is next, who is
            winning, what just happened. Translucent so the photograph
            still reads behind them. */}
        <div className="shell pb-12">
          <div className="grid gap-3 sm:grid-cols-3">
            {/* --- Next race --- */}
            <div className="card border-line/80 bg-ink/70 p-5 backdrop-blur-sm">
              <p className="eyebrow mb-3">Next race</p>

              {nextRace ? (
                <>
                  <div className="flex items-start gap-3">
                    <CircuitOutline
                      id={nextRace.circuitId ?? nextRace.round}
                      className="h-14 w-24 shrink-0 text-accent"
                      strokeWidth={4}
                      showStart={false}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-display text-xl font-bold text-chalk">
                        {nextRace.raceName}
                      </p>
                      <p className="truncate text-xs text-dim">{nextRace.circuitName}</p>
                    </div>
                  </div>

                  <p className="meta mt-3 normal-case">{formatRaceDate(nextRace.date)}</p>

                  <Link
                    to={`/races/${nextRace.round}`}
                    className="mt-3 inline-block text-sm text-accent hover:underline"
                  >
                    Weekend schedule →
                  </Link>
                </>
              ) : (
                <p className="text-sm text-muted">The season is complete.</p>
              )}
            </div>

            {/* --- Championship leader --- */}
            <div className="card border-line/80 bg-ink/70 p-5 backdrop-blur-sm">
              <p className="eyebrow mb-3">Championship leader</p>

              {leader ? (
                <>
                  <p className="truncate font-display text-xl font-bold text-chalk">
                    {leader.driver.fullName}
                  </p>
                  <p className="truncate text-xs text-dim">{leader.constructor.name}</p>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-display text-3xl font-bold text-accent tabular-nums">
                      {leader.points}
                    </span>
                    <span className="meta normal-case">
                      pts{gapToSecond > 0 && ` · ${gapToSecond} clear`}
                    </span>
                  </div>

                  <Link
                    to="/standings"
                    className="mt-3 inline-block text-sm text-accent hover:underline"
                  >
                    Full standings →
                  </Link>
                </>
              ) : (
                <p className="text-sm text-muted">No standings published yet.</p>
              )}
            </div>

            {/* --- Last time out --- */}
            <div className="card border-line/80 bg-ink/70 p-5 backdrop-blur-sm">
              <p className="eyebrow mb-3">Last time out</p>

              {lastRace ? (
                <>
                  <p className="truncate font-display text-xl font-bold text-chalk">
                    {lastRace.raceName}
                  </p>
                  <p className="truncate text-xs text-dim">
                    {lastRace.locality
                      ? `${lastRace.locality}, ${lastRace.country}`
                      : lastRace.circuitName}
                  </p>

                  <p className="meta mt-3 normal-case">{formatRaceDate(lastRace.date)}</p>

                  <Link
                    to={`/races/${lastRace.round}`}
                    className="mt-3 inline-block text-sm text-accent hover:underline"
                  >
                    Result and discussion →
                  </Link>
                </>
              ) : (
                <p className="text-sm text-muted">The season has not started yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="shell py-10">
        {/* ---------------- Next race ---------------- */}
        {scheduleStatus === 'loading' && <Loading label="Loading the race calendar…" />}

        {scheduleStatus === 'failed' && (
          <ErrorState
            title="Could not load F1 data"
            message={scheduleError}
            onRetry={() => dispatch(fetchSchedule(season))}
          />
        )}

        {scheduleStatus === 'succeeded' && nextRace && (
          <section className="mb-12">
            <div className="card overflow-hidden">
              <div className="border-b border-line bg-surface-2 px-6 py-8">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Tag tone="accent">Round {nextRace.round}</Tag>
                      {nextRace.isSprintWeekend && <Tag tone="flag">Sprint weekend</Tag>}
                    </div>
                    <h2 className="text-3xl sm:text-4xl">{nextRace.raceName}</h2>
                    <p className="mt-1 text-muted">
                      {nextRace.circuitName}
                      {nextRace.locality && ` · ${nextRace.locality}, ${nextRace.country}`}
                    </p>
                  </div>

                  <Link to={`/races/${nextRace.round}`} className="btn btn-sm btn-ghost">
                    Race page →
                  </Link>
                </div>

                <Countdown target={nextRace.startsAt} />
              </div>

              <div className="grid gap-6 p-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-lg">Weekend schedule</h3>
                  <WeekendSchedule race={nextRace} />
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="mb-3 text-lg">Your race</h3>

                    {!isAuthenticated ? (
                      <p className="text-sm text-muted">
                        <Link to="/login" className="text-accent hover:underline">
                          Log in
                        </Link>{' '}
                        to predict the podium and join the discussion.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3">
                          <span className="text-sm text-muted">Your prediction</span>
                          {myPrediction ? (
                            <Tag tone="go">Locked in</Tag>
                          ) : (
                            <Link to="/predictions" className="btn btn-sm btn-primary">
                              Predict
                            </Link>
                          )}
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3">
                          <span className="text-sm text-muted">Meetups this weekend</span>
                          <Link to="/meetups" className="font-display font-bold text-chalk">
                            {raceMeetups.length}
                          </Link>
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3">
                          <span className="text-sm text-muted">Your prediction points</span>
                          <span className="font-display font-bold text-accent">{myPoints}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Link to={`/races/${nextRace.round}#discussion`} className="btn btn-ghost w-full">
                    Open the discussion room
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ---------------- Standings ---------------- */}
        <section className="mb-12">
          <SectionHeading
            eyebrow={standingsRound ? `After round ${standingsRound}` : 'Championship'}
            title="Drivers' championship"
            action={
              <Link to="/standings" className="btn btn-sm btn-ghost">
                Full table →
              </Link>
            }
          />

          {standingsStatus === 'loading' && <Loading label="Loading standings…" />}
          {standingsStatus === 'succeeded' && (
            <DriverStandingsTable
              standings={standings}
              limit={8}
              highlightDriverIds={followedDriverIds}
            />
          )}
        </section>

        {/* ---------------- Upcoming races ---------------- */}
        <section className="mb-12">
          <SectionHeading
            eyebrow="What is coming"
            title="Next races"
            action={
              <Link to="/races" className="btn btn-sm btn-ghost">
                Full calendar →
              </Link>
            }
          />

          {scheduleStatus === 'loading' ? (
            <SkeletonGrid count={3} />
          ) : upcoming.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((race, index) => (
                <RaceCard key={race.round} race={race} isNext={index === 0} />
              ))}
            </div>
          ) : (
            <p className="text-muted">
              The season is complete. {lastRace && `${lastRace.raceName} was the finale.`}
            </p>
          )}
        </section>

        {/* ---------------- Your communities ---------------- */}
        {isAuthenticated && (
          <section>
            <SectionHeading
              eyebrow="Your corner of the paddock"
              title="Communities you have joined"
              action={
                <Link to="/communities" className="btn btn-sm btn-ghost">
                  Browse all →
                </Link>
              }
            />

            {myCommunities.length ? (
              <div className="flex flex-wrap gap-2">
                {myCommunities.map((community) => (
                  <Link key={community.id} to={`/communities/${community.slug}`} className="chip">
                    {community.name}
                    <span className="text-dim">{community.postCount}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                You have not joined any communities yet.{' '}
                <Link to="/communities" className="text-accent hover:underline">
                  Find one
                </Link>
                .
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
