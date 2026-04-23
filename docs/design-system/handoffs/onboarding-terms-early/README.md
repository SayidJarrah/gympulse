# Handoff — Onboarding Terms Early

## Overview

This is a **structural delta** on top of `docs/design-system/handoffs/onboarding-unified-signup/`.
The terms step moves from position 6 (last mandatory) to position 3 (immediately after profile).
The combined-payload `POST /api/v1/auth/register` fires at step 3 instead of step 6. The user
becomes an authenticated Member at the terms boundary, so the booking step's authenticated API
calls work correctly for the first time. No other visual or interaction change is introduced.

Every step's layout, copy, type scale, color, spacing, and animation is unchanged from the
unified-signup handoff. The only things that change are: (1) the wizard chrome — step numbering,
mini-nav eyebrow strings, progress-bar fill ratio, and step rail order; (2) the Back-button
disabled state, which now applies to step 4 (preferences) in addition to the existing step 1
(credentials) treatment; and (3) the rail interactivity rule for completed steps 1–3.

## Reuse from existing handoffs

**onboarding-unified-signup (`docs/design-system/handoffs/onboarding-unified-signup/`):**

- All step content layouts (credentials, profile, terms, preferences, membership, booking, done)
  are unchanged — verbatim reuse.
- Wizard chrome anatomy: mini nav (logo + step eyebrow + fraction), 3px progress bar, 260px left
  step rail, sticky footer (Back / Skip / Continue) — unchanged.
- Step rail state tokens: current (filled green circle), done (green circle + checkmark), todo
  (muted border circle) — unchanged visual treatment.
- Step content skeleton: eyebrow → headline → required/optional pill → lede → form — unchanged.
- Sticky footer copy patterns: "Continue →", "Finish onboarding →", disabled Back treatment
  (greyed at `--color-fg-muted`, `disabled` attribute, opacity 0.4) — unchanged.
- Step-transition motion: 200ms `--ease-out` fade-and-rise 12px — unchanged.
- Late-error recovery on credentials step (snap-back on `EMAIL_ALREADY_EXISTS`) — unchanged.
- `prefers-reduced-motion` handling — unchanged.
- `localStorage` persistence pattern (`gf:onboarding:v1`) — unchanged.

**onboarding (parent, `docs/design-system/handoffs/onboarding/`):**

- Rail header copy "Onboarding / Getting you ready" — unchanged.
- All inheritance from the parent handoff flows through unchanged.

## Tokens to add

None. Every token referenced in this handoff already exists in
`docs/design-system/colors_and_type.css` and `docs/design-system/tailwind.gymflow.cjs`.

---

## New step order

```
credentials (1) → profile (2) → terms (3)  →  preferences (4) → membership (5) → booking (6*) → done (7)
                                ───── REGISTER (POST /api/v1/auth/register) ─────
* booking only shown when a plan was selected at membership — unchanged conditional rule
```

The register event moves from the end of the flow (after step 6 in unified-signup) to the middle
(after step 3 here). Steps 1–3 are the "guest commitment" prefix; steps 4–7 are the "member
enrichment" suffix. The user is an authenticated Member for the entire suffix.

---

## Step → eyebrow → fraction map

| Step        | Eyebrow                 | Fraction (no plan / M=6) | Fraction (plan selected / M=7) |
|-------------|-------------------------|--------------------------|--------------------------------|
| credentials | STEP 01 · ACCOUNT       | 1 of 6                   | 1 of 7                         |
| profile     | STEP 02 · PROFILE       | 2 of 6                   | 2 of 7                         |
| terms       | STEP 03 · FINAL CHECK   | 3 of 6                   | 3 of 7                         |
| preferences | STEP 04 · PREFS         | 4 of 6                   | 4 of 7                         |
| membership  | STEP 05 · MEMBERSHIP    | 5 of 6                   | 5 of 7                         |
| booking     | STEP 06 · BOOKING       | (hidden)                 | 6 of 7                         |
| done        | (no eyebrow — done replaces shell) | n/a         | n/a                            |

The eyebrow string pattern in `MiniNav.tsx` is:
`STEP {NN} · {EYEBROW_LABEL} · {N} of {M}`

