# Review: onboarding-terms-early — 2026-04-23

## Blockers (must fix before PR)

- [x] `frontend/src/components/onboarding/steps/StepPreferences.tsx:105` — on-page eyebrow renders `Step 03 · Preferences`, but under the reordered wizard preferences is now step 4. Update to `Step 04 · Preferences`. AC-01 explicitly bans this: "no UI surface still shows `terms` after `membership` or `booking`" — the step-content eyebrow is a UI surface the user reads, and right now it still tells them preferences is step 3 while the MiniNav simultaneously says STEP 04 · PREFS, creating a direct on-screen contradiction. — *Fixed in 5361560: literal updated to `Step 04 · Preferences` (verified at line 105, Title Case form correct).*
- [x] `frontend/src/components/onboarding/steps/StepMembership.tsx:78` — on-page eyebrow renders `Step 04 · Membership` but membership is now step 5. Update to `Step 05 · Membership`. Same AC-01 / SDD §4.4 violation as the preferences case. — *Fixed in 5361560: literal updated to `Step 05 · Membership` (verified at line 78).*
- [x] `frontend/src/components/onboarding/steps/StepBooking.tsx:61` — on-page eyebrow renders `Step 05 · First booking` but booking is now step 6 (only when shown). Update to `Step 06 · First booking`. Same AC-01 violation; also leaves the step labelled "5" while the MiniNav header reads "STEP 06 · BOOKING · 6 of 7", which is the most jarring of the four because the user is looking at both at once. — *Fixed in 5361560: literal updated to `Step 06 · First booking` (verified at line 61).*
- [x] `frontend/src/components/onboarding/steps/StepTerms.tsx:56` — on-page eyebrow renders `Step 06 · Final check` but terms is now step 3. Update to `Step 03 · Final check`. This is the canonical AC-01 violation — terms is now FIRST among the mandatory commits, but the page still announces it as step 06 (its old position after `booking`), explicitly the case the AC was written to prevent. — *Fixed in 5361560: literal updated to `Step 03 · Final check` (verified at line 56).*

## Suggestions (non-blocking)

- The four step-content eyebrow strings are currently four separate hardcoded literals — every time `ALL_STEPS` is reordered, four files have to be hunted down and edited. A single `useStepEyebrow(currentStep)` hook (or a passed prop) that derives the index from `visibleSteps` would make the same reorder mechanically impossible to get wrong; it would also let the on-page eyebrow react to the conditional `booking` step's presence the same way the MiniNav already does.

## Iteration 2 re-review notes (2026-04-23, commit 5361560)

Re-verified the fixes against SDD Decision 24 (in-step eyebrow rule) and Decision 25 (plan-pending → ACTIVE):

- **Eyebrows.** All four step files render Title Case `Step 0X · {Name}` (matches SDD §4.4 narrative + Decision 24, distinct from MiniNav's all-caps `STEP 0X · NAME · N of M` form). Diff is surgical — only the four eyebrow literals changed in the frontend.
- **Backend `OnboardingService.createPlanPending` matches SDD §3.** Verified line-by-line against §3.3: `deleteByUserIdAndStatus(userId, "ACTIVE")` (line 29), `status = "ACTIVE"` (line 34), `endDate = LocalDate.now().plusDays(plan.durationDays.toLong())` (line 36), response literal `status = "ACTIVE"` (line 45). All four §3.3 mutations applied exactly as specified.
- **PLAN_PENDING audit clean.** `grep -rn PLAN_PENDING backend/src/main/kotlin frontend/src` returns zero hits in source code. Only remaining occurrences are (a) test comments / verify clauses in `OnboardingServiceTest.kt:92,94` documenting the regression for the retargeted pre-delete (intentional audit text per SDD §3.6 wording) and (b) the V28 SQL migration's CHECK constraint string, which is intentionally permissive per SDD §3.5 / Decision 25 ("PLAN_PENDING is harmless dead value space; editing applied Flyway migrations is forbidden").
- **`OnboardingServiceTest.kt` covers §3.6 spec items.** All four tests present: status = ACTIVE persisted, endDate = today + durationDays, response.status = ACTIVE, retargeted defensive pre-delete (verifies `verify(exactly = 2) { deleteByUserIdAndStatus(userId, "ACTIVE") }` and `verify(exactly = 0) { deleteByUserIdAndStatus(userId, "PLAN_PENDING") }`).
- **Frontend TS literal narrowed.** `OnboardingPlanPendingResponse.status` is now `'ACTIVE'`. Searched all consumers — no code path switches on the literal value (only `pendingMembershipId` is propagated downstream via `store.setPendingMembership`), so the narrow is safe per the SA's audit.
- **Lesson 12 — `npm run build`** runs clean (`tsc && vite build` exits 0, 1000 modules transformed in 2.26s).
- **Lesson 14 — token discipline.** No new stale-namespace classes (`bg-brand-`, `text-ink-`, `border-line-`) introduced. The four `#0F0F0F` hex literals in JSX in StepTerms/StepPreferences/StepMembership/StepBooking are pre-existing from the unified-signup baseline (verified absent from the 5361560 diff) and are not in scope for this iteration.
- **Lesson 11 — loading states.** No route guard added in this iteration, so no async-gate loading hole introduced.

No new blockers found. Verdict flipped to APPROVED.

## Verdict

APPROVED
