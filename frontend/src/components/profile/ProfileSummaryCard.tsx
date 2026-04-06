import type { UserProfile } from '../../types/userProfile'

interface ProfileSummaryCardProps {
  profile: UserProfile;
}

function getInitials(profile: UserProfile): string {
  const first = profile.firstName?.trim().charAt(0) ?? ''
  const last = profile.lastName?.trim().charAt(0) ?? ''
  const initials = `${first}${last}`.trim()
  return initials || 'GF'
}

function getDisplayName(profile: UserProfile): string {
  const parts = [profile.firstName?.trim(), profile.lastName?.trim()].filter(Boolean)
  if (parts.length === 0) {
    return 'Profile not completed yet'
  }
  return parts.join(' ')
}

function hasEditableValue(profile: UserProfile): boolean {
  return Boolean(
    profile.firstName ||
      profile.lastName ||
      profile.phone ||
      profile.dateOfBirth ||
      profile.fitnessGoals.length > 0 ||
      profile.preferredClassTypes.length > 0
  )
}

function formatDateTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoString
  }
}

export function ProfileSummaryCard({ profile }: ProfileSummaryCardProps) {
  const initials = getInitials(profile)
  const displayName = getDisplayName(profile)
  const helperCopy = hasEditableValue(profile)
    ? 'Keep these details accurate so GymFlow can personalize future experiences.'
    : 'Complete your profile to keep your account details current.'

  return (
    <aside className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-md shadow-black/50">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-xl font-bold text-green-400 ring-1 ring-green-500/30">
          {initials}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight text-white">{displayName}</h2>
          <p className="mt-1 break-all text-sm text-gray-400">{profile.email}</p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-800 bg-[#0F0F0F] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
          Account email
        </p>
        <p className="mt-2 break-all text-sm text-white">{profile.email}</p>
        <p className="mt-2 text-xs text-gray-400">
          Email is your login identity and cannot be changed here.
        </p>
      </div>

      <p className="mt-6 text-sm text-gray-400">{helperCopy}</p>
      <p className="mt-3 text-xs text-gray-500">Last updated {formatDateTime(profile.updatedAt)}</p>
    </aside>
  )
}
