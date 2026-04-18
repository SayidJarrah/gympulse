import type { PtTrainerSummary } from '../../types/ptBooking'

interface Props {
  trainer: PtTrainerSummary
  onSelect: (trainer: PtTrainerSummary) => void
}

const ACCENT_PALETTE = ['#4ADE80', '#FB923C', '#60A5FA', '#C084FC', '#F472B6', '#FACC15']

function hashAccent(id: string, palette: string[]): string {
  let n = 0
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i)
  return palette[n % palette.length]
}

function formatNextOpen(iso: string | null): string {
  if (!iso) return 'No slots this week'
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000)
  if (diffDays === 0) return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  if (diffDays === 1) return `Tomorrow ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export function TrainerCard({ trainer, onSelect }: Props) {
  const accent = trainer.accentColor ?? hashAccent(trainer.id, ACCENT_PALETTE)
  const initial = trainer.firstName.charAt(0).toUpperCase()

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Select ${trainer.firstName} ${trainer.lastName}`}
      onClick={() => onSelect(trainer)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(trainer) }}
      className="relative overflow-hidden rounded-2xl border border-[#1F2937] bg-[rgba(255,255,255,0.02)] p-[22px] cursor-pointer transition-all duration-200 hover:border-[rgba(255,255,255,0.18)] hover:-translate-y-0.5 hover:bg-[rgba(255,255,255,0.035)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
    >
      {/* Ambient accent glow */}
      <div
        className="pointer-events-none absolute -right-4 -top-4 h-[180px] w-[180px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${accent}22, transparent 70%)`,
          filter: 'blur(20px)',
        }}
        aria-hidden="true"
      />

      <div className="relative">
        {/* Top row: avatar + name */}
        <div className="flex items-center gap-3 mb-3">
          {trainer.profilePhotoUrl ? (
            <img
              src={trainer.profilePhotoUrl}
              alt={`${trainer.firstName} ${trainer.lastName}`}
              className="h-[52px] w-[52px] rounded-full object-cover"
              style={{ boxShadow: `0 8px 24px ${accent}40` }}
            />
          ) : (
            <div
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-[20px] font-bold text-black"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                boxShadow: `0 8px 24px ${accent}40`,
              }}
              aria-hidden="true"
            >
              {initial}
            </div>
          )}
          <div>
            <h3 className="font-['Barlow_Condensed'] text-2xl font-bold uppercase tracking-tight text-white leading-none">
              {trainer.firstName} {trainer.lastName}
            </h3>
            <p className="text-[12px] text-[#9CA3AF] mt-0.5">
              {trainer.experienceYears != null ? `${trainer.experienceYears} yrs` : ''}
              {trainer.experienceYears != null && trainer.sessionsCompleted > 0 ? ' · ' : ''}
              {trainer.sessionsCompleted > 0 ? `${trainer.sessionsCompleted} sessions` : ''}
            </p>
          </div>
        </div>

        {/* Bio */}
        {trainer.bio && (
          <p className="mb-3 min-h-[60px] text-[13px] leading-relaxed text-[#9CA3AF]">
            {trainer.bio}
          </p>
        )}

        {/* Specialty chips */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {trainer.specializations.map((s) => (
            <span
              key={s}
              className="rounded-full bg-[rgba(255,255,255,0.04)] px-2.5 py-0.5 text-[11px] font-medium text-[#D1D5DB]"
            >
              {s}
            </span>
          ))}
        </div>

        {/* Bottom row: next open + week count */}
        <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.05)] pt-3.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF] mb-0.5">
              Next open
            </p>
            <p className="text-[13px] font-medium text-white">
              {formatNextOpen(trainer.nextOpenAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF] mb-0.5">
              This week
            </p>
            <p
              className="font-['Barlow_Condensed'] text-[22px] font-bold text-[#4ADE80]"
              aria-label={`${trainer.weekOpenCount} open slots this week`}
            >
              {trainer.weekOpenCount}
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}
