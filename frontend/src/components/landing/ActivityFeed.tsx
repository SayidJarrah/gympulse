import type { ActivityEvent } from '../../types/landing'
import { useReducedMotion } from '../../hooks/useReducedMotion'

const KIND_COLORS: Record<ActivityEvent['kind'], string> = {
  checkin: '#22C55E',
  booking: '#F97316',
  pr: '#FDBA74',
  class: '#60A5FA',
}

interface FeedDotProps {
  kind: ActivityEvent['kind'];
}

function FeedDot({ kind }: FeedDotProps) {
  const color = KIND_COLORS[kind] ?? '#ffffff'
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{
        background: color,
        boxShadow: `0 0 12px ${color}`,
      }}
      aria-hidden="true"
    />
  )
}

function formatRelative(isoAt: string): string {
  const diffMs = Date.now() - new Date(isoAt).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'now'
  if (diffMin === 1) return '1m'
  return `${diffMin}m`
}

interface Props {
  events: ActivityEvent[];
  activeIndex: number;
  /** "loggedOut" → "Live at the club", "club" → "At the club", default → "Activity" */
  mode?: 'loggedOut' | 'club' | 'authed';
  /** @deprecated Use mode="loggedOut" instead */
  isLoggedOut?: boolean;
}

function eyebrowLabel(mode: 'loggedOut' | 'club' | 'authed'): string {
  if (mode === 'loggedOut') return 'Live at the club'
  if (mode === 'club') return 'At the club'
  return 'Activity'
}

export function ActivityFeed({ events, activeIndex, mode, isLoggedOut = false }: Props) {
  const reduced = useReducedMotion()
  const resolvedMode: 'loggedOut' | 'club' | 'authed' =
    mode ?? (isLoggedOut ? 'loggedOut' : 'authed')

  return (
    <div
      className="relative max-h-[460px] overflow-hidden rounded-2xl border border-[#1F2937] bg-white/[0.02] px-6 pb-2 pt-6"
      role="log"
      aria-live="polite"
      aria-atomic="false"
      aria-label="Live activity feed"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7280] whitespace-nowrap">
          {eyebrowLabel(resolvedMode)}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-[#4ADE80]">
          <span
            className={`h-1.5 w-1.5 rounded-full bg-green-500 ${reduced ? '' : 'animate-[pulse-dot_1.6s_ease-in-out_infinite]'}`}
            aria-hidden="true"
          />
          Live
        </div>
      </div>

      {/* Feed rows */}
      <div className="flex flex-col gap-0.5">
        {events.slice(0, 8).map((item, i) => {
          const isActive = i === (events.length > 0 ? activeIndex % events.length : 0)
          return (
            <div
              key={item.id}
              className="flex items-center gap-3.5 px-1 py-3.5"
              style={{
                borderBottom: i < Math.min(events.length, 8) - 1
                  ? '1px solid rgba(255,255,255,0.04)'
                  : 'none',
                opacity: isActive ? 1 : 0.55,
                transition: reduced ? 'none' : 'opacity 400ms ease',
              }}
            >
              <FeedDot kind={item.kind} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-white">
                  <span className="font-semibold">{item.actor}</span>{' '}
                  <span className="text-[#9CA3AF]">{item.text}</span>
                </p>
              </div>
              <span className="shrink-0 text-[11px] tabular-nums text-[#6B7280]">
                {formatRelative(item.at)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Bottom fade overlay */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[60px]"
        style={{ background: 'linear-gradient(180deg, transparent, #0F0F0F)' }}
        aria-hidden="true"
      />
    </div>
  )
}
