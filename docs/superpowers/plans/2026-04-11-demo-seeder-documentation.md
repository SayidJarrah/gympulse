# Demo Seeder — Documentation & Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing `demo-seeder/` component a first-class project module by writing three SDDs, hardening three security gaps, exposing the seeder in the review stack, and documenting the demo stack in CLAUDE.md.

**Architecture:** The demo-seeder is a standalone Node 20 / Express / TypeScript service. It has no new layers — all changes are either documentation or small surgical edits to existing files. The three SDDs document the component as three sub-features that mirror the three PRDs already written.

**Tech Stack:** Node 20, Express 4, TypeScript 5, PostgreSQL (pg pool), SQLite (better-sqlite3), Docker Compose.

**Branch:** `chore/demo-seeder-docs` (already created, PRDs already committed)

**Tests:** Explicitly out of scope for this pass. No test steps are included.

---

## Task 1: SDD — Data Generation

**Files:**
- Create: `docs/sdd/demo-seeder-data-generation.md`

- [ ] **Step 1: Write the SDD file**

Create `docs/sdd/demo-seeder-data-generation.md` with the exact content below:

```markdown
# SDD: Demo Seeder — Data Generation

## Reference
- PRD: `docs/prd/demo-seeder-data-generation.md`
- Date: 2026-04-11

## Architecture Overview

The data-generation sub-feature is implemented entirely in:
- `demo-seeder/src/server.ts` — two endpoints (`/api/generate/status`, `/api/generate/stream`)
- `demo-seeder/src/seeder.ts` — three-phase seeding logic
- `demo-seeder/src/data/schedule.ts` — slot date generation
- `demo-seeder/src/data/personas.ts` — fitness goal and class preference pools
- `demo-seeder/src/db.ts` — Postgres pool + SQLite tracking helpers

No new files or layers are needed. The seeder calls the GymFlow REST API for user registration and membership purchase (ensuring bcrypt hashing and business-rule enforcement); it writes class instances directly to Postgres via parameterised queries.

---

## 1. Flyway Prerequisites

The seeder requires the following rows to exist before generation can proceed. These are populated by the standard Flyway seed migrations that run as part of all Docker Compose stacks.

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
```

- [ ] **Step 2: Verify the file was created correctly**

Check that the file exists and the endpoint table renders:
```bash
head -5 docs/sdd/demo-seeder-data-generation.md
# Expected: # SDD: Demo Seeder — Data Generation
```

- [ ] **Step 3: Commit**

```bash
git add docs/sdd/demo-seeder-data-generation.md
git commit -m "docs(demo-seeder): add SDD for data-generation sub-feature"
```

---

## Task 2: SDD — Credentials & State

**Files:**
- Create: `docs/sdd/demo-seeder-credentials-and-state.md`

- [ ] **Step 1: Write the SDD file**

Create `docs/sdd/demo-seeder-credentials-and-state.md` with the exact content below:

