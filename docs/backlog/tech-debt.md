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

## TD-039 — No E2E coverage for user-access-flow ACs (login redirect, nav, plans gate)
Source: docs/reviews/user-access-flow-20260409.md
Feature: user-access-flow
Added: 2026-04-09
Effort: M
No `user-access-flow.spec.ts` file exists. Fixed ACs (AC-1 login redirect to `/home`, AC-13 `My Favorites` unconditional, AC-4 membership section first, AC-14 active-member `/plans` redirect) have zero E2E regression coverage. Any future change to `LoginPage.tsx` or `Navbar.tsx` can silently re-introduce the reported bugs. Create `frontend/e2e/user-access-flow.spec.ts` covering at minimum: authenticated USER login form submit → URL is `/home`; authenticated nav does not contain a `Plans` link; `My Favorites` is present for a user with no active membership; active-member navigating to `/plans` is redirected to `/home?membershipBanner=already-active`.

## TD-040 — Mobile bottom navigation bar not implemented (design spec requirement)
Source: docs/reviews/user-access-flow-20260409.md
Feature: user-access-flow
Added: 2026-04-09
Effort: M
The design spec (Screen: Authenticated App Shell > Mobile shell) requires a sticky bottom navigation bar with five destinations for mobile viewports. `Navbar.tsx` provides a hamburger-triggered mobile drawer instead. The five-destination bottom bar is the spec-mandated pattern for the authenticated USER shell on mobile and is absent from the current implementation. This was pre-existing before this fix branch; address in a dedicated mobile-nav sprint.

## TD-041 — `QuickActionsPanel` and `MemberHomeHero` position undocumented in SDD
Source: docs/reviews/user-access-flow-20260409.md
Feature: user-access-flow
Added: 2026-04-09
Effort: S
`QuickActionsPanel` renders between `MemberHomeHero` and `TrainerPreviewCarousel` on `/home`. Neither its existence, its content, nor its position relative to the membership section is described in `docs/sdd/user-access-flow.md` or `docs/design/user-access-flow.md`. `MemberHomeHero`'s post-membership ordering is also undocumented in the SDD. Add a paragraph to SDD §4 (MemberHomePage) specifying the render order and each component's purpose so the layout is not implicit.

## TD-042 — Stale "Ensure Flyway migrations have run" guard messages in seeder.ts
Source: docs/reviews/seeding-consolidation-20260413.md
Feature: seeding-consolidation
Added: 2026-04-13
Effort: S
`demo-seeder/src/seeder.ts` lines 376 and 380 display "Ensure Flyway migrations have run" when `class_templates` or `trainers` are empty after `loadReferenceData()`. Since `seedReferenceData()` now runs unconditionally before this check, the message is misleading — a Flyway migration is no longer the source of that data. Replace the message with "Ensure `seedReferenceData()` completed successfully" so ops engineers diagnose against the correct code path.

## TD-043 — V13 class templates receive a new UUID on each fresh-seed run
Source: docs/reviews/seeding-consolidation-20260413.md
Feature: seeding-consolidation
Added: 2026-04-13
Effort: S
`referenceSeeder.ts` calls `gen_random_uuid()` as the `id` for V13 class templates on every INSERT attempt. On a re-run the `ON CONFLICT (name)` branch fires and discards the new UUID, so idempotence holds on existing rows. But if a V13 template row is manually deleted and the seeder re-runs, the row will be created with a new UUID, silently invalidating any class instances that referenced the old UUID. Either persist fixed UUIDs for the five V13 templates in the data file, or document this edge case explicitly in `docs/sdd/seeding-consolidation.md` §2.1.

## TD-044 — `seedReferenceData()` has no outer transaction; partial failures leave a partially-seeded DB
Source: docs/reviews/seeding-consolidation-20260413.md
Feature: seeding-consolidation
Added: 2026-04-13
Effort: M
`referenceSeeder.ts` acquires a separate connection per entity type (rooms, templates, trainers, plans, users). A failure mid-way (e.g., plans succeed but QA users throw) leaves the demo DB in a partially-seeded state with no rollback path. All six entity upserts are idempotent, so a re-run will recover, but the partial state can cause unexpected behaviour in a generation run that starts immediately after. Wrapping the six upsert calls in a single shared transaction would make `seedReferenceData()` atomic and simplify debugging.

