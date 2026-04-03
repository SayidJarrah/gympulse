import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Navbar } from '../../components/layout/Navbar'
import { GroupScheduleViewTabs } from '../../components/schedule/GroupScheduleViewTabs'
import { GroupSchedulePeriodNavigator } from '../../components/schedule/GroupSchedulePeriodNavigator'
import { GroupScheduleWeekGrid } from '../../components/schedule/GroupScheduleWeekGrid'
import { GroupScheduleDayAgenda } from '../../components/schedule/GroupScheduleDayAgenda'
import { GroupScheduleRollingList } from '../../components/schedule/GroupScheduleRollingList'
import { GroupScheduleEntryModal } from '../../components/schedule/GroupScheduleEntryModal'
import { useGroupClassSchedule } from '../../hooks/useGroupClassSchedule'
import { useScheduleTimeZone } from '../../hooks/useScheduleTimeZone'
import { useGroupClassScheduleStore } from '../../store/groupClassScheduleStore'
import type {
  GroupClassScheduleEntry,
  ScheduleView,
} from '../../types/groupClassSchedule'
import {
  addDaysToIsoDate,
  getTodayIsoDate,
  isValidIsoDate,
} from '../../utils/scheduleDates'

const VALID_VIEWS: ScheduleView[] = ['week', 'day', 'list']
const INVALID_QUERY_CODES = new Set([
  'INVALID_SCHEDULE_VIEW',
  'INVALID_ANCHOR_DATE',
  'INVALID_TIME_ZONE',
])