`EYEBROW_LABELS` record updates to match the new positions (the label strings themselves are
unchanged from unified-signup; only the step keys they map to shift in `ALL_STEPS` order):
- `credentials` → `'ACCOUNT'`
- `profile`     → `'PROFILE'`
- `terms`       → `'FINAL CHECK'`
- `preferences` → `'PREFS'`
- `membership`  → `'MEMBERSHIP'`
- `booking`     → `'BOOKING'`

M is computed as `visibleSteps.length` — unchanged computation, new step ordering means terms
is now included in `visibleSteps` before preferences, so M reflects the new order automatically.

---

## Step rail

**Order (ALL_STEPS after reorder):**
```
① YOUR ACCOUNT     — REQUIRED
② YOUR PROFILE     — REQUIRED
③ FINAL CHECK      — REQUIRED
④ PREFERENCES      — OPTIONAL
⑤ MEMBERSHIP       — OPTIONAL
⑥ FIRST BOOKING    — OPTIONAL · IF PLAN CHOSEN
 ✓ DONE (not in rail — replaces shell)
```

**State rendering:** identical to unified-signup handoff — current / done / todo circles and labels.

**Rail interaction rule (the one new structural rule):**

After the user submits terms (step 3) and becomes authenticated, steps 1–3 in the rail enter the
`done` visual state. However, they are NOT interactive:

- Steps 1–3 (credentials, profile, terms) in `done` state: render as a static `<div>`, not a
  `<button>`. Cursor is `default`. No hover affordance. The user cannot navigate back to
  pre-account steps via the rail.
- Steps 4–6 (preferences, membership, booking) in `done` state: render as a `<button>` (existing
  behavior) — clicking navigates back to that step. This is unchanged from unified-signup.

This mirrors the Back-button lock: both affordances (Back button and rail click) refuse to cross
the terms boundary in reverse.

The `StepRail` component receives a new boolean prop `backLocked: boolean`. When `true` (set
after the user advances past terms), the done-state rows for the first 3 steps render as `<div>`
instead of `<button>`. The `EYEBROW_LABELS` record for those 3 steps is still rendered — only
the interactive wrapper changes.

---

## Back navigation rule (the new structural rule)

The existing StickyFooter disabled-Back treatment (used on step 1, credentials) now also applies
to step 4 (preferences). All other steps are unchanged.

| Step        | Back button state | Reason |
|-------------|-------------------|--------|
| credentials (1) | Disabled — existing treatment | First step; nowhere to go back |
| profile (2)     | Enabled — navigates to credentials | Unchanged |
| terms (3)       | Enabled — navigates to profile | Unchanged |
| **preferences (4)** | **Disabled — new rule** | Terms just registered an account; pre-account steps are locked |
| membership (5)  | Enabled — navigates to preferences | Unchanged |
| booking (6)     | Enabled — navigates to membership | Unchanged |
| done (7)        | Not present | Unchanged |

**Disabled treatment for preferences (step 4):**
- Same as credentials (step 1) today: `disabled` HTML attribute on the `<button>`, opacity 0.4,
  `color: var(--color-fg-muted)`, `cursor: not-allowed`.
- The button is not hidden — it remains in the footer layout to keep the three-slot footer
  (Back / Skip / Continue) visually stable.
- An optional tooltip via `title` attribute: `"You're already signed in. Continue forward."` —
  acceptable but not required.

**Implementation note for `StickyFooter.tsx`:** the current `isFirst` guard
(`currentIndex === 0`) that drives the disabled state must be extended to also disable Back on
preferences. The cleanest approach is a new `backDisabled` boolean prop passed from
`OnboardingShell`, set `true` when `currentStep === 'credentials' || currentStep === 'preferences'`.
The existing `disabled={isFirst}` becomes `disabled={backDisabled}` and the color conditional
follows the same prop. No other changes to `StickyFooter`.

---

## Tokens used

All existing — no new tokens.

