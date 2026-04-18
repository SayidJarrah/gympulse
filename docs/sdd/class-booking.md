# SDD: Class Booking

## Reference
- PRD: `docs/prd/class-booking.md`
- Design: `docs/design/class-booking.md`
- Date: 2026-04-18
- Supersedes: `docs/sdd/class-booking-cancellation.md` (all sections of that document are superseded by this one and must not be used as implementation guidance)

---

## Architecture Overview

The class-booking feature extends the member schedule from read-only to a full booking workflow. It reuses the `bookings` table, `Booking` entity, and all existing booking endpoints introduced in `class-booking-cancellation.md`. This SDD introduces:

1. Two new admin read endpoints: per-user booking history and per-class attendee list.
2. A new member cabinet page at `/profile/bookings` backed by the existing `GET /api/v1/bookings/me`.
3. Deliberate behavioral changes to the booking creation flow (duplicate allowed, cutoff 2h not 3h).
4. Removal of the `ALREADY_BOOKED` duplicate-prevention gate from service and schedule entry computation.

Layers affected: **DB / Backend / Frontend**.

No new tables are required. The `bookings` table already exists at V20. The only DB change is a migration that drops the partial unique index that enforced one-confirmed-booking-per-user-per-class, and adds two supporting indexes for the new admin queries.

The design spec confirms `/admin/users/{id}` does not yet exist as a full member-detail route. Only `GET /api/v1/admin/users/{userId}/photo` (photo-only) exists under that prefix. The admin per-user booking history endpoint is therefore a new resource at `GET /api/v1/admin/users/{userId}/bookings`. The corresponding admin UI panel (`AdminUserBookingHistoryPanel`) is designed to be self-contained — it can be embedded in any admin member-detail shell the developer scaffolds without depending on a specific parent route structure.

---

## 1. Database Changes

### V20 already applied — do not edit

`V20__create_bookings_table.sql` is already applied in all environments. It must not be touched.

### New Migration: V21__update_bookings_allow_duplicates.sql

```sql
-- Drop the partial unique index that prevented a user from holding more than one
-- CONFIRMED booking on the same class instance. The PRD explicitly removes this
-- restriction: a member may hold multiple confirmed bookings for the same class.
--
-- Also adds two indexes to support the new admin read queries introduced in this
-- feature. Both are non-unique and safe to add without data changes.

DROP INDEX IF EXISTS uidx_bookings_one_confirmed_per_user_class;

-- Supports GET /api/v1/admin/users/{userId}/bookings:
-- fetches all bookings for a specific user across class instances,
-- filtered optionally by status, ordered by scheduled_at.
-- The join is bookings.class_id -> class_instances.id, so the leading column
-- on bookings is user_id; status is added for the filter push-down.
CREATE INDEX IF NOT EXISTS idx_bookings_user_id_class_id
  ON bookings (user_id, class_id);

-- Supports GET /api/v1/admin/classes/{classId}/attendees:
-- fetches all CONFIRMED bookings for a specific class instance.
-- idx_bookings_class_id_status already exists from V20 and covers this query;
-- no additional index is needed here.
-- (No-op section — kept as documentation that V20 already covers this access pattern.)
```

Flyway filename: `V21__update_bookings_allow_duplicates.sql`

### Schema State After V21

The `bookings` table retains:
- `idx_bookings_user_id_status_booked_at` on `(user_id, status, booked_at DESC)` — member self-history
- `idx_bookings_class_id_status` on `(class_id, status)` — capacity count and attendee list
- `idx_bookings_user_id_class_id` on `(user_id, class_id)` — admin per-user history with class join

Removed:
- `uidx_bookings_one_confirmed_per_user_class` — partial unique index on `(user_id, class_id) WHERE status = 'CONFIRMED'`

All existing check constraints remain unchanged.

---

## 2. API Contract

### Retained Endpoints (no shape change)

#### POST /api/v1/bookings
**Auth:** `USER` role + active membership  
**Behavior change:** Steps 9 and 14 in the superseded SDD's business logic (ALREADY_BOOKED check and DataIntegrityViolationException rethrow) are removed. See Section 6 for precise file:line references.

**Request body:**
```json
{ "classId": "9e8c2dc7-0f53-42a8-a8d7-0e84f6fdd9b5" }
```

**Success response (201):** Full `BookingResponse` — shape unchanged.

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `INVALID_CLASS_ID` | `classId` missing, blank, or not a valid UUID |
| 401 | `UNAUTHORIZED` | No valid Bearer token |
| 403 | `MEMBERSHIP_REQUIRED` | Caller has no accessible active membership |
| 404 | `CLASS_NOT_FOUND` | Class does not exist or is soft-deleted |
| 409 | `CLASS_NOT_BOOKABLE` | Class `type != GROUP` or `status != SCHEDULED` |
| 409 | `CLASS_ALREADY_STARTED` | `scheduledAt <= nowUtc` |
| 409 | `CLASS_FULL` | `confirmedCount >= capacity` |

