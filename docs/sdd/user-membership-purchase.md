# SDD: User Membership Purchase

## Reference
- PRD: `docs/prd/user-membership-purchase.md`
- Date: 2026-03-23

## Architecture Overview
This feature introduces the `UserMembership` entity — the record that proves a user has
an active subscription and gates access to class bookings, attendance check-in, and any
other entitlement-controlled feature. It bridges the existing `MembershipPlan` catalogue
(already implemented) and the forthcoming Class Booking feature.

Layers affected: **DB** (one new table with a partial unique index), **Backend** (one
new entity, one repository, one service, two controllers, new DTOs, GlobalExceptionHandler
additions, MembershipPlanService stub replacement), **Frontend** (new types, new API
module, new Zustand store slice, two new pages, shared components, route additions).

No payment processing is involved. Activation is instant and free. The one-active-
membership-per-user invariant is enforced at both the application layer (HTTP 409) and
the database layer (partial unique index on `user_id WHERE status = 'ACTIVE'`), so
concurrent purchase requests are safe.

The `bookingsUsedThisMonth` field is stored on this table and initialised to 0 on
purchase. Its increment logic belongs to the Class Booking feature. Its monthly reset
belongs to a future scheduled-job feature.

---

## 1. Database Changes

### New Tables

```sql
-- V6__create_user_memberships_table.sql

CREATE TABLE user_memberships (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID        NOT NULL REFERENCES users(id),
  plan_id                   UUID        NOT NULL REFERENCES membership_plans(id),
  status                    VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
  start_date                DATE        NOT NULL,
  end_date                  DATE        NOT NULL,
  bookings_used_this_month  INTEGER     NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at                TIMESTAMPTZ,
  CONSTRAINT chk_user_memberships_status
    CHECK (status IN ('ACTIVE', 'CANCELLED', 'EXPIRED')),
  CONSTRAINT chk_user_memberships_dates
    CHECK (end_date >= start_date),
  CONSTRAINT chk_user_memberships_bookings_used
    CHECK (bookings_used_this_month >= 0)
);

-- Composite index covers both the most common user query (filter by user_id and
-- status = 'ACTIVE' for GET /me, DELETE /me, and the partial unique index support)
-- and the most common admin query (all memberships for a given user, optionally
-- filtered by status). The composite leading column (user_id) also satisfies any
-- query on user_id alone, making a separate idx_user_memberships_user_id redundant.
CREATE INDEX idx_user_memberships_user_id_status ON user_memberships(user_id, status);

-- Supports admin list filtered by status (e.g. ?status=ACTIVE) and the active-
-- subscriber count used by MembershipPlanService.updatePlan price-change guard.
CREATE INDEX idx_user_memberships_status ON user_memberships(status);

-- Composite index covers the admin list filtered by plan
-- (GET /api/v1/admin/memberships?planId=... if added later).
CREATE INDEX idx_user_memberships_plan_id ON user_memberships(plan_id);

-- THE CRITICAL CONSTRAINT: prevents a user from ever holding two ACTIVE memberships
-- simultaneously. The partial index applies only to rows where status = 'ACTIVE', so
-- CANCELLED and EXPIRED rows do not participate and re-purchase is allowed immediately
-- after cancellation. The DB enforces this as a last-resort guard against race
-- conditions that bypass the application-layer check.
CREATE UNIQUE INDEX uidx_user_memberships_one_active_per_user
  ON user_memberships(user_id)
  WHERE status = 'ACTIVE';

CREATE TRIGGER trg_user_memberships_updated_at
  BEFORE UPDATE ON user_memberships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

Notes on design decisions:
- `start_date` and `end_date` are stored as `DATE` (not `TIMESTAMPTZ`) because membership
  duration is day-granular. Using `DATE` removes timezone ambiguity for expiry calculations
  and aligns with the PRD technical note.
- `status VARCHAR(10)` with a CHECK constraint mirrors the pattern already used for
  `membership_plans.status`. Allowed values: `ACTIVE`, `CANCELLED`, `EXPIRED`.
- `bookings_used_this_month INTEGER NOT NULL DEFAULT 0` is stored here so the Class
  Booking feature can read and increment it transactionally. A separate monthly-reset job
  (future feature) will zero it on the first day of each calendar month.
- The partial unique index `WHERE status = 'ACTIVE'` is the hard concurrency guard.
  When two simultaneous `POST /api/v1/memberships` requests both pass the application
  layer check, one INSERT will succeed and the other will receive a PostgreSQL unique
  violation (`ERROR 23505`). The service catches `DataIntegrityViolationException` and
  re-throws `MembershipAlreadyActiveException`, which maps to HTTP 409.
- `deleted_at TIMESTAMPTZ` (nullable, no default) is included to comply with the
  project-wide soft-delete convention present on all tables (see `users.deleted_at`).
  In this domain, `status = 'CANCELLED'` or `'EXPIRED'` is the functional soft-delete
  mechanism and no endpoint performs a hard DELETE. `deleted_at` is therefore always
  NULL in practice and is not read by any application code in this feature. It is
  included as a defensive guard: if a future bulk-cleanup job or admin tooling issues a
  hard DELETE, the column provides the expected hook point consistent with every other
  table in the schema.
- Foreign key to `membership_plans(id)` ensures referential integrity. Deactivating a
  plan does NOT cascade to `user_memberships` — this matches the existing
  `MembershipPlanService.deactivatePlan` behaviour (AC 19 in the membership-plans PRD).

### Modified Tables

No existing tables are altered by this migration. However, `MembershipPlanService.kt`
contains a `countActiveSubscribers` stub that returns a hard-coded `0L`. Once this
migration runs and `UserMembershipRepository` exists, that stub must be replaced with a
real count query. This is captured in the backend-dev task list below.

### Flyway Migration

Filename: `V6__create_user_memberships_table.sql`

Location: `backend/src/main/resources/db/migration/`

The last applied migration is `V5__fix_admin_seed_password.sql`. This migration is
therefore `V6`. The file contains, in order:
1. `CREATE TABLE user_memberships` with all columns (including `deleted_at`),
   constraints, and indexes. Note: no standalone `idx_user_memberships_user_id` —
   the composite `idx_user_memberships_user_id_status` covers all `user_id` queries.
2. `CREATE UNIQUE INDEX uidx_user_memberships_one_active_per_user` partial unique index.
3. `CREATE TRIGGER trg_user_memberships_updated_at` reusing `set_updated_at()` from V2b.

---

## 2. Backend API Contract

### POST /api/v1/memberships

**Auth:** Required (USER role — `@PreAuthorize("hasRole('USER')")`)

**Request Body:**
```json
{ "planId": "uuid" }
```

**Success Response (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "planId": "uuid",
  "planName": "Monthly Basic",
  "startDate": "2026-03-23",
  "endDate": "2026-04-22",
  "status": "ACTIVE",
  "bookingsUsedThisMonth": 0,
  "maxBookingsPerMonth": 10,
  "createdAt": "2026-03-23T14:00:00Z"
}
```

