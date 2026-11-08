/**
 * Another fan's public profile: their favourites and their posts.
 */

import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import { Loading, ErrorState, EmptyState, Avatar, Tag, SectionHeading, SkeletonList } from '../components/ui'
import PostCard from '../components/social/PostCard'
import {
  loadPublicProfile,
  followUser,
  selectViewedProfile,
  selectViewedStatus,
  selectViewedError,
  selectMyProfile,
} from '../store/slices/profileSlice'
import { loadPosts, selectPosts, selectPostsStatus } from '../store/slices/socialSlice'
import { selectUser } from '../store/slices/authSlice'
import { ERA_BY_ID } from '../utils/teams'
import { formatRaceDate, pluralise } from '../utils/format'

function FavouriteList({ title, items, transform = (v) => v.replace(/_/g, ' ') }) {
  if (!items?.length) return null

  return (
    <div>
      <p className="eyebrow mb-2">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className="chip text-xs capitalize">
            {transform(item)}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function FanProfile() {
  const { username } = useParams()
  const dispatch = useDispatch()

  const profile = useSelector(selectViewedProfile)
  const status = useSelector(selectViewedStatus)
  const error = useSelector(selectViewedError)
  const myProfile = useSelector(selectMyProfile)
  const user = useSelector(selectUser)

  const posts = useSelector(selectPosts)
  const postsStatus = useSelector(selectPostsStatus)

  useEffect(() => {
    dispatch(loadPublicProfile(username))
  }, [dispatch, username])

  useEffect(() => {
    if (profile?.id) dispatch(loadPosts({ authorId: profile.id }))
  }, [dispatch, profile?.id])

  if (status === 'loading') return <Loading label="Loading profile…" />

  if (status === 'failed') {
    return (
      <div className="shell py-10">
        <ErrorState title="Fan not found" message={error} />
        <p className="mt-5">
          <Link to="/fans" className="text-accent hover:underline">
            ← All fans
          </Link>
        </p>
      </div>
    )
  }

  if (!profile) return null

  const isMe = user?.id === profile.id
  const isFollowing = myProfile?.following?.includes(profile.id) ?? false

  return (
    <div className="shell py-10">
      <Link to="/fans" className="mb-5 inline-block text-sm text-muted hover:text-accent">
        ← All fans
      </Link>

      <header className="card mb-8 p-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar name={profile.displayName ?? profile.username} size="xl" />

          <div className="min-w-0 flex-1">
            <h1 className="text-3xl">{profile.displayName ?? profile.username}</h1>
            <p className="mb-2 text-sm text-dim">@{profile.username}</p>
            {profile.bio && <p className="max-w-2xl text-muted">{profile.bio}</p>}

            <p className="mt-3 text-xs text-dim">
              Joined {formatRaceDate(profile.createdAt?.slice(0, 10))} ·{' '}
              {pluralise(profile.following?.length ?? 0, 'fan')} followed
            </p>
          </div>

          {user && !isMe && (
            <button
              className={`btn ${isFollowing ? 'btn-ghost' : 'btn-primary'}`}
              onClick={() => dispatch(followUser({ viewerId: user.id, targetId: profile.id }))}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}

          {isMe && (
            <Link to="/profile" className="btn btn-ghost">
              Edit profile
            </Link>
          )}
        </div>

        <div className="mt-6 grid gap-5 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <FavouriteList title="Drivers" items={profile.favouriteDrivers} />
          <FavouriteList title="Teams" items={profile.favouriteTeams} />
          <FavouriteList title="Circuits" items={profile.favouriteCircuits} />
          <FavouriteList
            title="Eras"
            items={profile.favouriteEras}
            transform={(id) => ERA_BY_ID[id]?.label ?? id}
          />
        </div>
      </header>

      <SectionHeading eyebrow="Activity" title="Posts" />

      {postsStatus === 'loading' ? (
        <SkeletonList rows={2} />
      ) : posts.length ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <EmptyState title="No posts yet" message="This fan has not posted anything." icon="◌" />
      )}
    </div>
  )
}