export function GroupClassesSchedulePage() {
  const timeZone = useScheduleTimeZone()
  const [searchParams, setSearchParams] = useSearchParams()
  const { fetchSchedule } = useGroupClassScheduleStore()

  const rawView = searchParams.get('view')
  const rawDate = searchParams.get('date')

  const isViewValid = rawView ? VALID_VIEWS.includes(rawView as ScheduleView) : false
  const isDateValid = rawDate ? isValidIsoDate(rawDate) : false
  const isViewMissing = !rawView
  const isDateMissing = !rawDate
  const hasInvalidParams =
    (!isViewMissing && !isViewValid) || (!isDateMissing && !isDateValid)

  const todayIso = useMemo(() => getTodayIsoDate(timeZone), [timeZone])
  const activeView: ScheduleView = isViewValid ? (rawView as ScheduleView) : 'week'
  const activeAnchorDate = isDateValid ? (rawDate as string) : todayIso

  useEffect(() => {
    if (hasInvalidParams) return

    if (isViewMissing || isDateMissing) {
      setSearchParams(
        {
          view: isViewValid ? (rawView as string) : 'week',
          date: isDateValid ? (rawDate as string) : todayIso,
        },
        { replace: true }
      )
    }
  }, [
    hasInvalidParams,
    isViewMissing,
    isDateMissing,
    isViewValid,
    isDateValid,
    rawView,
    rawDate,
    setSearchParams,
    todayIso,
  ])

  const scheduleParams =
    !hasInvalidParams && isViewValid && isDateValid
      ? {
          view: rawView as ScheduleView,
          anchorDate: rawDate as string,
          timeZone,
        }
      : null

  const { schedule, isLoading, error, errorCode } = useGroupClassSchedule(scheduleParams)

  const [selectedEntry, setSelectedEntry] = useState<GroupClassScheduleEntry | null>(null)
  const [selectionStale, setSelectionStale] = useState(false)

  useEffect(() => {
    if (!selectedEntry || !schedule) return
    const refreshed = schedule.entries.find((entry) => entry.id === selectedEntry.id)
    if (!refreshed) {
      setSelectionStale(true)
      return
    }
    setSelectedEntry(refreshed)
    setSelectionStale(false)
  }, [schedule, selectedEntry])

  const isInvalidState = hasInvalidParams || INVALID_QUERY_CODES.has(errorCode ?? '')
  const isMembershipRequired = errorCode === 'NO_ACTIVE_MEMBERSHIP'
  const isLoadError = Boolean(error) && !isInvalidState && !isMembershipRequired

  const handleViewChange = (nextView: ScheduleView) => {
    setSearchParams({ view: nextView, date: activeAnchorDate })
  }

  const handlePrevious = () => {
    const delta = activeView === 'week' ? -7 : activeView === 'day' ? -1 : -14
    const nextDate = addDaysToIsoDate(activeAnchorDate, delta, timeZone)
    setSearchParams({ view: activeView, date: nextDate })
  }

  const handleNext = () => {
    const delta = activeView === 'week' ? 7 : activeView === 'day' ? 1 : 14
    const nextDate = addDaysToIsoDate(activeAnchorDate, delta, timeZone)
    setSearchParams({ view: activeView, date: nextDate })
  }

  const handleToday = () => {
    setSearchParams({ view: activeView, date: todayIso })
  }

  const handleResetInvalid = () => {
    setSearchParams({ view: 'week', date: todayIso })
  }

  const handleRetry = () => {
    if (!scheduleParams) return
    void fetchSchedule(scheduleParams)
  }

  const showToolbar = !isLoading && !isInvalidState && !isMembershipRequired && !isLoadError
  const showTimeZoneBadge = showToolbar && Boolean(schedule)

  const entries = schedule?.entries ?? []
  const isEmpty = Boolean(schedule) && entries.length === 0

  return (
    <div
      className="min-h-screen bg-[#0F0F0F] text-white overflow-x-hidden"
      data-testid="schedule-root"
    >
      <Navbar />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <ScheduleHeaderSkeleton />
        ) : (
          <SchedulePageHeader timeZone={schedule?.timeZone ?? timeZone} showBadge={showTimeZoneBadge} />
        )}

        {isLoading && <ScheduleToolbarSkeleton />}

        {showToolbar && schedule && (
          <section className="sticky top-16 z-30 rounded-2xl border border-gray-800 bg-gray-900/95 shadow-lg shadow-black/40 backdrop-blur">
            <div className="flex flex-col gap-4 px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
              <GroupScheduleViewTabs
                view={activeView}
                onChange={handleViewChange}
                disabled={isLoading}
              />
              <GroupSchedulePeriodNavigator
                view={activeView}
                anchorDate={activeAnchorDate}
                timeZone={schedule.timeZone}
                week={schedule.week}
                rangeStartDate={schedule.rangeStartDate}
                rangeEndDateExclusive={schedule.rangeEndDateExclusive}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onToday={handleToday}
                disabled={isLoading}
              />
            </div>
          </section>
        )}

        {isInvalidState && (
          <ScheduleInvalidLinkState onReset={handleResetInvalid} />
        )}

        {isMembershipRequired && (
          <MembershipRequiredState />
        )}

        {isLoadError && (
          <ScheduleLoadErrorState onRetry={handleRetry} />
        )}

        {isLoading && <ScheduleViewSkeleton view={activeView} />}

        {!isLoading && !isInvalidState && !isMembershipRequired && !isLoadError && schedule && (
          <div className="flex flex-col gap-6">
            {isEmpty && (
              <ScheduleEmptyState view={activeView} onToday={handleToday} />
            )}

            {!isEmpty && activeView === 'week' && (
              <GroupScheduleWeekGrid
                anchorDate={activeAnchorDate}
                timeZone={schedule.timeZone}
                entries={entries}
                onSelectEntry={(entry) => {
                  setSelectedEntry(entry)
                  setSelectionStale(false)
                }}
              />
            )}

            {!isEmpty && activeView === 'day' && (
              <GroupScheduleDayAgenda
                anchorDate={activeAnchorDate}
                timeZone={schedule.timeZone}
                entries={entries}
                onSelectEntry={(entry) => {
                  setSelectedEntry(entry)
                  setSelectionStale(false)
                }}
              />
            )}

            {!isEmpty && activeView === 'list' && (
              <GroupScheduleRollingList
                timeZone={schedule.timeZone}
                entries={entries}
                onSelectEntry={(entry) => {
                  setSelectedEntry(entry)
                  setSelectionStale(false)
                }}
              />
            )}
          </div>
        )}
      </main>

      <GroupScheduleEntryModal
        isOpen={Boolean(selectedEntry)}
        entry={selectedEntry}
        isStale={selectionStale}
        timeZone={schedule?.timeZone ?? timeZone}
        onClose={() => {
          setSelectedEntry(null)
          setSelectionStale(false)
        }}
      />
    </div>
  )
}

interface SchedulePageHeaderProps {
  timeZone: string;
  showBadge: boolean;
}

function SchedulePageHeader({ timeZone, showBadge }: SchedulePageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold leading-tight text-white">Group Classes</h1>
        <p className="text-base text-gray-400">
          Browse the live programme included with your membership.
        </p>
      </div>
      {showBadge && (
        <span className="inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-xs font-medium text-gray-300">
          Times shown in {timeZone}
        </span>
      )}
    </div>
  )
}

function ScheduleHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-8 w-52 rounded-full bg-gray-800 animate-pulse" />
      <div className="h-4 w-72 rounded-full bg-gray-800 animate-pulse" />
    </div>
  )
}

