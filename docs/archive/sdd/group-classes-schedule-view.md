# SDD: Group Classes Schedule View

## Reference
- PRD: `docs/prd/group-classes-schedule-view.md`
- Date: 2026-03-30

## Architecture Overview
This feature adds a Member-facing, read-only schedule inside the authenticated user portal by reusing the admin Scheduler as the single source of truth. No duplicate schedule table or sync process is introduced: the page reads directly from `class_instances` plus `class_instance_trainers`.

The clarified product decisions are implemented as follows:
- only `class_instances` with `type = 'GROUP'`, `status = 'SCHEDULED'`, and `deleted_at IS NULL` are visible
- `CANCELLED` and `COMPLETED` classes are hidden entirely
- admin-saved `SCHEDULED` classes become visible automatically with no publish step
- Week and Day views are anchored to a selected local date; List view is a rolling 14-day window starting at that same anchor date
- schedule times are rendered in the user's device timezone, so the backend must accept a client-supplied IANA timezone and compute query windows from it

Layers affected: **DB / Backend / Frontend**.

---

## 1. Database Changes

### New Tables
None.

### Modified Tables

```sql
-- V18__add_class_instance_status_for_member_schedule.sql

ALTER TABLE class_instances
  ADD COLUMN status VARCHAR(10);

UPDATE class_instances
SET status = 'SCHEDULED'
WHERE status IS NULL;

ALTER TABLE class_instances
  ALTER COLUMN status SET DEFAULT 'SCHEDULED';

ALTER TABLE class_instances
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE class_instances
  ADD CONSTRAINT chk_class_instances_status
    CHECK (status IN ('SCHEDULED', 'CANCELLED', 'COMPLETED'));

-- Read-heavy member schedule query:
-- visible group classes in a local-date-derived UTC range.
CREATE INDEX idx_class_instances_visible_group_schedule
  ON class_instances (scheduled_at)
  WHERE deleted_at IS NULL
    AND type = 'GROUP'
    AND status = 'SCHEDULED';

-- Missing FK index found during schema review. This protects room deletion
-- (`ON DELETE SET NULL`) and any future room-filtered template queries.
CREATE INDEX idx_class_templates_room_id
  ON class_templates (room_id)
  WHERE room_id IS NOT NULL;
```

Schema review conclusions used for this design:
- `class_instances` is currently missing a lifecycle column, so the PRD rule "show only `SCHEDULED`" cannot be enforced without this migration.
- Existing FK indexes are already present on `refresh_tokens.user_id`, `user_memberships.plan_id`, `class_instances.template_id`, `class_instances.room_id`, `class_instance_trainers.trainer_id`, and `user_profiles.user_id` (via PK). Only `class_templates.room_id` was missing.
- No additional `NOT NULL` changes are required for this feature. Optional trainer assignment, optional room assignment, and optional profile fields remain intentional.
- Cascade / delete behaviour remains correct for this feature: `class_instance_trainers` cascades on class/trainer delete; `class_templates.room_id` and `class_instances.room_id` use `ON DELETE SET NULL`; membership and plan rows remain restrictive for audit/history safety.

### Flyway Migration
`V18__add_class_instance_status_for_member_schedule.sql`

---

## 2. Backend API Contract

### GET /api/v1/class-schedule
**Auth:** Required (`USER` role only)

**Query Parameters:**
- `view` required, one of `week`, `day`, `list`
- `anchorDate` required, ISO date in `YYYY-MM-DD`, interpreted in the supplied `timeZone`
- `timeZone` required, IANA timezone name from the user's device, e.g. `Europe/Warsaw`

List view contract:
- rolling 14-day window
- range is `[anchorDate 00:00 local, anchorDate + 14 days 00:00 local)`
- previous/next navigation moves by 14 days

Week / Day contract:
- Week view uses the ISO Monday-through-Sunday week containing `anchorDate`
- Day view uses only `anchorDate`

**Request Body:**
```json
{}
```

**Success Response (200):**
```json
{
  "view": "week",
  "anchorDate": "2026-03-30",
  "timeZone": "Europe/Warsaw",
  "week": "2026-W14",
  "rangeStartDate": "2026-03-30",
  "rangeEndDateExclusive": "2026-04-06",
  "entries": [
    {
      "id": "9e8c2dc7-0f53-42a8-a8d7-0e84f6fdd9b5",
      "name": "Yoga Flow",
      "scheduledAt": "2026-03-30T16:00:00Z",
      "localDate": "2026-03-30",
      "durationMin": 60,
      "trainerNames": ["Jane Doe", "Marta Kowalska"]
    },
    {
      "id": "2bc2d77a-3725-4a1b-89c6-4b01fdbf7ec4",
      "name": "Pilates Core",
      "scheduledAt": "2026-03-31T08:30:00Z",
      "localDate": "2026-03-31",
      "durationMin": 45,
      "trainerNames": []
    }
  ]
}
```

