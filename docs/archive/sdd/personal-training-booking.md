# SDD: Personal Training Booking

**Feature:** personal-training-booking  
**Date:** 2026-04-18  
**Status:** Draft  
**PRD:** `docs/prd/personal-training-booking.md`  
**Handoff:** `docs/design-system/handoffs/personal-training-booking/`

---

## Section 1 — DB Schema (Flyway Migrations)

### Migration V23: `pt_bookings` table

File: `backend/src/main/resources/db/migration/V23__create_pt_bookings_table.sql`

```sql
CREATE TABLE pt_bookings (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id   UUID         NOT NULL REFERENCES trainers(id) ON DELETE RESTRICT,
  member_id    UUID         NOT NULL REFERENCES users(id)    ON DELETE RESTRICT,
  start_at     TIMESTAMPTZ  NOT NULL,
  end_at       TIMESTAMPTZ  NOT NULL,         -- always start_at + 1 hour; enforced in application layer
  room         VARCHAR(100) NOT NULL DEFAULT '',
  note         VARCHAR(500),
  status       VARCHAR(10)  NOT NULL DEFAULT 'CONFIRMED',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  CONSTRAINT chk_pt_bookings_status
    CHECK (status IN ('CONFIRMED', 'CANCELLED')),
  CONSTRAINT chk_pt_bookings_end_after_start
    CHECK (end_at > start_at),
  CONSTRAINT chk_pt_bookings_cancelled_at_consistency
    CHECK (
      (status = 'CANCELLED' AND cancelled_at IS NOT NULL) OR
      (status = 'CONFIRMED' AND cancelled_at IS NULL)
    )
);

-- Overlap prevention: no two confirmed PT bookings for the same trainer may overlap
CREATE INDEX idx_pt_bookings_trainer_status_start
  ON pt_bookings (trainer_id, status, start_at);

-- Member's own bookings list
CREATE INDEX idx_pt_bookings_member_status_start
  ON pt_bookings (member_id, status, start_at);

-- Temporal range queries for availability
CREATE INDEX idx_pt_bookings_trainer_window
  ON pt_bookings (trainer_id, start_at, end_at)
  WHERE status = 'CONFIRMED';
```

**Decision:** `end_at` is stored (not computed) for efficient range queries. The application layer always writes `end_at = start_at + 1 hour`.

### Migration V24: trainer PT columns

File: `backend/src/main/resources/db/migration/V24__add_trainer_pt_columns.sql`

```sql
ALTER TABLE trainers
  ADD COLUMN IF NOT EXISTS accent_color  VARCHAR(7)   DEFAULT NULL,   -- hex e.g. '#4ADE80'
  ADD COLUMN IF NOT EXISTS default_room  VARCHAR(100) DEFAULT NULL;
```

**Decision:** `accent_color` stored as nullable; frontend falls back to brand green `#22C55E` when null. `default_room` is used as the room value when creating PT bookings (falls back to empty string).

---

## Section 2 — API Contracts

All endpoints are under `/api/v1`. Auth via `Authorization: Bearer <token>`.

### Trainer Directory (augmented)

**`GET /api/v1/trainers/pt`**  
Returns trainer list enriched with PT-specific computed fields. Requires any authenticated user.

Query params:
- `specialty` (optional, repeatable) — filter by specialty (case-insensitive)
- `page`, `size`, `sort` — standard pagination

Response: `Page<PtTrainerSummaryResponse>`

```json
{
  "content": [
    {
      "id": "uuid",
      "firstName": "Priya",
      "lastName": "Mendes",
      "profilePhotoUrl": null,
      "bio": "...",
      "specializations": ["Mobility", "Strength"],
      "experienceYears": 6,
      "sessionsCompleted": 142,
      "accentColor": "#4ADE80",
      "defaultRoom": "Studio B",
      "nextOpenAt": "2026-04-19T09:00:00Z",
      "weekOpenCount": 8
    }
  ],
  "totalElements": 4,
  "totalPages": 1,
  "number": 0
}
```

