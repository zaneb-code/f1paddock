/**
 * The shared UI kit.
 *
 * Everything small and reusable lives in this one file so imports stay
 * short: one import line gives a page its buttons, cards and states.
 * Anything bigger than ~40 lines, or specific to one feature, gets its
 * own file in f1/, social/ or predictions/.
 */

import { Link } from 'react-router-dom'
import { avatarHue, initials } from '../../utils/format'

/* ------------------------------------------------------------------
 *  Loading
 * ------------------------------------------------------------------ */

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <span
      className={`${className} inline-block animate-spin rounded-full border-2 border-surface-3 border-t-accent`}
      aria-hidden="true"
    />
  )
}

export function Loading({ label = 'Loading…', className = 'py-16' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status">
      <Spinner className="h-8 w-8" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  )
}

/** Grey placeholder blocks shaped roughly like the content that is coming. */
export function SkeletonList({ rows = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="skeleton mb-3 h-3 w-24" />
          <div className="skeleton mb-2 h-5 w-3/4" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonGrid({ count = 6, className = '' }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="skeleton mb-3 h-3 w-20" />
          <div className="skeleton mb-2 h-6 w-4/5" />
          <div className="skeleton h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------
 *  States
 * ------------------------------------------------------------------ */

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="card border-l-2 border-l-stop p-6" role="alert">
      <h3 className="mb-1 text-lg text-chalk">{title}</h3>
      <p className="mb-4 text-sm text-muted">{message || 'Please try again in a moment.'}</p>
      {onRetry && (
        <button type="button" className="btn btn-sm btn-ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, message, action, icon = '—' }) {
  return (
    <div className="card flex flex-col items-center gap-3 border-dashed px-6 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-2xl text-dim">
        {icon}
      </div>
      <h3 className="text-xl text-chalk">{title}</h3>
      {message && <p className="max-w-sm text-sm text-muted">{message}</p>}
      {action}
    </div>
  )
}

export function Notice({ tone = 'info', children, onDismiss }) {
  const tones = {
    info: 'border-l-flag',
    success: 'border-l-go',
    error: 'border-l-stop',
  }

  return (
    <div
      className={`card flex items-start gap-3 border-l-2 ${tones[tone]} px-4 py-3 text-sm`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <p className="flex-1 text-muted">{children}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-dim transition-colors hover:text-chalk"
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------
 *  Small pieces
 * ------------------------------------------------------------------ */

export function Avatar({ name = '', size = 'md', className = '' }) {
  const hue = avatarHue(name)
  const sizes = {
    xs: 'h-7 w-7 text-[0.6rem]',
    sm: 'h-9 w-9 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-20 w-20 text-2xl',
  }

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-display font-bold text-ink ${sizes[size]} ${className}`}
      style={{ background: `linear-gradient(140deg, hsl(${hue} 70% 62%), hsl(${(hue + 50) % 360} 70% 48%))` }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

export function Tag({ tone = 'neutral', children, className = '' }) {
  const tones = {
    neutral: 'bg-surface-3 text-muted',
    accent: 'bg-accent/15 text-accent-soft',
    flag: 'bg-flag/15 text-flag',
    go: 'bg-go/15 text-go',
    stop: 'bg-stop/15 text-stop',
  }

  return <span className={`tag ${tones[tone]} ${className}`}>{children}</span>
}

export function SectionHeading({ eyebrow, title, action, className = '' }) {
  return (
    <div className={`mb-5 flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="text-2xl sm:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function PageHeading({ eyebrow, title, subtitle, action }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function Field({ label, htmlFor, error, hint, children }) {
  return (
    <div className="mb-4">
      {label && (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {error && <span className="field-error">{error}</span>}
      {hint && !error && <span className="mt-1.5 block text-xs text-dim">{hint}</span>}
    </div>
  )
}

export function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div
      className={`inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 rounded-full px-4 py-2 font-display text-sm font-semibold tracking-wide whitespace-nowrap uppercase transition-colors ${
            active === tab.id ? 'bg-accent text-white' : 'text-muted hover:text-chalk'
          }`}
        >
          {tab.label}
          {tab.count != null && (
            <span
              className={`rounded-full px-1.5 text-[0.65rem] ${
                active === tab.id ? 'bg-black/25' : 'bg-surface-3'
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/** A card that is entirely a link. */
export function LinkCard({ to, children, className = '' }) {
  return (
    <Link to={to} className={`card card-hover block ${className}`}>
      {children}
    </Link>
  )
}

export function Stat({ label, value, tone = 'chalk' }) {
  const tones = { chalk: 'text-chalk', accent: 'text-accent', flag: 'text-flag', go: 'text-go' }

  return (
    <div className="card px-4 py-3 text-center">
      <p className={`font-display text-2xl font-bold ${tones[tone]}`}>{value}</p>
      <p className="eyebrow mt-0.5">{label}</p>
    </div>
  )
}

/** Simple centred modal. Closes on backdrop click or Escape. */
export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="presentation"
    >
      <div
        className="card w-full max-w-lg p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-2xl">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-dim transition-colors hover:text-chalk"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  )
}