Response rules:
- `entries` are sorted by `scheduledAt` ascending
- `trainerNames` are sorted alphabetically by trainer last name, then first name
- `trainerNames: []` means the frontend must render `Trainer TBA`
- `week` is always the ISO week containing `anchorDate`, even when `view = day` or `view = list`
- empty period returns `200` with `entries: []`

**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 400 | `INVALID_SCHEDULE_VIEW` | `view` missing or not one of `week`, `day`, `list` |
| 400 | `INVALID_ANCHOR_DATE` | `anchorDate` missing or not parseable as `YYYY-MM-DD` |
| 400 | `INVALID_TIME_ZONE` | `timeZone` missing or not a valid IANA timezone |
| 401 | `UNAUTHORIZED` | No valid Bearer token after normal refresh handling |
| 403 | `ACCESS_DENIED` | Authenticated caller is not a `USER` |

**Business Logic:**
1. `@PreAuthorize("hasRole('USER')")` blocks unauthenticated callers and non-`USER` roles before any schedule data is queried.
2. Parse and validate `view`, `anchorDate`, and `timeZone`. Invalid values throw feature-specific exceptions mapped by `GlobalExceptionHandler`.
3. Build the requested local date range in the supplied timezone:
   - `week`: Monday 00:00 local to next Monday 00:00 local
   - `day`: `anchorDate` 00:00 local to next day 00:00 local
   - `list`: `anchorDate` 00:00 local to `anchorDate.plusDays(14)` 00:00 local
4. Convert the local range bounds to UTC `OffsetDateTime` values before querying PostgreSQL.
5. Query `class_instances` with `LEFT JOIN FETCH ci.trainers` where:
   - `ci.deletedAt IS NULL`
   - `ci.type = 'GROUP'`
   - `ci.status = 'SCHEDULED'`
   - `ci.scheduledAt >= :startUtc`
   - `ci.scheduledAt < :endUtc`
6. Sort instances in memory by `scheduledAt ASC`, then map each row to an entry DTO:
   - `localDate = ci.scheduledAt.atZoneSameInstant(requestedZone).toLocalDate()`
   - `trainerNames = sorted full-name list`
7. Return the response with `view`, `anchorDate`, `timeZone`, `week`, `rangeStartDate`, `rangeEndDateExclusive`, and `entries`.
8. Transaction rule: `@Transactional(readOnly = true)`. This endpoint is idempotent and emits no events, writes, or cache invalidations.

---

## 3. Backend Files / Classes to Create or Modify

### New Files
| File | Type | Purpose |
|------|------|---------|
| `backend/src/main/resources/db/migration/V18__add_class_instance_status_for_member_schedule.sql` | Flyway migration | Adds `class_instances.status`, backfills existing rows, and adds supporting indexes |
| `backend/src/main/kotlin/com/gymflow/controller/UserClassScheduleController.kt` | REST controller | Exposes `GET /api/v1/class-schedule` for authenticated Members |
| `backend/src/main/kotlin/com/gymflow/service/UserClassScheduleService.kt` | Service | Validates query params, enforces membership access, computes timezone-aware ranges, and maps DTOs |
| `backend/src/main/kotlin/com/gymflow/dto/UserClassScheduleResponse.kt` | DTO | Response root plus `UserClassScheduleEntryResponse` |
| `backend/src/test/kotlin/com/gymflow/service/UserClassScheduleServiceTest.kt` | Test | Covers membership gate, timezone range calculation, filtering to `SCHEDULED`, and trainer-name mapping |
| `backend/src/test/kotlin/com/gymflow/controller/UserClassScheduleControllerTest.kt` | Test | Covers 200/400/401/403/404 contracts and JSON shape |

