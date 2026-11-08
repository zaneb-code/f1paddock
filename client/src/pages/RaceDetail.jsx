/**
 * One Grand Prix: the full weekend schedule, results and qualifying order
 * when they exist, the race discussion room, and any meetups tied to it.
 *
 * The round number comes from the URL, so the page is shareable and survives
 * a refresh.
 */

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import {
  Loading,
  ErrorState,
  EmptyState,
  Tabs,
  Tag,
  SectionHeading,
  SkeletonList,
} from '../components/ui'
import WeekendSchedule from '../components/f1/WeekendSchedule'
import Countdown from '../components/f1/Countdown'
import { ResultsTable, Podium } from '../components/f1/StandingsTable'
import { MeetupCard } from '../components/social/Cards'
import PostCard from '../components/social/PostCard'
import PostComposer from '../components/social/PostComposer'

import {
  fetchRaceDetail,
  selectRaceDetail,
  selectDetailStatus,
  selectDetailError,
  selectSeason,
} from '../store/slices/f1Slice'
import { loadPosts, selectPosts, selectPostsStatus } from '../store/slices/socialSlice'
import { loadMeetups, toggleAttendance, selectMeetupsForRace } from '../store/slices/meetupsSlice'
import { selectUser } from '../store/slices/authSlice'
import { formatRaceDate, isPast } from '../utils/format'
import { teamColour } from '../utils/teams'

