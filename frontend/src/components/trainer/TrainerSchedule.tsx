import type { PtBookingResponse, TrainerSessionClass, TrainerSessionStats } from '../../types/ptBooking'

interface Props {
  trainerName: string
  ptSessions: PtBookingResponse[]
  groupClasses: TrainerSessionClass[]
  stats: TrainerSessionStats
  loading: boolean
  error: string | null
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((d.getTime() - today.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

function getDateKey(iso: string): string {
  return iso.slice(0, 10)
}

interface SessionItem {
  id: string
  startAt: string
  label: string
  room: string | null
  type: 'pt' | 'class'
  memberName?: string
}

export function TrainerSchedule({ trainerName, ptSessions, groupClasses, stats, loading, error }: Props) {
  // Group all sessions by date
  const allItems: SessionItem[] = [
    ...ptSessions.map<SessionItem>((b) => ({
      id: b.id,
      startAt: b.startAt,
      label: b.memberName,
      room: b.room || null,
      type: 'pt',
      memberName: b.memberName,
    })),
    ...groupClasses.map<SessionItem>((c) => ({
      id: c.id,
      startAt: c.scheduledAt,
      label: c.name,
      room: c.room,
      type: 'class',
    })),
  ].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

  const grouped = allItems.reduce<Record<string, SessionItem[]>>((acc, item) => {
    const key = getDateKey(item.startAt)
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
          TRAINER VIEW · {trainerName.toUpperCase()}
        </p>
        <h1 className="font-['Barlow_Condensed'] text-[48px] font-bold uppercase leading-tight text-white">
          My Schedule
        </h1>
      </div>

      {/* Stat tiles */}
      <div className="mb-8 flex flex-wrap gap-4">
        {[
          { value: stats.ptCount, label: 'PT Sessions', tone: '#4ADE80' },
          { value: stats.classCount, label: 'Group Classes', tone: '#FB923C' },
          { value: stats.total, label: 'Total Sessions', tone: '#D1D5DB' },
        ].map(({ value, label, tone }) => (
          <div
            key={label}
            className="min-w-[150px] flex-1 rounded-2xl border border-[#1F2937] bg-[rgba(255,255,255,0.02)] px-5 py-4"
          >
            <p
              className="font-['Barlow_Condensed'] text-[34px] font-bold leading-none"
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

      {/* Loading */}
      {loading && (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#22C55E] border-t-transparent" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <p className="text-[14px] text-[#F87171]" role="alert">{error}</p>
      )}

      {/* Empty state */}
      {!loading && !error && allItems.length === 0 && (
        <p className="text-[14px] text-[#9CA3AF]">No sessions scheduled in the next 14 days.</p>
      )}

      {/* Day-grouped sessions */}
      {!loading && !error && Object.entries(grouped).map(([dateKey, items]) => (
        <div key={dateKey} className="mb-8 flex gap-6">
          {/* Day label column */}
          <div className="w-[140px] shrink-0 pt-1">
            <p className="font-['Barlow_Condensed'] text-[26px] font-bold leading-tight text-white">
              {formatDayLabel(items[0].startAt)}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
              {items.length} session{items.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Sessions */}
          <div className="flex-1 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid items-center gap-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.25)] py-4 pl-4 pr-5"
                style={{
                  gridTemplateColumns: 'auto 1fr auto',
                  borderLeft: `3px solid ${item.type === 'pt' ? '#22C55E' : '#F97316'}`,
                }}
              >
                {/* Time */}
                <p className="font-['Barlow_Condensed'] text-[22px] font-bold tabular-nums text-white min-w-[64px]">
                  {formatTime(item.startAt)}
                </p>

                {/* Label */}
                <div>
                  <p className="text-[15px] font-medium text-white">{item.label}</p>
                  {item.room && <p className="text-[12px] text-[#9CA3AF]">{item.room}</p>}
                </div>

                {/* Type pill */}
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${
                    item.type === 'pt'
                      ? 'bg-[rgba(34,197,94,0.12)] text-[#4ADE80]'
                      : 'bg-[rgba(249,115,22,0.12)] text-[#FB923C]'
                  }`}
                >
                  {item.type === 'pt' ? 'PT' : 'Class'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
