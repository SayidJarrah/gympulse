# SDD: Class Booking & Cancellation

## Reference
- PRD: `docs/prd/class-booking-cancellation.md`
- Date: 2026-04-04

## Architecture Overview
This feature introduces the `bookings` domain and turns the existing member schedule from read-only into an actionable booking surface. It reuses `class_instances` as the single source of truth for class validity and timing, reuses `user_memberships` for the active-membership gate on booking creation, and extends the existing member schedule response with booking and spot state so the frontend does not need to stitch together separate availability APIs.

This feature also deliberately changes one existing contract from the Group Classes Schedule View design: `/api/v1/class-schedule` remains `USER`-only, but it is no longer gated by active membership. Any authenticated `USER` may browse the schedule; only booking creation is membership-gated. That change is required by `docs/prd/class-booking-cancellation.md` and `docs/design/class-booking-cancellation.md`.

Layers affected: **DB / Backend / Frontend**.

Confirmed design decisions used in this SDD:
- Booking is persisted in a new `bookings` table; no denormalized confirmed-booking counter is added to `class_instances`.
- Final-spot concurrency is enforced by pessimistically locking the target `class_instances` row inside the booking transaction plus a partial unique index preventing duplicate confirmed bookings for the same user/class.
- `bookingsUsedThisMonth` on `user_memberships` is incremented atomically on successful booking creation. It is not decremented on cancellation; in this phase it represents monthly booking usage, not currently held reservations.
- Schedule cards receive booking state and remaining-spot data from `GET /api/v1/class-schedule`; the frontend does not call a second availability endpoint per class.
- Member self-service booking entry points exist on `/schedule` only in v1. Member Home preview booking is deferred.

---

## 1. Database Changes

### New Tables