`ALREADY_BOOKED` is removed. A member holding an existing CONFIRMED booking on the same instance is not a rejection reason.

**Business logic (revised):**
1. Parse `classId`; throw `InvalidClassIdException` on blank or malformed UUID.
2. Resolve active membership via `findAccessibleActiveMembershipForUpdate(userId, today)`. Throw `MembershipRequiredException` if absent.
3. Lock the `class_instances` row with `PESSIMISTIC_WRITE`.
4. Throw `ClassNotFoundException` if row absent or `deletedAt IS NOT NULL`.
5. Throw `ClassNotBookableException` if `type != GROUP` or `status != SCHEDULED`.
6. Throw `ClassAlreadyStartedException` if `scheduledAt <= nowUtc`.
7. Count CONFIRMED bookings for the class while the row lock is held.
8. Throw `ClassFullException` if `confirmedCount >= capacity`.
9. Insert new `Booking` with `status = CONFIRMED`, `bookedAt = nowUtc`.
10. Increment `userMembership.bookingsUsedThisMonth` by 1 in the same transaction.
11. Return 201 with `BookingResponse`.

Note: The `DataIntegrityViolationException` catch-and-rethrow-as-`AlreadyBookedException` block is also removed since the unique index is dropped and duplicates are allowed.

---

#### GET /api/v1/bookings/me
**Auth:** `USER` role (no active membership required)

**Query parameters:**
- `status` — optional, one of `CONFIRMED`, `CANCELLED`, `ATTENDED`
- `page` — default `0`
- `size` — default `20`

**Success response (200):** Spring `Page<BookingResponse>` envelope (unchanged shape).

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `INVALID_BOOKING_STATUS` | `status` present but not an allowed value |
| 401 | `UNAUTHORIZED` | No valid Bearer token |
| 403 | `ACCESS_DENIED` | Caller is not `USER` |

**Business logic:** Unchanged except `isCancellable` now uses a 2h cutoff (see Section 4).

The cabinet page at `/profile/bookings` is backed entirely by this endpoint. No new backend endpoint is required for the member cabinet page.

---

#### DELETE /api/v1/bookings/{bookingId}
**Auth:** `USER` role

**Success response (200):** Updated `BookingResponse` with `status = CANCELLED`.

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | No valid Bearer token |
| 403 | `ACCESS_DENIED` | Caller is not `USER` |
| 404 | `BOOKING_NOT_FOUND` | Booking does not exist or does not belong to caller |
| 409 | `BOOKING_NOT_ACTIVE` | Booking is not in `CONFIRMED` status |
| 409 | `CANCELLATION_WINDOW_CLOSED` | `nowUtc >= scheduledAt - 2h` (was 3h) |

**Business logic (revised cutoff):**
1. Resolve booking by `(bookingId, userId)`; throw `BookingNotFoundException` if absent.
2. Lock `class_instances` row with `PESSIMISTIC_WRITE`.
3. Re-read booking with `PESSIMISTIC_WRITE`.
4. Throw `BookingNotActiveException` if `status != CONFIRMED`.
5. Compute `cutoffAt = scheduledAt.minusHours(2)`. Throw `CancellationWindowClosedException` if `!nowUtc.isBefore(cutoffAt)`.
6. Set `booking.status = CANCELLED`, `booking.cancelledAt = nowUtc`, `booking.updatedAt = nowUtc`.
7. Save and return 200 with updated `BookingResponse`.

---

#### GET /api/v1/class-schedule
**Auth:** `USER` role

**Behavior changes:**
- `bookingDeniedReason` will no longer return `ALREADY_BOOKED`. When the user has an existing confirmed booking on an instance, the instance is still bookable (`bookingAllowed` may be `true` if capacity allows and class is future). The booked badge is shown via `currentUserBooking`, but `bookingDeniedReason` is `null` in that state unless another real rejection applies.
- `cancellationAllowed` now uses a 2h cutoff instead of 3h.
- `currentUserBooking` returns the **most recent** CONFIRMED booking for that class instance when the user holds multiple. The field remains a single object (`ScheduleEntryBookingSummaryResponse`), not an array.

Revised `bookingDeniedReason` derivation:
```
when {
  !instance.scheduledAt.isAfter(now) -> "CLASS_ALREADY_STARTED"
  confirmedBookings >= instance.capacity.toLong() -> "CLASS_FULL"
  !hasActiveMembership -> "MEMBERSHIP_REQUIRED"
  else -> null
}
```
Note: the `currentUserBooking != null -> "ALREADY_BOOKED"` branch is removed.

`cancellationAllowed` derivation:
```
currentUserBooking != null && now.isBefore(instance.scheduledAt.minusHours(2))
```

**Response shape:** Unchanged from superseded SDD. `bookingDeniedReason` type remains `String?`.

---

#### POST /api/v1/admin/bookings
**Auth:** `ADMIN` role  
**Scope:** Out of scope for this PRD. Endpoint exists in code from the superseded spec. Leave it in place. Do not add UI entry points or test coverage in this feature's delivery.

---

