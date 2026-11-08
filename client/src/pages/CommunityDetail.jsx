/**
 * One community: its feed, its composer, and a members count.
 */

import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import { Loading, ErrorState, EmptyState, SkeletonList, Tag } from '../components/ui'
import PostCard from '../components/social/PostCard'
import PostComposer from '../components/social/PostComposer'

import {
  loadCommunity,
  loadPosts,
  joinCommunity,
  clearCommunity,
  selectCommunity,
  selectCommunityStatus,
  selectCommunityError,
  selectPosts,
  selectPostsStatus,
} from '../store/slices/socialSlice'
import { selectUser } from '../store/slices/authSlice'
import { pluralise } from '../utils/format'
import { teamColour } from '../utils/teams'

export default function CommunityDetail() {
  const { slug } = useParams()
  const dispatch = useDispatch()

  const community = useSelector(selectCommunity)
  const status = useSelector(selectCommunityStatus)
  const error = useSelector(selectCommunityError)
  const posts = useSelector(selectPosts)
  const postsStatus = useSelector(selectPostsStatus)
  const user = useSelector(selectUser)

  useEffect(() => {
    dispatch(loadCommunity(slug))
    return () => dispatch(clearCommunity())
  }, [dispatch, slug])

  // Posts can only be fetched once we know the community's id.
  useEffect(() => {
    if (community?.id) dispatch(loadPosts({ communityId: community.id }))
  }, [dispatch, community?.id])

  if (status === 'loading') return <Loading label="Loading community…" />

  if (status === 'failed') {
    return (
      <div className="shell py-10">
        <ErrorState title="Community not found" message={error} />
        <p className="mt-5">
          <Link to="/communities" className="text-accent hover:underline">
            ← All communities
          </Link>
        </p>
      </div>
    )
  }

  if (!community) return null

  const isMember = user ? community.memberIds?.includes(user.id) : false
  const accent = community.type === 'team' ? teamColour(community.refId) : '#FF2D20'

  return (
    <div className="shell py-10">
      <Link to="/communities" className="mb-5 inline-block text-sm text-muted hover:text-accent">
        ← All communities
      </Link>

      <header className="card mb-8 overflow-hidden">
        <span className="block h-1.5 w-full" style={{ backgroundColor: accent }} aria-hidden="true" />

        <div className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2">
              <Tag tone={community.type === 'general' ? 'neutral' : 'accent'}>{community.type}</Tag>
              <span className="meta">{pluralise(community.memberIds?.length ?? 0, 'member')}</span>
            </div>

            <h1 className="mb-2 text-4xl">{community.name}</h1>
            <p className="text-muted">{community.description}</p>
          </div>

          {user && (
            <button
              className={`btn ${isMember ? 'btn-ghost' : 'btn-primary'}`}
              onClick={() => dispatch(joinCommunity({ communityId: community.id, userId: user.id }))}
            >
              {isMember ? 'Leave' : 'Join'}
            </button>
          )}
        </div>
      </header>

      <div className="mb-5">
        <PostComposer
          communityId={community.id}
          placeholder={`Post in ${community.name}…`}
        />
      </div>

      {postsStatus === 'loading' ? (
        <SkeletonList rows={3} />
      ) : posts.length ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} showCommunity={false} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Quiet in here"
          message="No posts yet. Start the conversation."
          icon="◌"
        />
      )}
    </div>
  )
}
