import { Link, useParams } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { Navbar } from '../../components/layout/Navbar'
import { AdminUserBookingHistoryPanel } from '../../components/admin/AdminUserBookingHistoryPanel'

// Minimal admin member-detail shell per SDD Section 5 + Risks §1.
// A lightweight user-summary endpoint does not exist today — only photo-only.
// The shell intentionally avoids fetching richer profile data to stay within
// feature scope. The page shows a truncated member id as heading and hosts
// the AdminUserBookingHistoryPanel; a future feature can expand the header
// into a full profile view without changing this shell's route.
export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const userId = id ?? ''
  const shortId = userId.length >= 8 ? userId.slice(0, 8) : userId

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/admin/memberships"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to memberships
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold leading-tight text-white">Member {shortId}…</h1>
          <p className="mt-1 text-sm text-gray-400">
            Booking history for this member. Profile details live on the full admin profile view.
          </p>
        </div>

        <AdminUserBookingHistoryPanel userId={userId} />
      </main>
    </div>
  )
}
