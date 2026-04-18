import { Link } from 'react-router-dom'
import type { BookedViewerState } from '../../types/landing'
import { BigCountdown } from './BigCountdown'
import { TrainerRow } from './TrainerRow'
import { useCountdown } from '../../hooks/useCountdown'
import { useReducedMotion } from '../../hooks/useReducedMotion'

interface Props {
  data: BookedViewerState;
  onTheFloor: number;
}

export function HeroBooked({ data, onTheFloor }: Props) {
  const { h, m, s, expired } = useCountdown(data.upcomingClass.startsAt)
  const reduced = useReducedMotion()

  return (
    <div className="relative z-[2]">
      {/* Live eyebrow */}
      <div className="mb-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4ADE80]">
        <span
          className={`h-2 w-2 rounded-full bg-green-500 ${reduced ? '' : 'animate-[pulse-dot_1.6s_ease-in-out_infinite]'}`}
          aria-hidden="true"
        />
        Live at the club · {onTheFloor} members in
      </div>

      {/* Headline */}
      <h1 className="m-0 font-['Barlow_Condensed'] text-[72px] font-bold uppercase leading-none tracking-[-0.01em] text-white">
        Welcome back,
        <br />
        <span className="text-green-500">{data.firstName}.</span>
      </h1>

      {/* Countdown or "class started" */}
      <div className="mt-10 flex items-end gap-8">
        {expired ? (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 px-6 py-4">
            <p className="text-[13px] font-semibold uppercase tracking-[0.24em] text-[#4ADE80]">
              Class starting now
            </p>
            <p className="mt-1 text-sm text-[#9CA3AF]">Check in to mark your attendance.</p>
          </div>
        ) : (
          <BigCountdown
            h={h}
            m={m}
            s={s}
            label={`${data.upcomingClass.name} starts in`}
          />
        )}

        {/* Trainer + studio detail */}
        <div className="pb-3.5 pl-6 border-l border-[#1F2937]">
          <p className="text-[13px] text-[#9CA3AF]">with</p>
          <p className="mt-0.5 text-[17px] font-semibold text-white">
            {data.upcomingClass.trainer.name}
          </p>
          <p className="mt-0.5 text-xs text-[#6B7280]">
            {data.upcomingClass.studio} · {data.upcomingClass.durationMin} min
          </p>
        </div>
      </div>

      {/* CTA row */}
      <div className="mt-8 flex gap-3">
        <Link
          to="/schedule"
          className="rounded-lg bg-green-500 px-[26px] py-[14px] text-[14px] font-bold text-[#0F0F0F] shadow-[0_8px_24px_rgba(34,197,94,0.3)] transition-all duration-[160ms] hover:brightness-[1.08]"
        >
          Check in now →
        </Link>
        <Link
          to="/schedule"
          className="rounded-lg border border-white/20 bg-transparent px-[26px] py-[14px] text-[14px] font-semibold text-white transition-all duration-[160ms] hover:brightness-[1.08]"
        >
          View schedule
        </Link>
      </div>

      <TrainerRow />
    </div>
  )
}
