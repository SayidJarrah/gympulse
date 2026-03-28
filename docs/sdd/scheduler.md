# SDD: Scheduler (Admin)

## Reference
- PRD: `docs/prd/scheduler.md`
- Date: 2026-03-26

## Architecture Overview

The Scheduler feature introduces three distinct sub-domains that did not previously exist in
the codebase:

1. **Trainer Profile Management** — CRUD operations on a `trainers` table, including binary
   photo upload stored in a `BYTEA` column, served via a dedicated image endpoint.
2. **Room Management** — CRUD operations on a `rooms` table; rooms are a first-class managed
   entity referenced by FK from both `class_templates` and `class_instances`.
3. **Class Schedule Management** — A `class_templates` table (reusable class definitions)
   and a `class_instances` table (concrete scheduled occurrences), connected by a many-to-many
   `class_instance_trainers` join table. CSV import and CSV/iCal export are synchronous
   operations scoped to a single week.

Layers affected: **DB**, **Backend**, **Frontend**.

The existing `GymClass` entity described in `AGENTS.md` does not yet exist in the codebase
(no migration, no Kotlin file found). This SDD introduces its equivalent as two separate
entities (`ClassTemplate` + `ClassInstance`) instead of one monolithic `GymClass`, which is
the correct design for this feature. The `Trainer` entity likewise does not yet exist and is
introduced here from scratch.

### Confirmed decisions (override PRD text where they conflict)
- Trainer-to-class relationship: many-to-many via join table (overrides single `trainerId` FK).
- Drag-and-drop grid granularity: **30-minute slots** (overrides PRD AC 23 "15-minute increments").
  `scheduled_at` must have minutes = 0 or 30; validated in the service layer.
- Trainer photo storage: **DB BYTEA + `photo_mime_type` column**; served via
  `GET /api/v1/trainers/{id}/photo` (overrides PRD note suggesting S3).
- CSV import trainer conflict: row **rejected** with reason `TRAINER_SCHEDULE_CONFLICT`.
- Room is a **managed entity** (`rooms` table). Both `class_templates` and `class_instances`
  reference rooms via nullable FK `room_id`. Room conflict detection uses FK equality (not
  string comparison), making it reliable even after room renames.
- Copy week: copies to immediately next calendar week only.
- Soft room-conflict override: server-side log only; no audit trail UI.
- Co-trainer cap: none.
- Programme periods: none; infinite per-week calendar; URL `?week=YYYY-Www`.
- `class_instances` carries a `type` column (`GROUP` / `PERSONAL`); only `GROUP` logic
  is implemented now.

---

## 1. Database Changes

### New Tables

```sql
-- V8__create_trainers_table.sql

CREATE TABLE trainers (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name      VARCHAR(100)  NOT NULL,
  last_name       VARCHAR(100)  NOT NULL,
  email           VARCHAR(255)  NOT NULL,
  phone           VARCHAR(30),
  bio             VARCHAR(1000),
  specialisations TEXT[]        NOT NULL DEFAULT '{}',
  photo_data      BYTEA,
  photo_mime_type VARCHAR(50),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT uq_trainers_email UNIQUE (email),
  CONSTRAINT chk_trainers_bio_length CHECK (char_length(bio) <= 1000),
  -- Ensures photo bytes and MIME type are always stored together or not at all.
  CONSTRAINT chk_trainers_photo_consistency
    CHECK (
      (photo_data IS NULL AND photo_mime_type IS NULL) OR
      (photo_data IS NOT NULL AND photo_mime_type IS NOT NULL)
    )
);

-- Supports search by last name (default sort) and email lookup.
CREATE INDEX idx_trainers_last_name ON trainers (last_name);
CREATE INDEX idx_trainers_email     ON trainers (email);
-- Supports soft-delete filtered queries (WHERE deleted_at IS NULL).
CREATE INDEX idx_trainers_deleted_at ON trainers (deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_trainers_updated_at
  BEFORE UPDATE ON trainers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

```sql
-- V9__create_rooms_table.sql

CREATE TABLE rooms (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  capacity    INT,
  description VARCHAR(500),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_room_name UNIQUE (name),
  CONSTRAINT chk_room_capacity CHECK (capacity IS NULL OR capacity >= 1)
);

CREATE INDEX idx_rooms_name ON rooms(name);

CREATE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

```sql
-- V10__create_class_templates_table.sql

CREATE TABLE class_templates (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(100) NOT NULL,
  description          VARCHAR(500),
  category             VARCHAR(20)  NOT NULL,
  default_duration_min INTEGER      NOT NULL,
  default_capacity     INTEGER      NOT NULL,
  difficulty           VARCHAR(20)  NOT NULL,
  room_id              UUID         REFERENCES rooms(id) ON DELETE SET NULL,
  is_seeded            BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_class_templates_name UNIQUE (name),
  CONSTRAINT chk_class_templates_category
    CHECK (category IN (
      'Cardio','Strength','Flexibility','Mind & Body','Cycling',
      'Combat','Dance','Functional','Aqua','Wellness','Other')),
  CONSTRAINT chk_class_templates_difficulty
    CHECK (difficulty IN ('Beginner','Intermediate','Advanced','All Levels')),
  CONSTRAINT chk_class_templates_duration
    CHECK (default_duration_min >= 15 AND default_duration_min <= 240),
  CONSTRAINT chk_class_templates_capacity
    CHECK (default_capacity >= 1 AND default_capacity <= 500),
  -- Prevents empty-string names that satisfy NOT NULL but have no meaningful value.
  CONSTRAINT chk_class_templates_name_nonempty
    CHECK (char_length(trim(name)) >= 1)
);

-- Supports name search and category filter.
CREATE INDEX idx_class_templates_category   ON class_templates (category);
CREATE INDEX idx_class_templates_name       ON class_templates (name);

CREATE TRIGGER trg_class_templates_updated_at
  BEFORE UPDATE ON class_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

```sql
-- V11__create_class_instances_table.sql