#### GET /api/v1/admin/booking-members
**Auth:** `ADMIN` role  
**Scope:** Out of scope for this PRD (was used by admin on-behalf booking panel). Leave in place.

---

#### PATCH /api/v1/admin/class-instances/{id}
**Auth:** `ADMIN` role  
**Behavior:** Unchanged. `CAPACITY_BELOW_CONFIRMED_BOOKINGS` guard retained.

---

#### DELETE /api/v1/admin/class-instances/{id}
**Auth:** `ADMIN` role  
**Behavior:** Unchanged. `CLASS_HAS_ACTIVE_BOOKINGS` guard retained.

---

### New Endpoints

#### GET /api/v1/admin/users/{userId}/bookings
**Auth:** `ADMIN` role — `@PreAuthorize("hasRole('ADMIN')")`

**Path parameter:** `userId` — UUID of the target member account

**Query parameters:**
- `status` — optional, one of `CONFIRMED`, `CANCELLED`, `ATTENDED`
- `page` — default `0`
- `size` — default `20`
- `sort` — default `scheduledAt,desc`

**Success response (200):**
```json
{
  "content": [
    {
      "bookingId": "99bc2d17-b0f0-4d88-aa54-8423251b9b8c",
      "classInstanceId": "9e8c2dc7-0f53-42a8-a8d7-0e84f6fdd9b5",
      "className": "Yoga Flow",
      "scheduledAt": "2026-04-06T16:00:00Z",
      "status": "CONFIRMED",
      "bookedAt": "2026-04-04T12:15:00Z",
      "cancelledAt": null
    }
  ],
  "totalElements": 12,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `INVALID_BOOKING_STATUS` | `status` present but not a recognized value |
| 401 | `UNAUTHORIZED` | No valid Bearer token |
| 403 | `ACCESS_DENIED` | Caller is not `ADMIN` |
| 404 | `USER_NOT_FOUND` | `userId` does not exist, is soft-deleted, or is not a `USER` account |

**Business logic:**
1. Validate `userId` exists and is a non-deleted `USER` account; throw `UserNotFoundException` if not.
2. Validate optional `status` filter; throw `InvalidBookingStatusException` if unrecognized.
3. Query `bookings` joined to `class_instances` for the given `userId`.
4. Apply `status` filter if present.
5. Apply pagination and sort (default `scheduled_at DESC`).
6. Return 200 with paged `AdminUserBookingHistoryResponse`.

---

#### GET /api/v1/admin/classes/{classId}/attendees
**Auth:** `ADMIN` role — `@PreAuthorize("hasRole('ADMIN')")`

**Path parameter:** `classId` — UUID of the `class_instances` row

**Query parameters:**
- `status` — optional, default: only `CONFIRMED`. Allowed values: `CONFIRMED`, `CANCELLED`, `ATTENDED`, `ALL`. When `ALL`, returns all statuses.
- `page` — default `0`
- `size` — default `50`

**Success response (200):**
```json
{
  "classInstanceId": "9e8c2dc7-0f53-42a8-a8d7-0e84f6fdd9b5",
  "className": "Yoga Flow",
  "scheduledAt": "2026-04-06T16:00:00Z",
  "capacity": 20,
  "confirmedCount": 14,
  "attendees": {
    "content": [
      {
        "bookingId": "99bc2d17-b0f0-4d88-aa54-8423251b9b8c",
        "memberId": "0bf8a961-d42a-46e7-bd95-1f76673a876f",
        "displayName": "Anna Nowak",
        "status": "CONFIRMED",
        "bookedAt": "2026-04-04T12:15:00Z"
      }
    ],
    "totalElements": 14,
    "totalPages": 1,
    "number": 0,
    "size": 50
  }
}
```

`displayName` derivation: `"${profile.firstName} ${profile.lastName}"` if the user has a profile with at least one non-blank name part; otherwise falls back to `user.email`.

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `INVALID_BOOKING_STATUS` | `status` present and not one of the allowed values |
| 401 | `UNAUTHORIZED` | No valid Bearer token |
| 403 | `ACCESS_DENIED` | Caller is not `ADMIN` |
| 404 | `CLASS_INSTANCE_NOT_FOUND` | `classId` does not reference an existing, non-deleted class instance |

**Business logic:**
1. Resolve the class instance by `classId` where `deletedAt IS NULL`; throw `ClassInstanceNotFoundException` if absent.
2. Count current CONFIRMED bookings for the instance for the summary header.
3. Validate optional `status` filter.
4. Query `bookings` for the class, left-joined to `user_profiles` for display name resolution.
5. Default filter: `status = CONFIRMED`. When `status = ALL`, no status filter applied.
6. Paginate and sort by `booked_at ASC`.
7. Return 200 with `AdminAttendeeListResponse`.

---

## 3. Domain and DTOs

### Booking.kt — no changes needed
Existing entity is correct. Do not add fields.

### BookingResponse.kt — field `cancellationCutoffAt` semantic change only
The field `cancellationCutoffAt: OffsetDateTime` continues to exist. Its value changes from `scheduledAt - 3h` to `scheduledAt - 2h`. No Kotlin type or field name change.

### New DTO: AdminUserBookingHistoryResponse.kt
```kotlin
package com.gymflow.dto

