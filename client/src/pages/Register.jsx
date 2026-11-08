/**
 * Registration — a two-step flow because of the email-verification requirement.
 *
 *   Step 1  details form   -> POST /api/auth/register -> server emails a code
 *   Step 2  six-digit code -> POST /api/auth/verify   -> JWT issued, logged in
 *
 * Which step is showing is driven by `verificationStage` in Redux rather than
 * local state, so a login attempt on an unverified account can drop the user
 * straight into step 2 from a different page.
 */

import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import { Field, Notice, Spinner } from '../components/ui'
import { validateRegister, passwordStrength } from '../utils/format'
import {
  register,
  verifyEmail,
  resendCode,
  cancelVerification,
  clearAuthMessages,
  selectAuthStatus,
  selectAuthError,
  selectFieldErrors,
  selectAuthNotice,
  selectPendingEmail,
  selectVerificationStage,
  selectLastDelivery,
  selectIsAuthenticated,
} from '../store/slices/authSlice'

export default function Register() {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const status = useSelector(selectAuthStatus)
  const serverError = useSelector(selectAuthError)
  const fieldErrors = useSelector(selectFieldErrors)
  const notice = useSelector(selectAuthNotice)
  const pendingEmail = useSelector(selectPendingEmail)
  const stage = useSelector(selectVerificationStage)
  const delivery = useSelector(selectLastDelivery)
  const isAuthenticated = useSelector(selectIsAuthenticated)

  const [form, setForm] = useState({ email: '', username: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => () => dispatch(clearAuthMessages()), [dispatch])

  // Verification succeeded -> we now have a token -> go to the paddock.
  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    const validation = validateRegister(form)
    setErrors(validation)
    if (Object.keys(validation).length) return

    dispatch(register({ email: form.email, username: form.username, password: form.password }))
  }

  const strength = passwordStrength(form.password)
  const busy = status === 'loading'

  /* ---------------- Step 2: the code ---------------- */
  if (stage === 'awaiting' && pendingEmail) {
    return (
      <VerifyStep
        email={pendingEmail}
        busy={busy}
        error={serverError}
        notice={notice}
        delivery={delivery}
        onVerify={(code) => dispatch(verifyEmail({ email: pendingEmail, code }))}
        onResend={() => dispatch(resendCode(pendingEmail))}
        onBack={() => dispatch(cancelVerification())}
      />
    )
  }

  /* ---------------- Step 1: the details ---------------- */
  return (
    <div className="shell grid min-h-[calc(100vh-4rem)] place-items-center py-12">
      <div className="card w-full max-w-md p-7">
        <p className="eyebrow mb-2">Join the grid</p>
        <h1 className="mb-1 text-3xl">Create your account</h1>
        <p className="mb-6 text-sm text-muted">
          We will email you a six-digit code to confirm the address.
        </p>

        {serverError && (
          <div className="mb-4">
            <Notice tone="error">{serverError}</Notice>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <Field label="Email" htmlFor="email" error={errors.email ?? fieldErrors?.email}>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className={`input ${errors.email || fieldErrors?.email ? 'input-error' : ''}`}
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
            />
          </Field>

          <Field
            label="Username"
            htmlFor="username"
            error={errors.username ?? fieldErrors?.username}
            hint="3-20 characters. Letters, numbers and underscores."
          >
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              className={`input ${errors.username || fieldErrors?.username ? 'input-error' : ''}`}
              placeholder="apexhunter"
              value={form.username}
              onChange={handleChange}
            />
          </Field>

          <Field label="Password" htmlFor="password" error={errors.password ?? fieldErrors?.password}>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              className={`input ${errors.password || fieldErrors?.password ? 'input-error' : ''}`}
              placeholder="At least 8 characters"
              value={form.password}
              onChange={handleChange}
            />
            {form.password && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < strength.score
                          ? strength.score <= 1
                            ? 'bg-stop'
                            : strength.score <= 2
                              ? 'bg-warn'
                              : strength.score <= 3
                                ? 'bg-accent'
                                : 'bg-go'
                          : 'bg-surface-3'
                      }`}
                    />
                  ))}
                </div>
                <span className="w-20 text-right text-xs text-dim">{strength.label}</span>
              </div>
            )}
          </Field>

          <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword}>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
              placeholder="Repeat your password"
              value={form.confirmPassword}
              onChange={handleChange}
            />
          </Field>

          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? <Spinner /> : 'Send me a code'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
 *  The code entry screen
 * ------------------------------------------------------------------ */

function VerifyStep({ email, busy, error, notice, delivery, onVerify, onResend, onBack }) {
  // One input per digit, so pasting a code and typing both feel right.
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const inputs = useRef([])

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  function setDigit(index, value) {
    const clean = value.replace(/\D/g, '')

    // Handle a pasted six-digit code landing in one box.
    if (clean.length > 1) {
      const next = clean.slice(0, 6).split('')
      setDigits([...next, ...Array(6 - next.length).fill('')])
      inputs.current[Math.min(next.length, 5)]?.focus()
      return
    }

    const next = [...digits]
    next[index] = clean
    setDigits(next)

    if (clean && index < 5) inputs.current[index + 1]?.focus()
  }

  function handleKeyDown(index, event) {
    // Backspace on an empty box steps back to the previous one.
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const code = digits.join('')
  const complete = code.length === 6

  function handleSubmit(event) {
    event.preventDefault()
    if (complete) onVerify(code)
  }

  return (
    <div className="shell grid min-h-[calc(100vh-4rem)] place-items-center py-12">
      <div className="card w-full max-w-md p-7">
        <p className="eyebrow mb-2">Step 2 of 2</p>
        <h1 className="mb-1 text-3xl">Check your email</h1>
        <p className="mb-6 text-sm text-muted">
          We sent a six-digit code to <span className="text-chalk">{email}</span>. It expires in
          ten minutes.
        </p>

        {delivery?.mode === 'console' && (
          <div className="mb-4">
            <Notice tone="info">
              The server is in <code className="text-accent">console</code> mail mode, so the code
              is printed in the server terminal rather than emailed. Change{' '}
              <code className="text-accent">MAIL_MODE</code> in <code>server/.env</code> to send
              real email.
            </Notice>
          </div>
        )}

        {delivery?.previewUrl && (
          <div className="mb-4">
            <Notice tone="info">
              Test inbox:{' '}
              <a
                href={delivery.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                open the email
              </a>
            </Notice>
          </div>
        )}

        {notice && !error && (
          <div className="mb-4">
            <Notice tone="success">{notice}</Notice>
          </div>
        )}

        {error && (
          <div className="mb-4">
            <Notice tone="error">{error}</Notice>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-5 flex justify-between gap-2">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputs.current[index] = el)}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={digit}
                onChange={(e) => setDigit(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="input h-14 w-full p-0 text-center font-mono text-2xl font-bold"
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={!complete || busy}>
            {busy ? <Spinner /> : 'Verify and continue'}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <button type="button" onClick={onBack} className="text-muted hover:text-chalk">
            ← Change details
          </button>
          <button type="button" onClick={onResend} className="text-accent hover:underline">
            Resend code
          </button>
        </div>
      </div>
    </div>
  )
}