```sql
CREATE TABLE bookings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  class_id      UUID        NOT NULL REFERENCES class_instances(id) ON DELETE RESTRICT,
  status        VARCHAR(10) NOT NULL DEFAULT 'CONFIRMED',
  booked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  CONSTRAINT chk_bookings_status
    CHECK (status IN ('CONFIRMED', 'CANCELLED', 'ATTENDED')),
  CONSTRAINT chk_bookings_cancelled_at_consistency
    CHECK (
      (status = 'CANCELLED' AND cancelled_at IS NOT NULL) OR
      (status IN ('CONFIRMED', 'ATTENDED') AND cancelled_at IS NULL)
    ),
  CONSTRAINT chk_bookings_cancelled_after_booked
    CHECK (cancelled_at IS NULL OR cancelled_at >= booked_at)
);

CREATE INDEX idx_bookings_user_id_status_booked_at
  ON bookings (user_id, status, booked_at DESC);

CREATE INDEX idx_bookings_class_id_status
  ON bookings (class_id, status);

CREATE UNIQUE INDEX uidx_bookings_one_confirmed_per_user_class
  ON bookings (user_id, class_id)
  WHERE status = 'CONFIRMED';

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

Design notes:
- `ON DELETE RESTRICT` is intentional on both FKs. Once bookings exist, a class instance or user must not be hard-deleted out from under historical reservations.
- `deleted_at` is included to follow the project soft-delete convention, but functional lifecycle is driven by `status`.
- The partial unique index allows re-booking after a prior cancellation while still preventing two concurrent `CONFIRMED` rows for the same user/class pair.
- `cancelled_at` is stored because cancellation-window behavior is part of the feature and audit/debugging around late-cancellation complaints is materially easier with an explicit timestamp.

### Modified Tables
None.

### Flyway Migration
`V20__create_bookings_table.sql`

---

## 2. Backend API Contract

### POST /api/v1/bookings
**Auth:** Required (`USER` role only, plus current accessible ACTIVE membership)

**Request Body:**
```json
{
  "classId": "9e8c2dc7-0f53-42a8-a8d7-0e84f6fdd9b5"
}
```

**Success Response (201):**
```json
{
  "id": "99bc2d17-b0f0-4d88-aa54-8423251b9b8c",
  "userId": "0bf8a961-d42a-46e7-bd95-1f76673a876f",
  "classId": "9e8c2dc7-0f53-42a8-a8d7-0e84f6fdd9b5",
  "status": "CONFIRMED",
  "bookedAt": "2026-04-04T12:15:00Z",
  "cancelledAt": null,
  "className": "Yoga Flow",
  "scheduledAt": "2026-04-06T16:00:00Z",
  "durationMin": 60,
  "trainerNames": ["Jane Doe"],
  "classPhotoUrl": "/api/v1/class-templates/7f5bc745-126a-41e9-a587-3f3fe9616e29/photo",
  "isCancellable": true,
  "cancellationCutoffAt": "2026-04-06T13:00:00Z"
}
```

**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 400 | `INVALID_CLASS_ID` | `classId` missing, blank, or not parseable as UUID |
| 401 | `UNAUTHORIZED` | No valid Bearer token |
| 403 | `MEMBERSHIP_REQUIRED` | Caller is a `USER` without an accessible active membership |
| 404 | `CLASS_NOT_FOUND` | `classId` does not exist or the class row is soft-deleted |
| 409 | `CLASS_NOT_BOOKABLE` | Class exists but `type != 'GROUP'` or `status != 'SCHEDULED'` |
| 409 | `CLASS_ALREADY_STARTED` | `scheduledAt <= now()` |
| 409 | `ALREADY_BOOKED` | Caller already has a `CONFIRMED` booking for the same class |
| 409 | `CLASS_FULL` | Confirmed bookings are already equal to or greater than class capacity |

**Business Logic:**
1. Extract `userId` from the authenticated principal.
2. Validate `classId`; malformed UUID payloads are mapped to `400 INVALID_CLASS_ID`.
3. Resolve the caller’s accessible active membership with `findAccessibleActiveMembership(userId, todayUtcDate)`.
4. If no accessible membership row exists, throw `MembershipRequiredException` before any booking write.
5. Lock the target `class_instances` row by ID with `PESSIMISTIC_WRITE`.
6. If the class row does not exist or `deleted_at IS NOT NULL`, throw `CLASS_NOT_FOUND`.
7. If `type != 'GROUP'` or `status != 'SCHEDULED'`, throw `CLASS_NOT_BOOKABLE`.
8. If `scheduled_at <= nowUtc`, throw `CLASS_ALREADY_STARTED`.
9. Check for an existing `CONFIRMED` booking for `(userId, classId)`; if found, throw `ALREADY_BOOKED`.
10. Count `CONFIRMED` bookings for the class while the class row lock is held.
11. If `confirmedCount >= class.capacity`, throw `CLASS_FULL`.
12. Insert the new booking with `status = 'CONFIRMED'` and `booked_at = nowUtc`.
13. Increment `user_memberships.bookings_used_this_month` by `1` on the membership row used in Step 3 in the same transaction.
14. If the insert trips the partial unique index, catch `DataIntegrityViolationException` and rethrow `ALREADY_BOOKED`.
15. Return `201` with the full `BookingResponse`.

Idempotency:
- Not idempotent.
- Two identical concurrent requests for the same user/class may resolve as `201` then `409 ALREADY_BOOKED`.

### GET /api/v1/bookings/me
**Auth:** Required (`USER` role only). Active membership is not required.

**Query Parameters:**
- `status` optional, one of `CONFIRMED`, `CANCELLED`, `ATTENDED`
- `page` optional, default `0`
- `size` optional, default `20`

**Request Body:**
```json
{}
```

**Success Response (200):**
```json
{
  "content": [
    {
      "id": "99bc2d17-b0f0-4d88-aa54-8423251b9b8c",
      "userId": "0bf8a961-d42a-46e7-bd95-1f76673a876f",
      "classId": "9e8c2dc7-0f53-42a8-a8d7-0e84f6fdd9b5",
      "status": "CONFIRMED",
      "bookedAt": "2026-04-04T12:15:00Z",
      "cancelledAt": null,
      "className": "Yoga Flow",
      "scheduledAt": "2026-04-06T16:00:00Z",
      "durationMin": 60,
      "trainerNames": ["Jane Doe"],
      "classPhotoUrl": null,
      "isCancellable": true,
      "cancellationCutoffAt": "2026-04-06T13:00:00Z"
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 400 | `INVALID_BOOKING_STATUS` | `status` is present but not one of the allowed values |
| 401 | `UNAUTHORIZED` | No valid Bearer token |
| 403 | `ACCESS_DENIED` | Caller is not `USER` |

**Business Logic:**
1. Extract `userId` from the authenticated principal.
2. Validate the optional `status` filter.
3. Query the caller’s bookings, joining `class_instances`, `class_instance_trainers`, and `class_templates`.
4. Apply `status` if present.
5. Sort by `class_instances.scheduled_at ASC` by default.
6. Paginate at the database/query layer.
7. For each row, compute `isCancellable = (status == 'CONFIRMED' && nowUtc < scheduledAt.minusHours(3))`.
8. Return `200` with a Spring-style paginated envelope.

### DELETE /api/v1/bookings/{bookingId}
**Auth:** Required (`USER` role only). Active membership is not required.

**Request Body:**
```json
{}
```

**Success Response (200):**
```json
{
  "id": "99bc2d17-b0f0-4d88-aa54-8423251b9b8c",
  "userId": "0bf8a961-d42a-46e7-bd95-1f76673a876f",
  "classId": "9e8c2dc7-0f53-42a8-a8d7-0e84f6fdd9b5",
  "status": "CANCELLED",
  "bookedAt": "2026-04-04T12:15:00Z",
  "cancelledAt": "2026-04-04T13:30:00Z",
  "className": "Yoga Flow",
  "scheduledAt": "2026-04-06T16:00:00Z",
  "durationMin": 60,
  "trainerNames": ["Jane Doe"],
  "classPhotoUrl": null,
  "isCancellable": false,
  "cancellationCutoffAt": "2026-04-06T13:00:00Z"
}
```

**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 401 | `UNAUTHORIZED` | No valid Bearer token |
| 403 | `ACCESS_DENIED` | Caller is not `USER` |
| 404 | `BOOKING_NOT_FOUND` | Booking does not exist or does not belong to the caller |
| 409 | `BOOKING_NOT_ACTIVE` | Booking exists but status is not `CONFIRMED` |
| 409 | `CANCELLATION_WINDOW_CLOSED` | `nowUtc >= scheduledAt.minusHours(3)` |

**Business Logic:**
1. Resolve the booking by `(bookingId, userId)` without leaking other users’ bookings.
2. If no row matches, throw `BOOKING_NOT_FOUND`.
3. Lock the related `class_instances` row with `PESSIMISTIC_WRITE` to serialize against competing final-spot bookings.
4. Re-read the booking row with `PESSIMISTIC_WRITE`.
5. If `status != 'CONFIRMED'`, throw `BOOKING_NOT_ACTIVE`.
6. If `nowUtc >= scheduledAt.minusHours(3)`, throw `CANCELLATION_WINDOW_CLOSED`.
7. Update the booking to `status = 'CANCELLED'` and set `cancelled_at = nowUtc`.
8. Do not decrement `user_memberships.bookings_used_this_month`.
9. Return `200` with the updated `BookingResponse`.

Idempotency:
- Not idempotent.
- A repeated DELETE on the same booking returns `409 BOOKING_NOT_ACTIVE`.

### POST /api/v1/admin/bookings
**Auth:** Required (`ADMIN` role only)

**Request Body:**
```json
{
  "userId": "0bf8a961-d42a-46e7-bd95-1f76673a876f",
  "classId": "9e8c2dc7-0f53-42a8-a8d7-0e84f6fdd9b5"
}
```

**Success Response (201):**
```json
{
  "id": "99bc2d17-b0f0-4d88-aa54-8423251b9b8c",
  "userId": "0bf8a961-d42a-46e7-bd95-1f76673a876f",
  "classId": "9e8c2dc7-0f53-42a8-a8d7-0e84f6fdd9b5",
  "status": "CONFIRMED",
  "bookedAt": "2026-04-04T12:15:00Z",
  "cancelledAt": null,
  "className": "Yoga Flow",
  "scheduledAt": "2026-04-06T16:00:00Z",
  "durationMin": 60,
  "trainerNames": ["Jane Doe"],
  "classPhotoUrl": null,
  "isCancellable": true,
  "cancellationCutoffAt": "2026-04-06T13:00:00Z"
}
```

**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 400 | `INVALID_USER_ID` | `userId` missing, blank, or not parseable as UUID |
| 400 | `INVALID_CLASS_ID` | `classId` missing, blank, or not parseable as UUID |
| 401 | `UNAUTHORIZED` | No valid Bearer token |
| 403 | `ACCESS_DENIED` | Caller is not `ADMIN` |
| 404 | `USER_NOT_FOUND` | Target user does not exist, is soft-deleted, or is not a `USER` account |
| 404 | `CLASS_NOT_FOUND` | `classId` does not exist or the class row is soft-deleted |
| 409 | `CLASS_NOT_BOOKABLE` | Class exists but `type != 'GROUP'` or `status != 'SCHEDULED'` |
| 409 | `CLASS_ALREADY_STARTED` | `scheduledAt <= now()` |
| 409 | `ALREADY_BOOKED` | Target user already has a `CONFIRMED` booking for the same class |
| 409 | `CLASS_FULL` | Confirmed bookings are already equal to or greater than class capacity |

**Business Logic:**
1. Validate `userId` and `classId`.
2. Load the target user and ensure `role == 'USER'` and `deletedAt IS NULL`; otherwise return `USER_NOT_FOUND`.
3. Reuse the same booking transaction logic as self-booking, but skip the active-membership check entirely.
4. If the target user currently has an accessible active membership, increment `bookings_used_this_month` on that membership row by `1` inside the same transaction.
5. Return `201` with the full `BookingResponse`.

### GET /api/v1/admin/booking-members
**Auth:** Required (`ADMIN` role only)

**Query Parameters:**
- `query` optional; trimmed blank query returns an empty result set
- `page` optional, default `0`
- `size` optional, default `10`, max `20`

**Request Body:**
```json
{}
```

**Success Response (200):**
```json
{
  "content": [
    {
      "id": "0bf8a961-d42a-46e7-bd95-1f76673a876f",
      "email": "member@example.com",
      "firstName": "Anna",
      "lastName": "Nowak",
      "displayName": "Anna Nowak",
      "hasActiveMembership": false
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "number": 0,
  "size": 10
}
```

**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 401 | `UNAUTHORIZED` | No valid Bearer token |
| 403 | `ACCESS_DENIED` | Caller is not `ADMIN` |

**Business Logic:**
1. Trim the query string.
2. If the query is blank, return an empty page immediately.
3. Search only `USER` accounts where `deletedAt IS NULL`.
4. Match on:
   - user email contains query, case-insensitive
   - profile first name contains query, case-insensitive
   - profile last name contains query, case-insensitive
5. Left-join `user_profiles` so users without profiles still appear via email search.
6. Resolve `displayName` as `firstName + lastName` when available, otherwise `email`.
7. Resolve `hasActiveMembership` via the existing accessible-membership rule.
8. Sort by `lastName ASC NULLS LAST`, then `firstName ASC NULLS LAST`, then `email ASC`.

### GET /api/v1/class-schedule
**Auth:** Required (`USER` role only). Active membership is not required.

**Query Parameters:**
- `view` required, one of `week`, `day`, `list`
- `anchorDate` required, ISO date in `YYYY-MM-DD`
- `timeZone` required, IANA timezone name

**Request Body:**
```json
{}
```

**Success Response (200):**
```json
{
  "view": "week",
  "anchorDate": "2026-04-06",
  "timeZone": "Europe/Warsaw",
  "week": "2026-W15",
  "rangeStartDate": "2026-04-06",
  "rangeEndDateExclusive": "2026-04-13",
  "hasActiveMembership": true,
  "entries": [
    {
      "id": "9e8c2dc7-0f53-42a8-a8d7-0e84f6fdd9b5",
      "name": "Yoga Flow",
      "scheduledAt": "2026-04-06T16:00:00Z",
      "localDate": "2026-04-06",
      "durationMin": 60,
      "trainerNames": ["Jane Doe"],
      "classPhotoUrl": null,
      "capacity": 20,
      "confirmedBookings": 19,
      "remainingSpots": 1,
      "currentUserBooking": {
        "id": "99bc2d17-b0f0-4d88-aa54-8423251b9b8c",
        "status": "CONFIRMED",
        "bookedAt": "2026-04-04T12:15:00Z"
      },
      "bookingAllowed": false,
      "bookingDeniedReason": "ALREADY_BOOKED",
      "cancellationAllowed": true
    }
  ]
}
```

Field rules:
- `confirmedBookings` counts only `bookings.status = 'CONFIRMED'`
- `remainingSpots = max(capacity - confirmedBookings, 0)`
- `currentUserBooking` is `null` when the current user has no confirmed booking for that class
- `bookingDeniedReason` is one of `MEMBERSHIP_REQUIRED`, `CLASS_ALREADY_STARTED`, `CLASS_FULL`, `ALREADY_BOOKED`, or `null`
- `bookingAllowed` is `true` only when the class is future, not full, and the user has an accessible active membership and no confirmed booking for that class
- `cancellationAllowed` is `true` only when `currentUserBooking != null` and `nowUtc < scheduledAt.minusHours(3)`

**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 400 | `INVALID_SCHEDULE_VIEW` | Invalid `view` |
| 400 | `INVALID_ANCHOR_DATE` | Invalid `anchorDate` |
| 400 | `INVALID_TIME_ZONE` | Invalid `timeZone` |
| 401 | `UNAUTHORIZED` | No valid Bearer token |
| 403 | `ACCESS_DENIED` | Caller is not `USER` |

**Business Logic:**
1. Keep the existing date-range and timezone logic from the schedule feature.
2. Remove the hard active-membership gate from this endpoint.
3. Resolve `hasActiveMembership` once per request via `findAccessibleActiveMembership(userId, todayUtcDate) != null`.
4. Fetch visible group classes exactly as before: `deletedAt IS NULL`, `type = 'GROUP'`, `status = 'SCHEDULED'`, requested time window.
5. Batch-load confirmed booking counts for all returned class IDs.
6. Batch-load the caller’s confirmed bookings for those class IDs.
7. For each entry, compute `remainingSpots`, `bookingAllowed`, `bookingDeniedReason`, and `cancellationAllowed`.
8. Booked state takes precedence over membership-required/full state in the response mapping:
   - if `currentUserBooking != null`, `bookingDeniedReason = 'ALREADY_BOOKED'`
   - cancellation eligibility is computed separately
9. Return `200` even when `hasActiveMembership = false`; the UI blocks actions via returned entry state instead of a page-level 404.

### PATCH /api/v1/admin/class-instances/{id}
**Auth:** Required (`ADMIN` role only)

**Request Body:**
```json
{
  "scheduledAt": "2026-04-06T16:00:00Z",
  "durationMin": 60,
  "capacity": 20,
  "roomId": "7d9066da-b4d9-47ab-b7e6-c0f0e94f43ef",
  "trainerIds": ["c175f7f6-1629-48de-8ab9-6dc24e116d0b"]
}
```

**Success Response (200):**
```json
{
  "id": "9e8c2dc7-0f53-42a8-a8d7-0e84f6fdd9b5",
  "templateId": "7f5bc745-126a-41e9-a587-3f3fe9616e29",
  "name": "Yoga Flow",
  "type": "GROUP",
  "scheduledAt": "2026-04-06T16:00:00Z",
  "durationMin": 60,
  "capacity": 20,
  "room": {
    "id": "7d9066da-b4d9-47ab-b7e6-c0f0e94f43ef",
    "name": "Studio A",
    "photoUrl": null
  },
  "trainers": [
    {
      "id": "c175f7f6-1629-48de-8ab9-6dc24e116d0b",
      "firstName": "Jane",
      "lastName": "Doe"
    }
  ],
  "hasRoomConflict": false,
  "createdAt": "2026-04-01T09:00:00Z",
  "updatedAt": "2026-04-04T12:30:00Z"
}
```

**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 401 | `UNAUTHORIZED` | No valid Bearer token |
| 403 | `ACCESS_DENIED` | Caller is not `ADMIN` |
| 404 | `CLASS_INSTANCE_NOT_FOUND` | Class instance does not exist |
| 409 | `CAPACITY_BELOW_CONFIRMED_BOOKINGS` | Requested capacity is lower than current confirmed booking count |
| 409 | `TRAINER_SCHEDULE_CONFLICT` | Existing scheduler rule still applies |
| 422 | `VALIDATION_ERROR` | Existing slot validation still applies |

**Business Logic:**
1. Keep all existing scheduler edit behavior.
2. Before saving, count `CONFIRMED` bookings for the instance.
3. If requested `capacity < confirmedBookings`, reject with `409 CAPACITY_BELOW_CONFIRMED_BOOKINGS`.
4. Return the existing `ClassInstanceResponse` shape unchanged.

### DELETE /api/v1/admin/class-instances/{id}
**Auth:** Required (`ADMIN` role only)

**Request Body:**
```json
{}
```

**Success Response (204):**
```json
{}
```

**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 401 | `UNAUTHORIZED` | No valid Bearer token |
| 403 | `ACCESS_DENIED` | Caller is not `ADMIN` |
| 404 | `CLASS_INSTANCE_NOT_FOUND` | Class instance does not exist |
| 409 | `CLASS_HAS_ACTIVE_BOOKINGS` | At least one `CONFIRMED` booking exists for the class |

**Business Logic:**
1. Keep the existing admin delete endpoint.
2. Before delete, count confirmed bookings for the class.
3. If the count is greater than `0`, reject with `409 CLASS_HAS_ACTIVE_BOOKINGS`.
4. If no active bookings exist, delete as before.

---

## 3. Backend Files / Classes to Create or Modify

### New Files
| File | Type | Purpose |
|------|------|---------|
| `backend/src/main/resources/db/migration/V20__create_bookings_table.sql` | Flyway migration | Creates the `bookings` table, indexes, partial unique constraint, and trigger |
| `backend/src/main/kotlin/com/gymflow/domain/Booking.kt` | Entity | Persists member bookings against class instances |
| `backend/src/main/kotlin/com/gymflow/repository/BookingRepository.kt` | Repository | Booking lookups, counts, duplicate checks, owner lookup, and locking queries |
| `backend/src/main/kotlin/com/gymflow/dto/BookingRequest.kt` | DTO | Self-booking request body |
| `backend/src/main/kotlin/com/gymflow/dto/AdminBookingRequest.kt` | DTO | Admin on-behalf booking request body |
| `backend/src/main/kotlin/com/gymflow/dto/BookingResponse.kt` | DTO | Shared booking response contract for create/list/cancel |
| `backend/src/main/kotlin/com/gymflow/dto/AdminBookingMemberSummaryResponse.kt` | DTO | Admin member-search result rows |
| `backend/src/main/kotlin/com/gymflow/controller/UserBookingController.kt` | REST controller | Exposes self-booking create/list/cancel endpoints |
| `backend/src/main/kotlin/com/gymflow/controller/AdminBookingController.kt` | REST controller | Exposes admin on-behalf booking create plus member search |
| `backend/src/main/kotlin/com/gymflow/service/BookingService.kt` | Service | Owns booking creation, cancellation, listing, schedule enrichment helpers, and admin member search |
| `backend/src/test/kotlin/com/gymflow/service/BookingServiceTest.kt` | Test | Covers booking create/cancel/list behavior, membership gate, duplicate booking, full class, cutoff, and counter increment |
| `backend/src/test/kotlin/com/gymflow/controller/UserBookingControllerTest.kt` | Test | Covers 201/200/400/401/403/404/409 user-booking contracts |
| `backend/src/test/kotlin/com/gymflow/controller/AdminBookingControllerTest.kt` | Test | Covers admin create/search contracts and `ACCESS_DENIED` behavior |

### Modified Files
| File | Change |
|------|--------|
| `backend/src/main/kotlin/com/gymflow/dto/UserClassScheduleResponse.kt` | Extend schedule entry contract with booking state, remaining spots, and `hasActiveMembership` at root |
| `backend/src/main/kotlin/com/gymflow/controller/UserClassScheduleController.kt` | Keep endpoint path/query contract but remove active-membership-only semantics |
| `backend/src/main/kotlin/com/gymflow/service/UserClassScheduleService.kt` | Remove the page-level membership gate and enrich schedule entries with booking and spot data |
| `backend/src/main/kotlin/com/gymflow/repository/ClassInstanceRepository.kt` | Add lock-by-id query for booking transactions and keep visible-schedule queries reusable |
| `backend/src/main/kotlin/com/gymflow/repository/UserRepository.kt` | Add admin member-search query scoped to `USER` accounts |
| `backend/src/main/kotlin/com/gymflow/repository/UserProfileRepository.kt` | Add profile-backed search support for admin member lookup if not embedded directly in a repository projection |
| `backend/src/main/kotlin/com/gymflow/service/ClassInstanceService.kt` | Reject capacity reductions below confirmed bookings and class deletion while confirmed bookings exist |
| `backend/src/main/kotlin/com/gymflow/controller/AdminClassInstanceController.kt` | Preserve endpoint shape while surfacing the new booking-related admin guards |
| `backend/src/main/kotlin/com/gymflow/controller/GlobalExceptionHandler.kt` | Map `INVALID_CLASS_ID`, `INVALID_USER_ID`, `INVALID_BOOKING_STATUS`, `CLASS_FULL`, `ALREADY_BOOKED`, `CLASS_NOT_BOOKABLE`, `CLASS_ALREADY_STARTED`, `BOOKING_NOT_FOUND`, `BOOKING_NOT_ACTIVE`, `CANCELLATION_WINDOW_CLOSED`, `USER_NOT_FOUND`, `CAPACITY_BELOW_CONFIRMED_BOOKINGS`, and `CLASS_HAS_ACTIVE_BOOKINGS` |
| `backend/src/test/kotlin/com/gymflow/service/UserClassScheduleServiceTest.kt` | Update tests for the new browse-without-membership contract and enriched entry fields |
| `backend/src/test/kotlin/com/gymflow/controller/UserClassScheduleControllerTest.kt` | Replace the old `NO_ACTIVE_MEMBERSHIP` schedule contract expectations with the new `200` browse contract |

Implementation notes:
- Keep booking write transactions inside `BookingService` only.
- Always lock `class_instances` before validating capacity in booking and cancellation transactions.
- Do not introduce a class-level `confirmed_bookings_count` column; aggregate from `bookings`.
- Use the same response DTO for self-booking and admin on-behalf booking.

---

## 4. Frontend Components to Create or Modify

### Pages
| Route | Component | Purpose |
|------|-----------|---------|
| `/schedule` | `GroupClassesSchedulePage` | Existing member schedule page, now with embedded booking actions, summary bar, drawer, and action feedback |
| `/admin/scheduler` | `AdminSchedulerPage` | Existing scheduler page, now with an admin on-behalf booking panel for a selected class |

### New Components
| Component | Location | Props |
|-----------|----------|-------|
| `BookingConfirmModal` | `frontend/src/components/schedule/` | `{ entry: GroupClassScheduleEntry; isOpen: boolean; isSubmitting: boolean; errorMessage: string | null; onConfirm: () => void; onClose: () => void }` |
| `CancelBookingModal` | `frontend/src/components/schedule/` | `{ booking: BookingResponse; isOpen: boolean; isSubmitting: boolean; errorMessage: string | null; onConfirm: () => void; onClose: () => void }` |
| `BookingSummaryBar` | `frontend/src/components/schedule/` | `{ entries: GroupClassScheduleEntry[]; onOpenDrawer: () => void }` |
| `MyBookingsDrawer` | `frontend/src/components/schedule/` | `{ isOpen: boolean; bookings: BookingResponse[]; isLoading: boolean; errorMessage: string | null; timeZone: string; onRetry: () => void; onClose: () => void; onCancelBooking: (booking: BookingResponse) => void; onJumpToClass: (classId: string) => void }` |
| `BookingToast` | `frontend/src/components/schedule/` | `{ kind: 'success' | 'error'; message: string; onDismiss: () => void }` |
| `AdminBookForMemberPanel` | `frontend/src/components/scheduler/` | `{ classInstance: ClassInstanceResponse | null; isOpen: boolean; onClose: () => void }` |

### New Types
```ts
export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'ATTENDED'

export type BookingDeniedReason =
  | 'MEMBERSHIP_REQUIRED'
  | 'CLASS_ALREADY_STARTED'
  | 'CLASS_FULL'
  | 'ALREADY_BOOKED'

export interface ScheduleEntryBookingSummary {
  id: string
  status: BookingStatus
  bookedAt: string
}

export interface BookingResponse {
  id: string
  userId: string
  classId: string
  status: BookingStatus
  bookedAt: string
  cancelledAt: string | null
  className: string
  scheduledAt: string
  durationMin: number
  trainerNames: string[]
  classPhotoUrl: string | null
  isCancellable: boolean
  cancellationCutoffAt: string
}

export interface PaginatedBookingsResponse {
  content: BookingResponse[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface BookingRequest {
  classId: string
}

export interface AdminBookingRequest {
  userId: string
  classId: string
}

export interface AdminBookingMemberSummaryResponse {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  displayName: string
  hasActiveMembership: boolean
}
```

`frontend/src/types/groupClassSchedule.ts` must be expanded to:
```ts
export interface GroupClassScheduleEntry {
  id: string
  name: string
  scheduledAt: string
  localDate: string
  durationMin: number
  trainerNames: string[]
  classPhotoUrl: string | null
  capacity: number
  confirmedBookings: number
  remainingSpots: number
  currentUserBooking: ScheduleEntryBookingSummary | null
  bookingAllowed: boolean
  bookingDeniedReason: BookingDeniedReason | null
  cancellationAllowed: boolean
}

export interface GroupClassScheduleResponse {
  view: ScheduleView
  anchorDate: string
  timeZone: string
  week: string
  rangeStartDate: string
  rangeEndDateExclusive: string
  hasActiveMembership: boolean
  entries: GroupClassScheduleEntry[]
}
```

### New API Functions
- `createBooking(req: BookingRequest): Promise<BookingResponse>`
- `getMyBookings(params?: { status?: BookingStatus; page?: number; size?: number }): Promise<PaginatedBookingsResponse>`
- `cancelBooking(bookingId: string): Promise<BookingResponse>`
- `adminCreateBooking(req: AdminBookingRequest): Promise<BookingResponse>`
- `searchBookingMembers(params: { query?: string; page?: number; size?: number }): Promise<{ content: AdminBookingMemberSummaryResponse[]; totalElements: number; totalPages: number; number: number; size: number }>`

`frontend/src/api/groupClassSchedule.ts` stays at the same path and function name but consumes the enriched schedule DTO.

### State
Add `frontend/src/store/bookingStore.ts` with:
- `myBookings: BookingResponse[]`
- `myBookingsTotalPages: number`
- `myBookingsPage: number`
- `myBookingsLoading: boolean`
- `myBookingsError: string | null`
- `fetchMyBookings(params?: { status?: BookingStatus; page?: number; size?: number }): Promise<void>`
- `bookClass(classId: string): Promise<BookingResponse>`
- `cancelUserBooking(bookingId: string): Promise<BookingResponse>`

Modify `frontend/src/store/groupClassScheduleStore.ts`:
- keep the existing route/timezone state
- update types to the enriched schedule response
- change `fetchSchedule` so booking-triggered refreshes can preserve current data while revalidating in the background

UI rules:
- `/schedule` remains the only member booking entry point in v1.
- Remove the current page-level membership-blocked state on `/schedule`. Non-members can browse the schedule and see membership-required booking controls.
- `GroupScheduleEntryCard` must render these states from backend data:
  - `currentUserBooking != null && cancellationAllowed` -> booked state with `Cancel booking`
  - `currentUserBooking != null && !cancellationAllowed` -> cancellation-locked state
  - `bookingDeniedReason === 'CLASS_FULL'` -> full state
  - `bookingDeniedReason === 'MEMBERSHIP_REQUIRED'` -> membership-required state with `Browse plans`
  - `bookingAllowed === true` -> available state with `Book spot`
- Existing `GroupScheduleEntryModal` becomes booking-aware:
  - shows booking actions consistent with the card state
  - does not allow booking/cancel when the backend state forbids it
- `BookingSummaryBar` is shown only when at least one visible schedule entry has `currentUserBooking != null`.
- `MyBookingsDrawer` is an overlay inside `/schedule`; no new `/bookings` route is added.
- Book/cancel success path:
  - close modal
  - optimistically patch the affected schedule entry
  - trigger background revalidation of schedule + bookings drawer data
  - show `BookingToast`
- If a user has no active membership but already has a confirmed future booking, the booked state wins over the membership-required state for that class card.
- Admin on-behalf booking lives in `/admin/scheduler` via `AdminBookForMemberPanel`, opened from the selected class edit context.

User-visible error mapping:
- `MEMBERSHIP_REQUIRED` -> `Active membership required to book.`
- `CLASS_FULL` -> `This class is fully booked.`
- `ALREADY_BOOKED` -> `You already booked this class.`
- `CLASS_ALREADY_STARTED` -> `Booking is no longer available because this class has already started.`
- `CLASS_NOT_BOOKABLE` -> `This class is no longer open for booking.`
- `CANCELLATION_WINDOW_CLOSED` -> `You can no longer cancel within 3 hours of class start.`
- `BOOKING_NOT_ACTIVE` -> `This booking can no longer be cancelled.`
- `ACCESS_DENIED` -> `Only admins can book on behalf of a member.`

Validation / constraints:
- Member search panel should not call the backend until the query contains at least 2 non-whitespace characters.
- Schedule page root must keep `overflow-x-hidden`.
- Modals use shared focus-trap and escape-close behavior consistent with the existing modal pattern.

---

## 5. Task List per Agent

### → backend-dev
- [ ] Create `V20__create_bookings_table.sql` with the table, indexes, partial unique index, and `updated_at` trigger.
- [ ] Add `Booking` entity and `BookingRepository`.
- [ ] Implement `UserBookingController` and `AdminBookingController`.
- [ ] Implement `BookingService` with:
  - self-booking
  - admin on-behalf booking
  - owner cancellation
  - paginated self-booking list
  - admin member search
- [ ] Add class-row locking queries to `ClassInstanceRepository`.
- [ ] Use `findAccessibleActiveMembership` for self-booking only; do not require active membership for list/cancel.
- [ ] Increment `user_memberships.bookings_used_this_month` atomically on successful booking create.
- [ ] Extend `UserClassScheduleService` and `UserClassScheduleResponse` with booking/spot state and remove the page-level membership gate.
- [ ] Add `CAPACITY_BELOW_CONFIRMED_BOOKINGS` guard to admin class-instance patch.
- [ ] Add `CLASS_HAS_ACTIVE_BOOKINGS` guard to admin class-instance delete.
- [ ] Map all new booking-related exceptions in `GlobalExceptionHandler`.
- [ ] Write tests for:
  - final-spot concurrency behavior
  - duplicate booking
  - full class
  - started class
  - non-bookable class
  - cancellation cutoff
  - cancellation ownership hiding
  - schedule browse without membership
  - admin member search
  - admin capacity/delete guards

### → frontend-dev
- [ ] Add `frontend/src/types/booking.ts` and expand `frontend/src/types/groupClassSchedule.ts`.
- [ ] Add `frontend/src/api/bookings.ts`.
- [ ] Add `frontend/src/store/bookingStore.ts`.
- [ ] Modify `frontend/src/store/groupClassScheduleStore.ts` so schedule refresh can preserve visible data during booking mutations.
- [ ] Update `GroupClassesSchedulePage` to:
  - render booking-aware cards
  - show `BookingSummaryBar`
  - host `BookingConfirmModal`, `CancelBookingModal`, `MyBookingsDrawer`, and `BookingToast`
  - remove the old page-level no-membership block
- [ ] Update `GroupScheduleEntryCard` and `GroupScheduleEntryModal` to render booking state and CTAs from backend fields.
- [ ] Add `AdminBookForMemberPanel` to `/admin/scheduler`.
- [ ] Add admin member search UX with debounced query and selected-member summary.
- [ ] Update `src/utils/errorMessages.ts` with booking-specific messages.
- [ ] Write tests for:
  - no-membership schedule browsing with booking blocked
  - successful book flow
  - full class disabled state
  - booked state + cancel flow
  - cancellation-locked state
  - booking summary bar visibility
  - drawer grouping and retry
  - admin on-behalf booking panel happy path and error states

---

## 6. Risks & Notes
- This feature intentionally supersedes the current Group Classes Schedule SDD’s active-membership gate on `/api/v1/class-schedule`. Browsing remains `USER`-only, but it is no longer member-only.
- Assumption: `bookingsUsedThisMonth` is increment-only in this phase and represents booking usage, not currently held reservations. If product later wants “current active bookings this month” semantics, that is a separate counter design change.
- Deleting a class instance with confirmed bookings is blocked. This is necessary to avoid silent loss of user reservations and orphaned booking history.
- Lowering class capacity below current confirmed bookings is blocked. Without that guard the system can enter a negative-spots state.
- Member Home booking entry points are deferred. The member-home preview endpoint remains read-only in this feature.
- `ATTENDED` is part of the booking status contract now for forward compatibility, but this feature does not create or transition rows to `ATTENDED`.
- No overlapping-booking prevention across different classes is introduced; the PRD explicitly leaves that out of scope.
