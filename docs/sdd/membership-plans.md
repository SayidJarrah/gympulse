# SDD: Membership Plans

## Reference
- PRD: `docs/prd/membership-plans.md`
- Date: 2026-03-21

## Architecture Overview
This feature introduces the membership plan catalogue — the set of subscription offerings
that the gym sells. Admins can create, edit, and toggle the activation state of plans.
Guests and authenticated users can browse and view active plans only.

Layers affected: **DB** (one new table), **Backend** (seven new endpoints across two
controllers, one new service, one new repository, new DTOs, Security config update),
**Frontend** (public plans browse page, admin plans management page, shared components,
Zustand store slice, API module, TypeScript types).

The `UserMembership` table is referenced in one guard (the price-edit block) but is
owned by the "User membership purchase" feature. No changes to `user_memberships` are
made by this feature; it only reads a count from that table.

---

## 1. Database Changes

### New Tables

```sql
-- V4__create_membership_plans_table.sql

CREATE TABLE membership_plans (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  description     TEXT         NOT NULL,
  price_in_cents  INTEGER      NOT NULL,
  duration_days   INTEGER      NOT NULL,
  status          VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE',
  version         INTEGER      NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_membership_plans_status
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT chk_membership_plans_price
    CHECK (price_in_cents > 0),
  CONSTRAINT chk_membership_plans_duration
    CHECK (duration_days > 0)
);

-- Supports public list endpoint filtering on status (the most common query).
CREATE INDEX idx_membership_plans_status ON membership_plans (status);

-- Supports default sort by creation time on both public and admin list endpoints.
CREATE INDEX idx_membership_plans_created_at ON membership_plans (created_at);

-- Composite index covers the combined filter + sort pattern used by both the public
-- list (WHERE status = 'ACTIVE' ORDER BY created_at DESC) and the admin filtered list
-- (WHERE status = 'INACTIVE' ORDER BY created_at DESC). Without this composite index
-- the planner must use the status index for the filter and perform a separate sort step.
-- The two single-column indexes above are retained: idx_membership_plans_status supports
-- index-only COUNT(*) WHERE status = 'ACTIVE' scans; idx_membership_plans_created_at
-- supports ORDER BY created_at DESC queries with no status filter (admin list, no filter).
CREATE INDEX idx_membership_plans_status_created_at
    ON membership_plans (status, created_at DESC);
```

Notes:
- `price_in_cents INTEGER` — stores monetary value as integer cents to avoid
  floating-point rounding errors. Max value is 2,147,483,647 cents (~$21 M), which
  is more than sufficient for any gym membership price.
- `description TEXT NOT NULL` — required per resolved Open Question 3.
- `version INTEGER NOT NULL DEFAULT 0` — used by JPA `@Version` for optimistic locking,
  preventing lost-update races between two simultaneous admin edits.
- DB-level CHECK constraints on `price_in_cents` and `duration_days` back up application
  validation as a safety net, but the application layer enforces these first and returns
  structured error codes.
- No `UNIQUE` constraint on `name` — duplicate plan names are explicitly out of scope
  per the PRD.
- No `deleted_at` / soft-delete column — only deactivation (status toggle) is supported.

