import { useState, forwardRef, useImperativeHandle } from 'react'
import type { ComponentType } from 'react'
import {
  BoltIcon,
  ScaleIcon,
  HeartIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  PlayIcon,
  FireIcon,
  CubeIcon,
} from '@heroicons/react/24/outline'
import { useOnboardingStore } from '../../../store/onboardingStore'
import { updateMyProfile } from '../../../api/profile'

type GoalOption = { label: string; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }> }
type ClassOption = { label: string; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }> }

const GOAL_OPTIONS: GoalOption[] = [
  { label: 'Build strength', icon: CubeIcon },
  { label: 'Lose weight', icon: ScaleIcon },
  { label: 'Improve mobility', icon: HeartIcon },
  { label: 'Cardio & endurance', icon: BoltIcon },
  { label: 'Train for an event', icon: TrophyIcon },
  { label: 'Just move more', icon: PlayIcon },
]

const CLASS_OPTIONS: ClassOption[] = [
  { label: 'Yoga', icon: HeartIcon },
  { label: 'HIIT', icon: BoltIcon },
  { label: 'Strength', icon: CubeIcon },
  { label: 'Spin', icon: FireIcon },
  { label: 'Mobility', icon: ArrowTrendingUpIcon },
  { label: 'Pilates', icon: HeartIcon },
  { label: 'Boxing', icon: FireIcon },
  { label: 'Open gym', icon: CubeIcon },
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
  const [apiError, setApiError] = useState<string | null>(null)

  useImperativeHandle(ref, () => ({
    async submit(): Promise<boolean> {
      setApiError(null)
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
          // FR-4.5: if PATCH fails, show error and do not advance
          setApiError('Unable to save preferences. Please try again.')
          return false
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

      {apiError && (
        <p className="text-sm" style={{ color: 'var(--color-error-fg)' }}>{apiError}</p>
      )}

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
          {GOAL_OPTIONS.map(({ label, icon }) => (
            <ChipButton
              key={label}
              label={label}
              icon={icon}
              selected={goals.includes(label)}
              onToggle={() => toggleGoal(label)}
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
          {CLASS_OPTIONS.map(({ label, icon }) => (
            <ChipButton
              key={label}
              label={label}
              icon={icon}
              selected={classTypes.includes(label)}
              onToggle={() => toggleClass(label)}
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

interface ChipButtonProps {
  label: string
  selected: boolean
  onToggle: () => void
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
}

function ChipButton({ label, selected, onToggle, icon: Icon }: ChipButtonProps) {
  return (
    <button
      type="button"
      role="button"
      aria-pressed={selected}
      onClick={onToggle}
      className="h-12 px-3 rounded-md text-sm font-medium transition-all duration-150 flex items-center justify-center gap-1.5"
      style={{
        background: selected ? 'var(--color-primary)' : 'transparent',
        color: selected ? '#0F0F0F' : 'var(--color-fg-label)',
        border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--color-border-card)'}`,
        boxShadow: selected ? '0 0 0 1px rgba(34,197,94,.3)' : 'none',
      }}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      {label}
    </button>
  )
}
