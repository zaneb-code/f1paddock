/**
 * The full Grand Prix weekend timetable — the core of the race-information
 * requirement.
 *
 * Sessions come from the API already sorted by start time, which handles both
 * weekend formats without a special case: a normal weekend shows FP1/FP2/FP3
 * then qualifying, a sprint weekend shows FP1, sprint qualifying, the sprint
 * and then qualifying.
 *
 * Times are rendered in the viewer's own timezone, because "when is quali for
 * me" is the only question a fan is actually asking.
 */

import { Tag } from '../ui'
import {
  formatSessionDay,
  formatSessionTime,
  localTimeZone,
  isPast,
} from '../../utils/format'

const SHORT_TONE = {
  RACE: 'accent',
  SPR: 'flag',
  SQ: 'flag',
}

export default function WeekendSchedule({ race, compact = false }) {
  if (!race?.schedule?.length) {
    return <p className="text-sm text-muted">No session times published yet.</p>
  }

  // Group by calendar day so the weekend reads Friday / Saturday / Sunday.
  const days = []
  race.schedule.forEach((session) => {
    const existing = days.find((d) => d.date === session.date)
    if (existing) existing.sessions.push(session)
    else days.push({ date: session.date, sessions: [session] })
  })

  return (
    <div>
      {!compact && (
        <p className="mb-3 text-xs text-dim">
          All times shown in your local timezone ({localTimeZone()}).
        </p>
      )}

      <div className="space-y-4">
        {days.map((day) => (
          <div key={day.date}>
            <p className="eyebrow mb-2">{formatSessionDay(`${day.date}T12:00:00Z`)}</p>

            <div className="space-y-1.5">
              {day.sessions.map((session) => {
                const done = isPast(session.startsAt)

                return (
                  <div
                    key={session.key}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                      session.isRace
                        ? 'border-accent/40 bg-accent/5'
                        : 'border-line bg-surface-2'
                    } ${done ? 'opacity-55' : ''}`}
                  >
                    <Tag tone={SHORT_TONE[session.short] ?? 'neutral'} className="w-14 justify-center">
                      {session.short}
                    </Tag>

                    <span className={`flex-1 text-sm ${session.isRace ? 'font-semibold text-chalk' : 'text-muted'}`}>
                      {session.name}
                    </span>

                    <span className="font-mono text-sm text-chalk tabular-nums">
                      {session.time ? formatSessionTime(session.startsAt) : 'TBC'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
