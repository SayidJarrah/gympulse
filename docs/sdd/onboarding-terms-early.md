# SDD — Onboarding Terms Early

## 0. Context and References

This SDD is a **structural delta** on top of `docs/sdd/onboarding-unified-signup.md`.
The unified-signup SDD's §1 (Database Changes), §2 (API Contracts), and §3
(Backend) remain authoritative — there are **no backend changes here**. The
deltas are entirely in §4 (Frontend) and §5 (Testing). All this feature does is
move the wizard's `terms` step from position 6 to position 3 so the
combined-payload `POST /api/v1/auth/register` fires earlier, making the user
authenticated before the post-terms steps (`preferences`, `membership`,
`booking`, `done`) run. Once terms commit, the wizard's pre-account steps
become unreachable in reverse — the terms boundary is a structural point of
no return.

Reference docs:
- PRD: `docs/prd/onboarding-terms-early.md`
- Brief: `docs/briefs/onboarding-terms-early.md`
- Handoff: `docs/design-system/handoffs/onboarding-terms-early/README.md`
- Design reference: `docs/design-system/handoffs/onboarding-terms-early/design_reference/index.html`
- Parent SDD this delta extends: `docs/sdd/onboarding-unified-signup.md`
- Parent PRD: `docs/prd/onboarding-unified-signup.md`
- Design system: `docs/design-system/README.md`,
  `docs/design-system/colors_and_type.css`
- Date: 2026-04-23

---

## 1. Database

**N/A — no schema changes.**