**Error Responses:**

| Status | Error Code | Condition | PRD AC |
|--------|-----------|-----------|--------|
| 400 | `INVALID_PLAN_ID` | `planId` is null or blank | AC 7 |
| 401 | `UNAUTHORIZED` | No Bearer token provided | AC 3 |
| 404 | `PLAN_NOT_FOUND` | `planId` does not exist | AC 5 |
| 409 | `MEMBERSHIP_ALREADY_ACTIVE` | Authenticated user already has an ACTIVE membership | AC 4, AC 18 |
| 422 | `PLAN_NOT_AVAILABLE` | Plan exists but `status = INACTIVE` | AC 6 |

**Business Logic (executed in `UserMembershipService.purchaseMembership`):**
1. Extract authenticated `userId` from the Spring Security context.
2. Bean Validation on `MembershipPurchaseRequest` fires first; blank/null `planId`
   returns 400 `INVALID_PLAN_ID`.
3. Load `MembershipPlan` by `planId`. If not found, throw `PlanNotFoundException`
   (maps to 404 `PLAN_NOT_FOUND`).
4. If `plan.status == "INACTIVE"`, throw `PlanNotAvailableException`
   (maps to 422 `PLAN_NOT_AVAILABLE`).
5. Check whether the user already has an ACTIVE `UserMembership`:
   `userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE")`. If true, throw
   `MembershipAlreadyActiveException` (maps to 409 `MEMBERSHIP_ALREADY_ACTIVE`).
6. Build the new entity:
   - `startDate = LocalDate.now()`
   - `endDate = startDate.plusDays(plan.durationDays.toLong())`
   - `status = "ACTIVE"`
   - `bookingsUsedThisMonth = 0`
7. `userMembershipRepository.save(entity)`. If a `DataIntegrityViolationException` is
   thrown (race condition on the partial unique index), catch it and throw
   `MembershipAlreadyActiveException`.
8. Return 201 with `UserMembershipResponse` DTO mapped from the saved entity (including
   `planName` and `maxBookingsPerMonth` from the associated `MembershipPlan`).

---

### GET /api/v1/memberships/me

**Auth:** Required (USER role)

**Request Body:** None.

