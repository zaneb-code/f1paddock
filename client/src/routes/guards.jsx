/**
 * Route guards.
 *
 * ProtectedRoute  — members-only pages. Remembers where you were headed so
 *                   login can send you back there.
 * PublicOnlyRoute — keeps signed-in users off login and register.
 * ModeratorRoute  — the admin queue.
 *
 * Both wait for `sessionChecked` before deciding anything. Without that, a
 * refresh on a protected page would bounce to /login for a moment while the
 * stored token was still being verified.
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'

import { Loading } from '../components/ui'
import { selectIsAuthenticated, selectSessionChecked } from '../store/slices/authSlice'
import { selectIsModerator } from '../store/slices/moderationSlice'

export function ProtectedRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const sessionChecked = useSelector(selectSessionChecked)
  const location = useLocation()

  if (!sessionChecked) return <Loading label="Checking your session…" />

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return children
}

export function PublicOnlyRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const sessionChecked = useSelector(selectSessionChecked)

  if (!sessionChecked) return <Loading label="Checking your session…" />
  if (isAuthenticated) return <Navigate to="/" replace />

  return children
}

export function ModeratorRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isModerator = useSelector(selectIsModerator)
  const sessionChecked = useSelector(selectSessionChecked)
  const location = useLocation()

  if (!sessionChecked) return <Loading label="Checking your session…" />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (!isModerator) return <Navigate to="/" replace />

  return children
}
