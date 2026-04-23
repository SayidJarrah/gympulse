import { Link } from 'react-router-dom'
import { TrainerRow } from './TrainerRow'
import { useReducedMotion } from '../../hooks/useReducedMotion'

export function HeroLoggedOut() {
  const reduced = useReducedMotion()

  return (
    <div className="relative z-[2]">
      {/* Location eyebrow */}
      <div className="mb-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4ADE80]">
        <span
          className={`h-2 w-2 rounded-full bg-green-500 ${reduced ? '' : 'animate-[pulse-dot_1.6s_ease-in-out_infinite]'}`}
          aria-hidden="true"
        />
        Brooklyn · Williamsburg
      </div>

      {/* Headline */}
      <h1 className="m-0 font-['Barlow_Condensed'] text-[80px] font-bold uppercase leading-[0.95] tracking-[-0.01em] text-white">
        A gym with a
        <br />
        <span className="text-green-500">pulse.</span>
      </h1>

      {/* Subhead */}
      <p className="mt-6 max-w-[480px] text-[17px] leading-relaxed text-[#9CA3AF]">
        Strength, flow, and lifting classes six days a week. No crowded floors. No nonsense.
      </p>

      {/* CTA row */}
      <div className="mt-8 flex gap-3">
        <Link
          to="/onboarding"
          className="rounded-lg bg-green-500 px-[26px] py-[14px] text-[14px] font-bold text-[#0F0F0F] shadow-[0_8px_24px_rgba(34,197,94,0.3)] transition-all duration-[160ms] hover:brightness-[1.08]"
        >
          Start 7-day trial →
        </Link>
        <Link
          to="/schedule"
          className="rounded-lg border border-white/20 bg-transparent px-[26px] py-[14px] text-[14px] font-semibold text-white transition-all duration-[160ms] hover:brightness-[1.08]"
        >
          See a class
        </Link>
      </div>

      <TrainerRow variant="total" />
    </div>
  )
}
