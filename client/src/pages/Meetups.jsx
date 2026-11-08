/**
 * Fan meetups: create one, join one, filter by type.
 */

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { PageHeading, Loading, EmptyState, Tabs, Modal, Field, Notice } from '../components/ui'
import { MeetupCard } from '../components/social/Cards'
import {
  loadMeetups,
  addMeetup,
  toggleAttendance,
  setMeetupFilter,
  clearMeetupMessages,
  selectVisibleMeetups,
  selectMeetupsStatus,
  selectMeetupFilter,
  selectMeetupError,
  selectMeetupNotice,
} from '../store/slices/meetupsSlice'
import { selectUser } from '../store/slices/authSlice'
import { fetchSchedule, selectRaces, selectScheduleStatus, selectSeason } from '../store/slices/f1Slice'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'online', label: 'Online' },
  { id: 'in-person', label: 'In person' },
  { id: 'mine', label: 'Going' },
]

const BLANK = {
  title: '',
  description: '',
  mode: 'online',
  location: '',
  startsAt: '',
  raceRound: '',
  capacity: '',
}

export default function Meetups() {
  const dispatch = useDispatch()

  const meetups = useSelector(selectVisibleMeetups)
  const status = useSelector(selectMeetupsStatus)
  const filter = useSelector(selectMeetupFilter)
  const error = useSelector(selectMeetupError)
  const notice = useSelector(selectMeetupNotice)
  const user = useSelector(selectUser)

  const season = useSelector(selectSeason)
  const races = useSelector(selectRaces)
  const scheduleStatus = useSelector(selectScheduleStatus)

  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState(BLANK)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (status === 'idle') dispatch(loadMeetups())
    if (scheduleStatus === 'idle') dispatch(fetchSchedule(season))
  }, [dispatch, status, scheduleStatus, season])

  async function handleCreate(event) {
    event.preventDefault()
    setFormError(null)

    if (!draft.title.trim()) return setFormError('Give it a title.')
    if (!draft.startsAt) return setFormError('Pick a date and time.')
    if (!draft.location.trim()) return setFormError('Say where it is happening.')

    const result = await dispatch(
      addMeetup({
        ...draft,
        hostId: user.id,
        startsAt: new Date(draft.startsAt).toISOString(),
        raceRound: draft.raceRound ? Number(draft.raceRound) : null,
        capacity: draft.capacity ? Number(draft.capacity) : null,
      })
    )

    if (result.meta.requestStatus === 'fulfilled') {
      setCreating(false)
      setDraft(BLANK)
    }
  }

  return (
    <div className="shell py-10">
      <PageHeading
        eyebrow="Watch together"
        title="Fan meetups"
        subtitle="Watch parties, voice chats during qualifying, and quiz nights. Online or in person."
        action={
          user && (
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              Organise a meetup
            </button>
          )
        }
      />

      {(error || notice) && (
        <div className="mb-5">
          <Notice
            tone={error ? 'error' : 'success'}
            onDismiss={() => dispatch(clearMeetupMessages())}
          >
            {error ?? notice}
          </Notice>
        </div>
      )}

      <Tabs
        tabs={TABS}
        active={filter}
        onChange={(id) => dispatch(setMeetupFilter(id))}
        className="mb-6"
      />

      {status === 'loading' && <Loading label="Loading meetups…" />}

      {status === 'succeeded' &&
        (meetups.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {meetups.map((meetup) => (
              <MeetupCard
                key={meetup.id}
                meetup={meetup}
                canAttend={Boolean(user)}
                isAttending={user ? meetup.attendeeIds.includes(user.id) : false}
                onToggleAttend={() =>
                  dispatch(toggleAttendance({ meetupId: meetup.id, userId: user.id }))
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={filter === 'mine' ? 'You are not going to anything yet' : 'No meetups here'}
            message={
              filter === 'mine'
                ? 'Join one from the list, or organise your own.'
                : 'Be the first to organise one for the next race weekend.'
            }
            icon="◉"
            action={
              user && (
                <button className="btn btn-sm btn-primary" onClick={() => setCreating(true)}>
                  Organise a meetup
                </button>
              )
            }
          />
        ))}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Organise a meetup"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreate}>
              Create
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          {formError && (
            <div className="mb-4">
              <Notice tone="error">{formError}</Notice>
            </div>
          )}

          <Field label="Title" htmlFor="m-title">
            <input
              id="m-title"
              className="input"
              placeholder="Qualifying watch party"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              maxLength={70}
            />
          </Field>

          <Field label="Description" htmlFor="m-desc">
            <textarea
              id="m-desc"
              className="input min-h-[72px] resize-y"
              placeholder="What should people expect?"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              maxLength={240}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="m-mode">
              <select
                id="m-mode"
                className="input"
                value={draft.mode}
                onChange={(e) => setDraft({ ...draft, mode: e.target.value })}
              >
                <option value="online">Online</option>
                <option value="in-person">In person</option>
              </select>
            </Field>

            <Field label="Starts" htmlFor="m-when">
              <input
                id="m-when"
                type="datetime-local"
                className="input"
                value={draft.startsAt}
                onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })}
              />
            </Field>
          </div>

          <Field
            label={draft.mode === 'online' ? 'Where online' : 'Address'}
            htmlFor="m-loc"
          >
            <input
              id="m-loc"
              className="input"
              placeholder={draft.mode === 'online' ? 'Discord: #race-voice' : 'Cafe name, city'}
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              maxLength={90}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Race (optional)" htmlFor="m-race">
              <select
                id="m-race"
                className="input"
                value={draft.raceRound}
                onChange={(e) => setDraft({ ...draft, raceRound: e.target.value })}
              >
                <option value="">Not race specific</option>
                {races.map((r) => (
                  <option key={r.round} value={r.round}>
                    R{r.round} · {r.raceName}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Capacity (optional)" htmlFor="m-cap">
              <input
                id="m-cap"
                type="number"
                min="2"
                max="500"
                className="input"
                placeholder="20"
                value={draft.capacity}
                onChange={(e) => setDraft({ ...draft, capacity: e.target.value })}
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  )
}