import java.time.OffsetDateTime
import java.util.UUID

data class AdminUserBookingHistoryItemResponse(
    val bookingId: UUID,
    val classInstanceId: UUID,
    val className: String,
    val scheduledAt: OffsetDateTime,
    val status: String,
    val bookedAt: OffsetDateTime,
    val cancelledAt: OffsetDateTime?
)
```

Pagination is handled by Spring's `Page<AdminUserBookingHistoryItemResponse>` envelope — no wrapper type needed.

### New DTO: AdminAttendeeResponse.kt
```kotlin
package com.gymflow.dto

import java.time.OffsetDateTime
import java.util.UUID

data class AdminAttendeeItemResponse(
    val bookingId: UUID,
    val memberId: UUID,
    val displayName: String,
    val status: String,
    val bookedAt: OffsetDateTime
)

data class AdminAttendeeListResponse(
    val classInstanceId: UUID,
    val className: String,
    val scheduledAt: OffsetDateTime,
    val capacity: Int,
    val confirmedCount: Long,
    val attendees: org.springframework.data.domain.Page<AdminAttendeeItemResponse>
)
```

### ErrorCode.kt additions
Add to the `ErrorCode` enum:
- `USER_BOOKING_HISTORY_NOT_FOUND` — not needed; reuse existing `USER_NOT_FOUND`
- `CLASS_INSTANCE_NOT_FOUND` — add if not already present (check current enum before adding)

Remove from `ErrorCode` enum if present:
- `ALREADY_BOOKED` — this code is removed from all new booking-creation paths. The enum value may remain for legacy admin-booking backward compatibility but must not be thrown by `createBooking` or `createBookingForUser`.

### Existing domain exceptions

`AlreadyBookedException` class remains defined in `BookingService.kt` for backward compatibility with `GlobalExceptionHandler`. It is no longer thrown by booking creation.

---

## 4. Service Rules

### BookingService — createBookingInternal (modified)

Remove these two blocks (file: `backend/src/main/kotlin/com/gymflow/service/BookingService.kt`):

**Lines 153–155 (ALREADY_BOOKED pre-check):**
```kotlin
if (bookingRepository.findConfirmedByUserIdAndClassId(targetUserId, classId) != null) {
    throw AlreadyBookedException("Already booked")
}
```
Delete entirely. The repository method `findConfirmedByUserIdAndClassId` may be retained for the schedule enrichment usage but is no longer called in the booking creation path.

**Lines 171–175 (DataIntegrityViolationException rethrow):**
```kotlin
val saved = try {
    bookingRepository.save(booking)
} catch (ex: DataIntegrityViolationException) {
    throw AlreadyBookedException("Already booked")
}
```
Replace with a plain save:
```kotlin
val saved = bookingRepository.save(booking)
```
The partial unique index no longer exists after V21, so no `DataIntegrityViolationException` will occur for duplicate confirmed bookings.

**CANCELLATION_CUTOFF_HOURS constant (line 243):**
```kotlin
private const val CANCELLATION_CUTOFF_HOURS = 3L
```
Change to:
```kotlin
private const val CANCELLATION_CUTOFF_HOURS = 2L
```
This single constant governs all cutoff computations: `cancelBooking` (lines 96–97) and `toResponse` (line 197). No other changes are needed for the cutoff.

### BookingService — new methods

```kotlin
@Transactional(readOnly = true)
fun getAdminUserBookings(targetUserId: UUID, status: String?, pageable: Pageable): Page<AdminUserBookingHistoryItemResponse> {
    // 1. Verify user exists and is a non-deleted USER account
    userRepository.findByIdAndRoleAndDeletedAtIsNull(targetUserId, "USER")
        ?: throw UserNotFoundException("User not found")
    // 2. Validate optional status filter
    val normalizedStatus = status?.let(::normalizeStatus)
    // 3. Query bookings + class_instances for the user
    // 4. Map to AdminUserBookingHistoryItemResponse
    // 5. Return paged result sorted by scheduledAt DESC by default
}

@Transactional(readOnly = true)
fun getClassAttendees(classId: UUID, status: String?, pageable: Pageable): AdminAttendeeListResponse {
    // 1. Resolve class instance (deletedAt IS NULL); throw ClassInstanceNotFoundException if absent
    // 2. Count current CONFIRMED bookings for summary header
    // 3. Validate optional status filter (also accepts "ALL")
    // 4. Query bookings for the class, left-join user_profiles for displayName
    // 5. Apply status filter: default CONFIRMED; "ALL" applies no filter
    // 6. Paginate, sort bookedAt ASC
    // 7. Resolve displayName: firstName + lastName if present, email fallback
    // 8. Return AdminAttendeeListResponse
}
```

### UserClassScheduleService — schedule entry enrichment (modified)

File: `backend/src/main/kotlin/com/gymflow/service/UserClassScheduleService.kt`

**Line 66–73 — `cancellationAllowed` and `bookingDeniedReason`:**

Replace:
```kotlin
val cancellationAllowed = currentUserBooking != null &&
    now.isBefore(instance.scheduledAt.minusHours(3))
