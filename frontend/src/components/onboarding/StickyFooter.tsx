import type { StepKey, StepDefinition } from '../../types/onboarding'

interface StickyFooterProps {
  currentStep: StepKey
  visibleSteps: StepDefinition[]
  onBack: () => void
  onSkip: () => void
  onContinue: () => void
  continueDisabled?: boolean
  continueLoading?: boolean
  continueRetry?: boolean
}

export function StickyFooter({
  currentStep,
  visibleSteps,
  onBack,
  onSkip,
  onContinue,
  continueDisabled = false,
  continueLoading = false,
  continueRetry = false,
}: StickyFooterProps) {
  const currentIndex = visibleSteps.findIndex(s => s.key === currentStep)
  const stepDef = visibleSteps[currentIndex]
  // SDD onboarding-terms-early §4.4 + Decision 19 — Back is disabled on
  // credentials (first step, nowhere to go back) AND on preferences (terms
  // boundary lock — pre-account steps are unreachable in reverse). Computed
  // inline from currentStep to keep the prop surface stable.
  const backDisabled = currentStep === 'credentials' || currentStep === 'preferences'
  const isLast = currentStep === 'terms'
  const showSkip = stepDef && !stepDef.required && currentStep !== 'credentials'

  return (
    <footer
      className="sticky bottom-0 flex items-center justify-between px-12 h-[88px] shrink-0 z-10"
      style={{
        background: 'var(--color-bg-surface-1)',
        borderTop: '1px solid var(--color-border-card)',
      }}
    >
      {/* Back — pure ghost, no border per design system spec */}
      <button
        type="button"
        onClick={onBack}
        disabled={backDisabled}
        className="px-5 py-2 rounded-md text-sm font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          color: backDisabled ? 'var(--color-fg-muted)' : 'var(--color-fg-label)',
          background: 'transparent',
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
          ? isLast
            ? 'Creating account…'
            : 'Saving…'
          : continueRetry && isLast
          ? 'Try again →'
          : isLast
          ? 'Finish onboarding →'
          : 'Continue →'}
      </button>
    </footer>
  )
}
