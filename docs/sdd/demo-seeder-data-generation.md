# SDD: Demo Seeder — Data Generation

## Reference
- PRD: `docs/prd/demo-seeder-data-generation.md`
- Date: 2026-04-11

> **Implementation note:** This SDD documents the target state. The env-var requirements in Section 6 (DEMO_PASSWORD startup assertion, DB_PASSWORD fail-fast) are implemented in the same branch as this document — see `demo-seeder/src/server.ts` startup assertions and `demo-seeder/src/seeder.ts`.

## Architecture Overview

The data-generation sub-feature is implemented entirely in:
- `demo-seeder/src/server.ts` — two endpoints (`/api/generate/status`, `/api/generate/stream`)
- `demo-seeder/src/seeder.ts` — three-phase seeding logic
- `demo-seeder/src/data/schedule.ts` — slot date generation
- `demo-seeder/src/data/personas.ts` — fitness goal and class preference pools
- `demo-seeder/src/db.ts` — Postgres pool + SQLite tracking helpers

No new files or layers are needed. The seeder calls the GymFlow REST API for user registration and membership purchase (ensuring bcrypt hashing and business-rule enforcement); it writes class instances directly to Postgres via parameterised queries.

---

## 1. Reference Data Prerequisites

The seeder requires the following rows to exist before the data-generation phases (users, memberships, class instances) can proceed. As of 2026-04-13 (`chore/seeding-consolidation`), these rows are populated by the **demo-seeder reference phase**, which runs unconditionally at the start of every `GET /api/generate/stream` invocation — before the existing three-phase generation. Flyway migrations V13, V16, and V17 previously seeded this data; they have been deleted and their contents moved to `demo-seeder/src/data/*.ts`. See `docs/sdd/seeding-consolidation.md` for the detailed design.

| Table | Filter | Purpose |
|-------|--------|---------|
| `class_templates` | `is_seeded = TRUE` | Template pool for class instance names and defaults |
| `trainers` | `deleted_at IS NULL AND email LIKE '%@gymflow.local'` | Trainer pool for class assignments |
| `rooms` | (all rows) | Room pool for class instance location |
| `membership_plans` | `status = 'ACTIVE'` | Plan pool for membership assignment |

**V18 dependency:** The `/api/state` endpoint (credentials-and-state sub-feature) queries `class_instances.status`. This column is added by migration `V18__add_class_instance_status_for_member_schedule.sql`. The data-generation seeder inserts into `class_instances` without specifying `status`, relying on the `DEFAULT 'SCHEDULED'` added by V18. If V18 has not been applied, the state query will fail silently. All supported Docker Compose stacks run full Flyway migration sets and are therefore unaffected.

If `class_templates` or `trainers` is empty after loading reference data, the seeder emits an `error` SSE event and returns without generating any data.

---

## 2. Endpoint: GET /api/generate/status

Returns whether generation is currently running.

**Response: 200**
```json
{ "running": false }
```

No error states. The `running` flag is an in-memory boolean (`isGenerating` in `server.ts`) — it resets to `false` on container restart.

---

## 3. Endpoint: GET /api/generate/stream

Triggers a full three-phase data generation run and streams progress as Server-Sent Events.

**Query parameters** (all optional, server-side clamped):

| Param | Type | Default | Bounds | Description |
|-------|------|---------|--------|-------------|
| `members` | integer | 20 | 10–50 | Number of demo users to register |
| `weeks` | integer | 2 | 1–4 | Weeks of class schedule to generate |
| `membershipPct` | integer | 80 | 0–100 | % of users who receive a membership |
| `densityPct` | integer | 60 | 10–100 | % of available time slots to fill |

Values outside bounds are clamped server-side, not rejected.

**Response headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**409 — generation already running:**
```json
{ "error": "Generation already in progress" }
```

**SSE event stream** — each event is a JSON object sent as `data: {...}\n\n`:

| `type` | Payload fields | When |
|--------|---------------|------|
| `start` | `sessionId: string, config: SeederConfig` | First event |
| `log` | `message: string` | Phase transitions and info messages |
| `progress` | `step: "users"\|"memberships"\|"classes", current: number, total: number` | Per-item progress within each phase |
| `warning` | `message: string` | Non-fatal issues (duplicate user, failed membership) |
| `error` | `message: string` | Fatal error — run halts after this event |
| `done` | `users: number, memberships: number, sessionId: string` | Final event on success |
| `stream_end` | _(none)_ | Always the last event regardless of outcome |

`stream_end` is always emitted (in a `finally` block), even after `error`.

