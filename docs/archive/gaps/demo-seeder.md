# Gap Report: demo-seeder
Date: 2026-04-11

## SDD Contradictions

- **`docs/sdd/scheduler.md` (V8–V14 scope)** — does not document the `class_instances.status` column, but `demo-seeder/src/state.ts:28-34` queries `WHERE status = 'SCHEDULED'`. The column is introduced by V18 in `docs/sdd/group-classes-schedule-view.md`, which is the authoritative source. If the seeder runs against a stack without V18 applied, the state endpoint silently displays `—` for all four stat cards. The Scheduler SDD needs a note that V18 is a runtime dependency for any consumer of `class_instances`.

## DOCS → CODE Gaps

### Missing Functionality

- No `docs/prd/demo-seeder.md`, `docs/sdd/demo-seeder.md`, or `docs/design/demo-seeder.md` exists. The entire component — endpoint contract, seeding logic, cleanup scope, migration dependencies, security trade-offs — is undocumented.

### Broken Flows

- **V18 dependency not guarded** (`state.ts:28-34`): If the stack has not applied V18, the `status` column does not exist. The error is silently caught in `loadState()` — all four dashboard stat cards display `—` with no user-visible error. Users have no way to know the service is misconfigured.
- **Trainer guard missing at startup** (`seeder.ts:38-40`): The query `WHERE email LIKE '%@gymflow.local'` fetches trainers before generation begins. If no trainers match (wrong domain, or Flyway seeder not run), the seeder emits a log message and exits — but the UI shows no explanation. The operator sees a stalled progress bar.

### Design Divergence

- No design spec exists for this component. The HTML UI in `demo-seeder/public/index.html` has no design doc to compare against.

### Missing Test Coverage

No `docs/prd/demo-seeder.md` exists — there are no formal ACs to map against.
No `frontend/e2e/demo-seeder.spec.ts` exists — zero test coverage.
Playwright `--grep seeder` returned "No tests found".
The demo stack (port 3001) and E2E stack (port 8081) were not running — no live walkthrough possible.

The ~20 user-visible behaviours documented only in code have zero spec coverage:

| Behaviour | Source |
|-----------|--------|
| `/health` returns `{ status: "ok" }` | `server.ts:20` |
| State counters load on page load (users, memberships, classes this week, total) | `state.ts`, `index.html` |
| Credentials panel lists seeded users with plan names | `server.ts:37` |
| CSV export download via `/api/credentials.csv` | `server.ts:41` |
| Generate button triggers SSE stream with progress events | `server.ts:58` |
| Progress bar advances in three phases (users 0-33%, memberships 33-66%, classes 66-100%) | `index.html:346` |
| Cleanup flow via POST `/api/cleanup` | `server.ts:94` |
| Concurrent generate blocked with 409 | `server.ts:59` |
| Concurrent cleanup blocked during generate with 409 | `server.ts:95` |
| Warning banner shown when `hasData && demoUsers > 0` | `index.html:237` |
| Three preset buttons apply correct slider values and highlight active preset | `index.html:192-220` |
| Export CSV button hidden until first generation succeeds | `index.html:269` |
| Copy-to-clipboard on credential email | `index.html:287` |
| State auto-refreshes every 10 seconds | `index.html:409` |
| Duplicate user during re-run (409 from auth) falls back to DB lookup | `seeder.ts:97` |
| Safety-net cleanup removes untracked `demo.%@gym.demo` users | `cleanup.ts:49` |

## CODE → DOCS Gaps

### Undocumented Endpoints / Logic

