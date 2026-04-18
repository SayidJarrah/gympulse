import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { GroupClassesSchedulePage } from '../GroupClassesSchedulePage'
import { useGroupClassScheduleStore } from '../../../store/groupClassScheduleStore'
import { useBookingStore } from '../../../store/bookingStore'
import { cancelBooking, createBooking, getMyBookings } from '../../../api/bookings'
import { getGroupClassSchedule } from '../../../api/groupClassSchedule'
import type { GroupClassScheduleResponse } from '../../../types/groupClassSchedule'
import type { BookingResponse } from '../../../types/booking'

vi.mock('../../../api/bookings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/bookings')>()
  return {
    ...actual,
    createBooking: vi.fn(),
    cancelBooking: vi.fn(),
    getMyBookings: vi.fn(),
  }
})

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
const mockedCreateBooking = vi.mocked(createBooking)
const mockedCancelBooking = vi.mocked(cancelBooking)
const mockedGetMyBookings = vi.mocked(getMyBookings)

const baseResponse: GroupClassScheduleResponse = {
  view: 'week',
  anchorDate: '2026-03-30',
  timeZone: 'UTC',
  week: '2026-W14',
  rangeStartDate: '2026-03-30',
  rangeEndDateExclusive: '2026-04-06',
  hasActiveMembership: true,
  entries: [
    {
      id: 'entry-1',
      name: 'Yoga Flow',
      scheduledAt: '2026-03-30T16:00:00Z',
      localDate: '2026-03-30',
      durationMin: 60,
      trainerNames: ['Jane Doe'],
      classPhotoUrl: null,
      capacity: 20,
      confirmedBookings: 10,
      remainingSpots: 10,
      currentUserBooking: null,
      bookingAllowed: true,
      bookingDeniedReason: null,
      cancellationAllowed: false,
    },
  ],
}

