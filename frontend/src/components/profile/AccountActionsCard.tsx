import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useProfileStore } from '../../store/profileStore'
import { useMembershipStore } from '../../store/membershipStore'
import { CancelMembershipModal } from '../membership/CancelMembershipModal'

interface AccountActionsCardProps {
  onToast: (message: string) => void;
}

/**
 * Pulse-DNA Account Actions row — full-width, below the two-column grid.
 * Contains: Change password | Sign out | Cancel membership (destructive).
 */
export function AccountActionsCard({ onToast }: AccountActionsCardProps) {
  const navigate = useNavigate()
  const { clearAuth } = useAuthStore()
  const { resetProfile } = useProfileStore()
  const { activeMembership, fetchMyMembership } = useMembershipStore()
  const [cancelOpen, setCancelOpen] = useState(false)

  const handleSignOut = () => {
    resetProfile()
    clearAuth()
    navigate('/login')
  }

  const handleChangePassword = () => {
    // Navigate to existing password change route if it exists, else stub toast
    onToast('Password change — coming soon.')
  }

  const handleCancelMembership = () => {
    if (!activeMembership) {
      onToast('No active membership to cancel.')
      return
    }
    setCancelOpen(true)
  }

  return (
    <>
      <div
        className="flex flex-wrap items-center justify-between gap-5 rounded-2xl p-6"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid #1F2937',
          borderRadius: 16,
        }}
      >
        {/* Left: eyebrow + title + subcopy */}
        <div className="min-w-0">
          <div
            className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: 'var(--color-fg-metadata, #6B7280)' }}
          >
            Account
          </div>
          <div className="mt-1.5 text-[15px] font-semibold text-white">
            Sign out or close your account
          </div>
          <div className="mt-1 max-w-[480px] text-[12px]" style={{ color: 'var(--color-fg-muted, #9CA3AF)' }}>
            Cancelling ends your plan at the current cycle&apos;s end — no refund for unused days.
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleChangePassword}
            className="rounded-lg text-[13px] font-medium text-white transition-[filter] duration-[160ms] hover:brightness-110"
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              whiteSpace: 'nowrap',
            }}
          >
            Change password
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg text-[13px] font-medium text-white transition-[filter] duration-[160ms] hover:brightness-110"
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              whiteSpace: 'nowrap',
            }}
          >
            Sign out
          </button>
          <button
            type="button"
            onClick={handleCancelMembership}
            className="rounded-lg text-[13px] font-medium transition-[filter] duration-[160ms] hover:brightness-110"
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#F87171',
              borderRadius: 8,
              whiteSpace: 'nowrap',
            }}
          >
            Cancel membership
          </button>
        </div>
      </div>

      {activeMembership && (
        <CancelMembershipModal
          isOpen={cancelOpen}
          membership={activeMembership}
          onCancel={() => setCancelOpen(false)}
          onCancelled={() => {
            setCancelOpen(false)
            onToast('Membership cancelled.')
            void fetchMyMembership()
          }}
        />
      )}
    </>
  )
}