| Item | Location | Issue |
|------|----------|-------|
| `GET /api/state` | `server.ts:25` | Response shape, V18 dependency, and silent-failure mode undocumented |
| `GET /api/credentials` | `server.ts:37` | No SDD describes this endpoint or the credential schema |
| `GET /api/credentials.csv` | `server.ts:41` | CSV format, field list, and DEMO_PASSWORD embedding undocumented |
| `POST /api/generate` (SSE) | `server.ts:58` | Event protocol (progress, complete, error), 409 concurrency guard undocumented |
| `POST /api/cleanup` | `server.ts:94` | Cleanup scope (tracked IDs + email-pattern fallback) undocumented |
| Safety-net DELETE | `cleanup.ts:47-50` | Deletes any user matching `demo.%@gym.demo` regardless of tracked status — scope not documented |
| `isGenerating` in-memory flag | `server.ts:16` | Resets on restart; partial-run state not cleaned up — not documented |

### Undocumented UI

- The entire `demo-seeder/public/index.html` dashboard has no design spec: preset buttons, slider, progress bar, credentials table, CSV export, copy-to-clipboard, warning banner, stat cards.

### Undocumented Behaviours

- **Demo password hardcoded** (`seeder.ts:9`, `server.ts:43`, `index.html:171`): `Demo@12345` appears in source, CSV export, and rendered HTML. Not in env vars. No documented decision accepting this trade-off.
- **DB password fallback** (`db.ts:12`): `process.env.DB_PASSWORD ?? 'secret'` silently uses `'secret'` if env var is absent instead of refusing to start.
- **No auth on any endpoint**: All six HTTP endpoints are unauthenticated. `POST /api/cleanup` is destructive and reachable by anyone with network access to port 3001. No documented acceptance of this risk.
- **"Classes this week" counts all DB classes** (`state.ts:27-34`): Not filtered to seeder-created instances — overstates output when non-demo classes exist.
- **`hasDemoData` imported but unused** (`server.ts:3`): Dead import.

### Untested Code Paths

| Code path | File | Risk |
|-----------|------|------|
| `runSeeder` emits `error` when no class templates/trainers exist (Flyway guard) | `seeder.ts:370` | Silent failure — stalled UI |
| Trainer filter `email LIKE '%@gymflow.local'` excludes non-seeded trainers | `seeder.ts:38` | Custom trainers ignored silently |
| Membership assignment non-deterministic (shuffle + login-failure fallthrough) | `seeder.ts:165` | Users may have no plan even at 100% coverage |
| `isGenerating` flag not persisted — resets on container restart | `server.ts:16` | Concurrent generates against stale SQLite |
| SQLite `demo-session.db` persists in Docker volume across restarts | `db.ts:18` | Stale tracking IDs from previous runs retained |
| `buildSlotDates` anchors to "current Monday" at call time | `schedule.ts:24` | Class instances in wrong week if run at week boundary |
| `node-fetch` v2 (CommonJS) — may break on Node 22+ | `package.json` | Build failure risk |
| V18 `status` column absent — `loadState()` silently returns `—` for all stats | `state.ts:28-34` | Operator sees no error |

## Suggested Fix Order

1. **Write `docs/sdd/demo-seeder.md`** — record: purpose, endpoint contract, seeding algorithm, cleanup scope, V18 migration dependency, SQLite tracking, accepted security trade-offs (unauthenticated endpoints, plaintext demo password in a dev-only tool).
2. **Add V18 startup guard** (`state.ts` / `server.ts`) — detect when the `status` column is absent and surface a clear error in the UI instead of silent `—`.
3. **Move `DEMO_PASSWORD` to env var** (`seeder.ts`, `server.ts`, `index.html`) — read from `process.env.DEMO_PASSWORD`, fail fast if absent. Add to `.env.example`.
4. **Move `DB_PASSWORD` fallback to a startup assertion** (`db.ts`) — throw on startup if env var is absent rather than defaulting to `'secret'`.
5. **Document or narrow safety-net cleanup scope** (`cleanup.ts:47-50`) — add a comment block explaining why email-pattern sweep is safe, or restrict it to tracked IDs only.
6. **Add trainer guard before generation starts** (`seeder.ts`) — check `trainerIds.length === 0` before beginning user creation and emit a clear SSE `error` event with an actionable message.