**Success Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "planId": "uuid",
  "planName": "Monthly Basic",
  "startDate": "2026-03-23",
  "endDate": "2026-04-22",
  "status": "ACTIVE",
  "bookingsUsedThisMonth": 3,
  "maxBookingsPerMonth": 10,
  "createdAt": "2026-03-23T14:00:00Z"
}
```

**Error Responses:**

| Status | Error Code | Condition | PRD AC |
|--------|-----------|-----------|--------|
| 401 | `UNAUTHORIZED` | No Bearer token | AC 8 implied |
| 404 | `NO_ACTIVE_MEMBERSHIP` | User has no membership with `status = ACTIVE` | AC 9 |

**Business Logic:**
1. Extract `userId` from Spring Security context.
2. Query `userMembershipRepository.findAccessibleActiveMembership(userId, today)`.
   This checks `status = 'ACTIVE'` AND `endDate >= today` AND `deletedAt IS NULL`.
   If empty, throw `NoActiveMembershipException` (maps to 404 `NO_ACTIVE_MEMBERSHIP`).
3. Map result to `UserMembershipResponse` (join with plan for `planName` and
   `maxBookingsPerMonth`) and return 200.

Note: Both `status = 'ACTIVE'` and `endDate >= today` are required. A membership whose
`endDate` has passed but whose `status` has not yet been transitioned to `EXPIRED` (pending
the expiry scheduler) must not be returned as accessible. The `findAccessibleActiveMembership`
query enforces both conditions consistently with the class schedule and booking features.

---

### DELETE /api/v1/memberships/me

**Auth:** Required (USER role)

**Request Body:** None.

**Success Response (200):** Full `UserMembershipResponse` DTO with `status = "CANCELLED"`.

**Error Responses:**

| Status | Error Code | Condition | PRD AC |
|--------|-----------|-----------|--------|
| 401 | `UNAUTHORIZED` | No Bearer token | implied |
| 404 | `NO_ACTIVE_MEMBERSHIP` | User has no ACTIVE membership to cancel | AC 11 |

**Business Logic:**
1. Extract `userId` from Spring Security context.
2. Query `userMembershipRepository.findByUserIdAndStatus(userId, "ACTIVE")`. If empty,
   throw `NoActiveMembershipException`.
3. Set `membership.status = "CANCELLED"`.
4. `userMembershipRepository.save(membership)`.
5. Return 200 with the updated `UserMembershipResponse`. The row is NOT deleted (AC 19).

---

### GET /api/v1/admin/memberships

**Auth:** Required (ADMIN role — `@PreAuthorize("hasRole('ADMIN')")`)

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | `ACTIVE`, `CANCELLED`, or `EXPIRED` | (absent) | Optional filter; absent means return all |
| `userId` | UUID string | (absent) | Optional filter by specific user |
| `page` | integer | `0` | Zero-based page number |
| `size` | integer | `20` | Items per page |
| `sort` | string | `createdAt,desc` | Sort field and direction |

**Success Response (200):**
```json
{
  "content": [
    {
      "id": "uuid",
      "userId": "uuid",
      "planId": "uuid",
      "planName": "Monthly Basic",
      "startDate": "2026-03-23",
      "endDate": "2026-04-22",
      "status": "ACTIVE",
      "bookingsUsedThisMonth": 3,
      "maxBookingsPerMonth": 10,
      "createdAt": "2026-03-23T14:00:00Z"
    }
  ],
  "totalElements": 42,
  "totalPages": 3,
  "number": 0,
  "size": 20
}
```

**Error Responses:**

| Status | Error Code | Condition | PRD AC |
|--------|-----------|-----------|--------|
| 400 | `INVALID_STATUS_FILTER` | `status` query param present but not `ACTIVE`, `CANCELLED`, or `EXPIRED` | AC 12 |
| 403 | `ACCESS_DENIED` | Caller does not have ADMIN role | AC 13 |

**Business Logic:**
1. `@PreAuthorize("hasRole('ADMIN')")` enforces 403 before method body.
2. If `status` parameter is present, validate it is one of `ACTIVE`, `CANCELLED`,
   `EXPIRED`; if not, throw `InvalidMembershipStatusFilterException`
   (maps to 400 `INVALID_STATUS_FILTER`).
3. Build the JPA query dynamically:
   - If both `status` and `userId` are absent: `findAll(pageable)`
   - If only `status` present: `findAllByStatus(status, pageable)`
   - If only `userId` present: `findAllByUserId(userId, pageable)`
   - If both present: `findAllByUserIdAndStatus(userId, status, pageable)`
4. Map each entity to `UserMembershipResponse` and return 200.

Note: The existing `INVALID_STATUS_FILTER` exception class in `MembershipPlanService.kt`
is plan-specific. A new `InvalidMembershipStatusFilterException` must be created for
membership filtering to avoid conflating the two domains. Both map to
`INVALID_STATUS_FILTER` code and 400 status.

---

### DELETE /api/v1/admin/memberships/{membershipId}

**Auth:** Required (ADMIN role)

**Path Parameters:** `membershipId` — UUID of the `UserMembership` record.

**Request Body:** None.

**Success Response (200):** Full `UserMembershipResponse` DTO with `status = "CANCELLED"`.

**Error Responses:**

| Status | Error Code | Condition | PRD AC |
|--------|-----------|-----------|--------|
| 403 | `ACCESS_DENIED` | Caller does not have ADMIN role | AC 13 |
| 404 | `MEMBERSHIP_NOT_FOUND` | `membershipId` does not exist | AC 16 |
| 409 | `MEMBERSHIP_NOT_ACTIVE` | Membership exists but is already `CANCELLED` or `EXPIRED` | AC 15 |

**Business Logic:**
1. `@PreAuthorize("hasRole('ADMIN')")` enforces 403.
2. Load membership by `membershipId`. If not found, throw `MembershipNotFoundException`
   (maps to 404 `MEMBERSHIP_NOT_FOUND`).
3. If `membership.status != "ACTIVE"`, throw `MembershipNotActiveException`
   (maps to 409 `MEMBERSHIP_NOT_ACTIVE`).
4. Set `membership.status = "CANCELLED"`.
5. `userMembershipRepository.save(membership)`.
6. Return 200 with the updated `UserMembershipResponse`. Row is NOT deleted.

---

## 3. Kotlin Classes to Create

### New Files

| File | Package | Type | Purpose |
|------|---------|------|---------|
| `domain/UserMembership.kt` | `com.gymflow.domain` | `@Entity` data class | JPA entity for `user_memberships` table |
| `dto/MembershipPurchaseRequest.kt` | `com.gymflow.dto` | data class | Request body for `POST /api/v1/memberships` |
| `dto/UserMembershipResponse.kt` | `com.gymflow.dto` | data class | Response body for all membership endpoints |
| `repository/UserMembershipRepository.kt` | `com.gymflow.repository` | interface | Spring Data JPA repository |
| `service/UserMembershipService.kt` | `com.gymflow.service` | `@Service` | All business logic for user membership operations |
| `controller/UserMembershipController.kt` | `com.gymflow.controller` | `@RestController` | User-facing endpoints: POST, GET /me, DELETE /me |
| `controller/AdminUserMembershipController.kt` | `com.gymflow.controller` | `@RestController` | Admin-only endpoints: GET list, DELETE by id |

### Entity Field Specification

**`domain/UserMembership.kt`**
```kotlin
@Entity
@Table(name = "user_memberships")
data class UserMembership(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "user_id", nullable = false, updatable = false)
    val userId: UUID,

    @Column(name = "plan_id", nullable = false, updatable = false)
    val planId: UUID,

    @Column(nullable = false)
    var status: String = "ACTIVE",

    @Column(name = "start_date", nullable = false, updatable = false)
    val startDate: LocalDate,

    @Column(name = "end_date", nullable = false)
    var endDate: LocalDate,

    @Column(name = "bookings_used_this_month", nullable = false)
    var bookingsUsedThisMonth: Int = 0,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: OffsetDateTime = OffsetDateTime.now()
)
```

Notes:
- `userId` and `planId` are stored as plain `UUID` columns (not JPA `@ManyToOne`
  associations). This is consistent with the existing `MembershipPlan` entity pattern and
  avoids lazy-loading complexity. The service joins to `MembershipPlan` explicitly when
  building the response DTO.
- `startDate` / `endDate` are `LocalDate` (mapped to SQL `DATE`) — no timezone offset.
- `status` is a plain `String` with a DB CHECK constraint, consistent with `MembershipPlan`.
- No `@Version` field: optimistic locking is not required here because the only write
  operations are single-user cancellations (no concurrent edit scenario). The partial
  unique index provides the concurrency guard for the one-active constraint.

### DTO Field Specifications

**`dto/MembershipPurchaseRequest.kt`**
```kotlin
data class MembershipPurchaseRequest(
    @field:NotNull(message = "Plan ID is required")
    val planId: UUID?
)
```

Note: `planId` declared as `UUID?` to allow Bean Validation to catch a missing field
and return `INVALID_PLAN_ID`. Jackson will throw a `HttpMessageNotReadableException`
if the value is not a valid UUID string — the existing `GlobalExceptionHandler` catch-all
handles this with a 500; add a `HttpMessageNotReadableException` handler if a 400 with
`INVALID_PLAN_ID` is preferred for malformed UUIDs (assumption: the catch-all is
acceptable for now; see Section 6).

**`dto/UserMembershipResponse.kt`**
```kotlin
data class UserMembershipResponse(
    val id: UUID,
    val userId: UUID,
    val planId: UUID,
    val planName: String,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val status: String,
    val bookingsUsedThisMonth: Int,
    val maxBookingsPerMonth: Int,
    val createdAt: OffsetDateTime
)
```

Notes:
- `planName` and `maxBookingsPerMonth` are denormalised into the response by the service
  (loaded from `MembershipPlanRepository.findById(planId)`). They are NOT stored on
  `user_memberships`.
- `updatedAt` is intentionally omitted from the response DTO — it is an internal audit
  field not required by any acceptance criterion. Add it if a future AC requires it.
- `startDate` / `endDate` serialise as ISO 8601 date strings (`"2026-03-23"`) via
  Jackson's `JavaTimeModule`. Ensure `spring.jackson.serialization.write-dates-as-timestamps`
  is `false` in `application.yml` (this is already required by the existing `OffsetDateTime`
  fields on other DTOs).

### Repository Specification

**`repository/UserMembershipRepository.kt`**
```kotlin
interface UserMembershipRepository : JpaRepository<UserMembership, UUID> {

