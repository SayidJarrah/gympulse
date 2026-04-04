import { Link } from 'react-router-dom'
import { buildHomeMembershipPath } from '../../utils/accessFlowNavigation'

export function PlansContextHeader() {
  return (
    <section className="rounded-[28px] border border-gray-800 bg-gray-900 p-6 shadow-xl shadow-black/30">
      <div className="flex flex-col gap-4">
        <Link
          to={buildHomeMembershipPath()}
          className="inline-flex w-fit items-center text-sm font-medium text-green-400 transition-colors duration-200 hover:text-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          Back to Home
        </Link>
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-gray-400">
            Membership access
          </p>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold leading-tight text-white">
                Choose the plan that unlocks your booking access
              </h1>
              <p className="max-w-2xl text-base leading-normal text-gray-300">
                Compare all current options, then continue into the existing purchase flow.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-300">
              No active membership
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