CREATE TABLE class_instances (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID         REFERENCES class_templates(id) ON DELETE SET NULL,
  name            VARCHAR(100) NOT NULL,
  type            VARCHAR(10)  NOT NULL DEFAULT 'GROUP',
  scheduled_at    TIMESTAMPTZ  NOT NULL,
  duration_min    INTEGER      NOT NULL,
  capacity        INTEGER      NOT NULL,
  room_id         UUID         REFERENCES rooms(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT chk_class_instances_type
    CHECK (type IN ('GROUP','PERSONAL')),
  CONSTRAINT chk_class_instances_duration
    CHECK (duration_min >= 15 AND duration_min <= 240),
  CONSTRAINT chk_class_instances_capacity
    CHECK (capacity >= 1 AND capacity <= 500),
  -- Enforces 30-minute slot grid. EXTRACT on a TIMESTAMPTZ with AT TIME ZONE 'UTC'
  -- converts to a plain TIMESTAMP in UTC before extracting, giving the correct
  -- minute value regardless of the PostgreSQL session timezone. Verified against
  -- PostgreSQL 15 with TIMESTAMPTZ inputs: '07:00Z' -> 0, '07:30Z' -> 30. Correct.
  CONSTRAINT chk_class_instances_slot
    CHECK (EXTRACT(MINUTE FROM scheduled_at AT TIME ZONE 'UTC') IN (0, 30)),
  -- Prevents empty-string names that satisfy NOT NULL but have no meaningful value.
  CONSTRAINT chk_class_instances_name_nonempty
    CHECK (char_length(trim(name)) >= 1)
);

-- Primary query pattern: fetch all instances in a date range (week view).
-- Also used by the trainer conflict overlap query (range scan on scheduled_at).
CREATE INDEX idx_class_instances_scheduled_at ON class_instances (scheduled_at);
-- Supports "find all instances for this template" (deletion confirmation, copy-week).
-- A composite index on (template_id, scheduled_at) would cover ORDER BY in the
-- deletion confirmation list; use this if profiling shows a sort step on large datasets.
CREATE INDEX idx_class_instances_template_id  ON class_instances (template_id);
-- Supports soft-delete filtered queries (WHERE deleted_at IS NULL).
CREATE INDEX idx_class_instances_deleted_at   ON class_instances (deleted_at) WHERE deleted_at IS NULL;
-- Supports room conflict detection (find instances sharing the same room in a time range).
CREATE INDEX idx_class_instances_room_id ON class_instances (room_id) WHERE room_id IS NOT NULL;

CREATE TRIGGER trg_class_instances_updated_at
  BEFORE UPDATE ON class_instances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

```sql
-- V12__create_class_instance_trainers_table.sql

CREATE TABLE class_instance_trainers (
  class_instance_id UUID        NOT NULL REFERENCES class_instances(id) ON DELETE CASCADE,
  trainer_id        UUID        NOT NULL REFERENCES trainers(id)        ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (class_instance_id, trainer_id)
);

-- Supports reverse lookup: "find all instances assigned to this trainer"
-- (used by trainer delete confirmation and trainer conflict overlap query).
-- The PK (class_instance_id, trainer_id) already gives an implicit index on
-- class_instance_id; this explicit index covers trainer_id lookups.
CREATE INDEX idx_cit_trainer_id ON class_instance_trainers (trainer_id);
```

### Modified Tables

No existing tables are modified. The `GymClass` entity mentioned in `AGENTS.md` was never
migrated, so there is no legacy table or column to alter.

### Flyway Migration Files

| File | Description |
|------|-------------|
| `V8__create_trainers_table.sql` | Trainer profiles (photo stored as BYTEA) |
| `V9__create_rooms_table.sql` | Room managed entity (name, capacity, description) |
| `V10__create_class_templates_table.sql` | Reusable class definitions; `room_id` FK references `rooms` |
| `V11__create_class_instances_table.sql` | Scheduled class occurrences; `room_id` FK references `rooms` |
| `V12__create_class_instance_trainers_table.sql` | Many-to-many trainer assignment |

**Note on template seeding:** The 10 predefined templates (AC 16) are inserted by
`ClassTemplateService.seedDefaultTemplates()` called from an `ApplicationRunner` bean on
startup. The method checks `classTemplateRepository.count() == 0L` before inserting, making
it idempotent. This is NOT done via a Flyway migration because the seeding depends on the
application-layer uniqueness check rather than a pure SQL `ON CONFLICT DO NOTHING` guard
(which is also acceptable but couples seed data to a migration).

Alternatively, a `V13__seed_class_templates.sql` using `INSERT ... ON CONFLICT DO NOTHING`
is a valid implementation choice — the backend-dev may choose either approach, but must not
do both (guard with `is_seeded = TRUE` if using the `ApplicationRunner` approach to allow
admin deletion without re-seeding).

---

## 2. Backend API Contract

### Room Management Endpoints

---

#### GET /api/v1/rooms
**Auth:** Required (ADMIN role)
**Query Parameters:**
- `search` (optional) — partial match on room name (case-insensitive)
- `page` (default 0), `size` (default 20), `sort` (default `name,asc`)

**Success Response (200):**
```json
{
  "content": [
    {
      "id": "uuid",
      "name": "Studio A",
      "capacity": 25,
      "description": "Main aerobics studio with mirrors",
      "createdAt": "2026-03-26T10:00:00Z"
    }
  ],
  "totalElements": 3,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

---

#### POST /api/v1/rooms
**Auth:** Required (ADMIN role)
**Request Body:**
```json
{
  "name": "Studio A",
  "capacity": 25,
  "description": "Main aerobics studio with mirrors"
}
```
**Success Response (201):**
```json
{
  "id": "uuid",
  "name": "Studio A",
  "capacity": 25,
  "description": "Main aerobics studio with mirrors",
  "createdAt": "2026-03-26T10:00:00Z"
}
```
**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 409 | `ROOM_NAME_CONFLICT` | A room with that name already exists (AC 14) |
| 422 | `VALIDATION_ERROR` | Name missing or blank (AC 15) |

**Business Logic:**
1. Validate `name` is non-blank.
2. Check no existing room has the same name (case-sensitive unique constraint); throw `RoomNameConflictException` if so.
3. Persist room; return 201.

---

#### PUT /api/v1/rooms/{id}
**Auth:** Required (ADMIN role)
**Request Body:** Same shape as POST.
**Success Response (200):** Updated `RoomResponse`.
**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 404 | `ROOM_NOT_FOUND` | No room with that id |
| 409 | `ROOM_NAME_CONFLICT` | Name belongs to a different room (AC 14) |
| 422 | `VALIDATION_ERROR` | Validation failure (AC 15) |

**Business Logic:**
1. Validate fields.
2. If name changed, check uniqueness excluding this room's own record.
3. Persist changes; return 200. Changes do NOT retroactively affect class instances that already reference this room (AC 11).

---

#### DELETE /api/v1/rooms/{id}
**Auth:** Required (ADMIN role)
**Success Response (204):** No body (when no assigned instances exist or after confirmed delete).
**Intermediate Response (200):** When the room is assigned to class instances and the request does not include a confirmation signal, return the list of affected instances for client-side confirmation:
```json
{
  "error": "Room is assigned to scheduled class instances",
  "code": "ROOM_HAS_INSTANCES",
  "affectedInstances": [
    { "id": "uuid", "name": "HIIT Bootcamp", "scheduledAt": "2026-03-27T09:00:00Z" }
  ]
}
```
On confirmed delete (client re-sends with `force=true` query param), set `room_id = NULL` on all affected instances then delete the room; return 204.
**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 404 | `ROOM_NOT_FOUND` | No room with that id |

**Business Logic:**
1. Look up room; throw `RoomNotFoundException` if not found.
2. Count `class_instances` where `room_id = id` and `deleted_at IS NULL`.
3. If count > 0 and `force != true`, return 200 with affected instance list.
4. If count == 0 or `force=true`: update all matching instances to set `room_id = NULL`, then delete the room row; return 204.

---

### Trainer Endpoints

---

#### POST /api/v1/admin/trainers
**Auth:** Required (ADMIN role)
**Request Body (multipart/form-data — preferred)** OR **application/json** (photo uploaded separately):
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane.doe@gym.com",
  "phone": "+1-555-0100",
  "bio": "Certified personal trainer with 10 years experience.",
  "specialisations": ["HIIT", "Yoga", "CrossFit"]
}
```
**Success Response (201):**
```json
{
  "id": "uuid",
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane.doe@gym.com",
  "phone": "+1-555-0100",
  "bio": "Certified personal trainer with 10 years experience.",
  "specialisations": ["HIIT", "Yoga", "CrossFit"],
  "hasPhoto": false,
  "createdAt": "2026-03-26T10:00:00Z",
  "updatedAt": "2026-03-26T10:00:00Z"
}
```
**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 409 | `TRAINER_EMAIL_CONFLICT` | Email already exists (AC 7) |
| 422 | `VALIDATION_ERROR` | firstName, lastName, or email missing; specialisations > 10 tags or a tag > 50 chars (AC 8) |

**Business Logic:**
1. Validate request fields via Bean Validation.
2. Check no existing trainer has the same email; throw `TrainerEmailConflictException` if so.
3. Persist trainer; return 201.

---

#### GET /api/v1/admin/trainers
**Auth:** Required (ADMIN role)
**Query Parameters:**
- `search` (optional) — partial match on first name, last name, or email (case-insensitive)
- `page` (default 0), `size` (default 20), `sort` (default `lastName,asc`)

**Success Response (200):**
```json
{
  "content": [
    {
      "id": "uuid",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane.doe@gym.com",
      "phone": "+1-555-0100",
      "bio": "...",
      "specialisations": ["HIIT"],
      "hasPhoto": true,
      "createdAt": "2026-03-26T10:00:00Z",
      "updatedAt": "2026-03-26T10:00:00Z"
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

**Business Logic:**
1. If `search` is provided, filter with `ILIKE %search%` on `first_name`, `last_name`, `email` (OR conditions).
2. `hasPhoto` is `true` if `photo_data IS NOT NULL`.
3. Photo bytes are never included in list responses.

---

#### GET /api/v1/admin/trainers/{id}
**Auth:** Required (ADMIN role)
**Success Response (200):** Same shape as a single item from the list above.
**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 404 | `TRAINER_NOT_FOUND` | No trainer with that id |

---

#### PUT /api/v1/admin/trainers/{id}
**Auth:** Required (ADMIN role)
**Request Body:** Same shape as POST (all fields, no photo).
**Success Response (200):** Updated trainer object (same shape as GET single).
**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 404 | `TRAINER_NOT_FOUND` | No trainer with that id |
| 409 | `TRAINER_EMAIL_CONFLICT` | Email belongs to a different trainer (AC 7) |
| 422 | `VALIDATION_ERROR` | Validation failure (AC 8) |

**Business Logic:**
1. Validate fields.
2. If email changed, check uniqueness excluding this trainer's own record.
3. Persist; return 200.

---

#### DELETE /api/v1/admin/trainers/{id}
**Auth:** Required (ADMIN role)
**Query Parameters:**
- `force=true` (optional) — bypasses the confirmation gate when client has acknowledged affected instances

**Success Response (204):** No body.
**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 404 | `TRAINER_NOT_FOUND` | No trainer with that id |
| 409 | `TRAINER_HAS_ASSIGNMENTS` | Trainer is assigned to future instances and `force` is not `true` |

**Business Logic:**
1. Count rows in `class_instance_trainers` where `trainer_id = id`.
2. If count > 0 and `force != true`, return 409 with the list of affected instances in the response body:
   ```json
   {
     "error": "Trainer is assigned to scheduled classes",
     "code": "TRAINER_HAS_ASSIGNMENTS",
     "affectedInstances": [
       { "id": "uuid", "name": "Yoga Flow", "scheduledAt": "2026-03-27T09:00:00Z" }
     ]
   }
   ```
3. If `force=true` (or count == 0), delete rows from `class_instance_trainers` for this trainer, then delete the trainer.
4. This leaves the class instances intact but with one fewer assigned trainer (AC 5).

---

#### POST /api/v1/admin/trainers/{id}/photo
**Auth:** Required (ADMIN role)
**Request:** `multipart/form-data`, field name `photo`, content type JPEG / PNG / WEBP, max 5 MB.
**Success Response (200):**
```json
{ "message": "Photo uploaded successfully" }
```
**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 404 | `TRAINER_NOT_FOUND` | No trainer with that id |
| 415 | `INVALID_PHOTO_FORMAT` | Content type is not image/jpeg, image/png, or image/webp (AC 2) |
| 413 | `PHOTO_TOO_LARGE` | File exceeds 5 MB (AC 2) |

**Business Logic:**
1. Validate content type and file size before reading bytes.
2. Store bytes in `photo_data` and MIME type string in `photo_mime_type`.

---

#### GET /api/v1/trainers/{id}/photo
**Auth:** Not required (public endpoint — members will need it in the booking phase).
**Success Response (200):** Raw image bytes with `Content-Type` set to the stored `photo_mime_type`.
**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 404 | `TRAINER_NOT_FOUND` | No trainer with that id |
| 404 | `PHOTO_NOT_FOUND` | Trainer exists but has no photo |

---

### Class Template Endpoints

---

#### POST /api/v1/admin/class-templates
**Auth:** Required (ADMIN role)
**Request Body:**
```json
{
  "name": "HIIT Bootcamp",
  "description": "High-intensity interval training session.",
  "category": "Cardio",
  "defaultDurationMin": 60,
  "defaultCapacity": 20,
  "difficulty": "Intermediate",
  "roomId": "uuid"
}
```
**Success Response (201):**
```json
{
  "id": "uuid",
  "name": "HIIT Bootcamp",
  "description": "High-intensity interval training session.",
  "category": "Cardio",
  "defaultDurationMin": 60,
  "defaultCapacity": 20,
  "difficulty": "Intermediate",
  "room": { "id": "uuid", "name": "Studio A" },
  "isSeeded": false,
  "createdAt": "2026-03-26T10:00:00Z",
  "updatedAt": "2026-03-26T10:00:00Z"
}
```
**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 409 | `CLASS_TEMPLATE_NAME_CONFLICT` | Name already taken (AC 22) |
| 422 | `VALIDATION_ERROR` | Any required field missing or out of range (AC 17) |

---

#### GET /api/v1/admin/class-templates
**Auth:** Required (ADMIN role)
**Query Parameters:** `search` (name, case-insensitive), `category`, `page`, `size`, `sort` (default `name,asc`)
**Success Response (200):** Paginated list of template objects (same shape as single template above).

**Business Logic:**
1. On first call, if `classTemplateRepository.count() == 0L`, seed the 10 default templates (AC 16) before returning.
2. Apply search/filter.

---

#### PUT /api/v1/admin/class-templates/{id}
**Auth:** Required (ADMIN role)
**Request Body:** Same as POST.
**Success Response (200):** Updated template object.
**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 404 | `CLASS_TEMPLATE_NOT_FOUND` | No template with that id |
| 409 | `CLASS_TEMPLATE_NAME_CONFLICT` | Name belongs to a different template (AC 22) |
| 422 | `VALIDATION_ERROR` | Validation failure |

**Business Logic:** Changes do NOT retroactively update derived class instances (AC 18).

---

#### DELETE /api/v1/admin/class-templates/{id}
**Auth:** Required (ADMIN role)
**Query Parameters:** `force=true` (optional)
**Success Response (204):** No body.
**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 404 | `CLASS_TEMPLATE_NOT_FOUND` | No template with that id |
| 409 | `CLASS_TEMPLATE_HAS_INSTANCES` | Template has scheduled instances and `force` is not `true` |

**Business Logic:**
1. Count `class_instances` where `template_id = id`.
2. If count > 0 and `force != true`, return 409 with affected instances list:
   ```json
   {
     "error": "Class template has scheduled instances",
     "code": "CLASS_TEMPLATE_HAS_INSTANCES",
     "affectedInstances": [
       { "id": "uuid", "name": "HIIT Bootcamp", "scheduledAt": "2026-03-27T07:00:00Z" }
     ]
   }
   ```
3. If `force=true`, set `template_id = NULL` on all derived instances (ON DELETE SET NULL handles this via the FK), then delete the template (AC 20).

---

### Class Instance (Schedule) Endpoints

---

#### POST /api/v1/admin/class-instances
**Auth:** Required (ADMIN role)
**Request Body:**
```json
{
  "templateId": "uuid | null",
  "name": "HIIT Bootcamp",
  "scheduledAt": "2026-03-27T07:00:00Z",
  "durationMin": 60,
  "capacity": 20,
  "roomId": "uuid | null",
  "trainerIds": ["uuid", "uuid"]
}
```
**Success Response (201):** Full class instance object (see shape below).
**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 409 | `TRAINER_SCHEDULE_CONFLICT` | Any assigned trainer overlaps with another instance (AC 28) |
| 422 | `VALIDATION_ERROR` | `durationMin` < 15 or > 240; `capacity` < 1 or > 500; `scheduledAt` minutes not 0 or 30 (AC 33, 35) |
| 404 | `TRAINER_NOT_FOUND` | Any `trainerId` does not exist |
| 404 | `ROOM_NOT_FOUND` | Provided `roomId` does not exist |

**Class Instance Response Shape:**
```json
{
  "id": "uuid",
  "templateId": "uuid | null",
  "name": "HIIT Bootcamp",
  "type": "GROUP",
  "scheduledAt": "2026-03-27T07:00:00Z",
  "durationMin": 60,
  "capacity": 20,
  "room": { "id": "uuid", "name": "Studio A" },
  "trainers": [
    { "id": "uuid", "firstName": "Jane", "lastName": "Doe" }
  ],
  "hasRoomConflict": false,
  "createdAt": "2026-03-26T10:00:00Z",
  "updatedAt": "2026-03-26T10:00:00Z"
}
```

**Business Logic:**
1. Validate all fields.
2. If `roomId` is provided, verify the room exists; throw `RoomNotFoundException` if not.
3. For each `trainerId`, check no existing instance assigns that trainer to a time window
   that overlaps `[scheduledAt, scheduledAt + durationMin)`. Overlap query:
   ```sql
   SELECT ci.id FROM class_instances ci
   JOIN class_instance_trainers cit ON cit.class_instance_id = ci.id
   WHERE cit.trainer_id = :trainerId
     AND ci.scheduled_at < :endTime
     AND (ci.scheduled_at + ci.duration_min * INTERVAL '1 minute') > :startTime
   ```
   If any row found, throw `TrainerScheduleConflictException`.
4. Persist instance and trainer assignments.
5. Compute `hasRoomConflict` (same `room_id` FK, overlapping time window) and log if true (soft check). Room conflict uses FK equality: `room_id = :roomId` — not string comparison.

---

#### GET /api/v1/admin/class-instances
**Auth:** Required (ADMIN role)
**Query Parameters:**
- `week` (required) — ISO week string `YYYY-Www` (e.g. `2026-W14`); server computes Monday 00:00:00 UTC to Sunday 23:59:59 UTC of that week
- `page`, `size` (optional, defaults 0 / 200 — one week fits in one page)

**Success Response (200):**
```json
{
  "week": "2026-W14",
  "instances": [
    { /* ClassInstanceResponse */ }
  ]
}
```

**Business Logic:**
1. Parse the ISO week string to a date range (Monday to Sunday inclusive).
2. Query `class_instances WHERE scheduled_at >= weekStart AND scheduled_at < weekEnd`.
3. Eagerly load trainer assignments via join.
4. Compute `hasRoomConflict` for each instance against others in the same response using `room_id` FK equality.

---

#### GET /api/v1/admin/class-instances/{id}
**Auth:** Required (ADMIN role)
**Success Response (200):** Single `ClassInstanceResponse`.
**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 404 | `CLASS_INSTANCE_NOT_FOUND` | No instance with that id |

---

#### PATCH /api/v1/admin/class-instances/{id}
**Auth:** Required (ADMIN role)
**Request Body (all fields optional — send only what changes):**
```json
{
  "scheduledAt": "2026-03-27T09:00:00Z",
  "durationMin": 45,
  "capacity": 15,
  "roomId": "uuid | null",
  "trainerIds": ["uuid"]
}
```
**Success Response (200):** Updated `ClassInstanceResponse`.
**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 404 | `CLASS_INSTANCE_NOT_FOUND` | No instance with that id |
| 409 | `TRAINER_SCHEDULE_CONFLICT` | Trainer overlap after applying the patch (AC 28) |
| 422 | `VALIDATION_ERROR` | Any field out of range |
| 404 | `TRAINER_NOT_FOUND` | Any `trainerId` does not exist |
| 404 | `ROOM_NOT_FOUND` | Provided `roomId` does not exist |

**Business Logic:**
1. Apply only the fields present in the request.
2. If `roomId` is present and non-null, verify the room exists.
3. Re-run trainer conflict check excluding this instance from the overlap query.
4. Persist changes.

---

#### DELETE /api/v1/admin/class-instances/{id}
**Auth:** Required (ADMIN role)
**Success Response (204):** No body.
**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 404 | `CLASS_INSTANCE_NOT_FOUND` | No instance with that id |

---

#### POST /api/v1/admin/class-instances/copy-week
**Auth:** Required (ADMIN role)
**Request Body:**
```json
{ "sourceWeek": "2026-W14" }
```
**Success Response (200):**
```json
{
  "copied": 12,
  "skipped": 0,
  "targetWeek": "2026-W15"
}
```
**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 422 | `VALIDATION_ERROR` | `sourceWeek` is not a valid ISO week string |

**Business Logic:**
1. Parse `sourceWeek` to date range; derive `targetWeek` as the immediately following week.
2. Load all instances in `sourceWeek`.
3. For each instance, compute the target `scheduledAt` by shifting the day-of-week offset
   by exactly 7 days.
4. For each target slot, check if an instance already exists at the exact `scheduledAt` with
   the same name — if yes, skip it (no overwrite); if no, create a new instance copying all
   fields (including `room_id`) and trainer assignments (AC 32).
5. Return counts. Note: trainer conflict checks are NOT enforced during copy-week to avoid
   blocking bulk operations — the admin is expected to review the copied week.
   Assumption: copy-week is a bulk convenience operation; individual conflict resolution
   happens when the admin edits individual instances post-copy.

---

### Import / Export Endpoints

---

#### POST /api/v1/admin/schedule/import
**Auth:** Required (ADMIN role)
**Request:** `multipart/form-data`, field `file`, content type `text/csv`, max 2 MB.
**Success Response (200):**
```json
{
  "imported": 8,
  "rejected": 2,
  "errors": [
    { "row": 3, "reason": "TRAINER_NOT_FOUND", "detail": "trainer_email 'unknown@gym.com' not found" },
    { "row": 7, "reason": "TRAINER_SCHEDULE_CONFLICT", "detail": "Trainer Jane Doe already assigned at 09:00" }
  ]
}
```
**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 400 | `IMPORT_FORMAT_INVALID` | Required column headers missing (AC 39) |
| 413 | `IMPORT_FILE_TOO_LARGE` | File exceeds 2 MB (AC 43) |
| 415 | `IMPORT_FORMAT_INVALID` | Content type is not text/csv |

**Required CSV columns:** `class_name`, `date`, `start_time`, `duration_minutes`, `capacity`
**Optional CSV columns:** `trainer_email`, `room`

**Business Logic:**
1. Validate file size and content type before parsing.
2. Parse headers; if any required column is absent, return `IMPORT_FORMAT_INVALID` immediately — no rows saved.
3. For each data row:
   - Validate required fields (`class_name` non-empty; `date` valid ISO date; `start_time` valid HH:MM with minutes 0 or 30; `duration_minutes` 15–240; `capacity` 1–500).
   - If `trainer_email` present, look up trainer; if not found, reject row with `TRAINER_NOT_FOUND`.
   - If `trainer_email` present and trainer found, check for time overlap; if conflict, reject row with `TRAINER_SCHEDULE_CONFLICT`.
   - If `room` present, look up room by name in the `rooms` table; if no match found, reject row with `ROOM_NOT_FOUND` (AC 41). On match, set `room_id` to the found room's id.
   - If `class_name` matches an existing template, set `template_id` on the new instance; otherwise `template_id = NULL` (AC 42).
   - Compute `scheduled_at` from `date` + `start_time` as UTC.
   - On success, collect the instance for batch insert.
4. Batch-insert all valid instances and trainer assignments in one transaction.
5. Return the summary.

---

#### GET /api/v1/admin/schedule/export
**Auth:** Required (ADMIN role)
**Query Parameters:**
- `week` (required) — ISO week string `YYYY-Www`
- `format` (required) — `csv` or `ical`

**Success Response (200):**
- For `csv`: `Content-Type: text/csv; charset=UTF-8`, `Content-Disposition: attachment; filename="schedule-{week}.csv"`
- For `ical`: `Content-Type: text/calendar; charset=UTF-8`, `Content-Disposition: attachment; filename="schedule-{week}.ics"`

**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 422 | `VALIDATION_ERROR` | `week` not a valid ISO week string; `format` not `csv` or `ical` |

**iCal spec (RFC 5545):** Each instance becomes a `VEVENT` with:
- `SUMMARY` = class name
- `DTSTART` = `scheduledAt` in UTC (`Z` suffix)
- `DTEND` = `scheduledAt + durationMin` in UTC
- `LOCATION` = room name resolved from `room_id` (omit property if `room_id` is null)
- `DESCRIPTION` = comma-separated trainer full names + "; " + class description from template (if linked)
- `UID` = `{instanceId}@gymflow`

**CSV columns (matching import format):** `class_name`, `date`, `start_time`, `duration_minutes`, `capacity`, `trainer_email`, `room`
The `room` column outputs the room's name resolved from `room_id` (or blank if `room_id` is null).
For instances with multiple trainers, one row per trainer is emitted (trainer_email repeated). If no trainer, `trainer_email` is empty.

---

## 3. Kotlin Classes to Create

### New Files

| File | Type | Purpose |
|------|------|---------|
| `domain/Trainer.kt` | Entity | JPA entity for `trainers` table; `photoData: ByteArray?` and `photoMimeType: String?` fields |
| `domain/Room.kt` | Entity | JPA entity for `rooms` table; `name`, `capacity`, `description` fields |
| `domain/ClassTemplate.kt` | Entity | JPA entity for `class_templates` table; `room: Room?` as `@ManyToOne` FK |
| `domain/ClassInstance.kt` | Entity | JPA entity for `class_instances` table; `room: Room?` as `@ManyToOne` FK; `@ManyToMany` join to `Trainer` via `class_instance_trainers` |
| `dto/TrainerRequest.kt` | DTO | Create/update trainer (no photo — photo via separate endpoint) |
| `dto/TrainerResponse.kt` | DTO | Trainer response (no photo bytes; includes `hasPhoto: Boolean`) |
| `dto/TrainerSummaryResponse.kt` | DTO | Slim DTO used inside `ClassInstanceResponse` (`id`, `firstName`, `lastName`) |
| `dto/RoomRequest.kt` | DTO | `data class RoomRequest(val name: String, val capacity: Int?, val description: String?)` |
| `dto/RoomResponse.kt` | DTO | `data class RoomResponse(val id: UUID, val name: String, val capacity: Int?, val description: String?, val createdAt: Instant)` |
| `dto/ClassTemplateRequest.kt` | DTO | Create/update template; `roomId: UUID?` (nullable FK reference) |
| `dto/ClassTemplateResponse.kt` | DTO | Template response; `room: RoomSummary?` (id + name) |
| `dto/ClassInstanceRequest.kt` | DTO | Create instance (`templateId?`, `name`, `scheduledAt`, `durationMin`, `capacity`, `roomId: UUID?`, `trainerIds`) |
| `dto/ClassInstancePatchRequest.kt` | DTO | Patch instance — all fields optional; `roomId: UUID?` |
| `dto/ClassInstanceResponse.kt` | DTO | Full instance response including `room: RoomSummary?`, `trainers: List<TrainerSummaryResponse>`, and `hasRoomConflict: Boolean` |
| `dto/WeekScheduleResponse.kt` | DTO | Wraps `week: String` and `instances: List<ClassInstanceResponse>` |
| `dto/CopyWeekRequest.kt` | DTO | `sourceWeek: String` |
| `dto/CopyWeekResponse.kt` | DTO | `copied: Int`, `skipped: Int`, `targetWeek: String` |
| `dto/ImportResultResponse.kt` | DTO | `imported`, `rejected`, `errors: List<ImportRowError>` |
| `dto/ImportRowError.kt` | DTO | `row: Int`, `reason: String`, `detail: String` |
| `dto/TrainerHasAssignmentsResponse.kt` | DTO | 409 body for trainer delete: extends `ErrorResponse` + `affectedInstances` list |
| `dto/TemplateHasInstancesResponse.kt` | DTO | 409 body for template delete: extends `ErrorResponse` + `affectedInstances` list |
| `repository/TrainerRepository.kt` | Repository | CRUD + search query (`findBySearch`) using `@Query` with `ILIKE` |
| `repository/RoomRepository.kt` | Repository | Spring Data JPA; `findByNameIgnoreCase` for import lookup; `findByNameContainingIgnoreCase` for search |
| `repository/ClassTemplateRepository.kt` | Repository | CRUD + `findByNameContainingIgnoreCase` + `findByCategory` + `count()` |
| `repository/ClassInstanceRepository.kt` | Repository | `findByScheduledAtBetween`, overlap query for conflict detection, `findByRoomId` for room delete |
| `service/TrainerService.kt` | Service | Trainer CRUD, photo upload/serve, seeding guard |
| `service/RoomService.kt` | Service | Room CRUD; affected-instance check on delete; `force` delete sets `room_id = NULL` on instances before deleting room |
| `service/ClassTemplateService.kt` | Service | Template CRUD, idempotent seeding of 10 defaults |
| `service/ClassInstanceService.kt` | Service | Instance CRUD, conflict detection (room overlap by `room_id` FK equality), copy-week, import, export |
| `service/ScheduleExportService.kt` | Service | CSV and iCal serialisation (use `net.fortuna.ical4j` for iCal); resolves room name from `room_id` for LOCATION and CSV `room` column |
| `service/ScheduleImportService.kt` | Service | CSV parsing (use `org.apache.commons:commons-csv`); looks up `room` value by name in `rooms` table; rejects row with `ROOM_NOT_FOUND` if no match |
| `controller/AdminTrainerController.kt` | Controller | `@RequestMapping("/api/v1/admin/trainers")`, `@PreAuthorize("hasRole('ADMIN')")` |
| `controller/TrainerPhotoController.kt` | Controller | Public `GET /api/v1/trainers/{id}/photo` (no auth); admin `POST /api/v1/admin/trainers/{id}/photo` |
| `controller/RoomController.kt` | Controller | `@RequestMapping("/api/v1/rooms")`, `@PreAuthorize("hasRole('ADMIN')")` |
| `controller/AdminClassTemplateController.kt` | Controller | `@RequestMapping("/api/v1/admin/class-templates")` |
| `controller/AdminClassInstanceController.kt` | Controller | `@RequestMapping("/api/v1/admin/class-instances")` |
| `controller/AdminScheduleImportExportController.kt` | Controller | `POST .../schedule/import` and `GET .../schedule/export` |
| `service/TrainerEmailConflictException.kt` | Exception | 409 |
| `service/TrainerNotFoundException.kt` | Exception | 404 |
| `service/TrainerHasAssignmentsException.kt` | Exception | 409 with `affectedInstances` payload |
| `service/TrainerScheduleConflictException.kt` | Exception | 409 |
| `service/RoomNotFoundException.kt` | Exception | 404 |
| `service/RoomNameConflictException.kt` | Exception | 409 |
| `service/RoomHasInstancesException.kt` | Exception | 200 with `affectedInstances` payload (confirmation gate) |
| `service/ClassTemplateNotFoundException.kt` | Exception | 404 |
| `service/ClassTemplateNameConflictException.kt` | Exception | 409 |
| `service/ClassTemplateHasInstancesException.kt` | Exception | 409 with `affectedInstances` payload |
| `service/ClassInstanceNotFoundException.kt` | Exception | 404 |
| `service/ImportFormatInvalidException.kt` | Exception | 400 |
| `service/ImportFileTooLargeException.kt` | Exception | 413 |

### Modified Files

| File | Change |
|------|--------|
| `controller/GlobalExceptionHandler.kt` | Add `@ExceptionHandler` for all new exception types listed above, including `RoomNotFoundException`, `RoomNameConflictException`, `RoomHasInstancesException` |
| `config/SecurityConfig.kt` | Permit `GET /api/v1/trainers/*/photo` without authentication |

### New Gradle Dependencies to Add

| Dependency | Purpose |
|-----------|---------|
| `org.apache.commons:commons-csv:1.10.0` | CSV parsing for import |
| `org.mnode.ical4j:ical4j:3.2.19` | iCal RFC 5545 serialisation for export |

---

## 4. Frontend Components to Create

### Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/scheduler` | `AdminSchedulerPage.tsx` | Root page; hosts sidebar palette + calendar grid; `?week=YYYY-Www` in URL |
| `/admin/trainers` | `AdminTrainersPage.tsx` | Trainer list with search, pagination, create/edit/delete |
| `/admin/rooms` | `RoomsPage.tsx` | Room list with search, pagination, add/edit/delete |

### New Components

| Component | Location | Props / Notes |
|-----------|----------|---------------|
| `WeekCalendarGrid.tsx` | `components/scheduler/` | 7-column × 32-row grid (06:00–22:00, 30-min slots); accepts `instances: ClassInstance[]`; emits `onDrop`, `onInstanceClick`, `onInstanceMove` |
| `ClassInstanceCard.tsx` | `components/scheduler/` | Card rendered inside a grid cell; shows name, time, trainers (or "Unassigned" badge), capacity; red border when no trainers; amber border when `hasRoomConflict` |
| `ClassPalette.tsx` | `components/scheduler/` | Scrollable list of `ClassTemplate` tiles; draggable via HTML5 drag-and-drop |
| `ClassInstanceEditPanel.tsx` | `components/scheduler/` | Slide-over/drawer opened on card click; form to edit `scheduledAt`, `durationMin`, `capacity`, `roomId` (via `RoomPicker`), `trainerIds`; shows trainer multi-select |
| `RoomPicker.tsx` | `components/scheduler/` | Searchable dropdown that fetches `GET /api/v1/rooms` and renders room options; used in `ClassTemplateForm` and `ClassInstanceEditPanel`; emits selected `roomId: string \| null` |
| `CopyWeekConfirmModal.tsx` | `components/scheduler/` | Shows count of instances to copy; Confirm / Cancel |
| `WeekNavigator.tsx` | `components/scheduler/` | Back/Forward week buttons + current week label; syncs with `?week=` URL param |
| `ImportModal.tsx` | `components/scheduler/` | File picker for CSV; shows import result summary or error report |
| `ExportMenu.tsx` | `components/scheduler/` | Dropdown: "Export CSV" / "Export iCal"; triggers download |
| `TrainerCard.tsx` | `components/trainers/` | Displays trainer photo (or initials fallback), name, email, specialisations badges |
| `TrainerFormModal.tsx` | `components/trainers/` | Create/Edit trainer; fields match `TrainerRequest`; separate photo upload step |
| `TrainerDeleteConfirmModal.tsx` | `components/trainers/` | Shows affected instances list when `TRAINER_HAS_ASSIGNMENTS` is returned |
| `TrainerPhotoUpload.tsx` | `components/trainers/` | File input for JPEG/PNG/WEBP, max 5 MB; preview + upload button |

### New Types (`src/types/scheduler.ts`)

```typescript
export type ClassCategory =
  | 'Cardio' | 'Strength' | 'Flexibility' | 'Mind & Body' | 'Cycling'
  | 'Combat' | 'Dance' | 'Functional' | 'Aqua' | 'Wellness' | 'Other';

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';

export type ClassType = 'GROUP' | 'PERSONAL';

export interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  bio: string | null;
  specialisations: string[];
  hasPhoto: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrainerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio?: string;
  specialisations?: string[];
}

export interface TrainerSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number | null;
  description: string | null;
}

export interface RoomSummary {
  id: string;
  name: string;
}

export interface ClassTemplate {
  id: string;
  name: string;
  description: string | null;
  category: ClassCategory;
  defaultDurationMin: number;
  defaultCapacity: number;
  difficulty: Difficulty;
  room: RoomSummary | null;
  isSeeded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassTemplateRequest {
  name: string;
  description?: string;
  category: ClassCategory;
  defaultDurationMin: number;
  defaultCapacity: number;
  difficulty: Difficulty;
  roomId?: string;
}

export interface ClassInstance {
  id: string;
  templateId: string | null;
  name: string;
  type: ClassType;
  scheduledAt: string;  // ISO 8601 UTC
  durationMin: number;
  capacity: number;
  room: RoomSummary | null;
  trainers: TrainerSummary[];
  hasRoomConflict: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassInstanceRequest {
  templateId?: string;
  name: string;
  scheduledAt: string;
  durationMin: number;
  capacity: number;
  roomId?: string;
  trainerIds: string[];
}

export interface ClassInstancePatchRequest {
  scheduledAt?: string;
  durationMin?: number;
  capacity?: number;
  roomId?: string;
  trainerIds?: string[];
}

export interface WeekScheduleResponse {
  week: string;
  instances: ClassInstance[];
}

export interface CopyWeekResponse {
  copied: number;
  skipped: number;
  targetWeek: string;
}

export interface ImportRowError {
  row: number;
  reason: string;
  detail: string;
}

export interface ImportResultResponse {
  imported: number;
  rejected: number;
  errors: ImportRowError[];
}

export interface PaginatedTrainers {
  content: Trainer[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface PaginatedTemplates {
  content: ClassTemplate[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface PaginatedRooms {
  content: Room[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
```

### New API Functions (`src/api/trainers.ts`)
- `getTrainers(params: { search?: string; page?: number; size?: number }): Promise<PaginatedTrainers>`
- `getTrainer(id: string): Promise<Trainer>`
- `createTrainer(req: TrainerRequest): Promise<Trainer>`
- `updateTrainer(id: string, req: TrainerRequest): Promise<Trainer>`
- `deleteTrainer(id: string, force?: boolean): Promise<void>`
- `uploadTrainerPhoto(id: string, file: File): Promise<void>`
- `getTrainerPhotoUrl(id: string): string` — returns `/api/v1/trainers/{id}/photo` (not async; used as `<img src>`)

### New API Functions (`src/api/rooms.ts`)
- `getRooms(params: { search?: string; page?: number; size?: number }): Promise<PaginatedRooms>`
- `createRoom(req: { name: string; capacity?: number; description?: string }): Promise<Room>`
- `updateRoom(id: string, req: { name: string; capacity?: number; description?: string }): Promise<Room>`
- `deleteRoom(id: string, force?: boolean): Promise<void>`

### New API Functions (`src/api/classTemplates.ts`)
- `getClassTemplates(params: { search?: string; category?: string; page?: number }): Promise<PaginatedTemplates>`
- `createClassTemplate(req: ClassTemplateRequest): Promise<ClassTemplate>`
- `updateClassTemplate(id: string, req: ClassTemplateRequest): Promise<ClassTemplate>`
- `deleteClassTemplate(id: string, force?: boolean): Promise<void>`

### New API Functions (`src/api/classInstances.ts`)
- `getWeekSchedule(week: string): Promise<WeekScheduleResponse>`
- `createClassInstance(req: ClassInstanceRequest): Promise<ClassInstance>`
- `patchClassInstance(id: string, req: ClassInstancePatchRequest): Promise<ClassInstance>`
- `deleteClassInstance(id: string): Promise<void>`
- `copyWeek(sourceWeek: string): Promise<CopyWeekResponse>`
- `importSchedule(file: File): Promise<ImportResultResponse>`
- `exportScheduleCsv(week: string): Promise<Blob>`
- `exportScheduleIcal(week: string): Promise<Blob>`

### State (Zustand) (`src/store/schedulerStore.ts`)
```typescript
interface SchedulerStore {
  currentWeek: string;              // ISO week string e.g. "2026-W14"
  instances: ClassInstance[];
  templates: ClassTemplate[];
  trainers: Trainer[];              // full list for trainer multi-select
  isLoading: boolean;
  setCurrentWeek(week: string): void;
  fetchWeekSchedule(week: string): Promise<void>;
  fetchTemplates(): Promise<void>;
  fetchTrainers(): Promise<void>;
  addInstance(instance: ClassInstance): void;
  updateInstance(instance: ClassInstance): void;
  removeInstance(id: string): void;
}
```

### Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add routes `/admin/scheduler`, `/admin/trainers`, and `/admin/rooms` wrapped in `<AdminRoute>` |
| `src/components/layout/AdminSidebar.tsx` | Add nav links for "Scheduler" (`CalendarIcon`), "Trainers" (`UserGroupIcon`), and "Rooms" (`BuildingOfficeIcon`) |
| `ClassInstanceEditPanel.tsx` | Replace room text input with `RoomPicker` component; field sends `roomId: string \| null` |
| `ClassTemplateForm.tsx` | Replace room text input with `RoomPicker` component; field sends `roomId: string \| null` |

---

## 5. Task List per Agent

### db-architect (reviewer only — does not implement)
- [x] Review SQL in Section 1: verified constraint names are unique across all existing
  tables (no collisions with V1–V7 names). Verified `EXTRACT(MINUTE FROM scheduled_at
  AT TIME ZONE 'UTC') IN (0, 30)` is correct on PostgreSQL 15 with `TIMESTAMPTZ` inputs
  (live DB query confirmed). Confirmed overlap query uses `idx_class_instances_scheduled_at`
  for the range scan and `idx_cit_trainer_id` for the trainer lookup.
- [x] Confirmed `ON DELETE SET NULL` on `class_instances.template_id` is correct for AC 20.
- [x] Confirmed `ON DELETE SET NULL` on `class_templates.room_id` and `class_instances.room_id`
  is correct: deleting a room clears the FK on affected templates and instances without
  deleting those records. The application-layer `force` delete path also manually sets
  `room_id = NULL` before deleting the room, which is consistent.
- [x] Confirmed `ON DELETE CASCADE` on both FKs in `class_instance_trainers` is correct:
  deleting a trainer removes their assignment rows; deleting an instance removes all
  assignment rows for that instance.
- [x] Confirmed BYTEA up to 5 MB is handled automatically by PostgreSQL TOAST (threshold
  ~2 kB); no additional configuration required on PostgreSQL 15.

**Changes applied to Section 1 during review (2026-03-26):**
1. `trainers` (V8): Added `deleted_at TIMESTAMPTZ` (soft-delete consistency with all
   other entity tables). Added `idx_trainers_deleted_at` partial index. Added
   `chk_trainers_photo_consistency` CHECK to ensure `photo_data` and `photo_mime_type`
   are always both present or both NULL.
2. `rooms` (V9): New table added. `uq_room_name` unique constraint and `chk_room_capacity`
   CHECK verified correct. `idx_rooms_name` index added for name search.
3. `class_templates` (V10, formerly V9): `room VARCHAR(100)` replaced with
   `room_id UUID REFERENCES rooms(id) ON DELETE SET NULL`. Added `chk_class_templates_name_nonempty` CHECK.
4. `class_instances` (V11, formerly V10): `room VARCHAR(100)` replaced with
   `room_id UUID REFERENCES rooms(id) ON DELETE SET NULL`. Added `deleted_at TIMESTAMPTZ`.
   Added `idx_class_instances_deleted_at` partial index. Added `idx_class_instances_room_id`
   partial index for room conflict detection. Added `chk_class_instances_name_nonempty` CHECK.
   Added inline comment confirming the 30-minute slot CHECK expression is correct.
5. `class_instance_trainers` (V12, formerly V11): Added `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   (project convention). Expanded index comment.
6. Section 6 race condition note: replaced the vague "partial unique index on
   `(trainer_id, scheduled_at)`" suggestion (which would not actually prevent overlapping
   time windows) with the correct `btree_gist` exclusion constraint approach, deferred to
   a future migration.

### backend-dev
- [ ] Create Flyway migrations V8–V12 (Section 1) in dependency order: V8 trainers, V9 rooms, V10 class_templates (with room_id FK), V11 class_instances (with room_id FK), V12 class_instance_trainers.
- [ ] Add `commons-csv` and `ical4j` dependencies to `build.gradle.kts`.
- [ ] Create all Kotlin entity files (`Trainer`, `Room`, `ClassTemplate`, `ClassInstance`) with correct JPA annotations; `ClassTemplate` and `ClassInstance` use `@ManyToOne` to `Room`; `ClassInstance` uses `@ManyToMany` with `@JoinTable(name = "class_instance_trainers")`.
- [ ] Create all DTOs listed in Section 3. `ClassTemplateRequest` uses `roomId: UUID?`; `ClassTemplateResponse` uses `room: RoomSummary?`. `ClassInstanceRequest` uses `roomId: UUID?`; `ClassInstanceResponse` uses `room: RoomSummary?`.
- [ ] Create `RoomService`: CRUD; on delete, if instances reference this room and `force != true`, return affected instance list (200); if `force=true`, set `room_id = NULL` on all affected instances then delete room.
- [ ] Create `RoomController` at `/api/v1/rooms` with ADMIN auth; implement GET (paginated + search), POST, PUT/{id}, DELETE/{id} endpoints per Section 2.
- [ ] Create `TrainerService`: CRUD, photo upload validation (5 MB / MIME check), photo storage in `photoData`/`photoMimeType`, search query.
- [ ] Create `ClassTemplateService`: CRUD, idempotent seeding of 10 defaults on first call to GET list (check `count() == 0L`). Seed data:
  | Name | Category | Duration | Capacity |
  |------|----------|----------|----------|
  | HIIT Bootcamp | Cardio | 60 | 20 |
  | Yoga Flow | Mind & Body | 60 | 20 |
  | Spin Cycle | Cycling | 45 | 15 |
  | Pilates Core | Strength\* | 60 | 20 |
  | Boxing Fundamentals | Combat | 60 | 20 |
  | Strength & Conditioning | Strength | 60 | 20 |
  | Zumba Dance | Dance | 60 | 20 |
  | CrossFit WOD | Functional | 60 | 20 |
  | Aqua Aerobics | Aqua | 60 | 20 |
  | Meditation & Stretch | Wellness | 60 | 20 |
  \* "Core" is not in the allowed category list — use **"Strength"** for Pilates Core.
  Assumption: PRD lists "Core" as a category for the seed but AC 17 does not include "Core" in the allowed category enum. Resolve by mapping Pilates Core to "Strength". If product owner wants a "Core" category, AC 17 must be updated first.
- [ ] Create `ClassInstanceService`: CRUD, trainer overlap detection (enforce 30-minute slot validation), room-conflict soft check using `room_id` FK equality (not string comparison), copy-week logic (copies `room_id` field).
- [ ] Create `ScheduleImportService`: CSV parsing via `commons-csv`, row-level validation; for `room` column, look up by name in `rooms` table — reject row with `ROOM_NOT_FOUND` if no match; on match, set `room_id`.
- [ ] Create `ScheduleExportService`: CSV generation (resolve room name from `room_id` for the `room` column) and iCal generation via `ical4j` (RFC 5545; resolve room name from `room_id` for LOCATION).
- [ ] Create all controllers with `@PreAuthorize("hasRole('ADMIN')")` except `GET /api/v1/trainers/{id}/photo` which is public.
- [ ] Update `SecurityConfig` to permit `GET /api/v1/trainers/*/photo` without authentication.
- [ ] Add all new exception handlers to `GlobalExceptionHandler`, including `RoomNotFoundException`, `RoomNameConflictException`, `RoomHasInstancesException`.
- [ ] Write unit tests for `TrainerService` (happy path + all error cases), `RoomService` (happy path + name conflict + force-delete with affected instances), `ClassTemplateService` (happy path + seeding idempotency + error cases), `ClassInstanceService` (happy path + trainer conflict + room conflict using FK + copy-week + import partial success + export).

### frontend-dev
- [ ] Create `src/types/scheduler.ts` with all types from Section 4 (includes `Room`, `RoomSummary`; `ClassTemplate.room` is `RoomSummary | null`; `ClassInstance.room` is `RoomSummary | null`; request types use `roomId?: string` not `room?: string`).
- [ ] Create `src/api/rooms.ts` with `getRooms`, `createRoom`, `updateRoom`, `deleteRoom`.
- [ ] Create `src/api/trainers.ts`, `src/api/classTemplates.ts`, `src/api/classInstances.ts` with all functions from Section 4.
- [ ] Create `src/store/schedulerStore.ts` (Zustand) from Section 4.
- [ ] Build `RoomPicker.tsx`: searchable dropdown that calls `getRooms()`, renders room name options, exposes `value: string | null` and `onChange: (roomId: string | null) => void`; used in `ClassTemplateForm` and `ClassInstanceEditPanel`.
- [ ] Build `RoomsPage.tsx` at `/admin/rooms`: paginated room list with name search; add/edit/delete with confirmation modal when deleting a room that has assigned instances (display the affected instances list from the 200 response before sending `force=true`).
- [ ] Build `WeekCalendarGrid.tsx`: 7-column grid, 06:00–22:00 with 30-minute rows; HTML5 drag-and-drop for template palette and instance rescheduling; optimistic UI on drop (update local state immediately, revert on PATCH failure).
- [ ] Build `ClassInstanceCard.tsx`: red border when `trainers.length === 0`; amber border when `hasRoomConflict === true`.
- [ ] Build `ClassPalette.tsx`: list of draggable `ClassTemplate` tiles; triggers POST on successful drop.
- [ ] Build `ClassInstanceEditPanel.tsx`: slide-over with PATCH form; replace room text input with `RoomPicker`; trainer multi-select populated from `schedulerStore.trainers`; sends `roomId` not `room`.
- [ ] Build `ClassTemplateForm.tsx` (used inside template create/edit modal): replace room text input with `RoomPicker`; sends `roomId` not `room`.
- [ ] Build `WeekNavigator.tsx`: reads/writes `?week=` URL param via `useSearchParams`.
- [ ] Build `CopyWeekConfirmModal.tsx`, `ImportModal.tsx`, `ExportMenu.tsx`.
- [ ] Build `AdminSchedulerPage.tsx`: orchestrates all scheduler components; reads `?week=` on mount and fetches schedule.
- [ ] Build `TrainerCard.tsx`, `TrainerFormModal.tsx`, `TrainerDeleteConfirmModal.tsx`, `TrainerPhotoUpload.tsx`.
- [ ] Build `AdminTrainersPage.tsx`: paginated trainer list with search, create/edit/delete flows.
- [ ] Update `src/App.tsx` with routes `/admin/scheduler`, `/admin/trainers`, and `/admin/rooms`.
- [ ] Update `AdminSidebar.tsx` with nav links for Scheduler, Trainers, and Rooms.
- [ ] Handle all error codes from Section 2 with user-friendly toast/banner messages, including `ROOM_NOT_FOUND`, `ROOM_NAME_CONFLICT`.

---

## 6. Risks & Notes

### Design decision — Room is a managed entity
Room is a first-class managed entity with its own CRUD (`rooms` table, `RoomService`,
`RoomController`). Both `ClassTemplate` and `ClassInstance` reference rooms via a nullable
FK `room_id`. Room conflict detection uses FK equality (`room_id = :roomId`), not string
comparison. This makes conflict detection reliable even after a room is renamed. The
free-text `room VARCHAR(100)` column that appeared in the original draft has been removed
entirely in favour of this FK approach.

### Assumption — Pilates Core category
The PRD seed list (AC 16) lists "Pilates Core" with category "Core", but the allowed category
enum in AC 17 does not include "Core". This SDD maps Pilates Core to "Strength". If the
product owner wants a dedicated "Core" category, AC 17 and the DB check constraint must be
updated before backend-dev runs the migration.

### Assumption — Copy-week skips trainer conflict checks
Copy-week is treated as a bulk convenience operation. Trainer double-booking is NOT checked
during copy-week to avoid blocking a bulk action with individually resolvable conflicts. The
admin is expected to review and fix any conflicts in the copied week via the normal edit flow.
If the product owner wants conflict enforcement on copy-week, the `ClassInstanceService` must
be updated to run the overlap query per instance and either skip conflicting instances or
abort entirely.

### Assumption — Export multi-trainer row duplication
For instances with multiple trainers, the CSV export emits one row per trainer. This means
importing a previously exported multi-trainer CSV will create duplicate instances (one per
trainer row). This is a known limitation of the flat CSV format. A future improvement could
use a semicolon-delimited `trainer_email` cell.

### Assumption — Seeding via ApplicationRunner, not Flyway
Template seeding uses an `ApplicationRunner` bean with a `count() == 0L` guard, not a
Flyway migration, so admin deletions of seed templates are permanent. If seeding via Flyway
is preferred instead, use `INSERT INTO class_templates (...) ON CONFLICT (name) DO NOTHING`
in a `V13__seed_class_templates.sql` — both approaches are valid but must not be combined.

### Race condition — trainer conflict detection
The trainer overlap check in `ClassInstanceService` is not protected by a database-level
lock, only an application-level query. Under concurrent admin sessions, two admins could
simultaneously pass the check and both succeed. To harden this in a future phase, a
`SELECT ... FOR UPDATE` advisory lock or a generated `tstzrange` exclusion constraint
would be the correct approach. A simple partial unique index on `(trainer_id, scheduled_at)`
in `class_instance_trainers` is NOT sufficient on its own because two non-identical
`scheduled_at` values can still produce overlapping time windows (e.g. a 90-minute class
starting at 07:00 and a 30-minute class starting at 07:30 both assign the same trainer).
The proper DB-level guard would be:
```sql
-- Requires the btree_gist extension. Add in a future migration if concurrent
-- admin use becomes a requirement.
ALTER TABLE class_instances ADD COLUMN time_range TSTZRANGE
  GENERATED ALWAYS AS (tstzrange(scheduled_at,
    scheduled_at + duration_min * INTERVAL '1 minute', '[)')) STORED;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE UNIQUE INDEX uidx_cit_trainer_no_overlap
  ON class_instance_trainers
  USING GIST (trainer_id, (
    SELECT time_range FROM class_instances ci
    WHERE ci.id = class_instance_id
  ));
```
This is deferred to a future migration. For the current scope (single concurrent admin
session) the application-level check is acceptable.

### Photo storage in BYTEA
BYTEA columns up to 5 MB will be stored out-of-line via PostgreSQL's TOAST mechanism
automatically. This is correct behaviour and requires no configuration. Performance for
serving photos via `GET /api/v1/trainers/{id}/photo` will be acceptable for the expected
number of trainers (< 100). If the gym grows significantly, migrating to object storage
(S3) is the upgrade path; the API contract is already abstracted behind the dedicated
photo endpoint so the storage backend can be swapped without a client-side change.

### iCal library
Use `org.mnode.ical4j:ical4j` (version 3.x). Verify the license is acceptable (LGPL 2.1).
If not acceptable, `biweekly` (Apache 2.0) is an alternative with a similar API.

### GymClass entity in AGENTS.md
AGENTS.md lists `GymClass` in the Domain Model with a single `trainerId` FK. That entity
has never been implemented (no migration, no Kotlin file). This SDD supersedes that
description. The domain model in AGENTS.md should be updated by the backend-dev after
implementation to reflect `ClassTemplate` + `ClassInstance` + `class_instance_trainers`
as the actual schema.

### Post-implementation note — migration numbering
V8–V11 are occupied by trainers, rooms, class_templates, and class_instances respectively.
V12 is `class_instance_trainers`. If template seeding is done via Flyway rather than
`ApplicationRunner`, it goes in V13.
