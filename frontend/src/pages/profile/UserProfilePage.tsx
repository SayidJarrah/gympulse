import { useCallback, useEffect, useRef, useState } from 'react'
import { ExclamationTriangleIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { Navbar } from '../../components/layout/Navbar'
import { PersonalInfoCard } from '../../components/profile/PersonalInfoCard'
import { AccountActionsCard } from '../../components/profile/AccountActionsCard'
import { Toast } from '../../components/profile/Toast'
import {
  MembershipControlCard,
  MembershipControlCardSkeleton,
} from '../../components/membership/MembershipControlCard'
import { useProfileStore } from '../../store/profileStore'
import { useMembershipStore } from '../../store/membershipStore'
import { PROFILE_ERROR_MESSAGES } from '../../utils/profileErrors'

const ACCESS_DENIED_MESSAGE = PROFILE_ERROR_MESSAGES['ACCESS_DENIED']

export function UserProfilePage() {
  const {
    profile,
    avatarUrl,
    isLoading,
    error,
    fetchMyProfile,
    clearMessages,
    toastMessage,
    setToastMessage,
  } = useProfileStore()

  const {
    activeMembership,
    membershipLoading,
    membershipError,
    membershipErrorCode,
    fetchMyMembership,
  } = useMembershipStore()

  // Page-level toast message (merged from profile + membership actions)
  const [pageToast, setPageToast] = useState<string | null>(null)

  const handleToast = useCallback((message: string) => {
    setPageToast(message)
  }, [])

  // Sync store toastMessage into page toast
  useEffect(() => {
    if (toastMessage) {
      setPageToast(toastMessage)
      setToastMessage(null)
    }
  }, [toastMessage, setToastMessage])

  useEffect(() => {
    clearMessages()
    void fetchMyProfile()
  }, [clearMessages, fetchMyProfile])

  useEffect(() => {
    if (activeMembership === null && !membershipLoading && !membershipError && !membershipErrorCode) {
      void fetchMyMembership()
    }
  }, [activeMembership, membershipLoading, membershipError, membershipErrorCode, fetchMyMembership])

  const errorBannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (error && errorBannerRef.current) {
      errorBannerRef.current.focus()
    }
  }, [error])

  const isAccessDenied = !isLoading && !profile && error === ACCESS_DENIED_MESSAGE
  const showFetchError = !isLoading && !profile && error && !isAccessDenied

  return (
    <div className="min-h-screen text-white" style={{ background: '#0F0F0F' }}>
      <Navbar />

      <main
        className="relative overflow-hidden"
        style={{ padding: '40px 40px 48px' }}
      >
        {/* Subtle green radial glow top-right */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            top: '-10%',
            right: '-5%',
            width: 700,
            height: 500,
            background: 'radial-gradient(circle, rgba(34,197,94,0.10), transparent 60%)',
            filter: 'blur(40px)',
            zIndex: 0,
          }}
        />

        <div
          className="relative mx-auto w-full"
          style={{ maxWidth: 1240, zIndex: 2 }}
        >
          {/* Page header */}
          <div className="mb-9">
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.24em]"
              style={{ color: '#4ADE80' }}
            >
              Profile
            </div>
            <h1
              className="mt-2.5 font-bold uppercase leading-none text-white"
              style={{
                fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)',
                fontSize: 56,
                letterSpacing: '-0.01em',
                lineHeight: 1,
              }}
            >
              Your account
            </h1>
            <p
              className="mt-2.5 text-[14px] max-w-[520px]"
              style={{ color: 'var(--color-fg-muted, #9CA3AF)' }}
            >
              Update your personal information and manage your membership.
            </p>
          </div>

          {/* Error banner */}
          {error && !isAccessDenied && (
            <div
              ref={errorBannerRef}
              tabIndex={-1}
              role="alert"
              className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-400 focus:outline-none"
            >
              {error}
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="flex flex-col gap-6">
              <div
                className="grid gap-6"
                style={{ gridTemplateColumns: '1.3fr 1fr' }}
              >
                {/* Personal info skeleton */}
                <div
                  className="animate-pulse rounded-2xl p-7"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1F2937' }}
                  aria-hidden="true"
                >
                  <div className="flex items-center gap-5">
                    <div className="h-16 w-16 rounded-full bg-gray-800" />
                    <div className="flex-1">
                      <div className="h-3 w-28 rounded bg-gray-800" />
                      <div className="mt-2 h-6 w-40 rounded bg-gray-800" />
                    </div>
                  </div>
                  <div className="mt-6 space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-[57px] rounded bg-gray-800/50" />
                    ))}
                  </div>
                </div>
                {/* Membership skeleton */}
                <MembershipControlCardSkeleton />
              </div>
              {/* Account actions skeleton */}
              <div
                className="animate-pulse rounded-2xl p-6"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1F2937' }}
                aria-hidden="true"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-3 w-16 rounded bg-gray-800" />
                    <div className="h-4 w-56 rounded bg-gray-800" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-9 w-32 rounded-lg bg-gray-800" />
                    <div className="h-9 w-20 rounded-lg bg-gray-800" />
                    <div className="h-9 w-36 rounded-lg bg-gray-800" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Access denied state */}
          {isAccessDenied && (
            <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10">
                <LockClosedIcon className="h-7 w-7 text-orange-400" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-semibold text-white">Access denied</h2>
              <p className="text-sm text-gray-400">
                You do not have permission to view this profile.
              </p>
              <a
                href="/classes"
                className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-gray-400 transition-all duration-200 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                Back to classes
              </a>
            </div>
          )}

          {/* Fetch error state */}
          {showFetchError && (
            <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
                <ExclamationTriangleIcon className="h-7 w-7 text-red-400" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-semibold text-white">Failed to load your profile</h2>
              <p className="text-sm text-gray-400">
                Please try again. If the problem continues, contact support.
              </p>
              <button
                type="button"
                onClick={() => void fetchMyProfile()}
                className="inline-flex items-center justify-center rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 hover:text-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                Try again
              </button>
            </div>
          )}

          {/* Main content */}
          {!isLoading && profile && (
            <div className="flex flex-col gap-6">
              {/* Two-column grid: 1.3fr | 1fr */}
              <div
                className="grid gap-6"
                style={{ gridTemplateColumns: '1.3fr 1fr' }}
              >
                <PersonalInfoCard
                  profile={profile}
                  avatarUrl={avatarUrl}
                  onToast={handleToast}
                />

                {membershipLoading ? (
                  <MembershipControlCardSkeleton />
                ) : activeMembership ? (
                  <MembershipControlCard
                    membership={activeMembership}
                    onToast={handleToast}
                    onCancelled={() => void fetchMyMembership()}
                  />
                ) : (
                  /* No membership state — compact placeholder */
                  <div
                    className="flex flex-col items-center justify-center gap-3 rounded-2xl p-7 text-center"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid #1F2937',
                      borderRadius: 16,
                    }}
                  >
                    <div
                      className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                      style={{ color: 'var(--color-fg-metadata, #6B7280)' }}
                    >
                      Membership
                    </div>
                    <p className="text-[14px] text-gray-400">No active membership</p>
                    <a
                      href="/plans"
                      className="mt-2 inline-flex items-center justify-center rounded-lg px-4 py-2 text-[13px] font-bold text-[#0F0F0F] transition-[filter] duration-[160ms] hover:brightness-110"
                      style={{
                        background: '#22C55E',
                        borderRadius: 8,
                        boxShadow: '0 8px 24px rgba(34,197,94,0.3)',
                      }}
                    >
                      Browse plans
                    </a>
                  </div>
                )}
              </div>

              {/* Account actions row — full width */}
              <AccountActionsCard onToast={handleToast} />
            </div>
          )}
        </div>
      </main>

      {/* Page-level toast */}
      <Toast message={pageToast} onClose={() => setPageToast(null)} />
    </div>
  )
}