`nextOpenAt` — ISO timestamp of the earliest available slot in the next 14 days, or null if fully booked.  
`weekOpenCount` — count of available hour-slots in the next 7 days.

---

### Trainer Availability

**`GET /api/v1/trainers/{trainerId}/pt-availability?start={date}&end={date}`**  
Returns day-by-hour slot status map. Requires any authenticated user.  
`start` and `end` are ISO date strings (YYYY-MM-DD). Max window: 14 days.

Response: `TrainerAvailabilityResponse`

```json
{
  "trainerId": "uuid",
  "days": [
    {
      "date": "2026-04-19",
      "open": 6,
      "close": 22,
      "slots": {
        "6":  "past",
        "7":  "class",
        "8":  "available",
        "9":  "booked",
        "10": "available"
      }
    }
  ]
}
```

Slot status values: `available` | `class` | `booked` | `past`  
- `past` — slot start < now + 24h  
- `class` — trainer has a `SCHEDULED` group class overlapping `[slotStart, slotStart+1h)`  
- `booked` — trainer has a `CONFIRMED` PT booking overlapping `[slotStart, slotStart+1h)`  
- `available` — none of the above

---

### PT Bookings — Member

**`POST /api/v1/pt-bookings`**  
Create a PT booking. Requires `USER` role + active membership.

Request body:
```json
{ "trainerId": "uuid", "startAt": "2026-04-20T09:00:00Z" }
```

Response `201 Created`: `PtBookingResponse`

Error codes:
- `422 PT_LEAD_TIME_VIOLATION` — `startAt < now + 24h`
- `409 PT_TRAINER_OVERLAP` — trainer has a confirmed PT booking overlapping the slot
- `409 PT_TRAINER_CLASS_OVERLAP` — trainer has a group class overlapping the slot
- `404 TRAINER_NOT_FOUND`
- `403 MEMBERSHIP_REQUIRED`

---

**`DELETE /api/v1/pt-bookings/{id}`**  
Cancel own PT booking. Requires `USER` role. Member may only cancel their own booking.

Response `200 OK`: `PtBookingResponse` (with `status: "CANCELLED"`)

Error codes:
- `404 PT_BOOKING_NOT_FOUND`
- `409 PT_BOOKING_NOT_ACTIVE`

---

**`GET /api/v1/pt-bookings/me?status=CONFIRMED`**  
Get member's own PT bookings. Requires `USER` role.

Query params: `status` (optional, default none = all), `page`, `size`

Response: `Page<PtBookingResponse>`

---

### Trainer Schedule

**`GET /api/v1/trainers/me/pt-sessions?start={date}&end={date}`**  
Trainer's own upcoming sessions (PT + group classes unified). Requires `TRAINER` role.  
`start`/`end` default to today + 14 days.

Response:
```json
{
  "trainerId": "uuid",
  "trainerName": "Priya Mendes",
  "ptSessions": [...],       // PtBookingResponse[]
  "groupClasses": [...],     // TrainerSessionClassResponse[]
  "stats": {
    "ptCount": 4,
    "classCount": 6,
    "total": 10
  }
}
```

`TrainerSessionClassResponse` shape:
```json
{
  "id": "uuid",
  "name": "HIIT Burn",
  "scheduledAt": "2026-04-19T10:00:00Z",
  "durationMin": 60,
  "room": "Main Floor",
  "type": "class"
}
```

---

### Admin Sessions

**`GET /api/v1/admin/pt-sessions?start=&end=&trainerId=&status=&q=&page=&size=`**  
All PT bookings. Requires `ADMIN` role.

Query params:
- `start` / `end` — ISO date filter on `start_at`
- `trainerId` — UUID filter
- `status` — `CONFIRMED` | `CANCELLED`
- `q` — full-text search across trainer name, member name, room

Response: `Page<AdminPtSessionResponse>`

Stats are returned as a separate endpoint:

**`GET /api/v1/admin/pt-sessions/stats`**  
Returns `AdminPtStatsResponse`:
```json
{
  "activeCount": 24,
  "uniqueMembers": 18,
  "uniqueTrainers": 4,
  "cancelledCount": 3
}
```

**`GET /api/v1/admin/pt-sessions/export?...`**  
Same filters as the list endpoint. Returns `text/csv` with columns:  
`when,trainer,member,room,status,bookedAt`

---

## Section 3 — Kotlin DTOs and Entities

### `PtBooking` Entity

File: `backend/src/main/kotlin/com/gymflow/domain/PtBooking.kt`

```kotlin
@Entity
@Table(name = "pt_bookings")
data class PtBooking(
    @Id val id: UUID = UUID.randomUUID(),

    @Column(name = "trainer_id", nullable = false) val trainerId: UUID,
    @Column(name = "member_id", nullable = false) val memberId: UUID,
    @Column(name = "start_at", nullable = false) var startAt: OffsetDateTime,
    @Column(name = "end_at", nullable = false) var endAt: OffsetDateTime,   // always startAt + 1h
    @Column(nullable = false) var room: String = "",
    @Column var note: String? = null,
    @Column(nullable = false) var status: String = "CONFIRMED",
    @Column(name = "created_at", nullable = false, updatable = false) val createdAt: OffsetDateTime = OffsetDateTime.now(),
    @Column(name = "cancelled_at") var cancelledAt: OffsetDateTime? = null
)
```

No JPA relations — trainer and member are looked up by service layer separately to avoid N+1 issues.

### DTOs

**`PtBookingRequest`**
```kotlin
data class PtBookingRequest(
    @field:NotNull val trainerId: UUID,
    @field:NotNull val startAt: Instant
)
```

**`PtBookingResponse`**
```kotlin
data class PtBookingResponse(
    val id: UUID,
    val trainerId: UUID,
    val trainerName: String,
    val trainerAccentColor: String?,
    val memberId: UUID,
    val memberName: String,
    val startAt: OffsetDateTime,
    val endAt: OffsetDateTime,
    val room: String,
    val note: String?,
    val status: String,
    val cancelledAt: OffsetDateTime?
)
```

**`PtTrainerSummaryResponse`** (trainer directory list item)
```kotlin
data class PtTrainerSummaryResponse(
    val id: UUID,
    val firstName: String,
    val lastName: String,
    val profilePhotoUrl: String?,
    val bio: String?,
    val specializations: List<String>,
    val experienceYears: Int?,
    val sessionsCompleted: Int,
    val accentColor: String?,
    val defaultRoom: String?,
    val nextOpenAt: OffsetDateTime?,
    val weekOpenCount: Int
)
```

**`TrainerAvailabilityResponse`**
```kotlin
data class TrainerAvailabilityResponse(
    val trainerId: UUID,
    val days: List<DayAvailability>
)

data class DayAvailability(
    val date: LocalDate,
    val open: Int,    // gym open hour (6)
    val close: Int,   // gym close hour (22, exclusive)
    val slots: Map<Int, SlotStatus>  // hour → status
)

enum class SlotStatus { AVAILABLE, CLASS, BOOKED, PAST }
```

**`TrainerScheduleResponse`**
```kotlin
data class TrainerScheduleResponse(
    val trainerId: UUID,
    val trainerName: String,
    val ptSessions: List<PtBookingResponse>,
    val groupClasses: List<TrainerSessionClassResponse>,
    val stats: TrainerSessionStats
)

data class TrainerSessionClassResponse(
    val id: UUID,
    val name: String,
    val scheduledAt: OffsetDateTime,
    val durationMin: Int,
    val room: String?,
    val type: String = "class"
)

data class TrainerSessionStats(
    val ptCount: Int,
    val classCount: Int,
    val total: Int
)
```