## TD-024 — SDD Section 2 sample JSON still shows "page" field, contradicts Section 7
Source: docs/reviews/trainer-discovery-20260405.md
Feature: trainer-discovery
Added: 2026-04-05
Effort: S
The sample response JSON in SDD Section 2 (`GET /api/v1/trainers`) uses `"page": 0`, but Section 7 documents that the actual API field name is `"number": 0` (Spring Data's native serialization). The two sections now contradict each other within the same document. Update the Section 2 sample JSON to use `"number"` to match Section 7 and the actual API behavior.

## TD-045 — Warning banner generate-lock condition excludes zero-user partial seeds
Source: docs/reviews/seeder-presets-20260413.md
Feature: seeder-presets
Added: 2026-04-13
Effort: S
`public/index.html:181` disables the Generate button when `state.hasData && state.demoUsers > 0`. If a generation run seeds reference data but crashes before registering any demo users, `hasData` becomes true while `demoUsers` stays 0 — the button remains visually enabled even though the server-side 409 lock is active. The user can click Generate and will receive a confusing 409 error banner instead of a pre-emptive visual block. Change the condition to `if (state.hasData)` to match SDD §5 exactly.

## TD-046 — Rooms DELETE in cleanup.ts has no safety-net for non-seeded-template class instances
Source: docs/reviews/seeder-presets-20260413.md
Feature: seeder-presets
Added: 2026-04-13
Effort: S
`cleanup.ts` step 5 deletes class instances by seeded template ID. Class instances that reference a seeded room but a non-seeded template are not caught by this step. If such rows exist, the rooms DELETE at step 10 will fail with an FK constraint violation and roll back the entire cleanup transaction, leaving a partially-deleted database. Add a safety-net DELETE before step 10: `DELETE FROM class_instances WHERE room_id = ANY(SELECT id FROM rooms WHERE name = ANY($1))` using the `SEEDED_ROOM_NAMES` array.

## TD-047 — upsertClassTemplatesV13 count argument is a magic literal
Source: docs/reviews/seeder-presets-20260413.md
Feature: seeder-presets
Added: 2026-04-13
Effort: S
`referenceSeeder.ts:291` calls `upsertClassTemplatesV13(5)` with a hardcoded `5`. The value is correct (V13 always seeds in full) but the literal is an invisible coupling to the length of `V13_CLASS_TEMPLATES`. A future developer extending the V13 array would not see this call site as needing an update. Replace with `V13_CLASS_TEMPLATES.length` or a named constant `V13_TEMPLATE_COUNT` to make the invariant self-documenting.

## TD-048 — MyBookingsPage fetches all bookings client-side with size=100
Source: docs/reviews/class-booking-20260418.md
Feature: class-booking
Added: 2026-04-18
Effort: M
`MyBookingsPage.tsx:37` calls `fetchMyBookings({ page: 0, size: 100 })` and performs grouping and status filtering entirely in memory. For members with large booking histories this will grow unbounded and degrade on slow connections. Switch to server-side pagination: two separate `GET /api/v1/bookings/me` calls with `status=CONFIRMED` (sorted asc) and `status=CANCELLED` (sorted desc), each with a small page size and a `< Prev / Next >` control per section.

## TD-049 — formatDateTime duplicated across AdminUserBookingHistoryPanel and AdminAttendeeListPanel
Source: docs/reviews/class-booking-20260418.md
Feature: class-booking
Added: 2026-04-18
Effort: S
`formatDateTime` is defined identically in both `frontend/src/components/admin/AdminUserBookingHistoryPanel.tsx` and `frontend/src/components/scheduler/AdminAttendeeListPanel.tsx`. Extract to `frontend/src/utils/scheduleFormatters.ts` (or a new `adminFormatters.ts`) to ensure the two admin surfaces stay in sync and to avoid a silent divergence if one is ever updated.

## TD-050 — AdminAttendeeListPanel status parameter comment missing
Source: docs/reviews/class-booking-20260418.md
Feature: class-booking
Added: 2026-04-18
Effort: S
`AdminAttendeeListPanel.tsx:11` hard-codes `status: 'CONFIRMED'`, which is correct per SDD scope but is invisible to maintainers. Add a brief inline comment — "SDD §2: admin attendee list defaults to CONFIRMED only; filter control is out of scope for this delivery" — to prevent a future developer from treating the hard-coded value as an accidental omission.

## TD-051 — MyBookingsDrawer empty state is missing illustration and helper copy
Source: docs/reviews/class-booking-20260418.md
Feature: class-booking
Added: 2026-04-18
Effort: S
`MyBookingsDrawer.tsx` renders a plain `No bookings yet.` text row for the empty state. The design spec (spec.md §MyBookingsDrawer states) requires a `CalendarIcon h-8 w-8 text-gray-600` illustration and the helper line `Book a class from the schedule above.`. Add the icon and helper text to match the spec's delight-quality empty state.

## TD-052 — getClassAttendees over-fetches via findWithDetailsById
Source: docs/reviews/class-booking-20260418.md
Feature: class-booking
Added: 2026-04-18
Effort: S
`BookingService.kt:163` resolves the class instance via `classInstanceRepository.findWithDetailsById(classId)` to populate the attendee list summary header, but only `id`, `name`, `scheduledAt`, and `capacity` are consumed. The join-fetch pulls trainer and room data on every admin attendee list open. Introduce a lighter projection query (or a dedicated `findSummaryById`) returning just the four fields used for the header.

## TD-053 — Home feed events not filtered to club kinds client-side
Source: docs/reviews/home-page-redesign-2026-04-18.md
Feature: home-page-redesign
Added: 2026-04-18
Effort: S
`useHomePage.ts` passes all SSE events directly to `ActivityFeed` without filtering to `kind === "booking" | "class"`. PRD AC 14 and SDD §2 require the home feed to show only class-level events. If the backend ever emits `checkin` or `pr` events on the authenticated stream, personal member names will appear in the club feed. Add `.filter(e => e.kind === 'booking' || e.kind === 'class')` when updating `feedEvents` state.

## TD-054 — CancelBookingDialog missing complete focus trap
Source: docs/reviews/home-page-redesign-2026-04-18.md
Feature: home-page-redesign
Added: 2026-04-18
Effort: S
`CancelBookingDialog.tsx` calls `dialogRef.current?.focus()` once on mount but does not prevent Tab/Shift-Tab from escaping the dialog to background content. WCAG 2.4.3 requires a complete focus trap for modal dialogs. Wire a focus-trap utility (e.g. `focus-trap-react` or a small tabbable-elements query on keydown) to keep keyboard focus inside the dialog while it is open.

## TD-055 — HomeHeroNoBoked function name typo
Source: docs/reviews/home-page-redesign-2026-04-18.md
Feature: home-page-redesign
Added: 2026-04-18
Effort: S
`HomeHero.tsx` exports an internal function named `HomeHeroNoBoked` — "Boked" is misspelled. Rename to `HomeHeroNoBooked` to match the component's purpose and prevent IDE confusion.

## TD-056 — useHomePage fetches size=10 bookings when size=4 suffices
Source: docs/reviews/home-page-redesign-2026-04-18.md
Feature: home-page-redesign
Added: 2026-04-18
Effort: S
`useHomePage.ts:102` requests `size: 10` confirmed bookings but only the first 4 are retained (3 for display, 1 as buffer for the post-cancel next-up scenario). Reduce to `size: 4` to minimise payload per SDD §2 note on upcoming bookings fetch.

## TD-057 — MembershipSection unlimited detection uses 0 instead of null
Source: docs/reviews/home-page-redesign-2026-04-18.md
Feature: home-page-redesign
Added: 2026-04-18
Effort: S
`MembershipSection.tsx:64` sets `isUnlimited = bookingsMax === 0`. The SDD and PRD define unlimited as `bookingsMax === null`. The Zustand store initialises `bookingsMax` to `0` when `activeMembership?.maxBookingsPerMonth` is absent, making any plan with an actual cap of 0 incorrectly show "Unlimited". Align by passing `bookingsMax: number | null` from the hook (returning `null` when the field is falsy), and testing `isUnlimited = bookingsMax === null`.

## TD-058 — ICS download missing DESCRIPTION field
Source: docs/reviews/home-page-redesign-2026-04-18.md
Feature: home-page-redesign
Added: 2026-04-18
Effort: S
`HomeHero.tsx` generates a `.ics` file without a `DESCRIPTION` line. SDD §2 specifies `DESCRIPTION = "with {trainer.name} · {studio}"`. Once the studio data-gap blocker is resolved (studio added to `BookingResponse`), add a `DESCRIPTION:with {trainerName} · {studio}` line to the ICS string array.

## TD-059 — No-booked hero is a bespoke variant instead of the shared HeroNoBooked component
Source: docs/reviews/home-page-redesign-2026-04-18.md
Feature: home-page-redesign
Added: 2026-04-18
Effort: M
`HomeHero.tsx` renders an inline `HomeHeroNoBoked` component instead of importing `HeroNoBooked` from `components/landing/`. SDD §4 and PRD AC 4 both require reusing the shared component. Diverging variants will drift visually over time. Refactor: import `HeroNoBooked` from `../../components/landing/HeroNoBooked`, wire `nextOpenClass` from `viewer-state.nextOpenClass`, and delete the inline variant.

## TD-060 — BigCountdown digit color deviates from handoff (green vs white)
Source: docs/reviews/home-page-redesign-2026-04-18.md
Feature: home-page-redesign
Added: 2026-04-18
Effort: S
`BigCountdown.tsx:16` hard-codes `text-[#4ADE80]` (primary-light green) for the countdown digits. The handoff prototype (`home_sections.jsx`) renders digits in white (inherited page default) with muted separators and unit labels. The green-digit treatment is energetic but diverges from the spec. Get explicit design sign-off on the green digits; if not approved, change to `text-white`.

## TD-061 — listPtTrainers computes availability for every trainer on every request
Source: docs/reviews/personal-training-booking-2026-04-18.md
Feature: personal-training-booking
Added: 2026-04-18
Effort: M
`PtBookingService.listPtTrainers` runs the full 14-day availability algorithm for each trainer on every `GET /api/v1/trainers/pt` call. For a gym with many trainers this is O(n × 14 × 16) slot evaluations per request. SDD §4 documents this as a future materialized-view candidate. Add a scheduled job or on-demand cache (Redis or DB) that pre-computes `nextOpenAt` and `weekOpenCount` per trainer once per hour so the trainer-list endpoint is a single fast query.

## TD-062 — SlotPicker isoDateTime constructs local time, silently breaks for non-UTC users
Source: docs/reviews/personal-training-booking-2026-04-18.md
Feature: personal-training-booking
Added: 2026-04-18
Effort: M
`SlotPicker.tsx:28-30` calls `new Date(\`\${dateStr}T\${hour}:00:00\`)` (no timezone suffix), which parses as local browser time. `.toISOString()` then converts to UTC. For a user in UTC+3 booking the 9am slot, the server receives `06:00Z`, which is outside the 6am gym-open UTC boundary and fails validation. Requires a decision on the time-zone model (SDD §8 defers this). At minimum, add a code comment documenting the assumption so the bug is visible. Full fix: construct the datetime string with an explicit `+00:00` suffix if the server always operates in UTC, or resolve the member's club time zone from the server and apply it during construction.

## TD-063 — TrainerSchedule has no empty state when both ptSessions and groupClasses are empty
Source: docs/reviews/personal-training-booking-2026-04-18.md
Feature: personal-training-booking
Added: 2026-04-18
Effort: S
`TrainerSchedule.tsx` renders stat tiles (all zeros) and then nothing when both session arrays are empty. The design-standards skill requires a quality empty state for every screen. Add a "No sessions this week" message (with a calendar icon or brief copy) below the stat tiles so a trainer with no upcoming schedule sees clear feedback rather than empty space.

## TD-064 — AdminPtSessions missing Trainer filter SelectPill
Source: docs/reviews/personal-training-booking-2026-04-18.md
Feature: personal-training-booking
Added: 2026-04-18
Effort: S
`AdminPtSessions.tsx` filter bar implements only the Status SelectPill. The handoff spec specifies a second Trainer SelectPill populated from the trainer list. The backend `GET /api/v1/admin/pt-sessions?trainerId=` param is already implemented. Add a trainer `<select>` populated from `GET /api/v1/trainers/pt?size=200` (or a dedicated lightweight endpoint) to complete the filter bar per spec.

## TD-065 — SlotPicker fragment in hour-row loop missing key prop
Source: docs/reviews/personal-training-booking-2026-04-18.md
Feature: personal-training-booking
Added: 2026-04-18
Effort: S
`SlotPicker.tsx:246` renders hour rows using `<>…</>` fragments inside a `.map()` without a `key` prop on the fragment. React will log a key-warning for each row. Replace `<>` with `<React.Fragment key={hour}>` to silence the warning and avoid potential reconciliation issues if hours change.

## TD-066 — ConfirmBookingModal does not return focus to triggering slot button on close
Source: docs/reviews/personal-training-booking-2026-04-18.md
Feature: personal-training-booking
Added: 2026-04-18
Effort: S
The handoff accessibility spec says "return focus to the slot button on close." `ConfirmBookingModal.tsx` focuses `focusable[0]` (the "Not yet" button) on open but does not restore focus to the calendar slot button that triggered the modal. A keyboard user loses their position in the availability grid when the modal closes. Accept an optional `triggerRef?: React.RefObject<HTMLElement>` prop in the modal and call `triggerRef.current?.focus()` on close.

## TD-067 — PtBookingServiceTest missing coverage for MEMBERSHIP_REQUIRED path
Source: docs/reviews/personal-training-booking-2026-04-18.md
Feature: personal-training-booking
Added: 2026-04-18
Effort: S
`PtBookingServiceTest` covers 8 paths but has no test for the `MEMBERSHIP_REQUIRED` (403) branch in `createBooking`. Add a test that mocks an inactive membership state and asserts `MembershipRequiredException` is thrown and `ptBookingRepository.save` is never called.

## TD-068 — computeResumeStep skips membership/preferences steps on profile-complete resume
Source: docs/reviews/onboarding-flow-20260419.md
Feature: onboarding-flow
Added: 2026-04-19
Effort: S
`OnboardingPage.tsx:computeResumeStep` returns `'terms'` once profile fields are present, jumping over the Membership and Booking steps. The SDD §4.4 resume computation specifies landing at `'membership'` when the profile is complete. A returning user whose last session ended at the Membership step is dropped to Final Check, bypassing plan selection. Align the function with the SDD so `'membership'` is returned when profile is complete and terms are not yet agreed.

## TD-069 — Onboarding store per-user isolation does not work due to static `name` evaluation
Source: docs/reviews/onboarding-flow-20260419.md
Feature: onboarding-flow
Added: 2026-04-19
Effort: M
`onboardingStore.ts:getStoreName()` calls `useAuthStore.getState()` at module evaluation time. The Zustand `persist` middleware reads the `name` option once on store creation; the result is almost always `'gf:onboarding:v1:anonymous'` because auth has not hydrated from localStorage yet at that point. Multiple users sharing a browser therefore share the same onboarding draft. Fix: use Zustand's `persist` `name` as a function (if supported) or re-create/rehydrate the store when the authenticated user ID changes.

## TD-070 — OnboardingService.completeOnboarding findById uses opaque PK semantics
Source: docs/reviews/onboarding-flow-20260419.md
Feature: onboarding-flow
Added: 2026-04-19
Effort: S
`OnboardingService.kt:51` calls `userProfileRepository.findById(userId)` where `userId` is the `@Id` field of `UserProfile`. Because the entity uses `user_id` as both FK and PK, the call is correct but non-obvious to future maintainers who may expect a `findByUserId` method. Add an inline comment (`// UserProfile PK is user_id — findById(userId) is correct`) to prevent future confusion and accidental refactoring.

## TD-071 — "Most popular" badge on membership step determined by price rather than spec-designated plan
Source: docs/reviews/onboarding-flow-20260419.md
Feature: onboarding-flow
Added: 2026-04-19
Effort: S
`StepMembership.tsx:26-30` assigns the "Most popular" badge to the most expensive plan. The handoff spec designates the Quarterly (mid-tier) plan as Most Popular. If a higher-priced annual or premium plan is added, the badge migrates automatically and misleads users. Resolve by adding a `featured: boolean` field to `MembershipPlan` (or using plan rank/position), or pin to the middle plan in the sorted list.

## TD-072 — Custom checkbox in StepTerms uses button+role="checkbox" instead of native input
Source: docs/reviews/onboarding-flow-20260419.md
Feature: onboarding-flow
Added: 2026-04-19
Effort: S
`StepTerms.tsx:156-165` implements the checkbox as `<button role="checkbox">` with a `<label htmlFor>` pointing to it. In several browsers `<label for>` does not trigger a `<button>` element's click handler, causing label-click to silently fail. Replace with a visually hidden `<input type="checkbox" id={id}>` and a custom indicator div as its adjacent sibling so native label association works correctly for all users including keyboard and assistive-technology users.

## TD-073 — MiniNav step label not abbreviated; deviates from handoff eyebrow spec
Source: docs/reviews/onboarding-flow-20260419.md
Feature: onboarding-flow
Added: 2026-04-19
Effort: S
`MiniNav.tsx:41` emits `STEP 02 · YOUR PROFILE · 2 of 6`. The handoff specifies `STEP 03 · PREFS` (abbreviated label) with the fraction in a separate muted tone. The current output is verbose and does not match the spec's visual rhythm. Either abbreviate step labels in `ALL_STEPS` definitions, or extract the fraction into a muted `<span>` and shorten the label portion to match the compact handoff format.

## TD-074 — Onboarding store should use session-scoped draft storage, not user-keyed localStorage
Source: docs/reviews/onboarding-flow-fixes-20260419.md
Feature: onboarding-flow
Added: 2026-04-19
Effort: M
`onboardingStore.ts` persists the entire onboarding draft to `localStorage` keyed by user ID. If a user logs out and another logs in during the same browser session, the store still carries the prior user's data until the key is re-evaluated (which it is not — the name is fixed at creation time). A safer model is to persist only to `sessionStorage` (cleared on tab close / logout), or to explicitly call `store.reset()` in the logout action and re-initialize the store from the server on next mount. Either eliminates the cross-user data risk entirely.

## TD-075 — `setTimeout` race in OnboardingShell should be replaced with structural fix
Source: docs/reviews/onboarding-flow-fixes-20260419.md
Feature: onboarding-flow
Added: 2026-04-19
Effort: S
`OnboardingShell.tsx:134` uses `setTimeout(() => setOnboardingCompletedAt(ts), 0)` to delay the auth store update so the Done screen can mount before `OnboardingRoute` triggers a redirect. This is not guaranteed under React 18 concurrent mode. The structural fix is to add a `currentStep === 'done'` bypass to `OnboardingRoute` (reading the onboarding store), so the route does not redirect when the user is legitimately on the Done screen regardless of `onboardingCompletedAt`. This makes the timing hack unnecessary and the behaviour predictable.

## TD-076 — Focus ring on profile inputs uses Tailwind ring, not box-shadow glow per handoff spec
Source: docs/reviews/onboarding-flow-fixes-20260419.md
Feature: onboarding-flow
Added: 2026-04-19
Effort: S
`StepProfile.tsx:115` applies `focus:ring-2 focus:ring-green-500/25` which produces a Tailwind ring (outline shorthand). The handoff §Interactions specifies `box-shadow: 0 0 0 3px rgba(34,197,94,.25)` — a glow shadow that is more visible on dark surfaces. Replace with `focus-visible:shadow-[0_0_0_3px_rgba(34,197,94,.25)] focus-visible:outline-none` across all form inputs in the onboarding flow.

## TD-077 — Booking and plan error messages lack icon prefix; violates design system voice rule
Source: docs/reviews/onboarding-flow-fixes-20260419.md
Feature: onboarding-flow
Added: 2026-04-19
Effort: S
`StepBooking.tsx:81` and `StepMembership.tsx:92` render error messages as plain coloured text. The design system README states errors must have a visible label and icon (not rely on colour alone). Add `ExclamationCircleIcon` from `@heroicons/react/24/solid` as a prefix to all inline error paragraphs in these components.

## TD-078 — TrainerList selected indicator uses Unicode checkmark instead of Heroicon
Source: docs/reviews/onboarding-flow-fixes-20260419.md
Feature: onboarding-flow
Added: 2026-04-19
Effort: S
`TrainerList.tsx:100` renders `✓ Selected` using the Unicode U+2713 character. The design system README prohibits all Unicode-as-icons: "Unicode as icons: Never." Replace with `CheckIcon` from `@heroicons/react/24/solid` at `h-3.5 w-3.5` inline with the "Selected" text label.

## TD-079 — GroupClassList and TrainerList use plain-text loading states; should use skeleton loaders
Source: docs/reviews/onboarding-flow-fixes-20260419.md
Feature: onboarding-flow
Added: 2026-04-19
Effort: M
`GroupClassList.tsx:28` and `TrainerList.tsx:50` render "Loading classes…" / "Loading trainers…" as muted text. The design-standards skill requires a delight detail on every screen, and the Peloton/Whoop quality bar expects skeleton loaders for list content. Replace the text placeholders with `animate-pulse` skeleton rows (a `rounded-xl bg-gray-800 h-[72px]` bar per slot, 4–6 bars) to match the visual polish of the rest of the flow.
