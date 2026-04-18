import { useEffect, useState } from 'react'

interface CountdownResult {
  h: number;
  m: number;
  s: number;
  expired: boolean;
}

/**
 * Counts down to the given ISO date string from now.
 * Re-ticks every 1000ms. Returns {0,0,0} once the target is past.
 * Does NOT freeze on prefers-reduced-motion — countdown is functional data.
 */
export function useCountdown(targetIso: string): CountdownResult {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const targetMs = new Date(targetIso).getTime()
  const diff = Math.max(0, targetMs - now)
  const expired = diff === 0 && targetMs <= now

  return {
    h: Math.floor(diff / 3_600_000),
    m: Math.floor((diff % 3_600_000) / 60_000),
    s: Math.floor((diff % 60_000) / 1_000),
    expired,
  }
}
