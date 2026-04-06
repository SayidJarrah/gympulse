# Tech Debt Backlog

Items logged automatically from reviewer suggestions during `/deliver` and `/audit`.
Address these during dedicated debt sprints or opportunistically when touching the relevant area.

## Format

```
## TD-{N} — {short title}
Source: docs/reviews/{feature}-{date}.md
Feature: {feature}
Added: YYYY-MM-DD
Effort: S | M | L
{description}
```

Effort: **S** = a few lines, **M** = < half a day, **L** = needs its own ticket/planning.

---

## TD-001 — MemberHomeSectionEmptyCard missing optional CTA slot
Source: docs/reviews/member-home-20260405.md
Feature: member-home
Added: 2026-04-05
Effort: S
`MemberHomeSectionEmptyCard` accepts only `title` and `body`. The design spec says "with a CTA where applicable." Add an optional `cta?: { label: string; onClick: () => void }` prop to avoid a breaking change when a future empty state needs an inline action.

## TD-002 — MembershipAccessBanner `already-active` variant uses out-of-system blue tokens
Source: docs/reviews/member-home-20260405.md
Feature: member-home
Added: 2026-04-05
Effort: S
`border-blue-500/30 bg-blue-500/10 text-blue-100` are not defined in the design system. Align with an existing semantic token (orange informational or neutral gray) before blue spreads to other components.

## TD-003 — Plan teasers loading flicker in useMemberHomeMembershipSection
Source: docs/reviews/member-home-20260405.md
Feature: member-home
Added: 2026-04-05
Effort: S
At `useMemberHomeMembershipSection.ts:132`, `planTeasersLoading` is set to `true` before the plan fetch effect fires, causing a brief skeleton flash on slow connections. Initialise to `false` and let the effect set it to `true` on first run, or coalesce the two loading states.

## TD-004 — Duplicate INVALID_TIME_ZONE exception handlers in GlobalExceptionHandler
Source: docs/reviews/member-home-20260405.md
Feature: member-home
Added: 2026-04-05
Effort: S
`GlobalExceptionHandler.kt:585-595` has two separate handler methods for `InvalidTimeZoneException` and `MemberHomeInvalidTimeZoneException`, both mapping to `INVALID_TIME_ZONE`. Unify by having `MemberHomeInvalidTimeZoneException` extend the existing exception, or merge into a single handler.

## TD-005 — Dead REFRESH_TOKEN error branches in useAuth login handler
Source: docs/reviews/auth-20260405.md
Feature: auth
Added: 2026-04-05
Effort: S
`useAuth.ts:91-94` handles `REFRESH_TOKEN_EXPIRED` and `REFRESH_TOKEN_INVALID` inside the `login` catch block. The `/auth/login` endpoint never returns these codes — they are only emitted by the Axios refresh interceptor. The dead branches set visible error banners instead of silently redirecting, contradicting the design spec's Flow 3 behaviour. Remove both branches and let the interceptor handle them.

## TD-006 — authStore persists isAuthenticated causing stale-auth flash on reload
Source: docs/reviews/auth-20260405.md
Feature: auth
Added: 2026-04-05
Effort: M
`authStore.ts` persists `isAuthenticated` to localStorage via Zustand's `persist` middleware. On page reload the UI renders the authenticated shell immediately, even if the stored access token has expired. The Axios interceptor recovers, but there is a brief flash of authenticated state. Consider deriving `isAuthenticated` from token presence and expiry at hydration time, or performing a silent refresh on app mount before rendering protected UI.

## TD-007 — Admin seed password plaintext reference in V3 migration comment
Source: docs/reviews/auth-20260405.md
Feature: auth
Added: 2026-04-05
Effort: S
`V3__seed_admin_user.sql` retains the comment "the placeholder value 'Admin@1234'" even though `V5__fix_admin_seed_password.sql` fixed the hash. The SDD (Section 5, db-architect checklist) requires a rotation runbook before any non-local environment is provisioned. Redact the plaintext password reference from the V3 comment and document the bcrypt regeneration procedure in `docs/runbook.md`.

## TD-008 — Benchmark Citation missing from docs/design/auth.md
Source: docs/reviews/auth-20260405.md
Feature: auth
Added: 2026-04-05
Effort: S
The design-standards skill requires a `Benchmark:` citation on every screen design. `docs/design/auth.md` has no such section. Add a citation identifying the reference application and the specific pattern borrowed (e.g. Vercel login card layout) to complete the spec.

