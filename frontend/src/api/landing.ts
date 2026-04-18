import axiosInstance from './axiosInstance'
import type { ActivityEvent, LandingStats, ViewerStateResponse } from '../types/landing'

export async function fetchViewerState(): Promise<ViewerStateResponse> {
  const response = await axiosInstance.get<ViewerStateResponse>('/landing/viewer-state')
  return response.data
}

export async function fetchLandingStats(): Promise<LandingStats> {
  const response = await axiosInstance.get<LandingStats>('/landing/stats')
  return response.data
}

export async function fetchActivityFeed(): Promise<ActivityEvent[]> {
  const response = await axiosInstance.get<{ variant: string; events: ActivityEvent[] }>(
    '/landing/activity'
  )
  return response.data.events
}

/**
 * Opens a Server-Sent Events connection to the activity stream.
 * The caller is responsible for calling `.close()` on unmount.
 */
export function createActivityStream(onEvent: (event: ActivityEvent) => void): EventSource {
  // EventSource does not send the Authorization header automatically, so the
  // server-side auth check uses the cookie session or falls back to public data.
  // The JWT is in-memory only and cannot be passed to EventSource in a header.
  // For v1 the stream pushes public-safe data to all connections.
  const stream = new EventSource('/api/v1/landing/activity/stream')
  stream.onmessage = (e: MessageEvent) => {
    try {
      const event = JSON.parse(e.data as string) as ActivityEvent
      onEvent(event)
    } catch {
      // Malformed SSE data — ignore silently
    }
  }
  return stream
}
