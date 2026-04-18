import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

const WIDTH = 1600
const HEIGHT = 300
const MID_Y = HEIGHT / 2
const BEAT_EVERY = 220
const SCROLL_PX_PER_SEC = 60

function buildPath(t: number): string {
  const offset = (t * SCROLL_PX_PER_SEC) % BEAT_EVERY
  let d = ''
  for (let x = 0; x <= WIDTH; x += 2) {
    const local = (x + offset) % BEAT_EVERY
    let y = MID_Y
    if (local > 80 && local < 110) {
      const p = (local - 80) / 30
      if (p < 0.25) y = MID_Y - 4 - p * 160
      else if (p < 0.5) y = MID_Y - 44 + (p - 0.25) * 300
      else if (p < 0.75) y = MID_Y + 31 - (p - 0.5) * 160
      else y = MID_Y - 9 + (p - 0.75) * 36
    } else {
      y = MID_Y + Math.sin((x + offset) * 0.04) * 1.5
    }
    d += (x === 0 ? 'M' : 'L') + x + ',' + y.toFixed(1) + ' '
  }
  return d
}

export function AmbientWaveform() {
  const reduced = useReducedMotion()
  const [d, setD] = useState(() => buildPath(0))
  const rafRef = useRef<number | undefined>(undefined)
  const startRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (reduced) {
      // Freeze waveform — render static path at t=0
      setD(buildPath(0))
      return
    }

    const tick = (now: number) => {
      if (startRef.current === undefined) startRef.current = now
      const t = (now - startRef.current) / 1000
      setD(buildPath(t))
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current)
    }
  }, [reduced])

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute left-0 right-0 top-1/2 h-[40%] w-full -translate-y-1/2 opacity-[0.22]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="wavefade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#22C55E" stopOpacity="0" />
          <stop offset="0.2" stopColor="#22C55E" stopOpacity="0.7" />
          <stop offset="0.8" stopColor="#22C55E" stopOpacity="0.7" />
          <stop offset="1" stopColor="#22C55E" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="url(#wavefade)" strokeWidth="1.5" />
    </svg>
  )
}
