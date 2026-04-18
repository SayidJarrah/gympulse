import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UserMembership } from '../../types/userMembership'
import { CancelMembershipModal } from './CancelMembershipModal'

interface MembershipControlCardProps {
  membership: UserMembership;
  onToast: (message: string) => void;
  onCancelled: () => void;
}

/**
 * Formats an ISO date string "2026-05-02" to a display string "May 2".
 */
function formatShortDate(isoDateString: string): string {
  const date = new Date(`${isoDateString}T00:00:00Z`)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * Formats "2026-05-02" to "May 2, 2026".
 */
function formatLongDate(isoDateString: string): string {
  const date = new Date(`${isoDateString}T00:00:00Z`)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function getDaysRemaining(isoEndDate: string): number {
  const end = new Date(`${isoEndDate}T00:00:00Z`)
  const now = new Date()
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000))
}

/**
 * Pulse-DNA Membership Control card — the "full" variant used on the profile page.
 * Compact variant (home page) is the existing MembershipSection component.
 */
export function MembershipControlCard({ membership, onToast, onCancelled }: MembershipControlCardProps) {
  const navigate = useNavigate()
  const [cancelOpen, setCancelOpen] = useState(false)

  const pct = membership.maxBookingsPerMonth > 0
    ? (membership.bookingsUsedThisMonth / membership.maxBookingsPerMonth) * 100
    : 0
  const daysLeft = getDaysRemaining(membership.endDate)
  const isActive = membership.status === 'ACTIVE'

  return (
    <>
      <div
        className="relative overflow-hidden rounded-2xl p-7"
        style={{
          background: 'linear-gradient(180deg, rgba(34,197,94,0.06), rgba(255,255,255,0.02) 70%)',
          border: '1px solid #1F2937',
          borderRadius: 16,
        }}
      >
        {/* Corner glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            top: -40, right: -40,
            width: 220, height: 220,
            background: 'radial-gradient(circle, rgba(34,197,94,0.18), transparent 70%)',
            filter: 'blur(20px)',
          }}
        />

        <div className="relative z-[1]">
          {/* Membership eyebrow + ACTIVE pill */}
          <div className="flex items-center gap-2.5">
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: 'var(--color-fg-metadata, #6B7280)' }}
            >
              Membership
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
              style={{
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.30)',
                color: '#4ADE80',
                letterSpacing: '0.08em',
              }}
            >
              <span
                aria-hidden="true"
                className="h-[5px] w-[5px] rounded-full"
                style={{ background: '#22C55E' }}
              />
              {membership.status}
            </span>
          </div>

          {/* Plan name */}
          <div
            className="mt-2.5 uppercase leading-[1.05] font-bold"
            style={{
              fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)',
              fontSize: 34,
              letterSpacing: '-0.01em',
              color: '#fff',
            }}
          >
            {membership.planName}
          </div>
          <div className="mt-1.5 text-[13px]" style={{ color: 'var(--color-fg-muted, #9CA3AF)' }}>
            {membership.price}
          </div>

          {/* Bookings bar */}
          <div className="mt-6">
            <div className="mb-2 flex items-baseline justify-between">
              <div className="text-[12px]" style={{ color: 'var(--color-fg-muted, #9CA3AF)' }}>Bookings this cycle</div>
              <div className="text-[12px] font-semibold text-white tabular-nums">
                {membership.bookingsUsedThisMonth} / {membership.maxBookingsPerMonth}
              </div>
            </div>
            <div
              role="progressbar"
              aria-valuenow={membership.bookingsUsedThisMonth}
              aria-valuemin={0}
              aria-valuemax={membership.maxBookingsPerMonth}
              aria-label="Bookings used this cycle"
              className="h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #22C55E, #4ADE80)',
                  boxShadow: '0 0 12px rgba(34,197,94,0.5)',
                }}
              />
            </div>
          </div>

          {/* Renewal mini-card */}
          <div
            className="mt-5 flex items-center justify-between rounded-xl px-4 py-3.5"
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div>
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: 'var(--color-fg-metadata, #6B7280)' }}
              >
                {isActive ? 'Renews' : 'Ended'}
              </div>
              <div className="mt-0.5 text-[14px] font-semibold text-white">
                {formatLongDate(membership.endDate)}
              </div>
              {isActive && (
                <div className="mt-0.5 text-[11px]" style={{ color: 'var(--color-fg-muted, #9CA3AF)' }}>
                  {membership.nextChargeCopy}
                </div>
              )}
            </div>
            {isActive && (
              <div
                className="font-bold tabular-nums leading-none"
                style={{
                  fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)',
                  fontSize: 28,
                  letterSpacing: '-0.01em',
                  color: '#4ADE80',
                }}
              >
                {daysLeft}
                <span
                  className="ml-1 text-[12px] font-medium"
                  style={{ color: 'var(--color-fg-muted, #9CA3AF)' }}
                >
                  days
                </span>
              </div>
            )}
          </div>

          {/* Payment row */}
          <div
            className="mt-4 flex items-center justify-between rounded-xl px-4 py-3.5"
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div>
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: 'var(--color-fg-metadata, #6B7280)' }}
              >
                Payment
              </div>
              <div className="mt-0.5 text-[14px] font-medium text-white">
                {membership.paymentMethod
                  ? `${membership.paymentMethod.brand.charAt(0).toUpperCase()}${membership.paymentMethod.brand.slice(1)} ending ${membership.paymentMethod.last4}`
                  : 'Not on file'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToast('Payment update coming soon.')}
              className="rounded-lg text-[12px] font-medium transition-[filter] duration-[160ms] hover:brightness-110"
              style={{
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--color-fg-label, #D1D5DB)',
                borderRadius: 8,
              }}
            >
              Update
            </button>
          </div>

          {/* Change plan + Pause */}
          {isActive && (
            <div className="mt-[18px] grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/pricing?intent=change')}
                className="rounded-lg py-3 text-[13px] font-bold transition-[filter] duration-[160ms] hover:brightness-110"
                style={{
                  padding: '12px 16px',
                  background: '#22C55E',
                  color: '#0F0F0F',
                  border: 'none',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(34,197,94,0.3)',
                }}
              >
                Change plan
              </button>
              <button
                type="button"
                onClick={() => onToast('Pause feature coming soon.')}
                className="rounded-lg py-3 text-[13px] font-semibold text-white transition-[filter] duration-[160ms] hover:brightness-110"
                style={{
                  padding: '12px 16px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8,
                }}
              >
                Pause
              </button>
            </div>
          )}
        </div>
      </div>

      <CancelMembershipModal
        isOpen={cancelOpen}
        membership={membership}
        onCancel={() => setCancelOpen(false)}
        onCancelled={() => {
          setCancelOpen(false)
          onCancelled()
        }}
      />
    </>
  )
}

/**
 * Loading skeleton for the Membership Control card.
 */
export function MembershipControlCardSkeleton() {
  return (
    <div
      className="animate-pulse rounded-2xl p-7"
      style={{
        background: 'linear-gradient(180deg, rgba(34,197,94,0.04), rgba(255,255,255,0.02) 70%)',
        border: '1px solid #1F2937',
        borderRadius: 16,
      }}
      aria-hidden="true"
    >
      <div className="flex items-center gap-2">
        <div className="h-3 w-20 rounded bg-gray-800" />
        <div className="h-4 w-14 rounded-full bg-gray-800" />
      </div>
      <div className="mt-3 h-8 w-48 rounded bg-gray-800" />
      <div className="mt-2 h-3 w-28 rounded bg-gray-800" />
      <div className="mt-6 h-3 w-32 rounded bg-gray-800" />
      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-800" />
      <div className="mt-5 h-16 rounded-xl bg-gray-800" />
      <div className="mt-4 h-12 rounded-xl bg-gray-800" />
    </div>
  )
}
