import { useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { getActivePlans } from '../../../api/membershipPlans'
import { submitPlanPending } from '../../../api/onboarding'
import { useOnboardingStore } from '../../../store/onboardingStore'
import type { MembershipPlan } from '../../../types/membershipPlan'

export interface StepMembershipHandle {
  submit: () => Promise<'plan-selected' | 'skip' | false>
}

export const StepMembership = forwardRef<StepMembershipHandle, object>((_props, ref) => {
  const store = useOnboardingStore()
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(store.selectedPlanId)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getActivePlans(0, 20)
      .then(res => setPlans(res.content ?? []))
      .catch(() => setError('Unable to load plans. Try again.'))
      .finally(() => setLoading(false))
  }, [])

  // Find the "most popular" plan — the mid-tier by price (index 1 when sorted ascending).
  // If there are fewer than 2 plans, assign it to the first plan.
  const mostPopularId = (() => {
    if (plans.length === 0) return null
    const sorted = [...plans].sort((a, b) => a.priceInCents - b.priceInCents)
    return sorted[Math.min(1, sorted.length - 1)].id
  })()

  useImperativeHandle(ref, () => ({
    async submit(): Promise<'plan-selected' | 'skip' | false> {
      if (!selectedId) {
        // No plan — clear store selection, skip booking step
        store.setPlan(null, null, null)
        return 'skip'
      }

      const plan = plans.find(p => p.id === selectedId)
      if (!plan) return 'skip'

      try {
        const res = await submitPlanPending({ planId: selectedId })
        store.setPlan(plan.id, plan.name, plan.priceInCents)
        store.setPendingMembership(res.membershipId)
        return 'plan-selected'
      } catch {
        setError('Unable to select plan. Try again.')
        return false
      }
    }
  }))

  if (loading) {
    return (
      <div className="flex items-center gap-2" style={{ color: 'var(--color-fg-muted)' }}>
        <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        Loading plans…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 max-w-[820px]">
      {/* Eyebrow */}
      <p
        className="text-xs font-semibold uppercase"
        style={{ letterSpacing: '0.22em', color: 'var(--color-primary-light)' }}
      >
        Step 04 · Membership
      </p>

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
        Choose a plan
      </h1>

      <p className="text-[15px] max-w-[580px]" style={{ color: 'var(--color-fg-muted)', lineHeight: 1.6 }}>
        Booking opens after membership activation. You can change or cancel any time.
      </p>

      {error && <p className="text-sm" style={{ color: 'var(--color-error-fg)' }}>{error}</p>}

      {/* Plan grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map(plan => {
          const isSelected = selectedId === plan.id
          const isPopular = plan.id === mostPopularId

          return (
            <div
              key={plan.id}
              className="relative flex flex-col gap-4 p-7 rounded-xl transition-all duration-150"
              style={{
                background: 'var(--color-bg-surface-1)',
                border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border-card)'}`,
                borderRadius: 'var(--radius-lg)',
                boxShadow: isSelected
                  ? '0 0 0 1px var(--color-primary), 0 8px 24px rgba(34,197,94,.12)'
                  : 'none',
              }}
            >
              {isPopular && (
                <div
                  className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl"
                  style={{
                    background: 'linear-gradient(90deg, var(--color-primary), var(--color-primary-light))',
                  }}
                />
              )}
              {isPopular && (
                <span
                  className="text-[10px] font-semibold uppercase self-start px-2 py-0.5 rounded-full"
                  style={{
                    letterSpacing: '0.18em',
                    background: 'var(--color-primary-tint)',
                    color: 'var(--color-primary-light)',
                    border: '1px solid var(--color-primary-border)',
                  }}
                >
                  Most popular
                </span>
              )}

              {/* Eyebrow */}
              <p
                className="text-xs font-semibold uppercase"
                style={{ letterSpacing: '0.18em', color: 'var(--color-primary-light)' }}
              >
                {plan.name}
              </p>

              {/* Price */}
              <div className="flex items-baseline gap-1">
                <span
                  className="text-5xl font-bold leading-none"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-fg-default)' }}
                >
                  ${Math.floor(plan.priceInCents / 100)}
                </span>
                <span className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>/mo</span>
              </div>

              {/* Bullets */}
              <ul className="flex flex-col gap-1.5 text-sm flex-1">
                {plan.description?.split('\n').filter(Boolean).slice(0, 5).map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--color-primary)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span style={{ color: 'var(--color-fg-label)' }}>{line}</span>
                  </li>
                )) ?? (
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--color-primary)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span style={{ color: 'var(--color-fg-label)' }}>{plan.durationDays}-day access</span>
                  </li>
                )}
              </ul>

              {/* Selector button */}
              <button
                type="button"
                className="w-full py-2.5 rounded-md text-sm font-semibold transition-all duration-150 mt-2"
                onClick={() => setSelectedId(isSelected ? null : plan.id)}
                style={{
                  background: isSelected ? 'var(--color-primary)' : 'transparent',
                  color: isSelected ? '#0F0F0F' : 'var(--color-fg-label)',
                  border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border-card)'}`,
                }}
              >
                {isSelected ? 'Selected' : 'Select plan'}
              </button>
            </div>
          )
        })}
      </div>

      {/* No plan for now */}
      <button
        type="button"
        onClick={() => setSelectedId(null)}
        className="w-full p-5 rounded-xl text-left transition-all duration-150"
        style={{
          background: selectedId === null ? 'var(--color-bg-surface-2)' : 'transparent',
          border: `1px solid ${selectedId === null ? 'var(--color-border-strong)' : 'var(--color-border-card)'}`,
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--color-fg-muted)' }}>
          No plan for now
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-fg-subtle)' }}>
          Membership is optional. You can browse and pick a plan later from your profile.
        </p>
      </button>
    </div>
  )
})

StepMembership.displayName = 'StepMembership'
