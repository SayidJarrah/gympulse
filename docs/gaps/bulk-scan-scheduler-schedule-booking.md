# Gap Report: scheduler + group-classes-schedule-view + class-booking-cancellation
Date: 2026-04-09

---

## DOCS → CODE Gaps

### scheduler

- **`RoomsPage.tsx` name mismatch** — SDD section 4 specifies the page component as `RoomsPage.tsx` at route `/admin/rooms`. The implemented file is `frontend/src/pages/admin/AdminRoomsPage.tsx`. The route wiring in `App.tsx` is correct (`/admin/rooms → AdminRoomsPage`). Low impact but the SDD name is stale.

- **`ClassTemplateFormModal` and `ClassTemplateDeleteConfirmModal` not in SDD component list** — Both `frontend/src/components/scheduler/ClassTemplateFormModal.tsx` and `frontend/src/components/scheduler/ClassTemplateDeleteConfirmModal.tsx` exist in the codebase. The scheduler SDD section 4 component table does not list them. These are legitimate additions (the template CRUD flow requires them) but they are undocumented in the SDD.

- **No test for `ClassInstanceService`** — SDD section 3 lists no service-level test file for `ClassInstanceService`. A test does exist at `backend/src/test/kotlin/com/gymflow/service/ClassInstanceServiceTest.kt`, but the SDD does not document it, making the gap purely a docs-to-code naming omission rather than a missing test.

### group-classes-schedule-view

- **SDD section 3 `UserClassScheduleService` description is stale** — `docs/sdd/group-classes-schedule-view.md` line 173 still reads: "Validates query params, **enforces membership access**, computes timezone-aware ranges". The membership gate has been removed. This description is now incorrect; it was superseded by `docs/sdd/class-booking-cancellation.md` but was never updated in the schedule-view SDD.

- **SDD section 5 task wording is stale** — `docs/sdd/group-classes-schedule-view.md` line 175 still reads: "Covers **membership gate**, timezone range calculation…" for `UserClassScheduleServiceTest.kt`. The actual test should no longer cover a membership gate (gate removed). The test file exists but this description is stale.

- **SDD `UserClassScheduleResponse` DTO field set is outdated** — The group-classes-schedule-view SDD (section 2, success response) shows a response without `hasActiveMembership`, `classPhotoUrl`, `capacity`, `confirmedBookings`, `remainingSpots`, `currentUserBooking`, `bookingAllowed`, `bookingDeniedReason`, and `cancellationAllowed`. These fields were added by the booking-cancellation SDD and are now present in the actual DTO and frontend types, but the schedule-view SDD's response example was never updated to reflect them.

- **`NO_ACTIVE_MEMBERSHIP` error code listed in schedule-view SDD but no longer thrown** — `docs/sdd/group-classes-schedule-view.md` section 4 "User-visible state handling" still lists `NO_ACTIVE_MEMBERSHIP` as a possible error code from this endpoint. Per the booking-cancellation SDD, that code is no longer returned by `GET /api/v1/class-schedule`. The `GroupClassesSchedulePage.tsx` still references `INVALID_QUERY_CODES` and does not list `NO_ACTIVE_MEMBERSHIP` as a handled page-level error, which is correct — but the SDD note is misleading.

### class-booking-cancellation

No DOCS → CODE gaps found. All specified files exist and the implementation matches the SDD contract.

---

## CODE → DOCS Gaps

### scheduler

- **`ClassTemplateFormModal.tsx`** (`frontend/src/components/scheduler/ClassTemplateFormModal.tsx`) — Not listed in the scheduler SDD component table. Implements the create/edit template modal used by `AdminClassTemplatesPage`.

- **`ClassTemplateDeleteConfirmModal.tsx`** (`frontend/src/components/scheduler/ClassTemplateDeleteConfirmModal.tsx`) — Not listed in the scheduler SDD component table. Implements the force-delete confirmation for templates with assigned instances.

- **`ClassInstanceServiceTest.kt`** (`backend/src/test/kotlin/com/gymflow/service/ClassInstanceServiceTest.kt`) — Not listed in the scheduler SDD section 3 file table. Exists as a unit test for `ClassInstanceService`.

### group-classes-schedule-view

- **`GroupScheduleEntryModal.tsx`** (`frontend/src/components/schedule/GroupScheduleEntryModal.tsx`) — Not listed in `docs/sdd/group-classes-schedule-view.md` or `docs/sdd/class-booking-cancellation.md` component tables. This is a detail modal opened on class card click in the schedule page. The booking-cancellation SDD specifies `BookingConfirmModal` and `CancelBookingModal` but does not mention a parent entry modal that wraps class detail display and booking actions. This component is a meaningful addition to the interaction flow that has no SDD coverage.

