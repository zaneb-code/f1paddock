import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import { Avatar } from '../ui'
import { selectUser } from '../../store/slices/authSlice'
import { addPost } from '../../store/slices/socialSlice'
import { schemas, validateForm, LIMITS } from '../../utils/validate'
const MAX = LIMITS.postBody.max

export default function PostComposer({
  communityId = null,
  raceRound = null,
  season = null,
  placeholder,
}) {
  const dispatch = useDispatch()
  const user = useSelector(selectUser)

  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (!user) {
    return (
      <div className="card border-dashed p-5 text-center text-sm text-muted">
        <Link to="/login" className="text-accent hover:underline">
          Log in
        </Link>{' '}
        to post here.
      </div>
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const { ok, errors } = validateForm(schemas.post, { body })
    if (!ok) {
      setError(errors.body)
      return
    }

    setError(null)
    setBusy(true)
    const result = await dispatch(
      addPost({ authorId: user.id, body, communityId, raceRound, season }),
    )
    setBusy(false)

    if (result.meta.requestStatus === 'fulfilled') {
      setBody('')
    } else {
      setError(result.payload?.fields?.body ?? result.payload?.error ?? 'Could not post that.')
    }
  }

  const remaining = MAX - body.length

  return (
    <form onSubmit={handleSubmit} className="card p-4">
      <div className="flex gap-3">
        <Avatar name={user.username} size="sm" />

        <div className="min-w-0 flex-1">
          <textarea
            className="input min-h-[88px] resize-y"
            placeholder={placeholder ?? 'What do you make of it?'}
            value={body}
            onChange={(e) => {
              setBody(e.target.value.slice(0, MAX))
              if (error) setError(null)
            }}
            maxLength={MAX}
            aria-invalid={Boolean(error)}
          />

          {error && <p className="mt-1.5 text-sm text-stop">{error}</p>}

          <div className="mt-2 flex items-center justify-between">
            <span className={`text-xs ${remaining < 100 ? 'text-flag' : 'text-dim'}`}>
              {remaining} characters left
            </span>
            <button
              type="submit"
              className="btn btn-sm btn-primary"
              disabled={busy || !body.trim()}
            >
              {busy ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
