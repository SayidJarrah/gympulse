import type { StepKey, StepDefinition } from '../../types/onboarding'

interface StickyFooterProps {
  currentStep: StepKey
  visibleSteps: StepDefinition[]
  onBack: () => void
  onSkip: () => void
  onContinue: () => void
  continueDisabled?: boolean
  continueLoading?: boolean
}

export function StickyFooter({
  currentStep,
  visibleSteps,
  onBack,
  onSkip,
  onContinue,
  continueDisabled = false,
  continueLoading = false,
}: StickyFooterProps) {
  const currentIndex = visibleSteps.findIndex(s => s.key === currentStep)
  const stepDef = visibleSteps[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentStep === 'terms'
  const showSkip = stepDef && !stepDef.required && currentStep !== 'welcome'

  return (
    <footer
      className="sticky bottom-0 flex items-center justify-between px-12 h-[88px] shrink-0 z-10"
      style={{
        background: 'var(--color-bg-surface-1)',
        borderTop: '1px solid var(--color-border-card)',
      }}
    >
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        disabled={isFirst}
        className="px-5 py-2 rounded-md text-sm font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          color: isFirst ? 'var(--color-fg-muted)' : 'var(--color-fg-label)',
          background: 'transparent',
          border: '1px solid var(--color-border-card)',
        }}
      >
        ← Back
      </button>

      {/* Skip */}
      <div className="flex-1 flex justify-center">
        {showSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium transition-colors duration-150"
            style={{ color: 'var(--color-fg-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-fg-label)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-fg-muted)')}
          >
            Skip this step
          </button>
        )}
      </div>

      {/* Continue / Finish */}
      <button
        type="button"
        onClick={onContinue}
        disabled={continueDisabled || continueLoading}
        className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: 'var(--color-primary)',
          color: '#0F0F0F',
        }}
        onMouseEnter={e => {
          if (!continueDisabled && !continueLoading) {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-dark)'
          }
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'
        }}
      >
        {continueLoading
          ? 'Saving…'
          : isLast
          ? 'Finish onboarding →'
          : currentStep === 'welcome'
          ? "Let's go →"
          : 'Continue →'}
      </button>
    </footer>
  )
}
