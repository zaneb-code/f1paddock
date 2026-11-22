
export default function CarSilhouette({ className = '' }) {
  return (
    <svg
      viewBox="0 0 270 100"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {}
      <rect x="4" y="30" width="50" height="9" rx="2" />
      <rect x="4" y="28" width="12" height="32" rx="3" />

      {}
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

      {}
      <rect x="196" y="86" width="68" height="9" rx="2" />
      <rect x="255" y="72" width="9" height="23" rx="2" />

      {}
      <circle cx="66" cy="74" r="24" />
      <circle cx="66" cy="74" r="9" fill="#2b0c0c" opacity="0.45" />
      <circle cx="214" cy="74" r="24" />
      <circle cx="214" cy="74" r="9" fill="#2b0c0c" opacity="0.45" />
    </svg>
  )
}
