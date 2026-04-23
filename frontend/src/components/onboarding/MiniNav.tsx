import type { StepKey } from '../../types/onboarding'
import { ALL_STEPS } from '../../types/onboarding'

interface MiniNavProps {
  currentStep: StepKey
  visibleSteps: typeof ALL_STEPS
}

// Eyebrow short-form labels per SDD §4.4 / handoff §"Mini nav step eyebrow".
// The step rail uses the long label (`step.label`); the eyebrow uses these
// shorter aliases.
const EYEBROW_LABELS: Record<StepKey, string> = {
  credentials: 'ACCOUNT',
  profile: 'PROFILE',
  preferences: 'PREFS',
  membership: 'MEMBERSHIP',
  booking: 'BOOKING',
  terms: 'FINAL CHECK',
  done: 'DONE',
}

export function MiniNav({ currentStep, visibleSteps }: MiniNavProps) {
  const currentIndex = visibleSteps.findIndex(s => s.key === currentStep)
  const stepDef = visibleSteps[currentIndex]
  const stepNum = currentIndex + 1
  const total = visibleSteps.length

  return (
    <header
      className="flex items-center justify-between px-12 h-[72px] shrink-0"
      style={{ borderBottom: '1px solid var(--color-border-card)' }}
    >
      {/* Logo mark only — no wordmark on onboarding (handoff spec) */}
      <div className="flex items-center">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: 'var(--color-primary)' }}
          aria-label="GymFlow"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="white" aria-hidden="true">
            <path d="M13 2L4.5 13.5H11L9 22L19.5 9.5H13.5L16 2Z" />
          </svg>
        </div>
      </div>

      {/* Step eyebrow */}
      {stepDef && (
        <p
          className="text-xs font-semibold uppercase tracking-[0.22em]"
          style={{ color: 'var(--color-fg-metadata)' }}
        >
          STEP {String(stepNum).padStart(2, '0')} · {EYEBROW_LABELS[stepDef.key]} · {stepNum} of {total}
        </p>
      )}
    </header>
  )
}
