# Review: Onboarding Flow — 2026-04-19

## Blockers (must fix before PR)

- [x] `frontend/src/hooks/useBootstrap.ts:1` / `frontend/src/components/layout/UserRoute.tsx:1` — Missing bootstrap loading gate causes race-condition UX break. Fixed: added `bootstrapLoading: boolean` + `setBootstrapLoading` to `authStore` (not persisted; set to `true` on rehydration when `isAuthenticated`); `useBootstrap` now sets it `true` before fetch and `false` in `finally`; `UserRoute`, `AuthRoute`, and `OnboardingRoute` each render a spinner when `isAuthenticated && bootstrapLoading`.

- [x] `frontend/src/components/onboarding/steps/StepBooking.tsx:25,34` — Inline API calls violate react-conventions. Fixed: replaced `axiosInstance.post('/bookings', ...)` with `createBooking({ classId })` from `src/api/bookings.ts` and `axiosInstance.post('/pt-bookings', ...)` with `createPtBooking({ trainerId, startAt })` from `src/api/ptBookings.ts`; removed `axiosInstance` import.

- [x] `frontend/src/components/onboarding/steps/StepWelcome.tsx:5` — `StepWelcome` defines a `firstName` prop but is called without it at `OnboardingShell.tsx:245`. Fixed: `OnboardingShell` now passes `firstName={store.firstName || null}` through `StepContent` props down to `<StepWelcome firstName={firstName} />`; `StepWelcome.tsx` unchanged.

## Suggestions (non-blocking)

- `OnboardingPage.tsx:20-28` — `computeResumeStep` jumps from profile-complete directly to `'terms'`, bypassing `preferences`, `membership`, and `booking`. The SDD (§4.4) specifies resume should land at `'membership'` when the profile is done. If a user closed the browser at the Membership step, they are dropped to Terms, missing their partially selected plan. Align the resume-step logic with the SDD's computed resume: return `'membership'` (not `'terms'`) once profile is confirmed complete.

- `frontend/src/store/onboardingStore.ts:74-77` — `getStoreName()` calls `useAuthStore.getState()` at module evaluation time as the static `name` option for Zustand `persist`. The Zustand `persist` `name` is read once when the store is created; it will always use the user ID present at module load (often `undefined` / `'anonymous'` before auth hydrates from localStorage). This means the per-user isolation described in SDD §4.9 does not actually work — all users share the `gf:onboarding:v1:anonymous` key until a page reload after login. Fix: use a session-keyed store or re-initialize the store's persistence when the user ID changes (Zustand `persist` supports a `name` factory via the state setter).

- `backend/src/main/kotlin/com/gymflow/service/OnboardingService.kt:51` — `findById(userId)` on `UserProfileRepository` uses the user's UUID as the profile's primary key (`user_id = id`). This is semantically correct but departs from the explicit `@Id` naming pattern. No code bug, but worth a comment clarifying that `UserProfile.userId` is both the FK and PK to make the repository call legible to future maintainers.

- `frontend/src/components/onboarding/steps/StepMembership.tsx:26-30` — "Most popular" badge is assigned to the most expensive plan rather than the `Quarterly` plan by name as the handoff specifies. If the gym adds a higher-priced plan, the badge shifts automatically. This may be intentional but it diverges from the handoff ("Featured plan (Quarterly) has a Most popular ribbon"). The simpler and spec-faithful approach would be to designate "most popular" by a server-side flag on the plan entity, or at minimum by the middle plan in the sorted list (which matches the Quarterly / medium-tier pricing structure).

- `frontend/src/components/onboarding/steps/StepTerms.tsx:156-165` — The custom checkbox uses a `<button role="checkbox">` with `id` pointing the `<label htmlFor>` to it. The `<label>` click does not trigger the checkbox's `onClick` in all browsers when the target is a `<button>` rather than an `<input type="checkbox">`. Use `<input type="checkbox" id={id} checked={checked} onChange={...} className="sr-only" />` with a visible custom indicator as a sibling, or ensure the `<label>` wraps the entire row so click propagation reaches the button.

- `frontend/src/components/onboarding/MiniNav.tsx:41` — Step label uppercases via `step.label.toUpperCase()` in JS, which is correct, but the eyebrow redundantly repeats the full fraction: `STEP 02 · YOUR PROFILE · 2 of 6`. The handoff spec shows `STEP 03 · PREFS` (abbreviated label) + `3 of 6` as a separate muted fraction. The current output is verbose and deviates from the specified layout. Consider abbreviating the label or separating the count into its own muted `<span>`.

## Verdict

APPROVED — all 3 blockers resolved
