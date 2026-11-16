/**
 * One Grand Prix as a calendar tile — circuit outline, place, date span.
 * Used on the full calendar and on the dashboard's "next races" strip.
 *
 * The outline is a generated shape rather than the real track layout; see
 * CircuitOutline.jsx for why.
 */

import { Link } from 'react-router-dom'
import CircuitOutline from './CircuitOutline'
import { formatShortDate, isPast } from '../../utils/format'

export default function RaceCard({ race, isNext = false }) {
  const finished = isPast(race.startsAt ?? race.date)

  // First and last session of the weekend, so the tile can show a span like
  // "6 Mar – 8 Mar" without the caller working it out.
  const first = race.schedule?.[0]
  const last = race.schedule?.[race.schedule.length - 1]

  const span =
    first && last && first.date !== last.date
      ? `${formatShortDate(first.date)} – ${formatShortDate(last.date)}`
      : formatShortDate(race.date)

  // City if we have it, circuit name otherwise. The city is what fans say.
  const place = race.locality || race.circuitName

  return (
    <Link
      to={`/races/${race.round}`}
      className={`card card-hover group relative block overflow-hidden px-4 pt-4 pb-5 text-center ${
        isNext ? 'border-accent/60 bg-accent/[0.04]' : ''
      } ${finished && !isNext ? 'opacity-65 hover:opacity-100' : ''}`}
    >
      {/* Round number and weekend format, on one line above the outline */}
      <div className="mb-1 flex items-center justify-between">
        <span className="meta">R{String(race.round).padStart(2, '0')}</span>

        {isNext ? (
          <span className="font-display text-[0.65rem] font-bold tracking-widest text-accent uppercase">
            Next up
          </span>
        ) : race.isSprintWeekend ? (
          <span className="font-display text-[0.65rem] font-bold tracking-widest text-flag uppercase">
            Sprint
          </span>
        ) : finished ? (
          <span className="font-display text-[0.65rem] font-bold tracking-widest text-dim uppercase">
            Done
          </span>
        ) : (
          <span className="text-[0.65rem]">&nbsp;</span>
        )}
      </div>

      <CircuitOutline
        id={race.circuitId ?? race.circuitName ?? race.round}
        className={`mx-auto h-24 w-full transition-colors duration-200 ${
          isNext ? 'text-accent' : 'text-accent/70 group-hover:text-accent'
        }`}
      />

      <h3 className="mt-2 truncate font-display text-xl font-bold tracking-wide text-chalk uppercase">
        {place}
      </h3>

      <p className="meta mt-1 normal-case">{span}</p>

      {race.country && <p className="mt-0.5 text-[0.7rem] text-dim">{race.country}</p>}
    </Link>
  )
}
