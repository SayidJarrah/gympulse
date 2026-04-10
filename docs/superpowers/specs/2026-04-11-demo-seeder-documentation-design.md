# Design: Demo Seeder — First-Class Project Module
Date: 2026-04-11

## Context

The `demo-seeder/` component was built quickly to let sales populate the GymPulse portal before customer demos. It has been in production use but has no documentation (no PRD, SDD, or design spec) and three security gaps. This work makes it a first-class project module: documented, secure, and wired into all project stacks.

Tests are explicitly out of scope for this pass.

---

## What We Are Delivering

One branch (`chore/demo-seeder-docs`), one PR, covering:

1. **Three PRDs** (already written by business-analyst agent)
2. **Three SDDs** — reverse-engineered from the code
3. **Three surgical code fixes** — env-var hardening
4. **docker-compose updates** — review stack port exposure + new env vars in both stacks
5. **CLAUDE.md update** — demo stack documented in Infra section
6. **Gap report update** — close out the audit gaps this work resolves

---

## PRD Coverage (already complete)

| File | ACs | Covers |
|------|-----|--------|
| `docs/prd/demo-seeder-data-generation.md` | 7 | 3-phase SSE generation, concurrency guard, Flyway check, trainer scheduling |
| `docs/prd/demo-seeder-credentials-and-state.md` | 5 | Dashboard stats, JSON credentials, CSV export, warning banner |
| `docs/prd/demo-seeder-cleanup.md` | 6 | Token-gated cleanup, transactional delete, safety-net sweep, SQLite reset |

---

## SDD Structure (three files)

Each SDD mirrors its PRD and documents:

- **Architecture** — files involved (no new layers)
- **Endpoint contract** — method, path, request params, response shape, error codes
- **Data flow** — Postgres pool + SQLite tracking interaction
- **Migration dependencies** — V18 (`class_instances.status`) called out in data-generation SDD
- **Security decisions** — env-var requirements documented as design decisions, not gaps

### `docs/sdd/demo-seeder-data-generation.md`
- Endpoint: `GET /api/generate/stream` (SSE)
- Supporting: `GET /api/generate/status`
- Flyway prerequisites: `class_templates` (is_seeded=TRUE), `trainers` (email LIKE '%@gymflow.local'), `rooms`, `membership_plans` (status=ACTIVE)
- V18 dependency: `class_instances.status` column required for state queries
- SQLite: session metadata written before phase 1 begins
- Trainer conflict avoidance: in-memory occupancy map per run; fallback to first trainer if none free

### `docs/sdd/demo-seeder-credentials-and-state.md`
- Endpoints: `GET /api/state`, `GET /api/credentials`, `GET /api/credentials.csv`
- State derives from: SQLite tracking (user count, class IDs) + two Postgres queries (active memberships, classes this week)
- `classesThisWeek` caveat documented: counts ALL scheduled class_instances this week, not only seeder-created ones
- CSV password column reads from `DEMO_PASSWORD` env var at response time

### `docs/sdd/demo-seeder-cleanup.md`
- Endpoint: `POST /api/cleanup`
- Auth: `X-Admin-Token` header must match `ADMIN_TOKEN` env var; 401 if missing or wrong
- Postgres transaction order: class_instances → user_memberships → users (FK-safe)
- Safety-net: `DELETE FROM users WHERE email LIKE 'demo.%@gym.demo'` runs unconditionally after tracked deletes
- SQLite cleared with `clearTracking()` only after COMMIT succeeds

---

## Code Fixes (three files, surgical)

### Fix 1 — `DEMO_PASSWORD` env var (`demo-seeder/src/seeder.ts`)
```
// Before
const DEMO_PASSWORD = 'Demo@12345';

// After
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
if (!DEMO_PASSWORD) throw new Error('DEMO_PASSWORD env var is required');
```
Same change applied to `server.ts` CSV endpoint (reads from env, not local const).

### Fix 2 — `DB_PASSWORD` fail-fast (`demo-seeder/src/db.ts`)
```
// Before
password: process.env.DB_PASSWORD ?? 'secret',

// After
password: process.env.DB_PASSWORD,  // Pool will throw on connect if undefined
```
Add a startup assertion in `server.ts` before `initSqlite()`:
```
if (!process.env.DB_PASSWORD) throw new Error('DB_PASSWORD env var is required');
```

### Fix 3 — Cleanup auth gate (`demo-seeder/src/server.ts`)
```
app.post('/api/cleanup', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    res.status(401).json({ error: 'Unauthorized', code: 'INVALID_ADMIN_TOKEN' });
    return;
  }
  // ... existing logic
});
```
`ADMIN_TOKEN` env var required at startup (same assertion pattern as above).

---

## docker-compose Changes

### `docker-compose.demo.yml` — add new env vars to demo-seeder service
```yaml
environment:
  # existing vars ...
  DEMO_PASSWORD: Demo@12345        # demo-only value, not a real secret
  ADMIN_TOKEN: demo-admin-token    # demo-only value
```

### `docker-compose.review.yml` — expose port + add env vars
```yaml
demo-seeder:
  ports:
    - "3001:3001"          # ADD — expose seeder UI for local dev
  environment:
    # existing vars ...
    DEMO_PASSWORD: Demo@12345
    ADMIN_TOKEN: review-admin-token
```

---

## CLAUDE.md Change

Add one row to the Infra / Docker Compose table (or a new "Stacks" section if none exists):

> | `docker-compose.demo.yml` | Full demo environment: postgres + backend + frontend + demo-seeder. Seeder UI at `localhost:3001`. Run before a sales demo to populate the portal with synthetic data. |

---

## Gap Report Update

After the code and docs are merged, update `docs/gaps/demo-seeder.md`:
- Mark "No SDD exists" as resolved
- Mark "DEMO_PASSWORD hardcoded" as resolved
- Mark "DB_PASSWORD falls back to secret" as resolved
- Mark "No auth on cleanup endpoint" as resolved
- Mark "No port in review stack" as resolved
- Leave open: `isGenerating` flag not persisted, SQLite stale IDs, `classesThisWeek` counts all classes, `node-fetch` v2

---

## What This Does NOT Change

- No tests written (explicitly out of scope)
- No UI redesign
- No change to seeding algorithm or cleanup logic
- No change to SQLite schema
- No change to the `hasDemoData` dead import (low priority, leave for backlog)
- No change to `buildSlotDates` week-boundary behaviour (documented risk, not fixed here)
