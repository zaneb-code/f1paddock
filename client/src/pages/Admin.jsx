/**
 * Admin moderation queue — the "admin moderation and reporting" requirement.
 *
 * Reachable only by a moderator account (see MODERATOR_USERNAMES in
 * moderationSlice). A moderator either hides the reported content or
 * dismisses the report.
 *
 * Phase 2 note: the guard here is client-side, which is a convenience, not
 * a security control. When these become real routes, the server must check
 * the user's role on every moderation request — a determined user can always
 * edit client state.
 */

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { PageHeading, Loading, EmptyState, Notice, Tabs, Tag, Avatar } from '../components/ui'
import {
  loadReports,
  resolveReport,
  clearModerationMessages,
  selectReports,
  selectModerationStatus,
  selectModerationError,
  selectModerationNotice,
} from '../store/slices/moderationSlice'
import { timeAgo } from '../utils/format'

const TABS = [
  { id: 'open', label: 'Open' },
  { id: 'actioned', label: 'Actioned' },
  { id: 'dismissed', label: 'Dismissed' },
]

export default function Admin() {
  const dispatch = useDispatch()

  const reports = useSelector(selectReports)
  const status = useSelector(selectModerationStatus)
  const error = useSelector(selectModerationError)
  const notice = useSelector(selectModerationNotice)

  const [tab, setTab] = useState('open')

  useEffect(() => {
    dispatch(loadReports())
  }, [dispatch])

  const visible = reports.filter((r) => r.status === tab)
  const counts = {
    open: reports.filter((r) => r.status === 'open').length,
    actioned: reports.filter((r) => r.status === 'actioned').length,
    dismissed: reports.filter((r) => r.status === 'dismissed').length,
  }

  return (
    <div className="shell py-10">
      <PageHeading
        eyebrow="Stewards' room"
        title="Moderation queue"
        subtitle="Reported posts and comments. Hide what breaks the rules, dismiss what does not."
      />

      {(error || notice) && (
        <div className="mb-5">
          <Notice
            tone={error ? 'error' : 'success'}
            onDismiss={() => dispatch(clearModerationMessages())}
          >
            {error ?? notice}
          </Notice>
        </div>
      )}

      <Tabs
        tabs={TABS.map((t) => ({ ...t, count: counts[t.id] }))}
        active={tab}
        onChange={setTab}
        className="mb-6"
      />

      {status === 'loading' && <Loading label="Loading reports…" />}

      {status === 'succeeded' &&
        (visible.length ? (
          <div className="space-y-4">
            {visible.map((report) => (
              <article key={report.id} className="card p-5">
                <header className="mb-3 flex flex-wrap items-center gap-2">
                  <Tag tone={report.status === 'open' ? 'flag' : 'neutral'}>
                    {report.targetType}
                  </Tag>
                  <span className="meta">{timeAgo(report.createdAt)}</span>
                  <span className="text-xs text-dim">
                    reported by @{report.reporter?.username ?? 'unknown'}
                  </span>
                </header>

                {report.target ? (
                  <div className="mb-4 rounded-xl border border-line bg-surface-2 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Avatar name={report.targetAuthor?.displayName ?? '?'} size="xs" />
                      <span className="text-sm font-medium text-chalk">
                        {report.targetAuthor?.displayName ?? 'Unknown'}
                      </span>
                      {report.target.hidden && <Tag tone="stop">Hidden</Tag>}
                    </div>
                    <p className="text-sm whitespace-pre-line text-chalk/85">{report.target.body}</p>
                  </div>
                ) : (
                  <p className="mb-4 text-sm text-dim">
                    The reported content no longer exists.
                  </p>
                )}

                <p className="mb-4 text-sm text-muted">
                  <span className="text-dim">Reason: </span>
                  {report.reason}
                </p>

                {report.status === 'open' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => dispatch(resolveReport({ reportId: report.id, action: 'hide' }))}
                    >
                      Hide content
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() =>
                        dispatch(resolveReport({ reportId: report.id, action: 'dismiss' }))
                      }
                    >
                      Dismiss report
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title={tab === 'open' ? 'Nothing to review' : `No ${tab} reports`}
            message={
              tab === 'open'
                ? 'The paddock is behaving itself. Reports appear here as they come in.'
                : 'Nothing has been resolved this way yet.'
            }
            icon="⚑"
          />
        ))}
    </div>
  )
}
