/**
 * The full season calendar, with search and filters.
 */

import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { PageHeading, Loading, ErrorState, EmptyState, Tabs } from '../components/ui'
import RaceCard from '../components/f1/RaceCard'
import {
  fetchSchedule,
  selectRaces,
  selectScheduleStatus,
  selectScheduleError,
  selectSeason,
  selectNextRace,
} from '../store/slices/f1Slice'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
  { id: 'sprint', label: 'Sprints' },
]

export default function Races() {
  const dispatch = useDispatch()

  const season = useSelector(selectSeason)
  const races = useSelector(selectRaces)
  const status = useSelector(selectScheduleStatus)
  const error = useSelector(selectScheduleError)
  const nextRace = useSelector(selectNextRace)

  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (status === 'idle') dispatch(fetchSchedule(season))
  }, [dispatch, season, status])

  // useMemo so filtering does not rerun on every keystroke elsewhere.
  const visible = useMemo(() => {
    const now = Date.now()
    let list = races

    if (tab === 'upcoming') list = list.filter((r) => new Date(r.startsAt ?? r.date).getTime() > now)
    if (tab === 'completed') list = list.filter((r) => new Date(r.startsAt ?? r.date).getTime() <= now)
    if (tab === 'sprint') list = list.filter((r) => r.isSprintWeekend)

    if (query.trim()) {
      const needle = query.toLowerCase()
      list = list.filter(
        (r) =>
          r.raceName.toLowerCase().includes(needle) ||
          r.circuitName.toLowerCase().includes(needle) ||
          (r.country ?? '').toLowerCase().includes(needle) ||
          (r.locality ?? '').toLowerCase().includes(needle)
      )
    }

    return list
  }, [races, tab, query])

  const counts = useMemo(() => {
    const now = Date.now()
    return {
      all: races.length,
      upcoming: races.filter((r) => new Date(r.startsAt ?? r.date).getTime() > now).length,
      completed: races.filter((r) => new Date(r.startsAt ?? r.date).getTime() <= now).length,
      sprint: races.filter((r) => r.isSprintWeekend).length,
    }
  }, [races])

  return (
    <div className="shell py-10">
      <PageHeading
        eyebrow={`${season} season`}
        title="Race calendar"
        subtitle="Every Grand Prix with its full weekend timetable — practice, qualifying, sprints and the race itself, in your timezone."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Tabs
          tabs={TABS.map((t) => ({ ...t, count: counts[t.id] }))}
          active={tab}
          onChange={setTab}
        />
        <input
          type="search"
          className="input max-w-xs"
          placeholder="Search circuit or country…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search races"
        />
      </div>

      {status === 'loading' && <Loading label="Loading the calendar…" />}

      {status === 'failed' && (
        <ErrorState message={error} onRetry={() => dispatch(fetchSchedule(season))} />
      )}

      {status === 'succeeded' &&
        (visible.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((race) => (
              <RaceCard key={race.round} race={race} isNext={race.round === nextRace?.round} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No races match"
            message="Try a different search term or filter."
            icon="⚑"
            action={
              <button
                className="btn btn-sm btn-primary"
                onClick={() => {
                  setQuery('')
                  setTab('all')
                }}
              >
                Clear filters
              </button>
            }
          />
        ))}
    </div>
  )
}