function ScheduleToolbarSkeleton() {
  return (
    <section className="sticky top-16 z-30 rounded-2xl border border-gray-800 bg-gray-900/95 shadow-lg shadow-black/40 backdrop-blur">
      <div className="flex flex-col gap-4 px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-full rounded-xl border border-gray-800 bg-[#0F0F0F] p-1 sm:w-auto">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-10 flex-1 rounded-lg bg-gray-800/70 animate-pulse"
            />
          ))}
        </div>
        <GroupSchedulePeriodNavigator
          view="week"
          anchorDate={getTodayIsoDate('UTC')}
          timeZone="UTC"
          onPrevious={() => undefined}
          onNext={() => undefined}
          onToday={() => undefined}
          isLoading
        />
      </div>
    </section>
  )
}

interface ScheduleViewSkeletonProps {
  view: ScheduleView;
}

function ScheduleViewSkeleton({ view }: ScheduleViewSkeletonProps) {
  if (view === 'day') {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900 shadow-md shadow-black/50">
        <div className="border-b border-gray-800 px-6 py-5">
          <div className="h-5 w-32 rounded-full bg-gray-800 animate-pulse" />
          <div className="mt-2 h-4 w-48 rounded-full bg-gray-800 animate-pulse" />
        </div>
        <div className="divide-y divide-gray-800">
          {[1, 2, 3].map((item) => (
            <div key={item} className="p-4">
              <div className="h-24 rounded-xl bg-gray-900 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (view === 'list') {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2].map((item) => (
          <div key={item} className="rounded-2xl border border-gray-800 bg-gray-900">
            <div className="border-b border-gray-800 px-5 py-4">
              <div className="h-4 w-32 rounded-full bg-gray-800 animate-pulse" />
            </div>
            <div className="divide-y divide-gray-800">
              {[1, 2].map((row) => (
                <div key={row} className="p-4">
                  <div className="h-24 rounded-xl bg-gray-900 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-4 lg:hidden">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-gray-800 bg-gray-900">
            <div className="border-b border-gray-800 px-4 py-4">
              <div className="h-4 w-16 rounded-full bg-gray-800 animate-pulse" />
              <div className="mt-2 h-5 w-24 rounded-full bg-gray-800 animate-pulse" />
            </div>
            <div className="p-4">
              <div className="h-24 rounded-xl bg-gray-900 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden lg:grid lg:grid-cols-7 lg:gap-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="min-h-[18rem] rounded-2xl border border-gray-800 bg-gray-900">
            <div className="border-b border-gray-800 px-4 py-4">
              <div className="h-4 w-16 rounded-full bg-gray-800 animate-pulse" />
              <div className="mt-2 h-4 w-20 rounded-full bg-gray-800 animate-pulse" />
            </div>
            <div className="p-4">
              <div className="h-24 rounded-xl bg-gray-900 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MembershipRequiredState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-gray-800 bg-gray-900 px-6 py-16 text-center shadow-md shadow-black/50">
      <h2 className="text-xl font-semibold text-white">Membership required</h2>
      <p className="text-sm text-gray-400">
        Group classes are available to Members with an active membership. Renew or choose a plan
        to view the live programme.
      </p>
      <Link
        to="/plans"
        className="inline-flex items-center justify-center rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
      >
        Browse plans
      </Link>
    </div>
  )
}

interface ScheduleInvalidLinkStateProps {
  onReset: () => void;
}

function ScheduleInvalidLinkState({ onReset }: ScheduleInvalidLinkStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-6 py-14 text-center">
      <h2 className="text-xl font-semibold text-white">This schedule link is out of date</h2>
      <p className="text-sm text-gray-200">
        Reset to the current week to keep browsing the latest group classes.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center justify-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      >
        Reset to current week
      </button>
    </div>
  )
}

interface ScheduleLoadErrorStateProps {
  onRetry: () => void;
}

function ScheduleLoadErrorState({ onRetry }: ScheduleLoadErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-14 text-center">
      <h2 className="text-xl font-semibold text-white">Schedule unavailable</h2>
      <p className="text-sm text-gray-200">
        We couldn’t load the latest group classes. Please try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-center rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        Retry schedule
      </button>
    </div>
  )
}

interface ScheduleEmptyStateProps {
  view: ScheduleView;
  onToday: () => void;
}

function ScheduleEmptyState({ view, onToday }: ScheduleEmptyStateProps) {
  const heading =
    view === 'list'
      ? 'No group classes in this 14-day window'
      : 'No group classes in this period'

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-gray-800 bg-gray-900 px-6 py-16 text-center">
      <h2 className="text-xl font-semibold text-white">{heading}</h2>
      <p className="text-sm text-gray-400">
        Try another date range or jump back to today’s schedule.
      </p>
      <button
        type="button"
        onClick={onToday}
        className="inline-flex items-center justify-center rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
      >
        Go to today
      </button>
    </div>
  )
}
