import type { PlanStatus } from '../../types/membershipPlan'

interface PlanStatusBadgeProps {
  status: PlanStatus;
}

export function PlanStatusBadge({ status }: PlanStatusBadgeProps) {
  if (status === 'ACTIVE') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-medium leading-tight text-green-400"
        aria-label="Status: Active"
      >
        Active
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-800 px-2 py-0.5 text-xs font-medium leading-tight text-gray-400"
      aria-label="Status: Inactive"
    >
      Inactive
    </span>
  )
}
