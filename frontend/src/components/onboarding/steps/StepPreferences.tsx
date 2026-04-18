import { useState, forwardRef, useImperativeHandle } from 'react'
import { useOnboardingStore } from '../../../store/onboardingStore'
import { updateMyProfile } from '../../../api/profile'

const GOAL_OPTIONS = [
  'Build strength',
  'Lose weight',
  'Improve mobility',
  'Cardio & endurance',
  'Train for an event',
  'Just move more',
]

const CLASS_OPTIONS = [
  'Yoga',
  'HIIT',
  'Strength',
  'Spin',
  'Mobility',
  'Pilates',
  'Boxing',
  'Open gym',
]

const FREQUENCY_OPTIONS = [
  { id: '1-2', label: '1–2×/week' },
  { id: '3-4', label: '3–4×/week' },
  { id: '5+', label: '5+×/week' },
  { id: 'unsure', label: 'Still figuring it out' },
]

export interface StepPreferencesHandle {
  submit: () => Promise<boolean>
}

export const StepPreferences = forwardRef<StepPreferencesHandle, object>((_props, ref) => {
  const store = useOnboardingStore()
  const [goals, setGoals] = useState<string[]>(store.goals)
  const [classTypes, setClassTypes] = useState<string[]>(store.classTypes)
  const [frequency, setFrequency] = useState<string>(store.frequency)

  useImperativeHandle(ref, () => ({
    async submit(): Promise<boolean> {
      // If no selections, treat as skip (advance without API call)
      const hasSelections = goals.length > 0 || classTypes.length > 0 || frequency
      if (hasSelections) {
        try {
          await updateMyProfile({
            firstName: store.firstName || null,
            lastName: store.lastName || null,
            phone: store.phone || null,
            dateOfBirth: store.dob || null,
            fitnessGoals: goals,
            preferredClassTypes: classTypes,
            emergencyContact: null,
          })
        } catch {
          // Non-blocking: preferences are optional, continue anyway
        }
      }
      store.setPreferences({ goals, classTypes, frequency })
      return true
    }
  }))

  function toggleGoal(goal: string) {
    setGoals(prev => prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal])
  }

  function toggleClass(cls: string) {
    setClassTypes(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls])
  }

  return (
    <div className="flex flex-col gap-8 max-w-[820px]">
      {/* Eyebrow */}
      <p
        className="text-xs font-semibold uppercase"
        style={{ letterSpacing: '0.22em', color: 'var(--color-primary-light)' }}
      >
        Step 03 · Preferences
      </p>

      <div className="flex items-center gap-2">
        <h1
          className="uppercase leading-none"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 5vw, 48px)',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--color-fg-default)',
          }}
        >
          Preferences
        </h1>
        <span
          className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full"
          style={{
            letterSpacing: '0.18em',
            color: 'var(--color-fg-muted)',
            background: 'var(--color-bg-surface-2)',
            border: '1px solid var(--color-border-card)',
          }}
        >
          Optional
        </span>
      </div>

      <p className="text-[15px] max-w-[580px]" style={{ color: 'var(--color-fg-muted)', lineHeight: 1.6 }}>
        Help us tailor your GymFlow experience. You can update these any time.
      </p>

      {/* Goals */}
      <section aria-labelledby="goals-label">
        <p
          id="goals-label"
          className="text-xs font-semibold uppercase mb-3"
          style={{ letterSpacing: '0.22em', color: 'var(--color-fg-metadata)' }}
        >
          Your goals
        </p>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Fitness goals">
          {GOAL_OPTIONS.map(g => (
            <ChipButton
              key={g}
              label={g}
              selected={goals.includes(g)}
              onToggle={() => toggleGoal(g)}
            />
          ))}
        </div>
      </section>

      {/* Classes */}
      <section aria-labelledby="classes-label">
        <p
          id="classes-label"
          className="text-xs font-semibold uppercase mb-3"
          style={{ letterSpacing: '0.22em', color: 'var(--color-fg-metadata)' }}
        >
          Classes you're curious about
        </p>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Preferred class types">
          {CLASS_OPTIONS.map(c => (
            <ChipButton
              key={c}
              label={c}
              selected={classTypes.includes(c)}
              onToggle={() => toggleClass(c)}
            />
          ))}
        </div>
      </section>

      {/* Frequency */}
      <section aria-labelledby="freq-label">
        <p
          id="freq-label"
          className="text-xs font-semibold uppercase mb-3"
          style={{ letterSpacing: '0.22em', color: 'var(--color-fg-metadata)' }}
        >
          How often do you plan to train?
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Training frequency">
          {FREQUENCY_OPTIONS.map(opt => (
            <ChipButton
              key={opt.id}
              label={opt.label}
              selected={frequency === opt.id}
              onToggle={() => setFrequency(prev => prev === opt.id ? '' : opt.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )
})

StepPreferences.displayName = 'StepPreferences'

function ChipButton({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="button"
      aria-pressed={selected}
      onClick={onToggle}
      className="h-12 px-3 rounded-md text-sm font-medium transition-all duration-150"
      style={{
        background: selected ? 'var(--color-primary)' : 'transparent',
        color: selected ? '#0F0F0F' : 'var(--color-fg-label)',
        border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--color-border-card)'}`,
        boxShadow: selected ? '0 0 0 1px rgba(34,197,94,.3)' : 'none',
      }}
    >
      {label}
    </button>
  )
}
