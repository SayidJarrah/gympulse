import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { MemberNav } from '../../components/layout/MemberNav'
import { BookingConfirmModal } from '../../components/schedule/BookingConfirmModal'
import { BookingSummaryBar } from '../../components/schedule/BookingSummaryBar'
import { BookingToast } from '../../components/schedule/BookingToast'
import { CancelBookingModal } from '../../components/schedule/CancelBookingModal'
import { GroupScheduleViewTabs } from '../../components/schedule/GroupScheduleViewTabs'
import { GroupSchedulePeriodNavigator } from '../../components/schedule/GroupSchedulePeriodNavigator'
import { GroupScheduleWeekGrid } from '../../components/schedule/GroupScheduleWeekGrid'
import { GroupScheduleDayAgenda } from '../../components/schedule/GroupScheduleDayAgenda'
import { GroupScheduleRollingList } from '../../components/schedule/GroupScheduleRollingList'
import { GroupScheduleEntryModal } from '../../components/schedule/GroupScheduleEntryModal'
import { MyBookingsDrawer } from '../../components/schedule/MyBookingsDrawer'
import { useGroupClassSchedule } from '../../hooks/useGroupClassSchedule'
import { useScheduleTimeZone } from '../../hooks/useScheduleTimeZone'
import { useAuthStore } from '../../store/authStore'
import { useBookingStore } from '../../store/bookingStore'
import { useGroupClassScheduleStore } from '../../store/groupClassScheduleStore'
import type { BookingResponse } from '../../types/booking'
import type {
  GroupClassScheduleEntry,
  ScheduleView,
} from '../../types/groupClassSchedule'
import { getBookingErrorMessage } from '../../utils/errorMessages'
import {
  formatRangeLabel,
  formatShortDateLabel,
} from '../../utils/scheduleFormatters'
import {
  addDaysToIsoDate,
  formatIsoDate,
  getTodayIsoDate,
  isValidIsoDate,
} from '../../utils/scheduleDates'

const VALID_VIEWS: ScheduleView[] = ['week', 'day', 'list']
const INVALID_QUERY_CODES = new Set([
  'INVALID_SCHEDULE_VIEW',
  'INVALID_ANCHOR_DATE',
  'INVALID_TIME_ZONE',
])

interface ToastState {
  kind: 'success' | 'error';
  message: string;
}

function getCancellationCutoffAt(scheduledAt: string): string {
  return new Date(new Date(scheduledAt).getTime() - 2 * 60 * 60 * 1000).toISOString()
}

function buildBookingFromEntry(
  entry: GroupClassScheduleEntry,
  userId: string | null
): BookingResponse | null {
  if (!entry.currentUserBooking) {
    return null
  }

  return {
    id: entry.currentUserBooking.id,
    userId: userId ?? '',
    classId: entry.id,
    status: entry.currentUserBooking.status,
    bookedAt: entry.currentUserBooking.bookedAt,
    cancelledAt: null,
    className: entry.name,
    scheduledAt: entry.scheduledAt,
    durationMin: entry.durationMin,
    trainerNames: entry.trainerNames,
    classPhotoUrl: entry.classPhotoUrl,
    isCancellable: entry.cancellationAllowed,
    cancellationCutoffAt: getCancellationCutoffAt(entry.scheduledAt),
  }
}

function patchEntryAfterBooking(
  entry: GroupClassScheduleEntry,
  booking: BookingResponse
): GroupClassScheduleEntry {
  // Duplicates are allowed — always increment the confirmed count.
  const nextConfirmedBookings = Math.min(entry.capacity, entry.confirmedBookings + 1)
  const capacityReached = nextConfirmedBookings >= entry.capacity

  return {
    ...entry,
    confirmedBookings: nextConfirmedBookings,
    remainingSpots: Math.max(entry.capacity - nextConfirmedBookings, 0),
    currentUserBooking: {
      id: booking.id,
      status: booking.status,
      bookedAt: booking.bookedAt,
    },
    // The Book spot CTA remains active if capacity allows; full blocks it.
    bookingAllowed: !capacityReached,
    bookingDeniedReason: capacityReached ? 'CLASS_FULL' : null,
    cancellationAllowed: booking.isCancellable,
  }
}