### Modified Files
| File | Change |
|------|--------|
| `backend/src/main/kotlin/com/gymflow/domain/ClassInstance.kt` | Add mapped `status` field with default `SCHEDULED` |
| `backend/src/main/kotlin/com/gymflow/domain/UserMembership.kt` | Add `deletedAt` mapping so active-membership queries can exclude soft-deleted rows safely |
| `backend/src/main/kotlin/com/gymflow/repository/ClassInstanceRepository.kt` | Add member-visible range query filtered by `type`, `status`, and `deletedAt`; fetch trainers in one query |
| `backend/src/main/kotlin/com/gymflow/repository/UserMembershipRepository.kt` | Add `findAccessibleActiveMembership(userId, today)` query with `endDate` check |
| `backend/src/main/kotlin/com/gymflow/service/ClassInstanceService.kt` | Set `status = "SCHEDULED"` on create and copy so all admin-created rows remain visible automatically |
| `backend/src/main/kotlin/com/gymflow/service/ScheduleImportService.kt` | Set imported instances to `status = "SCHEDULED"` |
| `backend/src/main/kotlin/com/gymflow/controller/GlobalExceptionHandler.kt` | Map `INVALID_SCHEDULE_VIEW`, `INVALID_ANCHOR_DATE`, and `INVALID_TIME_ZONE` |

Implementation notes:
- Do not duplicate scheduler query logic into a new repository/table. Reuse `class_instances` directly.
- Keep the member DTO separate from `ClassInstanceResponse`; the member contract must not leak admin-only fields like `capacity`, `room`, `templateId`, `hasRoomConflict`, or audit timestamps.

---

## 4. Frontend Components to Create or Modify

### Pages
| Route | Component | Purpose |
|------|-----------|---------|
| `/schedule` | `GroupClassesSchedulePage` | Member portal page for Week, Day, and rolling List views |

### New Components
| Component | Location | Props |
|-----------|----------|-------|
| `UserRoute` | `frontend/src/components/layout/` | `{ children: ReactNode }` |
| `GroupScheduleViewTabs` | `frontend/src/components/schedule/` | `{ view: ScheduleView; onChange: (view: ScheduleView) => void }` |
| `GroupSchedulePeriodNavigator` | `frontend/src/components/schedule/` | `{ view: ScheduleView; anchorDate: string; timeZone: string; onPrevious: () => void; onNext: () => void; onToday: () => void }` |
| `GroupScheduleWeekGrid` | `frontend/src/components/schedule/` | `{ anchorDate: string; timeZone: string; entries: GroupClassScheduleEntry[] }` |
| `GroupScheduleDayAgenda` | `frontend/src/components/schedule/` | `{ anchorDate: string; timeZone: string; entries: GroupClassScheduleEntry[] }` |
| `GroupScheduleRollingList` | `frontend/src/components/schedule/` | `{ anchorDate: string; timeZone: string; entries: GroupClassScheduleEntry[] }` |
| `GroupScheduleEntryCard` | `frontend/src/components/schedule/` | `{ entry: GroupClassScheduleEntry; timeZone: string; showDate: boolean }` |

### New Types
```ts
export type ScheduleView = 'week' | 'day' | 'list'

export interface GroupClassScheduleEntry {
  id: string
  name: string
  scheduledAt: string
  localDate: string
  durationMin: number
  trainerNames: string[]
}

export interface GroupClassScheduleResponse {
  view: ScheduleView
  anchorDate: string
  timeZone: string
  week: string
  rangeStartDate: string
  rangeEndDateExclusive: string
  entries: GroupClassScheduleEntry[]
}

export interface GetGroupClassScheduleParams {
  view: ScheduleView
  anchorDate: string
  timeZone: string
}
```

### New API Functions
- `getGroupClassSchedule(params: GetGroupClassScheduleParams): Promise<GroupClassScheduleResponse>`

### State
Add `frontend/src/store/groupClassScheduleStore.ts` with:
- `view: ScheduleView`
- `anchorDate: string`
- `timeZone: string`
- `schedule: GroupClassScheduleResponse | null`
- `isLoading: boolean`
- `error: string | null`
- `errorCode: string | null`
- `setView(view: ScheduleView): void`
- `setAnchorDate(anchorDate: string): void`
- `fetchSchedule(params?: Partial<GetGroupClassScheduleParams>): Promise<void>`
- `goToPreviousPeriod(): void`
- `goToNextPeriod(): void`
- `goToToday(): void`

Frontend behaviour rules:
- URL source of truth: `/schedule?view=week&date=2026-03-30`
- `date` is the anchor date; switching views must preserve `date`, so returning to Week/Day restores the same week context
- default first load: `view=week`, `date=today in device timezone`
- timezone source: `Intl.DateTimeFormat().resolvedOptions().timeZone`; fallback to `UTC` only if the browser returns empty/invalid
- no stale data under error: clear the previous schedule payload before showing the retry state
- no schedule actions: do not show buttons for booking, cancelling, waitlist, contacting trainer, or editing