    fun findByUserIdAndStatus(userId: UUID, status: String): UserMembership?

    fun existsByUserIdAndStatus(userId: UUID, status: String): Boolean

    fun findAllByStatus(status: String, pageable: Pageable): Page<UserMembership>

    fun findAllByUserId(userId: UUID, pageable: Pageable): Page<UserMembership>

    fun findAllByUserIdAndStatus(
        userId: UUID,
        status: String,
        pageable: Pageable
    ): Page<UserMembership>

    @Query("SELECT COUNT(m) FROM UserMembership m WHERE m.planId = :planId AND m.status = 'ACTIVE'")
    fun countActiveByPlanId(@Param("planId") planId: UUID): Long
}
```

### Service Specification

**`service/UserMembershipService.kt`**

All methods are `@Transactional` unless marked read-only.

| Method Signature | Transactional | Description |
|-----------------|--------------|-------------|
| `purchaseMembership(userId: UUID, request: MembershipPurchaseRequest): UserMembershipResponse` | write | Full purchase flow — see AC 1–7, 17, 18 |
| `getMyActiveMembership(userId: UUID): UserMembershipResponse` | read-only | Returns ACTIVE membership or throws `NoActiveMembershipException` — AC 8, 9 |
| `cancelMyMembership(userId: UUID): UserMembershipResponse` | write | Cancels caller's ACTIVE membership — AC 10, 11, 19, 20 |
| `getAllMemberships(status: String?, userId: UUID?, pageable: Pageable): Page<UserMembershipResponse>` | read-only | Admin paginated list with optional filters — AC 12 |
| `adminCancelMembership(membershipId: UUID): UserMembershipResponse` | write | Admin cancel any membership by ID — AC 14, 15, 16, 20 |

Custom exceptions (defined at the bottom of `UserMembershipService.kt`):
- `MembershipAlreadyActiveException(message: String) : RuntimeException(message)`
- `NoActiveMembershipException(message: String) : RuntimeException(message)`
- `MembershipNotFoundException(message: String) : RuntimeException(message)`
- `MembershipNotActiveException(message: String) : RuntimeException(message)`
- `PlanNotAvailableException(message: String) : RuntimeException(message)`
- `InvalidMembershipStatusFilterException(message: String) : RuntimeException(message)`

Note: `PlanNotFoundException` is already defined in `MembershipPlanService.kt` and is
already handled in `GlobalExceptionHandler`. The same exception class is reused here —
do not create a duplicate.

### GlobalExceptionHandler Changes

Add the following `@ExceptionHandler` methods to `GlobalExceptionHandler.kt`:

| Exception | HTTP Status | Code |
|-----------|-------------|------|
| `MembershipAlreadyActiveException` | 409 | `MEMBERSHIP_ALREADY_ACTIVE` |
| `NoActiveMembershipException` | 404 | `NO_ACTIVE_MEMBERSHIP` |
| `MembershipNotFoundException` | 404 | `MEMBERSHIP_NOT_FOUND` |
| `MembershipNotActiveException` | 409 | `MEMBERSHIP_NOT_ACTIVE` |
| `PlanNotAvailableException` | 422 | `PLAN_NOT_AVAILABLE` |
| `InvalidMembershipStatusFilterException` | 400 | `INVALID_STATUS_FILTER` |

The existing `MethodArgumentNotValidException` handler must be updated to also map the
`planId` field to the `INVALID_PLAN_ID` error code:

```
field "planId" null   -> code "INVALID_PLAN_ID"
```

Add this case to the existing `when` expression in `handleValidationException` before
the `else` branch.

### MembershipPlanService Changes

Replace the `countActiveSubscribers` stub in `MembershipPlanService.kt`:

```kotlin
// BEFORE (stub):
@Suppress("UNUSED_PARAMETER")
private fun countActiveSubscribers(planId: UUID): Long = 0L

