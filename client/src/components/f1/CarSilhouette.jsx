/**
 * A generic open-wheel racing car, side on, facing right.
 *
 * Drawn here rather than loaded as an image for two reasons: it takes its
 * colour from `currentColor`, so one shape serves all ten teams, and being
 * a plain SVG it stays sharp at any size and costs nothing to download.
 *
 * It is an invented, generic shape — the standings cards use it as a tint
 * behind the numbers, not as a picture of the machine that scored them.
 *
 * Proportions are what make it read as a racing car rather than a van:
 * the body sits LOW, around and below the centre line of the wheels, and
 * only the roll hoop rises above them. The tall rear wing at the back and
 * the wide, almost ground-level front wing do the rest. Everything is laid
 * out against a 270 x 100 box where the wheels touch down at y = 98.
 */

export default function CarSilhouette({ className = '' }) {
  return (
    <svg
      viewBox="0 0 270 100"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {/* Rear wing: the plane, high at the back, and its endplate edge-on */}
      <rect x="4" y="30" width="50" height="9" rx="2" />
      <rect x="4" y="28" width="12" height="32" rx="3" />

      {/* Body: diffuser, sidepod, roll hoop, cockpit, nose, floor.
          One continuous path so it reads as a single silhouette. */}
      <path
        d="M30 86
           L30 56
           L66 54
           Q96 52 108 46
           L114 34
           L132 34
           L136 48
           Q152 44 168 52
           L208 62
           L250 74
           L264 80
           L264 86
           Z"
      />

      {/* Halo over the cockpit opening */}
      <path
        d="M136 48 Q152 36 170 50"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Front wing: wide and low, almost on the ground, plus its endplate */}
      <rect x="196" y="86" width="68" height="9" rx="2" />
      <rect x="255" y="72" width="9" height="23" rx="2" />

      {/* Wheels, sitting on y = 98. The darker inner circle reads as the rim. */}
      <circle cx="66" cy="74" r="24" />
      <circle cx="66" cy="74" r="9" fill="#3b010b" opacity="0.45" />
      <circle cx="214" cy="74" r="24" />
      <circle cx="214" cy="74" r="9" fill="#3b010b" opacity="0.45" />
    </svg>
  )
}