User-visible state handling:
- Loading: show view-level skeletons; do not show previous grid/list as if it were current
- Success: render entries in chronological order; if `trainerNames.length === 0`, show `Trainer TBA`
- Empty: show a clear empty state when `entries.length === 0`
- `NO_ACTIVE_MEMBERSHIP` (legacy — gate removed; should not occur for authenticated USERs)
- `INVALID_SCHEDULE_VIEW`, `INVALID_ANCHOR_DATE`, `INVALID_TIME_ZONE`: reset to the default current-week URL on Retry
- Generic network / 5xx: show non-technical error copy plus Retry

Layout rules:
- Desktop Week view: 7-column Monday-Sunday grid
- Mobile Week view: same 7-day period rendered as stacked day sections, not a horizontally scrolling page
- Day view: agenda list for one date
- List view: date-grouped rolling 14-day agenda starting at `anchorDate`
- The page must remain usable at 360 px width with no page-level horizontal scroll

Permissions / visibility:
- Add `Schedule` to `Navbar` only for authenticated `USER` accounts
- Guard `/schedule` with `UserRoute`
- Authenticated `ADMIN` navigating to `/schedule` should be redirected to `/plans`

---

## 5. Task List per Agent

### → backend-dev
- Create `V18__add_class_instance_status_for_member_schedule.sql` with the exact DDL above.
- Add `status` to `ClassInstance` and default all newly created/copied/imported rows to `SCHEDULED`.
- Add `deletedAt` to `UserMembership` so repository queries can safely exclude soft-deleted rows.
- Add `UserMembershipRepository.findAccessibleActiveMembership(userId, today)` with `status = 'ACTIVE'` and `endDate >= today`.
- Add a member-visible `ClassInstanceRepository` query that fetches trainers and filters to `deletedAt IS NULL`, `type = 'GROUP'`, `status = 'SCHEDULED'`, and a UTC range.
- Implement `UserClassScheduleService.getSchedule(userId, view, anchorDate, timeZone)` as a read-only transaction.
- Implement `UserClassScheduleController` with `GET /api/v1/class-schedule`.
- Add DTOs for `GroupClassScheduleResponse` and entry items only; do not reuse the admin DTO.
- Extend `GlobalExceptionHandler` with `INVALID_SCHEDULE_VIEW`, `INVALID_ANCHOR_DATE`, and `INVALID_TIME_ZONE`.
- Verify trainer names are returned alphabetically and empty trainer lists remain empty arrays.
- Write service tests for:
  - week/day/list range calculation
  - device timezone boundary handling around midnight
  - filtering out `CANCELLED`, `COMPLETED`, `PERSONAL`, and soft-deleted rows
- Write controller tests for 200/400/401/403/404 responses and payload shape.

### → frontend-dev
- Add `UserRoute` and protect `/schedule`.
- Add `/schedule` route in `App.tsx`.
- Add `Schedule` to the authenticated user navbar only.
- Create `groupClassSchedule` types, API module, and Zustand store.
- Use URL query params `view` and `date` as the navigable state; default to current week on first load.
- Pass the browser timezone to the backend on every request.
- Build Week, Day, and rolling List views from the same API payload.
- Make mobile Week view stack days vertically; do not allow page-level horizontal scrolling at 360 px.
- Render `Trainer TBA` when a class entry has no trainer names.
- Implement membership-required, loading, empty, error, and retry states exactly as specified.
- On `NO_ACTIVE_MEMBERSHIP`, show CTA to `/plans`; on `401`, rely on existing Axios refresh/logout flow.
- Add tests for:
  - default current-week load
  - switching views without losing the anchor date
  - previous/next navigation for week/day/list
  - membership-required state on `NO_ACTIVE_MEMBERSHIP`
  - `Trainer TBA` placeholder
  - mobile rendering without horizontal overflow

---

## 6. Risks & Notes
- Assumption: the rolling List view is a 14-day window starting at `anchorDate`. If product later wants 7 days instead, the range constant changes but the schema and endpoint shape can stay the same.
- `class_instances.status` is new. The current admin Scheduler has no lifecycle UI for `CANCELLED` or `COMPLETED`, so all existing and newly created rows will remain `SCHEDULED` until a later scheduler-management change is built.
- Timezone handling applies only to display and date-range selection. Membership entitlement still uses existing server-side `user_memberships.end_date` day semantics.
- This feature is intentionally read-only. It does not expose spots, booking counts, or capacity-derived availability, so it does not introduce a booking race condition. The future Booking feature must enforce capacity with a hard DB guard and transactional booking logic.
- Existing admin trainer/room overlap checks are still application-level and can race under simultaneous admin edits. This feature does not change that concurrency model.
- Dependency: this design assumes Scheduler migrations `V8` through `V14` are already applied and the admin scheduler remains the only writer for `class_instances`.
