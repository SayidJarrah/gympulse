export type StepKey = 'credentials' | 'profile' | 'preferences' | 'membership' | 'booking' | 'terms' | 'done'

export interface StepDefinition {
  key: StepKey
  label: string
  sublabel: string      // 'REQUIRED' | 'OPTIONAL' | 'IF PLAN CHOSEN' | ''
  required: boolean
  conditional: boolean  // true for 'booking' — hidden when no plan selected
}

export const ALL_STEPS: StepDefinition[] = [
  { key: 'credentials', label: 'Your account',  sublabel: 'REQUIRED',       required: true,  conditional: false },
  { key: 'profile',     label: 'Your profile',  sublabel: 'REQUIRED',       required: true,  conditional: false },
  { key: 'terms',       label: 'Final check',   sublabel: 'REQUIRED',       required: true,  conditional: false },
  { key: 'preferences', label: 'Preferences',   sublabel: 'OPTIONAL',       required: false, conditional: false },
  { key: 'membership',  label: 'Membership',    sublabel: 'OPTIONAL',       required: false, conditional: false },
  { key: 'booking',     label: 'First booking', sublabel: 'IF PLAN CHOSEN', required: false, conditional: true  },
]
// 'done' is not in ALL_STEPS — it replaces the layout, not a step in the rail.
