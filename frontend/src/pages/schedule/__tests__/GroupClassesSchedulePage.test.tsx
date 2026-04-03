import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { GroupClassesSchedulePage } from '../GroupClassesSchedulePage'
import { useGroupClassScheduleStore } from '../../../store/groupClassScheduleStore'
import { getGroupClassSchedule } from '../../../api/groupClassSchedule'
import type { GroupClassScheduleResponse } from '../../../types/groupClassSchedule'

vi.mock('../../../api/groupClassSchedule', () => ({
  getGroupClassSchedule: vi.fn(),
}))

vi.mock('../../../hooks/useScheduleTimeZone', () => ({
  useScheduleTimeZone: () => 'UTC',
}))

vi.mock('../../../components/layout/Navbar', () => ({
  Navbar: () => <div data-testid="navbar" />,
}))

const mockedGetGroupClassSchedule = vi.mocked(getGroupClassSchedule)

const baseResponse: GroupClassScheduleResponse = {
  view: 'week',
  anchorDate: '2026-03-30',
  timeZone: 'UTC',
  week: '2026-W14',
  rangeStartDate: '2026-03-30',
  rangeEndDateExclusive: '2026-04-06',
  entries: [
    {
      id: 'entry-1',
      name: 'Yoga Flow',
      scheduledAt: '2026-03-30T16:00:00Z',
      localDate: '2026-03-30',
      durationMin: 60,
      trainerNames: ['Jane Doe'],
    },
  ],
}

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.search}</div>
}

function renderPage(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <GroupClassesSchedulePage />
      <LocationDisplay />
    </MemoryRouter>
  )
}

describe('GroupClassesSchedulePage', () => {
  beforeEach(() => {
    mockedGetGroupClassSchedule.mockReset()
    useGroupClassScheduleStore.setState({
      view: 'week',
      anchorDate: '2026-03-30',
      timeZone: 'UTC',
      schedule: null,
      isLoading: false,
      error: null,
      errorCode: null,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the current week by default', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-30T12:00:00Z'))

    mockedGetGroupClassSchedule.mockResolvedValueOnce(baseResponse)

    renderPage(['/schedule'])

    await waitFor(() => {
      expect(mockedGetGroupClassSchedule).toHaveBeenCalledWith({
        view: 'week',
        anchorDate: '2026-03-30',
        timeZone: 'UTC',
      })
    })

    expect(screen.getByTestId('location')).toHaveTextContent('view=week')
    expect(screen.getByTestId('location')).toHaveTextContent('date=2026-03-30')
  })

  it('switches views without losing the anchor date', async () => {
    const user = userEvent.setup()

    mockedGetGroupClassSchedule.mockImplementation(async (params) => ({
      ...baseResponse,
      view: params.view,
      anchorDate: params.anchorDate,
    }))

    renderPage(['/schedule?view=week&date=2026-03-30'])

    await screen.findByText('Yoga Flow')
    await user.click(screen.getByRole('button', { name: 'Day' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('view=day')
      expect(screen.getByTestId('location')).toHaveTextContent('date=2026-03-30')
    })

    await user.click(screen.getByRole('button', { name: 'List' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('view=list')
      expect(screen.getByTestId('location')).toHaveTextContent('date=2026-03-30')
    })
  })

  it('navigates weeks correctly', async () => {
    const user = userEvent.setup()

    mockedGetGroupClassSchedule.mockResolvedValue(baseResponse)

    renderPage(['/schedule?view=week&date=2026-03-30'])

    await screen.findByRole('button', { name: 'Next' })
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('date=2026-04-06')
    })
  })

  it('navigates days correctly', async () => {
    const user = userEvent.setup()

    mockedGetGroupClassSchedule.mockResolvedValue({
      ...baseResponse,
      view: 'day',
      rangeEndDateExclusive: '2026-03-31',
    })

    renderPage(['/schedule?view=day&date=2026-03-30'])

    await screen.findByRole('button', { name: 'Next' })
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('date=2026-03-31')
    })
  })

  it('navigates list windows correctly', async () => {
    const user = userEvent.setup()

    mockedGetGroupClassSchedule.mockResolvedValue({
      ...baseResponse,
      view: 'list',
      rangeEndDateExclusive: '2026-04-13',
    })

    renderPage(['/schedule?view=list&date=2026-03-30'])

    await screen.findByRole('button', { name: 'Next' })
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('date=2026-04-13')
    })
  })

  it('renders the membership-required state', async () => {
    mockedGetGroupClassSchedule.mockRejectedValueOnce({
      response: {
        data: {
          code: 'NO_ACTIVE_MEMBERSHIP',
          error: 'No active membership found',
        },
      },
    })

    renderPage(['/schedule?view=week&date=2026-03-30'])

    expect(await screen.findByText('Membership required')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse plans' })).toHaveAttribute('href', '/plans')
  })

  it('renders Trainer TBA for classes without trainers', async () => {
    mockedGetGroupClassSchedule.mockResolvedValueOnce({
      ...baseResponse,
      entries: [
        {
          ...baseResponse.entries[0],
          trainerNames: [],
        },
      ],
    })

    renderPage(['/schedule?view=week&date=2026-03-30'])

    expect(await screen.findByText('Trainer TBA')).toBeInTheDocument()
  })

  it('prevents horizontal overflow on small screens', async () => {
    mockedGetGroupClassSchedule.mockResolvedValueOnce(baseResponse)

    renderPage(['/schedule?view=week&date=2026-03-30'])

    expect(await screen.findByText('Yoga Flow')).toBeInTheDocument()
    expect(screen.getByTestId('schedule-root')).toHaveClass('overflow-x-hidden')
  })
})
