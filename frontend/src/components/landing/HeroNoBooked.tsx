import { Link } from 'react-router-dom'
import type { NoBookedViewerState } from '../../types/landing'
import { TrainerRow } from './TrainerRow'
import { useReducedMotion } from '../../hooks/useReducedMotion'

interface Props {
  data: NoBookedViewerState;
  onTheFloor: number;
}

export function HeroNoBooked({ data, onTheFloor }: Props) {
  const reduced = useReducedMotion()
  const nc = data.nextOpenClass

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
        Hey {data.firstName}.
        <br />
        <span className="text-green-500">Get on a mat.</span>
      </h1>

      {nc ? (
        <>
          {/* Next-open class card */}
          <div className="mt-10 inline-flex items-center gap-7 rounded-2xl border border-green-500/30 bg-green-500/5 px-7 py-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4ADE80]">
                Next open · {nc.startsIn}
              </p>
              <p className="mt-2 font-['Barlow_Condensed'] text-[40px] font-bold uppercase tracking-[-0.01em] text-white">
                {nc.name}
              </p>
              <p className="mt-1 text-[13px] text-[#9CA3AF]">
                {nc.trainer.name} · {nc.studio} ·{' '}
                <span className={nc.spotsLeft <= 3 ? 'text-[#FDBA74]' : 'text-[#9CA3AF]'}>
                  {nc.spotsLeft} {nc.spotsLeft === 1 ? 'spot' : 'spots'} left
                </span>
              </p>
            </div>
            <Link
              to={`/schedule?classId=${nc.id}`}
              className="rounded-lg bg-green-500 px-7 py-4 text-[14px] font-bold text-[#0F0F0F] shadow-[0_8px_24px_rgba(34,197,94,0.3)] transition-all duration-[160ms] hover:brightness-[1.08]"
            >
              Grab a spot →
            </Link>
          </div>

          {/* Browse link */}
          <p className="mt-5 text-[13px] text-[#9CA3AF]">
            Or{' '}
            <Link
              to="/schedule"
              className="font-medium text-[#4ADE80] transition-colors duration-[160ms] hover:brightness-[1.15]"
            >
              browse the full schedule
            </Link>{' '}
            — {nc.remainingClassesToday} more {nc.remainingClassesToday === 1 ? 'class' : 'classes'} today.
          </p>
        </>
      ) : (
        <div className="mt-10 rounded-2xl border border-gray-800 bg-gray-900/60 px-7 py-6">
          <p className="text-[13px] font-semibold text-white">No open classes right now</p>
          <p className="mt-1 text-[13px] text-[#9CA3AF]">
            Check back later or{' '}
            <Link to="/schedule" className="text-[#4ADE80]">
              browse the schedule
            </Link>
            .
          </p>
        </div>
      )}

      <TrainerRow />
    </div>
  )
}
