
import { useMemo } from 'react'
function hashString(value) {
  let hash = 0x811c9dc5

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash >>> 0
}

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

  const corners = 10 + Math.floor(random() * 4)
  const points = []

  for (let i = 0; i < corners; i += 1) {
   
    const angle = (i / corners) * Math.PI * 2 + (random() - 0.5) * 0.34

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
