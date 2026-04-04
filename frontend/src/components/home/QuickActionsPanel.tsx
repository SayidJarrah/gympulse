import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import type { MemberHomeQuickAction } from '../../types/memberHome'

interface Props {
  hasActiveMembership: boolean;
  onScrollToClasses: () => void;
}

export function QuickActionsPanel({ hasActiveMembership, onScrollToClasses }: Props) {
  const actions: MemberHomeQuickAction[] = hasActiveMembership
    ? [
        {
          id: 'manage-membership',
          label: 'Manage membership',
          description: 'Open your full membership view, dates, and usage details.',
          to: '/membership',
        },
        {
          id: 'open-schedule',
          label: 'Open schedule',
          description: 'Jump straight into the live programme and book your next class.',
          to: '/schedule',
        },
        {
          id: 'see-trainers',
          label: 'See all trainers',
          description: 'Explore the full coaching roster and individual profiles.',
          to: '/trainers',
        },
      ]
    : [
        {
          id: 'browse-plans',
          label: 'Browse plans',
          description: 'Compare memberships and unlock the full member experience.',
          to: '/plans',
        },
        {
          id: 'see-trainers',
          label: 'See all trainers',
          description: 'Browse standout coaches before you choose your training rhythm.',
          to: '/trainers',
        },
        {
          id: 'jump-to-classes',
          label: 'Jump to classes',
          description: 'Scroll to the upcoming preview and see what is on soon.',
        },
      ]

  return (
    <section className="rounded-[24px] border border-gray-800 bg-gray-900 p-6 shadow-md shadow-black/40">
      <div className="mb-4">
        <h2 className="text-xl font-semibold leading-tight text-white">Quick actions</h2>
        <p className="mt-1 text-sm text-gray-400">
          Pick the next move that fits your momentum right now.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {actions.map((action) =>
          action.to ? (
            <Link
              key={action.id}
              to={action.to}
              className="rounded-2xl border border-gray-800 bg-[#0F0F0F] px-4 py-4 text-left transition-all duration-200 hover:border-green-500/40 hover:bg-gray-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              <p className="text-base font-semibold text-white">{action.label}</p>
              <p className="mt-2 text-sm text-gray-400">{action.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-green-400">
                Open <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          ) : (
            <button
              key={action.id}
              type="button"
              onClick={onScrollToClasses}
              className="rounded-2xl border border-gray-800 bg-[#0F0F0F] px-4 py-4 text-left transition-all duration-200 hover:border-green-500/40 hover:bg-gray-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              <p className="text-base font-semibold text-white">{action.label}</p>
              <p className="mt-2 text-sm text-gray-400">{action.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-green-400">
                Jump there <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </span>
            </button>
          )
        )}
      </div>
    </section>
  )
}
