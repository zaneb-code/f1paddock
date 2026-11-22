/**
 * Championship tables, for both drivers and constructors.
 *
 * The left edge of every row is the team colour, which makes team-mates
 * visually adjacent without needing a separate column.
 */

import { Link } from 'react-router-dom'
import CarSilhouette from './CarSilhouette'
import { teamColour, teamTint } from '../../utils/teams'
import { ordinal } from '../../utils/format'

export function DriverStandingsTable({ standings, limit, highlightDriverIds = [] }) {
  const rows = limit ? standings.slice(0, limit) : standings

  if (!rows.length) {
    return <p className="py-6 text-center text-sm text-muted">No standings published yet.</p>
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-2 text-left">
            <th className="w-14 px-3 py-2.5 text-xs font-semibold tracking-widest text-dim uppercase">
              Pos
            </th>
            <th className="px-3 py-2.5 text-xs font-semibold tracking-widest text-dim uppercase">
              Driver
            </th>
            <th className="hidden px-3 py-2.5 text-xs font-semibold tracking-widest text-dim uppercase sm:table-cell">
              Team
            </th>
            <th className="w-16 px-3 py-2.5 text-right text-xs font-semibold tracking-widest text-dim uppercase">
              Wins
            </th>
            <th className="w-20 px-3 py-2.5 text-right text-xs font-semibold tracking-widest text-dim uppercase">
              Pts
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const followed = highlightDriverIds.includes(row.driver.driverId)

            return (
              <tr
                key={row.driver.driverId}
                className={`border-b border-line/60 last:border-0 transition-colors hover:bg-surface-2 ${
                  followed ? 'bg-accent/5' : ''
                }`}
              >
                <td className="px-3 py-3">
                  <span
                    className="mr-2 inline-block h-5 w-1 rounded-full align-middle"
                    style={{ backgroundColor: teamColour(row.constructor.id) }}
                    aria-hidden="true"
                  />
                  <span className="font-display font-bold text-chalk">{row.position}</span>
                </td>
                <td className="px-3 py-3">
                  <span className="font-medium text-chalk">{row.driver.fullName}</span>
                  {followed && <span className="ml-2 text-xs text-accent">following</span>}
                  <span className="block text-xs text-dim sm:hidden">{row.constructor.name}</span>
                </td>
                <td className="hidden px-3 py-3 text-muted sm:table-cell">
                  {row.constructor.name}
                </td>
                <td className="px-3 py-3 text-right font-mono text-muted tabular-nums">
                  {row.wins}
                </td>
                <td className="px-3 py-3 text-right font-mono font-bold text-chalk tabular-nums">
                  {row.points}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function ConstructorStandingsTable({ standings, limit, highlightTeamIds = [] }) {
  const rows = limit ? standings.slice(0, limit) : standings

  if (!rows.length) {
    return <p className="py-6 text-center text-sm text-muted">No standings published yet.</p>
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-2 text-left">
            <th className="w-14 px-3 py-2.5 text-xs font-semibold tracking-widest text-dim uppercase">
              Pos
            </th>
            <th className="px-3 py-2.5 text-xs font-semibold tracking-widest text-dim uppercase">
              Team
            </th>
            <th className="w-16 px-3 py-2.5 text-right text-xs font-semibold tracking-widest text-dim uppercase">
              Wins
            </th>
            <th className="w-20 px-3 py-2.5 text-right text-xs font-semibold tracking-widest text-dim uppercase">
              Pts
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const followed = highlightTeamIds.includes(row.constructor.id)

            return (
              <tr
                key={row.constructor.id}
                className={`border-b border-line/60 last:border-0 transition-colors hover:bg-surface-2 ${
                  followed ? 'bg-accent/5' : ''
                }`}
              >
                <td className="px-3 py-3">
                  <span
                    className="mr-2 inline-block h-5 w-1 rounded-full align-middle"
                    style={{ backgroundColor: teamColour(row.constructor.id) }}
                    aria-hidden="true"
                  />
                  <span className="font-display font-bold text-chalk">{row.position}</span>
                </td>
                <td className="px-3 py-3 font-medium text-chalk">
                  {row.constructor.name}
                  {followed && <span className="ml-2 text-xs text-accent">following</span>}
                </td>
                <td className="px-3 py-3 text-right font-mono text-muted tabular-nums">
                  {row.wins}
                </td>
                <td className="px-3 py-3 text-right font-mono font-bold text-chalk tabular-nums">
                  {row.points}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Finishing order for a completed race — the "driver positions under each
 * race" part of the requirement. Shows grid position and places gained or
 * lost, which is the detail that makes a result readable at a glance.
 */
export function ResultsTable({ results }) {
  if (!results?.length) {
    return <p className="py-6 text-center text-sm text-muted">No results yet.</p>
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-2 text-left">
            <th className="w-14 px-3 py-2.5 text-xs font-semibold tracking-widest text-dim uppercase">
              Pos
            </th>
            <th className="px-3 py-2.5 text-xs font-semibold tracking-widest text-dim uppercase">
              Driver
            </th>
            <th className="px-3 py-2.5 text-xs font-semibold tracking-widest text-dim uppercase">
              Team
            </th>
            <th className="w-20 px-3 py-2.5 text-center text-xs font-semibold tracking-widest text-dim uppercase">
              Grid
            </th>
            <th className="w-28 px-3 py-2.5 text-right text-xs font-semibold tracking-widest text-dim uppercase">
              Time / status
            </th>
            <th className="w-16 px-3 py-2.5 text-right text-xs font-semibold tracking-widest text-dim uppercase">
              Pts
            </th>
          </tr>
        </thead>
        <tbody>
          {results.map((row) => {
            const gained = row.gridPosition > 0 ? row.gridPosition - row.position : 0

            return (
              <tr
                key={row.driver.driverId}
                className={`border-b border-line/60 last:border-0 hover:bg-surface-2 ${
                  row.position <= 3 ? 'bg-flag/[0.04]' : ''
                }`}
              >
                <td className="px-3 py-3">
                  <span
                    className="mr-2 inline-block h-5 w-1 rounded-full align-middle"
                    style={{ backgroundColor: teamColour(row.constructor.id) }}
                    aria-hidden="true"
                  />
                  <span className="font-display font-bold text-chalk">{row.positionText}</span>
                </td>
                <td className="px-3 py-3 font-medium text-chalk">{row.driver.fullName}</td>
                <td className="px-3 py-3 text-muted">{row.constructor.name}</td>
                <td className="px-3 py-3 text-center font-mono text-xs tabular-nums">
                  <span className="text-muted">{row.gridPosition || '—'}</span>
                  {gained !== 0 && (
                    <span className={gained > 0 ? 'ml-1 text-go' : 'ml-1 text-stop'}>
                      {gained > 0 ? `+${gained}` : gained}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs text-muted">
                  {row.time ?? row.status}
                </td>
                <td className="px-3 py-3 text-right font-mono font-bold text-chalk tabular-nums">
                  {row.points || '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** The three podium finishers, shown large. */
export function Podium({ results }) {
  const top3 = results?.slice(0, 3) ?? []
  if (top3.length < 3) return null

  const order = [top3[1], top3[0], top3[2]] // 2nd, 1st, 3rd — visual podium order
  const heights = ['h-20', 'h-28', 'h-16']
  const medals = ['2nd', '1st', '3rd']

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4">
      {order.map((row, i) => (
        <div key={row.driver.driverId} className="flex-1 text-center" style={{ maxWidth: 180 }}>
          <p className="mb-1 truncate text-sm font-semibold text-chalk">{row.driver.familyName}</p>
          <p className="mb-2 truncate text-xs text-dim">{row.constructor.name}</p>
          <div
            className={`${heights[i]} rounded-t-xl border-t-2`}
            style={{
              backgroundColor: `${teamColour(row.constructor.id)}22`,
              borderTopColor: teamColour(row.constructor.id),
            }}
          >
            <p className="pt-2 font-display text-lg font-bold text-chalk">{medals[i]}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * The constructors' championship as full-width cards rather than table rows.
 *
 * A table makes you read across to compare; these make the order obvious at
 * a glance, because each card is washed in its own team colour and the
 * points are the largest thing on it. The car is a generic drawn shape
 * tinted to match — see CarSilhouette.jsx.
 */
export function ConstructorStandingsCards({ standings, limit, highlightTeamIds = [] }) {
  const rows = limit ? standings.slice(0, limit) : standings

  if (!rows.length) {
    return <p className="py-6 text-center text-sm text-muted">No standings published yet.</p>
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const id = row.constructor.id
        const colour = teamColour(id)
        const followed = highlightTeamIds.includes(id)

        return (
          <article
            key={id}
            className="relative overflow-hidden rounded-2xl border border-line transition-transform duration-200 hover:-translate-y-0.5"
            style={{
              // Team colour at the leading edge, fading into the page. The
              // alpha is kept below ~0.6 on purpose: a fully saturated
              // livery behind white text fails contrast on the lighter
              // colours (Mercedes, Williams, Haas).
              backgroundImage: `linear-gradient(100deg, ${teamTint(id, 0.58)} 0%, ${teamTint(
                id,
                0.2,
              )} 38%, rgba(74, 7, 18, 0.94) 72%)`,
              borderLeft: `3px solid ${colour}`,
            }}
          >
            {/* The car sits behind the text, bleeding off the right edge */}
            <CarSilhouette className="pointer-events-none absolute -right-6 bottom-1 h-20 w-auto opacity-25 sm:-right-2 sm:h-28" />

            <div className="relative flex items-center gap-4 px-5 py-5 sm:px-6">
              {/* Position, large on the left. White rather than the team
                  colour, which would vanish into its own gradient. */}
              <span className="font-display text-4xl leading-none font-bold text-chalk/90 tabular-nums sm:text-5xl">
                {String(row.position).padStart(2, '0')}
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-2xl font-bold tracking-wide text-chalk uppercase sm:text-3xl">
                  {row.constructor.name}
                </h3>

                <p className="mt-1 font-mono text-xs tracking-wide text-chalk/70">
                  {ordinal(row.position)} place
                  {row.wins > 0 && ` · ${row.wins} ${row.wins === 1 ? 'win' : 'wins'}`}
                  {followed && <span className="ml-2 font-semibold text-accent">following</span>}
                </p>
              </div>

              <div className="text-right">
                <p className="font-display text-3xl leading-none font-bold text-chalk tabular-nums sm:text-4xl">
                  {row.points}
                </p>
                <p className="mt-1 font-mono text-xs tracking-widest text-muted uppercase">pts</p>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export { ordinal }
