/**
 * Team colours and era definitions.
 *
 * The colours are approximations of each team's livery, used only to tint
 * chips and borders so the grid is scannable at a glance. They are decoration,
 * not data from the API — anything the API actually knows (names, ids) comes
 * from Jolpica.
 */

export const TEAM_COLOURS = {
  mercedes: '#27F4D2',
  ferrari: '#E8002D',
  red_bull: '#3671C6',
  mclaren: '#FF8000',
  aston_martin: '#229971',
  alpine: '#FF87BC',
  williams: '#64C4FF',
  rb: '#6692FF',
  haas: '#B6BABD',
  audi: '#BB0A30',
  cadillac: '#D4AF37',
  sauber: '#52E252',
  alphatauri: '#5E8FAA',
  alfa: '#C92D4B',
}

const FALLBACK = '#8A8A99'

export function teamColour(constructorId) {
  if (!constructorId) return FALLBACK
  return TEAM_COLOURS[constructorId] ?? FALLBACK
}

/** A translucent version of the team colour, for backgrounds. */
export function teamTint(constructorId, alpha = 0.14) {
  const hex = teamColour(constructorId).replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * F1 eras, offered as a profile preference. These are the commonly used
 * fan groupings rather than anything official.
 */
export const F1_ERAS = [
  { id: 'pre-1980', label: 'Pre-1980', blurb: 'Fangio to Lauda' },
  { id: 'turbo-80s', label: '1980s Turbo', blurb: 'Senna, Prost, Piquet' },
  { id: 'nineties', label: '1990s', blurb: 'Schumacher and Williams' },
  { id: 'v10-era', label: 'V10 Era', blurb: '2000-2005 Ferrari dominance' },
  { id: 'v8-era', label: 'V8 Era', blurb: '2006-2013, Vettel and Alonso' },
  { id: 'hybrid', label: 'Hybrid Era', blurb: '2014-2021 Mercedes years' },
  { id: 'ground-effect', label: 'Ground Effect', blurb: '2022 onward' },
]

export const ERA_BY_ID = Object.fromEntries(F1_ERAS.map((era) => [era.id, era]))
