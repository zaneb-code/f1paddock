import { Tag } from '../ui'
import { formatSessionDay, formatSessionTime, localTimeZone, isPast } from '../../utils/format'

const SHORT_TONE = {
  RACE: 'accent',
  SPR: 'flag',
  SQ: 'flag',
}

export default function WeekendSchedule({ race, compact = false }) {
  if (!race?.schedule?.length) {
    return <p className="text-sm text-muted">No session times published yet.</p>
  }

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
                      session.isRace ? 'border-accent/40 bg-accent/5' : 'border-line bg-surface-2'
                    } ${done ? 'opacity-55' : ''}`}
                  >
                    <Tag
                      tone={SHORT_TONE[session.short] ?? 'neutral'}
                      className="w-14 justify-center"
                    >
                      {session.short}
                    </Tag>

                    <span
                      className={`flex-1 text-sm ${session.isRace ? 'font-semibold text-chalk' : 'text-muted'}`}
                    >
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
