/**
 * Live countdown to a session.
 *
 * The interval is cleaned up when the component unmounts or the target
 * changes — without that, navigating away would leave a timer running and
 * calling setState on a component that no longer exists.
 */

import { useEffect, useState } from 'react'
import { countdownTo } from '../../utils/format'

function Unit({ value, label }) {
  return (
    <div className="text-center">
      <p className="font-display text-3xl font-bold text-chalk tabular-nums sm:text-4xl">
        {String(value).padStart(2, '0')}
      </p>
      <p className="eyebrow mt-0.5">{label}</p>
    </div>
  )
}

export default function Countdown({ target, label = 'Lights out in' }) {
  const [remaining, setRemaining] = useState(() => countdownTo(target))

  useEffect(() => {
    setRemaining(countdownTo(target))

    const id = setInterval(() => setRemaining(countdownTo(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  if (!remaining) {
    return (
      <div className="text-center">
        <p className="eyebrow mb-1">{label}</p>
        <p className="font-display text-2xl text-accent">Session underway or complete</p>
      </div>
    )
  }

  return (
    <div>
      <p className="eyebrow mb-2 text-center">{label}</p>
      <div className="flex items-start justify-center gap-4 sm:gap-6">
        <Unit value={remaining.days} label="days" />
        <span className="font-display text-2xl text-line-strong sm:text-3xl">:</span>
        <Unit value={remaining.hours} label="hrs" />
        <span className="font-display text-2xl text-line-strong sm:text-3xl">:</span>
        <Unit value={remaining.minutes} label="min" />
        <span className="font-display text-2xl text-line-strong sm:text-3xl">:</span>
        <Unit value={remaining.seconds} label="sec" />
      </div>
    </div>
  )
}
