import { useRef, useState, useId, forwardRef, useImperativeHandle } from 'react'
import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { useOnboardingStore } from '../../../store/onboardingStore'
import { useAuthStore } from '../../../store/authStore'
import { updateMyProfile, uploadMyProfilePhoto } from '../../../api/profile'

export interface StepProfileHandle {
  submit: () => Promise<boolean>
}

// US phone format: (###) ###-####
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

// Convert (###) ###-#### to E.164 +1XXXXXXXXXX
function toE164(formatted: string): string {
  const digits = formatted.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return `+${digits}`
}

export const StepProfile = forwardRef<StepProfileHandle, object>((_props, ref) => {
  const store = useOnboardingStore()
  const firstNameId = useId()
  const lastNameId = useId()
  const phoneId = useId()
  const dobId = useId()

  const [firstName, setFirstName] = useState(store.firstName)
  const [lastName, setLastName] = useState(store.lastName)
  const [phone, setPhone] = useState(store.phone)
  const [dob, setDob] = useState(store.dob)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    async submit(): Promise<boolean> {
      // RULE: Read field values from the Zustand store, NOT from local useState.
      // OnboardingShell renders both the desktop (lg:grid) and mobile (lg:hidden)
      // <StepContent> trees simultaneously, sharing the same step refs. Whichever
      // instance mounts last wins the useImperativeHandle race — and since every
      // onChange here writes to the store, the parent re-renders both children on
      // each keystroke, leaving ref.current pointing at the mobile instance whose
      // local useState is empty (mobile inputs are display:none and never receive
      // user events). Reading from the store sidesteps the race entirely. See the
      // analogous workaround for the terms step in OnboardingShell.tsx (~line 162).
      const s = useOnboardingStore.getState()
      const firstNameVal = s.firstName.trim()
      const lastNameVal = s.lastName.trim()
      const phoneVal = s.phone.trim()
      const dobVal = s.dob

      const errs: Record<string, string> = {}
      if (!firstNameVal) errs.firstName = 'First name is required'
      if (!lastNameVal) errs.lastName = 'Last name is required'
      if (!phoneVal) errs.phone = 'Phone number is required'
      if (!dobVal) {
        errs.dob = 'Date of birth is required'
      } else {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dobDate = new Date(dobVal + 'T00:00:00')
        if (dobDate > today) {
          errs.dob = 'Date of birth cannot be in the future'
        } else {
          const minDob = new Date(today)
          minDob.setFullYear(minDob.getFullYear() - 16)
          if (dobDate > minDob) {
            errs.dob = 'You must be at least 16 years old to join'
          }
        }
      }
      setErrors(errs)
      if (Object.keys(errs).length > 0) return false

      try {
        setApiError(null)

        // Unified-signup flow: a guest moving through the wizard is NOT yet
        // authenticated — the `users` row is only created at terms submission
        // (SDD §4.4, AC-05). When unauthenticated, persist locally only and let
        // the combined-payload register at terms send these fields. When the
        // user IS authenticated (e.g. an existing user resuming onboarding),
        // honour the original behaviour and PUT to the profile endpoint so
        // server-side validation surfaces here rather than at terms.
        const isAuthenticated = useAuthStore.getState().isAuthenticated

        if (isAuthenticated) {
          await updateMyProfile({
            firstName: firstNameVal,
            lastName: lastNameVal,
            phone: toE164(phoneVal),
            dateOfBirth: dobVal,
            fitnessGoals: s.goals,
            preferredClassTypes: s.classTypes,
            emergencyContact: null,
          })

          if (photoFile) {
            await uploadMyProfilePhoto(photoFile)
          }
        }

        // Normalize trimmed values back into the store so downstream steps and
        // the terms-step combined register payload see the cleaned strings.
        s.setProfileFields({
          firstName: firstNameVal,
          lastName: lastNameVal,
          phone: phoneVal,
          dob: dobVal,
        })
        return true
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } } }
        setApiError(err?.response?.data?.error ?? 'Unable to save profile. Try again.')
        return false
      }
    }
  }))

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhone(e.target.value)
    setPhone(formatted)
    store.setProfileFields({ firstName, lastName, phone: formatted, dob })
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, photo: 'Photo must be under 5 MB' }))
      return
    }
    setErrors(prev => { const n = { ...prev }; delete n.photo; return n })
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function removePhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const fieldClass = "w-full px-4 py-2.5 rounded-md text-sm outline-none transition-all focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(34,197,94,.25)]"
  const fieldStyle = {
    background: 'var(--color-bg-surface-2)',
    border: '1px solid var(--color-border-input)',
    color: 'var(--color-fg-default)',
  }

  return (
    <div className="flex flex-col gap-8 max-w-[560px]">
      {/* Eyebrow */}
      <p
        className="text-xs font-semibold uppercase"
        style={{ letterSpacing: '0.22em', color: 'var(--color-primary-light)' }}
      >
        Step 02 · Your profile
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
          Your profile
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

      {apiError && (
        <p className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-error-fg)' }}>
          <ExclamationCircleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {apiError}
        </p>
      )}

      <div className="flex flex-col gap-5">
        {/* Photo */}
        <div className="flex items-center gap-4">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden shrink-0"
            style={{
              background: 'var(--color-bg-surface-2)',
              border: '1px solid var(--color-border-card)',
            }}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--color-fg-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
              style={{
                border: '1px solid var(--color-border-card)',
                color: 'var(--color-fg-label)',
                background: 'transparent',
              }}
            >
              {photoPreview ? 'Change photo' : 'Add a photo'}
            </button>
            {photoPreview && (
              <button
                type="button"
                onClick={removePhoto}
                className="text-xs"
                style={{ color: 'var(--color-fg-muted)' }}
              >
                Remove
              </button>
            )}
            <p className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>JPG or PNG · up to 5 MB</p>
            {errors.photo && <p className="text-xs" style={{ color: 'var(--color-error-fg)' }}>{errors.photo}</p>}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handlePhotoChange}
              aria-label="Upload profile photo"
            />
          </div>
        </div>

        {/* First name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={firstNameId} className="text-sm font-medium" style={{ color: 'var(--color-fg-label)' }}>
            First name <span style={{ color: 'var(--color-error-fg)' }}>*</span>
          </label>
          <input
            id={firstNameId}
            type="text"
            autoFocus
            value={firstName}
            onChange={e => {
              setFirstName(e.target.value)
              store.setProfileFields({ firstName: e.target.value, lastName, phone, dob })
            }}
            required
            aria-required="true"
            className={fieldClass}
            style={fieldStyle}
            placeholder="Jane"
          />
          {errors.firstName && (
            <p className="text-xs" style={{ color: 'var(--color-error-fg)' }}>{errors.firstName}</p>
          )}
        </div>

        {/* Last name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={lastNameId} className="text-sm font-medium" style={{ color: 'var(--color-fg-label)' }}>
            Last name <span style={{ color: 'var(--color-error-fg)' }}>*</span>
          </label>
          <input
            id={lastNameId}
            type="text"
            value={lastName}
            onChange={e => {
              setLastName(e.target.value)
              store.setProfileFields({ firstName, lastName: e.target.value, phone, dob })
            }}
            required
            aria-required="true"
            className={fieldClass}
            style={fieldStyle}
            placeholder="Smith"
          />
          {errors.lastName && (
            <p className="text-xs" style={{ color: 'var(--color-error-fg)' }}>{errors.lastName}</p>
          )}
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={phoneId} className="text-sm font-medium" style={{ color: 'var(--color-fg-label)' }}>
            Phone <span style={{ color: 'var(--color-error-fg)' }}>*</span>
          </label>
          <input
            id={phoneId}
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            required
            aria-required="true"
            className={fieldClass}
            style={fieldStyle}
            placeholder="(555) 000-0000"
          />
          {errors.phone && (
            <p className="text-xs" style={{ color: 'var(--color-error-fg)' }}>{errors.phone}</p>
          )}
        </div>

        {/* Date of birth */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={dobId} className="text-sm font-medium" style={{ color: 'var(--color-fg-label)' }}>
            Date of birth <span style={{ color: 'var(--color-error-fg)' }}>*</span>
          </label>
          <input
            id={dobId}
            type="date"
            value={dob}
            onChange={e => {
              setDob(e.target.value)
              store.setProfileFields({ firstName, lastName, phone, dob: e.target.value })
            }}
            required
            aria-required="true"
            className={fieldClass}
            style={{ ...fieldStyle, colorScheme: 'dark' }}
          />
          {errors.dob && (
            <p className="text-xs" style={{ color: 'var(--color-error-fg)' }}>{errors.dob}</p>
          )}
        </div>
      </div>
    </div>
  )
})

StepProfile.displayName = 'StepProfile'
