import type { LandingAction } from '../../types/landing'
import { SectionAction } from './SectionAction'

interface Props {
  primaryAction: LandingAction;
  secondaryAction: LandingAction;
  onPrimaryClick: () => void;
  onSecondaryClick: () => void;
}

export function HeroSection({
  primaryAction,
  secondaryAction,
  onPrimaryClick,
  onSecondaryClick,
}: Props) {
  return (
    <section className="relative overflow-hidden border-b border-gray-900/80">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_transparent_40%),linear-gradient(180deg,_rgba(17,24,39,0.92),_rgba(15,15,15,1))]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:40px_40px]" />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-green-400">
            Membership and class access
          </p>
          <h1 className="mt-4 font-['Barlow_Condensed'] text-5xl font-bold uppercase leading-none text-white sm:text-6xl">
            Join GymFlow
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-gray-300 sm:text-lg">
            Start with a membership, keep your account in one place, and move into class
            booking with a clear next step every time you return.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-start">
            <SectionAction
              action={primaryAction}
              variant="primary"
              onClick={onPrimaryClick}
              showDescription={true}
            />
            <SectionAction
              action={secondaryAction}
              variant="secondary"
              onClick={onSecondaryClick}
            />
          </div>

          <p className="mt-6 text-sm font-medium text-gray-400">
            Booking opens after membership activation.
          </p>
        </div>

        <aside className="rounded-3xl border border-gray-800 bg-gray-900/80 p-6 shadow-2xl shadow-black/30">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-400">
            Your path
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            A focused entry point for your next session
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            GymFlow keeps the first move simple so you can compare memberships quickly
            and return to the right place once your account is active.
          </p>

          <div className="mt-8 space-y-4">
            {[
              ['01', 'Join', 'Create an account and store your access in one place.'],
              ['02', 'Choose plan', 'Review active memberships before you commit.'],
              ['03', 'Book when active', 'Move into class booking only after activation.'],
            ].map(([step, title, copy]) => (
              <div
                key={step}
                className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4"
              >
                <div className="flex items-center gap-4">
                  <span className="font-['Barlow_Condensed'] text-3xl font-bold uppercase text-green-400">
                    {step}
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                      {title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-gray-300">{copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  )
}
