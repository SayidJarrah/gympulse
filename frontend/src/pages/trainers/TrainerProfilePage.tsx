import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { addFavorite, removeFavorite } from '../../api/trainerDiscovery'
import { AvailabilityGrid } from '../../components/trainers/discovery/AvailabilityGrid'
import { FavoriteButton } from '../../components/trainers/discovery/FavoriteButton'
import { useTrainerProfile } from '../../hooks/useTrainerProfile'
import { useAuthStore } from '../../store/authStore'
import { useMembershipStore } from '../../store/membershipStore'
import { getErrorMessage, type ApiErrorPayload } from '../../utils/errorMessages'

export function TrainerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { isAuthenticated } = useAuthStore()
  const { activeMembership, fetchMyMembership } = useMembershipStore()
  const isMember = Boolean(activeMembership)

  const { profile, loading, error, notFound, reload } = useTrainerProfile(id)
  const [favoriteValue, setFavoriteValue] = useState<boolean | null>(null)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [favoriteError, setFavoriteError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      void fetchMyMembership()
    }
  }, [isAuthenticated, fetchMyMembership])

  useEffect(() => {
    if (profile) {
      setFavoriteValue(profile.isFavorited)
    }
  }, [profile])

  const handleToggleFavorite = async () => {
    if (!profile || favoriteValue === null || !isMember || favoriteLoading) return
    const original = favoriteValue
    const nextValue = !original

    setFavoriteError(null)
    setFavoriteLoading(true)
    setFavoriteValue(nextValue)

    try {
      if (nextValue) {
        await addFavorite(profile.id)
      } else {
        await removeFavorite(profile.id)
      }
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorPayload>
      const code = axiosError.response?.data?.code
      if (code !== 'ALREADY_FAVORITED' && code !== 'FAVORITE_NOT_FOUND') {
        setFavoriteValue(original)
        setFavoriteError(getErrorMessage(code, 'Could not update favorite. Please try again.'))
      }
    } finally {
      setFavoriteLoading(false)
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-3xl font-bold">Trainer not found.</h1>
          <p className="mt-3 text-sm text-gray-400">
            We couldn&apos;t locate this trainer profile.
          </p>
          <Link
            to="/trainers"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
          >
            Back to trainers
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <span>{error}</span>
            <button
              type="button"
              onClick={reload}
              className="rounded-md border border-red-400 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/20"
            >
              Retry
            </button>
          </div>
        )}

        {favoriteError && (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {favoriteError}
          </div>
        )}

        {loading || !profile ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-8">
            <div className="h-6 w-40 rounded-full bg-gray-800 animate-pulse" />
            <div className="mt-4 h-4 w-64 rounded-full bg-gray-800 animate-pulse" />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col gap-6 rounded-2xl border border-gray-800 bg-gray-900/70 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5">
                {profile.profilePhotoUrl ? (
                  <img
                    src={profile.profilePhotoUrl}
                    alt={`${profile.firstName} ${profile.lastName}`}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-800 text-lg font-semibold text-gray-300">
                    {profile.firstName[0]}{profile.lastName[0]}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold">
                    {profile.firstName} {profile.lastName}
                  </h1>
                  <p className="text-sm text-gray-400">
                    {profile.experienceYears !== null
                      ? `${profile.experienceYears} years of experience`
                      : 'Not specified'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.specializations.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-gray-700 bg-gray-800/70 px-2.5 py-1 text-[11px] font-medium text-gray-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <FavoriteButton
                  isFavorited={favoriteValue ?? profile.isFavorited}
                  isMember={isMember}
                  loading={favoriteLoading}
                  showLabel
                  onToggle={handleToggleFavorite}
                />
                <p className="text-xs text-gray-400">{profile.classCount} scheduled classes</p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6">
              <h2 className="text-lg font-semibold">Bio</h2>
              <p className="mt-3 text-sm text-gray-400">
                {profile.bio ?? 'No bio available'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Availability Preview</h2>
                <span className="text-xs text-gray-400">Based on scheduled classes</span>
              </div>
              <AvailabilityGrid preview={profile.availabilityPreview} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