Confirmed via the postgres MCP (executed against the dev container `gympulse-dev-postgres-1`):

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('users', 'user_profiles')
ORDER BY table_name, ordinal_position;
```

Both `users` and `user_profiles` are byte-for-byte identical to the schema
captured in `docs/sdd/onboarding-unified-signup.md` §1. The `users.email`
unique index `uq_users_email` is in place; `user_profiles.user_id` PK/FK to
`users.id` is in place; `user_profiles.onboarding_completed_at` (V27) is in
place.

The highest applied migration is `V28__widen_user_memberships_status_for_plan_pending.sql`.
**No new migration is added by this feature.**

---

## 2. API Contracts

**Schema changes: none. One response-value mutation on
`POST /api/v1/onboarding/plan-pending` — see the table below.**

The combined-payload `POST /api/v1/auth/register` from
`docs/sdd/onboarding-unified-signup.md` §2.1 is unchanged in shape,
validation, and response. Only its trigger position in the wizard moves
from step 6 to step 3 — the request body, the success response
(`LoginResponse`), and the error table (§3.5 of the parent SDD) are all
identical.

`POST /api/v1/onboarding/plan-pending` keeps its endpoint path, request
body shape, HTTP status code, and DTO field set. The only contract-visible
change is the value of `OnboardingPlanPendingResponse.status` — it
returns the string `"ACTIVE"` instead of `"PLAN_PENDING"`. The frontend
TypeScript type literal at `frontend/src/api/onboarding.ts:11` is
narrowed to `'ACTIVE'` to match. See §3 Backend and §6 Decision 24.

All other endpoints exercised by the wizard are unchanged in contract and run
identically — the only behavioural difference is that for the post-terms
suffix they now run from a **real authenticated session** instead of returning
`401`:

| Endpoint | Used by | Auth state under this SDD |
|---|---|---|
| `PUT /api/v1/profile/me` | `StepProfile` (still pre-register) | Unauthenticated guest — call is gated and skipped client-side, mirroring unified-signup SDD §4.4. |
| `PUT /api/v1/profile/me` | `StepPreferences` (now post-register) | **Authenticated.** Always runs when there are selections. |
| `POST /api/v1/onboarding/plan-pending` | `StepMembership` (now post-register) | **Authenticated.** Always runs when a plan is selected. **Behavioural delta (this SDD):** the `UserMembership` row written by this handler now has `status = "ACTIVE"` (was `"PLAN_PENDING"`) and `endDate = LocalDate.now() + plan.durationDays` (was `LocalDate.now()`). The `OnboardingPlanPendingResponse.status` field returned to the client is now `"ACTIVE"` (was `"PLAN_PENDING"`). Endpoint path, request body, HTTP status code, and response field set are all unchanged — only the `status` string value mutates. See §3 Backend for full rationale and §6 Decision 24. |
| `GET /api/v1/class-schedule` | `StepBooking` → `GroupClassList` (now post-register) | **Authenticated.** Returns 200 with real classes (was 401 under unified-signup). |
| `GET /api/v1/pt/trainers` | `StepBooking` → `TrainerList` (now post-register) | **Authenticated.** Returns 200 with real trainers (was 401). |
| `POST /api/v1/bookings` | `StepBooking` (now post-register) | **Authenticated.** Creates the booking (was 401). |
| `POST /api/v1/pt-bookings` | `StepBooking` (now post-register) | **Authenticated.** Creates the PT booking (was 401). |
| `POST /api/v1/onboarding/complete` | `StepDone` mount effect | **Authenticated.** Unchanged — sets `onboardingCompletedAt`. |

---

## 3. Backend

### 3.1 Summary

One service-level change: `OnboardingService.createPlanPending` (the handler
behind `POST /api/v1/onboarding/plan-pending`) now persists the new
`UserMembership` row with `status = "ACTIVE"` instead of `status =
"PLAN_PENDING"`. No new files, no entity changes, no DTO changes, no
controller changes, no error-code additions, no Flyway migration.

### 3.2 Why

Under this SDD the wizard's `booking` step (now position 6) runs as an
authenticated Member. The booking endpoint is the existing
`POST /api/v1/bookings`, which calls
`UserMembershipRepository.findAccessibleActiveMembershipForUpdate` (filters
on `status = 'ACTIVE'`). A `PLAN_PENDING` row does not satisfy that filter,
so the call returns `null` and `BookingService.createBooking` throws
`MembershipRequiredException` → `403 MEMBERSHIP_REQUIRED`.

Real paid-membership activation is explicitly out of scope (PRD non-goal,
Section 7). Today there is no payment step that flips a pending row to
active — `PLAN_PENDING` is a placeholder for a moment that never arrives
in the current product. Persisting `ACTIVE` immediately at plan-pending
submission is the smallest change that lets PRD AC-04 ("Selecting a class
or trainer slot and clicking Continue creates the booking via the
existing endpoints") pass end-to-end and lines up with the user's stated
intent ("in future it will be purchasing"). When real payment is added
later, the activation moment shifts to "after payment succeeds" — the
rename of the endpoint and its semantics is a future feature, not part of
this SDD.

See Decision 24 for the full trade-off analysis (resolution A chosen over
B = relax booking filter, and C = defer booking).

### 3.3 Files changed

| File | Status | Change |
|---|---|---|
| `backend/src/main/kotlin/com/gymflow/service/OnboardingService.kt` | **modified** | (1) `createPlanPending` line 29: replace `userMembershipRepository.deleteByUserIdAndStatus(userId, "PLAN_PENDING")` with `userMembershipRepository.deleteByUserIdAndStatus(userId, "ACTIVE")` — same defensive pre-clean, just targeting the new persisted status so a member who re-enters the wizard and picks a different plan replaces the prior now-active row instead of stacking duplicates. (2) Line 31–38: change the `UserMembership(...)` constructor call's `status = "PLAN_PENDING"` to `status = "ACTIVE"`. (3) Line 35–36: replace `startDate = LocalDate.now(), endDate = LocalDate.now()` with `startDate = LocalDate.now(), endDate = LocalDate.now().plusDays(plan.durationDays.toLong())` so the row satisfies the `findAccessibleActiveMembershipForUpdate` predicate (`m.endDate >= today`). The `plan` reference is already in scope from line 24. (4) Line 41–46: change the `OnboardingPlanPendingResponse` literal `status = "PLAN_PENDING"` to `status = "ACTIVE"` so the response shape stays internally consistent with what was actually persisted. The DTO's `status: String` field is already a free-form string — no DTO change needed. |
| `backend/src/main/kotlin/com/gymflow/service/UserMembershipService.kt` | **unchanged** | No change. The existing `purchaseMembership` `existsByUserIdAndStatus(userId, "ACTIVE")` guard is unaffected because the wizard does NOT call `POST /memberships`; the wizard exclusively uses `POST /onboarding/plan-pending`. A user who completes onboarding (now with an ACTIVE membership) and later visits `/plans` would correctly see "you already have a membership" via the existing `usePlansAccessGate` logic — this is the intended UX, not a regression. |
| `backend/src/main/kotlin/com/gymflow/repository/UserMembershipRepository.kt` | **unchanged** | No change. `findAccessibleActiveMembershipForUpdate`'s `m.status = 'ACTIVE'` filter is exactly right — once we persist as `ACTIVE`, the booking flow works without any repository or query touch. |
| `backend/src/main/kotlin/com/gymflow/domain/UserMembership.kt` | **unchanged** | No change. The entity's `status: String` field already accepts any string; the DB CHECK constraint already allows `ACTIVE` (and `PLAN_PENDING` per V28). |
| `backend/src/main/resources/db/migration/V28__widen_user_memberships_status_for_plan_pending.sql` | **unchanged** | The CHECK constraint still permits `PLAN_PENDING` even though no code path writes that value any more. Leaving the constraint wider than needed is correct: editing an applied Flyway migration is forbidden (Kotlin Conventions §"Flyway Migrations"), and there is no need for a V29 narrowing migration — `PLAN_PENDING` is harmless dead value space. |

### 3.4 Database state

**No schema changes.** Confirmed via `docker exec gympulse-dev-postgres-1
psql` against the dev DB:

```
status        | count
--------------+-------
ACTIVE        | 20
PLAN_PENDING  | 1
```

The single existing `PLAN_PENDING` row is **stale demo data** from a
prior test run before this fix. It is not consumed by any code path
going forward (no `findByStatus('PLAN_PENDING')` call exists outside the
defensive pre-delete in `createPlanPending`, which this SDD now retargets
to `ACTIVE`). Forward-only fix — leave the row in place; it harmlessly
ages out of relevance. Cleanup is not required and is intentionally not
part of the fix to keep the change surgical.

The CHECK constraint `chk_user_memberships_status` continues to permit
both `ACTIVE` and `PLAN_PENDING`. New rows written by `createPlanPending`
will be `ACTIVE`; the constraint accepts them without modification.

### 3.5 PLAN_PENDING consumers — full audit

`grep -rn "PLAN_PENDING" backend/src/main/kotlin
backend/src/main/resources` returns exactly five hits, all confined to
two files:

| Location | What it does | Action |
|---|---|---|
| `OnboardingService.kt:29` | `deleteByUserIdAndStatus(userId, "PLAN_PENDING")` defensive pre-delete | **Retarget to `"ACTIVE"`** so re-entering the wizard cleans up its own prior write. |
| `OnboardingService.kt:34` | `UserMembership(... status = "PLAN_PENDING" ...)` constructor | **Change to `"ACTIVE"`**. |
| `OnboardingService.kt:45` | `OnboardingPlanPendingResponse(status = "PLAN_PENDING")` response literal | **Change to `"ACTIVE"`** to keep response internally consistent with what was persisted. |
| `V28__widen_user_memberships_status_for_plan_pending.sql:7,14` | Schema permission only (comment + CHECK enum) | **No change** — Flyway migrations are immutable once applied. |

There are **no admin views, billing flows, scheduled jobs, or reporting
queries** that filter on `PLAN_PENDING`. `MembershipController`,
`UserMembershipService`, and `UserRepository` all filter exclusively on
`'ACTIVE' / 'CANCELLED' / 'EXPIRED'`. The PLAN_PENDING value is fully
self-contained within `OnboardingService` — nothing else reads it, so
the rename is safe.

The frontend has three references — all cosmetic:

| Location | What it does | Action |
|---|---|---|
| `frontend/src/api/onboarding.ts:11` | Type literal `status: 'PLAN_PENDING'` on `OnboardingPlanPendingResponse` TS interface | **Change to `status: 'ACTIVE'`** so the TS type matches the backend response shape. |
| `frontend/src/api/onboarding.ts:22` | URL path string `'/onboarding/plan-pending'` | **Unchanged** — endpoint path is preserved (changing it would be a contract change). The endpoint name keeps its historical "plan-pending" label even though the row it writes is now ACTIVE; one-version compromise per §7. |
| `frontend/src/store/onboardingStore.ts:31` | Field name `pendingMembershipId` | **Unchanged** — same one-version compromise. The field still holds the membership UUID; only its semantic label is now slightly misleading. Do NOT rename — renaming the store field would ripple into the persisted localStorage key (`gf:onboarding:v1:{userId}`), invalidating in-flight wizard state for users mid-onboarding. |
| `frontend/src/components/onboarding/steps/StepMembership.tsx:47` (comment only) | Inline comment referencing the old guard | **Unchanged** — comment-only mention; no behaviour. |

### 3.6 Test coverage

A new `backend/src/test/kotlin/com/gymflow/service/OnboardingServiceTest.kt`
is added (no existing onboarding service test file present — verified via
`ls backend/src/test/kotlin/com/gymflow/service/ | grep -i onboarding`)
covering:

- `createPlanPending` persists a row with `status = "ACTIVE"` (assert via
  `userMembershipRepository.findById(saved.membershipId)` then
  `assertEquals("ACTIVE", row.status)`).
- `createPlanPending` sets `endDate = startDate + plan.durationDays`
  (regression for the date arithmetic that lets the booking filter
  resolve the row).
- `createPlanPending` returns an `OnboardingPlanPendingResponse` whose
  `status` field is `"ACTIVE"`.
- Re-entering `createPlanPending` for the same user with a different
  `planId` deletes the prior `ACTIVE` row before writing the new one
  (regression for the retargeted defensive pre-delete; assert that exactly
  one `ACTIVE` row exists for the user after the second call, with the
  second `planId`).

The existing `BookingServiceTest.kt` is unchanged — it already covers
the `MembershipRequiredException` path with a fixture that explicitly
omits an active membership; this SDD does not change `BookingService`'s
behaviour.

---

## 4. Frontend

### 4.1 Routes

**No route changes.**

`/onboarding` is still the only public-but-stateful surface. The
`OnboardingRoute` guard from unified-signup SDD §4.1 (which permits
unauthenticated visitors and gates the authenticated-but-bootstrap-loading
case via `BootstrapSpinner`) is unchanged.

The legacy `/register → /onboarding` redirect from unified-signup SDD §4.1 is
preserved.

### 4.2 State (Zustand store)

**No store schema changes.** `OnboardingState` is unchanged from
unified-signup SDD §4.2.

The 24-hour stale-anonymous password cleanup from unified-signup SDD §4.2
step 4 still applies. Its window is now smaller in practice — only steps 1
(credentials) and 2 (profile) are pre-register, so the password sits in
`localStorage` for a shorter typical wizard duration before
`clearPassword()` rotates the persisted entry from
`gf:onboarding:v1:anonymous` to `gf:onboarding:v1:{userId}`.

The `credentialsLateError` lifecycle from unified-signup SDD §4.2 is unchanged:
the snap-back still works because the user is on `terms` (step 3) when the
late `EMAIL_ALREADY_EXISTS` 409 fires; calling
`store.setStep('credentials')` reroutes them back to step 1, which is a
shorter distance than under unified-signup but uses the identical mechanism.

### 4.3 API layer

**No API layer changes.** `frontend/src/api/auth.ts` `register()`,
`frontend/src/api/profile.ts`, `frontend/src/api/onboarding.ts`,
`frontend/src/api/membershipPlans.ts`, `frontend/src/api/bookings.ts`,
`frontend/src/api/ptBookings.ts`, and `frontend/src/api/classSchedule.ts`
are unchanged in signature, request shape, and response handling. The only
change is the **call-site authentication context** (post-terms calls now run
authenticated), which the API layer is agnostic to — it just attaches the
bearer token via the existing axios interceptor when one is present.

### 4.4 Components and pages

The bulk of this SDD. Single-table summary in the same shape as
unified-signup SDD §4.4:

| File | Status | Change |
|---|---|---|
| `frontend/src/types/onboarding.ts` | **modified** | Reorder `ALL_STEPS` — `terms` moves from position 6 to position 3 (after `profile`, before `preferences`). Full new array verbatim — see "ALL_STEPS reorder" below. The `StepKey` type union is unchanged (set of keys identical, only ordering changes). `done` remains NOT in `ALL_STEPS`. |
| `frontend/src/components/onboarding/OnboardingShell.tsx` | **modified** | (1) `handleContinue` switch case ordering preserved as today (each `case` matches `currentStep` independently), but the `terms` case body is updated: after `setStep('done')` is replaced by `advance()` which now naturally lands on `preferences` per the new `ALL_STEPS` order. (2) The `default` branch advances — unchanged. (3) Behaviour: `terms` case fires register, on success calls `setTokens`/`setUser`/`setOnboardingCompletedAt(null)`/`clearPassword()`/`advance()` — `advance()` derives the next step from the new `ALL_STEPS` array and sends the wizard to `preferences`. (4) The existing 409 `EMAIL_ALREADY_EXISTS` branch unchanged: `setCredentialsLateError` + `setStep('credentials')`. (5) The `done` case: not present in the switch — `done` is still rendered via the early-branch at ~line 252 that returns the done-screen layout instead of the wizard layout. `StepDone`'s mount effect fires `POST /onboarding/complete` per the existing pattern. (6) Pass `backLocked` to `StepRail` (computed inline as `currentStep === 'preferences' || currentStep === 'membership' || currentStep === 'booking'`). |
| `frontend/src/components/onboarding/MiniNav.tsx` | **modified** | The `EYEBROW_LABELS` `Record<StepKey, string>` map is unchanged in code (the mapping `credentials → 'ACCOUNT'`, `profile → 'PROFILE'`, `terms → 'FINAL CHECK'`, `preferences → 'PREFS'`, `membership → 'MEMBERSHIP'`, `booking → 'BOOKING'`, `done → 'DONE'` already matches the handoff). The eyebrow string is composed as `STEP {NN} · {EYEBROW_LABELS[step]} · {N} of {M}` where `NN` is `String(stepNum).padStart(2, '0')` and both `stepNum` and `M` are derived from `visibleSteps` index/length. Because `ALL_STEPS` reorder propagates into `visibleSteps`, the rendered strings automatically become `STEP 01 · ACCOUNT · 1 of 6/7`, `STEP 02 · PROFILE · 2 of 6/7`, `STEP 03 · FINAL CHECK · 3 of 6/7`, `STEP 04 · PREFS · 4 of 6/7`, `STEP 05 · MEMBERSHIP · 5 of 6/7`, `STEP 06 · BOOKING · 6 of 7` (only when included). **Verification step:** confirm with `git grep EYEBROW_LABELS frontend/src/components/onboarding/MiniNav.tsx` that the table values match the list above; if any value diverges, update to match. |
| `frontend/src/components/onboarding/StepRail.tsx` | **modified** | Accept a new prop `backLocked: boolean`. The done-state branch (currently a `<button>` with `onClick={() => onNavigateBack(step.key)}` at lines 37–46) becomes conditional on `step.key`. **Predicate:** `if (backLocked && (step.key === 'credentials' || step.key === 'profile' || step.key === 'terms')) render as a static <div>` (with the same flex layout, padding, and `<DoneCircle>` + `<StepLabel state="done">` children, but no click handler, no `type="button"`, and `style={{ cursor: 'default' }}` instead of `cursor: pointer`). Otherwise render the existing `<button>` (unchanged). The non-interactive `<div>` MUST NOT carry a `role="button"` or `tabIndex`. The `<ol>` container retains its `<nav aria-label="Onboarding progress">`. |
| `frontend/src/components/onboarding/StickyFooter.tsx` | **modified** | Compute the disable rule **inline** from `currentStep` rather than extending the existing `isFirst` prop chain — keeps the prop surface stable and matches the simplest mental model ("this step's Back is disabled"). Replace `const isFirst = currentIndex === 0` with `const backDisabled = currentStep === 'credentials' || currentStep === 'preferences'`. Update the Back button: `disabled={backDisabled}` (was `disabled={isFirst}`) and `color: backDisabled ? 'var(--color-fg-muted)' : 'var(--color-fg-label)'` (was `isFirst ? …`). The existing `disabled:opacity-40 disabled:cursor-not-allowed` Tailwind classes already handle the visual treatment. The `isLast` computation (`currentStep === 'terms'`) **stays as is** — see Decision 16 — so the Continue button still renders "Finish onboarding →" / "Creating account…" / "Try again →" on the terms step (step 3 now), and "Continue →" / "Saving…" on every step after it including `done`'s entry transition. |
| `frontend/src/components/onboarding/steps/StepProfile.tsx` | **unchanged** | Still pre-register. The `isAuthenticated` guard at line 94–110 stays — when the wizard is run by an existing authenticated user (e.g. resuming onboarding), the guard's `if (isAuthenticated)` branch fires `PUT /profile/me`; when the wizard is run by a brand-new guest (the unified-signup happy path), the branch is skipped and the profile fields persist locally only, to be sent in the combined-payload register at terms. The asymmetry with `StepPreferences`/`StepMembership`/`StepBooking` (which drop their guards) is intentional — see Decision 18. |
| `frontend/src/components/onboarding/steps/StepPreferences.tsx` | **modified** | Drop the `isAuthenticated` half of the guard at line 68–69. Replace `if (hasSelections && isAuthenticated) { try { await updateMyProfile(…) … } catch { … } }` with `if (hasSelections) { try { await updateMyProfile(…) … } catch { … } }`. Remove the `useAuthStore` import and `const isAuthenticated = useAuthStore.getState().isAuthenticated` lookup. The component is always reached as an authenticated member under this SDD — there is no path to it for an unauthenticated guest. |
| `frontend/src/components/onboarding/steps/StepMembership.tsx` | **modified** | Drop the early-return guard at line 51–55. Remove `const isAuthenticated = useAuthStore.getState().isAuthenticated; if (!isAuthenticated) { store.setPlan(plan.id, plan.name, plan.priceInCents); return 'plan-selected' }`. The flow falls through to the existing `try { const res = await submitPlanPending({ planId: selectedId }); store.setPlan(…); store.setPendingMembership(res.membershipId); return 'plan-selected' } catch { … }` block, which is now always taken. Remove the `useAuthStore` import. |
| `frontend/src/components/onboarding/steps/StepBooking.tsx` | **unchanged** | The `submit()` already calls `createBooking({ classId })` / `createPtBooking({ trainerId, startAt })` without any `isAuthenticated` guard — it was written assuming an authenticated session. Under unified-signup it was unreachable as an authenticated guest (the booking step came before terms in the old order's intent but was simply broken). Under this SDD it is now reachable from a real session and works as written. No code change required; the file is listed here for completeness. |
| `frontend/src/pages/onboarding/OnboardingPage.tsx` | **modified** | `computeResumeStep` updated for the new ordering. Decision tree spelled out below. The early-return for `currentStep === 'done'` stays at the very top of the function — preserves the unified-signup SDD §6 Decision 11 invariant. |
| `frontend/src/components/landing/PulseNav.tsx` | **unchanged** | The `/onboarding` CTAs from unified-signup SDD §4.4 are unchanged. |
| `frontend/src/components/landing/HeroLoggedOut.tsx` | **unchanged** | The `/onboarding` CTA from unified-signup SDD §4.4 is unchanged. |
| `frontend/src/components/onboarding/steps/StepCredentials.tsx` | **unchanged** | The credentials step is still position 1; its content, validation, and snap-back banner integration are unchanged. |
| `frontend/src/components/onboarding/steps/StepTerms.tsx` | **unchanged** | The terms step's content (two checkboxes + headline + lede) is unchanged. The only thing that changes about terms is *where in the wizard it appears* — the component itself is identical. |
| `frontend/src/components/onboarding/ProgressBar.tsx` | **unchanged** | Already computes fill percentage from `visibleSteps` index — propagates automatically. |

#### ALL_STEPS reorder (verbatim)

Replace the contents of `ALL_STEPS` in `frontend/src/types/onboarding.ts`
with this array (developer can paste directly):

```ts
export const ALL_STEPS: StepDefinition[] = [
  { key: 'credentials', label: 'Your account',  sublabel: 'REQUIRED',       required: true,  conditional: false },
  { key: 'profile',     label: 'Your profile',  sublabel: 'REQUIRED',       required: true,  conditional: false },
  { key: 'terms',       label: 'Final check',   sublabel: 'REQUIRED',       required: true,  conditional: false },
  { key: 'preferences', label: 'Preferences',   sublabel: 'OPTIONAL',       required: false, conditional: false },
  { key: 'membership',  label: 'Membership',    sublabel: 'OPTIONAL',       required: false, conditional: false },
  { key: 'booking',     label: 'First booking', sublabel: 'IF PLAN CHOSEN', required: false, conditional: true  },
]
// 'done' is not in ALL_STEPS — it replaces the layout, not a step in the rail.
```

Confirm: `done` is NOT added. `StepKey` type union (line 1 of the file)
remains `'credentials' | 'profile' | 'preferences' | 'membership' | 'booking' | 'terms' | 'done'`
— the set is unchanged, only the array order shifts.

#### handleContinue switch — explicit expected sequence

The switch case order in `OnboardingShell.handleContinue` (lines 126–231)
**does not need to be reordered**. Each `case` matches `currentStep` exactly,
and the `default` advances. The only behavioural change required is in the
`terms` case body: after `setOnboardingCompletedAt(null)` and
`store.clearPassword()`, the existing `advance()` call now derives the next
step from the new `ALL_STEPS` and sends the wizard to `preferences` instead
of `done`. No code change is needed in the `terms` case for this — the
mechanism is `advance() → useOnboardingStore.getState().selectedPlanId →
freshSteps = ALL_STEPS.filter(...) → freshIndex + 1`, and with `terms` now
at index 2 and `preferences` at index 3, `advance()` lands on `preferences`
automatically.

The full expected sequence after the user submits terms:

```
terms.submit()
  → store.agreeTerms && store.agreeWaiver guard passes
  → POST /api/v1/auth/register (combined payload)
  → 201 Created
  → setTokens(accessToken, refreshToken)
  → setUser(decodedJwtPayload)
  → setOnboardingCompletedAt(null)
  → store.clearPassword()
  → advance()
      → freshPlanId = useOnboardingStore.getState().selectedPlanId  // null at this point
      → freshSteps = ALL_STEPS.filter(s => !s.conditional || !!freshPlanId)
                   // = [credentials, profile, terms, preferences, membership]  (booking filtered out)
      → freshIndex = 2  (terms)
      → nextStep = freshSteps[3] = preferences
      → store.setStep('preferences')
  → wizard re-renders at preferences
  → backLocked = true (currentStep === 'preferences')
  → StickyFooter: backDisabled = true; Back button greyed and inert
  → StepRail: rows for credentials/profile/terms render as <div> not <button>