const confirmedBooking: BookingResponse = {
  id: 'booking-1',
  userId: 'user-1',
  classId: 'entry-1',
  status: 'CONFIRMED',
  bookedAt: '2026-03-28T12:00:00Z',
  cancelledAt: null,
  className: 'Yoga Flow',
  scheduledAt: '2026-03-30T16:00:00Z',
  durationMin: 60,
  trainerNames: ['Jane Doe'],
  classPhotoUrl: null,
  isCancellable: true,
  cancellationCutoffAt: '2026-03-30T13:00:00Z',
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
    mockedCreateBooking.mockReset()
    mockedCancelBooking.mockReset()
    mockedGetMyBookings.mockReset()
    useGroupClassScheduleStore.setState({
      view: 'week',
      anchorDate: '2026-03-30',
      timeZone: 'UTC',
      schedule: null,
      isLoading: false,
      isRefreshing: false,
      error: null,
      errorCode: null,
    })
    useBookingStore.setState({
      myBookings: [],
      myBookingsTotalPages: 0,
      myBookingsPage: 0,
      myBookingsLoading: false,
      myBookingsError: null,
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

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(mockedGetGroupClassSchedule).toHaveBeenCalledWith({
      view: 'week',
      anchorDate: '2026-03-30',
      timeZone: 'UTC',
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

    expect((await screen.findAllByText('Yoga Flow')).length).toBeGreaterThan(0)
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

  it('renders membership-required actions without blocking schedule browsing', async () => {
    mockedGetGroupClassSchedule.mockResolvedValueOnce({
      ...baseResponse,
      hasActiveMembership: false,
      entries: [
        {
          ...baseResponse.entries[0],
          bookingAllowed: false,
          bookingDeniedReason: 'MEMBERSHIP_REQUIRED',
        },
      ],
    })

    renderPage(['/schedule?view=week&date=2026-03-30'])

    expect((await screen.findAllByText('Yoga Flow')).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Browse plans' }).length).toBeGreaterThan(0)
    expect(screen.queryByText('Membership required')).not.toBeInTheDocument()
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

    expect((await screen.findAllByText('Trainer TBA')).length).toBeGreaterThan(0)
  })

  it('books a class from the schedule confirmation modal', async () => {
    const user = userEvent.setup()
    mockedGetGroupClassSchedule
      .mockResolvedValueOnce(baseResponse)
      .mockResolvedValueOnce({
        ...baseResponse,
        entries: [
          {
            ...baseResponse.entries[0],
            currentUserBooking: {
              id: confirmedBooking.id,
              status: confirmedBooking.status,
              bookedAt: confirmedBooking.bookedAt,
            },
            bookingAllowed: true,
            bookingDeniedReason: null,
            cancellationAllowed: true,
          },
        ],
      })
    mockedCreateBooking.mockResolvedValueOnce(confirmedBooking)
    mockedGetMyBookings.mockResolvedValueOnce({
      content: [confirmedBooking],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 50,
    })

    renderPage(['/schedule?view=week&date=2026-03-30'])

    expect((await screen.findAllByText('Yoga Flow')).length).toBeGreaterThan(0)
    await user.click(screen.getAllByRole('button', { name: 'Book spot' })[0])
    const confirmDialog = await screen.findByRole('dialog', { name: 'Confirm booking' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Confirm booking' }))

    await waitFor(() => {
      expect(mockedCreateBooking).toHaveBeenCalledWith({ classId: 'entry-1' })
    })

    expect(await screen.findByText('Spot booked.')).toBeInTheDocument()
    expect(await screen.findByText('You have 1 booked class in this view.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Cancel booking' }).length).toBeGreaterThan(0)
  })

  it('shows the bookings drawer for visible booked entries', async () => {
    const user = userEvent.setup()
    mockedGetGroupClassSchedule.mockResolvedValueOnce({
      ...baseResponse,
      entries: [
        {
          ...baseResponse.entries[0],
          currentUserBooking: {
            id: confirmedBooking.id,
            status: confirmedBooking.status,
            bookedAt: confirmedBooking.bookedAt,
          },
          bookingAllowed: true,
          bookingDeniedReason: null,
          cancellationAllowed: true,
        },
      ],
    })
    mockedGetMyBookings.mockResolvedValueOnce({
      content: [confirmedBooking],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 50,
    })

    renderPage(['/schedule?view=week&date=2026-03-30'])

    await screen.findByText('You have 1 booked class in this view.')
    await user.click(screen.getByRole('button', { name: 'See my bookings' }))

    expect(await screen.findByRole('heading', { name: 'My bookings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show class' })).toBeInTheDocument()
  })

  it('cancels a booking from the schedule card flow', async () => {
    const user = userEvent.setup()
    mockedGetGroupClassSchedule
      .mockResolvedValueOnce({
        ...baseResponse,
        entries: [
          {
            ...baseResponse.entries[0],
            currentUserBooking: {
              id: confirmedBooking.id,
              status: confirmedBooking.status,
              bookedAt: confirmedBooking.bookedAt,
            },
            bookingAllowed: true,
            bookingDeniedReason: null,
            cancellationAllowed: true,
          },
        ],
      })
      .mockResolvedValueOnce(baseResponse)
    mockedCancelBooking.mockResolvedValueOnce({
      ...confirmedBooking,
      status: 'CANCELLED',
      cancelledAt: '2026-03-29T09:00:00Z',
      isCancellable: false,
    })
    mockedGetMyBookings.mockResolvedValueOnce({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 50,
    })

    renderPage(['/schedule?view=week&date=2026-03-30'])

    await screen.findAllByRole('button', { name: 'Cancel booking' })
    await user.click(screen.getAllByRole('button', { name: 'Cancel booking' })[0])
    const cancelDialog = await screen.findByRole('dialog', { name: 'Cancel booking' })
    await user.click(within(cancelDialog).getByRole('button', { name: 'Cancel booking' }))

    await waitFor(() => {
      expect(mockedCancelBooking).toHaveBeenCalledWith(confirmedBooking.id)
    })

    expect(await screen.findByText('Booking cancelled.')).toBeInTheDocument()
    expect((await screen.findAllByRole('button', { name: 'Book spot' })).length).toBeGreaterThan(0)
  })

  it('prevents horizontal overflow on small screens', async () => {
    mockedGetGroupClassSchedule.mockResolvedValueOnce(baseResponse)

    renderPage(['/schedule?view=week&date=2026-03-30'])

    expect((await screen.findAllByText('Yoga Flow')).length).toBeGreaterThan(0)
    expect(screen.getByTestId('schedule-root')).toHaveClass('overflow-x-hidden')
  })
})