**`AdminPtSessionResponse`**
```kotlin
data class AdminPtSessionResponse(
    val id: UUID,
    val trainerId: UUID,
    val trainerName: String,
    val trainerAccentColor: String?,
    val memberId: UUID,
    val memberName: String,
    val startAt: OffsetDateTime,
    val endAt: OffsetDateTime,
    val room: String,
    val status: String,
    val cancelledAt: OffsetDateTime?,
    val createdAt: OffsetDateTime
)
```

**`AdminPtStatsResponse`**
```kotlin
data class AdminPtStatsResponse(
    val activeCount: Long,
    val uniqueMembers: Long,
    val uniqueTrainers: Long,
    val cancelledCount: Long
)
```

---

## Section 4 — Business Logic

### Gym Hours

Fixed constant: **06:00–22:00** (exclusive close). Configurable in `application.properties` via `gymflow.pt.gym-open-hour=6` and `gymflow.pt.gym-close-hour=22`. For simplicity, this iteration treats all days equally.

### Availability Algorithm

For a given trainer and date window, for each calendar day:
1. Enumerate hour slots from `gymOpenHour` to `gymCloseHour - 1` (inclusive).
2. Load trainer's `SCHEDULED` group class instances overlapping the day.
3. Load trainer's `CONFIRMED` PT bookings overlapping the day.
4. For each slot hour `h`:
   - `slotStart = date T h:00:00Z`
   - `slotEnd   = date T (h+1):00:00Z`
   - If `slotStart < now + 24h` → `PAST`
   - Else if any group class overlaps `[slotStart, slotEnd)` → `CLASS`
   - Else if any PT booking overlaps `[slotStart, slotEnd)` → `BOOKED`
   - Else → `AVAILABLE`

Overlap test: `classStart < slotEnd AND classEnd > slotStart`.

**Decision:** "24h rule" is evaluated server-side at request time. The client renders the status returned; no client-side time calculation for the past/too-soon state.

### `nextOpenAt` and `weekOpenCount` computation

At trainer list query time:
- Window: today + 7 days (for `weekOpenCount`), today + 14 days (for `nextOpenAt`)
- Run availability algorithm for each trainer
- `nextOpenAt` = minimum `slotStart` where status == `AVAILABLE`
- `weekOpenCount` = count of `AVAILABLE` slots in the 7-day window

**Decision:** Computed at request time (no cache). If this becomes a performance concern, add a materialized view — logged to tech debt.

### Booking Validation

1. Parse and validate `startAt` aligns to a whole hour.
2. Check `startAt >= now + 24h` — else throw `PtLeadTimeViolationException` → `422 PT_LEAD_TIME_VIOLATION`.
3. `endAt = startAt + 1 hour`.
4. Check `startAt` is within gym hours — else throw `PtOutsideGymHoursException` → `422 PT_OUTSIDE_GYM_HOURS`.
5. Check no `CONFIRMED` PT booking for `trainerId` overlaps `[startAt, endAt)` — else throw `PtTrainerOverlapException` → `409 PT_TRAINER_OVERLAP`.
6. Check no `SCHEDULED` group class assigned to `trainerId` overlaps `[startAt, endAt)` — else throw `PtTrainerClassOverlapException` → `409 PT_TRAINER_CLASS_OVERLAP`.
7. Create and persist `PtBooking` with `status = CONFIRMED`, `room = trainer.defaultRoom ?: ""`.

All validation in a single `@Transactional` method. No optimistic locking needed — the overlap check uses a point-in-time query within the transaction.

### Cancellation

Member may cancel any `CONFIRMED` PT booking they own. No time window restriction in this iteration (deferred). Sets `status = CANCELLED`, `cancelledAt = now()`.

---

## Section 5 — Frontend Routes and State

### Routes

| Path | Component | Guard | Description |
|------|-----------|-------|-------------|
| `/training` | `PersonalTrainingPage` | `UserRoute` (active membership) | Member booking flow |
| `/trainer/sessions` | `TrainerSessionsPage` | `TrainerRoute` | Trainer read-only schedule |
| `/admin/pt-sessions` | `AdminPtSessionsPage` | `AdminRoute` | Admin table + export |

