/**
 * One Grand Prix in a list. Used on the dashboard and the full calendar.
 */

import { Link } from 'react-router-dom'
import { Tag } from '../ui'
import { formatRaceDate, formatShortDate, isPast } from '../../utils/format'

export default function RaceCard({ race, isNext = false }) {
  const finished = isPast(race.startsAt ?? race.date)

  // First and last session of the weekend, so the card can show a span
  // like "6 – 8 Mar" without the caller working it out.
  const first = race.schedule?.[0]
  const last = race.schedule?.[race.schedule.length - 1]

  return (
    <Link
      to={`/races/${race.round}`}
      className={`card card-hover relative block overflow-hidden p-5 ${
        isNext ? 'border-accent/60' : ''
      } ${finished && !isNext ? 'opacity-70' : ''}`}
    >
      {isNext && (
        <span className="absolute top-0 right-0 rounded-bl-xl bg-accent px-3 py-1 font-display text-xs font-bold tracking-widest text-white uppercase">
          Next up
        </span>
      )}

      <div className="mb-3 flex items-center gap-2">
        <span className="meta">Round {race.round}</span>
        {race.isSprintWeekend && <Tag tone="flag">Sprint</Tag>}
        {finished && !isNext && <Tag>Finished</Tag>}
      </div>

      <h3 className="mb-1 text-2xl leading-tight">{race.raceName}</h3>

      <p className="mb-4 text-sm text-muted">
        {race.circuitName}
        {race.locality && <span className="text-dim"> · {race.locality}, {race.country}</span>}
      </p>

      <div className="flex items-center justify-between border-t border-dashed border-line pt-3">
        <span className="meta">
          {first && last && first.date !== last.date
            ? `${formatShortDate(first.date)} – ${formatShortDate(last.date)}`
            : formatRaceDate(race.date)}
        </span>
        <span className="font-display text-sm font-semibold tracking-wide text-accent uppercase">
          {race.schedule?.length ?? 0} sessions
        </span>
      </div>
    </Link>
  )
}
