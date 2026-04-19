import { useRef, useState, useId, forwardRef, useImperativeHandle } from 'react'
import { useOnboardingStore } from '../../../store/onboardingStore'
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
      const errs: Record<string, string> = {}
      if (!firstName.trim()) errs.firstName = 'First name is required'
      if (!lastName.trim()) errs.lastName = 'Last name is required'
      if (!phone.trim()) errs.phone = 'Phone number is required'
      if (!dob) {
        errs.dob = 'Date of birth is required'
      } else {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dobDate = new Date(dob + 'T00:00:00')
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
        await updateMyProfile({
          firstName,
          lastName,
          phone: toE164(phone),
          dateOfBirth: dob,
          fitnessGoals: store.goals,
          preferredClassTypes: store.classTypes,
          emergencyContact: null,
        })

        if (photoFile) {
          await uploadMyProfilePhoto(photoFile)
        }

        store.setProfileFields({ firstName, lastName, phone, dob })
        return true
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } } }
        setApiError(err?.response?.data?.error ?? 'Unable to save profile. Try again.')
        return false
      }
    }
  }))

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhone(e.target.value))
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

  const fieldClass = "w-full px-4 py-2.5 rounded-md text-sm outline-none transition-all focus:ring-2 focus:ring-green-500/25"
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
        <p className="text-sm" style={{ color: 'var(--color-error-fg)' }}>{apiError}</p>
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
            onChange={e => setFirstName(e.target.value)}
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
            onChange={e => setLastName(e.target.value)}
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
            onChange={e => setDob(e.target.value)}
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