**SeederConfig shape:**
```typescript
{
  memberCount: number;   // clamped members param
  weekCount: number;     // clamped weeks param
  membershipPct: number; // clamped membershipPct param
  densityPct: number;    // clamped densityPct param
}
```

---

## 4. Three-Phase Seeding Algorithm

### Phase 1: User Registration (progress step: "users")

For each user (up to `memberCount`):
1. Generate `firstName`, `lastName` from `@faker-js/faker`
2. Build email: `demo.{first}.{last}@gym.demo` (de-duplicated with counter suffix if collision)
3. `POST {GYMFLOW_API_URL}/auth/register` with `{ email, password: DEMO_PASSWORD }`
   - 409 → user already exists from a previous un-cleaned run; look up by email in `users` table and reuse ID
   - Other non-2xx → emit `warning`, skip user
4. `INSERT INTO user_profiles` with faker date-of-birth (age 22–55), 2–4 random fitness goals, 2–3 random class type preferences — `ON CONFLICT DO UPDATE` (idempotent)
5. `trackUser(userId, email, firstName, lastName)` — write to SQLite `demo_users`
6. Emit `progress` event

### Phase 2: Membership Creation (progress step: "memberships")

Target count: `floor(registeredUsers.length × membershipPct / 100)`.
Users are randomly shuffled; only the first `count` receive a membership.

For each selected user:
1. `POST {GYMFLOW_API_URL}/auth/login` → get `accessToken`
2. `POST {GYMFLOW_API_URL}/memberships` with `{ planId }` using Bearer token — plan randomly selected from `planIds` pool
3. `trackMembership(membershipId, userId)` — write to SQLite `demo_memberships`
4. `updateUserPlan(userId, planName)` — update SQLite `demo_users.plan_name`
5. Emit `progress` event

### Phase 3: Class Instance Creation (progress step: "classes")

1. `buildSlotDates(weekCount, densityPct)` — generates Mon–Sat × 4 time slots per week, shuffled and sampled by density%, then re-sorted chronologically
2. For each slot: assign template (round-robin), room (round-robin), time-of-day qualifier
3. Trainer assignment: shuffle trainer pool, assign 1–2 free trainers using an in-memory occupancy map; fall back to first trainer if none free
4. Batch INSERT into `class_instances` (20 rows per batch) — columns: `id, template_id, name, type, capacity, scheduled_at, duration_min, room_id`. Does NOT set `status` — relies on `DEFAULT 'SCHEDULED'` from V18.
5. Batch INSERT into `class_instance_trainers`
6. `trackClassInstance(id, scheduledAt)` — write to SQLite
7. Emit `progress` event per batch

**Time slot definition** (`data/schedule.ts`):
- Hours: 07:00, 12:00, 17:30, 19:00 UTC (satisfies DB constraint: minutes must be 0 or 30)
- Days: Monday–Saturday (Sunday excluded)

---

## 5. Session Metadata

Before Phase 1, the seeder writes three keys to SQLite `seeder_meta`:

| Key | Value |
|-----|-------|
| `session_id` | UUID v4 generated at run start |
| `generated_at` | ISO 8601 timestamp |
| `config` | JSON-stringified `SeederConfig` |

This metadata is used by cleanup to identify the run and is displayed in the credentials panel.

---

## 6. Environment Variables

| Var | Required | Description |
|-----|----------|-------------|
| `GYMFLOW_API_URL` | Yes | Base URL of the GymFlow backend API (e.g. `http://backend:8080/api/v1`) |
| `DEMO_PASSWORD` | Yes | Password used for all generated demo accounts. Startup assertion — service refuses to start if absent. |
| `DB_HOST` | Yes | Postgres host |
| `DB_PORT` | Yes | Postgres port |
| `DB_NAME` | Yes | Postgres database name |
| `DB_USER` | Yes | Postgres user |
| `DB_PASSWORD` | Yes | Postgres password. Startup assertion — service refuses to start if absent. |

---

## 7. Known Limitations

- **`isGenerating` flag is in-memory** — resets to `false` on container restart. A generation run interrupted by a crash will not prevent a new run; partial data from the interrupted run is tracked in SQLite and can be cleaned up normally.
- **Trainer availability is per-run only** — the occupancy map is built fresh each run from the current slot list; it does not account for class instances from previous runs.
- **`buildSlotDates` anchors to current Monday at call time** — running the seeder at a week boundary (Sunday evening) may place some instances in the previous week.
- **`node-fetch` v2 (CommonJS)** — may encounter compatibility issues on Node 22+. Tracked in the tech-debt backlog.
