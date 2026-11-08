/**
 * Cards for communities, fans and meetups. Small presentational pieces that
 * take callbacks rather than dispatching themselves, so the page owns the
 * Redux wiring and these stay easy to reuse.
 */

import { Link } from 'react-router-dom'
import { Avatar, Tag } from '../ui'
import { teamColour } from '../../utils/teams'
import { formatSessionDay, formatSessionTime, pluralise } from '../../utils/format'

/* ------------------------------------------------------------------
 *  Community
 * ------------------------------------------------------------------ */

export function CommunityCard({ community, isMember, onToggleMember, canJoin }) {
  const accent =
    community.type === 'team' ? teamColour(community.refId) : community.type === 'driver' ? '#FF2D20' : '#71717A'

  return (
    <div className="card card-hover flex flex-col overflow-hidden">
      <span className="h-1 w-full" style={{ backgroundColor: accent }} aria-hidden="true" />

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-2">
          <Tag tone={community.type === 'general' ? 'neutral' : 'accent'}>{community.type}</Tag>
          <span className="meta">{pluralise(community.memberIds?.length ?? 0, 'member')}</span>
        </div>

        <h3 className="mb-1.5 text-xl">
          <Link to={`/communities/${community.slug}`} className="transition-colors hover:text-accent">
            {community.name}
          </Link>
        </h3>

        <p className="mb-4 line-clamp-3 flex-1 text-sm text-muted">{community.description}</p>

        <div className="flex items-center justify-between border-t border-dashed border-line pt-3">
          <span className="meta">{pluralise(community.postCount ?? 0, 'post')}</span>

          {canJoin && (
            <button
              type="button"
              onClick={onToggleMember}
              className={`btn btn-sm ${isMember ? 'btn-ghost' : 'btn-primary'}`}
            >
              {isMember ? 'Joined' : 'Join'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
 *  Fan
 * ------------------------------------------------------------------ */

/**
 * A fan in the discover list.
 * `shared` lists what you have in common, which is what makes the match
 * meaningful rather than just a number.
 */
export function FanCard({ profile, score, shared, isFollowing, onToggleFollow, canFollow }) {
  const sharedBits = [
    ...(shared?.drivers ?? []).map((d) => ({ label: d.replace(/_/g, ' '), kind: 'driver' })),
    ...(shared?.teams ?? []).map((t) => ({ label: t.replace(/_/g, ' '), kind: 'team' })),
    ...(shared?.circuits ?? []).map((c) => ({ label: c.replace(/_/g, ' '), kind: 'circuit' })),
    ...(shared?.eras ?? []).map((e) => ({ label: e.replace(/-/g, ' '), kind: 'era' })),
  ]

  return (
    <div className="card card-hover flex flex-col p-5">
      <div className="mb-3 flex items-start gap-3">
        <Avatar name={profile.displayName ?? profile.username} size="md" />

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg">
            <Link to={`/fans/${profile.username}`} className="transition-colors hover:text-accent">
              {profile.displayName ?? profile.username}
            </Link>
          </h3>
          <p className="truncate text-xs text-dim">@{profile.username}</p>
        </div>

        {score != null && (
          <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-1 font-mono text-xs text-accent-soft">
            {score} match
          </span>
        )}
      </div>

      {profile.bio && <p className="mb-3 line-clamp-2 text-sm text-muted">{profile.bio}</p>}

      {sharedBits.length > 0 && (
        <div className="mb-4">
          <p className="eyebrow mb-1.5">In common</p>
          <div className="flex flex-wrap gap-1.5">
            {sharedBits.slice(0, 5).map((bit) => (
              <span key={`${bit.kind}-${bit.label}`} className="chip text-xs capitalize">
                {bit.label}
              </span>
            ))}
            {sharedBits.length > 5 && (
              <span className="chip text-xs">+{sharedBits.length - 5}</span>
            )}
          </div>
        </div>
      )}

      {canFollow && (
        <button
          type="button"
          onClick={onToggleFollow}
          className={`btn btn-sm mt-auto ${isFollowing ? 'btn-ghost' : 'btn-primary'}`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------
 *  Meetup
 * ------------------------------------------------------------------ */

export function MeetupCard({ meetup, isAttending, onToggleAttend, canAttend }) {
  const full = meetup.capacity && meetup.attendeeIds.length >= meetup.capacity
  const online = meetup.mode === 'online'

  return (
    <div className="card card-hover flex flex-col p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Tag tone={online ? 'accent' : 'flag'}>{online ? 'Online' : 'In person'}</Tag>
        {meetup.raceRound && <span className="meta">Round {meetup.raceRound}</span>}
        {full && !isAttending && <Tag tone="stop">Full</Tag>}
      </div>

      <h3 className="mb-1.5 text-xl">{meetup.title}</h3>
      <p className="mb-4 flex-1 text-sm text-muted">{meetup.description}</p>

      <dl className="mb-4 space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-dim">When</dt>
          <dd className="text-right text-chalk">
            {formatSessionDay(meetup.startsAt)} · {formatSessionTime(meetup.startsAt)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-dim">Where</dt>
          <dd className="truncate text-right text-chalk">{meetup.location}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-dim">Host</dt>
          <dd className="text-right text-chalk">
            {meetup.host?.displayName ?? meetup.host?.username ?? 'Unknown'}
          </dd>
        </div>
      </dl>

      <div className="flex items-center justify-between border-t border-dashed border-line pt-3">
        <span className="meta">
          {meetup.attendeeIds.length}
          {meetup.capacity ? ` / ${meetup.capacity}` : ''} going
        </span>

        {canAttend && (
          <button
            type="button"
            onClick={onToggleAttend}
            disabled={full && !isAttending}
            className={`btn btn-sm ${isAttending ? 'btn-ghost' : 'btn-primary'}`}
          >
            {isAttending ? 'Going' : full ? 'Full' : 'Join'}
          </button>
        )}
      </div>
    </div>
  )
}
