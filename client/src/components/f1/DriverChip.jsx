/**
 * A driver or team rendered as a small chip, tinted with the team colour.
 * Used in standings, prediction pickers and profile favourites.
 */

import { teamColour, teamTint } from '../../utils/teams'

export function DriverChip({ driver, constructorId, selected = false, onClick, size = 'md' }) {
  const colour = teamColour(constructorId)
  const interactive = typeof onClick === 'function'

  const sizes = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-sm gap-2',
  }

  const Element = interactive ? 'button' : 'span'

  return (
    <Element
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      className={`inline-flex items-center rounded-full border font-medium transition-all ${sizes[size]} ${
        selected
          ? 'border-transparent text-chalk'
          : 'border-line bg-surface-2 text-muted hover:border-line-strong hover:text-chalk'
      } ${interactive ? 'cursor-pointer' : ''}`}
      style={selected ? { backgroundColor: teamTint(constructorId, 0.25), borderColor: colour } : undefined}
      aria-pressed={interactive ? selected : undefined}
    >
      <span className="h-3.5 w-1 rounded-full" style={{ backgroundColor: colour }} aria-hidden="true" />
      {driver.code && <span className="font-mono text-[0.7rem] text-dim">{driver.code}</span>}
      <span>{driver.fullName ?? `${driver.givenName} ${driver.familyName}`}</span>
    </Element>
  )
}

export function TeamChip({ team, selected = false, onClick, size = 'md' }) {
  const colour = teamColour(team.id)
  const interactive = typeof onClick === 'function'

  const sizes = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-sm gap-2',
  }

  const Element = interactive ? 'button' : 'span'

  return (
    <Element
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      className={`inline-flex items-center rounded-full border font-medium transition-all ${sizes[size]} ${
        selected
          ? 'border-transparent text-chalk'
          : 'border-line bg-surface-2 text-muted hover:border-line-strong hover:text-chalk'
      } ${interactive ? 'cursor-pointer' : ''}`}
      style={selected ? { backgroundColor: teamTint(team.id, 0.25), borderColor: colour } : undefined}
      aria-pressed={interactive ? selected : undefined}
    >
      <span className="h-3.5 w-1 rounded-full" style={{ backgroundColor: colour }} aria-hidden="true" />
      {team.name}
    </Element>
  )
}