**Decision on `/training` route:** chosen over `/personal-training` to match the handoff spec (first option listed) and for brevity in nav links.

**`UserRoute`** already exists. It guards `USER` role. The membership gate (redirect to `/plans`) is enforced by the backend returning `403 MEMBERSHIP_REQUIRED`; the frontend error handler for PT booking redirects to `/plans`.

**`TrainerRoute`:** a new guard component that checks `auth.role === 'TRAINER'` — mirrors `AdminRoute` pattern.

### Zustand Store

File: `frontend/src/store/ptBookingStore.ts`

```ts
interface PtBookingState {
  // Trainer directory
  trainers: PtTrainerSummary[];
  trainersLoading: boolean;
  trainersError: string | null;
  selectedSpecialty: string | null;

  // Slot picker
  selectedTrainer: PtTrainerSummary | null;
  availability: TrainerAvailability | null;
  availabilityLoading: boolean;
  availabilityWeekOffset: number;  // 0 = this week, 1 = next week

  // Confirm modal
  pendingSlot: { trainerId: string; startAt: string } | null;
  bookingLoading: boolean;
  bookingError: string | null;

  // My upcoming PT bookings
  myPtBookings: PtBookingResponse[];
  myPtBookingsLoading: boolean;

  // Admin (loaded on admin page only)
  adminSessions: AdminPtSession[];
  adminStats: AdminPtStats | null;
  adminLoading: boolean;
  adminFilters: AdminPtFilters;

  // Actions
  fetchTrainers: (specialty?: string) => Promise<void>;
  selectTrainer: (trainer: PtTrainerSummary) => void;
  clearSelectedTrainer: () => void;
  fetchAvailability: (trainerId: string, start: string, end: string) => Promise<void>;
  setWeekOffset: (offset: number) => void;
  openConfirmModal: (slot: { trainerId: string; startAt: string }) => void;
  closeConfirmModal: () => void;
  confirmBooking: () => Promise<PtBookingResponse>;
  fetchMyPtBookings: () => Promise<void>;
  cancelMyPtBooking: (id: string) => Promise<void>;
  fetchAdminSessions: (filters: Partial<AdminPtFilters>) => Promise<void>;
  fetchAdminStats: () => Promise<void>;
  setAdminFilters: (filters: Partial<AdminPtFilters>) => void;
}
```

### API Functions

File: `frontend/src/api/ptBookings.ts`

```ts
getPtTrainers(params: { specialty?: string; page?: number; size?: number })
  → Page<PtTrainerSummary>

getPtAvailability(trainerId: string, start: string, end: string)
  → TrainerAvailability

createPtBooking(body: { trainerId: string; startAt: string })
  → PtBookingResponse

cancelPtBooking(id: string)
  → PtBookingResponse

getMyPtBookings(params?: { status?: string; page?: number })
  → Page<PtBookingResponse>

getTrainerSessions(start: string, end: string)
  → TrainerScheduleResponse

getAdminPtSessions(filters: AdminPtFilters)
  → Page<AdminPtSession>

getAdminPtStats()
  → AdminPtStats

exportAdminPtSessions(filters: AdminPtFilters)
  → Blob  (Content-Type: text/csv)
```

### TypeScript Types

File: `frontend/src/types/ptBooking.ts`

```ts
export type SlotStatus = 'available' | 'class' | 'booked' | 'past';

export interface PtTrainerSummary { ... }        // matches PtTrainerSummaryResponse
export interface TrainerAvailability { ... }      // matches TrainerAvailabilityResponse
export interface PtBookingResponse { ... }        // matches backend DTO
export interface AdminPtSession { ... }           // matches AdminPtSessionResponse
export interface AdminPtStats { ... }             // matches AdminPtStatsResponse
export interface AdminPtFilters {
  start?: string; end?: string; trainerId?: string; status?: string; q?: string;
}
```

### Component Files

