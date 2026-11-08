/**
 * One post, with likes, comments and reporting.
 *
 * Comments are loaded only when the thread is opened — a feed of thirty
 * posts should not fetch thirty comment lists nobody looked at.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import { Avatar, Tag, Spinner } from '../ui'
import { timeAgo } from '../../utils/format'
import { selectUser } from '../../store/slices/authSlice'
import {
  likePost,
  removePost,
  loadComments,
  addComment,
  selectCommentsFor,
} from '../../store/slices/socialSlice'
import { reportContent } from '../../store/slices/moderationSlice'

export default function PostCard({ post, showCommunity = true }) {
  const dispatch = useDispatch()
  const user = useSelector(selectUser)
  const comments = useSelector(selectCommentsFor(post.id))

  const [open, setOpen] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)
  const [draft, setDraft] = useState('')
  const [reported, setReported] = useState(false)

  const liked = user ? post.likedBy?.includes(user.id) : false
  const isMine = user && post.authorId === user.id

  async function toggleThread() {
    const next = !open
    setOpen(next)

    if (next && comments.length === 0) {
      setLoadingComments(true)
      await dispatch(loadComments(post.id))
      setLoadingComments(false)
    }
  }

  async function submitComment(event) {
    event.preventDefault()
    if (!draft.trim() || !user) return

    await dispatch(addComment({ postId: post.id, authorId: user.id, body: draft }))
    setDraft('')
  }

  async function handleReport() {
    if (!user) return
    await dispatch(
      reportContent({
        targetType: 'post',
        targetId: post.id,
        reporterId: user.id,
        reason: 'Reported from the feed',
      })
    )
    setReported(true)
  }

  return (
    <article className="card p-5">
      <header className="mb-3 flex items-start gap-3">
        <Avatar name={post.author?.displayName ?? post.author?.username ?? '?'} size="sm" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              to={`/fans/${post.author?.username}`}
              className="font-semibold text-chalk transition-colors hover:text-accent"
            >
              {post.author?.displayName ?? 'Unknown fan'}
            </Link>
            <span className="text-xs text-dim">@{post.author?.username}</span>
            <span className="text-xs text-dim">·</span>
            <span className="text-xs text-dim">{timeAgo(post.createdAt)}</span>
          </div>

          {showCommunity && post.community && (
            <Link to={`/communities/${post.community.slug}`} className="text-xs text-accent hover:underline">
              {post.community.name}
            </Link>
          )}
          {post.raceRound && !post.community && (
            <Link to={`/races/${post.raceRound}`} className="text-xs text-accent hover:underline">
              Race discussion · Round {post.raceRound}
            </Link>
          )}
        </div>
      </header>

      <p className="mb-4 leading-relaxed whitespace-pre-line text-chalk/90">{post.body}</p>

      <footer className="flex flex-wrap items-center gap-1 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => user && dispatch(likePost({ postId: post.id, userId: user.id }))}
          disabled={!user}
          className={`btn btn-sm ${liked ? 'text-accent' : 'btn-quiet'} disabled:opacity-40`}
          aria-pressed={liked}
        >
          {liked ? '♥' : '♡'} {post.likedBy?.length ?? 0}
        </button>

        <button type="button" onClick={toggleThread} className="btn btn-sm btn-quiet">
          ✎ {post.commentCount ?? 0}
        </button>

        <div className="ml-auto flex gap-1">
          {isMine ? (
            <button
              type="button"
              onClick={() => dispatch(removePost({ postId: post.id, requesterId: user.id }))}
              className="btn btn-sm btn-quiet text-dim hover:text-stop"
            >
              Delete
            </button>
          ) : (
            user && (
              <button
                type="button"
                onClick={handleReport}
                disabled={reported}
                className="btn btn-sm btn-quiet text-dim hover:text-flag disabled:opacity-40"
              >
                {reported ? 'Reported' : 'Report'}
              </button>
            )
          )}
        </div>
      </footer>

      {open && (
        <div className="mt-4 border-t border-line pt-4">
          {loadingComments ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : comments.length === 0 ? (
            <p className="mb-3 text-sm text-dim">No replies yet.</p>
          ) : (
            <ul className="mb-4 space-y-3">
              {comments.map((comment) => (
                <li key={comment.id} className="flex gap-2.5">
                  <Avatar name={comment.author?.displayName ?? '?'} size="xs" />
                  <div className="min-w-0 flex-1 rounded-xl bg-surface-2 px-3 py-2">
                    <p className="mb-0.5 flex items-center gap-2 text-xs">
                      <span className="font-semibold text-chalk">
                        {comment.author?.displayName ?? 'Unknown'}
                      </span>
                      <span className="text-dim">{timeAgo(comment.createdAt)}</span>
                    </p>
                    <p className="text-sm text-chalk/85">{comment.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {user ? (
            <form onSubmit={submitComment} className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Add a reply…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={500}
              />
              <button type="submit" className="btn btn-sm btn-primary" disabled={!draft.trim()}>
                Reply
              </button>
            </form>
          ) : (
            <p className="text-sm text-dim">
              <Link to="/login" className="text-accent hover:underline">
                Log in
              </Link>{' '}
              to join the discussion.
            </p>
          )}
        </div>
      )}
    </article>
  )
}
