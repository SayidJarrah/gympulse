interface StatCellProps {
  eyebrow: string;
  value: string | number;
  denom?: string;
  sub: string;
}

function StatCell({ eyebrow, value, denom, sub }: StatCellProps) {
  return (
    <div
      className="rounded-[14px] border border-[#1F2937] bg-white/[0.02] px-5 py-[18px]"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6B7280]">
        {eyebrow}
      </p>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="font-['Barlow_Condensed'] text-[44px] font-bold leading-none tracking-[-0.02em] tabular-nums text-white">
          {value}
        </span>
        {denom && (
          <span className="text-[13px] font-medium text-[#9CA3AF]">{denom}</span>
        )}
      </div>
      <p className="mt-1.5 text-xs text-[#9CA3AF]">{sub}</p>
    </div>
  )
}

interface Props {
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

export function MemberStats({ bookingsUsed, bookingsMax, renewsAt, renewsInDays, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-[14px]">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[110px] animate-pulse rounded-[14px] border border-[#1F2937] bg-white/[0.02]" />
        ))}
      </div>
    )
  }

  const bookingsLeft = Math.max(0, bookingsMax - bookingsUsed)
  const renewalDateStr = renewsAt ? formatDate(renewsAt) : '—'

  return (
    <div className="grid grid-cols-3 gap-[14px]">
      <StatCell
        eyebrow="Bookings left"
        value={bookingsLeft}
        denom={bookingsMax > 0 ? `/ ${bookingsMax}` : undefined}
        sub="this month"
      />
      <StatCell
        eyebrow="Plan renews"
        value={renewsInDays ?? '—'}
        denom={renewsInDays !== null ? 'days' : undefined}
        sub={renewalDateStr}
      />
      <StatCell
        eyebrow="Bookings used"
        value={bookingsUsed}
        sub="this cycle"
      />
    </div>
  )
}
