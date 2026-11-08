/**
 * The prediction feature: the human form, the AI panel, and the comparison
 * between them.
 *
 * The two are kept visually distinct on purpose. The brief's point was that
 * an AI prediction on its own is dull — what makes it interesting is seeing
 * the machine's answer next to your own and deciding whether you agree.
 */

import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { Avatar, Tag, Spinner, EmptyState } from '../ui'
import { DriverChip } from '../f1/DriverChip'
import { teamColour } from '../../utils/teams'
import { timeAgo, ordinal } from '../../utils/format'

import { selectUser } from '../../store/slices/authSlice'
import {
  submitPrediction,
  requestAiPrediction,
  selectAiStatus,
  selectAiError,
  selectAiFor,
  selectAiIsLlm,
  selectAiProvider,
} from '../../store/slices/predictionsSlice'

const SLOTS = ['1st', '2nd', '3rd']

/* ------------------------------------------------------------------
 *  Human prediction form
 * ------------------------------------------------------------------ */

export function PredictionForm({ race, standings, existing, locked }) {
  const dispatch = useDispatch()
  const user = useSelector(selectUser)

  const [podium, setPodium] = useState(existing?.podium ?? [null, null, null])
  const [pole, setPole] = useState(existing?.poleDriverId ?? null)
  const [slot, setSlot] = useState(0)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  // If the saved prediction arrives after this mounted, adopt it.
  useEffect(() => {
    if (existing) {
      setPodium(existing.podium)
      setPole(existing.poleDriverId ?? null)
    }
  }, [existing])

  if (!user) {
    return (
      <EmptyState
        title="Log in to predict"
        message="Predictions are scored against the real result and ranked on the leaderboard."
        icon="◎"
      />
    )
  }

  if (locked) {
    return (
      <div className="card border-l-2 border-l-flag p-5">
        <h3 className="mb-1 text-lg">Predictions closed</h3>
        <p className="text-sm text-muted">
          This race has already started. Pick a future Grand Prix to make a prediction.
        </p>
      </div>
    )
  }

  /** Clicking a driver fills the slot currently being edited. */
  function choose(driverId) {
    setError(null)

    const next = [...podium]

    // If the driver is already somewhere on the podium, move them rather
    // than allowing a duplicate.
    const existingIndex = next.indexOf(driverId)
    if (existingIndex >= 0) next[existingIndex] = null

    next[slot] = driverId
    setPodium(next)

    // Advance to the next empty slot so three clicks fill the podium.
    const nextEmpty = next.findIndex((d) => !d)
    setSlot(nextEmpty === -1 ? slot : nextEmpty)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    if (podium.some((d) => !d)) {
      setError('Pick all three podium positions.')
      return
    }

    setBusy(true)
    const result = await dispatch(
      submitPrediction({
        userId: user.id,
        season: race.season,
        round: race.round,
        raceName: race.raceName,
        podium,
        poleDriverId: pole,
      })
    )
    setBusy(false)

    if (result.meta.requestStatus === 'rejected') {
      setError(result.payload ?? 'Could not save your prediction.')
    }
  }

  const byId = Object.fromEntries(standings.map((s) => [s.driver.driverId, s]))

  return (
    <form onSubmit={handleSubmit} className="card p-5">
      <h3 className="mb-1 text-xl">Your podium</h3>
      <p className="mb-4 text-sm text-muted">
        Tap a position, then pick the driver. 10 points for an exact placing, 4 for the right
        driver in the wrong slot, 5 for pole.
      </p>

      {/* The three slots */}
      <div className="mb-5 grid grid-cols-3 gap-2">
        {SLOTS.map((label, index) => {
          const driverId = podium[index]
          const row = driverId ? byId[driverId] : null

          return (
            <button
              key={label}
              type="button"
              onClick={() => setSlot(index)}
              className={`rounded-xl border-2 px-3 py-3 text-center transition-all ${
                slot === index ? 'border-accent bg-accent/10' : 'border-line bg-surface-2 hover:border-line-strong'
              }`}
            >
              <span className="eyebrow block">{label}</span>
              {row ? (
                <>
                  <span className="mt-1 block truncate text-sm font-semibold text-chalk">
                    {row.driver.familyName}
                  </span>
                  <span
                    className="mx-auto mt-1 block h-1 w-8 rounded-full"
                    style={{ backgroundColor: teamColour(row.constructor.id) }}
                  />
                </>
              ) : (
                <span className="mt-1 block text-sm text-dim">Tap to pick</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Driver picker */}
      <p className="eyebrow mb-2">Choose for {SLOTS[slot]}</p>
      <div className="mb-5 flex flex-wrap gap-2">
        {standings.map((row) => (
          <DriverChip
            key={row.driver.driverId}
            driver={row.driver}
            constructorId={row.constructor.id}
            selected={podium.includes(row.driver.driverId)}
            size="sm"
            onClick={() => choose(row.driver.driverId)}
          />
        ))}
      </div>

      {/* Pole bonus */}
      <p className="eyebrow mb-2">Pole position (optional, +5)</p>
      <select className="input mb-4" value={pole ?? ''} onChange={(e) => setPole(e.target.value || null)}>
        <option value="">No pole prediction</option>
        {standings.map((row) => (
          <option key={row.driver.driverId} value={row.driver.driverId}>
            {row.driver.fullName}
          </option>
        ))}
      </select>

      {error && <p className="field-error mb-3">{error}</p>}

      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? 'Saving…' : existing ? 'Update prediction' : 'Lock it in'}
      </button>

      {existing && (
        <p className="mt-2 text-center text-xs text-dim">
          Submitted {timeAgo(existing.createdAt)} — you can change it until the race starts.
        </p>
      )}
    </form>
  )
}

/* ------------------------------------------------------------------
 *  AI prediction panel
 * ------------------------------------------------------------------ */

export function AiPredictionPanel({ race, standings }) {
  const dispatch = useDispatch()
  const user = useSelector(selectUser)

  const status = useSelector(selectAiStatus)
  const error = useSelector(selectAiError)
  const isLlm = useSelector(selectAiIsLlm)
  const provider = useSelector(selectAiProvider)
  const prediction = useSelector(selectAiFor(String(race.season), String(race.round)))

  const loading = status === 'loading'

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2 px-5 py-3">
        <div>
          <h3 className="text-xl leading-tight">The machine's pick</h3>
          <p className="text-xs text-dim">
            {prediction
              ? prediction.source === 'heuristic'
                ? 'Points-and-form calculation (no LLM configured)'
                : `Generated by ${prediction.model ?? prediction.source}`
              : isLlm
                ? `Will use ${provider}`
                : 'Will use a points-and-form calculation'}
          </p>
        </div>

        <Tag tone={prediction?.source === 'heuristic' || !isLlm ? 'neutral' : 'accent'}>
          {prediction?.source === 'heuristic' || !isLlm ? 'Heuristic' : 'AI'}
        </Tag>
      </div>

      <div className="p-5">
        {!prediction && !loading && (
          <>
            <p className="mb-4 text-sm text-muted">
              Generate a prediction and see how it compares with yours. It is given the
              championship standings and the podiums from the last three rounds.
            </p>
            <button
              type="button"
              className="btn btn-ghost w-full"
              disabled={!user || !standings.length}
              onClick={() => dispatch(requestAiPrediction({ race, standings }))}
            >
              {user ? 'Generate prediction' : 'Log in to generate'}
            </button>
          </>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-3 py-8">
            <Spinner />
            <span className="text-sm text-muted">Thinking about tyre deg…</span>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-stop/40 bg-stop/10 px-4 py-3 text-sm text-stop">
            {error}
          </div>
        )}

        {prediction && !loading && (
          <>
            <ol className="mb-4 space-y-2">
              {prediction.podium.map((entry) => (
                <li
                  key={entry.position}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-3 font-display text-sm font-bold">
                    {entry.position}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-chalk">{entry.driverName}</p>
                    <p className="truncate text-xs text-dim">{entry.constructor}</p>
                  </div>
                  {entry.confidence != null && (
                    <span className="font-mono text-xs text-muted">
                      {Math.round(entry.confidence * 100)}%
                    </span>
                  )}
                </li>
              ))}
            </ol>

            {prediction.rationale && (
              <blockquote className="mb-4 border-l-2 border-line-strong pl-3 text-sm text-muted italic">
                {prediction.rationale}
              </blockquote>
            )}

            {prediction.fallbackFrom && (
              <p className="mb-3 rounded-lg bg-flag/10 px-3 py-2 text-xs text-flag">
                The {prediction.fallbackFrom} provider failed, so this is the fallback
                calculation rather than a model's answer.
              </p>
            )}

            <button
              type="button"
              className="btn btn-sm btn-quiet w-full"
              onClick={() => dispatch(requestAiPrediction({ race, standings }))}
            >
              Regenerate
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
 *  Comparison
 * ------------------------------------------------------------------ */

/** Shows where you and the machine agree and where you differ. */
export function PredictionComparison({ mine, ai, standings }) {
  if (!mine || !ai) return null

  const nameFor = (driverId) =>
    standings.find((s) => s.driver.driverId === driverId)?.driver.fullName ?? driverId

  const rows = SLOTS.map((label, index) => {
    const mineName = nameFor(mine.podium[index])
    const aiName = ai.podium[index]?.driverName ?? '—'
    return { label, mineName, aiName, agree: mineName === aiName }
  })

  const agreements = rows.filter((r) => r.agree).length

  return (
    <div className="card p-5">
      <h3 className="mb-1 text-xl">You vs the machine</h3>
      <p className="mb-4 text-sm text-muted">
        {agreements === 3
          ? 'Identical podiums. Either you are both right or you are both wrong.'
          : agreements === 0
            ? 'Complete disagreement. One of you is going to look clever on Sunday.'
            : `You agree on ${agreements} of 3 positions.`}
      </p>

      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2">
              <th className="px-3 py-2 text-left text-xs tracking-widest text-dim uppercase">Pos</th>
              <th className="px-3 py-2 text-left text-xs tracking-widest text-dim uppercase">You</th>
              <th className="px-3 py-2 text-left text-xs tracking-widest text-dim uppercase">Machine</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-line/60 last:border-0">
                <td className="px-3 py-2.5 font-display font-bold">{row.label}</td>
                <td className="px-3 py-2.5 text-chalk">{row.mineName}</td>
                <td className={`px-3 py-2.5 ${row.agree ? 'text-go' : 'text-flag'}`}>
                  {row.aiName}
                  {row.agree && <span className="ml-1.5 text-xs">match</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
 *  Leaderboard
 * ------------------------------------------------------------------ */

export function LeaderboardTable({ rows, currentUserId }) {
  if (!rows.length) {
    return (
      <EmptyState
        title="No scores yet"
        message="Predictions appear here once a race has run and results have been scored."
        icon="▦"
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-2 text-left">
            <th className="w-16 px-4 py-3 text-xs tracking-widest text-dim uppercase">Rank</th>
            <th className="px-4 py-3 text-xs tracking-widest text-dim uppercase">Fan</th>
            <th className="w-24 px-4 py-3 text-right text-xs tracking-widest text-dim uppercase">Races</th>
            <th className="w-24 px-4 py-3 text-right text-xs tracking-widest text-dim uppercase">Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isMe = row.userId === currentUserId

            return (
              <tr
                key={row.userId}
                className={`border-b border-line/60 last:border-0 ${isMe ? 'bg-accent/5' : ''}`}
              >
                <td className="px-4 py-3">
                  <span
                    className={`font-display text-lg font-bold ${
                      row.rank === 1 ? 'text-flag' : row.rank <= 3 ? 'text-chalk' : 'text-muted'
                    }`}
                  >
                    {ordinal(row.rank)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={row.user?.displayName ?? row.user?.username ?? '?'} size="xs" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-chalk">
                        {row.user?.displayName ?? 'Unknown fan'}
                        {isMe && <span className="ml-2 text-xs text-accent">you</span>}
                      </p>
                      <p className="truncate text-xs text-dim">@{row.user?.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted tabular-nums">{row.scored}</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-chalk tabular-nums">
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
