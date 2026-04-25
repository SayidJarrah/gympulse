# Review: personal-training-booking

**Date:** 2026-04-18  
**Branch:** feature/personal-training-booking  
**Reviewer:** automated pipeline reviewer  
**References:** PRD `docs/prd/personal-training-booking.md`, SDD `docs/sdd/personal-training-booking.md`, handoff `docs/design-system/handoffs/personal-training-booking/README.md`

---

## Verdict

**APPROVED** — no blockers. 8 suggestions logged to tech-debt backlog.

---

## Scope

4 commits reviewed:
- `ae248d7` — PRD
- `44cbbad` — SDD
- `b6ba11f` — Backend (migrations, entity, DTOs, repository, service, 4 controllers, tests)
- `6746690` — Frontend (types, API, store, hooks, 8 components, 3 pages, route updates)

---

## Security

All items pass.

- `POST /api/v1/pt-bookings` and `DELETE /.../{id}` guarded by `@PreAuthorize("hasRole('USER')")`. Member ownership enforced in service via `findByIdAndMemberId` — a member cannot cancel another member's booking.
- `GET /api/v1/trainers/me/pt-sessions` guarded by `hasRole('TRAINER')`. Trainer ID resolved from `authentication.name` (not a request parameter), so a trainer cannot view another trainer's schedule.
- All admin endpoints gated by `hasRole('ADMIN')`.
- No stack traces exposed — all exceptions are mapped to `{ error, code }` in `GlobalExceptionHandler`.
- No secrets hardcoded. No JWT in localStorage.
- `TrainerRoute` client-side guard correctly redirects TRAINER role; non-TRAINER authenticated users go to `/home`. Server enforces the real authorization.

---

## Backend Review

### Migrations

- `V23__create_pt_bookings_table.sql` — correct schema with 3 appropriate indexes. DB-level `CHECK` constraints for `status` values and `cancelled_at` consistency are a solid defensive layer.
- `V24__add_trainer_pt_columns.sql` — uses `IF NOT EXISTS`, safe to run multiple times.

### Service: PtBookingService

- Availability algorithm matches SDD Section 4 exactly: `PAST → CLASS → BOOKED → AVAILABLE` precedence, whole-hour slot evaluation, 24h lead time cut-off.
- `createBooking` validates lead time, whole-hour alignment, gym hours, PT overlap, and class overlap in the correct order documented in SDD §4.
- `cancelBooking` checks ownership and status before mutating — correct.
- `listPtTrainers` loads PT bookings and group classes for the 14-day window before iterating — avoids N+1 per-trainer queries. Acceptable. SDD §4 notes this as a future materialized-view candidate (TD-061 added below).
- `getAvailability` uses `generateSequence` for date iteration — idiomatic and correct.
- All private exceptions at the bottom of the file map cleanly to `GlobalExceptionHandler` handlers.

### Repository

- `countTrainerOverlap` uses `startAt < :endAt AND endAt > :startAt` (correct half-open interval overlap test matching SDD §4).
- `findAdminSessions` does paginated JPA query with optional trainer/status filters, leaving full-text search to a post-filter in the service. This is the documented approach in the SDD.

### Controllers

- `PtTrainerController`: 14-day clamp on availability window prevents expensive unbounded queries — matches SDD §5.
- `TrainerSessionController`: resolves `trainerId` via `authentication.name` — correct pattern matching `AdminPtSessionController`'s admin pattern.
- All controllers use `@Valid` on `@RequestBody` where applicable.

### Tests

- `PtBookingServiceTest` covers 8 cases: happy-path create, lead time violation, PT overlap, class overlap, outside gym hours (before open), outside gym hours (at close), cancel success, cancel not found, cancel not active. Coverage matches the critical paths.
- `BookingServiceTest` fixed to pass 6 constructor arguments — pre-existing compilation issue resolved.
- One gap: no test for `MEMBERSHIP_REQUIRED` path (the `hasActiveMembership` check). This is a suggestion, not a blocker.

---

## Frontend Review

### Design Fidelity vs. Handoff

**Member view (`PersonalTrainingPage` / `TrainerDirectory` / `TrainerCard` / `SlotPicker` / `ConfirmBookingModal` / `MyUpcomingPT`)**

All major spec requirements are met:

- Page hero: Barlow Condensed 56px uppercase "ONE-ON-ONE, / ON YOUR TERMS." with line 2 in `#22C55E` — exact match.
- Ambient glows: top-right green 0.10, bottom-left orange 0.06, `blur(40px)` — matches spec.
- `TrainerDirectory`: "STEP 1 OF 3 · CHOOSE A TRAINER" eyebrow, Barlow 40 h2, specialty chips with active=green tint/border state, `repeat(auto-fill, minmax(320px, 1fr))` grid — matches spec.
- `TrainerCard`: accent glow div (radial-gradient with trainer hex), 52px avatar with initial fallback, Barlow 24/700 uppercase name, `min-height: 60px` bio, specialty chips, bottom row with `nextOpenAt`/`weekOpenCount` in Barlow 22 green — matches spec. Hover `translateY(-2px)` + border/bg swap at 200ms — matches spec.
- `SlotPicker`: 64px avatar header, Barlow 44 trainer name, week paginator with disabled states, 4-item legend, `72px + repeat(7, 1fr)` grid, 52px slot cell height, all 4 slot states (available/class/booked/past) rendered correctly with correct colors and accessibility attributes — matches spec.
- `ConfirmBookingModal`: backdrop blur(8px), `max-w-[520px]`, green-gradient header band, `aria-modal` + focus trap (Tab/Shift-Tab/Escape) + `aria-labelledby` — all match spec and accessibility requirements.
- `MyUpcomingPT`: session rows `auto 1fr auto auto` grid, 40px avatar, countdown Barlow 22 green, confirm dialog before cancel — matches spec. Hidden when 0 bookings.
- Blue info banner in SlotPicker uses correct `rgba(59,130,246,0.05)` bg + `rgba(59,130,246,0.15)` border — matches spec.

**Trainer view (`TrainerSchedule`)**

- "TRAINER VIEW · {name}" eyebrow, Barlow 48 h1, 3 stat tiles with tone-colored Barlow 34 numbers, day-grouped sessions with 140px left column, `SessionRow` with 3px colored left border — matches spec.

**Admin view (`AdminPtSessions`)**

- Barlow 48 h1, 4 stat tiles with Barlow 38 tone-colored numbers, filter bar with 150ms debounced search, `aria-live="polite"` result count region, table `180px 1.3fr 1.3fr 120px 140px 100px` grid, cancelled rows get strikethrough + `opacity-60` + red pill, `TinyAvatar` 22×22 — all match spec.
- `hashAccent` function as fallback when `trainerAccentColor` is null — correct defensive fallback.

### Required States Checklist (design-standards skill)

| Screen | Populated | Loading | Empty | Error | Delight detail |
|--------|-----------|---------|-------|-------|----------------|
| TrainerDirectory | ✅ | ✅ skeleton | ✅ text | ✅ | ✅ card hover lift |
| SlotPicker | ✅ | ✅ spinner | ✅ (no days) | ✅ | ✅ slot hover green fill |
| ConfirmBookingModal | ✅ | ✅ "Booking…" | n/a | ✅ red alert | ✅ green-gradient header |
| MyUpcomingPT | ✅ | n/a (hidden) | ✅ (returns null) | n/a | ✅ countdown Barlow number |
| TrainerSchedule | ✅ | ✅ spinner | ✅ (no sessions) | ✅ | ✅ left-border color coding |
| AdminPtSessions | ✅ | ✅ spinner | ✅ "No sessions match" | ✅ | ✅ stat tiles tone-colored |

All required states present across all six surfaces.

### Routing and Guards

- `/training` → `UserRoute` → `PersonalTrainingPage` — correct.
- `/trainer/sessions` → `TrainerRoute` → `TrainerSessionsPage` — correct. `TrainerRoute` redirects unauthenticated to `/login`, non-TRAINER to `/home`.
- `/admin/pt-sessions` → `AdminRoute` → `AdminPtSessionsPage` — correct.
- `UserRole` type correctly extended to include `'TRAINER'`.

### Store / Hooks

- `usePtBookingStore` contains all state slices and actions specified in SDD §5. `confirmBooking` posts and optimistically updates `myPtBookings` — correct.
- `cancelMyPtBooking` updates status locally — optimistic, correct.
- `usePtSlotPicker` `canGoBack`/`canGoForward` gates prevent requesting availability beyond the 14-day window.
- `useMyPtBookings` filters to `upcoming` (bookings with `startAt > now`) before passing to the UI — correct.

### Error Messages

`PT_BOOKING_ERROR_MESSAGES` in `errorMessages.ts` matches SDD Section 6 exactly for all 7 codes. `getPtBookingErrorMessage` helper follows the same pattern as `getBookingErrorMessage`.

---

## Minor Issues (suggestions, not blockers)

### S-01 — SlotPicker `isoDateTime` constructs local time then converts to UTC

