import { useState, useRef } from 'react'
import type { AdminPtSession, AdminPtStats, AdminPtFilters } from '../../types/ptBooking'

interface Props {
  sessions: AdminPtSession[]
  stats: AdminPtStats | null
  loading: boolean
  error: string | null
  filters: AdminPtFilters
  onFilterChange: (f: Partial<AdminPtFilters>) => void
  onExport: () => void
}

const ACCENT_PALETTE = ['#4ADE80', '#FB923C', '#60A5FA', '#C084FC', '#F472B6', '#FACC15']

function hashAccent(id: string, palette: string[]): string {
  let n = 0
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i)
  return palette[n % palette.length]
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface TinyAvatarProps { name: string; accent: string }
function TinyAvatar({ name, accent }: TinyAvatarProps) {
  return (
    <span
      className="mr-1.5 inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-black"
      style={{ background: accent }}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

export function AdminPtSessions({ sessions, stats, loading, error, filters, onFilterChange, onExport }: Props) {
  const [searchValue, setSearchValue] = useState(filters.q ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resultRegionRef = useRef<HTMLDivElement>(null)

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onFilterChange({ q: value || undefined })
    }, 150)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
          ADMIN · PERSONAL TRAINING
        </p>
        <h1 className="font-['Barlow_Condensed'] text-[48px] font-bold uppercase leading-tight text-white">
          All Sessions
        </h1>
      </div>

      {/* Stat tiles */}
      {stats && (
        <div className="mb-6 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {[
            { value: stats.activeCount, label: 'Active', tone: '#4ADE80' },
            { value: stats.uniqueMembers, label: 'Members booking', tone: '#60A5FA' },
            { value: stats.uniqueTrainers, label: 'Trainers in play', tone: '#FB923C' },
            { value: stats.cancelledCount, label: 'Cancellations', tone: '#F87171' },
          ].map(({ value, label, tone }) => (
            <div
              key={label}
              className="rounded-2xl border border-[#1F2937] bg-[rgba(255,255,255,0.02)] px-5 py-4"
            >
              <p
                className="font-['Barlow_Condensed'] text-[38px] font-bold leading-none"
                style={{ color: tone }}
              >
                {value}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
                {label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar + table */}
      <div className="rounded-xl border border-[#1F2937] bg-[rgba(255,255,255,0.02)]">
        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[#1F2937] p-4">
          <input
            type="search"
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search trainer, member, room…"
            className="flex-[1_1_260px] rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.30)] px-3.5 py-2.5 text-[13px] text-white placeholder-[#9CA3AF] outline-none transition focus:border-[rgba(34,197,94,0.40)] focus:ring-1 focus:ring-green-500/30"
            aria-label="Search sessions"
          />

          {/* Trainer filter — kept simple; full select implementation */}
          <div className="relative">
            <select
              value={filters.status ?? ''}
              onChange={(e) => onFilterChange({ status: e.target.value || undefined })}
              className="appearance-none rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.30)] py-[7px] pl-3 pr-7 text-[12px] text-[#D1D5DB] outline-none focus:border-[rgba(34,197,94,0.40)] focus:ring-1 focus:ring-green-500/30"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-[10px]">▼</span>
          </div>

          <div className="flex-1" />

          <button
            className="rounded-lg border border-[rgba(255,255,255,0.12)] px-4 py-2 text-[12px] font-medium text-[#D1D5DB] transition-colors hover:border-[rgba(255,255,255,0.25)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            onClick={onExport}
            aria-label="Export sessions as CSV"
          >
            Export CSV
          </button>
        </div>

        {/* aria-live region for result count */}
        <div
          ref={resultRegionRef}
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {!loading && `${sessions.length} session${sessions.length !== 1 ? 's' : ''} found`}
        </div>

        {/* Table header */}
        <div
          className="grid border-b border-[#1F2937] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]"
          style={{ gridTemplateColumns: '180px 1.3fr 1.3fr 120px 140px 100px' }}
          role="row"
          aria-label="Table header"
        >
          <span>When</span>
          <span>Trainer</span>
          <span>Member</span>
          <span>Room</span>
          <span>Status</span>
          <span />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex h-32 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#22C55E] border-t-transparent" aria-label="Loading sessions" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <p className="px-4 py-6 text-[14px] text-[#F87171]" role="alert">{error}</p>
        )}

        {/* Empty */}
        {!loading && !error && sessions.length === 0 && (
          <p className="px-4 py-6 text-[14px] text-[#9CA3AF]">No sessions match these filters.</p>
        )}

        {/* Rows */}
        {!loading && !error && sessions.map((session) => {
          const isCancelled = session.status === 'CANCELLED'
          const accent = session.trainerAccentColor ?? hashAccent(session.trainerId, ACCENT_PALETTE)

          return (
            <div
              key={session.id}
              className={`grid items-center border-t border-[#1F2937] px-4 py-3.5 text-[13px] transition-colors hover:bg-[rgba(255,255,255,0.02)] ${
                isCancelled ? 'opacity-60' : ''
              }`}
              style={{ gridTemplateColumns: '180px 1.3fr 1.3fr 120px 140px 100px' }}
              role="row"
            >
              <span className={`font-medium text-white ${isCancelled ? 'line-through' : ''}`}>
                {formatWhen(session.startAt)}
              </span>

              <span className={`flex items-center ${isCancelled ? 'line-through text-[#9CA3AF]' : 'text-[#D1D5DB]'}`}>
                <TinyAvatar name={session.trainerName} accent={accent} />
                {session.trainerName}
              </span>

              <span className={isCancelled ? 'line-through text-[#9CA3AF]' : 'text-[#D1D5DB]'}>
                {session.memberName}
              </span>

              <span className={isCancelled ? 'text-[#9CA3AF]' : 'text-[#D1D5DB]'}>
                {session.room || '—'}
              </span>

              <span>
                {isCancelled ? (
                  <span className="rounded-full border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.10)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#F87171]">
                    Cancelled
                  </span>
                ) : (
                  <span className="rounded-full border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.08)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#4ADE80]">
                    Confirmed
                  </span>
                )}
              </span>

              <span />
            </div>
          )
        })}
      </div>
    </div>
  )
}