```markdown
# SDD: Demo Seeder — Credentials & State

## Reference
- PRD: `docs/prd/demo-seeder-credentials-and-state.md`
- Date: 2026-04-11

## Architecture Overview

The credentials-and-state sub-feature is implemented in:
- `demo-seeder/src/server.ts` — three read endpoints
- `demo-seeder/src/state.ts` — `getState()` function combining SQLite + two Postgres queries
- `demo-seeder/src/db.ts` — `getDemoUsers()`, `hasDemoData()`, `getTrackedIds()` SQLite helpers

All endpoints are read-only. No writes to Postgres or SQLite occur in this sub-feature.

---

## 1. Endpoint: GET /api/state

Returns a dashboard summary combining SQLite session data and live Postgres counts.

**Response: 200**
```json
{
  "demoUsers": 20,
  "activeMemberships": 16,
  "classesThisWeek": 48,
  "totalClassInstances": 96,
  "hasData": true
}
```

| Field | Source | Notes |
|-------|--------|-------|
| `demoUsers` | SQLite `demo_users` row count | Only users from the current SQLite session |
| `activeMemberships` | Postgres: `COUNT(*) FROM user_memberships JOIN users WHERE email LIKE 'demo.%@gym.demo' AND status = 'ACTIVE' AND deleted_at IS NULL` | Counts active memberships for all demo-email users in Postgres, not filtered to SQLite session |
| `classesThisWeek` | Postgres: `COUNT(*) FROM class_instances WHERE status = 'SCHEDULED' AND scheduled_at in current UTC week` | **Counts ALL scheduled class instances this week, not only seeder-created ones.** If non-demo classes exist, this number will be higher than expected. This is a known limitation, documented as accepted. |
| `totalClassInstances` | SQLite `demo_class_instances` row count | Only instances from the current SQLite session |
| `hasData` | `demo_users.cnt > 0` in SQLite | True when at least one demo user is tracked |

**V18 dependency:** The `classesThisWeek` query requires the `status` column on `class_instances` (added by V18). If V18 has not been applied, this query will throw `column "status" does not exist` and `getState()` will propagate a 500 error. All supported stacks apply full Flyway migrations.

**Error: 500**
```json
{ "error": "Error: column \"status\" does not exist" }
```
(or similar Postgres error message — exposed as-is since this is an operator-only internal tool)

---

## 2. Endpoint: GET /api/credentials

Returns the list of demo users tracked in the current SQLite session.

**Response: 200**
```json
[
  {
    "id": "uuid",
    "email": "demo.jane.smith@gym.demo",
    "first_name": "Jane",
    "last_name": "Smith",
    "plan_name": "Monthly Unlimited"
  }
]
```

`plan_name` is `null` for users who did not receive a membership. The list is ordered by `first_name, last_name` (SQLite `ORDER BY`).

**Scope:** Returns only users tracked in the current SQLite session — not all `demo.%@gym.demo` rows in Postgres.

---

## 3. Endpoint: GET /api/credentials.csv

Returns credentials as a downloadable CSV file.

**Response headers:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="demo-credentials.csv"
```

**CSV format:**
```
email,password,membership_plan
demo.jane.smith@gym.demo,<DEMO_PASSWORD env var value>,Monthly Unlimited
demo.john.doe@gym.demo,<DEMO_PASSWORD env var value>,
```

The `password` column contains the value of the `DEMO_PASSWORD` environment variable at response time — not a hardcoded string. The `membership_plan` column is empty for users without a plan.

---

## 4. Dashboard UI Behaviour

The operator dashboard (`public/index.html`) uses these endpoints as follows:

| Behaviour | Implementation |
|-----------|---------------|
| Stat cards populate on load | `GET /api/state` called on `DOMContentLoaded` |
| State auto-refreshes | `setInterval(() => fetch('/api/state'), 10_000)` — every 10 seconds |
| Warning banner shown | When `state.hasData && state.demoUsers > 0` |
| Export CSV button hidden | Until `state.demoUsers > 0` (i.e. `hasData` is true) |
| Credentials list populated | `GET /api/credentials` called after successful generation |
| Copy-to-clipboard on email | Browser `navigator.clipboard.writeText(email)` |

---

## 5. Environment Variables

| Var | Required | Description |
|-----|----------|-------------|
| `DEMO_PASSWORD` | Yes | Value written into the CSV `password` column. Startup assertion — service refuses to start if absent. |
| `DB_*` | Yes | Postgres connection (see data-generation SDD) |
```

- [ ] **Step 2: Verify the file was created correctly**

```bash
head -5 docs/sdd/demo-seeder-credentials-and-state.md
# Expected: # SDD: Demo Seeder — Credentials & State
```

- [ ] **Step 3: Commit**

```bash
git add docs/sdd/demo-seeder-credentials-and-state.md
git commit -m "docs(demo-seeder): add SDD for credentials-and-state sub-feature"
```

---

## Task 3: SDD — Cleanup

**Files:**
- Create: `docs/sdd/demo-seeder-cleanup.md`

- [ ] **Step 1: Write the SDD file**

Create `docs/sdd/demo-seeder-cleanup.md` with the exact content below:

```markdown
# SDD: Demo Seeder — Cleanup

## Reference
- PRD: `docs/prd/demo-seeder-cleanup.md`
- Date: 2026-04-11

## Architecture Overview

The cleanup sub-feature is implemented in:
- `demo-seeder/src/server.ts` — `POST /api/cleanup` endpoint with auth gate
- `demo-seeder/src/cleanup.ts` — `runCleanup()` function