## TD-009 — useAuth re-renders on every token rotation due to refreshToken destructure
Source: docs/reviews/auth-20260405.md
Feature: auth
Added: 2026-04-05
Effort: S
`useAuth.ts:61` destructures `refreshToken` from the top-level `useAuthStore()` hook call. Every time the Axios interceptor rotates the refresh token, all `useAuth` subscribers re-render unnecessarily. Read `refreshToken` inside the `logout` callback via `useAuthStore.getState().refreshToken` (same pattern as `LoginPage.tsx:13`) to avoid the subscription.

## TD-010 — Module-level mutable refresh queue in axiosInstance breaks Vite HMR
Source: docs/reviews/auth-20260405.md
Feature: auth
Added: 2026-04-05
Effort: S
`axiosInstance.ts:31-35` uses module-level `isRefreshing` and `pendingRequests` variables. These survive Vite hot-module replacement, causing the pending-request queue to hold stale closures after a hot reload, occasionally manifesting as requests that never resolve in development. Encapsulate the queue state in a closure or a small class that is reset on each interceptor setup.

## TD-011 — Silent-error fallback routes authenticated user to /register
Source: docs/reviews/landing-page-20260405.md
Feature: landing-page
Added: 2026-04-05
Effort: S
`landingActions.ts:66-73`: when membership loading completes silently (no error code set), an authenticated user is routed to `/register`. Most registration flows redirect authenticated users away, which produces a confusing bounce. Consider routing to `/plans` instead, since it is safe for both members and non-members. Requires a product decision before changing the SDD-documented behaviour.

## TD-012 — fetchMyMembership infinite-loop guard relies on invisible empty-string sentinel
Source: docs/reviews/landing-page-20260405.md
Feature: landing-page
Added: 2026-04-05
Effort: S
`LandingPage.tsx:48` guards against re-fetching using `membershipErrorCode === null`. This works because `membershipStore.ts:86` sets `membershipErrorCode` to an empty string `''` (not `null`) on a network failure with no response body. The coupling is invisible — if the store default changes, an infinite fetch loop re-emerges. Add an explanatory comment in `LandingPage.tsx` documenting the dependency, or add an explicit `membershipFetchAttempted: boolean` flag to the store.

## TD-013 — SDD Section 7 resolution matrix omits planAction for membershipLoading row
Source: docs/reviews/landing-page-20260405.md
Feature: landing-page
Added: 2026-04-05
Effort: S
`docs/sdd/landing-page.md` Section 7's resolution matrix documents primary, header, and hero CTAs for every condition but does not specify `planAction` for the `membershipLoading = true` state. The implementation at `landingActions.ts:59` returns a primary-variant `/plans` CTA during loading. Update the matrix with a planAction column or a note for the loading row to keep the SDD complete.

## TD-014 — Plan card hover animation not composite-only on low-end mobile
Source: docs/reviews/landing-page-20260405.md
Feature: landing-page
Added: 2026-04-05
Effort: S
`PlansPreviewSection.tsx:92` applies `hover:-translate-y-1` without `will-change-transform`. On low-end Android devices this can trigger a paint pass rather than a compositor-only animation. Adding Tailwind's `will-change-transform` class promotes each plan card to its own compositing layer, keeping the hover lift smooth under load.

## TD-015 — PLAN-19 uses setTimeout for updatedAt timing
Source: docs/reviews/membership-plans-20260405.md
Feature: membership-plans
Added: 2026-04-05
Effort: S
`membership-plans.spec.ts` PLAN-19 introduces a 1100 ms `setTimeout` to ensure `updatedAt > createdAt`. Replace with a direct string inequality assertion (`putBody.updatedAt !== created.updatedAt`) — no sleep needed — or wrap in a `test.describe` with a `slow()` annotation if the delay is genuinely required for DB timestamp resolution.

## TD-016 — PLAN-22 tests share the same test ID
Source: docs/reviews/membership-plans-20260405.md
Feature: membership-plans
Added: 2026-04-05
Effort: S
Three Playwright tests in `membership-plans.spec.ts` all use the title `'PLAN-22 AC12: PUT with ...'`. Playwright selects by full title; duplicate IDs prevent running a single sub-case by ID. Rename to `PLAN-22a`, `PLAN-22b`, `PLAN-22c` or nest inside a `test.describe('PLAN-22 AC12')` block.

