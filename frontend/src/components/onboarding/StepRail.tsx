import type { StepKey, StepDefinition } from '../../types/onboarding'

interface StepRailProps {
  visibleSteps: StepDefinition[]
  currentStep: StepKey
  onNavigateBack: (step: StepKey) => void
}

export function StepRail({ visibleSteps, currentStep, onNavigateBack }: StepRailProps) {
  const currentIndex = visibleSteps.findIndex(s => s.key === currentStep)

  return (
    <nav aria-label="Onboarding progress" className="w-[260px] shrink-0 pt-2 flex flex-col gap-6">
      {/* Rail header */}
      <div className="flex flex-col gap-1 pb-4" style={{ borderBottom: '1px solid var(--color-border-card)' }}>
        <p
          className="text-[10px] font-semibold uppercase"
          style={{ letterSpacing: '0.2em', color: 'var(--color-primary-light)' }}
        >
          Onboarding
        </p>
        <p
          className="text-base font-bold uppercase leading-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-fg-default)' }}
        >
          Getting you ready
        </p>
      </div>

      <ol className="flex flex-col gap-1">
        {visibleSteps.map((step, idx) => {
          const isDone = idx < currentIndex
          const isCurrent = idx === currentIndex

          return (
            <li key={step.key}>
              {isDone ? (
                <button
                  type="button"
                  onClick={() => onNavigateBack(step.key)}
                  className="flex items-start gap-3 w-full text-left rounded-md px-2 py-1.5 transition-colors duration-150"
                  style={{ cursor: 'pointer' }}
                >
                  <DoneCircle num={idx + 1} />
                  <StepLabel step={step} state="done" />
                </button>
              ) : (
                <div
                  className="flex items-start gap-3 px-2 py-1.5 rounded-md"
                  aria-current={isCurrent ? 'step' : undefined}
                  style={isCurrent ? {
                    background: 'var(--color-bg-surface-1)',
                    border: '1px solid var(--color-primary-border)',
                  } : undefined}
                >
                  {isCurrent ? <CurrentCircle num={idx + 1} /> : <TodoCircle num={idx + 1} />}
                  <StepLabel step={step} state={isCurrent ? 'current' : 'todo'} />
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {/* Footer */}
      <div className="mt-auto pt-4" style={{ borderTop: '1px solid var(--color-border-card)' }}>
        <p className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>
          Need help?{' '}
          <span style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}>Mon–Fri 6a–9p.</span>
        </p>
      </div>
    </nav>
  )
}

function pad(num: number) {
  return String(num).padStart(2, '0')
}

function CurrentCircle({ num }: { num: number }) {
  return (
    <div
      className="flex items-center justify-center shrink-0 w-7 h-7 rounded-full text-xs font-bold"
      style={{
        background: 'var(--color-primary)',
        color: '#0F0F0F',
        boxShadow: '0 0 0 4px rgba(34,197,94,.15)',
        fontFamily: 'var(--font-display)',
      }}
    >
      {pad(num)}
    </div>
  )
}

function DoneCircle({ num: _num }: { num: number }) {
  return (
    <div
      className="flex items-center justify-center shrink-0 w-7 h-7 rounded-full"
      style={{
        background: 'var(--color-primary)',
      }}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#0F0F0F" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </div>
  )
}

function TodoCircle({ num }: { num: number }) {
  return (
    <div
      className="flex items-center justify-center shrink-0 w-7 h-7 rounded-full text-xs font-bold"
      style={{
        border: '1.5px solid var(--color-border-card)',
        color: 'var(--color-fg-muted)',
        fontFamily: 'var(--font-display)',
      }}
    >
      {pad(num)}
    </div>
  )
}

function StepLabel({ step, state }: { step: StepDefinition; state: 'current' | 'done' | 'todo' }) {
  const labelColor = state === 'todo' ? 'var(--color-fg-muted)' : 'var(--color-fg-default)'

  return (
    <div className="flex flex-col min-w-0">
      <span className="text-sm font-medium leading-tight" style={{ color: labelColor }}>
        {step.label}
      </span>
      {step.sublabel && (
        <span
          className="text-[10px] font-semibold uppercase mt-0.5"
          style={{
            letterSpacing: '0.18em',
            color: state === 'current' ? 'var(--color-primary-light)' : 'var(--color-fg-muted)',
          }}
        >
          {step.sublabel}
        </span>
      )}
    </div>
  )
}
