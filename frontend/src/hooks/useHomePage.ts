import { useEffect, useRef, useState } from 'react'
import { getMyBookings, cancelBooking } from '../api/bookings'
import { createActivityStream, fetchActivityFeed, fetchViewerState } from '../api/landing'
import { getMyFavoriteTrainers } from '../api/trainerDiscovery'
import { useMembershipStore } from '../store/membershipStore'
import type { BookingResponse } from '../types/booking'
import type { ActivityEvent } from '../types/landing'

const MAX_FEED_ITEMS = 20
const ROTATION_INTERVAL_MS = 2800
const VIEWER_STATE_POLL_MS = 60_000

export interface HomePageData {
  // User
  firstName: string | null;

  // Club stats — for hero eyebrow
  onTheFloor: number;

  // Hero: next booked class (null → no-booked variant)
  nextBookedClass: BookingResponse | null;
  nextBookedLoading: boolean;
  // Studio for the next booked class (sourced from viewer-state, not BookingResponse)
  nextClassStudio: string | null;

  // Upcoming: next 3 confirmed bookings
  upcomingBookings: BookingResponse[];
  upcomingLoading: boolean;

  // Membership
  bookingsUsed: number;
  bookingsMax: number;
  renewsAt: string | null;   // ISO date
  renewsInDays: number | null;
  planName: string | null;
  membershipStatus: string | null;
  membershipLoading: boolean;

  // Favorite coaches count
  savedCoachesCount: number;

  // Activity feed (club-level — same SSE used by landing)
  feedEvents: ActivityEvent[];
  feedActiveIndex: number;

  // Actions
  cancelNextBooking: () => Promise<void>;
  cancellingBooking: boolean;

  // Optimistic override for bookings-used (set on cancel, cleared on error)
  bookingsUsedOverride: number | null;
}

function daysUntil(isoDate: string): number {
  const now = new Date()
  const target = new Date(isoDate)
  // Compare calendar days, not milliseconds, to match server logic
  const nowDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDay = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())
  return Math.max(0, Math.round((targetDay - nowDay) / 86_400_000))
}