```sql
-- Also in V4__create_membership_plans_table.sql (same file, appended after table DDL)

CREATE TRIGGER trg_membership_plans_updated_at
  BEFORE UPDATE ON membership_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

The `set_updated_at()` trigger function was created in migration `V2b`. Attaching a
trigger to `membership_plans` reuses it without re-creating it.

### Modified Tables

None. `user_memberships` does not exist yet (owned by the "User membership purchase"
feature). The price-edit guard in `MembershipPlanService` checks whether a
`user_memberships` table row exists at runtime; see Section 2 business logic for
`PUT /api/v1/membership-plans/{id}`. The guard is written as a JPQL count query that
returns 0 if the table exists but is empty, and the Kotlin code treats a missing table
as an expected situation only during initial development. See Section 6 — Risks & Notes
for the dependency ordering caveat.

### Flyway Migration

Filename: `V4__create_membership_plans_table.sql`

Location: `backend/src/main/resources/db/migration/`

The file contains, in order:
1. `CREATE TABLE membership_plans` with all columns, constraints, and indexes.
2. `CREATE TRIGGER trg_membership_plans_updated_at` reusing the existing `set_updated_at()` function.

---

## 2. Backend API Contract

### GET /api/v1/membership-plans

**Auth:** None (public — no JWT required)

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `0` | Zero-based page number |
| `size` | integer | `20` | Items per page |
| `sort` | string | `createdAt,desc` | Sort field and direction |

**Success Response (200):**
```json
{
  "content": [
    {
      "id": "uuid",
      "name": "Monthly Basic",
      "description": "Unlimited gym access, weekdays only.",
      "priceInCents": 2999,
      "durationDays": 30,
      "status": "ACTIVE",
      "createdAt": "2026-03-21T10:00:00Z",
      "updatedAt": "2026-03-21T10:00:00Z"
    }
  ],
  "totalElements": 5,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

**Error Responses:** None specific to this endpoint. Invalid pagination parameters fall
back to Spring defaults (no error thrown).

**Business Logic:**
1. Query `membership_plans` WHERE `status = 'ACTIVE'`.
2. Apply pagination and sorting from query parameters using Spring Data `Pageable`.
3. Map each entity to `MembershipPlanResponse` DTO.
4. Return 200 with Spring `Page<MembershipPlanResponse>` serialised as the structure above.

**Security Config Change Required:** Add
`.requestMatchers(HttpMethod.GET, "/api/v1/membership-plans").permitAll()` and
`.requestMatchers(HttpMethod.GET, "/api/v1/membership-plans/*").permitAll()` to
`SecurityConfig.kt` so unauthenticated callers can reach these two endpoints.

---

### GET /api/v1/membership-plans/{id}

**Auth:** None (public). Admins may also call this endpoint — if the caller has the
ADMIN role the inactive plan is still visible (see AC 5 inversion below).

**Path Parameters:** `id` — UUID of the plan.

**Success Response (200):**
```json
{
  "id": "uuid",
  "name": "Monthly Basic",
  "description": "Unlimited gym access, weekdays only.",
  "priceInCents": 2999,
  "durationDays": 30,
  "status": "ACTIVE",
  "createdAt": "2026-03-21T10:00:00Z",
  "updatedAt": "2026-03-21T10:00:00Z"
}
```

**Error Responses:**

| Status | Error Code | Condition |
|--------|------------|-----------|
| 404 | `PLAN_NOT_FOUND` | Plan ID does not exist (AC 4) |
| 404 | `PLAN_NOT_FOUND` | Plan exists but `status = INACTIVE` and caller is not ADMIN (AC 5) |

**Business Logic:**
1. Look up plan by `id`. If not found, throw `PlanNotFoundException`.
2. Check the Spring Security context for the ADMIN role. If the caller is not ADMIN and
   `plan.status == INACTIVE`, throw `PlanNotFoundException` (same error — do not reveal
   that the plan exists).
3. Map to `MembershipPlanResponse` and return 200.

---

### POST /api/v1/membership-plans

**Auth:** Required — ADMIN role (`@PreAuthorize("hasRole('ADMIN')")`)

**Request Body:**
```json
{
  "name": "Annual Premium",
  "description": "Full access including classes and personal training sessions.",
  "priceInCents": 89900,
  "durationDays": 365
}
```

**Success Response (201):**
```json
{
  "id": "uuid",
  "name": "Annual Premium",
  "description": "Full access including classes and personal training sessions.",
  "priceInCents": 89900,
  "durationDays": 365,
  "status": "ACTIVE",
  "createdAt": "2026-03-21T10:00:00Z",
  "updatedAt": "2026-03-21T10:00:00Z"
}
```

**Error Responses:**

| Status | Error Code | Condition |
|--------|------------|-----------|
| 400 | `INVALID_PRICE` | `priceInCents` is null, zero, or negative (AC 8) |
| 400 | `INVALID_DURATION` | `durationDays` is null, zero, or negative (AC 9) |
| 400 | `INVALID_NAME` | `name` is null, blank, or whitespace-only (AC 10) |
| 400 | `INVALID_DESCRIPTION` | `description` is null or blank (AC 18b) |
| 403 | `ACCESS_DENIED` | Caller does not have ADMIN role (AC 7) |

**Business Logic:**
1. `@PreAuthorize("hasRole('ADMIN')")` enforces the 403 before the method body runs.
2. Bean Validation on `MembershipPlanRequest` fires first; field-level errors map to
   the structured error codes above via `GlobalExceptionHandler`.
3. Create a new `MembershipPlan` entity with `status = ACTIVE`.
4. Persist and return 201 with `MembershipPlanResponse`.

Note: `status` is always `ACTIVE` on creation; the request body must not allow callers
to set an initial status.

---

### PUT /api/v1/membership-plans/{id}

**Auth:** Required — ADMIN role

**Path Parameters:** `id` — UUID of the plan.

**Request Body:**
```json
{
  "name": "Annual Premium Updated",
  "description": "Updated description.",
  "priceInCents": 99900,
  "durationDays": 365
}
```

**Success Response (200):** Full `MembershipPlanResponse` DTO (same shape as POST 201).

**Error Responses:**

| Status | Error Code | Condition |
|--------|------------|-----------|
| 400 | `INVALID_PRICE` | `priceInCents` is null, zero, or negative (AC 12 via AC 8) |
| 400 | `INVALID_DURATION` | `durationDays` is null, zero, or negative (AC 12 via AC 9) |
| 400 | `INVALID_NAME` | `name` is null, blank, or whitespace-only (AC 12 via AC 10) |
| 400 | `INVALID_DESCRIPTION` | `description` is null or blank (AC 18b) |
| 403 | `ACCESS_DENIED` | Caller does not have ADMIN role |
| 404 | `PLAN_NOT_FOUND` | Plan ID does not exist (AC 13) |
| 409 | `PLAN_HAS_ACTIVE_SUBSCRIBERS` | `priceInCents` is changed and at least one `UserMembership` with `status = 'ACTIVE'` references this plan (AC 18a) |

**Business Logic:**
1. `@PreAuthorize("hasRole('ADMIN')")` enforces the 403.
2. Bean Validation fires on the request body.
3. Load the existing plan by `id`. If not found, throw `PlanNotFoundException`.
4. If the submitted `priceInCents` differs from the persisted value, count
   `UserMembership` rows WHERE `plan_id = id AND status = 'ACTIVE'`. If count > 0,
   throw `PlanHasActiveSubscribersException` (409).
5. Update `name`, `description`, `priceInCents`, `durationDays` on the entity.
   The `@Version` field on the entity handles optimistic locking automatically.
6. Persist and return 200. The `updated_at` trigger fires on the DB UPDATE.

---

### PATCH /api/v1/membership-plans/{id}/deactivate

**Auth:** Required — ADMIN role

**Path Parameters:** `id` — UUID of the plan.

**Request Body:** None.

**Success Response (200):** Full `MembershipPlanResponse` DTO with `status = "INACTIVE"`.

**Error Responses:**

| Status | Error Code | Condition |
|--------|------------|-----------|
| 403 | `ACCESS_DENIED` | Caller does not have ADMIN role |
| 404 | `PLAN_NOT_FOUND` | Plan ID does not exist |
| 409 | `PLAN_ALREADY_INACTIVE` | Plan is already `INACTIVE` (AC 15) |

**Business Logic:**
1. `@PreAuthorize("hasRole('ADMIN')")` enforces the 403.
2. Load plan by `id`. If not found, throw `PlanNotFoundException`.
3. If `plan.status == INACTIVE`, throw `PlanAlreadyInactiveException`.
4. Set `plan.status = INACTIVE`. Persist and return 200.
5. Existing `UserMembership` records referencing this plan are NOT modified (AC 19).

---

### PATCH /api/v1/membership-plans/{id}/activate

**Auth:** Required — ADMIN role

**Path Parameters:** `id` — UUID of the plan.

**Request Body:** None.

**Success Response (200):** Full `MembershipPlanResponse` DTO with `status = "ACTIVE"`.

**Error Responses:**

| Status | Error Code | Condition |
|--------|------------|-----------|
| 403 | `ACCESS_DENIED` | Caller does not have ADMIN role |
| 404 | `PLAN_NOT_FOUND` | Plan ID does not exist |
| 409 | `PLAN_ALREADY_ACTIVE` | Plan is already `ACTIVE` (AC 17) |

**Business Logic:**
1. `@PreAuthorize("hasRole('ADMIN')")` enforces the 403.
2. Load plan by `id`. If not found, throw `PlanNotFoundException`.
3. If `plan.status == ACTIVE`, throw `PlanAlreadyActiveException`.
4. Set `plan.status = ACTIVE`. Persist and return 200.

---

### GET /api/v1/admin/membership-plans

**Auth:** Required — ADMIN role

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | `ACTIVE` or `INACTIVE` | (absent) | Optional filter; absent means return all plans |
| `page` | integer | `0` | Zero-based page number |
| `size` | integer | `20` | Items per page |
| `sort` | string | `createdAt,desc` | Sort field and direction |

**Success Response (200):** Same pagination envelope as the public list endpoint, but
includes both ACTIVE and INACTIVE plans (or filtered by `status` if provided).

**Error Responses:**

| Status | Error Code | Condition |
|--------|------------|-----------|
| 400 | `INVALID_STATUS_FILTER` | `status` query parameter is present but not `ACTIVE` or `INACTIVE` |
| 403 | `ACCESS_DENIED` | Caller does not have ADMIN role |

**Business Logic:**
1. `@PreAuthorize("hasRole('ADMIN')")` enforces the 403.
2. If `status` parameter is absent, query all plans with no status filter.
3. If `status` is present, validate that it is one of `ACTIVE` or `INACTIVE`; if not,
   return 400 `INVALID_STATUS_FILTER`.
4. Apply pagination and sorting.
5. Return 200 with paginated `MembershipPlanResponse` list.

---

## 3. Kotlin Classes to Create

### New Files

| File | Package | Type | Purpose |
|------|---------|------|---------|
| `domain/MembershipPlan.kt` | `com.gymflow.domain` | `@Entity` data class | JPA entity for `membership_plans` table |
| `dto/MembershipPlanRequest.kt` | `com.gymflow.dto` | data class | Request body for POST and PUT |
| `dto/MembershipPlanResponse.kt` | `com.gymflow.dto` | data class | Response body for all plan endpoints |
| `repository/MembershipPlanRepository.kt` | `com.gymflow.repository` | interface | Spring Data JPA repo for `MembershipPlan` |
| `service/MembershipPlanService.kt` | `com.gymflow.service` | `@Service` | All business logic for plan CRUD and status toggles |
| `controller/MembershipPlanController.kt` | `com.gymflow.controller` | `@RestController` | Public and user-facing endpoints: GET list, GET by id, POST, PUT, PATCH deactivate/activate |
| `controller/AdminMembershipPlanController.kt` | `com.gymflow.controller` | `@RestController` | Admin-only list endpoint at `/api/v1/admin/membership-plans` |

### Entity Field Specification

**`domain/MembershipPlan.kt`**
```kotlin
@Entity
@Table(name = "membership_plans")
data class MembershipPlan(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var name: String,

    @Column(nullable = false, columnDefinition = "TEXT")
    var description: String,

    @Column(name = "price_in_cents", nullable = false)
    var priceInCents: Int,

    @Column(name = "duration_days", nullable = false)
    var durationDays: Int,

    @Column(nullable = false)
    var status: String = "ACTIVE",

    @Version
    @Column(nullable = false)
    var version: Int = 0,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: OffsetDateTime = OffsetDateTime.now()
)
```

Notes:
- `@Version` on `version` enables JPA optimistic locking. Spring Data automatically
  handles `OptimisticLockingFailureException` on concurrent edits.
- `status` is stored as a plain `String` rather than a Kotlin `enum` class so that the
  DB CHECK constraint is the single source of truth for allowed values and no JPA
  `@Enumerated` configuration is required.
- `updatedAt` is managed by the DB trigger; the JPA column is `updatable = false` only
  for `createdAt`. `updatedAt` is overwritten by the trigger on every UPDATE, so JPA
  can write it too without conflict — do NOT mark it `updatable = false`.

### DTO Field Specifications

**`dto/MembershipPlanRequest.kt`**
```kotlin
data class MembershipPlanRequest(
    @field:NotBlank(message = "Name must not be blank")
    val name: String?,

    @field:NotBlank(message = "Description must not be blank")
    val description: String?,

    @field:NotNull(message = "Price is required")
    @field:Min(value = 1, message = "Price must be greater than zero")
    val priceInCents: Int?,

    @field:NotNull(message = "Duration is required")
    @field:Min(value = 1, message = "Duration must be greater than zero")
    val durationDays: Int?
)
```

**`dto/MembershipPlanResponse.kt`**
```kotlin
data class MembershipPlanResponse(
    val id: UUID,
    val name: String,
    val description: String,
    val priceInCents: Int,
    val durationDays: Int,
    val status: String,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime
)
```

### Repository Specification

**`repository/MembershipPlanRepository.kt`**
```kotlin
interface MembershipPlanRepository : JpaRepository<MembershipPlan, UUID> {
    fun findAllByStatus(status: String, pageable: Pageable): Page<MembershipPlan>
}
```

The admin "all plans" query uses `findAll(pageable)` from `JpaRepository` directly.
The public list uses `findAllByStatus("ACTIVE", pageable)`.

### Service Specification

**`service/MembershipPlanService.kt`**

Methods (all `@Transactional` unless noted):

| Method Signature | Description |
|-----------------|-------------|
| `getActivePlans(pageable: Pageable): Page<MembershipPlanResponse>` | Public list — status = ACTIVE only |
| `getPlanById(id: UUID, isAdmin: Boolean): MembershipPlanResponse` | Single plan; throws `PlanNotFoundException` if not found or if inactive and not admin |
| `createPlan(request: MembershipPlanRequest): MembershipPlanResponse` | Creates plan with status ACTIVE |
| `updatePlan(id: UUID, request: MembershipPlanRequest): MembershipPlanResponse` | Edits plan; blocks price change if active subscribers exist |
| `deactivatePlan(id: UUID): MembershipPlanResponse` | Sets status INACTIVE; throws if already inactive |
| `activatePlan(id: UUID): MembershipPlanResponse` | Sets status ACTIVE; throws if already active |
| `getAllPlans(status: String?, pageable: Pageable): Page<MembershipPlanResponse>` | Admin list; optional status filter |

Custom exceptions (defined at the bottom of `MembershipPlanService.kt`):
- `PlanNotFoundException(message: String) : RuntimeException(message)`
- `PlanAlreadyInactiveException(message: String) : RuntimeException(message)`
- `PlanAlreadyActiveException(message: String) : RuntimeException(message)`
- `PlanHasActiveSubscribersException(message: String) : RuntimeException(message)`
- `InvalidStatusFilterException(message: String) : RuntimeException(message)`

### GlobalExceptionHandler Changes

Add handlers for the five new exception types in `GlobalExceptionHandler.kt`:

| Exception | HTTP Status | Code |
|-----------|-------------|------|
| `PlanNotFoundException` | 404 | `PLAN_NOT_FOUND` |
| `PlanAlreadyInactiveException` | 409 | `PLAN_ALREADY_INACTIVE` |
| `PlanAlreadyActiveException` | 409 | `PLAN_ALREADY_ACTIVE` |
| `PlanHasActiveSubscribersException` | 409 | `PLAN_HAS_ACTIVE_SUBSCRIBERS` |
| `InvalidStatusFilterException` | 400 | `INVALID_STATUS_FILTER` |

The existing `MethodArgumentNotValidException` handler already handles `@Valid` failures
with `code: "VALIDATION_ERROR"`. However, the PRD specifies distinct error codes
(`INVALID_PRICE`, `INVALID_DURATION`, `INVALID_NAME`, `INVALID_DESCRIPTION`) rather
than the generic `VALIDATION_ERROR`. To satisfy this, override the validation handler
to inspect the failing field name and map it to the feature-specific code:

```
field "priceInCents" with value <= 0 → code "INVALID_PRICE"
field "durationDays" with value <= 0 → code "INVALID_DURATION"
field "name" blank/null              → code "INVALID_NAME"
field "description" blank/null       → code "INVALID_DESCRIPTION"
```

Implement this mapping in a dedicated `MembershipPlanValidationMapper` helper or
directly inside a method in `GlobalExceptionHandler` scoped to the plan endpoints.
The simplest approach is a `when` expression on the first failing `fieldError.field`.

### SecurityConfig Changes

Add the following permit-all matchers **before** the existing `.anyRequest().authenticated()` line in `SecurityConfig.kt`:

```kotlin
.requestMatchers(HttpMethod.GET, "/api/v1/membership-plans").permitAll()
.requestMatchers(HttpMethod.GET, "/api/v1/membership-plans/*").permitAll()
```

All other plan endpoints (`POST`, `PUT`, `PATCH`, and the admin list) remain protected
by `@PreAuthorize` on the service methods and the default `authenticated()` catch-all.

### Modified Files

| File | Change |
|------|--------|
| `config/SecurityConfig.kt` | Add two `permitAll()` matchers for public GET endpoints (see above) |
| `controller/GlobalExceptionHandler.kt` | Add five new `@ExceptionHandler` methods for plan-specific exceptions; enhance validation error mapping to return field-specific codes |

---

## 4. Frontend Components to Create

### Pages

| Route | Component | Location | Purpose |
|-------|-----------|----------|---------|
| `/plans` | `PlansPage.tsx` | `src/pages/plans/` | Public plan catalogue — browse active plans, pagination |
| `/plans/:id` | `PlanDetailPage.tsx` | `src/pages/plans/` | Public single plan detail view |
| `/admin/plans` | `AdminPlansPage.tsx` | `src/pages/admin/` | Admin full catalogue with status filter, create/edit/toggle actions |

### New Components

| Component | Location | Props |
|-----------|----------|-------|
| `PlanCard.tsx` | `src/components/plans/` | `plan: MembershipPlan` — displays name, description, price, duration; links to detail page |
| `PlanForm.tsx` | `src/components/plans/` | `initialValues?: MembershipPlanRequest, onSubmit: (req: MembershipPlanRequest) => Promise<void>, isLoading: boolean, error: string \| null` — shared create/edit form with field-level validation |
| `PlanStatusBadge.tsx` | `src/components/plans/` | `status: 'ACTIVE' \| 'INACTIVE'` — renders a coloured Tailwind badge |
| `PlanActionsMenu.tsx` | `src/components/plans/` | `plan: MembershipPlan, onEdit: fn, onToggleStatus: fn` — admin action controls (edit button, activate/deactivate toggle) |

### New Types (`src/types/membershipPlan.ts`)

```typescript
export type PlanStatus = 'ACTIVE' | 'INACTIVE';

export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  durationDays: number;
  status: PlanStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface MembershipPlanRequest {
  name: string;
  description: string;
  priceInCents: number;
  durationDays: number;
}

export interface PaginatedPlans {
  content: MembershipPlan[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
```

### New API Functions (`src/api/membershipPlans.ts`)

```typescript
// Public endpoints — no auth header required (Axios interceptor skips if token is absent)
export function getActivePlans(page?: number, size?: number, sort?: string): Promise<PaginatedPlans>
  // GET /api/v1/membership-plans?page=...&size=...&sort=...

export function getPlanById(id: string): Promise<MembershipPlan>
  // GET /api/v1/membership-plans/{id}

// Admin endpoints — Axios interceptor attaches Authorization header automatically
export function createPlan(req: MembershipPlanRequest): Promise<MembershipPlan>
  // POST /api/v1/membership-plans

export function updatePlan(id: string, req: MembershipPlanRequest): Promise<MembershipPlan>
  // PUT /api/v1/membership-plans/{id}

export function deactivatePlan(id: string): Promise<MembershipPlan>
  // PATCH /api/v1/membership-plans/{id}/deactivate

export function activatePlan(id: string): Promise<MembershipPlan>
  // PATCH /api/v1/membership-plans/{id}/activate

export function getAdminPlans(status?: 'ACTIVE' | 'INACTIVE', page?: number, size?: number, sort?: string): Promise<PaginatedPlans>
  // GET /api/v1/admin/membership-plans?status=...&page=...&size=...&sort=...
```

### State (Zustand) — new file `src/store/membershipPlanStore.ts`

```typescript
interface MembershipPlanState {
  // Public slice
  activePlans: MembershipPlan[];
  activePlansTotalPages: number;
  activePlansPage: number;

  // Admin slice
  adminPlans: MembershipPlan[];
  adminPlansTotalPages: number;
  adminPlansPage: number;

  isLoading: boolean;
  error: string | null;

  // Actions
  fetchActivePlans(page?: number, size?: number): Promise<void>;
  fetchAdminPlans(status?: 'ACTIVE' | 'INACTIVE', page?: number, size?: number): Promise<void>;
  addPlan(plan: MembershipPlan): void;
  updatePlanInStore(plan: MembershipPlan): void;
  setError(message: string | null): void;
}
```

### Error Code to User Message Mapping

The frontend must translate backend error codes into human-readable messages:

| Backend Code | User-Facing Message |
|--------------|---------------------|
| `INVALID_PRICE` | "Price must be greater than zero." |
| `INVALID_DURATION` | "Duration must be at least one day." |
| `INVALID_NAME` | "Plan name must not be blank." |
| `INVALID_DESCRIPTION` | "Description must not be blank." |
| `PLAN_NOT_FOUND` | "This plan could not be found." |
| `PLAN_ALREADY_INACTIVE` | "This plan is already inactive." |
| `PLAN_ALREADY_ACTIVE` | "This plan is already active." |
| `PLAN_HAS_ACTIVE_SUBSCRIBERS` | "Cannot change the price while members are subscribed to this plan." |
| `INVALID_STATUS_FILTER` | "Invalid status filter. Use ACTIVE or INACTIVE." |
| `ACCESS_DENIED` | "You do not have permission to perform this action." |

---

## 5. Task List per Agent

### db-architect
- [ ] Review the SQL in Section 1 for correctness, missing indexes, and constraint naming conventions consistent with `V1` and `V2` migrations.
- [ ] Confirm that reusing `set_updated_at()` from `V2b` in the `V4` migration file is safe (function already exists; no re-declaration needed).
- [ ] Confirm that DB-level CHECK constraints on `price_in_cents > 0` and `duration_days > 0` are correct as a backstop to application validation, and that they will not cause misleading constraint violation errors to reach the client if application validation somehow fails.
- [ ] Confirm that `version INTEGER NOT NULL DEFAULT 0` with JPA `@Version` is the correct optimistic locking strategy for this access pattern (low-concurrency admin edits).
- [ ] Apply `V4__create_membership_plans_table.sql` to the development database and verify it runs cleanly on PostgreSQL 15 after `V3`.

### backend-dev
- [ ] Create Flyway migration `V4__create_membership_plans_table.sql` in `backend/src/main/resources/db/migration/` exactly as specified in Section 1, including the trigger attachment.
- [ ] Implement `domain/MembershipPlan.kt` per the entity field specification in Section 3.
- [ ] Implement `dto/MembershipPlanRequest.kt` with Bean Validation annotations per Section 3.
- [ ] Implement `dto/MembershipPlanResponse.kt` per Section 3.
- [ ] Implement `repository/MembershipPlanRepository.kt` with `findAllByStatus` method per Section 3.
- [ ] Implement `service/MembershipPlanService.kt` with all six public methods and all five custom exceptions per Section 3. Implement the active-subscriber guard in `updatePlan` using a JPQL count query on `UserMembership` (table may not exist yet — handle `JpaObjectRetrievalFailureException` or use a raw count query that returns 0 when the table is empty during development; see Section 6).
- [ ] Implement `controller/MembershipPlanController.kt` with endpoints: `GET /api/v1/membership-plans`, `GET /api/v1/membership-plans/{id}`, `POST /api/v1/membership-plans`, `PUT /api/v1/membership-plans/{id}`, `PATCH /api/v1/membership-plans/{id}/deactivate`, `PATCH /api/v1/membership-plans/{id}/activate`. All write endpoints annotated with `@PreAuthorize("hasRole('ADMIN')")`. Pass `isAdmin` flag to service for GET by id.
- [ ] Implement `controller/AdminMembershipPlanController.kt` with endpoint `GET /api/v1/admin/membership-plans`. Annotate with `@PreAuthorize("hasRole('ADMIN')")`.
- [ ] Update `controller/GlobalExceptionHandler.kt`: add five new `@ExceptionHandler` methods for plan exceptions (mapping per Section 3); update `handleValidationException` to map field names to feature-specific error codes (`INVALID_PRICE`, `INVALID_DURATION`, `INVALID_NAME`, `INVALID_DESCRIPTION`).
- [ ] Update `config/SecurityConfig.kt`: add two `permitAll()` matchers for `GET /api/v1/membership-plans` and `GET /api/v1/membership-plans/*` per Section 3.
- [ ] Write unit tests for `MembershipPlanService`:
  - Happy path: create, update (name/description only), update (price change — no active subscribers), deactivate, activate, get active list, get by id (active), get by id (inactive, admin), get admin list (all), get admin list (filtered by ACTIVE), get admin list (filtered by INACTIVE).
  - Error cases: `PLAN_NOT_FOUND` (get, update, deactivate, activate), `PLAN_ALREADY_INACTIVE`, `PLAN_ALREADY_ACTIVE`, `PLAN_HAS_ACTIVE_SUBSCRIBERS` (price change with active subscribers), `INVALID_STATUS_FILTER`, get inactive plan as non-admin returns `PLAN_NOT_FOUND`.
- [ ] Write integration tests for `MembershipPlanController` using `@SpringBootTest` + `MockMvc`:
  - Verify 200 on public GET list and GET by id (no auth token).
  - Verify 404 on GET inactive plan without admin token.
  - Verify 200 on GET inactive plan with admin token.
  - Verify 201 on POST with valid body and admin token.
  - Verify 400 for each validation error (price, duration, name, description) on POST and PUT.
  - Verify 403 on POST/PUT/PATCH without admin token.
  - Verify 200 on PUT update (non-price fields).
  - Verify 409 `PLAN_HAS_ACTIVE_SUBSCRIBERS` on PUT price change with active subscribers (mock repo).
  - Verify 200/409 on PATCH deactivate and activate.
  - Verify 200 on admin GET list (with and without status filter).
  - Verify 400 `INVALID_STATUS_FILTER` on admin GET list with invalid status value.

### frontend-dev
- [ ] Create `src/types/membershipPlan.ts` with all types from Section 4.
- [ ] Create `src/api/membershipPlans.ts` with all seven API functions from Section 4, using the existing shared Axios instance from `src/api/axiosInstance.ts`.
- [ ] Create `src/store/membershipPlanStore.ts` with the Zustand store shape from Section 4.
- [ ] Create `src/components/plans/PlanStatusBadge.tsx` — coloured Tailwind badge for ACTIVE (green) / INACTIVE (grey).
- [ ] Create `src/components/plans/PlanCard.tsx` — card component linking to `/plans/:id`.
- [ ] Create `src/components/plans/PlanForm.tsx` — shared create/edit form with inline field validation matching backend rules (price > 0, duration > 0, name not blank, description not blank).
- [ ] Create `src/components/plans/PlanActionsMenu.tsx` — edit button and activate/deactivate toggle for admin use.
- [ ] Create `src/pages/plans/PlansPage.tsx` — public paginated catalogue. Calls `getActivePlans`. Renders `PlanCard` grid. No auth required.
- [ ] Create `src/pages/plans/PlanDetailPage.tsx` — public single plan view. Calls `getPlanById`. Handles 404 gracefully with user message.
- [ ] Create `src/pages/admin/AdminPlansPage.tsx` — admin catalogue. Calls `getAdminPlans` with optional status filter. Renders table with `PlanStatusBadge` and `PlanActionsMenu`. Includes create button that opens `PlanForm` in a modal or navigates to a create route.
- [ ] Add routes `/plans`, `/plans/:id`, and `/admin/plans` to the React Router configuration in `App.tsx`. Guard `/admin/plans` so only ADMIN users can access it (redirect non-admins to `/plans`).
- [ ] Implement the error code to user message mapping from Section 4 in a shared utility (`src/utils/planErrors.ts` or inline in the store/components).
- [ ] Write component tests for `PlanForm` (renders, validates, submits), `PlansPage` (renders list, handles empty state), `AdminPlansPage` (renders with status filter, deactivate action).

---

## 6. Risks & Notes

### Active-Subscriber Guard and Missing UserMembership Table
The `PUT /api/v1/membership-plans/{id}` endpoint must check for active `UserMembership`
records before allowing a price change (AC 18a). The `user_memberships` table does not
exist yet — it is owned by the "User membership purchase" feature.

**Recommended approach:** Implement the guard using a native SQL count query wrapped in
a try/catch. If the table does not exist (PostgreSQL error code `42P01`), treat the
count as 0 and allow the price change. This makes the guard safe to deploy before the
`user_memberships` table is created and automatically becomes a real guard once that
migration runs.

Alternatively, define a `UserMembershipRepository` with a count method now (returning
a stub `0`) and replace the stub when the "User membership purchase" feature is
implemented. The stub approach is cleaner and avoids catching DB-level errors in
service code.

**Decision assumed:** Use the stub approach. Document in `MembershipPlanService.kt`
with a `// TODO: replace stub with real UserMembershipRepository.countActiveByPlanId(id)`
comment so backend-dev on the "User membership purchase" feature knows to wire it up.

### Optimistic Locking on Concurrent Admin Edits
The `@Version` column on `MembershipPlan` means that if two admins load the same plan
and both submit a PUT, the second write will fail with a Spring
`OptimisticLockingFailureException`. The `GlobalExceptionHandler` must catch this and
return HTTP 409 with code `PLAN_EDIT_CONFLICT` and message
"Another admin updated this plan at the same time. Please reload and try again."
Add this handler to the GlobalExceptionHandler changes listed in Section 3.

### Validation Error Code Mapping Complexity
The PRD specifies per-field error codes (`INVALID_PRICE`, etc.) while the existing
`GlobalExceptionHandler` returns a generic `VALIDATION_ERROR` for all `@Valid` failures.
The proposed approach (a `when` expression on `fieldError.field` inside the handler) is
fragile if field names change. Consider instead using a custom `@Constraint` annotation
per field that sets its own violation message key, and map message keys to error codes
in the handler. Either approach is acceptable; document the chosen approach in code.

### Public Endpoint Security Config Order
Spring Security evaluates `requestMatchers` in declaration order. The two new
`permitAll()` matchers for GET plan endpoints must be added **before** the existing
`.anyRequest().authenticated()` line — not after — or the permit-all rules will never
be evaluated.

### Price Storage as Integer Cents
`priceInCents: Int` (Kotlin `Int` = Java `int` = 32-bit signed) supports a maximum of
2,147,483,647 cents ($21,474,836.47). This is far beyond any realistic gym membership
price. No overflow risk exists for this domain. If the `MembershipPlanRequest` DTO
receives a JSON number larger than `Int.MAX_VALUE`, Jackson will throw a deserialization
error before Bean Validation runs; the existing `GlobalExceptionHandler` `Exception`
catch-all will return 500. If a more specific error is needed for malformed JSON, add a
`HttpMessageNotReadableException` handler — this is a minor edge case and is not
required by any acceptance criterion.

### Frontend Admin Route Guard
The `/admin/plans` route must be accessible only to users with `role = 'ADMIN'`. The
frontend must read the `user.role` from `authStore` and redirect non-admin users to
`/plans`. This is a client-side guard only; the server enforces the real authorization
via `@PreAuthorize`. Never rely solely on the client-side guard for security.
