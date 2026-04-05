import { useEffect, useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import type { MemberHomeClassPreviewItem } from '../../types/memberHome'
import {
  formatShortDateLabel,
  formatTimeRange,
} from '../../utils/scheduleFormatters'
import { MemberHomeSectionEmptyCard } from './MemberHomeSectionEmptyCard'
import { MemberHomeSectionErrorCard } from './MemberHomeSectionErrorCard'

interface Props {
  entries: MemberHomeClassPreviewItem[];
  timeZone: string;
  loading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
}

export function ClassPreviewCarousel({
  entries,
  timeZone,
  loading,
  errorMessage,
  onRetry,
}: Props) {
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
  }, [entries.length, loading])

  const scrollByPage = (direction: -1 | 1) => {
    const node = viewportRef.current
    if (!node) return
    node.scrollBy({
      left: direction * Math.max(node.clientWidth * 0.9, 304),
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
          <h2 className="text-xl font-semibold leading-tight text-white">Next up in the club</h2>
          <p className="mt-1 text-sm text-gray-400">
            A quick look at the upcoming group programme before you open the full schedule.
          </p>
        </div>
        <Link
          to="/schedule"
          className="inline-flex items-center gap-2 text-sm font-medium text-green-400 transition-colors duration-200 hover:text-green-300"
        >
          See full schedule
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-hidden" aria-label="Loading upcoming classes">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="min-w-[304px] max-w-[304px] rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-md shadow-black/40"
            >
              <div className="animate-pulse space-y-4">
                <div className="h-44 rounded-xl bg-gray-800" />
                <div className="h-6 w-44 rounded-full bg-gray-800" />
                <div className="h-4 w-32 rounded-full bg-gray-800" />
                <div className="h-4 w-40 rounded-full bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        <MemberHomeSectionErrorCard
          title="Classes unavailable"
          body={errorMessage}
          onRetry={onRetry}
        />
      ) : entries.length === 0 ? (
        <MemberHomeSectionEmptyCard
          title="No upcoming classes"
          body="There are no scheduled group classes in the current preview window."
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
            {entries.map((entry) => (
              <article
                key={entry.id}
                className="min-w-[304px] max-w-[304px] snap-start rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-md shadow-black/40"
              >
                {entry.classPhotoUrl ? (
                  <img
                    src={entry.classPhotoUrl}
                    alt={entry.name}
                    className="h-44 w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center rounded-xl bg-gray-800 px-6 text-center text-sm font-medium text-gray-400">
                    Club class preview
                  </div>
                )}

                <div className="mt-4">
                  <p className="text-lg font-semibold leading-tight text-white">{entry.name}</p>
                  <p className="mt-2 text-sm text-gray-400">
                    {formatShortDateLabel(entry.localDate, timeZone)}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    {formatTimeRange(entry.scheduledAt, entry.durationMin, timeZone)}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300">
                    {entry.durationMin} min
                  </span>
                  <span className="inline-flex items-center rounded-full border border-gray-700 bg-[#0F0F0F] px-3 py-1 text-xs font-medium text-gray-300">
                    {entry.trainerDisplayName}
                  </span>
                </div>

                <Link
                  to="/schedule"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-green-400 hover:text-green-300"
                >
                  See full schedule
                </Link>
              </article>
            ))}
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
                aria-label={`Go to class slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
