/**
 * Formats a price given in cents to a USD currency string.
 * e.g. 2999 -> "$29.99"
 */
export function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(priceInCents / 100)
}

/**
 * Formats a duration in days to a human-readable string.
 * e.g. 30 -> "30 days", 365 -> "1 year", 730 -> "2 years"
 */
export function formatDuration(durationDays: number): string {
  if (durationDays === 365) return '1 year'
  if (durationDays === 730) return '2 years'
  return `${durationDays} days`
}

/**
 * Formats an ISO date string to a short date display.
 * e.g. "2026-03-21T10:00:00Z" -> "Mar 21, 2026"
 */
export function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoString))
}

/**
 * Formats an ISO date string to a month-year display.
 * e.g. "2026-03-21T10:00:00Z" -> "March 2026"
 */
export function formatMonthYear(isoString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(isoString))
}
