import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HeroBooked } from '../../../components/landing/HeroBooked'
import { HeroNoBooked } from '../../../components/landing/HeroNoBooked'
import { ActivityFeed } from '../../../components/landing/ActivityFeed'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import type { BookedViewerState, NoBookedViewerState, ActivityEvent } from '../../../types/landing'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn().mockReturnValue(false),
}))

// Prevent live countdown interval side-effects by controlling Date.now
const FIXED_NOW = new Date('2026-04-18T10:00:00Z').getTime()
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_NOW)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

const bookedData: BookedViewerState = {
  state: 'booked',
  firstName: 'Dana',
  onTheFloor: 47,
  upcomingClass: {
    id: 'class-1',
    name: 'Power Vinyasa',
    startsAt: new Date(FIXED_NOW + 2 * 3_600_000).toISOString(), // 2h from now
    trainer: { id: 'trainer-1', name: 'Priya Mendes', avatarUrl: null },
    studio: 'Studio B',
    durationMin: 60,
  },
}

const nobookedWithClass: NoBookedViewerState = {
  state: 'nobooked',
  firstName: 'Jordan',
  onTheFloor: 12,
  nextOpenClass: {
    id: 'class-2',
    name: 'HIIT 45',
    startsIn: '45 min',
    startsAt: new Date(FIXED_NOW + 45 * 60_000).toISOString(),
    trainer: { id: 'trainer-2', name: 'Mia Taylor', avatarUrl: null },
    studio: 'Studio A',
    spotsLeft: 3,
    remainingClassesToday: 11,
  },
}

const nobookedWithManySpots: NoBookedViewerState = {
  ...nobookedWithClass,
  nextOpenClass: {
    ...nobookedWithClass.nextOpenClass!,
    spotsLeft: 8,
  },
}

const nobookedNoClass: NoBookedViewerState = {
  state: 'nobooked',
  firstName: 'Sam',
  onTheFloor: 5,
  nextOpenClass: null,
}

const feedEvents: ActivityEvent[] = [
  { id: '1', kind: 'checkin', actor: 'Noah B.', text: 'checked in', at: new Date(FIXED_NOW - 60_000).toISOString() },
  { id: '2', kind: 'booking', actor: 'A member', text: 'booked Power Vinyasa', at: new Date(FIXED_NOW - 120_000).toISOString() },
]

// ── HeroBooked ────────────────────────────────────────────────────────────────

describe('HeroBooked', () => {
  it('renders the class name in the countdown label', () => {
    render(
      <MemoryRouter>
        <HeroBooked data={bookedData} onTheFloor={47} />
      </MemoryRouter>
    )
    expect(screen.getByText(/Power Vinyasa starts in/i)).toBeInTheDocument()
  })

  it("renders the member's first name in the headline", () => {
    render(
      <MemoryRouter>
        <HeroBooked data={bookedData} onTheFloor={47} />
      </MemoryRouter>
    )
    expect(screen.getByText(/Dana\./)).toBeInTheDocument()
  })

  it('renders trainer name and studio detail', () => {
    render(
      <MemoryRouter>
        <HeroBooked data={bookedData} onTheFloor={47} />
      </MemoryRouter>
    )
    expect(screen.getByText(/Priya Mendes/)).toBeInTheDocument()
    expect(screen.getByText(/Studio B/)).toBeInTheDocument()
  })
})

// ── HeroNoBooked ──────────────────────────────────────────────────────────────

describe('HeroNoBooked', () => {
  it('renders spots-left in amber when spotsLeft <= 3', () => {
    render(
      <MemoryRouter>
        <HeroNoBooked data={nobookedWithClass} onTheFloor={12} />
      </MemoryRouter>
    )
    const spotsEl = screen.getByText(/3 spots left/)
    // The amber colour is set via inline style/class; verify the element exists and has correct text
    expect(spotsEl).toBeInTheDocument()
    expect(spotsEl.className).toContain('FDBA74')
  })

  it('does not apply amber class when spotsLeft > 3', () => {
    render(
      <MemoryRouter>
        <HeroNoBooked data={nobookedWithManySpots} onTheFloor={12} />
      </MemoryRouter>
    )
    const spotsEl = screen.getByText(/8 spots left/)
    expect(spotsEl).toBeInTheDocument()
    expect(spotsEl.className).not.toContain('FDBA74')
  })

  it('renders the no-class fallback when nextOpenClass is null', () => {
    render(
      <MemoryRouter>
        <HeroNoBooked data={nobookedNoClass} onTheFloor={5} />
      </MemoryRouter>
    )
    expect(screen.getByText(/No open classes right now/i)).toBeInTheDocument()
  })

  it('the "Grab a spot" link deep-links to the schedule page', () => {
    render(
      <MemoryRouter>
        <HeroNoBooked data={nobookedWithClass} onTheFloor={12} />
      </MemoryRouter>
    )
    const link = screen.getByRole('link', { name: /grab a spot/i })
    expect(link).toHaveAttribute('href', `/schedule?classId=${nobookedWithClass.nextOpenClass!.id}`)
  })
})

// ── ActivityFeed ──────────────────────────────────────────────────────────────

describe('ActivityFeed', () => {
  it('renders "A member" as actor text in the public variant', () => {
    const publicEvents: ActivityEvent[] = [
      { id: '1', kind: 'checkin', actor: 'A member', text: 'checked in', at: new Date(FIXED_NOW - 60_000).toISOString() },
    ]
    render(
      <ActivityFeed events={publicEvents} activeIndex={0} isLoggedOut={true} />
    )
    expect(screen.getByText('A member')).toBeInTheDocument()
    expect(screen.getByText(/Live at the club/i)).toBeInTheDocument()
  })

  it('renders "Activity" header in the authed variant', () => {
    render(
      <ActivityFeed events={feedEvents} activeIndex={0} isLoggedOut={false} />
    )
    expect(screen.getByText(/^Activity$/i)).toBeInTheDocument()
  })

  it('renders the active item at full opacity and dims others', () => {
    render(
      <ActivityFeed events={feedEvents} activeIndex={0} isLoggedOut={false} />
    )
    const rows = screen.getAllByText(/checked in|booked Power Vinyasa/)
    // Active row (index 0) should have opacity 1; row 1 should have opacity 0.55
    // We check via style since we use inline styles in the component
    const firstRow = rows[0].closest('[style]') as HTMLElement | null
    const secondRow = rows[1].closest('[style]') as HTMLElement | null
    expect(firstRow?.style.opacity).toBe('1')
    expect(secondRow?.style.opacity).toBe('0.55')
  })
})

// ── useReducedMotion ──────────────────────────────────────────────────────────

describe('useReducedMotion', () => {
  it('returns the mocked value (false by default)', () => {
    const result = (useReducedMotion as ReturnType<typeof vi.fn>)()
    expect(result).toBe(false)
  })

  it('returns true when overridden', () => {
    ;(useReducedMotion as ReturnType<typeof vi.fn>).mockReturnValueOnce(true)
    const result = (useReducedMotion as ReturnType<typeof vi.fn>)()
    expect(result).toBe(true)
  })
})
