import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { addFavorite, removeFavorite } from '../../api/trainerDiscovery'
import { Navbar } from '../../components/layout/Navbar'
import { TrainerCard } from '../../components/trainers/discovery/TrainerCard'
import { TrainerCardSkeleton } from '../../components/trainers/discovery/TrainerCardSkeleton'
import { SortDropdown } from '../../components/trainers/discovery/SortDropdown'
import { useTrainerFavorites } from '../../hooks/useTrainerFavorites'
import { useAuthStore } from '../../store/authStore'
import { useMembershipStore } from '../../store/membershipStore'
import type { TrainerDiscoverySortOption } from '../../types/trainerDiscovery'
import { getErrorMessage, type ApiErrorPayload } from '../../utils/errorMessages'

const PAGE_SIZE = 12

export function TrainerFavoritesPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const {
    activeMembership,
    fetchMyMembership,
    membershipErrorCode,
    membershipLoading,
  } = useMembershipStore()
  const isMember = Boolean(activeMembership)
  const membershipStatusPending =
    isAuthenticated &&
    activeMembership === null &&
    membershipErrorCode === null
  const shouldRedirectToMemberships = membershipErrorCode === 'NO_ACTIVE_MEMBERSHIP'

  const [sortOption, setSortOption] = useState<TrainerDiscoverySortOption>('lastName,asc')
  const [currentPage, setCurrentPage] = useState(0)
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({})
  const [favoriteLoadingId, setFavoriteLoadingId] = useState<string | null>(null)
  const [favoriteError, setFavoriteError] = useState<string | null>(null)

  const { trainers, totalPages, totalElements, loading, error, reload } = useTrainerFavorites({
    sort: sortOption,
    page: currentPage,
    size: PAGE_SIZE,
  })

  useEffect(() => {
    if (membershipStatusPending && !membershipLoading) {
      void fetchMyMembership()
    }
  }, [fetchMyMembership, membershipLoading, membershipStatusPending])

  useEffect(() => {
    if (shouldRedirectToMemberships) {
      navigate('/memberships')
    }
  }, [navigate, shouldRedirectToMemberships])

  const displayTrainers = useMemo(() => {
    return trainers
      .map((trainer) => ({
        ...trainer,
        isFavorited: favoriteOverrides[trainer.id] ?? trainer.isFavorited,
      }))
      .filter((trainer) => trainer.isFavorited)
  }, [trainers, favoriteOverrides])

  const handleToggleFavorite = async (trainerId: string) => {
    if (!isMember || favoriteLoadingId) return
    const trainer = displayTrainers.find((item) => item.id === trainerId)
    if (!trainer) return

    const originalValue = trainer.isFavorited
    const nextValue = !originalValue
    setFavoriteError(null)
    setFavoriteLoadingId(trainerId)
    setFavoriteOverrides((prev) => ({ ...prev, [trainerId]: nextValue }))

    try {
      if (nextValue) {
        await addFavorite(trainerId)
      } else {
        await removeFavorite(trainerId)
      }
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorPayload>
      const code = axiosError.response?.data?.code
      if (code !== 'ALREADY_FAVORITED' && code !== 'FAVORITE_NOT_FOUND') {
        setFavoriteOverrides((prev) => ({ ...prev, [trainerId]: originalValue }))
        setFavoriteError(getErrorMessage(code, 'Could not update favorite. Please try again.'))
      }
    } finally {
      setFavoriteLoadingId(null)
    }
  }

  if (membershipLoading || membershipStatusPending) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-2">
            <div className="h-9 w-40 animate-pulse rounded-full bg-gray-800" />
            <div className="h-4 w-80 animate-pulse rounded-full bg-gray-800" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <TrainerCardSkeleton key={`trainer-favorite-page-skeleton-${index}`} />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (!isMember) {
    navigate('/memberships')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-bold">My Favorites</h1>
          <p className="text-sm text-gray-400">All trainers you have saved for quick access.</p>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <SortDropdown
            value={sortOption}
            onChange={(value) => {
              setSortOption(value)
              setCurrentPage(0)
            }}
          />
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-2 text-xs text-gray-400">
            {totalElements} favorites
          </div>
        </div>

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

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <TrainerCardSkeleton key={`trainer-favorite-skeleton-${index}`} />
            ))}
          </div>
        )}

        {!loading && displayTrainers.length === 0 && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-10 text-center">
            <p className="text-lg font-semibold">You have no saved trainers yet.</p>
            <p className="mt-2 text-sm text-gray-400">
              Browse the trainer list to save your favorites.
            </p>
            <Link
              to="/trainers"
              className="mt-4 inline-flex items-center justify-center rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
            >
              Browse trainers
            </Link>
          </div>
        )}

        {!loading && displayTrainers.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {displayTrainers.map((trainer) => (
              <TrainerCard
                key={trainer.id}
                trainer={trainer}
                isMember={isMember}
                favoriteLoading={favoriteLoadingId === trainer.id}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Page {currentPage + 1} of {totalPages}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((value) => Math.max(value - 1, 0))}
                className="rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-600"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage((value) => value + 1)}
                className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-500/40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
