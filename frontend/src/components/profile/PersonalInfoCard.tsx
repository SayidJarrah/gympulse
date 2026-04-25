import { useRef, useState } from 'react'
import type { UserProfile, UpdateUserProfileRequest } from '../../types/userProfile'
import { useProfileStore } from '../../store/profileStore'
import { FieldRow } from './FieldRow'

interface PersonalInfoCardProps {
  profile: UserProfile;
  avatarUrl: string | null;
  onToast: (message: string) => void;
}

function getInitials(profile: UserProfile): string {
  const first = profile.firstName?.trim().charAt(0) ?? ''
  const last = profile.lastName?.trim().charAt(0) ?? ''
  const combined = `${first}${last}`.trim()
  return combined || profile.email.slice(0, 2).toUpperCase()
}

function formatMemberSince(isoDateString: string): string {
  try {
    const date = new Date(isoDateString)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

function formatDob(isoDateString: string | null): string {
  if (!isoDateString) return ''
  try {
    const date = new Date(`${isoDateString}T00:00:00Z`)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return isoDateString
  }
}

/**
 * Builds a partial UpdateUserProfileRequest from the current profile with one field overridden.
 * All fields must be included per the PUT semantics (full replacement).
 */
function buildPatchRequest(
  profile: UserProfile,
  override: Partial<UpdateUserProfileRequest>
): UpdateUserProfileRequest {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    dateOfBirth: profile.dateOfBirth,
    fitnessGoals: profile.fitnessGoals,
    preferredClassTypes: profile.preferredClassTypes,
    emergencyContact: profile.emergencyContact,
    bio: profile.bio,
    ...override,
  }
}

const BIO_MAX = 500

function BioFieldRow({
  profile,
  isSaving,
  onToast,
}: {
  profile: UserProfile;
  isSaving: boolean;
  onToast: (msg: string) => void;
}) {
  const { saveMyProfile } = useProfileStore()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const remaining = BIO_MAX - draft.length

  function autosize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    const lineHeight = 24 // ~1.5rem
    const minRows = 3
    const maxRows = 8
    const minH = lineHeight * minRows
    const maxH = lineHeight * maxRows
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minH), maxH)}px`
  }

  const handleEdit = () => {
    setDraft(profile.bio ?? '')
    setLocalError(null)
    setEditing(true)
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        autosize(textareaRef.current)
      }
    }, 0)
  }

  const handleCancel = () => {
    setEditing(false)
    setLocalError(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setLocalError(null)
    await saveMyProfile({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      dateOfBirth: profile.dateOfBirth,
      fitnessGoals: profile.fitnessGoals,
      preferredClassTypes: profile.preferredClassTypes,
      emergencyContact: profile.emergencyContact,
      bio: draft.trim() || null,
    })
    setSaving(false)
    // After save, check if the store recorded a bio field error
    const fieldErrors = useProfileStore.getState().fieldErrors
    const bioError = fieldErrors['bio']
    if (bioError) {
      setLocalError(bioError)
    } else if (useProfileStore.getState().error) {
      setLocalError(useProfileStore.getState().error)
    } else {
      setEditing(false)
      onToast('Bio updated.')
    }
  }

  const counterColor =
    remaining === 0
      ? 'var(--color-error-fg, #F87171)'
      : remaining < 50
        ? 'var(--color-warning-fg, #FB923C)'
        : 'var(--color-fg-metadata, #6B7280)'

  return (
    <div>
      <div
        className="grid items-start gap-4 py-[18px]"
        style={{ gridTemplateColumns: '160px 1fr auto', borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Label eyebrow */}
        <div
          className="pt-[3px] text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: 'var(--color-fg-metadata, #6B7280)' }}
        >
          Bio
        </div>

        {/* Value / edit area */}
        {editing ? (
          <div className="flex flex-col gap-1.5">
            <textarea
              ref={textareaRef}
              value={draft}
              maxLength={BIO_MAX}
              rows={3}
              aria-label="Bio"
              disabled={saving || isSaving}
              onChange={(e) => {
                setDraft(e.target.value)
                autosize(e.target)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleCancel()
              }}
              className="w-full resize-none rounded-lg border border-green-500/40 bg-white/5 px-3 py-1.5 text-[15px] font-medium text-white outline-none focus:border-green-500/70 focus:ring-1 focus:ring-green-500/50 disabled:opacity-60"
              style={{ lineHeight: '1.5rem', minHeight: '4.5rem' }}
            />
            <div className="flex justify-end">
              <span
                className="text-[11px] tabular-nums"
                style={{ color: counterColor }}
                aria-live="polite"
              >
                {draft.length} / {BIO_MAX}
              </span>
            </div>
          </div>
        ) : (
          <div
            className="whitespace-pre-line text-[15px] font-medium"
            style={{ color: profile.bio ? 'white' : undefined }}
          >
            {profile.bio ?? (
              <span className="italic" style={{ color: 'var(--color-fg-muted, #9CA3AF)' }}>
                Add a short bio
              </span>
            )}
          </div>
        )}

        {/* Edit / Save + Cancel buttons */}
        {editing ? (
          <div className="flex items-center gap-2 pt-[3px]">
            <button
              type="button"
              onClick={() => { void handleSave() }}
              disabled={saving || isSaving}
              className="rounded-lg border border-green-500/30 px-3 py-1.5 text-[12px] font-medium text-green-400 transition-[filter] duration-[160ms] hover:brightness-110 disabled:opacity-50"
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving || isSaving}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] font-medium text-gray-400 transition-[filter] duration-[160ms] hover:brightness-110 disabled:opacity-50"
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleEdit}
            aria-label="Edit bio"
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-[filter] duration-[160ms] hover:brightness-110"
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--color-fg-label, #D1D5DB)',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            Edit
          </button>
        )}
      </div>

      {/* Field-level error */}
      {localError && (
        <p className="mb-2 mt-1 text-xs text-red-400" role="alert">
          {localError}
        </p>
      )}
    </div>
  )
}

export function PersonalInfoCard({ profile, avatarUrl, onToast }: PersonalInfoCardProps) {
  const { saveMyProfile, isSaving } = useProfileStore()
  const photoInputRef = useRef<HTMLInputElement>(null)

  const initials = getInitials(profile)
  const memberSince = formatMemberSince(profile.createdAt)
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email

  return (
    <div
      className="rounded-2xl p-7"
      style={{
        paddingBottom: 12,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid #1F2937',
        borderRadius: 16,
      }}
    >
      {/* Header row: avatar + name + "Change photo" */}
      <div className="flex items-center gap-5">
        {/* Avatar */}
        <div
          className="relative shrink-0 cursor-pointer"
          onClick={() => photoInputRef.current?.click()}
          title="Change photo"
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-[26px] font-bold text-[#0F0F0F] select-none"
            style={{
              background: avatarUrl ? undefined : 'linear-gradient(135deg, #22C55E, #4ADE80)',
              boxShadow: '0 8px 24px rgba(34,197,94,0.25)',
              overflow: 'hidden',
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${displayName} avatar`}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
        </div>
        {/* Hidden file input for photo change */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Change profile photo"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              useProfileStore.getState().uploadPhoto(file).then(() => {
                onToast('Photo updated.')
              }).catch(() => {
                onToast('Photo upload failed.')
              })
              e.target.value = ''
            }
          }}
        />

        {/* Name + member since */}
        <div className="flex-1 min-w-0">
          <div
            className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: 'var(--color-fg-metadata, #6B7280)' }}
          >
            Personal information
          </div>
          <div
            className="mt-1.5 font-bold uppercase leading-none"
            style={{ fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)', fontSize: 26, letterSpacing: '-0.01em', color: '#fff' }}
          >
            {displayName}
          </div>
          {memberSince && (
            <div className="mt-0.5 text-[12px] text-gray-400">
              Member since {memberSince}
            </div>
          )}
        </div>

        {/* Change photo button */}
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={isSaving}
          className="shrink-0 rounded-lg border border-white/[0.15] bg-transparent px-3.5 py-2 text-[12px] font-medium text-white transition-[filter] duration-[160ms] hover:brightness-110 disabled:opacity-50"
          style={{ whiteSpace: 'nowrap' }}
        >
          Change photo
        </button>
      </div>

      {/* Field list */}
      <div className="mt-6">
        <FieldRow
          label="Full name"
          value={[profile.firstName, profile.lastName].filter(Boolean).join(' ')}
          editAriaLabel="Edit full name"
          isSaving={isSaving}
          onSave={async (val) => {
            const parts = val.trim().split(/\s+/)
            const firstName = parts[0] ?? null
            const lastName = parts.slice(1).join(' ') || null
            await saveMyProfile(buildPatchRequest(profile, { firstName: firstName || null, lastName: lastName || null }))
            onToast('Name updated.')
          }}
        />
        <FieldRow
          label="Email"
          value={profile.email}
          editAriaLabel="Edit email"
          readOnly
          onSave={async () => { /* read-only */ }}
        />
        <FieldRow
          label="Phone"
          value={profile.phone ?? ''}
          editAriaLabel="Edit phone number"
          isSaving={isSaving}
          onSave={async (val) => {
            await saveMyProfile(buildPatchRequest(profile, { phone: val.trim() || null }))
            onToast('Phone updated.')
          }}
        />
        <FieldRow
          label="Date of birth"
          value={formatDob(profile.dateOfBirth)}
          editAriaLabel="Edit date of birth"
          isSaving={isSaving}
          onSave={async (val) => {
            await saveMyProfile(buildPatchRequest(profile, { dateOfBirth: val.trim() || null }))
            onToast('Date of birth updated.')
          }}
        />
        <FieldRow
          label="Emergency contact"
          value={
            profile.emergencyContact
              ? `${profile.emergencyContact.name} · ${profile.emergencyContact.phone}`
              : ''
          }
          editAriaLabel="Edit emergency contact"
          isSaving={isSaving}
          onSave={async (val) => {
            // Expect format "Name · Phone" or clear to remove
            const trimmed = val.trim()
            if (!trimmed) {
              await saveMyProfile(buildPatchRequest(profile, { emergencyContact: null }))
              onToast('Emergency contact removed.')
              return
            }
            const separatorIndex = trimmed.indexOf(' · ')
            if (separatorIndex === -1) {
              throw new Error('Use format: Name · Phone')
            }
            const name = trimmed.slice(0, separatorIndex).trim()
            const phone = trimmed.slice(separatorIndex + 3).trim()
            if (!name || !phone) {
              throw new Error('Both name and phone are required.')
            }
            await saveMyProfile(buildPatchRequest(profile, { emergencyContact: { name, phone } }))
            onToast('Emergency contact updated.')
          }}
        />
        <BioFieldRow profile={profile} isSaving={isSaving} onToast={onToast} />
      </div>
    </div>
  )
}