```

When the user later picks a plan at `membership` and clicks Continue,
`advance()` re-filters the steps (now including `booking`) and lands on
`booking`. When the user finishes `booking` (or skips when no plan), the
final `advance()` finds no next entry in `ALL_STEPS` and falls through to
`store.setStep('done')` per the existing `else` branch in `advance()`.

#### Back-button disable rule on step 4 (preferences)

Implementation: extend the existing disabled-Back treatment used today on
step 1 (credentials) — same color tokens, same `disabled` HTML attribute,
same opacity-40 / cursor-not-allowed. **Compute inline** from `currentStep`
(no new prop on `StickyFooter` — keeps the prop surface stable):

```ts
// In StickyFooter.tsx, replace `const isFirst = currentIndex === 0` with:
const backDisabled = currentStep === 'credentials' || currentStep === 'preferences'

// Update the Back <button>:
//   disabled={backDisabled}
//   style={{ color: backDisabled ? 'var(--color-fg-muted)' : 'var(--color-fg-label)', background: 'transparent' }}
```

The button is **not hidden** — it remains in the footer layout to keep the
three-slot footer (Back / Skip / Continue) visually stable. An optional
tooltip via `title="You're already signed in. Continue forward."` is
acceptable but not required (handoff §"Disabled treatment for preferences").

#### Rail interaction rule for steps 1–3

`StepRail.tsx` accepts a new prop `backLocked: boolean`. `OnboardingShell`
computes it inline as `backLocked = currentStep === 'preferences' ||
currentStep === 'membership' || currentStep === 'booking'` (i.e. true once
the user has advanced past `terms`). When `backLocked` is `true`, the rail
rows for steps `credentials`, `profile`, and `terms` render as a static
`<div>` instead of the existing `<button>`:

```ts
// In StepRail.tsx, replace the isDone branch:
{isDone ? (
  backLocked && (step.key === 'credentials' || step.key === 'profile' || step.key === 'terms') ? (
    <div
      className="flex items-start gap-3 w-full text-left rounded-md px-2 py-1.5"
      style={{ cursor: 'default' }}
    >
      <DoneCircle num={idx + 1} />
      <StepLabel step={step} state="done" />
    </div>
  ) : (
    <button
      type="button"
      onClick={() => onNavigateBack(step.key)}
      className="flex items-start gap-3 w-full text-left rounded-md px-2 py-1.5 transition-colors duration-150"
      style={{ cursor: 'pointer' }}
    >
      <DoneCircle num={idx + 1} />
      <StepLabel step={step} state="done" />
    </button>
  )
) : (
  // ... existing current/todo branch unchanged
)}
```

The `<div>` carries no `role="button"`, no `tabIndex`, no `aria-disabled`,
no click handler — fully inert. The visible state (DoneCircle + StepLabel)
is unchanged so the user still sees the green check-circle and step label.
This mirrors the Back-button lock at the StickyFooter level.

#### computeResumeStep updates in OnboardingPage.tsx

The new decision tree (precedence top to bottom; first match wins):

```
1. If store.currentStep === 'done' → return 'done'
   (preserves unified-signup SDD §6 Decision 11; must be top to override
    every other rule once the wizard has flagged itself terminal)

