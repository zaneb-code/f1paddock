/**
 * A track-shaped outline for a circuit card.
 *
 * IMPORTANT, and worth saying out loud because the cards look convincing:
 * these are NOT real circuit maps. The F1 API gives us a circuit's name and
 * its latitude and longitude, and nothing at all about the shape of the
 * track, so there is no honest way to draw the real layout from our data.
 *
 * What this does instead is generate a closed loop from the circuit's id.
 * The id is hashed into a seed, the seed drives a small random number
 * generator, and that produces a ring of points at varying distances from
 * the centre which are then joined with a smooth curve. The result is:
 *
 *   - stable: the same circuit always gets the same shape, on every render
 *     and on every machine, because nothing here depends on Math.random()
 *   - distinct: two circuits practically never collide
 *   - decorative: it tells you "this is a track", not "this is Monza"
 *
 * If real layouts are ever wanted, they would have to come in as SVG path
 * data from a separate source and be looked up by circuit id. The component
 * interface below would not need to change.
 */

import { useMemo } from 'react'

/** FNV-1a. Any string in, one stable 32-bit number out. */
function hashString(value) {
  let hash = 0x811c9dc5

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash >>> 0
}

/**
 * mulberry32 — a tiny seeded generator. Same seed, same sequence, always.
 * Returns a function you call for each number, like Math.random().
 */
function seededRandom(seed) {
  let state = seed >>> 0

  return function next() {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Joins points into a smooth closed curve.
 *
 * Catmull-Rom converted to cubic beziers: for each pair of points, the two
 * control points are derived from the neighbours on either side, which is
 * what makes the curve pass through every point instead of near it. The
 * modulo arithmetic wraps the ends round so the loop closes cleanly rather
 * than having a corner at the start.
 */
function smoothClosedPath(points) {
  const n = points.length
  const round = (value) => Math.round(value * 100) / 100

  let d = `M ${round(points[0].x)} ${round(points[0].y)}`

  for (let i = 0; i < n; i += 1) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]

    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6

    d += ` C ${round(c1x)} ${round(c1y)}, ${round(c2x)} ${round(c2y)}, ${round(p2.x)} ${round(p2.y)}`
  }

  return `${d} Z`
}

const WIDTH = 160
const HEIGHT = 100

function buildTrack(seed) {
  const random = seededRandom(seed)

  const cx = WIDTH / 2
  const cy = HEIGHT / 2
  const rx = WIDTH * 0.38
  const ry = HEIGHT * 0.36

  // Ten to thirteen corners. Fewer reads as a blob, more as a scribble.
  const corners = 10 + Math.floor(random() * 4)
  const points = []

  for (let i = 0; i < corners; i += 1) {
    // Spread evenly round the circle, then nudge each one so the spacing
    // is uneven the way a real lap is.
    const angle = (i / corners) * Math.PI * 2 + (random() - 0.5) * 0.34

    // How far out this corner sits. The spread is what turns a circle into
    // something with hairpins and long straights. The floor matters: let a
    // corner come much closer to the centre than this and the loop pinches
    // shut, which reads as a blob once the card shrinks.
    const reach = 0.6 + random() * 0.4

    points.push({
      x: cx + Math.cos(angle) * rx * reach,
      y: cy + Math.sin(angle) * ry * reach,
    })
  }

  return {
    path: smoothClosedPath(points),
    start: points[0],
  }
}

export default function CircuitOutline({
  id = 'circuit',
  className = '',
  strokeWidth = 3,
  showStart = true,
}) {
  // Recomputed only when the id changes, so scrolling the calendar does not
  // rebuild two dozen paths on every render.
  const { path, start } = useMemo(() => buildTrack(hashString(String(id))), [id])

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={className}
      fill="none"
      role="img"
      aria-label="Stylised circuit outline"
    >
      {/* A soft wider copy underneath gives the line its glow */}
      <path
        d={path}
        stroke="currentColor"
        strokeWidth={strokeWidth * 2.6}
        strokeLinejoin="round"
        opacity="0.14"
      />
      <path
        d={path}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Start / finish marker */}
      {showStart && (
        <circle cx={start.x} cy={start.y} r={strokeWidth * 1.5} fill="currentColor" opacity="0.9" />
      )}
    </svg>
  )
}
