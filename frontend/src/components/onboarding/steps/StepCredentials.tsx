import { useEffect, useId, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { ExclamationCircleIcon, ExclamationTriangleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useOnboardingStore } from '../../../store/onboardingStore'

export interface StepCredentialsHandle {
  submit: () => Promise<boolean>
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const StepCredentials = forwardRef<StepCredentialsHandle, object>((_props, ref) => {
  const store = useOnboardingStore()
  const emailId = useId()
  const passwordId = useId()
  const passwordHintId = `${passwordId}-hint`
  const passwordErrorId = `${passwordId}-error`
  const emailErrorId = `${emailId}-error`
  const lateErrorId = `${emailId}-late-error`

  const [email, setEmail] = useState(store.email)
  const [password, setPassword] = useState(store.password)
  const [showPassword, setShowPassword] = useState(false)
  const [emailValid, setEmailValid] = useState<boolean | null>(null)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  // Subscribe to the late error (snap-back banner) — read fresh on every render.
  const credentialsLateError = useOnboardingStore(s => s.credentialsLateError)

  const emailRef = useRef<HTMLInputElement>(null)

  // On mount or when a snap-back has just placed us back here, focus the email
  // field so the user lands on the offending field immediately.
  useEffect(() => {
    if (credentialsLateError) {
      emailRef.current?.focus()
      // Best-effort: scroll into view on small screens.
      emailRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    } else {
      emailRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useImperativeHandle(ref, () => ({
    async submit(): Promise<boolean> {
      const errs: { email?: string; password?: string } = {}
      const trimmedEmail = email.trim()
      if (!trimmedEmail) {
        errs.email = 'Please enter your email address.'
      } else if (!EMAIL_RE.test(trimmedEmail)) {
        errs.email = 'Please enter a valid email address.'
      }

      if (!password) {
        errs.password = 'Please choose a password.'
      } else if (password.length < 8) {
        errs.password = 'Password must be at least 8 characters.'
      } else if (password.length > 15) {
        errs.password = 'Password must be at most 15 characters.'
      }

      setErrors(errs)
      if (Object.keys(errs).length > 0) {
        return false
      }

      // Persist to the store so subsequent steps and the eventual terms
      // submission can build the combined-payload register request.
      store.setCredentials(trimmedEmail, password)
      return true
    }
  }))

  function handleEmailChange(value: string) {
    setEmail(value)
    setEmailValid(null)
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }))
    }
    // Per SDD §4.2 / handoff §"Late-error recovery": the late-error banner
    // persists until the user modifies the email field — clear on first onChange.
    if (credentialsLateError) {
      store.setCredentialsLateError(null)
    }
  }

  function handleEmailBlur() {
    const trimmed = email.trim()
    if (trimmed && EMAIL_RE.test(trimmed)) {
      setEmailValid(true)
    } else {
      setEmailValid(null)
    }
  }

  function handlePasswordChange(value: string) {
    setPassword(value)
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: undefined }))
    }
  }

  const emailFieldClass =
    'w-full px-4 py-2.5 rounded-md text-sm outline-none transition-all focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(34,197,94,.25)]'

  const emailFieldStyle: React.CSSProperties = {
    background: 'var(--color-bg-surface-2)',
    border: `1px solid ${
      errors.email || credentialsLateError
        ? 'var(--color-error-strong)'
        : emailValid
          ? 'var(--color-primary-border)'
          : 'var(--color-border-input)'
    }`,
    color: 'var(--color-fg-default)',
  }

  const passwordFieldClass =
    'w-full px-4 py-2.5 pr-11 rounded-md text-sm outline-none transition-all focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(34,197,94,.25)]'

  const passwordFieldStyle: React.CSSProperties = {
    background: 'var(--color-bg-surface-2)',
    border: `1px solid ${errors.password ? 'var(--color-error-strong)' : 'var(--color-border-input)'}`,
    color: 'var(--color-fg-default)',
  }

  return (
    <form
      aria-label="Create your account"
      onSubmit={e => e.preventDefault()}
      className="flex flex-col gap-8 max-w-[560px]"
    >
      {/* Eyebrow */}
      <p
        className="text-xs font-semibold uppercase"
        style={{ letterSpacing: '0.22em', color: 'var(--color-primary-light)' }}
      >
        Step 01 · Your account
      </p>

      <div className="flex items-center gap-2">
        <h1
          className="uppercase leading-none"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 5vw, 48px)',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--color-fg-default)',
          }}
        >
          Create your account
        </h1>
        <span
          className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full"
          style={{
            letterSpacing: '0.18em',
            color: 'var(--color-primary-light)',
            background: 'var(--color-primary-tint)',
            border: '1px solid var(--color-primary-border)',
          }}
        >
          Required
        </span>
      </div>

      <p
        className="text-[15px] max-w-[580px]"
        style={{ color: 'var(--color-fg-label)', lineHeight: 1.6 }}
      >
        Enter your email and choose a password. Your account is created only once you complete
        onboarding — nothing is saved until you finish.
      </p>

      {/* Persistent late-error banner (snap-back from terms step) */}
      {credentialsLateError && (
        <div
          id={lateErrorId}
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-3 p-4 rounded-md"
          style={{
            background: 'var(--color-error-bg)',
            border: '1px solid var(--color-error-border)',
            color: 'var(--color-error-fg)',
          }}
        >
          <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm leading-snug">{credentialsLateError}</p>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={emailId}
            className="text-sm font-medium"
            style={{ color: 'var(--color-fg-label)' }}
          >
            Email address <span style={{ color: 'var(--color-error-fg)' }}>*</span>
          </label>
          <input
            id={emailId}
            ref={emailRef}
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => handleEmailChange(e.target.value)}
            onBlur={handleEmailBlur}
            required
            aria-required="true"
            aria-invalid={!!errors.email || !!credentialsLateError}
            aria-describedby={
              [
                errors.email ? emailErrorId : null,
                credentialsLateError ? lateErrorId : null,
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
            className={emailFieldClass}
            style={emailFieldStyle}
            placeholder="you@example.com"
          />
          {errors.email && (
            <p
              id={emailErrorId}
              role="alert"
              className="flex items-center gap-1.5 text-xs"
              style={{ color: 'var(--color-error-fg)' }}
            >
              <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {errors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={passwordId}
            className="text-sm font-medium"
            style={{ color: 'var(--color-fg-label)' }}
          >
            Password <span style={{ color: 'var(--color-error-fg)' }}>*</span>
          </label>
          <div className="relative">
            <input
              id={passwordId}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={e => handlePasswordChange(e.target.value)}
              required
              aria-required="true"
              aria-invalid={!!errors.password}
              aria-describedby={
                [passwordHintId, errors.password ? passwordErrorId : null]
                  .filter(Boolean)
                  .join(' ')
              }
              className={passwordFieldClass}
              style={passwordFieldStyle}
              placeholder="••••••••"
              minLength={8}
              maxLength={15}
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex items-center px-3 transition-colors"
              style={{ color: 'var(--color-fg-muted)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-fg-label)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-fg-muted)' }}
            >
              {showPassword
                ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
          {errors.password ? (
            <p
              id={passwordErrorId}
              role="alert"
              className="flex items-center gap-1.5 text-xs"
              style={{ color: 'var(--color-error-fg)' }}
            >
              <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {errors.password}
            </p>
          ) : (
            <p
              id={passwordHintId}
              className="text-xs"
              style={{ color: 'var(--color-fg-muted)' }}
            >
              8–15 characters
            </p>
          )}
        </div>
      </div>
    </form>
  )
})

StepCredentials.displayName = 'StepCredentials'