2. If !isAuthenticated && !store.email && !store.firstName → return 'credentials'
   (brand-new guest with nothing typed)

3. If !isAuthenticated → return store.currentStep ?? 'credentials'
   (guest with credentials/profile in store but not yet registered —
    respect their persisted step so they resume mid pre-terms section)

4. If isAuthenticated, walk the post-terms decision tree:
   a. If goals.length === 0 && classTypes.length === 0 && !frequency → return 'preferences'
      (have not attempted preferences)
   b. Else if !selectedPlanId → return 'membership'
      (have not selected a plan)
   c. Else if !!selectedPlanId && !completedBookingId → return 'booking'
      (selected a plan but no booking yet)
   d. Else → return 'done'
      (selected a plan and made a booking — final transition into done)
```

This replaces the existing function body lines 21–49. The early-return for
`store.currentStep === 'done'` MUST stay at the top — without it, an
authenticated user who already reached `done` and is now waiting for
`POST /onboarding/complete` to flip `onboardingCompletedAt` could be
re-routed to `booking` mid-render and never fire the completion call.

The 24-hour stale-password cleanup at line 59–64 is preserved verbatim. It
only runs for unauthenticated guests, so it is unaffected by this decision
tree.

**Note on the existing `if (isAuthenticated)` profile-hydration branch**
(lines 66–88): keep as is. It populates `firstName`/`lastName`/`phone`/
`dob` into the store from `GET /profile/me` so that a returning
authenticated user's resume step can read profile-derived state. Under this
SDD that branch still runs before `computeResumeStep`, so the resume
function sees hydrated profile fields when relevant — though the
post-terms decision tree above does not actually depend on those fields
(it depends on `goals`/`classTypes`/`frequency`/`selectedPlanId`/
`completedBookingId`, all already in the persisted store).

### 4.5 Error mapping

**N/A — no new error codes.**

The combined-payload register's error codes are unchanged from
`docs/sdd/onboarding-unified-signup.md` §3.5. The
`getRegisterErrorMessage` helper (`frontend/src/utils/errorMessages.ts`)
remains the single source of user-facing strings.

The only nuance: `EMAIL_ALREADY_EXISTS` now snaps back from STEP 3 (terms)
to STEP 1 (credentials) instead of from STEP 6 (terms under unified-signup)
to STEP 1. The snap-back UX still works correctly because the mechanism is
purely `setStep('credentials')` regardless of the source step — the
distance the user appears to "jump back" is shorter, but the user-facing
behaviour (banner appears above email, focus moves to email input,
typing in email clears the banner) is identical.

The defensive case for `INVALID_FIRST_NAME` / `INVALID_LAST_NAME` /
`INVALID_PHONE` / `INVALID_DATE_OF_BIRTH` (unified-signup SDD §4.3, error
table) is unchanged — these are surfaced via the existing `termsError`
slot at the bottom of `StepTerms` with the message "… Please go back and
check your profile." The user can navigate back to `profile` from `terms`
because Back is still enabled on `terms` (step 3) — it is only disabled
on `preferences` (step 4). This keeps the recovery path intact for the
defensive case.

---

## 5. Testing

### 5.1 Backend unit tests

**N/A — no backend changes.**

The existing `AuthServiceRegisterTest.kt` (or wherever the unified-signup
tests landed) covers the combined-payload register behaviour and is
unchanged in scope. No test file is added, modified, or deleted by this
SDD.

### 5.2 E2E happy path scenario

**Decision (Decision 22):** write a **new** spec file at
`e2e/specs/onboarding-terms-early.spec.ts`. The existing
`e2e/specs/onboarding-unified-signup.spec.ts` is now structurally wrong
(it walks the old `credentials → profile → preferences → membership →
booking → terms → done` order with `terms` at the end). It is left in the
repo as historical — per CLAUDE.md "one happy-path scenario per feature,
added on demand", both files coexist; they cover different feature slugs.
The unified-signup spec will pass against the new ordering only if its
assertions are loose enough to not care about step order — it is the
test author's call when they next run it whether to delete it. This SDD
does not require deletion.

**Spec file:** `e2e/specs/onboarding-terms-early.spec.ts` (new file).

**Path (one happy path, end-to-end including the booking step which is now
testable for the first time):**

```
1. Visit /
2. Click "Join GymFlow" CTA in nav (or the hero CTA — either works since
   both link to /onboarding per unified-signup SDD §4.4)
