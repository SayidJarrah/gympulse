import { useEffect, useRef, useState } from 'react'
import { getMyBookings, cancelBooking } from '../api/bookings'
import { createActivityStream, fetchActivityFeed, fetchViewerState } from '../api/landing'
import { useMembershipStore } from '../store/membershipStore'
import type { BookingResponse } from '../types/booking'
import type { ActivityEvent } from '../types/landing'

const MAX_FEED_ITEMS = 20
const ROTATION_INTERVAL_MS = 2800

export interface HomePageData {
  // User
  firstName: string | null;

  // Club stats — for hero eyebrow
  onTheFloor: number;

  // Hero: next booked class (null → no-booked variant)
  nextBookedClass: BookingResponse | null;
  nextBookedLoading: boolean;

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

  // Activity feed (club-level — same SSE used by landing)
  feedEvents: ActivityEvent[];
  feedActiveIndex: number;

  // Actions
  cancelNextBooking: () => Promise<void>;
  cancellingBooking: boolean;
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

  // Bookings
  const [upcomingBookings, setUpcomingBookings] = useState<BookingResponse[]>([])
  const [upcomingLoading, setUpcomingLoading] = useState(true)

  // Cancel
  const [cancellingBooking, setCancellingBooking] = useState(false)

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

  // Fetch viewer state for onTheFloor count
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const vs = await fetchViewerState()
        if (cancelled) return
        if (vs.state === 'booked' || vs.state === 'nobooked') {
          setOnTheFloor(vs.onTheFloor)
        }
      } catch {
        // Non-blocking: 0 members in is acceptable fallback
      }
    }
    void load()
    return () => { cancelled = true }
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

  // Cancel the next booked class (index 0 of upcoming)
  const cancelNextBooking = async () => {
    const next = upcomingBookings[0]
    if (!next) return
    setCancellingBooking(true)
    try {
      await cancelBooking(next.id)
      // Optimistic removal
      setUpcomingBookings((prev) => prev.filter((b) => b.id !== next.id))
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
    upcomingBookings: upcomingBookings.slice(0, 3),
    upcomingLoading,
    bookingsUsed: activeMembership?.bookingsUsedThisMonth ?? 0,
    bookingsMax: activeMembership?.maxBookingsPerMonth ?? 0,
    renewsAt,
    renewsInDays,
    planName: activeMembership?.planName ?? null,
    membershipStatus: activeMembership?.status ?? null,
    membershipLoading,
    feedEvents,
    feedActiveIndex,
    cancelNextBooking,
    cancellingBooking,
  }
}
