# Audit Gap Report: group-classes-scheduler-view

Date: 2026-04-06
Auditor: QA (tester agent) — initial
Reviewer: Domain/design/convention validation pass — 2026-04-06
PRD: `docs/prd/group-classes-schedule-view.md`
SDD: `docs/sdd/group-classes-schedule-view.md`
Design: `docs/design/group-classes-schedule-view.md`
Spec: `frontend/e2e/group-classes-schedule-view.spec.ts`

> **Reviewer notes on the initial report:**
> The finding that "List view subtitle badge renders 'Rolling list', not 'Upcoming 14 days'" is **incorrect** and has been removed. The badge rendering "Rolling list" lives in the page header (`GroupClassesSchedulePage.tsx:655`) and is view-context metadata, not the list section heading. `GroupScheduleRollingList.tsx:36` correctly renders `<h2>Upcoming 14 days</h2>`, which matches both the design spec and the SCHED-02 E2E assertion at line 277. That assertion would pass if it were reached. The initial summary miscounted partial ACs as a result; corrected below.

---

## Domain Rule Violations (new findings)

### D-01 — Backend membership gate is never enforced; endpoint returns 200 for non-members

**File:** `backend/src/main/kotlin/com/gymflow/service/UserClassScheduleService.kt:40–41, 108–111`

The SDD defines a hard 404 response with code `NO_ACTIVE_MEMBERSHIP` when the caller has no active membership (`docs/sdd/group-classes-schedule-view.md`, section 2, error table). The `GlobalExceptionHandler` is wired to map `NoActiveMembershipException` to that response. The service checks membership on line 40 (`findAccessibleActiveMembership`) but does NOT throw — it stores the boolean and returns HTTP 200 with `hasActiveMembership: false` alongside the full schedule payload.

The gymflow-domain rule is: "A user must have an ACTIVE membership to [access member-gated data]." This endpoint returns schedule entries to users without any membership.

**What it should be:** After the membership check, if `findAccessibleActiveMembership` returns null, throw `NoActiveMembershipException`. This causes the existing `GlobalExceptionHandler` to return `404 NO_ACTIVE_MEMBERSHIP`, which is the specified contract. The frontend already handles this error code via `INVALID_QUERY_CODES`-style logic — it needs to map `NO_ACTIVE_MEMBERSHIP` to the membership-required UI state instead of relying on a 200 payload field.

---

### D-02 — Frontend never renders the membership-required gate; AC3 and AC20 are broken end-to-end

**File:** `frontend/src/pages/schedule/GroupClassesSchedulePage.tsx` (entire file); `frontend/src/components/schedule/` (no `MembershipRequiredState` component exists)

The design spec defines a full-page `MembershipRequiredState` component (`docs/design/group-classes-schedule-view.md`, `MembershipRequiredState` section) with heading `Membership required`, body copy, and a `Browse plans` CTA. No such component is rendered in `GroupClassesSchedulePage`. The page only shows a badge saying "Activation needed" in the header while still displaying the full schedule UI and booking controls.

This is the root cause of SCHED-03. It is an access-control failure: AC3 and AC20 from the PRD cannot pass while the backend (D-01) returns 200 and the frontend has no gate.

**What it should be:** When `schedule.hasActiveMembership === false` (or, after D-01 is fixed, when the error code is `NO_ACTIVE_MEMBERSHIP`), the schedule content body must be replaced by a `MembershipRequiredState` component matching the design spec. The sticky toolbar should not render in this state.

---

### D-03 — PRD AC21 violated: the page is NOT read-only

**Files:**
- `frontend/src/pages/schedule/GroupClassesSchedulePage.tsx` — imports and renders `BookingConfirmModal`, `CancelBookingModal`, `MyBookingsDrawer`, `BookingSummaryBar`, `BookingToast`
- `frontend/src/components/schedule/GroupScheduleEntryCard.tsx`, `GroupScheduleWeekGrid.tsx`, `GroupScheduleDayAgenda.tsx`, `GroupScheduleRollingList.tsx` — all accept `onBookEntry`, `onCancelEntry`, and `onBrowsePlans` props

PRD AC21: "The Group Classes Schedule View is read-only in this version; it must not provide actions to book, cancel, join a waitlist, contact a trainer, or modify the class schedule."

The implementation wires live booking and cancellation flows (confirm modal, cancel modal, booking drawer, toasts, and optimistic UI patches) directly into this page. Booking actions call `POST /api/v1/bookings`; cancellations call the booking cancellation endpoint. These are out-of-scope for this version per the PRD.

The SDD also states this is intentionally read-only: "This feature is intentionally read-only." The DTO additions (`capacity`, `confirmedBookings`, `remainingSpots`, `bookingAllowed`, `bookingDeniedReason`, `cancellationAllowed`, `currentUserBooking`, `classPhotoUrl`) all exist to support the booking flow that was not yet specified for this version.