// AFTER (real implementation — inject UserMembershipRepository):
private fun countActiveSubscribers(planId: UUID): Long =
    userMembershipRepository.countActiveByPlanId(planId)
```

Add `private val userMembershipRepository: UserMembershipRepository` to the constructor
of `MembershipPlanService`. Remove the `@Suppress` annotation and the `TODO` comment.

### SecurityConfig Changes

No new `permitAll()` matchers are required. All membership endpoints require
authentication. The existing `.anyRequest().authenticated()` catch-all in `SecurityConfig`
already covers them. The `@PreAuthorize` annotations on service or controller methods
provide role-based enforcement on top.

### Modified Files

| File | Change |
|------|--------|
| `controller/GlobalExceptionHandler.kt` | Add six new `@ExceptionHandler` methods (see above); update `handleValidationException` to map `planId` field to `INVALID_PLAN_ID` |
| `service/MembershipPlanService.kt` | Replace `countActiveSubscribers` stub with real `UserMembershipRepository.countActiveByPlanId`; inject `UserMembershipRepository` via constructor |

---

## 4. Frontend Components to Create

### Pages

| Route | Component | Location | Purpose |
|-------|-----------|----------|---------|
| `/membership` | `MyMembershipPage.tsx` | `src/pages/membership/` | Authenticated user view: shows current ACTIVE membership or a CTA to purchase; handles cancellation |
| `/plans` | `PlansPage.tsx` | `src/pages/plans/` | Already exists — add "Activate" button on each `PlanCard` when user has no active membership |

Note: No dedicated purchase page is needed. The purchase action is triggered directly
from `PlansPage` via the `PlanCard` activate button + a confirmation modal. The
`/membership` page is the post-purchase landing and the cancellation surface.

### New Components

| Component | Location | Props |
|-----------|----------|-------|
| `MembershipStatusCard.tsx` | `src/components/membership/` | `membership: UserMembership` — displays plan name, start/end dates, status badge, bookings used this month, cancel button |
| `PurchaseConfirmModal.tsx` | `src/components/membership/` | `plan: MembershipPlan, onConfirm: () => Promise<void>, onCancel: () => void, isLoading: boolean` — confirmation dialog before activation |
| `CancelMembershipModal.tsx` | `src/components/membership/` | `membership: UserMembership, onConfirm: () => Promise<void>, onCancel: () => void, isLoading: boolean` — confirmation dialog before cancellation |
| `MembershipStatusBadge.tsx` | `src/components/membership/` | `status: MembershipStatus` — renders coloured Tailwind badge: ACTIVE = green, CANCELLED = red, EXPIRED = grey |

### Modification to Existing Components

**`src/components/plans/PlanCard.tsx`** — add an optional `onActivate?: () => void` prop.
When provided and the user has no active membership (`membershipStore.activeMembership === null`),
render an "Activate" button on the card. When clicked, open `PurchaseConfirmModal`.
When `onActivate` is not provided (or user already has an active membership), the button
is hidden. This keeps `PlanCard` usable on the public `/plans` page regardless of auth state.

### New Types (`src/types/userMembership.ts`)

```typescript
export type MembershipStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED';