```
frontend/src/pages/training/PersonalTrainingPage.tsx
frontend/src/pages/trainer/TrainerSessionsPage.tsx
frontend/src/pages/admin/AdminPtSessionsPage.tsx

frontend/src/components/training/TrainerDirectory.tsx
frontend/src/components/training/TrainerCard.tsx
frontend/src/components/training/SlotPicker.tsx
frontend/src/components/training/ConfirmBookingModal.tsx
frontend/src/components/training/MyUpcomingPT.tsx
frontend/src/components/trainer/TrainerSchedule.tsx
frontend/src/components/trainer/SessionRow.tsx
frontend/src/components/trainer/StatTile.tsx
frontend/src/components/admin/AdminPtSessions.tsx

frontend/src/components/layout/TrainerRoute.tsx
frontend/src/hooks/usePtBooking.ts
frontend/src/hooks/useTrainerSessions.ts
frontend/src/hooks/useAdminPtSessions.ts
```

### Error Code Additions

File: `frontend/src/utils/errorMessages.ts` — add to `PT_BOOKING_ERROR_MESSAGES`:

```ts
PT_LEAD_TIME_VIOLATION: 'This slot is too soon. Book at least 24 hours in advance.',
PT_TRAINER_OVERLAP: 'This slot is no longer available.',
PT_TRAINER_CLASS_OVERLAP: 'The trainer has a class at this time.',
PT_OUTSIDE_GYM_HOURS: 'That time is outside gym hours.',
PT_BOOKING_NOT_FOUND: 'Booking not found. Please refresh.',
PT_BOOKING_NOT_ACTIVE: 'This booking has already been cancelled.',
MEMBERSHIP_REQUIRED: 'An active membership is required to book personal training.',
```

---

## Section 6 — New Error Codes

Add to `ErrorCode.kt`:

```kotlin
// Personal Training Bookings
PT_LEAD_TIME_VIOLATION,
PT_TRAINER_OVERLAP,
PT_TRAINER_CLASS_OVERLAP,
PT_OUTSIDE_GYM_HOURS,
PT_BOOKING_NOT_FOUND,
PT_BOOKING_NOT_ACTIVE,
```

---

## Section 7 — Security

- `GET /api/v1/trainers/pt` — any authenticated user
- `GET /api/v1/trainers/{id}/pt-availability` — any authenticated user
- `POST /api/v1/pt-bookings` — `USER` role + active membership check in service
- `DELETE /api/v1/pt-bookings/{id}` — `USER` role; service checks `memberId == requestingUserId`
- `GET /api/v1/pt-bookings/me` — `USER` role
- `GET /api/v1/trainers/me/pt-sessions` — `TRAINER` role
- `GET /api/v1/admin/pt-sessions` — `ADMIN` role
- `GET /api/v1/admin/pt-sessions/stats` — `ADMIN` role
- `GET /api/v1/admin/pt-sessions/export` — `ADMIN` role

No stack traces exposed. All errors return `{ "error": "...", "code": "..." }`.

---

## Section 8 — Deferred / Out of Scope

The following items from the handoff README are explicitly deferred:

- **Cancel window / penalty** — cancellation is unconditional (no 6-hour window). Deferred pending product confirmation.
- **Booking quota** — whether PT counts against monthly quota is deferred. `PtBooking` is a separate table; quota not incremented in this iteration.
- **Notifications** — email/push not built.
- **Recurring bookings** — not built.
- **Waitlist** — not built.
- **Trainer profile deep-link** — no `/trainers/:id` equivalent for PT trainers in this iteration (existing `TrainerProfilePage` is unrelated).
- **Intake form / session notes** — `note` field exists in schema but is not user-writable in this iteration.
- **Mobile responsiveness** — calendar grid not optimised for <640 px.
- **Real-time slot invalidation** — no WebSocket push; client must reload to see newly blocked slots.
- **Trainer accent colors** — stored in DB as nullable; seeded via admin trainer management in a future sprint.
- **Time zones** — all times stored and served in UTC. Browser renders in local time.
- **Trainer-initiated cancellations** — not built.