## TD-017 — maxBookingsPerMonth not settable via admin UI or API request
Source: docs/reviews/membership-plans-20260405.md
Feature: membership-plans
Added: 2026-04-05
Effort: M
`MembershipPlanRequest` (Kotlin DTO and TypeScript interface) does not expose `maxBookingsPerMonth`. Admins cannot configure a plan's monthly booking cap at creation or edit time. The field defaults to 0 (unlimited) for all plans. Add the field to `MembershipPlanRequest`, `PlanForm`, and the SDD before the booking-cap enforcement is completed — otherwise all plans will forever have no cap.

## TD-018 — Benchmark Citations missing from docs/design/membership-plans.md
Source: docs/reviews/membership-plans-20260405.md
Feature: membership-plans
Added: 2026-04-05
Effort: S
The design-standards skill requires a Benchmark Citation on every screen design. `docs/design/membership-plans.md` has no `Benchmark:` section for any of its three screens (Plans Catalogue, Plan Detail, Admin Plans Management). Add citations identifying the reference application and the specific pattern borrowed before the next design review cycle.

## TD-019 — AC7 SDD still says 403 for no-JWT callers; Spring returns 401
Source: docs/reviews/membership-plans-20260405.md
Feature: membership-plans
Added: 2026-04-05
Effort: S
`docs/sdd/membership-plans.md` AC7 row states "403 without ADMIN JWT". Spring Security returns 401 for a missing token and 403 for a valid non-admin token. PLAN-24 tests both correctly but without an SDD update. Add a note to the SDD AC7 section acknowledging the 401/403 distinction to prevent future reviewers from flagging the same ambiguity.

## TD-020 — AvailabilityGrid active cells rely on color alone (no text label)
Source: docs/reviews/trainer-discovery-20260405.md
Feature: trainer-discovery
Added: 2026-04-05
Effort: S
Active cells in `AvailabilityGrid.tsx` are empty coloured `<div>` blocks. Color is the sole indicator that a time block is active. This fails WCAG SC 1.4.1. The design spec states cells should show text content; the row labels that provide the textual cue are hidden on small screens. Add a short visible label (single letter or abbreviation) inside each active cell, ensuring the time block is communicated by text and not just background color.

## TD-021 — AvailabilityGrid missing ARIA table role hierarchy
Source: docs/reviews/trainer-discovery-20260405.md
Feature: trainer-discovery
Added: 2026-04-05
Effort: S
`AvailabilityGrid.tsx` uses `role="gridcell"` on cells but the container does not declare `role="grid"` (or `role="table"`), and column headers lack `role="columnheader"` / `scope="col"`. The accessibility spec requires a complete `role="table"` hierarchy with `scope` attributes. Screen readers cannot announce the grid structure correctly without it.

## TD-022 — No scroll-to-top after pagination page change
Source: docs/reviews/trainer-discovery-20260405.md
Feature: trainer-discovery
Added: 2026-04-05
Effort: S
Neither `TrainerListPage.tsx` nor `TrainerFavoritesPage.tsx` calls `window.scrollTo(0, 0)` (or equivalent) when the user clicks Next or Previous. The design spec (Flow 4, step 3) explicitly requires scrolling the grid area back to the top after a page change. Without this, the user lands mid-page after navigating to page 2+. One-line fix on the page-change handlers in both pages.

## TD-023 — getDistinctSpecializations 200-trainer cap is a fragile client-side strategy
Source: docs/reviews/trainer-discovery-20260405.md
Feature: trainer-discovery
Added: 2026-04-05
Effort: M
`getDistinctSpecializations()` in `frontend/src/api/trainerDiscovery.ts` fetches the first 200 trainers sorted A–Z and derives distinct specializations entirely client-side. If the gym grows beyond 200 trainers, specializations from later pages are silently omitted from the filter panel without any warning to the user. The correct fix is a dedicated `GET /api/v1/trainers/specializations` endpoint that queries `SELECT DISTINCT unnest(specialisations) FROM trainers WHERE deleted_at IS NULL` and returns a sorted string array.

## TD-025 — E2e cleanup response omits plan-path membership deletion count
Source: docs/reviews/e2e-cleanup-fk-constraint-20260405.md
Feature: e2e-cleanup
Added: 2026-04-05
Effort: S
`E2eTestSupportService.kt:52-54` calls `userMembershipRepository.deleteAllByPlanIds(planIds)` but discards the return value. The `deletedMemberships` field in `E2eCleanupResponse` only counts memberships removed via the user path. Capture the return value and add it to the counter so the response accurately reports all membership rows removed during a cleanup run.

