import { useNavigate } from 'react-router-dom'

interface Props {
  planName: string | null;
  status: string | null;
  bookingsUsed: number;
  bookingsMax: number;
  renewsAt: string | null;
  renewsInDays: number | null;
  loading: boolean;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function MembershipSection({
  planName,
  status,
  bookingsUsed,
  bookingsMax,
  renewsAt,
  renewsInDays,
  loading,
}: Props) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="h-[360px] animate-pulse rounded-2xl border border-[#1F2937] bg-white/[0.02]" />
    )
  }

  if (!planName) {
    // No membership — show a prompt
    return (
      <div className="flex flex-col items-start justify-center rounded-2xl border border-[#1F2937] bg-white/[0.02] p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7280]">
          Your access
        </p>
        <p className="mt-3 font-['Barlow_Condensed'] text-[34px] font-bold uppercase tracking-[-0.01em] leading-[1.05] text-white">
          No plan<br />active
        </p>
        <p className="mt-3 text-[13px] text-[#9CA3AF]">
          Choose a plan to unlock bookings and full member access.
        </p>
        <button
          onClick={() => navigate('/plans')}
          className="mt-5 w-full rounded-lg border border-white/15 bg-transparent py-3 text-[13px] font-semibold text-white transition-all duration-[160ms] hover:brightness-[1.08]"
        >
          Browse plans
        </button>
      </div>
    )
  }

  const isActive = status === 'ACTIVE'
  const pct = bookingsMax > 0 ? Math.min(100, (bookingsUsed / bookingsMax) * 100) : 0
  const renewalDateStr = renewsAt ? formatDate(renewsAt) : '—'
  const isUnlimited = bookingsMax === 0

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[#1F2937] p-7"
      style={{
        background: 'linear-gradient(180deg, rgba(34,197,94,0.06), rgba(255,255,255,0.02) 70%)',
      }}
    >
      {/* Corner glow */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-[200px] w-[200px]"
        style={{
          background: 'radial-gradient(circle, rgba(34,197,94,0.2), transparent 70%)',
          filter: 'blur(20px)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-[1]">
        {/* Header row */}
        <div className="flex items-center gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7280]">
            Your access
          </p>
          {isActive && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-[3px] text-[10px] font-bold tracking-[0.08em] text-[#4ADE80]">
              <span className="h-[5px] w-[5px] rounded-full bg-green-500" aria-hidden="true" />
              ACTIVE
            </span>
          )}
        </div>

        {/* Plan name */}
        <p className="mt-2.5 font-['Barlow_Condensed'] text-[34px] font-bold uppercase leading-[1.05] tracking-[-0.01em] text-white">
          {planName}
          <br />
          Membership
        </p>

        {/* Bookings progress */}
        <div className="mt-6">
          {isUnlimited ? (
            <div className="flex items-baseline justify-between">
              <p className="text-xs text-[#9CA3AF]">Bookings this cycle</p>
              <p className="text-xs font-semibold tabular-nums text-white">Unlimited</p>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-xs text-[#9CA3AF]">Bookings this cycle</p>
                <p className="text-xs font-semibold tabular-nums text-white">
                  {bookingsUsed} / {bookingsMax}
                </p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #22C55E, #4ADE80)',
                    boxShadow: '0 0 12px rgba(34,197,94,0.5)',
                  }}
                  role="progressbar"
                  aria-valuenow={bookingsUsed}
                  aria-valuemin={0}
                  aria-valuemax={bookingsMax}
                  aria-label="Bookings used this cycle"
                />
              </div>
            </>
          )}
        </div>

        {/* Renewal mini-card */}
        <div className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/30 px-4 py-3.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6B7280]">
              Renews
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white">{renewalDateStr}</p>
          </div>
          <div className="font-['Barlow_Condensed'] text-[28px] font-bold tracking-[-0.01em] tabular-nums text-[#4ADE80]">
            {renewsInDays ?? '—'}
            <span className="ml-1 text-xs font-medium text-[#9CA3AF]">days</span>
          </div>
        </div>

        {/* Manage button */}
        <button
          onClick={() => navigate('/membership')}
          className="mt-[18px] w-full rounded-lg border border-white/15 bg-transparent py-3 text-[13px] font-semibold text-white transition-all duration-[160ms] hover:brightness-[1.08]"
        >
          Manage membership
        </button>
      </div>
    </div>
  )
}
