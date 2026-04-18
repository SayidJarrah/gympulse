import { PulseNav } from '../../components/landing/PulseNav'
import { PulseFooter } from '../../components/landing/PulseFooter'
import { AdminPtSessions } from '../../components/admin/AdminPtSessions'
import { useAdminPtSessions } from '../../hooks/useAdminPtSessions'
import { usePageMeta } from '../../hooks/usePageMeta'

export function AdminPtSessionsPage() {
  usePageMeta({ title: 'GymFlow | Admin — PT Sessions', description: 'Manage all personal training sessions.' })

  const {
    adminSessions,
    adminStats,
    adminLoading,
    adminError,
    adminFilters,
    applyFilter,
    handleExport,
  } = useAdminPtSessions()

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-white">
      <PulseNav authed />

      <main
        className="relative flex-1 px-10 pb-14 pt-10"
        style={{ maxWidth: 1320, margin: '0 auto', width: '100%' }}
      >
        <AdminPtSessions
          sessions={adminSessions}
          stats={adminStats}
          loading={adminLoading}
          error={adminError}
          filters={adminFilters}
          onFilterChange={applyFilter}
          onExport={handleExport}
        />
      </main>

      <PulseFooter />
    </div>
  )
}