val bookingDeniedReason = when {
    currentUserBooking != null -> "ALREADY_BOOKED"
    !instance.scheduledAt.isAfter(now) -> "CLASS_ALREADY_STARTED"
    confirmedBookings >= instance.capacity.toLong() -> "CLASS_FULL"
    !hasActiveMembership -> "MEMBERSHIP_REQUIRED"
    else -> null
}
```

With:
```kotlin
val cancellationAllowed = currentUserBooking != null &&
    now.isBefore(instance.scheduledAt.minusHours(2))
val bookingDeniedReason = when {
    !instance.scheduledAt.isAfter(now) -> "CLASS_ALREADY_STARTED"
    confirmedBookings >= instance.capacity.toLong() -> "CLASS_FULL"
    !hasActiveMembership -> "MEMBERSHIP_REQUIRED"
    else -> null
}
```

`currentUserBooking` selection when a member holds multiple CONFIRMED bookings: use the most recent by `bookedAt`. The repository method `findConfirmedByUserIdAndClassIds` returns a list — the schedule service must select the max-`bookedAt` booking per classId when multiple exist. Update `findConfirmedBookingsByUserAndClassIds` in `BookingService` accordingly:
```kotlin
return bookingRepository.findConfirmedByUserIdAndClassIds(userId, classIds)
    .groupBy { it.classId }
    .mapValues { (_, bookings) -> bookings.maxByOrNull { it.bookedAt }!! }
```

### Capacity concurrency — unchanged

`PESSIMISTIC_WRITE` lock on `class_instances` before counting CONFIRMED bookings and inserting remains the correct concurrency guard. With duplicates allowed, the final-spot race is now: two requests may both pass the capacity check under load. The row lock serializes them, so at most one inserts past capacity=0. This is correct.

### GlobalExceptionHandler additions

Add handlers for:
- `ClassInstanceNotFoundException` → `404 CLASS_INSTANCE_NOT_FOUND`

Update existing handler for `CancellationWindowClosedException`:
```kotlin
ErrorResponse(error = "You can no longer cancel within 2 hours of class start", code = "CANCELLATION_WINDOW_CLOSED")
```
(was "3 hours")

---

## 5. Frontend Contract

### TypeScript Types

**Remove from existing types:**
```ts
// Remove from BookingDeniedReason union:
| 'ALREADY_BOOKED'   // deleted
```

**Updated `BookingDeniedReason`:**
```ts
export type BookingDeniedReason =
  | 'MEMBERSHIP_REQUIRED'
  | 'CLASS_ALREADY_STARTED'
  | 'CLASS_FULL'
```

**New types (add to `frontend/src/types/booking.ts`):**
```ts
export interface AdminUserBookingHistoryItem {
  bookingId: string
  classInstanceId: string
  className: string
  scheduledAt: string
  status: BookingStatus
  bookedAt: string
  cancelledAt: string | null
}