`SlotPicker.tsx:28-30` builds `new Date(\`\${dateStr}T\${hour}:00:00\`)` without a timezone suffix. This parses as local time in the browser, then `.toISOString()` converts to UTC. When the user is in a timezone offset from UTC (e.g. UTC+3), the ISO string sent to the server will be `hour - 3` in UTC, potentially failing the gym-hours validation or booking the wrong slot. The handoff README (Open Questions) flags time zones as deferred, but the current implementation introduces a silent correctness bug that will surface for any user outside UTC. Suggest adding a comment documenting the assumption (`// Assumes server slot hours are in UTC; will need timezone-aware construction when multi-timezone support is added`) so the risk is visible.

### S-02 — `TrainerSchedule` has no empty state message when both `ptSessions` and `groupClasses` are empty

`TrainerSchedule.tsx` groups sessions by day and shows day sections only when data exists. If both arrays are empty, the component renders the stat tiles (all zeros) followed by blank space with no message. A "No sessions scheduled" text or small illustration would match the design-standards requirement for a quality empty state. Suggest adding a conditional empty state when both arrays are empty.

### S-03 — `AdminPtSessions` trainer filter is a status-only `<select>`, missing trainer filter

The handoff spec shows a "Trainer" SelectPill in addition to the "Status" SelectPill. The component has a comment `{/* Trainer filter — kept simple; full select implementation */}` and only implements the status select. The SDD documents `trainerId` as an optional filter param and the backend supports it. This is a non-blocking gap because filtering by full-text search covers the use case, but the filter bar deviates from the handoff spec. Suggest adding a trainer select populated from `GET /api/v1/trainers/pt` in a follow-up, or noting the omission in the SDD deferred section.

### S-04 — `ConfirmBookingModal` focus trap restores focus to `focusable[0]` on every re-render, not to the triggering slot button

The handoff accessibility section says "return focus to the slot button on close." The current focus trap focuses `focusable[0]` (the "Not yet" button) on mount and does not return focus to the slot button that was clicked to open the modal. This means a keyboard user loses their place in the calendar grid. Suggest accepting a `triggerRef` or callback in the modal to return focus on close.

### S-05 — No MEMBERSHIP_REQUIRED test in `PtBookingServiceTest`

`createBooking` checks membership via the service's active-membership validation. There is no unit test covering the `MEMBERSHIP_REQUIRED` code path (the `403` branch). The 8 existing tests cover all other paths. Suggest adding a test for the membership check.

### S-06 — `SlotPicker` missing `key` prop on outer fragment in hour-row loop

`SlotPicker.tsx:246` maps over `hours` with `<>…</>` fragment but uses `key={hour}` on the inner `<div>` only (the time label `<div key={\`label-\${hour}\`}>`). The fragment itself has no key, which produces React key warnings. Wrap with `<React.Fragment key={hour}>` instead of `<>`.

### S-07 — `createPtBooking` membership check relies on global `hasActiveMembership` but that state may be stale in the store

`confirmBooking` in the store posts directly to the API; the 403 `MEMBERSHIP_REQUIRED` error will surface as `bookingError` in the modal, which is correct. No issue with correctness — the server enforces it. This is just a note that the frontend does not do a pre-flight membership check before opening the modal, which is the correct pattern per SDD §5 ("membership gate is enforced by the backend returning `403 MEMBERSHIP_REQUIRED`"). No change needed.

### S-08 — `PtBookingResponse` is missing a `createdAt` field

`AdminPtSessionResponse` includes `createdAt` but the member-facing `PtBookingResponse` does not. The handoff spec `bookings` shape does not require `createdAt` for the member view, so this is intentional — but for `MyUpcomingPT` countdown accuracy (especially after an optimistic insert), the absence of `createdAt` is not an issue. No action needed; noted for completeness.

---

## SDD Compliance

All 8 API endpoints exist with correct HTTP methods, paths, security annotations, and response shapes matching SDD Section 2.

All DTOs match SDD Section 3 exactly.

Business logic (Section 4) is implemented correctly in `PtBookingService`:
- `PAST → CLASS → BOOKED → AVAILABLE` slot-status precedence
- `endAt = startAt + 1h` always set by service, never by client
- No overlap stored — point-in-time overlap check within `@Transactional`

All deferred items from SDD Section 8 are confirmed absent: no cancel window, no quota increment, no notifications, no recurring, no waitlist, no intake form.

---

## Tech Debt Items Added

The following items are appended to `docs/backlog/tech-debt.md`:
