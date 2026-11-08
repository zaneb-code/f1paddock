/**
 * Discover fans — the "find fans with similar F1 interests" requirement.
 *
 * Two modes: a ranked list of people who share your favourites, and a plain
 * searchable directory of everyone.
 */

import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import { PageHeading, Loading, EmptyState, Tabs, Notice } from '../components/ui'
import { FanCard } from '../components/social/Cards'
import {
  loadFans,
  loadSimilarFans,
  followUser,
  selectFans,
  selectFansStatus,
  selectSimilarFans,
  selectSimilarStatus,
  selectMyProfile,
} from '../store/slices/profileSlice'
import { selectUser } from '../store/slices/authSlice'

export default function Fans() {
  const dispatch = useDispatch()

  const user = useSelector(selectUser)
  const profile = useSelector(selectMyProfile)
  const fans = useSelector(selectFans)
  const fansStatus = useSelector(selectFansStatus)
  const similar = useSelector(selectSimilarFans)
  const similarStatus = useSelector(selectSimilarStatus)

  const [tab, setTab] = useState(user ? 'similar' : 'all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (fansStatus === 'idle') dispatch(loadFans())
  }, [dispatch, fansStatus])

  useEffect(() => {
    if (user) dispatch(loadSimilarFans(user.id))
  }, [dispatch, user])

  const directory = useMemo(() => {
    let list = fans.filter((p) => p.id !== user?.id)

    if (query.trim()) {
      const needle = query.toLowerCase()
      list = list.filter(
        (p) =>
          p.username.toLowerCase().includes(needle) ||
          (p.displayName ?? '').toLowerCase().includes(needle) ||
          (p.bio ?? '').toLowerCase().includes(needle)
      )
    }

    return list
  }, [fans, query, user])

  const hasFavourites =
    (profile?.favouriteDrivers?.length ?? 0) +
      (profile?.favouriteTeams?.length ?? 0) +
      (profile?.favouriteCircuits?.length ?? 0) +
      (profile?.favouriteEras?.length ?? 0) >
    0

  return (
    <div className="shell py-10">
      <PageHeading
        eyebrow="The grid is full of us"
        title="Find fans"
        subtitle="Matched on the drivers, teams, circuits and eras you picked on your profile."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Tabs
          tabs={[
            ...(user ? [{ id: 'similar', label: 'Similar to you', count: similar.length }] : []),
            { id: 'all', label: 'Everyone', count: fans.length },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'all' && (
          <input
            type="search"
            className="input max-w-xs"
            placeholder="Search fans…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search fans"
          />
        )}
      </div>

      {/* ---------------- Similar ---------------- */}
      {tab === 'similar' && (
        <>
          {!user ? (
            <EmptyState
              title="Log in to see matches"
              message="Matching uses the favourites on your profile."
              icon="◎"
              action={
                <Link to="/login" className="btn btn-sm btn-primary">
                  Log in
                </Link>
              }
            />
          ) : !hasFavourites ? (
            <div className="mb-6">
              <Notice tone="info">
                Pick some favourite drivers, teams, circuits and eras on{' '}
                <Link to="/profile" className="text-accent hover:underline">
                  your profile
                </Link>{' '}
                and we can match you with fans who share them.
              </Notice>
            </div>
          ) : similarStatus === 'loading' ? (
            <Loading label="Finding your people…" />
          ) : similar.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((row) => (
                <FanCard
                  key={row.profile.id}
                  profile={row.profile}
                  score={row.score}
                  shared={row.shared}
                  isFollowing={row.isFollowing}
                  canFollow
                  onToggleFollow={() =>
                    dispatch(followUser({ viewerId: user.id, targetId: row.profile.id }))
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No matches yet"
              message="Nobody shares your favourites so far. Try adding a few more on your profile."
              icon="◎"
              action={
                <Link to="/profile" className="btn btn-sm btn-primary">
                  Edit favourites
                </Link>
              }
            />
          )}
        </>
      )}

      {/* ---------------- Directory ---------------- */}
      {tab === 'all' && (
        <>
          {fansStatus === 'loading' ? (
            <Loading label="Loading fans…" />
          ) : directory.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {directory.map((fan) => (
                <FanCard
                  key={fan.id}
                  profile={fan}
                  canFollow={Boolean(user)}
                  isFollowing={profile?.following?.includes(fan.id) ?? false}
                  onToggleFollow={() =>
                    dispatch(followUser({ viewerId: user.id, targetId: fan.id }))
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No fans match" message="Try a different search." icon="◎" />
          )}
        </>
      )}
    </div>
  )
}