**Color:**
- `--color-bg-page` — wizard root background
- `--color-bg-surface-1` — mini nav, sticky footer, rail current-step highlight, cards
- `--color-bg-surface-2` — elevated / hover
- `--color-fg-default` — primary text, headlines
- `--color-fg-label` — body copy, enabled Back button text
- `--color-fg-muted` — disabled Back button text, sub-labels, muted copy
- `--color-fg-metadata` — mini nav eyebrow text
- `--color-fg-link` — help text links
- `--color-primary` — current step circle fill, progress bar fill, Continue button bg
- `--color-primary-light` — eyebrow-primary text, current sublabel
- `--color-primary-dark` — Continue button hover
- `--color-primary-border` — current step rail highlight border
- `--color-border-card` — nav / footer / rail dividers, todo circle border
- `--color-border-input` — form input borders
- `--color-border-focus` — focus ring color
- `--color-error-bg`, `--color-error-fg`, `--color-error-border`, `--color-error-strong` — error states

**Typography:**
- `--font-display` (Barlow Condensed) — headlines, rail "Getting you ready" header
- `--font-sans` (Inter) — all other text
- `--tracking-eyebrow` (0.22em) — mini nav eyebrow
- `--tracking-eyebrow-tight` (0.18em) — rail sublabels

**Motion:**
- `--duration-fast` (100ms) — hover color transitions
- `--duration-normal` (200ms) — step transitions, focus rings, error banner fade
- `--ease-out` — step fade-and-rise

**Radius:**
- `--radius-md` (6px) — buttons, inputs, rail row highlights
- `--radius-full` (9999px) — Continue button pill, step circles

**Shadow:**
- `--shadow-glow-primary` — Continue button hover (existing)

---

## Components affected

| Component | Path | Change |
|-----------|------|--------|
| `OnboardingShell` | `frontend/src/components/onboarding/OnboardingShell.tsx` | `handleContinue` switch: `terms` case advances to `preferences` (not `done`); post-terms cases (preferences, membership, booking) drop `isAuthenticated` skip-guards; compute `backDisabled` prop (`currentStep === 'credentials' \|\| currentStep === 'preferences'`); pass `backLocked` to `StepRail` |
| `StickyFooter` | `frontend/src/components/onboarding/StickyFooter.tsx` | Accept `backDisabled: boolean` prop; replace `disabled={isFirst}` with `disabled={backDisabled}`; color conditional follows same prop |
| `StepRail` | `frontend/src/components/onboarding/StepRail.tsx` | Accept `backLocked: boolean` prop; when `true`, render done-state rows for steps 1–3 as static `<div>` (not `<button>`) with `cursor: default` and no click handler |
| `MiniNav` | `frontend/src/components/onboarding/MiniNav.tsx` | No code change — `EYEBROW_LABELS` map and fraction logic are already driven by `visibleSteps` ordering; the new `ALL_STEPS` order makes the eyebrow strings correct automatically |
| `onboarding.ts` | `frontend/src/types/onboarding.ts` | Reorder `ALL_STEPS`: move `terms` from position 6 to position 3 (after `profile`, before `preferences`) |
| `OnboardingPage` | `frontend/src/pages/onboarding/OnboardingPage.tsx` | `computeResumeStep` must account for the new order: an authenticated returning user with no `onboardingCompletedAt` resumes at the earliest incomplete post-terms step (`preferences` at minimum, since they already passed terms) |

---

## State schema delta

No new state fields are required. The only change to the `OnboardingData` type is behavioral:
the `terms` step now fires the register mutation earlier in the flow. The `credentialsLateError`
field introduced in unified-signup is unchanged in shape and purpose.

The `ALL_STEPS` array reorders to:
```ts
export const ALL_STEPS: StepDefinition[] = [
  { key: 'credentials', label: 'Your account',  sublabel: 'REQUIRED',       required: true,  conditional: false },
  { key: 'profile',     label: 'Your profile',  sublabel: 'REQUIRED',       required: true,  conditional: false },
  { key: 'terms',       label: 'Final check',   sublabel: 'REQUIRED',       required: true,  conditional: false },
  { key: 'preferences', label: 'Preferences',   sublabel: 'OPTIONAL',       required: false, conditional: false },
  { key: 'membership',  label: 'Membership',    sublabel: 'OPTIONAL',       required: false, conditional: false },
  { key: 'booking',     label: 'First booking', sublabel: 'IF PLAN CHOSEN', required: false, conditional: true  },
]
```

