export type AnalyticsPayload = Record<string, string | number | boolean | null>

declare global {
  interface Window {
    dataLayer?: Array<AnalyticsPayload & { event: string }>;
  }
}

export function trackEvent(event: string, payload?: AnalyticsPayload): void {
  if (typeof window === 'undefined' || !window.dataLayer) {
    return
  }

  window.dataLayer.push({
    event,
    ...(payload ?? {}),
  })
}
