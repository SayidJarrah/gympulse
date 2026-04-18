# Brief: E2E Testing Strategy Reset

Date: 2026-04-13
Status: Design approved — awaiting PRD decomposition

## Problem

The current E2E testing setup is unmaintainable due to historical accumulation:
- Specs coupled to a shared global seed (Lesson 6 territory: tests assume DB states the seed contradicts)
- Three Docker Compose stacks (`demo`, `e2e`, `review`) with unclear boundaries and seed drift
  (see `docs/gaps/seeding-consolidation.md`)
- 24 ad-hoc markdown bug files in `docs/bugs/` with no lifecycle and no link to the test that prevents regression
- QA docs (`docs/qa/test-manifest.md`, `e2e-flow-coverage.csv`) stale vs reality
- Manual clicking and E2E runs collide on the same DB

Backend unit tests under `backend/src/test/` are healthy and out of scope for this reset.

## Goal

Rebuild the E2E testing system from scratch with:
1. An isolated application stack for manual testing that never collides with automated tests.
2. A Playwright E2E suite with deterministic DB state and no shared-seed coupling.
3. A clean, minimal documentation surface (no bug doc sprawl, no stale manifests).

## Scope

### In scope
- Delete and replace all current E2E infrastructure (specs, config, compose files, docs, skills)
- New top-level `e2e/` package (outside `frontend/`)
- New `docker-compose.e2e.yml` (Postgres container on :5433) — fully separate from dev
- New `docker-compose.dev.yml` (rename of `docker-compose.review.yml`) for manual testing
- Rewrite of all 11 existing specs (feature-by-feature, green-before-delete)
- New `clean-slate` subset (3–5 specs) for empty-state scenarios
- Removal of `docs/qa/`, `docs/bugs/`, `docs/gaps/seeding-consolidation.md`
- Removal of `test-manifest` skill; updates to `/deliver`, `/run`, `/verify` skills
- CLAUDE.md updates

### Out of scope
- Backend unit tests under `backend/src/test/**` (stay as-is)
- Flyway migrations (source of truth, unchanged)
- Any product feature changes

---

## Approved Design

### 1. DB state strategy

**Approach D (default, most specs):**
Each test creates its own user via the real API with a UUID-suffixed email
(`u-<uuid8>@test.gympulse.local`). Reference data (trainers, plan catalog,
class templates) is treated as immutable and lives in a minimal baseline seed.
No per-test cleanup. A nightly script prunes rows matching
`%@test.gympulse.local` older than 24h.

- Parallel-safe
- No teardown required
- Data left behind is inert (unique emails, easy to target)

**Approach C (clean-slate subset, ~3–5 specs):**
For tests whose premise is "no X exists in the system" (onboarding empty states,
admin-first-install). Full DB reset in `beforeAll`:
`DROP SCHEMA public CASCADE` → restart backend (Flyway migrate on boot) →
apply `e2e-seed/baseline.sql`. Runs serially (workers: 1).

### 2. Infrastructure — separate Postgres containers

- **`docker-compose.dev.yml`** (manual playground)
  - Postgres `gymflow_dev` on :5432, volume `pg_dev_data`
  - Backend :8080, frontend :5173
  - `demo-seeder` runs on `up` with rich data (users with histories, bookings, favorites)
  - Destroy-safe: `down -v && up` rebuilds in ~30s

- **`docker-compose.e2e.yml`** (Playwright target)
  - Postgres `gymflow_e2e` on :5433, volume `pg_e2e_data` (separate volume, zero shared state)
  - Backend :8081, frontend :5174 (both stacks run simultaneously)
  - Boot sequence: Flyway migrates → `e2e-seed/baseline.sql` applies reference data only
  - No demo-seeder. Tests create what they need via API.

### 3. Bug tracking

Kill `docs/bugs/` entirely. Every bug becomes either:
- A failing E2E spec (if reproducible in UI), or
- A backend unit test (if logic-level)

The test file *is* the bug record. A one-line `// regression: ...` comment is
acceptable when history context helps a future reader.

### 4. Test organization

**Top-level `e2e/` package** with own `package.json`, own `node_modules`, own
lockfile — Playwright upgrades never touch the frontend.

