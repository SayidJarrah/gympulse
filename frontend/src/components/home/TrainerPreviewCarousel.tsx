import { useEffect, useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import type { TrainerDiscoveryResponse } from '../../types/trainerDiscovery'
import { MemberHomeSectionEmptyCard } from './MemberHomeSectionEmptyCard'
import { MemberHomeSectionErrorCard } from './MemberHomeSectionErrorCard'

interface Props {
  trainers: TrainerDiscoveryResponse[];
  loading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
}

export function TrainerPreviewCarousel({ trainers, loading, errorMessage, onRetry }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [activePage, setActivePage] = useState(0)
  const [pageCount, setPageCount] = useState(1)

  useEffect(() => {
    const node = viewportRef.current
    if (!node) return

    const updateState = () => {
      const nextPageCount = Math.max(1, Math.ceil(node.scrollWidth / Math.max(node.clientWidth, 1)))
      setPageCount(nextPageCount)
      const nextPage = Math.min(
        nextPageCount - 1,
        Math.round(node.scrollLeft / Math.max(node.clientWidth, 1))
      )
      setActivePage(nextPage)
    }

    updateState()
    node.addEventListener('scroll', updateState, { passive: true })
    window.addEventListener('resize', updateState)

    return () => {
      node.removeEventListener('scroll', updateState)
      window.removeEventListener('resize', updateState)
    }
  }, [trainers.length, loading])

  const scrollByPage = (direction: -1 | 1) => {
    const node = viewportRef.current
    if (!node) return
    node.scrollBy({
      left: direction * Math.max(node.clientWidth * 0.9, 280),
      behavior: 'smooth',
    })
  }

  const scrollToPage = (page: number) => {
    const node = viewportRef.current
    if (!node) return
    node.scrollTo({
      left: page * node.clientWidth,
      behavior: 'smooth',
    })
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold leading-tight text-white">Meet the coaches</h2>
          <p className="mt-1 text-sm text-gray-400">
            Browse a few standout trainers and jump into the full roster when you want more detail.
          </p>
        </div>
        <Link
          to="/trainers"
          className="inline-flex items-center gap-2 text-sm font-medium text-green-400 transition-colors duration-200 hover:text-green-300"
        >
          See all trainers
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-hidden" aria-label="Loading trainers">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="min-w-[280px] max-w-[280px] flex-1 rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-md shadow-black/40"
            >
              <div className="animate-pulse space-y-4">
                <div className="h-44 rounded-xl bg-gray-800" />
                <div className="h-6 w-36 rounded-full bg-gray-800" />
                <div className="h-4 w-28 rounded-full bg-gray-800" />
                <div className="flex gap-2">
                  <div className="h-7 w-20 rounded-full bg-gray-800" />
                  <div className="h-7 w-20 rounded-full bg-gray-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        <MemberHomeSectionErrorCard
          title="Could not load trainers right now."
          body={errorMessage}
          onRetry={onRetry}
        />
      ) : trainers.length === 0 ? (
        <MemberHomeSectionEmptyCard
          title="No trainers to show yet"
          body="Trainer profiles will appear here once the roster is ready."
        />
      ) : (
        <>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              disabled={activePage === 0}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-700 bg-gray-900 text-gray-300 transition-colors duration-200 hover:border-gray-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Previous"
            >
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              disabled={activePage >= pageCount - 1}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-700 bg-gray-900 text-gray-300 transition-colors duration-200 hover:border-gray-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Next"
            >
              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div
            ref={viewportRef}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
          >
            {trainers.map((trainer) => {
              const displayedSpecializations = trainer.specializations.slice(0, 2)
              const extraCount = Math.max(trainer.specializations.length - displayedSpecializations.length, 0)
              const supportingLine =
                trainer.experienceYears !== null
                  ? `${trainer.experienceYears} yrs experience`
                  : 'Experience not specified'

              return (
                <article
                  key={trainer.id}
                  className="min-w-[280px] max-w-[280px] snap-start rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-md shadow-black/40 transition-all duration-200 hover:border-gray-700 hover:-translate-y-0.5"
                >
                  <Link to={`/trainers/${trainer.id}`} className="block focus-visible:outline-none">
                    {trainer.profilePhotoUrl ? (
                      <img
                        src={trainer.profilePhotoUrl}
                        alt={`${trainer.firstName} ${trainer.lastName}`}
                        className="h-44 w-full rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-44 w-full items-center justify-center rounded-xl bg-gray-800 text-3xl font-semibold text-gray-500">
                        {trainer.firstName[0]}
                        {trainer.lastName[0]}
                      </div>
                    )}
                  </Link>

                  <div className="mt-4">
                    <Link
                      to={`/trainers/${trainer.id}`}
                      className="text-lg font-semibold leading-tight text-white hover:text-green-300"
                    >
                      {trainer.firstName} {trainer.lastName}
                    </Link>
                    <p className="mt-1 text-sm text-gray-400">{supportingLine}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {displayedSpecializations.map((specialization) => (
                      <span
                        key={`${trainer.id}-${specialization}`}
                        className="rounded-full border border-gray-700 bg-[#0F0F0F] px-3 py-1 text-xs font-medium text-gray-300"
                      >
                        {specialization}
                      </span>
                    ))}
                    {extraCount > 0 && (
                      <span className="rounded-full border border-gray-700 bg-[#0F0F0F] px-3 py-1 text-xs font-medium text-gray-400">
                        +{extraCount}
                      </span>
                    )}
                  </div>

                  <Link
                    to={`/trainers/${trainer.id}`}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-green-400 hover:text-green-300"
                  >
                    View profile
                  </Link>
                </article>
              )
            })}
          </div>

          <div className="flex justify-center gap-2">
            {Array.from({ length: pageCount }).map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => scrollToPage(index)}
                className={`h-2.5 rounded-full transition-all duration-200 ${
                  index === activePage ? 'w-8 bg-green-500' : 'w-2.5 bg-gray-700 hover:bg-gray-600'
                }`}
                aria-label={`Go to trainer slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
