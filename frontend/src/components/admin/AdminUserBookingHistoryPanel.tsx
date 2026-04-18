import { useState } from 'react'
import { CalendarDaysIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useAdminUserBookings } from '../../hooks/useAdminUserBookings'
import type { AdminUserBookingHistoryItem, BookingStatus } from '../../types/booking'

type StatusFilter = 'ALL' | BookingStatus

const STATUS_FILTERS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'ATTENDED', label: 'Attended' },
]

interface AdminUserBookingHistoryPanelProps {
  userId: string;
}

export function AdminUserBookingHistoryPanel({ userId }: AdminUserBookingHistoryPanelProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState<number>(0)
  const size = 20

  const { data, isLoading, error, refetch } = useAdminUserBookings(userId, {
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    page,
    size,
  })

  const items = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  const handleFilterChange = (next: StatusFilter) => {
    setStatusFilter(next)
    setPage(0)
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-white">Booking history</h2>
          <p className="mt-0.5 text-xs text-gray-500">Read-only view of this member's bookings.</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          Status
          <select
            value={statusFilter}
            onChange={(event) => handleFilterChange(event.target.value as StatusFilter)}
            className="rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="p-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-lg bg-gray-800" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-10 text-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-400" aria-hidden="true" />
            <p className="text-sm text-red-200">{error}</p>
            <button
              type="button"
              onClick={refetch}
              className="inline-flex items-center justify-center rounded-md border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/10"
            >
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-800 bg-[#0F0F0F] px-6 py-10 text-center">
            <CalendarDaysIcon className="h-6 w-6 text-gray-500" aria-hidden="true" />
            <p className="text-sm text-gray-400">No bookings found for this member.</p>
          </div>
        ) : (
          <>
            <BookingHistoryTable items={items} />
            {totalPages > 1 ? (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onChange={setPage}
              />
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}

interface BookingHistoryTableProps {
  items: AdminUserBookingHistoryItem[];
}

function BookingHistoryTable({ items }: BookingHistoryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
          <tr>
            <th scope="col" className="py-2 pr-4 font-medium">Class</th>
            <th scope="col" className="py-2 pr-4 font-medium">Scheduled</th>
            <th scope="col" className="py-2 pr-4 font-medium">Status</th>
            <th scope="col" className="py-2 pr-4 font-medium">Booked at</th>
            <th scope="col" className="py-2 pr-4 font-medium">Cancelled at</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {items.map((item) => (
            <tr key={item.bookingId} className="hover:bg-gray-800/30">
              <td className="py-3 pr-4 font-medium text-white">{item.className}</td>
              <td className="py-3 pr-4 text-gray-400">{formatDateTime(item.scheduledAt)}</td>
              <td className="py-3 pr-4">
                <StatusChip status={item.status} />
              </td>
              <td className="py-3 pr-4 text-xs text-gray-500">{formatDateTime(item.bookedAt)}</td>
              <td className="py-3 pr-4 text-xs text-gray-500">
                {item.cancelledAt ? formatDateTime(item.cancelledAt) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface StatusChipProps {
  status: BookingStatus;
}

function StatusChip({ status }: StatusChipProps) {
  const config: Record<BookingStatus, { label: string; className: string }> = {
    CONFIRMED: {
      label: 'Confirmed',
      className: 'border-green-500/30 bg-green-500/10 text-green-400',
    },
    CANCELLED: {
      label: 'Cancelled',
      className: 'border-gray-700 bg-gray-700/40 text-gray-400',
    },
    ATTENDED: {
      label: 'Attended',
      className: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    },
  }
  const chip = config[status]
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${chip.className}`}
    >
      {chip.label}
    </span>
  )
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onChange: (next: number) => void;
}

function Pagination({ currentPage, totalPages, onChange }: PaginationProps) {
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
      <button
        type="button"
        disabled={currentPage <= 0}
        onClick={() => onChange(currentPage - 1)}
        className="inline-flex items-center rounded-md px-2 py-1 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-600 disabled:hover:bg-transparent"
      >
        ← Prev
      </button>
      <span>
        Page {currentPage + 1} of {totalPages}
      </span>
      <button
        type="button"
        disabled={currentPage >= totalPages - 1}
        onClick={() => onChange(currentPage + 1)}
        className="inline-flex items-center rounded-md px-2 py-1 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-600 disabled:hover:bg-transparent"
      >
        Next →
      </button>
    </div>
  )
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}
