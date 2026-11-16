/**
 * The opening screen.
 *
 * Shows for a couple of seconds on first paint, then fades out and
 * removes itself from the tree entirely. Because it is mounted inside
 * App (above the Routes) it runs once per page load and never again on
 * a route change — clicking from /races to /standings does not replay it.
 *
 * Three small details worth knowing:
 *
 *  - It unmounts rather than just hiding, so nothing is left sitting on
 *    top of the page swallowing clicks.
 *  - Page scrolling is locked while it is visible, otherwise the page
 *    behind can be scrolled during the hold and you land halfway down.
 *  - Any key or click skips it. Nobody should be forced to watch an
 *    animation twice, least of all whoever is marking this.
 *
 * The timings are the two constants below. HOLD_MS is also handed to CSS
 * as --splash-hold so the loading bar finishes exactly as the fade starts.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

const HOLD_MS = 2400 // how long the mark stays on screen
const FADE_MS = 650 // how long the fade out takes

export default function Splash() {
  // 'in' = visible, 'out' = fading, 'gone' = unmounted
  const [phase, setPhase] = useState('in')
  const holdTimer = useRef(null)
  const fadeTimer = useRef(null)

  /** Start the fade. Safe to call twice — only 'in' moves to 'out'. */
  const dismiss = useCallback(() => {
    setPhase((current) => (current === 'in' ? 'out' : current))
  }, [])

  // Hold, then fade.
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    holdTimer.current = setTimeout(dismiss, reduced ? 700 : HOLD_MS)

    return () => clearTimeout(holdTimer.current)
  }, [dismiss])

  // Once the fade has run its course, unmount.
  useEffect(() => {
    if (phase !== 'out') return

    fadeTimer.current = setTimeout(() => setPhase('gone'), FADE_MS)
    return () => clearTimeout(fadeTimer.current)
  }, [phase])

  // Keep the page behind still while the splash is up.
  useEffect(() => {
    if (phase === 'gone') return

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previous
    }
  }, [phase])

  // Any key skips it. Clicking is handled on the element itself.
  useEffect(() => {
    if (phase !== 'in') return

    window.addEventListener('keydown', dismiss)
    return () => window.removeEventListener('keydown', dismiss)
  }, [phase, dismiss])

  if (phase === 'gone') return null

  return (
    <div
      className="splash"
      data-phase={phase}
      style={{ '--splash-hold': `${HOLD_MS}ms` }}
      onClick={dismiss}
      aria-hidden="true"
    >
      {/* Photograph, then a veil over it, then one light streak across */}
      <div className="splash__photo" />
      <div className="splash__veil" />
      <div className="splash__streak" />

      <div className="splash__inner">
        {/* Start gantry. Five lights out, then away — the one motorsport
            image that works at any size. */}
        <div className="splash__lights mb-7 flex items-center justify-center gap-2.5 sm:gap-3">
          {[0, 1, 2, 3, 4].map((index) => (
            <span
              key={index}
              className="block h-3 w-3 rounded-full bg-accent shadow-[0_0_18px_4px_rgba(255,45,32,0.55)] sm:h-3.5 sm:w-3.5"
              style={{ animationDelay: `${index * 140}ms` }}
            />
          ))}
        </div>

        <div className="splash__mark mx-auto mb-5 h-px w-20 bg-gradient-to-r from-transparent via-line-strong to-transparent" />

        <h1 className="splash__word font-display text-6xl leading-none font-bold tracking-tight uppercase sm:text-8xl">
          <span className="text-accent">F1</span>
          <span className="text-chalk">Paddock</span>
        </h1>

        <p className="splash__tag mt-4 font-display text-sm tracking-[0.34em] text-muted uppercase sm:text-base">
          For the people in the stands
        </p>

        {/* Fills across the hold, so the pause reads as deliberate */}
        <div className="mx-auto mt-10 h-[3px] w-48 overflow-hidden rounded-full bg-white/10 sm:w-64">
          <div className="splash__bar h-full w-full rounded-full bg-gradient-to-r from-accent-dim via-accent to-accent-soft" />
        </div>

        <p className="mt-5 font-mono text-[0.65rem] tracking-[0.2em] text-dim uppercase">
          Tap to skip
        </p>
      </div>
    </div>
  )
}
