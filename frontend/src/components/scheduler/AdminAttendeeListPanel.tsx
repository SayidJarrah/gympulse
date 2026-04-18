import { ExclamationTriangleIcon, UsersIcon } from '@heroicons/react/24/outline'
import { useClassAttendees } from '../../hooks/useClassAttendees'
import type { AdminAttendeeItem, BookingStatus } from '../../types/booking'

interface AdminAttendeeListPanelProps {
  classId: string;
}

export function AdminAttendeeListPanel({ classId }: AdminAttendeeListPanelProps) {
  const { data, isLoading, error, refetch } = useClassAttendees(classId, {
    status: 'CONFIRMED',
    page: 0,
    size: 100,
  })

  const capacity = data?.capacity ?? 0
  const confirmedCount = data?.confirmedCount ?? 0
  const isFull = capacity > 0 && confirmedCount >= capacity
  const attendees = data?.attendees.content ?? []

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2 text-sm text-gray-300">
        <UsersIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
        <span>
          Attendees:{' '}
          <span className={isFull ? 'text-orange-400' : 'text-white'}>
            {confirmedCount}
          </span>{' '}
          / {capacity} confirmed
        </span>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-lg bg-gray-800" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
          <p className="text-sm text-red-200">Failed to load attendees. Try again.</p>
          <button
            type="button"
            onClick={refetch}
            className="inline-flex items-center justify-center rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-red-500/10"
          >
            Retry
          </button>
        </div>
      ) : attendees.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-800 bg-[#0F0F0F] px-4 py-10 text-center">
          <UsersIcon className="h-6 w-6 text-gray-600" aria-hidden="true" />
          <p className="text-sm text-gray-400">No confirmed bookings yet.</p>
        </div>
      ) : (
        <ul
          aria-label={data ? `Attendee list for ${data.className}` : 'Attendee list'}
          className="max-h-[320px] overflow-y-auto rounded-xl border border-gray-800 bg-[#0F0F0F]"
        >
          {attendees.map((attendee, index) => (
            <AttendeeRow key={attendee.bookingId} attendee={attendee} index={index} />
          ))}
        </ul>
      )}
    </div>
  )
}

interface AttendeeRowProps {
  attendee: AdminAttendeeItem;
  index: number;
}

const AVATAR_TINTS = [
  'bg-green-500/20 text-green-300',
  'bg-orange-500/20 text-orange-300',
  'bg-blue-500/20 text-blue-300',
  'bg-purple-500/20 text-purple-300',
  'bg-cyan-500/20 text-cyan-300',
]

function AttendeeRow({ attendee, index }: AttendeeRowProps) {
  const initials = getInitials(attendee.displayName)
  const tint = index < AVATAR_TINTS.length ? AVATAR_TINTS[index] : 'bg-gray-700 text-gray-300'

  return (
    <li className="flex items-center gap-3 border-b border-gray-800 px-4 py-3 last:border-0">
      <span
        aria-hidden="true"
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${tint}`}
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-white">{attendee.displayName}</div>
      </div>
      <StatusChip status={attendee.status} />
      <span className="text-xs text-gray-500">{formatDateTime(attendee.bookedAt)}</span>
    </li>
  )
}

function getInitials(displayName: string): string {
  const trimmed = displayName.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
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
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${chip.className}`}
    >
      {chip.label}
    </span>
  )
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}
