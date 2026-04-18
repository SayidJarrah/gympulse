import type { LandingStats } from '../../types/landing'

interface Props {
  stats: LandingStats | null;
}

interface StatCell {
  number: string;
  label: string;
}

function buildCells(stats: LandingStats): StatCell[] {
  if (stats.variant === 'authed') {
    return [
      { number: String(stats.onTheFloor), label: 'On the floor' },
      { number: String(stats.classesToday), label: 'Classes today' },
      stats.tightestClass
        ? {
            number: String(stats.tightestClass.spotsLeft),
            label: `Spots left · ${stats.tightestClass.name}`,
          }
        : { number: '—', label: 'All spots open' },
    ]
  }

  return [
    { number: `${stats.memberCount.toLocaleString()}+`, label: 'Members' },
    { number: String(stats.classesToday), label: 'Classes today' },
    { number: String(stats.coachCount), label: 'Coaches' },
  ]
}

export function StatsStrip({ stats }: Props) {
  if (!stats) {
    // Skeleton
    return (
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-[#1F2937] bg-white/[0.02] p-3.5"
          >
            <div className="h-8 w-12 rounded bg-gray-800" />
            <div className="mt-2 h-2 w-16 rounded bg-gray-800" />
          </div>
        ))}
      </div>
    )
  }

  const cells = buildCells(stats)

  return (
    <div className="grid grid-cols-3 gap-3">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="rounded-xl border border-[#1F2937] bg-white/[0.02] p-3.5"
        >
          <p className="font-['Barlow_Condensed'] text-[32px] font-bold leading-none text-white">
            {cell.number}
          </p>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
            {cell.label}
          </p>
        </div>
      ))}
    </div>
  )
}