export default function RaceDetail() {
  const { round } = useParams()
  const dispatch = useDispatch()

  const season = useSelector(selectSeason)
  const detail = useSelector(selectRaceDetail(round))
  const status = useSelector(selectDetailStatus)
  const error = useSelector(selectDetailError)

  const posts = useSelector(selectPosts)
  const postsStatus = useSelector(selectPostsStatus)
  const meetups = useSelector(selectMeetupsForRace(round))
  const user = useSelector(selectUser)

  const [tab, setTab] = useState('schedule')

  useEffect(() => {
    // Cached detail (a completed race never changes) is not refetched.
    if (!detail) dispatch(fetchRaceDetail({ season, round }))
    dispatch(loadPosts({ raceRound: Number(round), season }))
    dispatch(loadMeetups())
  }, [dispatch, season, round, detail])

  if (status === 'loading' && !detail) return <Loading label="Loading the race…" />

  if (status === 'failed' && !detail) {
    return (
      <div className="shell py-10">
        <ErrorState
          title="Could not load this race"
          message={error}
          onRetry={() => dispatch(fetchRaceDetail({ season, round }))}
        />
        <p className="mt-5">
          <Link to="/races" className="text-accent hover:underline">
            ← Back to the calendar
          </Link>
        </p>
      </div>
    )
  }

  if (!detail) return null

  const { race, results, qualifying } = detail
  const finished = Boolean(results?.results?.length)
  const upcoming = !isPast(race.startsAt ?? race.date)

  const tabs = [
    { id: 'schedule', label: 'Schedule' },
    ...(finished ? [{ id: 'results', label: 'Results' }] : []),
    ...(qualifying?.length ? [{ id: 'qualifying', label: 'Qualifying' }] : []),
    { id: 'discussion', label: 'Discussion', count: posts.length },
  ]

  return (
    <div className="shell py-10">
      <Link to="/races" className="mb-5 inline-block text-sm text-muted hover:text-accent">
        ← All races
      </Link>

      {/* ---------------- Header ---------------- */}
      <header className="card mb-8 overflow-hidden">
        <div className="border-b border-line bg-surface-2 px-6 py-7">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Tag tone="accent">Round {race.round}</Tag>
            {race.isSprintWeekend && <Tag tone="flag">Sprint weekend</Tag>}
            {finished && <Tag tone="go">Complete</Tag>}
            {upcoming && <Tag>Upcoming</Tag>}
          </div>

          <h1 className="mb-1 text-4xl sm:text-5xl">{race.raceName}</h1>
          <p className="text-muted">
            {race.circuitName}
            {race.locality && ` · ${race.locality}, ${race.country}`} · {formatRaceDate(race.date)}
          </p>

          {upcoming && (
            <div className="mt-6">
              <Countdown target={race.startsAt} />
            </div>
          )}
        </div>

        {finished && (
          <div className="px-6 py-6">
            <p className="eyebrow mb-4 text-center">Podium</p>
            <Podium results={results.results} />
          </div>
        )}
      </header>

      <Tabs tabs={tabs} active={tab} onChange={setTab} className="mb-6" />

      {/* ---------------- Schedule ---------------- */}
      {tab === 'schedule' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="card p-6">
            <h2 className="mb-4 text-2xl">Weekend schedule</h2>
            <WeekendSchedule race={race} />
          </div>

          <aside className="space-y-4">
            <div className="card p-5">
              <h3 className="mb-3 text-lg">Circuit</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-dim">Name</dt>
                  <dd className="text-right text-chalk">{race.circuitName}</dd>
                </div>
                {race.locality && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-dim">Location</dt>
                    <dd className="text-right text-chalk">
                      {race.locality}, {race.country}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-dim">Sessions</dt>
                  <dd className="text-right text-chalk">{race.schedule.length}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-dim">Format</dt>
                  <dd className="text-right text-chalk">
                    {race.isSprintWeekend ? 'Sprint' : 'Conventional'}
                  </dd>
                </div>
              </dl>

              {race.url && (
                <a
                  href={race.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-ghost mt-4 w-full"
                >
                  Background reading ↗
                </a>
              )}
            </div>

            {upcoming && (
              <Link to="/predictions" className="btn btn-primary w-full">
                Predict this race
              </Link>
            )}
          </aside>
        </div>
      )}

      {/* ---------------- Results ---------------- */}
      {tab === 'results' && finished && (
        <section>
          <SectionHeading eyebrow="Final classification" title="Race result" />
          <ResultsTable results={results.results} />
        </section>
      )}

      {/* ---------------- Qualifying ---------------- */}
      {tab === 'qualifying' && qualifying?.length > 0 && (
        <section>
          <SectionHeading eyebrow="Starting order" title="Qualifying" />

          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-left">
                  <th className="w-14 px-3 py-2.5 text-xs tracking-widest text-dim uppercase">Pos</th>
                  <th className="px-3 py-2.5 text-xs tracking-widest text-dim uppercase">Driver</th>
                  <th className="px-3 py-2.5 text-right text-xs tracking-widest text-dim uppercase">Q1</th>
                  <th className="px-3 py-2.5 text-right text-xs tracking-widest text-dim uppercase">Q2</th>
                  <th className="px-3 py-2.5 text-right text-xs tracking-widest text-dim uppercase">Q3</th>
                </tr>
              </thead>
              <tbody>
                {qualifying.map((row) => (
                  <tr key={row.driver.driverId} className="border-b border-line/60 last:border-0">
                    <td className="px-3 py-3">
                      <span
                        className="mr-2 inline-block h-5 w-1 rounded-full align-middle"
                        style={{ backgroundColor: teamColour(row.constructor.id) }}
                      />
                      <span className="font-display font-bold">{row.position}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-chalk">{row.driver.fullName}</span>
                      <span className="block text-xs text-dim">{row.constructor.name}</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-muted">{row.q1 ?? '—'}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-muted">{row.q2 ?? '—'}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-chalk">{row.q3 ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---------------- Discussion room ---------------- */}
      {tab === 'discussion' && (
        <section id="discussion" className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <SectionHeading
              eyebrow="Race discussion room"
              title={`Talking about ${race.raceName}`}
            />

            <div className="mb-5">
              <PostComposer
                raceRound={Number(round)}
                season={season}
                placeholder={`What do you expect from ${race.raceName}?`}
              />
            </div>

            {postsStatus === 'loading' ? (
              <SkeletonList rows={2} />
            ) : posts.length ? (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} showCommunity={false} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nobody has said anything yet"
                message="Be the first to call the result, complain about the tyre compounds, or argue about strategy."
                icon="◌"
              />
            )}
          </div>

          <aside>
            <h3 className="mb-3 text-lg">Meetups for this race</h3>

            {meetups.length ? (
              <div className="space-y-3">
                {meetups.map((meetup) => (
                  <MeetupCard
                    key={meetup.id}
                    meetup={meetup}
                    isAttending={user ? meetup.attendeeIds.includes(user.id) : false}
                    canAttend={Boolean(user)}
                    onToggleAttend={() =>
                      dispatch(toggleAttendance({ meetupId: meetup.id, userId: user.id }))
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="mb-3 text-sm text-muted">No meetups organised for this round yet.</p>
            )}

            <Link to="/meetups" className="btn btn-sm btn-ghost mt-3 w-full">
              Organise one
            </Link>
          </aside>
        </section>
      )}
    </div>
  )
}
