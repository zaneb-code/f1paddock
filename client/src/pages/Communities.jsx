/**
 * Browse and search communities, and create new ones.
 */

import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { PageHeading, Loading, EmptyState, Tabs, Modal, Field, Notice } from '../components/ui'
import { CommunityCard } from '../components/social/Cards'
import {
  loadCommunities,
  joinCommunity,
  createCommunity,
  clearSocialMessages,
  selectCommunities,
  selectCommunitiesStatus,
  selectSocialError,
  selectSocialNotice,
} from '../store/slices/socialSlice'
import { selectUser } from '../store/slices/authSlice'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'team', label: 'Teams' },
  { id: 'driver', label: 'Drivers' },
  { id: 'general', label: 'General' },
  { id: 'mine', label: 'Joined' },
]

export default function Communities() {
  const dispatch = useDispatch()

  const communities = useSelector(selectCommunities)
  const status = useSelector(selectCommunitiesStatus)
  const error = useSelector(selectSocialError)
  const notice = useSelector(selectSocialNotice)
  const user = useSelector(selectUser)

  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ name: '', description: '' })

  useEffect(() => {
    if (status === 'idle') dispatch(loadCommunities())
  }, [dispatch, status])

  const visible = useMemo(() => {
    let list = communities

    if (tab === 'mine') list = list.filter((c) => user && c.memberIds?.includes(user.id))
    else if (tab !== 'all') list = list.filter((c) => c.type === tab)

    if (query.trim()) {
      const needle = query.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(needle) || c.description.toLowerCase().includes(needle)
      )
    }

    return list
  }, [communities, tab, query, user])

  async function handleCreate(event) {
    event.preventDefault()
    if (!draft.name.trim() || !user) return

    const result = await dispatch(
      createCommunity({ ...draft, type: 'general', creatorId: user.id })
    )

    if (result.meta.requestStatus === 'fulfilled') {
      setCreating(false)
      setDraft({ name: '', description: '' })
    }
  }

  return (
    <div className="shell py-10">
      <PageHeading
        eyebrow="Find your people"
        title="Communities"
        subtitle="Driver and team garages, plus general rooms for strategy, history and whatever else the paddock is arguing about."
        action={
          user && (
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              Create community
            </button>
          )
        }
      />

      {(error || notice) && (
        <div className="mb-5">
          <Notice
            tone={error ? 'error' : 'success'}
            onDismiss={() => dispatch(clearSocialMessages())}
          >
            {error ?? notice}
          </Notice>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <input
          type="search"
          className="input max-w-xs"
          placeholder="Search communities…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search communities"
        />
      </div>

      {status === 'loading' && <Loading label="Loading communities…" />}

      {status === 'succeeded' &&
        (visible.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((community) => (
              <CommunityCard
                key={community.id}
                community={community}
                canJoin={Boolean(user)}
                isMember={user ? community.memberIds?.includes(user.id) : false}
                onToggleMember={() =>
                  dispatch(joinCommunity({ communityId: community.id, userId: user.id }))
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No communities match"
            message={
              tab === 'mine'
                ? 'You have not joined any yet. Browse all and join one.'
                : 'Try a different search or filter.'
            }
            icon="◎"
            action={
              <button
                className="btn btn-sm btn-primary"
                onClick={() => {
                  setTab('all')
                  setQuery('')
                }}
              >
                Show all
              </button>
            }
          />
        ))}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create a community"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={!draft.name.trim()}>
              Create
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <Field label="Name" htmlFor="c-name">
            <input
              id="c-name"
              className="input"
              placeholder="Wet weather masters"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              maxLength={50}
            />
          </Field>

          <Field label="What is it for?" htmlFor="c-desc">
            <textarea
              id="c-desc"
              className="input min-h-[88px] resize-y"
              placeholder="A sentence or two so people know what belongs here."
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              maxLength={240}
            />
          </Field>
        </form>
      </Modal>
    </div>
  )
}
