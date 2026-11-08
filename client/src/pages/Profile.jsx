/**
 * Your own profile — the "personalised F1 profile" and "select favourite
 * drivers, teams, circuits and eras" requirements.
 *
 * Favourites are edited by tapping chips built from live API data, so the
 * driver and team lists are always this season's real grid rather than a
 * hardcoded list that goes stale.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import {
  PageHeading,
  Loading,
  Notice,
  SectionHeading,
  Field,
  Avatar,
  Stat,
  Tabs,
} from '../components/ui'
import { DriverChip, TeamChip } from '../components/f1/DriverChip'
import { F1_ERAS } from '../utils/teams'

import { selectUser } from '../store/slices/authSlice'
import {
  loadMyProfile,
  saveProfile,
  clearProfileMessages,
  selectMyProfile,
  selectMyProfileStatus,
  selectProfileError,
  selectProfileNotice,
} from '../store/slices/profileSlice'
import {
  fetchGrid,
  fetchStandings,
  selectDrivers,
  selectConstructors,
  selectCircuits,
  selectGridStatus,
  selectDriverStandings,
  selectStandingsStatus,
  selectSeason,
} from '../store/slices/f1Slice'
import {
  loadMyPredictions,
  selectMyPredictions,
  selectMyTotalPoints,
} from '../store/slices/predictionsSlice'

const FAV_TABS = [
  { id: 'drivers', label: 'Drivers' },
  { id: 'teams', label: 'Teams' },
  { id: 'circuits', label: 'Circuits' },
  { id: 'eras', label: 'Eras' },
]

export default function Profile() {
  const dispatch = useDispatch()

  const user = useSelector(selectUser)
  const profile = useSelector(selectMyProfile)
  const profileStatus = useSelector(selectMyProfileStatus)
  const error = useSelector(selectProfileError)
  const notice = useSelector(selectProfileNotice)

  const season = useSelector(selectSeason)
  const drivers = useSelector(selectDrivers)
  const constructors = useSelector(selectConstructors)
  const circuits = useSelector(selectCircuits)
  const gridStatus = useSelector(selectGridStatus)
  const standings = useSelector(selectDriverStandings)
  const standingsStatus = useSelector(selectStandingsStatus)

  const predictions = useSelector(selectMyPredictions)
  const totalPoints = useSelector(selectMyTotalPoints)

  const [tab, setTab] = useState('drivers')
  const [details, setDetails] = useState({ displayName: '', bio: '' })
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (user && profileStatus === 'idle') dispatch(loadMyProfile(user))
    if (gridStatus === 'idle') dispatch(fetchGrid(season))
    if (standingsStatus === 'idle') dispatch(fetchStandings(season))
    if (user) dispatch(loadMyPredictions(user.id))
  }, [dispatch, user, profileStatus, gridStatus, standingsStatus, season])

  // Fill the form once the profile arrives.
  useEffect(() => {
    if (profile) {
      setDetails({ displayName: profile.displayName ?? '', bio: profile.bio ?? '' })
    }
  }, [profile])

  if (!user) return null
  if (profileStatus === 'loading' || !profile) return <Loading label="Loading your profile…" />

  /** Adds or removes one id from a favourites list and saves immediately. */
  function toggleFavourite(key, id) {
    const current = profile[key] ?? []
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    dispatch(saveProfile({ userId: user.id, patch: { [key]: next } }))
  }

  function handleDetailsSubmit(event) {
    event.preventDefault()
    dispatch(saveProfile({ userId: user.id, patch: details }))
    setDirty(false)
  }

  // Map each driver to their team so chips get the right colour. The
  // standings carry that link; the plain driver list does not.
  const teamOf = Object.fromEntries(
    standings.map((row) => [row.driver.driverId, row.constructor.id])
  )

  const favCount =
    (profile.favouriteDrivers?.length ?? 0) +
    (profile.favouriteTeams?.length ?? 0) +
    (profile.favouriteCircuits?.length ?? 0) +
    (profile.favouriteEras?.length ?? 0)

  return (
    <div className="shell py-10">
      <PageHeading
        eyebrow="Your paddock pass"
        title="Profile"
        subtitle="Your favourites drive the fan matching, highlight your drivers in the standings, and personalise your dashboard."
        action={
          <Link to={`/fans/${profile.username}`} className="btn btn-sm btn-ghost">
            View public profile →
          </Link>
        }
      />

      {(error || notice) && (
        <div className="mb-5">
          <Notice
            tone={error ? 'error' : 'success'}
            onDismiss={() => dispatch(clearProfileMessages())}
          >
            {error ?? notice}
          </Notice>
        </div>
      )}

      <div className="mb-8 grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* ---------------- Identity ---------------- */}
        <aside className="space-y-4">
          <div className="card p-6 text-center">
            <Avatar name={details.displayName || user.username} size="xl" className="mx-auto mb-3" />
            <h2 className="text-2xl">{details.displayName || user.username}</h2>
            <p className="text-sm text-dim">@{profile.username}</p>
            <p className="mt-1 text-xs text-dim">{user.email}</p>
            {user.emailVerified && (
              <span className="mt-3 inline-block rounded-full bg-go/15 px-3 py-1 text-xs font-semibold text-go">
                Email verified
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Stat label="Favourites" value={favCount} />
            <Stat label="Picks" value={predictions.length} />
            <Stat label="Points" value={totalPoints} tone="accent" />
          </div>
        </aside>

        {/* ---------------- Details form ---------------- */}
        <form onSubmit={handleDetailsSubmit} className="card p-6">
          <h2 className="mb-4 text-2xl">About you</h2>

          <Field label="Display name" htmlFor="displayName">
            <input
              id="displayName"
              className="input"
              value={details.displayName}
              maxLength={40}
              onChange={(e) => {
                setDetails({ ...details, displayName: e.target.value })
                setDirty(true)
              }}
            />
          </Field>

          <Field label="Bio" htmlFor="bio" hint="A sentence or two. Shown on your public profile.">
            <textarea
              id="bio"
              className="input min-h-[96px] resize-y"
              placeholder="Strategy nerd. I will defend a two-stop to my last breath."
              value={details.bio}
              maxLength={200}
              onChange={(e) => {
                setDetails({ ...details, bio: e.target.value })
                setDirty(true)
              }}
            />
          </Field>

          <button type="submit" className="btn btn-primary" disabled={!dirty}>
            Save changes
          </button>
        </form>
      </div>

      {/* ---------------- Favourites ---------------- */}
      <section>
        <SectionHeading
          eyebrow="What you follow"
          title="Favourites"
          action={<span className="meta">Tap to add or remove</span>}
        />

        <Tabs tabs={FAV_TABS} active={tab} onChange={setTab} className="mb-5" />

        {gridStatus === 'loading' ? (
          <Loading label="Loading the grid…" />
        ) : (
          <div className="card p-5">
            {tab === 'drivers' && (
              <div className="flex flex-wrap gap-2">
                {drivers.map((driver) => (
                  <DriverChip
                    key={driver.driverId}
                    driver={driver}
                    constructorId={teamOf[driver.driverId]}
                    selected={profile.favouriteDrivers?.includes(driver.driverId)}
                    onClick={() => toggleFavourite('favouriteDrivers', driver.driverId)}
                  />
                ))}
              </div>
            )}

            {tab === 'teams' && (
              <div className="flex flex-wrap gap-2">
                {constructors.map((team) => (
                  <TeamChip
                    key={team.id}
                    team={team}
                    selected={profile.favouriteTeams?.includes(team.id)}
                    onClick={() => toggleFavourite('favouriteTeams', team.id)}
                  />
                ))}
              </div>
            )}

            {tab === 'circuits' && (
              <div className="flex flex-wrap gap-2">
                {circuits.map((circuit) => (
                  <button
                    key={circuit.id}
                    type="button"
                    onClick={() => toggleFavourite('favouriteCircuits', circuit.id)}
                    className={`chip ${
                      profile.favouriteCircuits?.includes(circuit.id) ? 'chip-on' : ''
                    }`}
                    aria-pressed={profile.favouriteCircuits?.includes(circuit.id)}
                  >
                    {circuit.name}
                    <span className="text-dim">{circuit.country}</span>
                  </button>
                ))}
              </div>
            )}

            {tab === 'eras' && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {F1_ERAS.map((era) => {
                  const on = profile.favouriteEras?.includes(era.id)

                  return (
                    <button
                      key={era.id}
                      type="button"
                      onClick={() => toggleFavourite('favouriteEras', era.id)}
                      className={`rounded-xl border px-4 py-3 text-left transition-all ${
                        on
                          ? 'border-accent bg-accent/10'
                          : 'border-line bg-surface-2 hover:border-line-strong'
                      }`}
                      aria-pressed={on}
                    >
                      <span className={`block font-display font-semibold ${on ? 'text-accent-soft' : 'text-chalk'}`}>
                        {era.label}
                      </span>
                      <span className="text-xs text-dim">{era.blurb}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
