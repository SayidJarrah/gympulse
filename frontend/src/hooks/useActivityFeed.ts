import { useEffect, useRef, useState } from 'react'
import { createActivityStream, fetchActivityFeed } from '../api/landing'
import type { ActivityEvent } from '../types/landing'

const MAX_FEED_ITEMS = 20
const ROTATION_INTERVAL_MS = 2800

interface UseActivityFeedResult {
  events: ActivityEvent[];
  activeIndex: number;
}

export function useActivityFeed(): UseActivityFeedResult {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const seenIds = useRef<Set<string>>(new Set())

  // Initial fetch
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const fetched = await fetchActivityFeed()
        if (cancelled) return
        setEvents(fetched)
        fetched.forEach((e) => seenIds.current.add(e.id))
      } catch {
        // Feed failure is non-blocking; the page renders without it
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  // SSE subscription
  useEffect(() => {
    const stream = createActivityStream((event) => {
      if (seenIds.current.has(event.id)) return
      seenIds.current.add(event.id)
      setEvents((prev) => [event, ...prev].slice(0, MAX_FEED_ITEMS))
    })

    return () => {
      stream.close()
    }
  }, [])

  // Rotate active highlight every 2800ms
  useEffect(() => {
    const id = setInterval(() => {
      setActiveIndex((prev) => (events.length > 0 ? (prev + 1) % events.length : 0))
    }, ROTATION_INTERVAL_MS)

    return () => clearInterval(id)
  }, [events.length])

  return { events, activeIndex }
}