function patchEntryAfterCancellation(
  entry: GroupClassScheduleEntry,
  hasActiveMembership: boolean
): GroupClassScheduleEntry {
  const startsAt = new Date(entry.scheduledAt).getTime()
  const hasStarted = startsAt <= Date.now()
  const nextConfirmedBookings =
    entry.currentUserBooking !== null
      ? Math.max(entry.confirmedBookings - 1, 0)
      : entry.confirmedBookings

  const bookingAllowed = !hasStarted && hasActiveMembership && nextConfirmedBookings < entry.capacity

  return {
    ...entry,
    confirmedBookings: nextConfirmedBookings,
    remainingSpots: Math.max(entry.capacity - nextConfirmedBookings, 0),
    currentUserBooking: null,
    bookingAllowed,
    bookingDeniedReason: hasStarted
      ? 'CLASS_ALREADY_STARTED'
      : hasActiveMembership
        ? nextConfirmedBookings >= entry.capacity
          ? 'CLASS_FULL'
          : null
        : 'MEMBERSHIP_REQUIRED',
    cancellationAllowed: false,
  }
}

export function GroupClassesSchedulePage() {
  const timeZone = useScheduleTimeZone()
  const navigate = useNavigate()
  const userId = useAuthStore((state) => state.user?.id ?? null)
  const [searchParams, setSearchParams] = useSearchParams()
  const { fetchSchedule, patchScheduleEntry } = useGroupClassScheduleStore()
  const {
    myBookings,
    myBookingsLoading,
    myBookingsError,
    fetchMyBookings,
    bookClass,
    cancelUserBooking,
    upsertBooking,
  } = useBookingStore()

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
  const [isBookingsDrawerOpen, setIsBookingsDrawerOpen] = useState(false)
  const [selectedBookEntry, setSelectedBookEntry] = useState<GroupClassScheduleEntry | null>(null)
  const [selectedCancelBooking, setSelectedCancelBooking] = useState<BookingResponse | null>(null)
  const [bookingActionError, setBookingActionError] = useState<string | null>(null)
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false)
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [pendingClassId, setPendingClassId] = useState<string | null>(null)

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

  useEffect(() => {
    if (!pendingClassId || !schedule) return
    const matchedEntry = schedule.entries.find((entry) => entry.id === pendingClassId)
    if (!matchedEntry) return
    setSelectedEntry(matchedEntry)
    setSelectionStale(false)
    setPendingClassId(null)
  }, [pendingClassId, schedule])

  const isInvalidState = hasInvalidParams || INVALID_QUERY_CODES.has(errorCode ?? '')
  const isLoadError = Boolean(error) && !isInvalidState

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

  const handleBrowsePlans = () => navigate('/plans')

  const revalidateScheduleAndBookings = () => {
    if (scheduleParams) {
      void fetchSchedule(scheduleParams, { preserveSchedule: true })
    }
    void fetchMyBookings({ page: 0, size: 50 })
  }

  const handleOpenBookingsDrawer = () => {
    setIsBookingsDrawerOpen(true)
    void fetchMyBookings({ page: 0, size: 50 })
  }

  const handleBookRequest = (entry: GroupClassScheduleEntry) => {
    setBookingActionError(null)
    setSelectedBookEntry(entry)
  }

  const handleCancelRequest = (entry: GroupClassScheduleEntry) => {
    const booking = buildBookingFromEntry(entry, userId)
    if (!booking) {
      return
    }
    setBookingActionError(null)
    setSelectedCancelBooking(booking)
  }

  const handleConfirmBooking = async () => {
    if (!selectedBookEntry) return

    setIsBookingSubmitting(true)
    setBookingActionError(null)
    try {
      const booking = await bookClass(selectedBookEntry.id)
      patchScheduleEntry(selectedBookEntry.id, (entry) => patchEntryAfterBooking(entry, booking))
      upsertBooking(booking)
      setSelectedBookEntry(null)
      setSelectedEntry((current) =>
        current?.id === selectedBookEntry.id ? patchEntryAfterBooking(current, booking) : current
      )
      setToast({ kind: 'success', message: 'Spot booked.' })
      revalidateScheduleAndBookings()
    } catch (err) {
      const errorResponse = err as { response?: { data?: { code?: string } } }
      const code = errorResponse.response?.data?.code
      const message = getBookingErrorMessage(code, 'Could not book this class right now.')
      setBookingActionError(message)
      setToast({ kind: 'error', message })
    } finally {
      setIsBookingSubmitting(false)
    }
  }

  const handleConfirmCancellation = async () => {
    if (!selectedCancelBooking) return

    setIsCancelSubmitting(true)
    setBookingActionError(null)
    try {
      const booking = await cancelUserBooking(selectedCancelBooking.id)
      upsertBooking(booking)
      if (schedule) {
        patchScheduleEntry(booking.classId, (entry) =>
          patchEntryAfterCancellation(entry, schedule.hasActiveMembership)
        )
      }
      setSelectedCancelBooking(null)
      setSelectedEntry((current) =>
        current?.id === booking.classId && schedule
          ? patchEntryAfterCancellation(current, schedule.hasActiveMembership)
          : current
      )
      setToast({ kind: 'success', message: 'Booking cancelled.' })
      revalidateScheduleAndBookings()
    } catch (err) {
      const errorResponse = err as { response?: { data?: { code?: string } } }
      const code = errorResponse.response?.data?.code
      const message = getBookingErrorMessage(code, 'Could not cancel this booking right now.')
      setBookingActionError(message)
      setToast({ kind: 'error', message })
    } finally {
      setIsCancelSubmitting(false)
    }
  }

  const handleJumpToClass = (classId: string) => {
    const visibleEntry = schedule?.entries.find((entry) => entry.id === classId)
    setIsBookingsDrawerOpen(false)
    if (visibleEntry) {
      setSelectedEntry(visibleEntry)
      setSelectionStale(false)
      return
    }

    const relatedBooking = myBookings.find((booking) => booking.classId === classId)
    if (!relatedBooking) {
      return
    }

    setPendingClassId(classId)
    setSearchParams({
      view: 'day',
      date: formatIsoDate(new Date(relatedBooking.scheduledAt), timeZone),
    })
  }

  const showToolbar = !isLoading && !isInvalidState && !isLoadError && Boolean(schedule?.hasActiveMembership)
  const showTimeZoneBadge = showToolbar && Boolean(schedule)

  const entries = schedule?.entries ?? []
  const isEmpty = Boolean(schedule) && entries.length === 0
  const bookedEntries = useMemo(
    () => entries.filter((entry) => entry.currentUserBooking !== null),
    [entries]
  )

  // Change 5 — keyboard handlers for Previous/Next (← / → keys)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowLeft') handlePrevious()
      if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, activeAnchorDate, timeZone])

  return (
    <div
      className="min-h-screen bg-[#0F0F0F] text-white overflow-x-hidden"
      data-testid="schedule-root"
    >
      <MemberNav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Change 1 — compact 72px header strip replacing the full hero */}
        {isLoading ? (
          <ScheduleHeaderSkeleton />
        ) : (
          <SchedulePageHeader
            activeView={activeView}
            anchorDate={activeAnchorDate}
            hasActiveMembership={schedule?.hasActiveMembership ?? true}
            onOpenBookings={handleOpenBookingsDrawer}
            rangeEndDateExclusive={schedule?.rangeEndDateExclusive}
            rangeStartDate={schedule?.rangeStartDate}
            showBadge={showTimeZoneBadge}
            timeZone={schedule?.timeZone ?? timeZone}
          />
        )}

        {/* Change 2 — BookingSummaryBar above toolbar (active members only) */}
        {!isLoading && !isInvalidState && !isLoadError && schedule && schedule.hasActiveMembership && (
          <BookingSummaryBar
            entries={bookedEntries}
            timeZone={schedule.timeZone}
            onOpenDrawer={handleOpenBookingsDrawer}
          />
        )}

        {isLoading && <ScheduleToolbarSkeleton />}

        {showToolbar && schedule && (
          <section className="sticky top-16 z-30 rounded-[24px] border border-gray-800 bg-gray-900/95 shadow-lg shadow-black/40 backdrop-blur">
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

        {isLoadError && (
          <ScheduleLoadErrorState onRetry={handleRetry} />
        )}

        {isLoading && <ScheduleViewSkeleton view={activeView} />}

        {!isLoading && !isInvalidState && !isLoadError && schedule && !schedule.hasActiveMembership && (
          <ScheduleMembershipGate onBrowsePlans={handleBrowsePlans} />
        )}

        {!isLoading && !isInvalidState && !isLoadError && schedule && schedule.hasActiveMembership && (
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
                onBookEntry={handleBookRequest}
                onCancelEntry={handleCancelRequest}
                onBrowsePlans={handleBrowsePlans}
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
                onBookEntry={handleBookRequest}
                onCancelEntry={handleCancelRequest}
                onBrowsePlans={handleBrowsePlans}
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
                onBookEntry={handleBookRequest}
                onCancelEntry={handleCancelRequest}
                onBrowsePlans={handleBrowsePlans}
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
        actionError={null}
        onBook={(entry) => {
          setSelectedEntry(null)
          setSelectionStale(false)
          handleBookRequest(entry)
        }}
        onCancelBooking={(entry) => {
          setSelectedEntry(null)
          setSelectionStale(false)
          handleCancelRequest(entry)
        }}
        onBrowsePlans={handleBrowsePlans}
        onClose={() => {
          setSelectedEntry(null)
          setSelectionStale(false)
        }}
      />

      {selectedBookEntry && (
        <BookingConfirmModal
          entry={selectedBookEntry}
          isOpen={Boolean(selectedBookEntry)}
          isSubmitting={isBookingSubmitting}
          errorMessage={bookingActionError}
          timeZone={schedule?.timeZone ?? timeZone}
          onConfirm={handleConfirmBooking}
          onClose={() => {
            if (isBookingSubmitting) return
            setSelectedBookEntry(null)
            setBookingActionError(null)
          }}
        />
      )}

      {selectedCancelBooking && (
        <CancelBookingModal
          booking={selectedCancelBooking}
          isOpen={Boolean(selectedCancelBooking)}
          isSubmitting={isCancelSubmitting}
          errorMessage={bookingActionError}
          timeZone={schedule?.timeZone ?? timeZone}
          onConfirm={handleConfirmCancellation}
          onClose={() => {
            if (isCancelSubmitting) return
            setSelectedCancelBooking(null)
            setBookingActionError(null)
          }}
        />
      )}

      <MyBookingsDrawer
        isOpen={isBookingsDrawerOpen}
        bookings={myBookings}
        isLoading={myBookingsLoading}
        errorMessage={myBookingsError}
        timeZone={schedule?.timeZone ?? timeZone}
        onRetry={() => {
          void fetchMyBookings({ page: 0, size: 50 })
        }}
        onClose={() => setIsBookingsDrawerOpen(false)}
        onCancelBooking={(booking) => {
          setBookingActionError(null)
          setSelectedCancelBooking(booking)
        }}
        onJumpToClass={handleJumpToClass}
      />

      {toast && (
        <BookingToast
          kind={toast.kind}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}

interface SchedulePageHeaderProps {
  activeView: ScheduleView;
  anchorDate: string;
  hasActiveMembership: boolean;
  onOpenBookings: () => void;
  rangeEndDateExclusive?: string;
  rangeStartDate?: string;
  timeZone: string;
  showBadge: boolean;
}

// Change 1 — compact ~72px header strip; hero banner removed
function SchedulePageHeader({
  activeView,
  anchorDate,
  hasActiveMembership,
  onOpenBookings,
  rangeEndDateExclusive,
  rangeStartDate,
  timeZone,
  showBadge,
}: SchedulePageHeaderProps) {
  const rangeLabel =
    activeView === 'day'
      ? formatShortDateLabel(anchorDate, timeZone)
      : rangeStartDate && rangeEndDateExclusive
        ? formatRangeLabel(rangeStartDate, rangeEndDateExclusive, timeZone)
        : formatShortDateLabel(anchorDate, timeZone)

  return (
    <section className="flex min-h-[72px] flex-col gap-3 rounded-[20px] border border-gray-800 bg-gray-900 px-5 py-4 shadow-md shadow-black/30 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: page title */}
      <h1 className="text-2xl font-bold text-white">Group Classes</h1>

      {/* Centre: status chips */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Change 7 — LIVE PROGRAMME overline stays uppercase (section label) */}
        <span className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-300">
          Live programme
        </span>
        {/* Change 7 — membership status chip: sentence case */}
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
            hasActiveMembership
              ? 'border border-gray-700 bg-[#0F0F0F] text-gray-300'
              : 'border border-orange-500/30 bg-orange-500/10 text-orange-300'
          }`}
        >
          {hasActiveMembership ? 'Membership active' : 'Activation needed'}
        </span>
        {showBadge ? (
          <span className="inline-flex items-center rounded-full border border-gray-700 bg-[#0F0F0F] px-3 py-1 text-xs font-medium text-gray-300">
            {rangeLabel} · {timeZone}
          </span>
        ) : null}
      </div>

      {/* Right: CTA */}
      <button
        type="button"
        onClick={onOpenBookings}
        className="inline-flex items-center justify-center rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 sm:flex-shrink-0"
      >
        Open booking hub
      </button>
    </section>
  )
}

// Change 1 — compact header skeleton matching the new strip height
function ScheduleHeaderSkeleton() {
  return (
    <section className="flex min-h-[72px] flex-col gap-3 rounded-[20px] border border-gray-800 bg-gray-900 px-5 py-4 shadow-md shadow-black/30 sm:flex-row sm:items-center sm:justify-between">
      <div className="h-8 w-40 rounded-lg bg-gray-800 animate-pulse" />
      <div className="flex gap-2">
        <div className="h-6 w-28 rounded-full bg-gray-800 animate-pulse" />
        <div className="h-6 w-32 rounded-full bg-gray-800 animate-pulse" />
        <div className="h-6 w-40 rounded-full bg-gray-800 animate-pulse" />
      </div>
      <div className="h-9 w-36 rounded-md bg-gray-800 animate-pulse" />
    </section>
  )
}

function ScheduleToolbarSkeleton() {
  return (
    <section className="sticky top-16 z-30 rounded-[24px] border border-gray-800 bg-gray-900/95 shadow-lg shadow-black/40 backdrop-blur">
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

interface ScheduleInvalidLinkStateProps {
  onReset: () => void;
}

function ScheduleInvalidLinkState({ onReset }: ScheduleInvalidLinkStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-6 py-14 text-center">
      <ExclamationTriangleIcon className="h-10 w-10 text-orange-400" aria-hidden="true" />
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
      <ExclamationTriangleIcon className="h-10 w-10 text-red-400" aria-hidden="true" />
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

interface ScheduleMembershipGateProps {
  onBrowsePlans: () => void;
}

function ScheduleMembershipGate({ onBrowsePlans }: ScheduleMembershipGateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-6 py-16 text-center">
      <ExclamationTriangleIcon className="h-10 w-10 text-orange-400" aria-hidden="true" />
      <h2 className="text-xl font-semibold text-white">Membership required</h2>
      <p className="max-w-md text-sm text-gray-200">
        An active membership is required to view and book group classes. Browse our plans to get started.
      </p>
      <button
        type="button"
        onClick={onBrowsePlans}
        className="inline-flex items-center justify-center rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
      >
        Browse plans
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