export interface PaginatedAdminUserBookingHistoryResponse {
  content: AdminUserBookingHistoryItem[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface AdminAttendeeItem {
  bookingId: string
  memberId: string
  displayName: string
  status: BookingStatus
  bookedAt: string
}

export interface AdminAttendeeListResponse {
  classInstanceId: string
  className: string
  scheduledAt: string
  capacity: number
  confirmedCount: number
  attendees: {
    content: AdminAttendeeItem[]
    totalElements: number
    totalPages: number
    number: number
    size: number
  }
}
```

### Axios API Functions (add to `frontend/src/api/bookings.ts`)

```ts
export function getAdminUserBookings(
  userId: string,
  params?: { status?: BookingStatus | 'ALL'; page?: number; size?: number }
): Promise<PaginatedAdminUserBookingHistoryResponse>

export function getClassAttendees(
  classId: string,
  params?: { status?: BookingStatus | 'ALL'; page?: number; size?: number }
): Promise<AdminAttendeeListResponse>
```

Existing functions are unchanged in signature. The `isCancellable` field returned from the backend now reflects the 2h cutoff — no frontend constant to update.

### Zustand Store additions (bookingStore.ts)

No changes to existing store interface are required. The two new admin queries are read-only one-shot fetches — implement them as standalone hooks, not store slices, to avoid polluting member-facing booking state:

```ts
// frontend/src/hooks/useAdminUserBookings.ts
export function useAdminUserBookings(
  userId: string,
  params?: { status?: string; page?: number; size?: number }
): { data: PaginatedAdminUserBookingHistoryResponse | null; isLoading: boolean; error: string | null }

// frontend/src/hooks/useClassAttendees.ts
export function useClassAttendees(
  classId: string,
  params?: { status?: string; page?: number; size?: number }
): { data: AdminAttendeeListResponse | null; isLoading: boolean; error: string | null }
```

### Routes to register

| Route | Component | Auth guard |
|-------|-----------|-----------|
| `/profile/bookings` | `MyBookingsPage` | `UserRoute` |
| `/admin/users/:id` | `AdminUserDetailPage` (new scaffold) | `AdminRoute` — see Section 2 dependency note |

`/admin/users/:id` does not exist yet. The developer must scaffold a minimal `AdminUserDetailPage` that hosts `AdminUserBookingHistoryPanel`. The page can be a simple shell with the user's email as a heading; rich user profile display is out of scope for this feature.

### Error code to user message mapping

| Code | Message | Where shown |
|------|---------|-------------|
| `MEMBERSHIP_REQUIRED` | `Active membership required to book.` | `BookableClassCard`, `BookingConfirmModal` |
| `CLASS_FULL` | `This class is fully booked.` | `BookableClassCard`, `BookingConfirmModal`, `BookingToast` |
| `CLASS_ALREADY_STARTED` | `Booking is closed — this class has already started.` | `BookableClassCard`, `BookingConfirmModal` |
| `CLASS_NOT_BOOKABLE` | `This class is no longer open for booking.` | `BookingConfirmModal` |
| `CANCELLATION_WINDOW_CLOSED` | `You can no longer cancel within 2 hours of class start.` | `CancelBookingModal`, locked-cancel helper text |
| `BOOKING_NOT_ACTIVE` | `This booking can no longer be cancelled.` | `CancelBookingModal` |
| `NOT_FOUND` (booking) | `Booking not found. Please refresh.` | `CancelBookingModal` |
| `USER_NOT_FOUND` | Not shown to end users; admin-only surface, show inline error banner. | `AdminUserBookingHistoryPanel` |
| `CLASS_INSTANCE_NOT_FOUND` | Not shown to end users; admin-only surface, show inline error banner. | `AdminAttendeeListPanel` |
| Generic / 5xx | `Something went wrong. Please try again.` | Any modal or page error banner |

`ALREADY_BOOKED` is removed from the error map. Remove it from `src/utils/errorMessages.ts`.

### Schedule entry card state derivation (updated)

The `ALREADY_BOOKED` branch is removed from card state logic. New decision tree:

```
if scheduledAt <= now → "Class in progress / past" (no CTA)
else if bookingDeniedReason === 'CLASS_FULL' → "Fully booked" (no CTA)
else if bookingDeniedReason === 'MEMBERSHIP_REQUIRED' → "Active plan required" (Browse plans CTA)
else if currentUserBooking !== null && cancellationAllowed → "Booked (cancellable)" — show Book spot + cancel strip
else if currentUserBooking !== null && !cancellationAllowed → "Booked (locked)" — show Book spot + locked cancel strip
else (bookingAllowed) → "Available" — show Book spot CTA
```

When a member holds multiple CONFIRMED bookings for the same instance, `currentUserBooking` reflects the most recent booking (highest `bookedAt`). The `Book spot` CTA remains active if capacity allows.

---

## 6. Migration from Existing Behavior

This section maps every behavioral change from the superseded `docs/sdd/class-booking-cancellation.md` to exact file and line references in the current codebase.

### Change 1 — Cancellation cutoff: 3h → 2h

| Location | What to change |
|----------|---------------|
| `backend/src/main/kotlin/com/gymflow/service/BookingService.kt` line 243 | `CANCELLATION_CUTOFF_HOURS = 3L` → `CANCELLATION_CUTOFF_HOURS = 2L` |
| `backend/src/main/kotlin/com/gymflow/service/UserClassScheduleService.kt` line 67 | `.minusHours(3)` → `.minusHours(2)` |
| `backend/src/main/kotlin/com/gymflow/controller/GlobalExceptionHandler.kt` line 526 | Error message string `"...3 hours..."` → `"You can no longer cancel within 2 hours of class start"` |

The constant in `BookingService.kt` governs both `cancelBooking` and `toResponse` (lines 96–97 and 197). The `UserClassScheduleService.kt` line 67 is a separate hardcoded literal that also needs updating.

### Change 2 — Duplicate bookings: now allowed

| Location | What to remove |
|----------|---------------|
| `backend/src/main/kotlin/com/gymflow/service/BookingService.kt` lines 153–155 | Remove `findConfirmedByUserIdAndClassId` call and `AlreadyBookedException` throw |
| `backend/src/main/kotlin/com/gymflow/service/BookingService.kt` lines 171–175 | Replace try/catch block with plain `bookingRepository.save(booking)` |
| `backend/src/main/kotlin/com/gymflow/service/UserClassScheduleService.kt` lines 68–69 | Remove `currentUserBooking != null -> "ALREADY_BOOKED"` branch |
| DB: `V21__update_bookings_allow_duplicates.sql` | Drop `uidx_bookings_one_confirmed_per_user_class` |

`AlreadyBookedException` class definition and its `GlobalExceptionHandler` mapping remain in code (they are still invoked by the out-of-scope admin on-behalf booking path which retains `ALREADY_BOOKED` from the superseded spec). They must not be deleted.

### Change 3 — Admin on-behalf booking: left in code, out of scope for UI/tests

`POST /api/v1/admin/bookings` and `AdminBookForMemberPanel` are not changed by this SDD but also not covered by this feature's test matrix. The ALREADY_BOOKED check inside `createBookingForUser` (via `createBookingInternal`) will be removed by Change 2 — this is an acceptable side effect and aligns with the PRD's duplicate-allowed rule.

### Change 4 — New admin read endpoints

Two new backend endpoints and two new frontend components are net additions. No superseded equivalent exists.

### Change 5 — New member cabinet page at `/profile/bookings`

Net addition. The `MyBookingsDrawer` on `/schedule` retains the footer link. No superseded equivalent exists.

### Change 6 — `bookingDeniedReason` field no longer emits `ALREADY_BOOKED`

Frontend code that checks `bookingDeniedReason === 'ALREADY_BOOKED'` must be found and deleted. That state was previously used to render an "already booked" disabled card — this UI state is removed entirely per the design spec.

---

## 7. Test Plan

### AC → test coverage matrix

| AC | Test type | Description |
|----|-----------|-------------|
| AC-1: Member books SCHEDULED class under capacity | Unit (BookingService), Integration (UserBookingController), E2E (BOOKING-01) | Happy path create; confirm 201, status=CONFIRMED, confirmedCount +1 |
| AC-2a: No active plan → reject | Unit (BookingService) | `MembershipRequiredException` thrown; no booking row |
| AC-2b: Class full → reject | Unit (BookingService), E2E (BOOKING-02) | `ClassFullException` at or above capacity |
| AC-2c: Class already started → reject | Unit (BookingService) | `ClassAlreadyStartedException` |
| AC-2d: Class not found → reject | Unit (BookingService) | `ClassNotFoundException` |
| AC-2 (same instance, already booked) → allowed | Unit (BookingService) | Create second booking on same instance — 201 returned, two CONFIRMED rows exist |
| AC-3: Race for final spot | Integration (concurrent requests via two transactions) | Both request same final spot; one 201, one 409 CLASS_FULL; DB count never exceeds capacity |
| AC-3 (duplicate allowed, overlapping allowed) | Unit | No personal-conflict check exists; test verifies overlapping class bookings produce 201 twice |
| AC-4: Cancel outside 2h window | Unit (BookingService), E2E (BOOKING-03) | `scheduledAt - 2h - 1s` → 200 CANCELLED; `booking.cancelledAt` set |
| AC-4: Cancel inside 2h window | Unit (BookingService), E2E (BOOKING-04) | `scheduledAt - 2h + 1s` → 409 CANCELLATION_WINDOW_CLOSED |
| AC-4: Cancel non-CONFIRMED | Unit | 409 BOOKING_NOT_ACTIVE |
| AC-4: Cancel other user's booking | Unit | 404 BOOKING_NOT_FOUND (ownership check) |
| AC-5a: MyBookingsDrawer on /schedule | E2E (BOOKING-05) | Drawer opens, shows CONFIRMED upcoming booking, cancel CTA visible within 2h gate |
| AC-5b: /profile/bookings page | E2E (BOOKING-06) | Page loads, Upcoming and Past/Cancelled groups populated, status filter works, cancel action in 2h gate |
| AC-6: Admin per-user booking history | Unit (BookingService), Integration (AdminBookingController), E2E (BOOKING-07) | 200 with paged rows; 404 for unknown userId; 403 for USER caller |
| AC-7: Admin attendee list | Unit (BookingService), Integration (AdminBookingController), E2E (BOOKING-08) | 200 with confirmedCount/capacity header, attendee rows; 404 for unknown classId; 403 for USER caller |

### Unit test cases (BookingService)

- `createBooking`: success path — inserts booking, increments `bookingsUsedThisMonth`
- `createBooking`: no membership — throws `MembershipRequiredException` before any write
- `createBooking`: class not found — throws `ClassNotFoundException`
- `createBooking`: class not bookable (type != GROUP) — throws `ClassNotBookableException`
- `createBooking`: class already started — throws `ClassAlreadyStartedException`
- `createBooking`: class full — throws `ClassFullException`
- `createBooking`: same user, same instance — second call returns 201 (ALREADY_BOOKED not thrown)
- `cancelBooking`: outside 2h window — sets status=CANCELLED, sets cancelledAt
- `cancelBooking`: inside 2h window — throws `CancellationWindowClosedException`
- `cancelBooking`: booking not CONFIRMED — throws `BookingNotActiveException`
- `cancelBooking`: wrong user — throws `BookingNotFoundException`
- `getAdminUserBookings`: unknown userId — throws `UserNotFoundException`
- `getAdminUserBookings`: invalid status — throws `InvalidBookingStatusException`
- `getClassAttendees`: unknown classId — throws `ClassInstanceNotFoundException`
- `getClassAttendees`: displayName fallback to email when no profile

### Integration test cases (controller layer)

- `POST /api/v1/bookings` — 201 shape, including `cancellationCutoffAt = scheduledAt - 2h`
- `POST /api/v1/bookings` — 403 MEMBERSHIP_REQUIRED
- `POST /api/v1/bookings` — 409 CLASS_FULL
- `DELETE /api/v1/bookings/{id}` — 200 with updated booking
- `DELETE /api/v1/bookings/{id}` — 409 CANCELLATION_WINDOW_CLOSED (error message text = "2 hours")
- `GET /api/v1/bookings/me` — 200 paged; `isCancellable` reflects 2h rule
- `GET /api/v1/admin/users/{userId}/bookings` — 200 for ADMIN; 403 for USER caller
- `GET /api/v1/admin/users/{userId}/bookings` — 404 USER_NOT_FOUND
- `GET /api/v1/admin/classes/{classId}/attendees` — 200 for ADMIN; 403 for USER caller
- `GET /api/v1/admin/classes/{classId}/attendees` — 404 CLASS_INSTANCE_NOT_FOUND
- `GET /api/v1/class-schedule` — response no longer contains `bookingDeniedReason = ALREADY_BOOKED` when user has existing booking; `bookingAllowed = true` if capacity available
- `GET /api/v1/class-schedule` — `cancellationAllowed` is false when `scheduledAt - now < 2h`

### E2E test cases (Playwright — `frontend/e2e/class-booking.spec.ts`)

| ID | AC | Description |
|----|-----|-------------|
| BOOKING-01 | AC-1 | Member books a SCHEDULED class; card transitions to Booked state; BookingToast shown |
| BOOKING-02 | AC-2b | Class at capacity shows Fully booked badge; Book spot CTA absent |
| BOOKING-03 | AC-4 | Cancel outside 2h window succeeds; card resets to Available state |
| BOOKING-04 | AC-4 | Cancel inside 2h window: cancel button disabled; modal not opened; if raced via API, returns CANCELLATION_WINDOW_CLOSED with "2 hours" in message |
| BOOKING-05 | AC-5a | MyBookingsDrawer shows Upcoming and Past groups; footer link navigates to /profile/bookings |
| BOOKING-06 | AC-5b | /profile/bookings loads; status filter narrows list; cancel CTA visible for eligible bookings |
| BOOKING-07 | AC-6 | Admin at /admin/users/{id} sees booking history table with status filter; non-admin gets 403 |
| BOOKING-08 | AC-7 | Admin opens ClassInstanceEditPanel Attendees tab; confirmedCount/capacity visible; rows show displayName |

---

## Risks and Notes

1. **`/admin/users/{id}` route does not exist.** The `AdminUserBookingHistoryPanel` is self-contained by design, but the developer must scaffold a minimal `AdminUserDetailPage` shell at this route. A minimal approach: resolve the user's email from the existing `GET /api/v1/admin/users/{userId}/photo` resource or add a dedicated `GET /api/v1/admin/users/{userId}` summary endpoint. The SDD does not prescribe the exact admin user-detail endpoint shape; the developer should check if one is being built in a parallel feature before adding a new one.

2. **`ALREADY_BOOKED` in `ErrorCode` enum.** Do not delete the enum value. The `GlobalExceptionHandler` mapping for `AlreadyBookedException` must be retained; the admin on-behalf-booking path (`createBookingForUser`) no longer throws it due to Change 2, but `AlreadyBookedException` and its handler must remain compilable.

3. **`findConfirmedByUserIdAndClassId` repository method.** It is called only in `createBookingInternal` (now removed). It may still be useful for other diagnostics or future code. Leave the repository method in place but remove all call sites in the booking creation path.

4. **Multiple bookings per class in `findConfirmedBookingsByUserAndClassIds`.** The schedule enrichment code associates one booking per classId via `associateBy { it.classId }`. With duplicates allowed, this collapses multiple confirmed bookings to one using associateBy's last-write-wins behavior. This should be made explicit: use `groupBy` + `maxByOrNull { it.bookedAt }` to always select the most recent booking deterministically. File: `backend/src/main/kotlin/com/gymflow/service/BookingService.kt` line 137.

5. **Open question — admin member-detail page scope.** The design spec places the booking history inside `/admin/users/{id}`. No existing page exists at that route. Assumption made: the developer scaffolds a minimal page. If a separate feature builds the full admin member-detail page, the `AdminUserBookingHistoryPanel` drops in as a section without changes.

6. **Open question — `maxBookingsPerMonth` enforcement.** The PRD explicitly excludes this. The `bookingsUsedThisMonth` increment on booking creation remains in place for tracking. No enforcement gate is added.

7. **DB constraint check on V21.** Before running V21 in any environment, verify no data exists that would be invalidated. The `uidx_bookings_one_confirmed_per_user_class` drop is safe even if duplicate rows already exist (which they cannot, because the constraint was previously enforced). The new index `idx_bookings_user_id_class_id` is a plain non-unique index and is always safe to add.

8. **Error message text in `GlobalExceptionHandler`.** The string `"You can no longer cancel within 3 hours of class start"` (line 526) is the only user-visible string that embeds "3 hours." Update it to "2 hours" before delivery.
