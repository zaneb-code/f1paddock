/**
 * Login.
 *
 * One special case worth noting: if the account exists but was never
 * verified, the server replies 403 with needsVerification. The auth slice
 * turns that into a verification stage, and this page redirects to /register
 * where the code screen is waiting — rather than leaving the user staring at
 * a refusal they cannot act on.
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import { Field, Notice, Spinner } from '../components/ui'
import { validateLogin } from '../utils/format'
import {
  login,
  clearAuthMessages,
  selectAuthStatus,
  selectAuthError,
  selectIsAuthenticated,
  selectVerificationStage,
} from '../store/slices/authSlice'

export default function Login() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const status = useSelector(selectAuthStatus)
  const serverError = useSelector(selectAuthError)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const stage = useSelector(selectVerificationStage)

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)

  const redirectTo = location.state?.from ?? '/'

  useEffect(() => () => dispatch(clearAuthMessages()), [dispatch])

  useEffect(() => {
    if (isAuthenticated) navigate(redirectTo, { replace: true })
  }, [isAuthenticated, navigate, redirectTo])

  // Unverified account -> the code screen lives on /register
  useEffect(() => {
    if (stage === 'awaiting') navigate('/register', { replace: true })
  }, [stage, navigate])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    const validation = validateLogin(form)
    setErrors(validation)
    if (Object.keys(validation).length) return

    dispatch(login(form))
  }

  const busy = status === 'loading'

  return (
    <div className="shell grid min-h-[calc(100vh-4rem)] place-items-center py-12">
      <div className="card w-full max-w-md p-7">
        <p className="eyebrow mb-2">Welcome back</p>
        <h1 className="mb-1 text-3xl">Log in</h1>
        <p className="mb-6 text-sm text-muted">
          Pick up your predictions, communities and meetups.
        </p>

        {serverError && (
          <div className="mb-4">
            <Notice tone="error">{serverError}</Notice>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <Field label="Email" htmlFor="email" error={errors.email}>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className={`input ${errors.email ? 'input-error' : ''}`}
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
            />
          </Field>

          <Field label="Password" htmlFor="password" error={errors.password}>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={`input pr-16 ${errors.password ? 'input-error' : ''}`}
                placeholder="Your password"
                value={form.password}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-dim hover:text-accent"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </Field>

          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? <Spinner /> : 'Log in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          New here?{' '}
          <Link to="/register" className="text-accent hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