The `StickyFooter` component's `isLast` guard (`currentStep === 'terms'`) must be updated
because `terms` is now step 3, not the last step. `isLast` should now be computed as
`currentIndex === visibleSteps.length - 1` (already the correct semantic intent), or the
copy "Finish onboarding →" should be moved to map to `done` transition rather than `terms`.
See SDD for the exact implementation decision.

---

## Interactions and motion

All timing, easing, and reduced-motion handling are inherited verbatim from the unified-signup
handoff. No new interaction patterns are introduced.

The one new interaction to specify explicitly:

**Attempting Back on preferences (step 4):** the button renders visually disabled (opacity 0.4,
`cursor: not-allowed`, `--color-fg-muted` text). Click does nothing. Screen readers hear the
button as "disabled" via the `disabled` attribute. No animation on attempt.

`prefers-reduced-motion`: all step transitions still collapse to `0.01ms` via the existing rule
in `colors_and_type.css`. The Back-lock behavior is unaffected (it is not an animation).

---

## Accessibility

Inherited from unified-signup handoff. The one addition:

- **Disabled Back on preferences:** use the same `disabled` HTML attribute pattern already used
  on credentials (step 1) — `aria-disabled` is not needed here because the button is fully
  inert (it is acceptable for it to be removed from tab order on a step where the user cannot
  go back). If product decides to keep it in tab order for discoverability, switch to
  `aria-disabled="true"` and `onClick={undefined}` per the react-conventions pattern for
  disabled buttons that should remain focusable.
- **Non-interactive rail rows (steps 1–3 in done state):** rendered as `<div>` with no role.
  The `<ol>` container retains its `aria-label="Onboarding progress"` on the `<nav>`. Screen
  readers will encounter these as list items with text content — acceptable since they are
  informational (status), not interactive.

---

## Responsive

Inherits the unified-signup breakpoints unchanged:

| Breakpoint | Behavior |
|------------|----------|
| < 1024px   | Drop left step rail; keep progress bar only |
| < 720px    | Footer buttons stack: Back top-left, Continue full-width below |
| < 560px    | Headline drops 48px → 36px; form gaps 48px → 24px |

No new responsive rules.

---

## Files

```
docs/design-system/handoffs/onboarding-terms-early/
├── README.md                        — this spec
└── design_reference/
    ├── index.html                   — standalone prototype; open in browser without a build step
    └── colors_and_type.css          — verbatim copy of docs/design-system/colors_and_type.css
```

---

## Deferred items

- Post-onboarding profile editing for credentials, profile, and terms content — the wizard
  never permits editing these steps once the account is registered. A future profile-edit
  surface is required for this use case.
- Real paid-membership activation — selecting a plan still results in a pending state.
- Email verification, social auth, password reset — unchanged non-goals from the PRD.
- Migrating users mid-flow under the unified-signup step ordering at ship time — handled by
  existing onboarding-flow resume logic, no design change needed.

---

## Open questions

1. **`isLast` / "Finish onboarding →" copy on the terms step:** in unified-signup, `isLast`
   is `currentStep === 'terms'` because terms was the last mandatory step before done. With
   terms at position 3, should "Finish onboarding →" appear on the actual last step (which
   varies — membership or booking), or should Continue always say "Continue →" and the done
   step's own CTA handle the final call-to-action? The SDD should resolve this before
   implementation.

2. **`backLocked` prop origin:** should `OnboardingShell` derive `backLocked` from
   `isAuthenticated` (auth store) or from a store field like `termsSubmittedAt`? The
   auth-store approach is simpler but requires the auth store to be populated before the
   rail renders. Confirm in SDD.

---

## Benchmarks

| Pattern | Reference |
|---------|-----------|
| Multi-step wizard with a hard navigation boundary mid-flow | **Linear** workspace creation — email-first steps are locked once the workspace is provisioned; back navigation within the post-provision steps works but cannot re-enter the pre-provision steps |
| Disabled footer action at a structural boundary | **Vercel** project import — the "Back" control on the confirmation step is visually disabled once deploy has been triggered; the affordance is present but inert |