```
gympulse/
├── docker-compose.dev.yml
├── docker-compose.e2e.yml
├── backend/
├── frontend/                        # no e2e/ folder anymore
├── e2e/
│   ├── package.json
│   ├── playwright.config.ts         # two projects: default + clean-slate
│   ├── fixtures/
│   │   ├── api-client.ts            # thin API wrapper
│   │   ├── test-user.ts             # registerFreshUser helper
│   │   └── reset-db.ts              # used only by clean-slate project
│   ├── helpers/
│   │   ├── login.ts                 # UI login helper
│   │   └── selectors.ts             # shared testid constants
│   ├── specs/                       # approach D — parallel
│   │   ├── auth.spec.ts
│   │   ├── membership-plans.spec.ts
│   │   ├── membership-purchase.spec.ts
│   │   ├── member-home.spec.ts
│   │   ├── trainer-discovery.spec.ts
│   │   ├── class-schedule.spec.ts
│   │   ├── class-booking.spec.ts
│   │   ├── user-profile.spec.ts
│   │   └── entity-image-management.spec.ts
│   └── clean-slate/                 # approach C — serial, workers: 1
│       ├── onboarding-empty-state.spec.ts
│       └── admin-first-install.spec.ts
└── e2e-seed/
    ├── baseline.sql                 # reference data ONLY: trainers, plan catalog, class templates
    └── reset.sh                     # drop + flyway migrate + apply baseline
```

**Spec shape:** one spec per feature (matches SDD structure).

### 5. API helper layer

Thin wrapper over the real API only. Calls go through Playwright's `request`
fixture to real endpoints.

```ts
export class ApiClient {
  constructor(private request: APIRequestContext) {}

  async registerUser(overrides: Partial<RegisterInput> = {}) {
    const suffix = crypto.randomUUID().slice(0, 8);
    const input = {
      email: `u-${suffix}@test.gympulse.local`,
      password: 'Test123!',
      firstName: 'Test',
      lastName: suffix,
      ...overrides,
    };
    const res = await this.request.post('/api/v1/auth/register', { data: input });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    return { ...input, userId: body.userId, accessToken: body.accessToken };
  }

  async purchasePlan(token: string, planId: string) { /* ... */ }
  async bookClass(token: string, classInstanceId: string) { /* ... */ }
  async favoriteTrainer(token: string, trainerId: string) { /* ... */ }
}
```

**Playwright fixture wiring:**
```ts
export const test = base.extend<{ api: ApiClient; freshUser: TestUser }>({
  api: async ({ request }, use) => use(new ApiClient(request)),
  freshUser: async ({ api }, use) => use(await api.registerUser()),
});
```

**Rules enforced by the client:**
- Every email ends `@test.gympulse.local`
- No direct DB access from helpers — if the API doesn't expose it, the spec goes to `clean-slate/`
- Response assertions (`expect(res.ok())`) live inside the client so specs fail fast on setup errors

### 6. Command surface

| Command              | What it does                                                                 |
|----------------------|------------------------------------------------------------------------------|
| `/run`               | `docker compose -f docker-compose.dev.yml up -d` + health check              |
| `/verify`            | e2e stack up --build + health check + both Playwright projects               |
| `/verify default`    | only the `default` Playwright project (fast loop, no DB resets)              |
| `/verify clean-slate`| only the `clean-slate` project                                               |
| `/verify --spec X`   | single spec, default project                                                 |

`/verify` always passes `--build` to backend/frontend containers
(codifies Lesson 7: rebuild discipline).

### 7. Clean-slate reset mechanism

```ts
// e2e/fixtures/reset-db.ts
export async function resetDatabase() {
  await execa('docker', ['compose', '-f', 'docker-compose.e2e.yml',
    'exec', '-T', 'postgres',
    'psql', '-U', 'gymflow', '-d', 'gymflow_e2e',
    '-c', 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;']);
  await execa('docker', ['compose', '-f', 'docker-compose.e2e.yml',
    'restart', 'backend']);
  await waitForBackendHealthy();
  await applyBaselineSeed();
}
```

Usage:
```ts
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => { await resetDatabase(); });

test('new member landing on home sees onboarding empty state', async ({ page, api }) => {
  const user = await api.registerUser();
  await loginAs(page, user.email, user.password);
  await expect(page.getByTestId('onboarding-empty-state')).toBeVisible();
});
```

Target: ≤5 clean-slate specs, total cost ~1 min (~10s per reset).

### 8. Cleanup job

`scripts/cleanup-test-users.sh` deletes `%@test.gympulse.local` rows older than
24h from the E2E DB. Run weekly locally; CI doesn't need it (volume nuked per run).