3. Expect URL /onboarding
4. STEP 1 — Credentials (guest):
   - Fill email = `u-${randomUUID().slice(0,8)}@test.gympulse.local`
   - Fill password = 'Test1234!'
   - Click Continue
   - ASSERT: NO POST /api/v1/auth/register fired (AC-05)
5. STEP 2 — Profile (guest):
   - Fill firstName, lastName, phone (US format), dob (>= today - 16y)
   - Click Continue
   - ASSERT: still NO POST /api/v1/auth/register fired (AC-05)
6. STEP 3 — Terms (guest → member):
   - Toggle the two required checkboxes
   - Click "Finish onboarding →"
   - Wait for: page.waitForResponse(r => r.url().endsWith('/auth/register') && r.status() === 201)
   - ASSERT: exactly one POST /api/v1/auth/register fired (AC-02)
7. STEP 4 — Preferences (member, post-terms):
   - ASSERT: Back button is present in the DOM but has the `disabled` attribute (AC-03)
   - ASSERT: rail rows for credentials, profile, terms are NOT <button>
     (use `page.locator('nav[aria-label="Onboarding progress"] li').nth(0)`
      and check the inner element is `div`, not `button`) (AC-03)
   - Click "Skip this step"
8. STEP 5 — Membership (member):
   - ASSERT: plan cards loaded (no "Unable to load plans" error)
   - Click any plan's "Select plan" button (the trial / first plan is fine)
   - Click Continue
   - Wait for: POST /api/v1/onboarding/plan-pending → 201
