import type { StepKey } from '../../types/onboarding'
import type { StepDefinition } from '../../types/onboarding'

interface ProgressBarProps {
  currentStep: StepKey
  visibleSteps: StepDefinition[]
}

export function ProgressBar({ currentStep, visibleSteps }: ProgressBarProps) {
  const currentIndex = visibleSteps.findIndex(s => s.key === currentStep)
  const pct = visibleSteps.length > 0 ? ((currentIndex) / visibleSteps.length) * 100 : 0

  return (
    <div
      className="w-full h-[3px] shrink-0"
      style={{ background: 'var(--color-bg-surface-2)' }}
      role="progressbar"
      aria-valuenow={currentIndex + 1}
      aria-valuemax={visibleSteps.length}
      aria-label="Onboarding progress"
    >
      <div
        className="h-full"
        style={{
          width: `${pct}%`,
          background: 'var(--color-primary)',
          transition: 'width 200ms ease-out',
        }}
      />
    </div>
  )
}