---

## Deletions

- `frontend/e2e/` — all 11 specs, `global-setup.ts`, `global-teardown.ts`, `playwright.config.ts`
- `docs/qa/` entirely (`test-manifest.md`, `e2e-flow-coverage.csv/.md`, `seed-users.md`, `e2e-flow-coverage-process.md`)
- `docs/bugs/` entirely (all 24 files)
- `docs/gaps/seeding-consolidation.md` (resolved by the reset)
- Old `docker-compose.e2e.yml` and `docker-compose.demo.yml`
- `.claude/skills/test-manifest/` skill directory
- test-manifest references in the `/deliver` skill

## Keep

- `backend/src/test/**` — all 15+ Kotlin unit/integration tests
- Backend Flyway migrations (schema source of truth)
- `docker-compose.review.yml` → renamed to `docker-compose.dev.yml`

---

## Migration Order

One PR per step. Each step must merge green.

1. **Scaffold new stacks** — add `docker-compose.e2e.yml`, rename `review` → `dev`,
   add `e2e-seed/baseline.sql` and `reset.sh`. Old `frontend/e2e` untouched.
2. **Scaffold `/e2e` package** — `package.json`, `playwright.config.ts` (two projects),
   `fixtures/api-client.ts`, `helpers/login.ts`, one smoke spec (`auth.spec.ts`) to
   validate the pipeline end-to-end.
3. **Port specs feature-by-feature** — auth → plans → purchase → home → trainers →
   schedule → booking → profile → images. Each spec is rewritten, not migrated;
   old spec deleted only after new one is green in CI.
4. **Clean-slate specs** — `onboarding-empty-state`, `admin-first-install`.
5. **Deletion sweep** — remove `frontend/e2e/`, `docs/qa/`, `docs/bugs/`,
   `docs/gaps/seeding-consolidation.md`, old compose files, `test-manifest` skill.
6. **Docs & command updates** — new `/verify`, `/run`, CLAUDE.md Testing section,
   `/deliver` skill updates (remove test-manifest steps, add "bugs become specs" rule).

**Risk:** Step 3 is a rewrite-in-place — for ~2 weeks the suite has partial coverage.
Mitigation: port highest-risk features first (auth, purchase). In-progress features
may need `/deliver --skip-e2e` until each is re-covered.

---

## CLAUDE.md Updates

- Remove references to `docs/qa/` and `docs/bugs/`
- Add "Testing" section:
  - Two stacks (dev vs e2e), how to choose
  - Approach D (UUID-suffix per test) and C (clean-slate subset)
  - API-wrapper-only rule (no SQL from specs)
  - "Bugs become specs" rule — no markdown bug docs
  - Rebuild discipline (`/verify` uses `--build`)
- Update MCP table: Postgres MCP defaults to dev DB; e2e DB only for debugging

---

## Guardrails for PRD Decomposition

Whoever writes the PRD(s) for this reset must observe:

- Hard limit 7 ACs per PRD — this scope needs decomposition (likely one PRD per migration-order step, so 5–6 PRDs).
- Every existing green E2E spec must be re-covered by the new suite before its
  old version is deleted.
- Lessons 6 and 7 honoured in ACs:
  - No test may depend on the absence of data that the shared seed provides
    (Lesson 6).
  - `/verify` must always rebuild containers before running tests (Lesson 7).
- Backend unit tests must remain untouched by any PRD under this reset.
- No product behaviour changes.

---

## Design Decisions Log

| # | Question                          | Chosen                                                                                    |
|---|-----------------------------------|-------------------------------------------------------------------------------------------|
| 1 | Core pain                         | F — all of: flakiness, stack sprawl, bug sprawl, stale QA docs, manual/E2E collision      |
| 2 | DB state strategy                 | D (default, UUID-suffix) + C (clean-slate subset)                                         |
| 3 | DB isolation granularity          | Separate Postgres container (not schema, not database)                                    |
| 4 | Bug tracking lifecycle            | A — kill `docs/bugs/`, bugs become specs                                                  |
| 5 | Spec file shape                   | One spec per feature (matches SDD)                                                        |
| 6 | API helper layer                  | Thin wrapper over real API (no SQL seeding from specs)                                    |
| 7 | E2E package location              | Top-level `/e2e/` (own `package.json`, not under `frontend/`)                             |
