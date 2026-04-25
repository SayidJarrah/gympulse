# Review: onboarding-flow — 2026-04-19

> This review covers the fix commit targeting gaps GAP-01/03/08, GAP-04, GAP-09, GAP-10, GAP-11, GAP-13, GAP-15, and GAP-16 from `docs/gaps/onboarding-flow.md`. The prior review (`onboarding-flow-fixes-20260419.md`) already cleared the blockers from the initial delivery. This review covers the second wave of targeted fixes only.

## Blockers (must fix before PR)

None.

## Suggestions (non-blocking)

- `StepPreferences.tsx:132-134` — `apiError` is rendered as plain coloured text with no icon prefix, identical to the pre-fix state of `StepProfile`. The design system README states errors must not rely on colour alone. `StepProfile` was corrected (GAP-10), but `StepPreferences` was left unchanged. Add `ExclamationCircleIcon` (already imported in `StepProfile`; import it in `StepPreferences` too) as a prefix to the `apiError` paragraph for consistency and compliance with the design system voice rule. This is the same pattern as TD-077 (which was scoped to `StepBooking` and `StepMembership`); `StepPreferences` should be added to that scope.

- `OnboardingShell.tsx:60` — Inside `advance()`, `store.currentStep` (line 60) is read from the Zustand hook return captured at render time (`const store = useOnboardingStore()`, line 27). This is not the same stale-closure risk that was fixed for `selectedPlanId` (where the issue was that `visibleSteps` was computed before the store update flushed). However, for perfect symmetry and future-proofing, reading `useOnboardingStore.getState().currentStep` inside `advance()` alongside the already-present `getState().selectedPlanId` would make the intent explicit and guard against any future concurrent-mode re-render edge case where `store` and `getState()` diverge. Low risk as written, but worth aligning for clarity.

## Verdict

APPROVED — all targeted gaps verified fixed; two non-blocking suggestions logged below.
