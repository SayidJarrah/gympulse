import { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { addFavorite, removeFavorite } from '../../api/trainerDiscovery'
import { TrainerCard } from '../../components/trainers/discovery/TrainerCard'
import { TrainerCardSkeleton } from '../../components/trainers/discovery/TrainerCardSkeleton'
import { SortDropdown } from '../../components/trainers/discovery/SortDropdown'
import { SpecializationFilterPanel } from '../../components/trainers/discovery/SpecializationFilterPanel'
import { useTrainerDiscoveryList } from '../../hooks/useTrainerDiscoveryList'
import { useTrainerSpecializations } from '../../hooks/useTrainerSpecializations'
import { useAuthStore } from '../../store/authStore'
import { useMembershipStore } from '../../store/membershipStore'
import type { TrainerDiscoverySortOption } from '../../types/trainerDiscovery'
import { getErrorMessage, type ApiErrorPayload } from '../../utils/errorMessages'

const PAGE_SIZE = 12

export function TrainerListPage() {
  const { isAuthenticated } = useAuthStore()
  const { activeMembership, fetchMyMembership } = useMembershipStore()
  const isMember = Boolean(activeMembership)

  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([])
  const [sortOption, setSortOption] = useState<TrainerDiscoverySortOption>('lastName,asc')
  const [currentPage, setCurrentPage] = useState(0)
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({})
  const [favoriteLoadingId, setFavoriteLoadingId] = useState<string | null>(null)
  const [favoriteError, setFavoriteError] = useState<string | null>(null)

  const { trainers, totalPages, totalElements, loading, error, reload } =
    useTrainerDiscoveryList({
      specialization: selectedSpecializations,
      sort: sortOption,
      page: currentPage,
      size: PAGE_SIZE,
    })

  const {
    specializations,
    loading: specializationsLoading,
    error: specializationsError,
  } = useTrainerSpecializations()

  useEffect(() => {
    if (isAuthenticated) {
      void fetchMyMembership()
    }
  }, [isAuthenticated, fetchMyMembership])

  const displayTrainers = useMemo(() => {
    return trainers.map((trainer) => ({
      ...trainer,
      isFavorited: favoriteOverrides[trainer.id] ?? trainer.isFavorited,
    }))
  }, [trainers, favoriteOverrides])

  const handleClearFilters = () => {
    setSelectedSpecializations([])
    setSortOption('lastName,asc')
    setCurrentPage(0)
  }

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

  const renderEmptyState = !loading && displayTrainers.length === 0

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Trainer Discovery</h1>
          <p className="text-sm text-gray-400">
            Browse our trainers, explore their specializations, and save favorites for quick access.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-6">
            <SpecializationFilterPanel
              allSpecializations={specializations}
              selected={selectedSpecializations}
              onChange={(next) => {
                setSelectedSpecializations(next)
                setCurrentPage(0)
              }}
              disabled={specializationsLoading}
            />
            {specializationsError && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                {specializationsError}
              </div>
            )}
            <SortDropdown
              value={sortOption}
              onChange={(value) => {
                setSortOption(value)
                setCurrentPage(0)
              }}
            />
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 text-xs text-gray-400">
              Showing {totalElements} trainers
            </div>
          </div>

          <div>
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
                  <TrainerCardSkeleton key={`trainer-skeleton-${index}`} />
                ))}
              </div>
            )}

            {renderEmptyState && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-10 text-center">
                <p className="text-lg font-semibold">No trainers match your filters.</p>
                <p className="mt-2 text-sm text-gray-400">
                  Try clearing your filters to see all trainers.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="mt-4 inline-flex items-center justify-center rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
                >
                  Clear filters
                </button>
              </div>
            )}

            {!loading && !renderEmptyState && (
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
          </div>
        </div>
      </main>
    </div>
  )
}
