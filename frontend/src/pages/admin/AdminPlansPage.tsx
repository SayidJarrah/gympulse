import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PlusIcon, TableCellsIcon } from '@heroicons/react/24/outline'
import { AdminSidebar } from '../../components/layout/AdminSidebar'
import { PlanStatusBadge } from '../../components/plans/PlanStatusBadge'
import { PlanActionsMenu } from '../../components/plans/PlanActionsMenu'
import { PlanFormModal } from '../../components/plans/PlanFormModal'
import { StatusConfirmationModal } from '../../components/plans/StatusConfirmationModal'
import type { MembershipPlan, PlanStatus } from '../../types/membershipPlan'
import { useAdminPlans } from '../../hooks/useAdminPlans'
import { formatPrice, formatDuration, formatDate } from '../../utils/planFormatters'

type FilterTab = 'All' | 'Active' | 'Inactive'

const TAB_TO_STATUS: Record<FilterTab, PlanStatus | undefined> = {
  All: undefined,
  Active: 'ACTIVE',
  Inactive: 'INACTIVE',
}

const STATUS_TO_TAB: Record<string, FilterTab> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
}

function TableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-t border-gray-800" aria-hidden="true">
          <td className="px-4 py-3">
            <div className="h-4 w-36 rounded bg-gray-800 animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-16 rounded bg-gray-800 animate-pulse" />
          </td>
          <td className="hidden px-4 py-3 sm:table-cell">
            <div className="h-4 w-20 rounded bg-gray-800 animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <div className="h-5 w-14 rounded-full bg-gray-800 animate-pulse" />
          </td>
          <td className="hidden px-4 py-3 lg:table-cell">
            <div className="h-4 w-24 rounded bg-gray-800 animate-pulse" />
          </td>
          <td className="px-4 py-3 text-right">
            <div className="ml-auto h-6 w-28 rounded bg-gray-800 animate-pulse" />
          </td>
        </tr>
      ))}
    </>
  )
}

export function AdminPlansPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<FilterTab>(() => {
    const statusParam = searchParams.get('status')
    return (statusParam ? STATUS_TO_TAB[statusParam] ?? 'All' : 'All')
  })
  const [page, setPage] = useState(0)

  // Modal state
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MembershipPlan | undefined>(undefined)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState<MembershipPlan | null>(null)

  const statusFilter = TAB_TO_STATUS[activeTab]

  const { plans, totalElements, totalPages, currentPage, isLoading, error, refetch } =
    useAdminPlans(statusFilter, page)

  // Sync URL param when tab changes
  useEffect(() => {
    if (activeTab === 'All') {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ status: TAB_TO_STATUS[activeTab] as string }, { replace: true })
    }
    setPage(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab)
  }

  const openCreateModal = () => {
    setEditTarget(undefined)
    setFormModalOpen(true)
  }

  const openEditModal = (plan: MembershipPlan) => {
    setEditTarget(plan)
    setFormModalOpen(true)
  }

  const openStatusModal = (plan: MembershipPlan) => {
    setStatusTarget(plan)
    setStatusModalOpen(true)
  }

  const handleFormModalClose = () => {
    setFormModalOpen(false)
    setEditTarget(undefined)
    // Refresh table to reflect new/updated plan
    refetch()
  }

  const handleStatusModalClose = () => {
    setStatusModalOpen(false)
    setStatusTarget(null)
    // Refresh table to reflect updated status
    refetch()
  }

  const tabs: FilterTab[] = ['All', 'Active', 'Inactive']

  return (
    <div className="flex h-screen bg-[#0F0F0F] overflow-hidden">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto bg-[#0F0F0F]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold leading-tight text-white">Membership Plans</h1>
              <p className="mt-1 text-sm text-gray-400">{totalElements} plans total</p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              <PlusIcon className="h-4 w-4" />
              New Plan
            </button>
          </div>

          {/* Status filter tabs */}
          <div
            role="tablist"
            aria-label="Filter plans by status"
            className="mt-6 flex gap-1 rounded-lg border border-gray-800 bg-gray-900 p-1 w-fit"
          >
            {tabs.map((tab) => (
              <button
                key={tab}
                role="tab"
                type="button"
                onClick={() => handleTabChange(tab)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                  activeTab === tab
                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                    : 'text-gray-400 hover:text-white'
                }`}
                aria-selected={activeTab === tab}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Error state */}
          {!isLoading && error && (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            >
              {error}
            </div>
          )}

          {/* Plans table */}
          <div className="mt-6 overflow-hidden rounded-xl border border-gray-800 bg-[#0F0F0F]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-busy={isLoading}>
                <thead className="sticky top-0 bg-gray-900">
                  <tr>
                    <th
                      scope="col"
                      className="border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
                    >
                      Plan Name
                    </th>
                    <th
                      scope="col"
                      className="border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
                    >
                      Price
                    </th>
                    <th
                      scope="col"
                      className="hidden border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 sm:table-cell"
                    >
                      Duration
                    </th>
                    <th
                      scope="col"
                      className="border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="hidden border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 lg:table-cell"
                    >
                      Created
                    </th>
                    <th
                      scope="col"
                      className="border-b border-gray-800 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && <TableSkeletonRows />}

                  {!isLoading && plans.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800">
                            <TableCellsIcon className="h-6 w-6 text-gray-500" />
                          </div>
                          <p className="text-sm font-medium text-white">No plans found</p>
                          <p className="text-sm text-gray-500">
                            {activeTab === 'All'
                              ? 'Create a membership plan to get started.'
                              : 'Adjust the filter or create a new plan.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!isLoading &&
                    plans.map((plan) => (
                      <tr
                        key={plan.id}
                        className="border-t border-gray-800 transition-colors duration-100 hover:bg-gray-900 last:border-0"
                      >
                        <td className="px-4 py-3 font-medium text-white">{plan.name}</td>
                        <td className="px-4 py-3 text-white">{formatPrice(plan.priceInCents)}</td>
                        <td className="hidden px-4 py-3 text-gray-400 sm:table-cell">
                          {formatDuration(plan.durationDays)}
                        </td>
                        <td className="px-4 py-3">
                          <PlanStatusBadge status={plan.status} />
                        </td>
                        <td className="hidden px-4 py-3 text-gray-400 lg:table-cell">
                          {formatDate(plan.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <PlanActionsMenu
                            plan={plan}
                            onEdit={openEditModal}
                            onToggleStatus={openStatusModal}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Page {currentPage + 1} of {totalPages}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F0F]"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 disabled:cursor-not-allowed disabled:bg-green-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F0F]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Plan form modal (create / edit) */}
      <PlanFormModal
        isOpen={formModalOpen}
        onClose={handleFormModalClose}
        editTarget={editTarget}
      />

      {/* Status toggle confirmation modal */}
      <StatusConfirmationModal
        isOpen={statusModalOpen}
        onClose={handleStatusModalClose}
        plan={statusTarget}
      />
    </div>
  )
}