9. STEP 6 — Booking (member, conditional):
   - ASSERT: rail now shows the booking step (was conditional)
   - ASSERT: GET /api/v1/class-schedule responded 200 (AC-04)
   - Wait for the GroupClassList to render at least one class card
   - Click the first class card
   - Click Continue
   - Wait for: POST /api/v1/bookings → 201 (AC-04)
10. DONE screen:
    - ASSERT: Done screen visible
    - ASSERT: page.waitForResponse(r => r.url().endsWith('/onboarding/complete') && r.status() === 200)
      (AC-07)
    - Click "Enter GymFlow →"
11. ASSERT: URL is /home (AC-07)
```

**Spec rules per CLAUDE.md "Testing":**

- All emails end with `@test.gympulse.local`. Unique per test via
  `crypto.randomUUID()`.
- No `waitForTimeout`. Use `expect.poll`, `waitForResponse`, or direct
  UI-state assertions throughout — the path above already conforms.
- One happy-path scenario only. No error-permutation fans (the snap-back UX
  for `EMAIL_ALREADY_EXISTS` is exercised by manual QA + backend unit tests
  for the 409 path, not by E2E — unchanged scope from unified-signup).

---

## 6. Decisions and Trade-offs

Decisions 1–14 from `docs/sdd/onboarding-unified-signup.md` §6 are
referenced and remain valid. New decisions are numbered 15+:

15. **`ALL_STEPS` reorder — `terms` at position 3.** The wizard is
    re-sequenced to `credentials → profile → terms → preferences →
    membership → booking → done`. Why: PRD AC-01 mandates this ordering;
    structurally the booking step's authentication mismatch (it always
    needed authed endpoints but ran as a guest under unified-signup) only
    has a clean fix if the user becomes authenticated before booking is
    reachable. Moving terms forward to step 3 is the smallest reorder that
    achieves this — terms is the existing register-commit point, so moving
    its position moves the commit point without any new contract.

16. **`handleContinue.terms` case advances to `preferences` via the same
    `advance()` call.** The existing `advance()` derives the next step from
    `ALL_STEPS`; under the reorder it naturally lands on `preferences`
    instead of `done`. No code change in the `terms` case body is required
    beyond what unified-signup already wrote — the reorder of `ALL_STEPS`
    propagates through `advance()` automatically. Why: minimises code
    churn; preserves register-at-commit semantics; only the *position* of
    commit moves, not the *mechanism*.

    `StickyFooter`'s `isLast = currentStep === 'terms'` stays as is — this
    keeps the Continue button on terms reading "Finish onboarding →" /
    "Creating account…" / "Try again →", which still matches the user's
    intent at that step (committing the account is "finishing" the
    irreversible part of onboarding). The post-terms steps then read
    "Continue →" / "Saving…" — appropriate for optional enrichment steps.
    Resolves handoff Open Question 1.

17. **Drop `isAuthenticated` skip-guards from `StepPreferences`,
    `StepMembership`, and `StepBooking`.** Why: post-terms steps always
    run authenticated under this flow; the guards added in unified-signup
    SDD §4.4 were a workaround for the structural ordering this SDD
    fixes. Removing them simplifies the handler code paths and removes a
    failure mode where a future code change accidentally bypasses
    `terms` and reaches a post-terms step unauthenticated (the dropped
    guard would silently no-op the API call instead of surfacing the
    bug). `StepBooking` already has no guard — its existing call sites
    work as-is now that the user is authenticated.

18. **`StepProfile` keeps its `isAuthenticated` guard.** Why: `StepProfile`
    is still pre-register (step 2). The guard's `if (isAuthenticated)`
    branch fires `PUT /profile/me` only for an existing authenticated user
    resuming onboarding — the brand-new-guest happy path skips the API
    call and persists locally for the combined-payload register at terms.
    The asymmetry vs. the post-terms steps (which drop their guards) is
    the rule: pre-terms = guard stays; post-terms = guard drops. This
    matches the boundary the rest of the SDD enforces.

19. **Back disabled on step 4 (preferences) — extends the existing step-1
    disabled-Back treatment.** Why: PRD AC-03 — terms commit is
    irreversible; the wizard must surface no affordance to navigate back
    into a pre-account step. Reusing the credentials-step disabled
    treatment (greyed at `--color-fg-muted`, `disabled` HTML attribute,
    opacity 0.4, `cursor: not-allowed`) gives a visually consistent
    "this affordance is here but inert" signal users have already learned
    on step 1. Implemented inline in `StickyFooter` via a computed
    `backDisabled = currentStep === 'credentials' || currentStep ===
    'preferences'` instead of adding a `backDisabled` prop — keeps the
    prop surface stable and makes the rule readable in one place.

20. **Rail rows for steps 1–3 become non-interactive after passing terms.**
    Why: PRD AC-03 — applies the same Back-lock to the rail, not just the
    Back button. The user must not have any path back into pre-account
    steps via any affordance. `StepRail` accepts a new `backLocked:
    boolean` prop; when `true`, the done-state rows for `credentials`,
    `profile`, and `terms` render as a static `<div>` (no button, no
    click handler, no tabIndex, `cursor: default`). Steps 4–6 (`preferences`,
    `membership`, `booking`) in done-state remain interactive — Back
    within the post-terms suffix is still permitted between adjacent
    steps. `OnboardingShell` computes `backLocked` inline as `currentStep
    === 'preferences' || currentStep === 'membership' || currentStep ===
    'booking'`. Resolves handoff Open Question 2 — `backLocked` is derived
    from `currentStep` (which is always defined and synchronously
    available), not from `isAuthenticated` (which would race the post-
    register render).

21. **`computeResumeStep` — new resume targets for authenticated returning
    users.** Why: PRD AC-06 — an authenticated returning user with no
    `onboardingCompletedAt` must resume at the right post-terms step
    based on what they already did. Decision tree precedence (top-down,
    first match wins):

    1. `store.currentStep === 'done'` → `'done'` (terminal-state guarantee
       from unified-signup SDD §6 Decision 11)
    2. Brand-new unauthenticated visitor (no `email`, no `firstName`) →
       `'credentials'`
    3. Unauthenticated visitor with credentials/profile in store but not
       yet registered → `store.currentStep ?? 'credentials'` (respect
       their persisted step so they resume mid pre-terms section)
    4. Authenticated user, not yet attempted preferences (`goals`,
       `classTypes`, `frequency` all empty) → `'preferences'`
    5. Authenticated user, no plan selected → `'membership'`
    6. Authenticated user, plan selected but no booking → `'booking'`
    7. Otherwise → `'done'`

    Rule 1 must stay at the very top — without it, an authenticated user
    who already reached `done` and is awaiting the `POST /onboarding/complete`
    flip can be wrongly re-routed to `booking` mid-render.

22. **New E2E spec file rather than rewriting the unified-signup spec.**
    Why: per CLAUDE.md testing rules, one happy-path scenario per feature.
    The unified-signup spec covers a different feature slug; this
    feature gets its own spec at `e2e/specs/onboarding-terms-early.spec.ts`.
    The new spec walks the full path including the booking step (now
    testable end-to-end against the dev backend for the first time). The
    unified-signup spec is not deleted by this SDD — leaving it allows
    future test authors to compare and decide whether to retire it.

23. **`EMAIL_ALREADY_EXISTS` snap-back from terms (step 3) to credentials
    (step 1) is mechanically unchanged.** Why: the snap-back is implemented
    as `store.setCredentialsLateError(...)` + `store.setStep('credentials')`,
    both of which are step-position agnostic. Under unified-signup the
    user appeared to jump back from step 6 to step 1; under this SDD they
    appear to jump back from step 3 to step 1. The user-facing UX is
    identical (banner above email, focus on email input, banner clears on
    first email-input change) and no error-code or handler change is
    required.

24. **In-step body eyebrows must match the new step positions.** The MiniNav
    top-bar derives its strings from `EYEBROW_LABELS`, but each step
    component (StepCredentials, StepProfile, StepTerms, StepPreferences,
    StepMembership, StepBooking) hardcodes its own "Step 0X · {Name}" body
    eyebrow. These must be updated whenever the step ordering changes.
    Future step authors should consider extracting this to a single source
    of truth (logged as TD).

25. **`POST /onboarding/plan-pending` persists `status = "ACTIVE"` rather
    than `"PLAN_PENDING"`; treat plan selection as activation during
    onboarding.** Surfaced by the post-merge tester escalation: the new
    step ordering put the booking step (now position 6) downstream of an
    authenticated session, and `POST /api/v1/bookings` returned
    `403 MEMBERSHIP_REQUIRED` because the wizard's plan-selection wrote a
    `PLAN_PENDING` row that the booking endpoint's
    `findAccessibleActiveMembershipForUpdate` filter (`status = 'ACTIVE'`)
    correctly skipped. PRD AC-04 mandates that booking work end-to-end via
    the existing endpoints.

    **Three resolutions considered:**

    - **A (chosen): Treat plan-pending as activation.** Change the persisted
      `status` from `"PLAN_PENDING"` to `"ACTIVE"` in
      `OnboardingService.createPlanPending`. Also set
      `endDate = LocalDate.now() + plan.durationDays` so the row satisfies
      the booking filter. Pros: cleanest; matches the user's stated intent
      ("in future it will be purchasing"); the existing
      `POST /memberships`, `GET /memberships/me`, booking, and PT booking
      flows all work without change because they are already keyed on
      `ACTIVE`. Cons: the `PLAN_PENDING` enum value becomes
      provisionally-dead in the codebase (still permitted by the V28 CHECK
      constraint, no longer written); endpoint name retains its historical
      `plan-pending` label until a future rename.
    - **B (rejected): Relax `BookingService.createBooking` to accept
      `PLAN_PENDING` memberships.** Pros: minimal surface change. Cons:
      leaks the "PLAN_PENDING is mostly active" rule across the system —
      every future booking-related read query (PT bookings, analytics,
      admin attendee lists) would also need the relaxation; introduces
      an inconsistent two-status notion of "active enough to book". The
      semantic mess outweighs the smaller diff.
    - **C (rejected): Defer `POST /bookings` until membership is later
      activated.** Pros: keeps backend semantics pure. Cons: requires a
      deferred-booking infrastructure that does not exist; the wizard's
      booking step becomes "pick a class but it won't be booked until X
      happens" — and X never happens in this product, since real payment
      activation is itself out of scope. Defeats the point of moving
      terms early.

    **Why A wins:** real payment activation is explicitly a project
    non-goal (PRD §7, Out of Scope). The `PLAN_PENDING` status was always
    a placeholder for a moment that never arrives in the current product.
    Persisting `ACTIVE` immediately matches the actual product behaviour.
    When real payment is added later, the activation moment shifts to
    "after payment succeeds" and a new migration can re-introduce a
    transient pre-active status — at that point a proper state machine +
    migration of historical data is tractable; today, eagerly activating
    is the honest model.

    **Knock-on effect on unified-signup SDD §6 Decision 13
    (`useHomePage` re-fetch loop guard):** the original loop fired
    because users who completed onboarding without a plan (or with
    `PLAN_PENDING`) hit `404 NO_ACTIVE_MEMBERSHIP` from `/memberships/me`.
    Under this SDD, users who select a plan in the wizard now have an
    `ACTIVE` membership immediately, so `/memberships/me` returns 200 and
    the guard never trips for that path. Decision 13's guard
    (`membershipErrorCode !== 'NO_ACTIVE_MEMBERSHIP'`) is **not removed**
    — it still protects the genuine "completed onboarding, skipped plan"
    case (PRD AC-07: skipping membership is allowed) and any other code
    path that legitimately lands on `/home` without an active membership.
    Removing the guard would re-introduce the 50,000-call/min loop for
    those users.

    **Stale demo row:** the dev DB held one `PLAN_PENDING` row at fix
    time (verified via `docker exec gympulse-dev-postgres-1 psql`).
    Forward-only fix — leaving the row in place is harmless (no code
    reads `PLAN_PENDING` after this change) and avoids a one-off cleanup
    migration.

---

## 7. Out of Scope

Mirroring PRD non-goals plus the SDD-specific delta surface:

- Email verification / confirmation link
- Social auth (Google / Apple sign-in)
- Real paid-membership activation (selecting a plan still results in a
  pending state — actual payment + activation is its own feature)
- Allowing the user to edit credentials, profile, or terms acceptance from
  inside the wizard after register
- Migrating users mid-flow under the unified-signup step ordering at the
  moment this ships — they continue under the existing onboarding-flow
  resume logic
- Backend security or contract changes — no endpoints become public, no
  request/response shapes change, no error codes added or removed
- Any change to the user-facing copy of the rail rows or step content
- Any change to the visual treatment of the rail circles, MiniNav layout,
  StickyFooter layout, or step-transition motion
- Any persistence of `agreeTerms` / `agreeWaiver` beyond inline validation
  (still no `consent_records` table — unchanged from unified-signup
  Decision 3)
- Adding a separate `terms-only` endpoint or splitting the combined-payload
  register
- Allowing the user to skip terms — still required, still gates account
  creation
- Removing the `/register → /onboarding` redirect from unified-signup
  SDD §4.1 — left in place for legacy bookmarks

---

## 8. Open Questions

None. The PRD explicitly states "None. The brief plus the unified-signup
PRD/SDD cover all behavioural decisions." The handoff's two open questions
are resolved in this SDD:

1. **Handoff OQ-1 — `isLast` / "Finish onboarding →" copy on the terms
   step:** keep `isLast = currentStep === 'terms'` and keep the Continue
   button copy reading "Finish onboarding →" on terms (Decision 16). Why:
   the user's mental model on terms is still "I am about to commit my
   account" — that is the irreversible step the copy was originally
   written for, and moving terms earlier in the flow does not change the
   user intent at that step. The post-terms steps (`preferences`,
   `membership`, `booking`) are optional enrichment and reading
   "Continue →" / "Saving…" is appropriate for them. The Done step's own
   CTA ("Enter GymFlow →") handles the truly final transition.

2. **Handoff OQ-2 — `backLocked` prop origin:** derive from `currentStep`,
   not from `isAuthenticated` (Decision 20). Why: `currentStep` is
   synchronously available at every render; `isAuthenticated` from the
   auth store has a brief window during the post-register tokens-stored-
   but-bootstrap-not-yet-flipped state where it could race the rail
   render. Computing inline as `currentStep === 'preferences' ||
   currentStep === 'membership' || currentStep === 'booking'` keeps the
   rule readable in one place and avoids the race entirely.