Cleanup is a destructive, transactional operation. It deletes all Postgres rows tracked in the current SQLite session, runs a safety-net sweep, then clears SQLite tracking.

---

## 1. Endpoint: POST /api/cleanup

Wipes all demo data from Postgres and resets the SQLite session.

**Authentication:** The request must include the header:
```
X-Admin-Token: <value of ADMIN_TOKEN env var>
```

**401 — missing or wrong token:**
```json
{ "error": "Unauthorized", "code": "INVALID_ADMIN_TOKEN" }
```

**409 — generation in progress:**
```json
{ "error": "Cannot cleanup while generation is in progress" }
```

**Response: 200**
```json
{
  "deletedClassInstances": 96,
  "deletedMemberships": 16,
  "deletedUsers": 20
}
```

The counts reflect rows actually deleted. If SQLite has no tracked IDs for a given entity type, the corresponding delete is skipped and the count is 0.

---

## 2. Cleanup Transaction

All deletes run inside a single Postgres transaction (`BEGIN` / `COMMIT` / `ROLLBACK` on error).

**Execution order (FK-safe):**

1. `DELETE FROM class_instances WHERE id = ANY($1::uuid[])` — cascades `class_instance_trainers` (FK with `ON DELETE CASCADE`)
2. `DELETE FROM user_memberships WHERE id = ANY($1::uuid[])`
3. `DELETE FROM users WHERE id = ANY($1::uuid[])` — cascades `user_profiles`, `user_trainer_favorites`

Each delete only runs when the corresponding tracked ID list is non-empty.

**Safety-net sweep (step 4, always runs):**
```sql
DELETE FROM users WHERE email LIKE 'demo.%@gym.demo' AND deleted_at IS NULL
```
This sweep runs unconditionally after the tracked-ID deletes, even when SQLite has no tracked users. It catches:
- Users created by a run that crashed before writing to SQLite
- Users from a previous run whose SQLite session was cleared manually

The safety-net does not return a count in the response body (tracked deletes are sufficient for operator feedback).

**On error:** The transaction rolls back entirely. `clearTracking()` is NOT called if the transaction fails — SQLite retains the tracked IDs so a retry is possible.

---

## 3. SQLite Reset

After a successful `COMMIT`, `clearTracking()` is called:
```sql
DELETE FROM demo_users;
DELETE FROM demo_memberships;
DELETE FROM demo_class_instances;
DELETE FROM seeder_meta;
```
This is executed as a single `db.exec()` call and is not wrapped in a Postgres transaction.

---

## 4. Environment Variables

| Var | Required | Description |
|-----|----------|-------------|
| `ADMIN_TOKEN` | Yes | Token value that must match the `X-Admin-Token` request header. Startup assertion — service refuses to start if absent. |
| `DB_*` | Yes | Postgres connection (see data-generation SDD) |

---

## 5. Security Decision

The cleanup endpoint is unauthenticated at the application level (no GymFlow JWT required) because the demo-seeder has no user accounts. The `ADMIN_TOKEN` env var provides a simple shared-secret gate sufficient for an internal operator tool accessible only within the Docker Compose network (or via an exposed port in dev stacks).

This trade-off is explicitly accepted. The demo-seeder is not intended to be publicly accessible.
```

- [ ] **Step 2: Verify the file was created correctly**

```bash
head -5 docs/sdd/demo-seeder-cleanup.md
# Expected: # SDD: Demo Seeder — Cleanup
```

- [ ] **Step 3: Commit**

```bash
git add docs/sdd/demo-seeder-cleanup.md
git commit -m "docs(demo-seeder): add SDD for cleanup sub-feature"
```

---

## Task 4: Code Fix — DEMO_PASSWORD env var

**Files:**
- Modify: `demo-seeder/src/seeder.ts` (line 9)
- Modify: `demo-seeder/src/server.ts` (startup block + line 43)

- [ ] **Step 1: Update `seeder.ts` — read DEMO_PASSWORD from env**

In `demo-seeder/src/seeder.ts`, replace lines 8–9:

```typescript
// BEFORE
const API_URL = process.env.GYMFLOW_API_URL ?? 'http://localhost:8080/api/v1';
const DEMO_PASSWORD = 'Demo@12345';
```

with:

```typescript
// AFTER
const API_URL = process.env.GYMFLOW_API_URL ?? 'http://localhost:8080/api/v1';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD!;
```

`DEMO_PASSWORD` will be guaranteed non-null by the startup assertion added in server.ts (Task 4 Step 2). The `!` non-null assertion is safe here.

- [ ] **Step 2: Update `server.ts` — startup assertion + CSV env var**

In `demo-seeder/src/server.ts`, the startup block currently reads:

```typescript
initSqlite();

