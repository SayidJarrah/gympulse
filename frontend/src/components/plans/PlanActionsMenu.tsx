import type { MembershipPlan } from '../../types/membershipPlan'

interface PlanActionsMenuProps {
  plan: MembershipPlan;
  onEdit: (plan: MembershipPlan) => void;
  onToggleStatus: (plan: MembershipPlan) => void;
}

export function PlanActionsMenu({ plan, onEdit, onToggleStatus }: PlanActionsMenuProps) {
  return (
    <div className="inline-grid grid-cols-[3.75rem_6.75rem] items-center justify-items-end gap-1">
      <button
        type="button"
        onClick={() => onEdit(plan)}
        className="w-full whitespace-nowrap rounded-md px-2 py-1 text-right text-xs font-medium text-green-400 transition-colors duration-150 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        aria-label={`Edit ${plan.name}`}
      >
        Edit
      </button>
      {plan.status === 'ACTIVE' ? (
        <button
          type="button"
          onClick={() => onToggleStatus(plan)}
          className="w-full whitespace-nowrap rounded-md px-2 py-1 text-right text-xs font-medium text-orange-400 transition-colors duration-150 hover:bg-orange-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          aria-label={`Deactivate ${plan.name}`}
        >
          Deactivate
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onToggleStatus(plan)}
          className="w-full whitespace-nowrap rounded-md px-2 py-1 text-right text-xs font-medium text-blue-400 transition-colors duration-150 hover:bg-blue-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label={`Activate ${plan.name}`}
        >
          Activate
        </button>
      )}
    </div>
  )
}
