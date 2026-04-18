import { Link } from 'react-router-dom'
import type { BookingResponse } from '../../types/booking'
import { BigCountdown } from '../landing/BigCountdown'
import { useCountdown } from '../../hooks/useCountdown'
import { useReducedMotion } from '../../hooks/useReducedMotion'

interface Props {
  firstName: string | null;
  nextBookedClass: BookingResponse | null;
  nextClassStudio: string | null;
  onTheFloor: number;
  onCancelBooking: () => void;
  cancellingBooking: boolean;
}

function HomeHeroBooked({
  firstName,
  nextBookedClass,
  nextClassStudio,
  onTheFloor,
  onCancelBooking,
  cancellingBooking,
}: {
  firstName: string | null;
  nextBookedClass: BookingResponse;
  nextClassStudio: string | null;
  onTheFloor: number;
  onCancelBooking: () => void;
  cancellingBooking: boolean;
}) {
  const { h, m, s, expired } = useCountdown(nextBookedClass.scheduledAt)
  const reduced = useReducedMotion()
  const name = firstName ?? 'Member'
  const trainerName = nextBookedClass.trainerNames[0] ?? 'Your trainer'
  const countdownLabel = `${nextBookedClass.className} starts in`
  const ariaLabel = expired
    ? `${nextBookedClass.className} is starting now — check in`
    : `${nextBookedClass.className} starts in ${h} hours ${m} minutes ${s} seconds`

  return (
    <div className="relative z-[2]">
      {/* Live eyebrow */}
      <div className="mb-5 inline-flex items-center gap-2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4ADE80]">
        <span
          className={`h-2 w-2 rounded-full bg-green-500 ${reduced ? '' : 'animate-[pulse-dot_1.6s_ease-in-out_infinite]'}`}
          aria-hidden="true"
        />
        Live at the club · {onTheFloor} members in
      </div>

      {/* Headline */}
      <h1 className="m-0 font-['Barlow_Condensed'] text-[64px] font-bold uppercase leading-none tracking-[-0.01em] text-white">
        Welcome back,
        <br />
        <span className="text-green-500">{name}.</span>
      </h1>

      {/* Countdown row */}
      <div className="mt-8 flex items-end gap-7">
        {expired ? (
          <div
            className="rounded-2xl border border-green-500/30 bg-green-500/10 px-6 py-4"
            role="status"
            aria-label={ariaLabel}
          >
            <p className="text-[13px] font-semibold uppercase tracking-[0.24em] text-[#4ADE80]">
              Class starting · check in
            </p>
            <p className="mt-1 text-sm text-[#9CA3AF]">
              {nextBookedClass.className} is starting now
            </p>
          </div>
        ) : (
          <>
            {/* Accessible hidden live region for countdown */}
            <span className="sr-only" aria-live="polite" aria-atomic="true">
              {ariaLabel}
            </span>
            <BigCountdown h={h} m={m} s={s} label={countdownLabel} />
          </>
        )}

        {/* Trainer detail */}
        {!expired && (
          <div className="pb-3.5 pl-[22px] border-l border-[#1F2937]">
            <p className="text-[13px] text-[#9CA3AF]">with</p>
            <p className="mt-0.5 text-[17px] font-semibold text-white">{trainerName}</p>
            <p className="mt-0.5 text-xs text-[#6B7280]">
              {nextClassStudio ? `${nextClassStudio} · ` : ''}{nextBookedClass.durationMin} min
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-7 flex gap-2.5">
        <a
          href={generateIcsDownload(nextBookedClass)}
          download={`${nextBookedClass.className.replace(/\s+/g, '-')}.ics`}
          className="rounded-lg bg-green-500 px-[22px] py-3 text-[13px] font-bold text-[#0F0F0F] shadow-[0_8px_24px_rgba(34,197,94,0.3)] transition-all duration-[160ms] hover:brightness-[1.08]"
        >
          Add to calendar
        </a>
        <button
          onClick={onCancelBooking}
          disabled={cancellingBooking}
          className="rounded-lg border border-white/20 bg-transparent px-[22px] py-3 text-[13px] font-semibold text-white transition-all duration-[160ms] hover:brightness-[1.08] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cancellingBooking ? 'Cancelling…' : 'Cancel booking'}
        </button>
      </div>
    </div>
  )
}

function generateIcsDownload(booking: BookingResponse): string {
  const start = new Date(booking.scheduledAt)
  const end = new Date(start.getTime() + booking.durationMin * 60_000)
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${booking.className}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`
}

export function HomeHero({ firstName, nextBookedClass, nextClassStudio, onTheFloor, onCancelBooking, cancellingBooking }: Props) {
  if (!nextBookedClass) {
    // No booked class: show "Get on a mat" variant
    // We adapt the landing HeroNoBooked but since we don't have nextOpenClass data in this context,
    // render a simplified inline no-booked state.
    return <HomeHeroNoBoked firstName={firstName} onTheFloor={onTheFloor} />
  }

  return (
    <HomeHeroBooked
      firstName={firstName}
      nextBookedClass={nextBookedClass}
      nextClassStudio={nextClassStudio}
      onTheFloor={onTheFloor}
      onCancelBooking={onCancelBooking}
      cancellingBooking={cancellingBooking}
    />
  )
}

function HomeHeroNoBoked({
  firstName,
  onTheFloor,
}: {
  firstName: string | null;
  onTheFloor: number;
}) {
  const reduced = useReducedMotion()
  const name = firstName ?? 'Member'

  return (
    <div className="relative z-[2]">
      {/* Live eyebrow */}
      <div className="mb-5 inline-flex items-center gap-2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4ADE80]">
        <span
          className={`h-2 w-2 rounded-full bg-green-500 ${reduced ? '' : 'animate-[pulse-dot_1.6s_ease-in-out_infinite]'}`}
          aria-hidden="true"
        />
        Live at the club · {onTheFloor} members in
      </div>

      {/* Headline */}
      <h1 className="m-0 font-['Barlow_Condensed'] text-[64px] font-bold uppercase leading-none tracking-[-0.01em] text-white">
        Hey {name}.
        <br />
        <span className="text-green-500">Get on a mat.</span>
      </h1>

      {/* Next available CTA */}
      <div className="mt-10 inline-flex items-center gap-7 rounded-2xl border border-green-500/30 bg-green-500/5 px-7 py-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4ADE80]">
            Nothing booked yet
          </p>
          <p className="mt-2 font-['Barlow_Condensed'] text-[34px] font-bold uppercase tracking-[-0.01em] text-white">
            Open schedule
          </p>
          <p className="mt-1 text-[13px] text-[#9CA3AF]">
            Pick your next session and lock in your spot
          </p>
        </div>
        <Link
          to="/schedule"
          className="rounded-lg bg-green-500 px-7 py-4 text-[14px] font-bold text-[#0F0F0F] shadow-[0_8px_24px_rgba(34,197,94,0.3)] transition-all duration-[160ms] hover:brightness-[1.08]"
        >
          Grab a spot →
        </Link>
      </div>

      <p className="mt-5 text-[13px] text-[#9CA3AF]">
        Or{' '}
        <Link
          to="/schedule"
          className="font-medium text-[#4ADE80] transition-colors duration-[160ms] hover:brightness-[1.15]"
        >
          browse the full schedule
        </Link>{' '}
        to plan your week.
      </p>
    </div>
  )
}
