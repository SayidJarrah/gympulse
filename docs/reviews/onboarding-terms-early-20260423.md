# Review: onboarding-terms-early — 2026-04-23

## Blockers (must fix before PR)

- [ ] `frontend/src/components/onboarding/steps/StepPreferences.tsx:105` — on-page eyebrow renders `Step 03 · Preferences`, but under the reordered wizard preferences is now step 4. Update to `Step 04 · Preferences`. AC-01 explicitly bans this: "no UI surface still shows `terms` after `membership` or `booking`" — the step-content eyebrow is a UI surface the user reads, and right now it still tells them preferences is step 3 while the MiniNav simultaneously says STEP 04 · PREFS, creating a direct on-screen contradiction.
- [ ] `frontend/src/components/onboarding/steps/StepMembership.tsx:78` — on-page eyebrow renders `Step 04 · Membership` but membership is now step 5. Update to `Step 05 · Membership`. Same AC-01 / SDD §4.4 violation as the preferences case.
- [ ] `frontend/src/components/onboarding/steps/StepBooking.tsx:61` — on-page eyebrow renders `Step 05 · First booking` but booking is now step 6 (only when shown). Update to `Step 06 · First booking`. Same AC-01 violation; also leaves the step labelled "5" while the MiniNav header reads "STEP 06 · BOOKING · 6 of 7", which is the most jarring of the four because the user is looking at both at once.
- [ ] `frontend/src/components/onboarding/steps/StepTerms.tsx:56` — on-page eyebrow renders `Step 06 · Final check` but terms is now step 3. Update to `Step 03 · Final check`. This is the canonical AC-01 violation — terms is now FIRST among the mandatory commits, but the page still announces it as step 06 (its old position after `booking`), explicitly the case the AC was written to prevent.

## Suggestions (non-blocking)

- The four step-content eyebrow strings are currently four separate hardcoded literals — every time `ALL_STEPS` is reordered, four files have to be hunted down and edited. A single `useStepEyebrow(currentStep)` hook (or a passed prop) that derives the index from `visibleSteps` would make the same reorder mechanically impossible to get wrong; it would also let the on-page eyebrow react to the conditional `booking` step's presence the same way the MiniNav already does.

## Verdict

BLOCKED — 4 blockers