app.listen(PORT, () => {
  console.log(`Demo seeder running on http://localhost:${PORT}`);
});
```

Replace it with:

```typescript
// ── Startup assertions ───────────────────────────────────────────────────────

const REQUIRED_ENV = ['DEMO_PASSWORD', 'DB_PASSWORD', 'ADMIN_TOKEN'] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Fatal: ${key} environment variable is required`);
    process.exit(1);
  }
}

initSqlite();

app.listen(PORT, () => {
  console.log(`Demo seeder running on http://localhost:${PORT}`);
});
```

Also update the CSV route (line 43) — replace the hardcoded password:

```typescript
// BEFORE
const lines = ['email,password,membership_plan', ...users.map((u) => `${u.email},Demo@12345,${u.plan_name ?? ''}`)]

// AFTER
const lines = ['email,password,membership_plan', ...users.map((u) => `${u.email},${process.env.DEMO_PASSWORD},${u.plan_name ?? ''}`)]
```

- [ ] **Step 3: Verify the TypeScript compiles**

```bash
cd demo-seeder && npm run build 2>&1 | tail -5
# Expected: no errors, exit 0
cd ..
```

- [ ] **Step 4: Commit**

```bash
git add demo-seeder/src/seeder.ts demo-seeder/src/server.ts
git commit -m "fix(demo-seeder): read DEMO_PASSWORD from env var, add startup assertion"
```

---

## Task 5: Code Fix — DB_PASSWORD fail-fast

**Files:**
- Modify: `demo-seeder/src/db.ts` (line 12)

- [ ] **Step 1: Remove the `?? 'secret'` fallback from db.ts**

In `demo-seeder/src/db.ts`, update the pool config. Replace:

```typescript
export const pgPool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432'),
  database: process.env.DB_NAME ?? 'gymflow',
  user: process.env.DB_USER ?? 'gymflow',
  password: process.env.DB_PASSWORD ?? 'secret',
  max: 10,
});
```

with:

```typescript
export const pgPool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432'),
  database: process.env.DB_NAME ?? 'gymflow',
  user: process.env.DB_USER ?? 'gymflow',
  password: process.env.DB_PASSWORD,
  max: 10,
});
```

`DB_PASSWORD` is now validated by the startup assertion in `server.ts` (added in Task 4). The pool receives `undefined` if the var is somehow absent after the assertion, which will cause a connection error on first query — acceptable given the process exits at startup if the var is missing.

- [ ] **Step 2: Verify the TypeScript compiles**

```bash
cd demo-seeder && npm run build 2>&1 | tail -5
# Expected: no errors
cd ..
```

- [ ] **Step 3: Commit**

```bash
git add demo-seeder/src/db.ts
git commit -m "fix(demo-seeder): remove DB_PASSWORD fallback, fail fast on missing env var"
```

---

## Task 6: Code Fix — Cleanup auth gate

**Files:**
- Modify: `demo-seeder/src/server.ts` (cleanup route, lines 94–105)

- [ ] **Step 1: Add X-Admin-Token auth check to cleanup route**

In `demo-seeder/src/server.ts`, the cleanup route currently reads:

```typescript
app.post('/api/cleanup', async (_req: Request, res: Response) => {
  if (isGenerating) {
    res.status(409).json({ error: 'Cannot cleanup while generation is in progress' });
    return;
  }
  try {
    const result = await runCleanup();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
```

Replace it with:

```typescript
app.post('/api/cleanup', async (req: Request, res: Response) => {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    res.status(401).json({ error: 'Unauthorized', code: 'INVALID_ADMIN_TOKEN' });
    return;
  }
  if (isGenerating) {
    res.status(409).json({ error: 'Cannot cleanup while generation is in progress' });
    return;
  }
  try {
    const result = await runCleanup();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
```

Note: `_req` becomes `req` (remove the underscore prefix) since the parameter is now used.

- [ ] **Step 2: Verify the TypeScript compiles**

```bash
cd demo-seeder && npm run build 2>&1 | tail -5
# Expected: no errors
cd ..
```

- [ ] **Step 3: Commit**

```bash
git add demo-seeder/src/server.ts
git commit -m "fix(demo-seeder): gate POST /api/cleanup with X-Admin-Token header"
```

---

## Task 7: docker-compose Updates

**Files:**
- Modify: `docker-compose.review.yml`
- Modify: `docker-compose.review.yml`

- [ ] **Step 1: Update docker-compose.review.yml — add DEMO_PASSWORD and ADMIN_TOKEN**

In `docker-compose.review.yml`, the `demo-seeder` service `environment` block currently has:

```yaml
environment:
  DB_HOST: postgres
  DB_PORT: "5432"
  DB_NAME: gymflow
  DB_USER: gymflow
  DB_PASSWORD: secret
  GYMFLOW_API_URL: http://backend:8080/api/v1
  DATA_DIR: /app/data
```

Add `DEMO_PASSWORD` and `ADMIN_TOKEN`:

```yaml
environment:
  DB_HOST: postgres
  DB_PORT: "5432"
  DB_NAME: gymflow
  DB_USER: gymflow
  DB_PASSWORD: secret
  GYMFLOW_API_URL: http://backend:8080/api/v1
  DATA_DIR: /app/data
  DEMO_PASSWORD: Demo@12345
  ADMIN_TOKEN: demo-admin-token
```

- [ ] **Step 2: Update docker-compose.review.yml — expose port 3001, add env vars**

In `docker-compose.review.yml`, the `demo-seeder` service currently has no `ports` entry and no `DEMO_PASSWORD`/`ADMIN_TOKEN`. Update it from:

```yaml
demo-seeder:
  build:
    context: ./demo-seeder
  environment:
    DB_HOST: postgres
    DB_PORT: "5432"
    DB_NAME: gymflow
    DB_USER: gymflow
    DB_PASSWORD: secret
    GYMFLOW_API_URL: http://backend:8080/api/v1
    DATA_DIR: /app/data
  volumes:
    - demo_seeder_data:/app/data
  depends_on:
    postgres:
      condition: service_healthy
    backend:
      condition: service_healthy
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"]
    interval: 10s
    timeout: 5s
    retries: 6
```

to:

```yaml
demo-seeder:
  build:
    context: ./demo-seeder
  ports:
    - "3001:3001"
  environment:
    DB_HOST: postgres
    DB_PORT: "5432"
    DB_NAME: gymflow
    DB_USER: gymflow
    DB_PASSWORD: secret
    GYMFLOW_API_URL: http://backend:8080/api/v1
    DATA_DIR: /app/data
    DEMO_PASSWORD: Demo@12345
    ADMIN_TOKEN: review-admin-token
  volumes:
    - demo_seeder_data:/app/data
  depends_on:
    postgres:
      condition: service_healthy
    backend:
      condition: service_healthy
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"]
    interval: 10s
    timeout: 5s
    retries: 6
```

- [ ] **Step 3: Verify YAML is valid**

```bash
docker compose -f docker-compose.review.yml config --quiet && echo "demo OK"
docker compose -f docker-compose.review.yml config --quiet && echo "review OK"
# Expected: demo OK / review OK (no YAML errors)
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.review.yml docker-compose.review.yml
git commit -m "chore(demo-seeder): expose port 3001 in review stack, add DEMO_PASSWORD and ADMIN_TOKEN to both stacks"
```

---

## Task 8: CLAUDE.md Update

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add demo stack to the Infra section**

In `CLAUDE.md`, the `## Stack` section ends with `- **Infra:** Docker Compose`. After that line, add a new `## Docker Compose Stacks` section. Insert it between `## Stack` and `## Project Structure`:

```markdown
## Docker Compose Stacks

| File | Purpose | Ports |
|------|---------|-------|
| `docker-compose.review.yml` | Local dev / code review / demo — full stack including demo-seeder. Seeder UI at `http://localhost:3002`. | backend: 8080, frontend: 3000, seeder: 3002 |
| `docker-compose.e2e.yml` | E2E test stack — used by `/verify` command | internal only |
```

- [ ] **Step 2: Verify CLAUDE.md reads correctly**

```bash
grep -A 8 "Docker Compose Stacks" CLAUDE.md
# Expected: the table renders with three rows
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document Docker Compose stacks including demo-seeder in CLAUDE.md"
```

---

## Task 9: Gap Report Update

**Files:**
- Modify: `docs/gaps/demo-seeder.md`

- [ ] **Step 1: Update the gap report to reflect resolved gaps**

Replace the entire contents of `docs/gaps/demo-seeder.md` with:

```markdown
# Gap Report: demo-seeder
Date: 2026-04-11
Last updated: 2026-04-11 (resolved by chore/demo-seeder-docs)

## Resolved Gaps

The following gaps from the initial audit have been resolved by this branch:

- ✅ **No SDD exists** — three SDDs written: `docs/sdd/demo-seeder-data-generation.md`, `docs/sdd/demo-seeder-credentials-and-state.md`, `docs/sdd/demo-seeder-cleanup.md`
- ✅ **No PRD exists** — three PRDs written: `docs/prd/demo-seeder-data-generation.md`, `docs/prd/demo-seeder-credentials-and-state.md`, `docs/prd/demo-seeder-cleanup.md`
- ✅ **`DEMO_PASSWORD` hardcoded** — now read from `process.env.DEMO_PASSWORD`; startup assertion added
- ✅ **`DB_PASSWORD` falls back to `'secret'`** — fallback removed; startup assertion added
- ✅ **No auth on `POST /api/cleanup`** — gated with `X-Admin-Token` header matching `ADMIN_TOKEN` env var
- ✅ **Port 3001 not exposed in review stack** — added `ports: ["3001:3001"]` to `docker-compose.review.yml`
- ✅ **Demo stack undocumented in CLAUDE.md** — Docker Compose Stacks table added

## Remaining Open Items (not addressed in this pass)

### Medium priority
- `isGenerating` flag not persisted — resets to false on container restart; concurrent seedings possible after crash
- SQLite `demo-session.db` persists across restarts — stale tracking IDs retained from previous runs

### Low priority
- `classesThisWeek` stat counts all DB classes, not only seeder-created ones (documented as accepted in credentials-and-state SDD)
- `buildSlotDates` anchors to current Monday at call time — class instances may fall in wrong week if run at week boundary
- `hasDemoData` imported but unused in `server.ts` (dead import)
- `node-fetch` v2 (CommonJS) — potential Node 22+ compatibility issue

### Out of scope
- E2E test coverage (explicitly deferred)
```

- [ ] **Step 2: Commit**

```bash
git add docs/gaps/demo-seeder.md
git commit -m "docs(demo-seeder): update gap report — mark resolved items, list remaining open items"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Three SDDs covering all three PRDs
- ✅ DEMO_PASSWORD env var (PRD credentials-and-state AC: CSV uses env var value)
- ✅ DB_PASSWORD fail-fast
- ✅ ADMIN_TOKEN cleanup gate (PRD cleanup AC-2: 401 for missing/wrong token)
- ✅ Port 3001 in review stack
- ✅ CLAUDE.md demo stack entry
- ✅ Gap report updated

**Placeholder scan:** No TBDs, TODOs, or vague steps. Every code block contains the exact before/after content.

**Type consistency:**
- `SeederConfig` shape defined in data-generation SDD matches `demo-seeder/src/seeder.ts:11-16` exactly
- `DemoState` shape defined in credentials-and-state SDD matches `demo-seeder/src/state.ts:4-10` exactly
- `CleanupResult` shape defined in cleanup SDD matches `demo-seeder/src/cleanup.ts:3-7` exactly
- `REQUIRED_ENV` array in Task 4 covers all three vars validated at startup (`DEMO_PASSWORD`, `DB_PASSWORD`, `ADMIN_TOKEN`)