- **`groupClassScheduleStore.patchScheduleEntry` action** — The store at `frontend/src/store/groupClassScheduleStore.ts` exposes a `patchScheduleEntry` action that optimistically updates a single schedule entry after booking or cancellation. Neither the group-classes-schedule-view SDD nor the booking-cancellation SDD documents this action. The booking-cancellation SDD's store additions list `setView`, `setAnchorDate`, `fetchSchedule`, `goToPreviousPeriod`, `goToNextPeriod`, `goToToday`, but not `patchScheduleEntry` or `isRefreshing`.

- **`isRefreshing` state field in `groupClassScheduleStore`** — The store exposes `isRefreshing: boolean` for background-refresh UX. Neither SDD documents this field.

### class-booking-cancellation

- No pure CODE → DOCS gaps beyond those listed under group-classes-schedule-view above (which the booking SDD extended).

---

## Stale SDD Text (not a code gap, requires SDD update)

- `docs/sdd/group-classes-schedule-view.md` line 173: "enforces membership access" → should read "resolves `hasActiveMembership` flag; no access gate"
- `docs/sdd/group-classes-schedule-view.md` line 175: "Covers membership gate" → remove reference to membership gate in test description
- `docs/sdd/group-classes-schedule-view.md` section 2 success response: update to include all booking-state fields added by the booking-cancellation SDD
- `docs/sdd/group-classes-schedule-view.md` section 4 user-visible state handling: remove `NO_ACTIVE_MEMBERSHIP` entry or annotate it as "legacy — gate removed, this code no longer returned by this endpoint"

---

## Clean (no gaps found)

- **scheduler — backend** — All specified Kotlin files exist: `Trainer.kt`, `Room.kt`, `ClassTemplate.kt`, `ClassInstance.kt` (with `status` field), all DTOs, repositories, services, and controllers. `status = "SCHEDULED"` is set on create, copy, and import. V8–V12 + V13 migrations all present. `GlobalExceptionHandler` maps all scheduler error codes.
- **scheduler — DB migrations** — V8 through V13 are present and match the DDL in the SDD exactly.
- **scheduler — frontend components** — All SDD-listed components exist: `WeekCalendarGrid`, `ClassInstanceCard`, `ClassPalette`, `ClassInstanceEditPanel`, `RoomPicker`, `CopyWeekConfirmModal`, `WeekNavigator`, `ImportModal`, `ExportMenu`, `TrainerCard`, `TrainerFormModal`, `TrainerDeleteConfirmModal`, `TrainerPhotoUpload`.
- **group-classes-schedule-view — DB** — V18 migration exists and matches the SDD DDL exactly (status column, backfill, constraints, both indexes).
- **group-classes-schedule-view — backend** — `UserClassScheduleController`, `UserClassScheduleService`, `UserClassScheduleResponse` DTO exist. `ClassInstance.kt` has `status` field. `UserMembership.kt` has `deletedAt`. `findAccessibleActiveMembership` exists on `UserMembershipRepository`. No active-membership gate in `UserClassScheduleService` — `hasActiveMembership` is resolved as a response field only, consistent with the booking-cancellation SDD update.
- **group-classes-schedule-view — frontend** — All 7 SDD-listed components exist under `frontend/src/components/schedule/`. `GroupClassesSchedulePage` exists at the specified route. `UserRoute` exists and guards `/schedule`. `groupClassScheduleStore` exists with all specified actions. `groupClassSchedule` types and API module match the SDD contract.
- **class-booking-cancellation — DB** — V20 migration exists and matches the SDD DDL exactly (bookings table, all constraints, all indexes, trigger).
- **class-booking-cancellation — backend** — `Booking.kt`, `BookingRepository.kt`, `BookingService.kt`, `UserBookingController.kt`, `AdminBookingController.kt`, all booking DTOs, and all 13 error-code handlers in `GlobalExceptionHandler` are present and match the SDD. `PATCH /api/v1/admin/class-instances/{id}` and `DELETE /api/v1/admin/class-instances/{id}` both enforce booking-count guards. `GET /api/v1/class-schedule` no longer gates on membership.
- **class-booking-cancellation — frontend** — `BookingConfirmModal`, `CancelBookingModal`, `BookingSummaryBar`, `MyBookingsDrawer`, `BookingToast`, `AdminBookForMemberPanel` all exist. `bookingStore` exists. `bookings.ts` API module covers all five SDD-specified functions.