**Impact:** AC21 fails. The `UserClassScheduleEntryResponse` DTO leaks booking-state fields (`bookingAllowed`, `bookingDeniedReason`, `cancellationAllowed`, `currentUserBooking`) that the SDD explicitly said must not appear. The service also calls `bookingService.countConfirmedBookings` and `bookingService.findConfirmedBookingsByUserAndClassIds` inside a supposedly read-only schedule fetch, adding N-query overhead.

**What it should be:** Either (a) scope is formally expanded to include booking from the schedule view and the PRD/SDD are updated accordingly, or (b) the booking UI is removed from this page and the DTO trimmed to the SDD-specified fields (`id`, `name`, `scheduledAt`, `localDate`, `durationMin`, `trainerNames`). This is a product decision before any code change.

> **Escalation note:** D-03 requires understanding of D-01, D-02, the booking feature SDD, and the schedule SDD to diagnose correctly. It suggests the schedule-view SDD was superseded by scope expansion that was not documented. Recommend solution-architect review before any fix is attempted. A brief has been written to `docs/bugs/20260406-escalation-group-classes-schedule-view.md`.

---

## Design Standard Violations (new findings)

### DS-01 — Design spec has no benchmark citation

**File:** `docs/design/group-classes-schedule-view.md`

The design-standards skill requires: "Every screen design must include a Benchmark Citation. No benchmark = incomplete design."

The design spec has no `Benchmark:` entry anywhere. Per the standard format:
```
Benchmark: [App name] — [what pattern is borrowed and why]
```

**What it should be:** A benchmark citation added to the design spec before the design is considered complete. Peloton's class card or Whoop's schedule grid are candidate references.

---

### DS-02 — Page heading in implementation diverges from design spec

**File:** `frontend/src/pages/schedule/GroupClassesSchedulePage.tsx:642` vs `docs/design/group-classes-schedule-view.md:50`

Design spec states: `Heading: Group Classes`. Implementation renders `<h1>Book your next session</h1>` in a custom `Barlow Condensed` bold uppercase style. The spec also states a supporting subheading `Browse the live programme included with your membership.`; the implementation renders `Browse the live programme, reserve open spots, and keep your weekly training plan in one focused view.`

This drives SCHED-02's failure at line 264 of the E2E spec (`getByRole('heading', { name: 'Group Classes' })`).

**Product decision needed:** Either the spec should be updated to `Book your next session`, or the implementation heading should be corrected to `Group Classes`. The subheading divergence should be reconciled at the same time. The correct heading also depends on the outcome of D-03: if booking is in scope, "Book your next session" is coherent; if the page is read-only, "Group Classes" is more accurate.

---

## SDD Compliance Gap (new findings)

### S-01 — Migration file number diverges from SDD

**File:** `docs/sdd/group-classes-schedule-view.md:29, 176` vs actual file `backend/src/main/resources/db/migration/V18__add_class_instance_status_for_member_schedule.sql`

The SDD specifies `V15__add_class_instance_status_for_member_schedule.sql`. The actual applied migration is `V18__`. This is a documentation drift only — the migration itself was applied correctly (V15 was already taken by trainer discovery columns). The SDD should be corrected to `V18__` so future developers do not chase a non-existent V15 file.

**What it should be:** Update the SDD migration reference from `V15` to `V18` in both the DDL block header and the file table.

---

## Missing Test Coverage

| AC | Description | Status |
|----|-------------|--------|
| AC1 | Schedule is only inside the authenticated portal; not exposed as a public feature | Covered (SCHED-01 verifies unauthenticated redirect to login; passes) |
| AC2 | Authenticated USER with ACTIVE membership can open the view and see schedule data | Partial (SCHED-02 covers this path but FAILS — heading assertion `"Group Classes"` does not match actual heading `"Book your next session"`; see DS-02) |
| AC3 | Authenticated USER without ACTIVE membership sees membership-required state with path to purchase | Partial (SCHED-03 covers this path but FAILS — the app renders the full schedule UI instead of a membership gate; see D-01 and D-02) |
| AC4 | Unauthenticated visitor must sign in before any schedule data is shown | Covered (SCHED-01 passes) |
| AC5 | Schedule uses admin Scheduler as source of truth; no duplicate entry required | Missing — no spec verifies that a class created via admin API appears in the member schedule view |
| AC6 | Default state on first load is current calendar week in Week view | Missing — no spec navigates to /schedule without query params and asserts Week view is selected |
| AC7 | Week view displays Mon–Sun week with classes under correct day and start time | Partial (SCHED-02 seeds a class and asserts it is visible, but the test fails before this assertion is reached) |
| AC8 | Day view displays classes for one selected calendar date only | Partial (SCHED-02 switches to Day view and checks URL; test fails before reaching this) |
| AC9 | List view shows rolling 14-day window anchored to selected date | Partial (SCHED-02 switches to List view and asserts `"Upcoming 14 days"` text at line 277; this assertion is correct — `GroupScheduleRollingList` renders that heading — but the test fails before reaching it due to the heading blocker in SCHED-02) |
| AC10 | Switching between Week/Day/List does not lose the selected week context | Partial (SCHED-02 checks URL params; test fails before reaching this) |
| AC11 | User can navigate to earlier/later period from any view | Partial (SCHED-02 clicks Next and checks URL; test fails before reaching this) |
| AC12 | Every class entry includes class name, date (when not implied), start time, and trainer name | Missing — no spec asserts start time label is rendered on a class card |
| AC13 | Class with multiple trainers shows all trainer names | Partial (SCHED-02 seeds a two-trainer class and asserts the first trainer name; test fails before reaching this) |
| AC14 | Class with no trainer shows "Trainer TBA" placeholder | Partial (SCHED-02 seeds a no-trainer class and asserts "Trainer TBA"; test fails before reaching this) |
| AC15 | Schedule times displayed in device timezone across all views | Missing — no spec validates timezone display behaviour |
| AC16 | No classes in selected period shows a clear empty state | Missing — no dedicated spec; empty state is visible in the app ("No group classes in this period") but untested |
| AC17 | Schedule load failure shows non-technical error and retry action | Covered (SCHED-04 passes: 500 intercept, asserts "Schedule unavailable" heading and "Retry schedule" button) |
| AC18 | Admin changes to a SCHEDULED class are reflected on next member load | Missing — no spec verifies live-update/refresh behaviour |
| AC19 | Non-SCHEDULED class instances do not appear in the member schedule | Missing — no spec creates a non-SCHEDULED instance and verifies it is absent |
| AC20 | If membership stops being ACTIVE, subsequent access returns membership-required state | Missing — no spec tests the transition from active to lapsed membership |
| AC21 | View is read-only; no booking, cancel, waitlist, trainer-contact, or schedule-modify actions present | Failing — the implementation has booking modals, cancellation modals, and a bookings drawer (see D-03); the spec that would assert absence of these controls is also missing |
| AC22 | Page remains readable on mobile (360 px) with no horizontal page-level scroll | Covered (SCHED-05 passes) |

**Summary:** 3 covered (AC1, AC4, AC17, AC22 — AC22 was listed twice in the original count; corrected to 4), 8 partial-but-blocked (AC2, AC3, AC7, AC8, AC9, AC10, AC11, AC13, AC14), 10 missing (AC5, AC6, AC12, AC15, AC16, AC18, AC19, AC20), 1 failing by implementation (AC21).

---

## Failing Tests

### SCHED-02 — active members can browse week, day, and list views

**Failure point:** Line 264 — `expect(page.getByRole('heading', { name: 'Group Classes' })).toBeVisible()` times out after 5000ms.

**Evidence:** Manual walk via Playwright MCP confirms the schedule page renders with `<h1>Book your next session</h1>`. No heading with text "Group Classes" exists anywhere in the DOM. The badge in the hero panel reads "Class schedule" in a non-heading element.

**Correction to initial report:** The initial report stated a downstream mismatch — "List view subtitle badge renders 'Rolling list', not 'Upcoming 14 days'". This is incorrect. `GroupScheduleRollingList.tsx:36` renders `<h2>Upcoming 14 days</h2>`. The E2E assertion `page.getByText('Upcoming 14 days')` at line 277 is correct and would pass if the test reached it. The "Rolling list" label appears only in the page header as a view-context pill, not as the section heading.

**Likely agent:** Spec selector needs updating to match actual heading ("Book your next session"), or the heading in the app needs to be corrected to match the design spec ("Group Classes"). Product decision needed before fix is assigned (see DS-02 and D-03).

---

### SCHED-03 — members without active plans see the membership-required state

**Failure point:** Line 300 — `expect(page.getByRole('heading', { name: 'Membership required' })).toBeVisible()` times out after 5000ms.

**Evidence:** Manual walk via Playwright MCP confirms:
- A USER with no active membership navigates to `/schedule?view=week&date=2026-04-06`.
- The page renders the full schedule UI: hero panel, Week/Day/List tabs, Previous/Today/Next navigation buttons, and the schedule content area.
- The hero badge reads "Activation needed" (not "Membership active"), but no gate is applied.
- Network request `GET /api/v1/class-schedule?view=week&anchorDate=2026-04-06&timeZone=Europe%2FWarsaw` returns HTTP 200 for the no-plan user.
- No "Membership required" heading exists on the page. No "Browse plans" link exists.
- Screenshot: `screenshots/20260406-213810/sched-noplan-user.png`

**This is an app bug.** AC3 and AC20 require that users without ACTIVE membership be blocked from schedule data. Neither the frontend nor the backend enforces this gate:
- Backend (D-01): service does not throw `NoActiveMembershipException`; returns 200 with `hasActiveMembership: false`.
- Frontend (D-02): page never renders `MembershipRequiredState`; the `hasActiveMembership` field from the response is only used to toggle a badge and booking-allowed calculations.

The spec correctly tests the required behaviour.

---

## Untested Code Paths

- **Default load without query params** — `/schedule` navigated to with no `?view=` or `?date=`; should default to current week in Week view (AC6). No spec covers this.
- **Empty state per view** — no spec navigates to a date range with zero classes and asserts the empty-state heading "No group classes in this period" appears for each of Week, Day, and List views (AC16).
- **Admin-to-member update propagation** — no spec creates a class via admin API, loads the member schedule, edits the class via admin API, reloads, and verifies the change is reflected (AC18).
- **Non-SCHEDULED class filtering** — no spec creates a class instance, transitions it out of SCHEDULED status, then verifies it does not appear in the member schedule (AC19).
- **Lapsed-membership re-gate** — no spec starts with an active membership, expires or cancels it, then navigates to /schedule and expects the membership gate (AC20; depends on D-01 and D-02 fixes).
- **Read-only enforcement** — no spec asserts that no booking, waitlist, or trainer-contact action elements are present on any class card (AC21; currently fails by implementation).
- **Timezone display** — no spec verifies that class start times are shown in the device's local timezone in all three views (AC15).
- **Class time and name rendering** — no spec asserts that the start-time value (e.g. "09:00") and class name are visible on a rendered class card (AC12).
- **"Open booking hub" CTA** — the hero panel renders an "Open booking hub" button; its destination and behaviour are entirely untested (out of scope per PRD but present in the UI).

---

## Suggested Fix Order

1. **Resolve D-03 scope question (product decision — blocks all other fixes)** — Determine whether booking from the schedule view is in scope for this version. If yes, update the PRD and SDD. If no, remove booking UI from the page and trim the DTO. Until this is decided, D-01, D-02, and the heading fix (DS-02) cannot be finalized.

2. **Fix D-01 (backend membership gate — critical, access-control failure)** — Throw `NoActiveMembershipException` from `UserClassScheduleService.getSchedule` when `findAccessibleActiveMembership` returns null. The `GlobalExceptionHandler` mapping already exists. This makes the API contract match the SDD.

3. **Fix D-02 (frontend membership gate — critical, AC3/AC20 broken)** — Implement `MembershipRequiredState` component per the design spec (heading: "Membership required", body, "Browse plans" CTA to `/plans`). Render it in place of the schedule body when the backend returns `NO_ACTIVE_MEMBERSHIP` (after D-01) or `hasActiveMembership === false` (interim approach). The sticky toolbar must also be hidden in this state.

4. **Fix DS-02 / SCHED-02 heading (spec-vs-app heading discrepancy)** — Determine correct heading with BA/designer; update either the spec selector or the implementation. Also confirm that `GroupScheduleRollingList`'s `<h2>Upcoming 14 days</h2>` (which the E2E assertion at line 277 correctly targets) will pass once SCHED-02's first assertion is unblocked.

5. **Add DS-01 benchmark citation** — Add a `Benchmark:` entry to `docs/design/group-classes-schedule-view.md` per design-standards requirement.

6. **Fix S-01 SDD migration reference** — Update `docs/sdd/group-classes-schedule-view.md` migration file references from `V15__` to `V18__`.

7. **Add AC5 spec** — Create a class via `POST /api/v1/admin/class-instances`, navigate to the member schedule for that date, and assert the class card is visible.

8. **Add AC6 spec** — Navigate to `/schedule` with no query params and assert Week view is active and the current week's date range is displayed.

9. **Add AC16 spec** — Assert the empty-state message appears for each view when no classes exist in the selected period.

10. **Add AC12 spec** — Create a class with a known start time, open the member schedule, and assert the time label is visible on the class card in Week and Day views.

11. **Add AC19 spec** — Create a class instance, cancel it via admin API, reload the member schedule, and assert it does not appear.

12. **Add AC21 spec** — Assert that no booking, waitlist, or trainer-contact action elements exist on the class cards or in the schedule UI (or, if D-03 expands scope, update to assert correct booking UI is present).

13. **Add AC20 spec** — Start as an active member, cancel the membership via API, reload `/schedule`, and assert the membership gate is shown. (Requires items 2 and 3 in place first.)

14. **Add AC18 and AC15 specs** — Admin-edit propagation and timezone display; implement after core gate and data-flow specs are stable.