## TD-026 — deleteAllByPlanIds and deleteAllByUserIds lack method-level @Transactional
Source: docs/reviews/e2e-cleanup-fk-constraint-20260405.md
Feature: e2e-cleanup
Added: 2026-04-05
Effort: S
Both `@Modifying` methods in `UserMembershipRepository` omit `@Transactional` at the method level. They work today only because every caller is already in a service-level transaction. A bare call from a non-transactional context would throw `TransactionRequiredException` at runtime. Add `@Transactional` to both repository methods as a defensive guard, consistent with Spring Data JPA convention for `@Modifying` queries.

## TD-027 — Login redirects USER without active membership to /plans instead of /home
Source: docs/bugs/20260405-205540-login-redirect-user-without-membership.md
Feature: auth
Added: 2026-04-05
Effort: S
`LoginPage.tsx` navigates to `/plans` when the user has no active membership and `/home` when they do. PRD AC 1 requires all USER accounts to land on `/home` unconditionally after login. The current logic breaks AC-01 in `member-home.spec.ts` and affects any first-time user or post-cancellation flow. Fix: always navigate to `/home` for USER role; drop the membership check.

## TD-028 — Post-purchase navigation goes to /home#membership instead of /membership
Source: docs/bugs/20260405-205540-purchase-redirects-to-home-membership-not-membership-page.md
Feature: user-membership-purchase
Added: 2026-04-05
Effort: S
`PurchaseConfirmModal` calls `buildHomeMembershipPath('activated')` which resolves to `/home?membershipBanner=activated#membership`. The E2E specs (MEM-01, MEM-04, MEM-05, MEM-07, MEM-09, MEM-10, MEM-11, MEM-13) all assert `page.toHaveURL('/membership')`. Affects 8 tests. Fix: navigate to `/membership?membershipBanner=activated` after a successful purchase and align `buildHomeMembershipPath` callers accordingly.

## TD-029 — Edit modals render "Save Changes" in edit mode; specs assert entity-specific labels
Source: docs/bugs/20260405-205540-edit-modal-save-button-label.md
Feature: class-schedule
Added: 2026-04-05
Effort: S
`TrainerFormModal`, `RoomFormModal`, and `ClassTemplateFormModal` all render "Save Changes" as the submit button label in edit mode. The E2E specs locate the button via `getByRole('button', { name: 'Save Trainer' / 'Save Room' / 'Save Template' })` — these selectors find nothing in edit mode, blocking 7 tests (AC 3, AC 2, SCH-09 through SCH-11, AC 11, AC 18). Fix: pass the entity-specific label in edit mode, or update the specs to use "Save Changes".

## TD-030 — Schedule page h1 is "Book your next session"; specs assert "Group Classes"
Source: docs/bugs/20260405-205540-schedule-page-heading-mismatch.md
Feature: group-classes-schedule-view
Added: 2026-04-05
Effort: S
`GroupClassesSchedulePage` renders `<h1>Book your next session</h1>`. Four E2E specs (SCHED-02, SCHED-03, SCHED-05, IMG-04) look for `getByRole('heading', { name: 'Group Classes' })` which is absent. Additionally the membership-required state does not render a "Membership required" heading — only an "Activation needed" badge in the toolbar. Fix: align the heading with the spec or update the specs to match the implemented copy.

## TD-031 — Duplicate favorite POST returns 201 instead of 409 ALREADY_FAVORITED
Source: docs/bugs/20260405-205540-td02-duplicate-favorite-returns-201.md
Feature: trainer-discovery
Added: 2026-04-05
Effort: M
`UserTrainerFavorite` uses `@IdClass` with a composite key. Spring Data JPA's `save()` calls `merge()` for non-null IDs, silently succeeding on duplicates. The `existsByUserIdAndTrainerId` pre-check also does not throw. All duplicate POSTs return 201; the DB PK constraint ensures only one row is stored but no error is surfaced. Fix: read the entity by composite key after the existence check, throw `AlreadyFavoritedException` if it exists, and wrap `save()` in a `DataIntegrityViolationException` catch for the race-condition case.

