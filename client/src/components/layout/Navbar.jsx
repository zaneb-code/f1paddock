/**
 * Site navigation and the authentication area.
 *
 * Reads the signed-in user from Redux, so it is always correct no matter
 * which page you are on or how you got there.
 */

import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import { Avatar } from '../ui'
import { logout, selectUser, selectIsAuthenticated } from '../../store/slices/authSlice'
import { clearMyProfile } from '../../store/slices/profileSlice'
import { selectIsModerator, selectOpenReports } from '../../store/slices/moderationSlice'

const LINKS = [
  { to: '/', label: 'Paddock', end: true },
  { to: '/races', label: 'Calendar' },
  { to: '/standings', label: 'Standings' },
  { to: '/communities', label: 'Communities' },
  { to: '/predictions', label: 'Predictions' },
  { to: '/meetups', label: 'Meetups' },
  { to: '/fans', label: 'Fans' },
]

export default function Navbar() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const user = useSelector(selectUser)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isModerator = useSelector(selectIsModerator)
  const openReports = useSelector(selectOpenReports)

  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  /**
   * Logging out happens in two steps.
   *
   * Clearing the session while still on a protected page makes ProtectedRoute
   * redirect to /login, which would override wherever we tried to send the
   * user. So: navigate home first, then clear the session once we have
   * arrived. The two never race.
   */
  function handleLogout() {
    setMenuOpen(false)
    setLoggingOut(true)
    navigate('/', { replace: true })
  }

  useEffect(() => {
    if (loggingOut && location.pathname === '/') {
      setLoggingOut(false)
      dispatch(logout())
      dispatch(clearMyProfile())
    }
  }, [loggingOut, location.pathname, dispatch])

  // Close the mobile menu whenever the route changes.
  useEffect(() => setMenuOpen(false), [location.pathname])

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-lg">
      <div className="shell flex h-16 items-center gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent font-display text-lg font-bold text-white">
            F1
          </span>
          <span className="font-display text-xl font-bold tracking-wide">
            Paddock
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="ml-auto grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface-2 lg:hidden"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span className="text-lg">{menuOpen ? '×' : '≡'}</span>
        </button>

        <nav
          className={`${
            menuOpen ? 'flex' : 'hidden'
          } absolute top-16 right-0 left-0 flex-col gap-4 border-b border-line bg-surface p-5 shadow-2xl lg:static lg:ml-auto lg:flex lg:flex-row lg:items-center lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
        >
          <ul className="flex flex-col gap-1 lg:flex-row lg:items-center">
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `block rounded-full px-3 py-2 font-display text-sm font-semibold tracking-wide uppercase transition-colors ${
                      isActive ? 'bg-accent/15 text-accent-soft' : 'text-muted hover:bg-white/5 hover:text-chalk'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}

            {isModerator && (
              <li>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-full px-3 py-2 font-display text-sm font-semibold tracking-wide uppercase transition-colors ${
                      isActive ? 'bg-flag/15 text-flag' : 'text-muted hover:bg-white/5 hover:text-chalk'
                    }`
                  }
                >
                  Admin
                  {openReports.length > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-flag px-1 text-[0.65rem] font-bold text-ink">
                      {openReports.length}
                    </span>
                  )}
                </NavLink>
              </li>
            )}
          </ul>

          <div className="flex items-center gap-2 border-t border-line pt-4 lg:border-0 lg:pt-0 lg:pl-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-surface-2 py-1 pr-3 pl-1 transition-colors hover:border-line-strong"
                >
                  <Avatar name={user.username} size="xs" />
                  <span className="truncate text-sm font-medium">{user.username}</span>
                </Link>
                <button type="button" onClick={handleLogout} className="btn btn-sm btn-quiet">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-sm btn-ghost flex-1 lg:flex-none">
                  Log in
                </Link>
                <Link to="/register" className="btn btn-sm btn-primary flex-1 lg:flex-none">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