export interface UserMembership {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  startDate: string; // ISO 8601 date string: "2026-03-23"
  endDate: string;   // ISO 8601 date string: "2026-04-22"
  status: MembershipStatus;
  bookingsUsedThisMonth: number;
  maxBookingsPerMonth: number;
  createdAt: string; // ISO 8601 datetime string
}

export interface MembershipPurchaseRequest {
  planId: string;
}

export interface PaginatedMemberships {
  content: UserMembership[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
```

### New API Functions (`src/api/memberships.ts`)

```typescript
// User endpoints — require authenticated Axios instance (token attached by interceptor)

export function purchaseMembership(req: MembershipPurchaseRequest): Promise<UserMembership>
  // POST /api/v1/memberships  body: { planId }

export function getMyMembership(): Promise<UserMembership>
  // GET /api/v1/memberships/me

export function cancelMyMembership(): Promise<UserMembership>
  // DELETE /api/v1/memberships/me

// Admin endpoints

export function getAdminMemberships(
  status?: MembershipStatus,
  userId?: string,
  page?: number,
  size?: number,
  sort?: string
): Promise<PaginatedMemberships>
  // GET /api/v1/admin/memberships?status=...&userId=...&page=...&size=...&sort=...

export function adminCancelMembership(membershipId: string): Promise<UserMembership>
  // DELETE /api/v1/admin/memberships/{membershipId}
```

### State (Zustand) — new file `src/store/membershipStore.ts`

```typescript
interface MembershipState {
  // Current user's active membership (null = no active membership or not yet fetched)
  activeMembership: UserMembership | null;
  membershipLoading: boolean;
  membershipError: string | null;

  // Admin slice
  adminMemberships: UserMembership[];
  adminMembershipsTotalPages: number;
  adminMembershipsPage: number;
  adminMembershipsTotalElements: number;
  adminMembershipsLoading: boolean;
  adminMembershipsError: string | null;

  // User actions
  fetchMyMembership: () => Promise<void>;
  purchaseMembership: (planId: string) => Promise<void>;
  cancelMyMembership: () => Promise<void>;

  // Admin actions
  fetchAdminMemberships: (
    status?: MembershipStatus,
    userId?: string,
    page?: number,
    size?: number
  ) => Promise<void>;
  adminCancelMembership: (membershipId: string) => Promise<void>;

  // Utility
  setMembershipError: (message: string | null) => void;
}
```

### Error Code to User Message Mapping (`src/utils/membershipErrors.ts`)

| Backend Code | User-Facing Message |
|--------------|---------------------|
| `MEMBERSHIP_ALREADY_ACTIVE` | "You already have an active membership. Please cancel it before activating a new one." |
| `NO_ACTIVE_MEMBERSHIP` | "You do not have an active membership." |
| `MEMBERSHIP_NOT_FOUND` | "This membership record could not be found." |
| `MEMBERSHIP_NOT_ACTIVE` | "This membership is already cancelled or expired." |
| `PLAN_NOT_FOUND` | "This plan could not be found." |
| `PLAN_NOT_AVAILABLE` | "This plan is no longer available for purchase." |
| `INVALID_PLAN_ID` | "A valid plan must be selected." |
| `INVALID_STATUS_FILTER` | "Invalid status filter. Use ACTIVE, CANCELLED, or EXPIRED." |
| `ACCESS_DENIED` | "You do not have permission to perform this action." |

### Route Additions (`src/App.tsx`)

Add to the React Router configuration:

```tsx
// Authenticated user route — redirect to /login if not authenticated
<Route
  path="/membership"
  element={
    <AuthRoute>
      <MyMembershipPage />
    </AuthRoute>
  }
/>

// Admin route — already guarded by AdminRoute wrapper
<Route
  path="/admin/memberships"
  element={
    <AdminRoute>
      <AdminMembershipsPage />
    </AdminRoute>
  }
/>
```

`AuthRoute` is a new wrapper component (analogous to the existing `AdminRoute`) that
redirects unauthenticated users to `/login`. If `AuthRoute` does not already exist,
create it at `src/components/layout/AuthRoute.tsx`.

---

## 5. Task List per Agent

### db-architect (reviewer only — does NOT update any column)
- [ ] Review the DDL in Section 1 for correctness: column types, constraint naming
  conventions (consistent with `V1`–`V5`), and index completeness.
- [ ] Confirm the partial unique index `WHERE status = 'ACTIVE'` on `user_id` is the
  correct strategy to enforce one-active-membership-per-user while allowing re-purchase
  after cancellation.
- [ ] Confirm `DATE` type (not `TIMESTAMPTZ`) for `start_date` and `end_date` is correct
  given that membership duration is day-granular.
- [ ] Confirm `REFERENCES users(id)` and `REFERENCES membership_plans(id)` foreign keys
  have no missing `ON DELETE` clause concerns (default is `RESTRICT` — correct here
  since neither users nor plans should be deletable while memberships reference them).
- [ ] Verify migration version `V6` is correct given that `V5__fix_admin_seed_password.sql`
  is the current head.

### backend-dev
- [ ] Create Flyway migration `V6__create_user_memberships_table.sql` in
  `backend/src/main/resources/db/migration/` exactly as specified in Section 1.
- [ ] Implement `domain/UserMembership.kt` per the entity field specification in
  Section 3, using `LocalDate` for `startDate`/`endDate` and `OffsetDateTime` for
  `createdAt`/`updatedAt`.
- [ ] Implement `dto/MembershipPurchaseRequest.kt` with `@field:NotNull` on `planId`.
- [ ] Implement `dto/UserMembershipResponse.kt` with all fields from Section 3,
  including `planName` and `maxBookingsPerMonth` as denormalised fields.
- [ ] Implement `repository/UserMembershipRepository.kt` with all five methods listed
  in Section 3, including the `@Query`-annotated `countActiveByPlanId`.
- [ ] Implement `service/UserMembershipService.kt` with all five public methods and six
  custom exceptions per Section 3. In `purchaseMembership`, catch
  `DataIntegrityViolationException` on the `save` call and re-throw
  `MembershipAlreadyActiveException` to handle the concurrent-request race condition.
  All write methods must be `@Transactional`.
- [ ] Implement `controller/UserMembershipController.kt`:
  - `POST /api/v1/memberships` — annotated `@PreAuthorize("hasRole('USER')")`, calls
    `purchaseMembership`, returns 201.
  - `GET /api/v1/memberships/me` — annotated `@PreAuthorize("hasRole('USER')")`, returns 200.
  - `DELETE /api/v1/memberships/me` — annotated `@PreAuthorize("hasRole('USER')")`, returns 200.
  - Extract `userId` from `Authentication` principal in each handler method.
- [ ] Implement `controller/AdminUserMembershipController.kt`:
  - `GET /api/v1/admin/memberships` — annotated `@PreAuthorize("hasRole('ADMIN')")`,
    supports `status`, `userId`, `page`, `size`, `sort` query params, returns 200.
  - `DELETE /api/v1/admin/memberships/{membershipId}` — annotated
    `@PreAuthorize("hasRole('ADMIN')")`, returns 200.
- [ ] Update `controller/GlobalExceptionHandler.kt`: add six new `@ExceptionHandler`
  methods for membership exceptions (see Section 3); update `handleValidationException`
  to also map the `planId` field to `INVALID_PLAN_ID`.
- [ ] Update `service/MembershipPlanService.kt`: inject `UserMembershipRepository`,
  replace the `countActiveSubscribers` stub with the real
  `userMembershipRepository.countActiveByPlanId(planId)` call, remove the
  `@Suppress("UNUSED_PARAMETER")` annotation and the `TODO` comment.
- [ ] Write unit tests for `UserMembershipService`:
  - Happy path: purchase (returns 201 response with correct dates), `getMyActiveMembership`
    (returns ACTIVE membership), `cancelMyMembership` (sets status to CANCELLED),
    `adminCancelMembership` (sets status to CANCELLED), `getAllMemberships` (no filter,
    status filter, userId filter, both filters).
  - Error cases: `MEMBERSHIP_ALREADY_ACTIVE` (application-layer check), `PLAN_NOT_FOUND`,
    `PLAN_NOT_AVAILABLE`, `NO_ACTIVE_MEMBERSHIP` (GET /me with no active membership),
    `NO_ACTIVE_MEMBERSHIP` (DELETE /me with no active membership), `MEMBERSHIP_NOT_FOUND`
    (admin cancel non-existent), `MEMBERSHIP_NOT_ACTIVE` (admin cancel already cancelled),
    `INVALID_STATUS_FILTER` (admin list bad status value),
    `MEMBERSHIP_ALREADY_ACTIVE` (catch `DataIntegrityViolationException` on save).
  - Verify `startDate = today` and `endDate = today + durationDays` arithmetic in the
    purchase happy path.
  - Verify `bookingsUsedThisMonth = 0` on all new purchases.
- [ ] Write unit tests for `MembershipPlanService.updatePlan` with the real
  `countActiveSubscribers` implementation to confirm `PLAN_HAS_ACTIVE_SUBSCRIBERS` is
  thrown when at least one ACTIVE membership references the plan.

### frontend-dev
- [ ] Create `src/types/userMembership.ts` with all types from Section 4.
- [ ] Create `src/api/memberships.ts` with all five API functions from Section 4, using
  the existing Axios instance from `src/api/axiosInstance.ts`.
- [ ] Create `src/store/membershipStore.ts` with the Zustand store shape from Section 4.
  In `purchaseMembership`, call `purchaseMembership` API then immediately call
  `fetchMyMembership` to refresh the store.
- [ ] Create `src/utils/membershipErrors.ts` with the error code to user message
  mapping from Section 4.
- [ ] Create `src/components/membership/MembershipStatusBadge.tsx` — coloured Tailwind
  badge: ACTIVE = `bg-green-500/20 text-green-400`, CANCELLED = `bg-red-500/20 text-red-400`,
  EXPIRED = `bg-gray-700 text-gray-400`.
- [ ] Create `src/components/membership/MembershipStatusCard.tsx` — displays plan name,
  start/end dates formatted as `DD MMM YYYY`, status badge, bookings used / max, and a
  "Cancel membership" button that opens `CancelMembershipModal`.
- [ ] Create `src/components/membership/PurchaseConfirmModal.tsx` — confirmation modal
  showing plan name, price, and duration before activation. "Confirm" triggers
  `membershipStore.purchaseMembership(planId)`. Shows loading spinner during API call.
  On success, navigate to `/membership`.
- [ ] Create `src/components/membership/CancelMembershipModal.tsx` — confirmation modal
  warning that the user will lose access immediately. "Cancel membership" triggers
  `membershipStore.cancelMyMembership()`. Shows loading spinner during API call.
- [ ] Create `src/pages/membership/MyMembershipPage.tsx`:
  - On mount, call `membershipStore.fetchMyMembership()`.
  - If loading, show skeleton.
  - If `activeMembership` is non-null, render `MembershipStatusCard`.
  - If `membershipError` contains `NO_ACTIVE_MEMBERSHIP`, render a "No active membership"
    state with a "Browse plans" button linking to `/plans`.
  - Other errors render a generic error message with a retry button.
- [ ] Modify `src/components/plans/PlanCard.tsx` to accept an optional
  `onActivate?: () => void` prop. When provided, render an "Activate" button. The
  button is hidden when `onActivate` is not supplied.
- [ ] Modify `src/pages/plans/PlansPage.tsx` to:
  - On mount (and when auth state changes), call `membershipStore.fetchMyMembership()`.
  - Pass `onActivate={() => openPurchaseModal(plan)}` to `PlanCard` only when
    `isAuthenticated && activeMembership === null`.
  - Render `PurchaseConfirmModal` when a plan's activate button is clicked.
- [ ] Create `src/components/layout/AuthRoute.tsx` (if it does not already exist) —
  a wrapper that reads `authStore.isAuthenticated` and redirects to `/login` if false.
- [ ] Add `/membership` route (guarded by `AuthRoute`) and `/admin/memberships` route
  (guarded by `AdminRoute`) to `src/App.tsx`.
- [ ] Handle all error codes from Section 4 with user-friendly messages via
  `membershipErrors.ts` in all components and store actions.

---

## 6. Risks & Notes

### Concurrency Race Condition on Double Purchase
Two simultaneous `POST /api/v1/memberships` requests from the same user can both pass
the `existsByUserIdAndStatus` application-layer check before either INSERT commits.
The partial unique index `WHERE status = 'ACTIVE'` is the hard guard: the second INSERT
fails with PostgreSQL error code `23505` (unique violation), which Spring translates to
`DataIntegrityViolationException`. The service must catch this exception in
`purchaseMembership` and re-throw `MembershipAlreadyActiveException` to return HTTP 409
with `MEMBERSHIP_ALREADY_ACTIVE` (AC 18). This pattern is explicitly called out in the
PRD Technical Notes.

### bookingsUsedThisMonth Monthly Reset
The `bookings_used_this_month` column is initialised to `0` on purchase (AC 17) but its
reset at the start of each calendar month is deferred to a future scheduled-job feature.
The Class Booking feature will increment this counter; the increment logic must be
atomic with the booking INSERT. No design work is required here — this note is a
reminder for the Class Booking SDD author.

Assumption: `bookingsUsedThisMonth` is informational in this feature (always `0` on
purchase). `maxBookingsPerMonth` is denormalised into the response for display purposes.
Neither is enforced as a booking gate by this feature.

### MembershipPlanService Stub Replacement Timing
`MembershipPlanService.countActiveSubscribers` currently returns `0L` unconditionally.
Once `V6__create_user_memberships_table.sql` is applied and `UserMembershipRepository`
is available, the stub must be replaced (captured in the backend-dev task list).
Until the replacement is made, the `PLAN_HAS_ACTIVE_SUBSCRIBERS` guard on
`PUT /api/v1/membership-plans/{id}` remains silently bypassed for price changes.
Backend-dev must complete both tasks in the same implementation pass to avoid a
regression window.

### planId Deserialization Error Handling
If a caller sends a `planId` value that is not a valid UUID string (e.g.
`"planId": "not-a-uuid"`), Jackson throws `HttpMessageNotReadableException` before Bean
Validation runs. The current `GlobalExceptionHandler` catch-all returns HTTP 500 for
this. A `HttpMessageNotReadableException` handler returning 400 `INVALID_PLAN_ID` would
be more correct but no acceptance criterion explicitly requires it.

**Assumption:** The 500 catch-all is acceptable for malformed UUID input. Add a dedicated
handler only if a future AC requires it.

### LocalDate Jackson Serialisation
`LocalDate` fields (`startDate`, `endDate`) must serialise as ISO 8601 date strings
(`"2026-03-23"`), not as arrays or epoch integers. Ensure `spring.jackson.serialization.write-dates-as-timestamps=false`
and the `JavaTimeModule` are present in the Spring configuration. The existing
`OffsetDateTime` fields in the codebase imply `JavaTimeModule` is already registered;
verify that `LocalDate` is also covered by the same module (it is, by default).

### Frontend AuthRoute Component
`AdminRoute` already exists at `src/components/layout/AdminRoute.tsx`. `AuthRoute`
may not exist yet. The frontend-dev task list includes creating it if absent. If it
already exists (added as part of the Auth feature), skip creation and just use it.

### Re-purchase After Cancellation — startDate is Always Today
The PRD explicitly decided that `startDate = today` always, even immediately after
cancellation. There is no lock-in period and no pro-rating. This means a user who
cancels on day 29 of a 30-day plan and immediately re-purchases gets a fresh 30-day
membership starting today. This is the intended behaviour per PRD Open Question 2.

### Admin Cannot Purchase on Behalf of a User
The PRD explicitly places admin-initiated purchase out of scope (PRD Out of Scope
section). `POST /api/v1/memberships` is `@PreAuthorize("hasRole('USER')")` only.
An ADMIN calling this endpoint receives 403. If an admin needs to grant a membership,
they must log in as the user — this is a product decision, not an implementation gap.