## TD-032 — AC-05 spec: getByText('Active') matches 3 DOM nodes (strict mode violation)
Source: docs/bugs/20260405-205540-member-home-ac05-strict-mode-violation.md
Feature: member-home
Added: 2026-04-05
Effort: S
`member-home.spec.ts` AC-05 uses `page.getByText('Active')` which matches the status badge plus two other elements in strict mode, causing the test to throw. Fix the selector to `page.getByLabel('Status: Active')` or `page.getByTestId('membership-status-badge')` to target the badge uniquely.

## TD-033 — AC-24 spec: activation banner regex matches h1 and banner simultaneously
Source: docs/bugs/20260405-205540-member-home-ac24-strict-mode-banner.md
Feature: member-home
Added: 2026-04-05
Effort: S
`member-home.spec.ts` AC-24 uses `getByText(/activated|welcome|membership active/i)` which matches both the hero `<h1>Welcome back</h1>` and the banner paragraph. Strict mode throws on multiple matches. Narrow the selector to target only the banner element, e.g. `page.getByRole('status').getByText(/membership activated/i)`.

## TD-034 — AC-09 spec: "no active plans" precondition is structurally impossible
Source: docs/bugs/20260405-205540-member-home-ac09-no-plans-state.md
Feature: member-home
Added: 2026-04-05
Effort: M
`member-home.spec.ts` AC-09 expects the membership section to show "No plans available right now" but global-setup unconditionally seeds E2E plans after cleanup. The precondition (zero active plans) can never be satisfied by cleanup alone. Rewrite the test using test-local setup: seed a user with no plans, assert the empty state, then tear down in `afterEach`. Do not rely on global plan absence.

## TD-036 — ProfileChipInput remove icon size deviates from design spec
Source: docs/reviews/user-profile-management-20260406.md
Feature: user-profile-management
Added: 2026-04-06
Effort: S
`ProfileChipInput.tsx` renders the chip remove button's `XMarkIcon` at `h-3.5 w-3.5`. The design spec (`docs/design/user-profile-management.md`) specifies `h-3 w-3`. The deviation is cosmetically minor but breaks pixel-level spec fidelity. Change the icon class to `h-3 w-3` during any future touch of the component.

## TD-037 — E2E profile spec missing coverage for AC8-AC14, AC18, AC19
Source: docs/reviews/user-profile-management-20260406.md
Feature: user-profile-management
Added: 2026-04-06
Effort: M
The gap report identified ACs 8 through 14, 18, and 19 as untested by the E2E suite. The fix branch added tests for AC4, AC17, AC20, AC21, AC15, and AC16, but the remaining ACs (read-only field rejection, individual backend validation error codes, no-arbitrary-userId guard, and `updatedAt` advancement) still have no E2E or integration coverage. Address in a dedicated test sprint targeting `frontend/e2e/user-profile-management.spec.ts` and the backend service tests.

## TD-038 — PROFILE-03 uses waitForTimeout anti-pattern
Source: docs/reviews/user-profile-management-20260406.md
Feature: user-profile-management
Added: 2026-04-06
Effort: S
`user-profile-management.spec.ts` PROFILE-03 calls `page.waitForTimeout(250)` to confirm no PUT request was fired after a validation failure. The `waitForTimeout` API is a Playwright anti-pattern that adds unconditional latency and is brittle under load. Replace with a route-interception flag checked immediately after the button click (the interception callback already populates `putAttempted`), or use `expect.poll` with a short deadline.

## TD-035 — IMG-01 spec: waitForEvent('dialog') may never fire if remove button uses React modal
Source: docs/bugs/20260405-205540-img01-remove-photo-native-dialog.md
Feature: entity-image-management
Added: 2026-04-05
Effort: S
`entity-image-management.spec.ts` IMG-01 calls `page.waitForEvent('dialog')` before clicking Remove. If the remove confirmation uses a custom React modal rather than `window.confirm()`, no native dialog event fires and the test hangs for 30 s. Investigate whether the implementation uses a native `confirm()` or a React modal; if the latter, replace the dialog event listener with a `getByRole('dialog')` assertion targeting the custom modal.

## TD-024 — SDD Section 2 sample JSON still shows "page" field, contradicts Section 7
Source: docs/reviews/trainer-discovery-20260405.md
Feature: trainer-discovery
Added: 2026-04-05
Effort: S
The sample response JSON in SDD Section 2 (`GET /api/v1/trainers`) uses `"page": 0`, but Section 7 documents that the actual API field name is `"number": 0` (Spring Data's native serialization). The two sections now contradict each other within the same document. Update the Section 2 sample JSON to use `"number"` to match Section 7 and the actual API behavior.