export function useHomePage(): HomePageData {
  const { activeMembership, membershipLoading, fetchMyMembership } = useMembershipStore()

  // Club stats (onTheFloor)
  const [onTheFloor, setOnTheFloor] = useState(0)

  // Studio name for the next booked class (sourced from viewer-state, not BookingResponse)
  const [nextClassStudio, setNextClassStudio] = useState<string | null>(null)

  // Bookings
  const [upcomingBookings, setUpcomingBookings] = useState<BookingResponse[]>([])
  const [upcomingLoading, setUpcomingLoading] = useState(true)

  // Cancel
  const [cancellingBooking, setCancellingBooking] = useState(false)

  // Optimistic bookings-used override (null = use store value)
  const [bookingsUsedOverride, setBookingsUsedOverride] = useState<number | null>(null)

  // Favorite coaches count
  const [savedCoachesCount, setSavedCoachesCount] = useState(0)

  // Activity feed
  const [feedEvents, setFeedEvents] = useState<ActivityEvent[]>([])
  const [feedActiveIndex, setFeedActiveIndex] = useState(0)
  const seenIds = useRef<Set<string>>(new Set())

  // Fetch membership if not yet loaded
  useEffect(() => {
    if (!activeMembership && !membershipLoading) {
      void fetchMyMembership()
    }
  }, [activeMembership, membershipLoading, fetchMyMembership])

  // Fetch viewer state for onTheFloor count + 60s poll
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const vs = await fetchViewerState()
        if (cancelled) return
        if (vs.state === 'booked' || vs.state === 'nobooked') {
          setOnTheFloor(vs.onTheFloor)
        }
        if (vs.state === 'booked') {
          setNextClassStudio(vs.upcomingClass.studio)
        }
      } catch {
        // Non-blocking: 0 members in is acceptable fallback
      }
    }
    void load()
    const pollId = setInterval(() => { void load() }, VIEWER_STATE_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(pollId)
    }
  }, [])

  // Fetch upcoming confirmed bookings
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setUpcomingLoading(true)
      try {
        const res = await getMyBookings({ status: 'CONFIRMED', page: 0, size: 10 })
        if (cancelled) return
        // Sort ascending by scheduledAt, take first 4
        const sorted = [...res.content].sort(
          (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        )
        // Filter out already-started classes
        const future = sorted.filter((b) => new Date(b.scheduledAt).getTime() > Date.now())
        setUpcomingBookings(future.slice(0, 4))
      } catch {
        // Non-blocking: page renders without upcoming
      } finally {
        if (!cancelled) setUpcomingLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  // Fetch saved coaches count
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await getMyFavoriteTrainers({ page: 0, size: 1 })
        if (cancelled) return
        setSavedCoachesCount(res.totalElements)
      } catch {
        // Non-blocking: 0 is acceptable fallback
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  // Activity feed: initial fetch + SSE
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const fetched = await fetchActivityFeed()
        if (cancelled) return
        setFeedEvents(fetched)
        fetched.forEach((e) => seenIds.current.add(e.id))
      } catch {
        // Non-blocking
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const stream = createActivityStream((event) => {
      if (seenIds.current.has(event.id)) return
      seenIds.current.add(event.id)
      setFeedEvents((prev) => [event, ...prev].slice(0, MAX_FEED_ITEMS))
    })
    return () => { stream.close() }
  }, [])

  // Rotate feed active highlight
  useEffect(() => {
    const id = setInterval(() => {
      setFeedActiveIndex((prev) =>
        feedEvents.length > 0 ? (prev + 1) % feedEvents.length : 0
      )
    }, ROTATION_INTERVAL_MS)
    return () => clearInterval(id)
  }, [feedEvents.length])

  // Cancel the next booked class (index 0 of upcoming) — optimistic
  const cancelNextBooking = async () => {
    const next = upcomingBookings[0]
    if (!next) return
    setCancellingBooking(true)

    // Snapshot previous state for error restore
    const previousBookings = upcomingBookings

    // Optimistic removal before the API call
    setUpcomingBookings((prev) => prev.filter((b) => b.id !== next.id))

    // Optimistic decrement of bookingsUsed (used count goes up by 1 after a booking is made;
    // when we cancel, used count decreases by 1 — "left" increases)
    const currentUsed = activeMembership?.bookingsUsedThisMonth ?? 0
    setBookingsUsedOverride(Math.max(0, currentUsed - 1))

    try {
      await cancelBooking(next.id)
      // Success: optimistic state stays; override stays until next store refresh
    } catch (err) {
      // Restore previous state on error
      setUpcomingBookings(previousBookings)
      setBookingsUsedOverride(null)
      throw err
    } finally {
      setCancellingBooking(false)
    }
  }

  const nextBookedClass = upcomingBookings[0] ?? null

  // Derive renewal days from endDate (server field on UserMembership)
  const renewsAt = activeMembership?.endDate ?? null
  const renewsInDays = renewsAt ? daysUntil(renewsAt) : null

  return {
    firstName: activeMembership?.userFirstName ?? null,
    onTheFloor,
    nextBookedClass,
    nextBookedLoading: upcomingLoading,
    nextClassStudio,
    upcomingBookings: upcomingBookings.slice(0, 3),
    upcomingLoading,
    bookingsUsed: activeMembership?.bookingsUsedThisMonth ?? 0,
    bookingsMax: activeMembership?.maxBookingsPerMonth ?? 0,
    renewsAt,
    renewsInDays,
    planName: activeMembership?.planName ?? null,
    membershipStatus: activeMembership?.status ?? null,
    membershipLoading,
    savedCoachesCount,
    feedEvents,
    feedActiveIndex,
    cancelNextBooking,
    cancellingBooking,
    bookingsUsedOverride,
  }
}
