import type { MembershipStatus } from '../../types/userMembership'

interface MembershipStatusBadgeProps {
  status: MembershipStatus;
}

const STATUS_CLASSES: Record<MembershipStatus, string> = {
  ACTIVE:
    'inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-medium leading-tight text-green-400',
  CANCELLED:
    'inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium leading-tight text-red-400',
  EXPIRED:
    'inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-800 px-2 py-0.5 text-xs font-medium leading-tight text-gray-400',
}

const STATUS_LABELS: Record<MembershipStatus, string> = {
  ACTIVE: 'Active',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
}

export function MembershipStatusBadge({ status }: MembershipStatusBadgeProps) {
  return (
    <span
      className={STATUS_CLASSES[status]}
      aria-label={`Status: ${STATUS_LABELS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
