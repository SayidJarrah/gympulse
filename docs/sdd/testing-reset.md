# SDD: E2E Testing Strategy Reset

## Reference
- Brief: docs/briefs/testing-reset.md
- Date: 2026-04-13

## Architecture Overview

This reset replaces the entire E2E testing surface. There is no PRD; the brief is the scope
agreement. The reset touches no product behaviour: zero backend logic changes, zero frontend
feature changes, zero Flyway migrations.

Layers affected:
- Docker Compose infrastructure (two compose files, new volume names)
- E2E test package (relocated from `frontend/e2e/` to top-level `e2e/`)
- Seed data (new `e2e-seed/` directory with minimal baseline SQL)
- Skill / command definitions (`/run`, `/verify`, `/deliver`, `test-manifest` skill)
- Documentation (`docs/qa/`, `docs/bugs/`, `docs/gaps/seeding-consolidation.md`)

**What this reset replaces and why.** The current setup accumulated three interconnected problems:

1. Specs are coupled to a shared `global-setup.ts` that creates rooms, trainers, instances, and
   two membership plans before every run. Any test that assumes a specific absence of data
   contradicts the seed (Lesson 6). The setup is fragile, slow, and causes partial-coverage
   failures across many specs.

2. Three Docker Compose stacks (`docker-compose.review.yml`, `docker-compose.e2e.yml`, a demo
   stack) share naming conventions but have diverged. The current `docker-compose.e2e.yml` uses
   the Postgres container DB name `gymflow_e2e` but the container's `POSTGRES_DB` env var is
   `gymflow`, which means the backend `DB_URL` points at a database that Flyway cannot create
   (the init script in `docker/postgres/init` creates `gymflow`, not `gymflow_e2e`). This is a
   latent structural defect.

3. Bug tracking lives in 24+ markdown files under `docs/bugs/`. No spec prevents regression on
   any of them. The files have no lifecycle and accumulate without bound.

**After the reset:**
- `docker-compose.dev.yml` = manual playground (renamed from `review`). Rich demo data.
- `docker-compose.e2e.yml` = Playwright target. Separate Postgres container with its own
  volume. No demo data; only a baseline seed.
- `e2e/` = top-level Playwright package with its own `package.json`. Two projects: `default`
  (parallel, approach D) and `clean-slate` (serial, approach C).
- Bugs become specs.

---

## 1. Migration Plan

Six sequential PRs. Each must merge green before the next begins.

| Step | Branch | Scope |
|------|--------|-------|
| 1 | `chore/testing-reset-step-1` | Scaffold new stacks |
| 2 | `chore/testing-reset-step-2` | Scaffold `/e2e` package + smoke spec |
| 3 | `chore/testing-reset-step-3` | Port specs feature-by-feature (9 specs) |
| 4 | `chore/testing-reset-step-4` | Clean-slate specs (2 specs) |
| 5 | `chore/testing-reset-step-5` | Deletion sweep |
| 6 | `chore/testing-reset-step-6` | Docs and command updates |

**Risk: partial coverage window during Step 3.** For approximately 2 weeks the suite has partial
coverage while specs are rewritten one at a time. Mitigation: port highest-risk features first
(auth, purchase). Features not yet re-covered may use `/verify --skip-spec <name>` until their
new spec is green in CI. In-progress product features must not be merged until their spec is
re-covered or the developer explicitly confirms the risk.

---

## 2. Infrastructure Contracts

### 2.1 `docker-compose.dev.yml` (manual playground)

Renamed from `docker-compose.review.yml`. No other changes except names and labels.

| Service | Image tag | Host port | Container port | Notes |
|---------|-----------|-----------|----------------|-------|
| postgres | `postgres:15` | 5432 | 5432 | DB name `gymflow`, volume `pg_dev_data` |
| backend | `gymflow-backend:dev` | 8080 | 8080 | connects to postgres:5432/gymflow |
| frontend | `gymflow-frontend:dev` | 5173 | 80 | served by nginx inside container |
| demo-seeder | `gymflow-demo-seeder:dev` | 3002 | 3001 | rich seed: users, bookings, favorites |

**Volume names:**
```
pg_dev_data
demo_seeder_data
```

**Postgres service environment variables:**
```
POSTGRES_DB: gymflow
POSTGRES_USER: gymflow
POSTGRES_PASSWORD: secret
```

**Backend environment variables:**
```
DB_URL: jdbc:postgresql://postgres:5432/gymflow
DB_USER: gymflow
DB_PASSWORD: secret
JWT_SECRET: <from env or compose override>
JWT_EXPIRY_MS: 86400000
```

**Demo-seeder environment variables:**
```
DB_HOST: postgres
DB_PORT: "5432"
DB_NAME: gymflow
DB_USER: gymflow
DB_PASSWORD: secret
GYMFLOW_API_URL: http://backend:8080/api/v1
DATA_DIR: /app/data
DEMO_PASSWORD: Demo@12345
ADMIN_TOKEN: review-admin-token
```

Boot sequence: postgres healthy → backend (Flyway migrates) → frontend; demo-seeder starts after
backend is healthy and applies rich data.

Healthchecks: identical to current `docker-compose.review.yml` intervals (10s/5s/5 retries).

### 2.2 `docker-compose.e2e.yml` (Playwright target)

Replaces the current `docker-compose.e2e.yml`. Key difference: Postgres runs as a completely
separate container with its own named volume. The DB name inside the container is `gymflow_e2e`
and `POSTGRES_DB` is set to match, eliminating the current structural defect where the init
script creates `gymflow` but the backend `DB_URL` references `gymflow_e2e`.

| Service | Image tag | Host port | Container port | Notes |
|---------|-----------|-----------|----------------|-------|
| postgres | `postgres:15` | 5433 | 5432 | DB name `gymflow_e2e`, volume `pg_e2e_data` |
| backend | `gymflow-backend:e2e` | 8081 | 8080 | connects to postgres:5432/gymflow_e2e |
| frontend | `gymflow-frontend:e2e` | 5174 | 80 | served by nginx inside container |
| playwright | `mcr.microsoft.com/playwright:v1.58.2-jammy` | — | — | runs specs; mounts `e2e/` not `frontend/` |

**Volume names:**
```
pg_e2e_data
playwright_node_modules
```

**Postgres service environment variables:**
```
POSTGRES_DB: gymflow_e2e
POSTGRES_USER: gymflow
POSTGRES_PASSWORD: secret
```

**Backend environment variables:**
```
DB_URL: jdbc:postgresql://postgres:5432/gymflow_e2e
DB_USER: gymflow
DB_PASSWORD: secret
JWT_SECRET: <from env or compose override>
JWT_EXPIRY_MS: 86400000
GYMFLOW_TEST_SUPPORT_ENABLED: "true"
```

No `GYMFLOW_TEST_SUPPORT_ENABLED` in the dev stack. That flag must remain false (absent)
in dev to prevent the cleanup endpoint being accidentally reachable.

**Playwright service environment variables:**
```
E2E_API_BASE: http://backend:8080/api/v1
E2E_BASE_URL: http://frontend:80
```

**Playwright service volume mount:** `./e2e:/work` (top-level `e2e/` package, not `frontend/`).

**Playwright entrypoint:**
```
/bin/sh -lc "npm ci && npx playwright test"
```

Boot sequence: postgres healthy → backend (Flyway migrates on boot, then `e2e-seed/baseline.sql`
is applied by the backend's startup hook or by a one-shot init container) → frontend healthy →
playwright.

**Baseline seed application.** The `e2e-seed/baseline.sql` is mounted into the postgres
container at `/docker-entrypoint-initdb.d/02-baseline.sql` so it runs automatically on first
`up`. On subsequent `up` calls (volume already initialised), it is skipped by Postgres's init
script convention. For a full reset the `reset.sh` script handles the explicit DROP + re-apply.

Both stacks expose different host ports (:5432/:8080/:5173 for dev vs :5433/:8081/:5174 for e2e)
so they can run simultaneously on the same machine without port collision.

---

## 3. E2E Package Structure

### 3.1 Directory tree

```
gympulse/
├── e2e/
│   ├── package.json
│   ├── package-lock.json
│   ├── playwright.config.ts
│   ├── fixtures/
│   │   ├── api-client.ts
│   │   ├── test-user.ts
│   │   └── reset-db.ts
│   ├── helpers/
│   │   ├── login.ts
│   │   └── selectors.ts
│   ├── specs/
│   │   ├── auth.spec.ts
│   │   ├── membership-plans.spec.ts
│   │   ├── membership-purchase.spec.ts
│   │   ├── member-home.spec.ts
│   │   ├── trainer-discovery.spec.ts
│   │   ├── class-schedule.spec.ts
│   │   ├── class-booking.spec.ts
│   │   ├── user-profile.spec.ts
│   │   └── entity-image-management.spec.ts
│   └── clean-slate/
│       ├── onboarding-empty-state.spec.ts
│       └── admin-first-install.spec.ts
└── e2e-seed/
    ├── baseline.sql
    └── reset.sh
```

The `e2e/` package is entirely outside `frontend/`. Playwright upgrades and `frontend/`
dependency changes are fully independent.

### 3.2 `e2e/playwright.config.ts` — two projects

```
Project: "default"
  testDir: ./specs
  workers: undefined  (Playwright default: half CPU cores)
  retries: 0
  use:
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5174'
    screenshot: 'only-on-failure'
    trace: 'retain-on-failure'

Project: "clean-slate"
  testDir: ./clean-slate
  workers: 1
  retries: 0
  use:
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5174'
    screenshot: 'only-on-failure'
    trace: 'retain-on-failure'
```

Global config:
```
timeout: 30_000
reporter: [['html', { open: 'never' }], ['list']]
```

No `globalSetup` or `globalTeardown` at the config level. The clean-slate project uses a
per-file `beforeAll` instead.

### 3.3 `e2e/fixtures/api-client.ts`

Thin wrapper over Playwright's `APIRequestContext`. All calls go to real API endpoints — no
direct DB access.

**Type: `RegisterInput`**
```typescript
interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}
```

**Type: `RegisteredUser`**
```typescript
interface RegisteredUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userId: string;
  accessToken: string;
}
```

**Class: `ApiClient`**

Constructor: `constructor(private request: APIRequestContext)`

Methods:

`registerUser(overrides?: Partial<RegisterInput>): Promise<RegisteredUser>`
- Generates `email: u-<uuid8>@test.gympulse.local` unless overridden
- Default `password: 'Test123!'`, `firstName: 'Test'`, `lastName: <uuid8>`
- POST `/api/v1/auth/register`
- `expect(res.ok()).toBeTruthy()` — fails fast if setup fails
- Returns spread of input plus `userId: body.userId, accessToken: body.accessToken`

`purchasePlan(accessToken: string, planId: string): Promise<void>`
- POST `/api/v1/memberships` with `{ planId }`
- Bearer token from `accessToken`
- `expect(res.ok()).toBeTruthy()`

`bookClass(accessToken: string, classInstanceId: string): Promise<void>`
- POST `/api/v1/bookings` with `{ classInstanceId }`
- Bearer token from `accessToken`
- `expect(res.ok()).toBeTruthy()`

`favoriteTrainer(accessToken: string, trainerId: string): Promise<void>`
- POST `/api/v1/trainers/<trainerId>/favorite`
- Bearer token from `accessToken`
- `expect(res.ok()).toBeTruthy()`

**Rules enforced inside `ApiClient` (never relaxed in specs):**
- Every email must end with `@test.gympulse.local`
- Response assertions (`expect(res.ok())`) live inside the client; specs do not re-assert setup
- No SQL or DB calls

### 3.4 `e2e/fixtures/test-user.ts`

**Type: `TestUser`**
```typescript
export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userId: string;
  accessToken: string;
}
```

**Playwright fixture wiring (also in this file):**
```typescript
export const test = base.extend<{ api: ApiClient; freshUser: TestUser }>({
  api: async ({ request }, use) => use(new ApiClient(request)),
  freshUser: async ({ api }, use) => use(await api.registerUser()),
});
```

All spec files in `e2e/specs/` import `{ test, expect }` from `../fixtures/test-user` instead of
`@playwright/test` directly.

### 3.5 `e2e/fixtures/reset-db.ts`

Used only by the `clean-slate` project. Never imported from `specs/`.

**Function: `resetDatabase(): Promise<void>`**

Steps executed in order:
1. `docker compose -f docker-compose.e2e.yml exec -T postgres psql -U gymflow -d gymflow_e2e -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'`
2. `docker compose -f docker-compose.e2e.yml restart backend` (Flyway re-runs all migrations on boot)
3. Poll `GET http://localhost:8081/api/v1/health` until 200, up to 60 seconds, 2-second interval
4. `docker compose -f docker-compose.e2e.yml exec -T postgres psql -U gymflow -d gymflow_e2e -f /docker-entrypoint-initdb.d/02-baseline.sql`

Implementation uses `execa` (Node) for subprocess calls. All subprocess failures throw and
propagate — the test must not proceed on a failed reset.

### 3.6 `e2e/helpers/login.ts`

**Function: `loginAs(page: Page, email: string, password: string): Promise<void>`**
- Navigates to `/login`
- Fills `#email` with `email`
- Fills `#password` with `password`
- Clicks the sign-in button (selector: `getByRole('button', { name: 'Sign in' })`)
- Does NOT assert the post-login URL — the caller asserts destination

### 3.7 `e2e/helpers/selectors.ts`

Exports a plain object of `data-testid` string constants. Never uses `page.locator` — these are
strings only. Spec files import constants from here rather than hardcoding testid strings inline.

Pattern:
```typescript
export const Selectors = {
  onboardingEmptyState: 'onboarding-empty-state',
  membershipCard: 'membership-card',
  // ... one entry per stable testid in the app
} as const;
```

The full list is populated during Step 3 as each spec is written. The file must be updated
alongside every new spec that introduces a new testid dependency.

---

## 4. Spec Inventory

### 4.1 New-to-old mapping

| New spec (`e2e/specs/`) | Old spec (`frontend/e2e/`) | Port approach | Notes |
|-------------------------|---------------------------|---------------|-------|
| `auth.spec.ts` | `auth.spec.ts` | Rewrite | Drop `global-setup.ts` admin dependency; use `freshUser` fixture. Admin tests use env-var credentials. |
| `membership-plans.spec.ts` | `membership-plans.spec.ts` | Rewrite | Approach D; plans come from baseline seed, not `global-setup` creation |
| `membership-purchase.spec.ts` | `user-membership-purchase.spec.ts` | Rewrite | Renamed to match feature slug |
| `member-home.spec.ts` | `member-home.spec.ts` | Rewrite | Approach D; `freshUser` + `purchasePlan` for active-state variants |
| `trainer-discovery.spec.ts` | `trainer-discovery.spec.ts` | Rewrite | Trainers from baseline seed |
| `class-schedule.spec.ts` | `group-classes-schedule-view.spec.ts` + `class-schedule.spec.ts` | Merge + rewrite | Two old specs cover overlapping territory; merge into one. Instances from baseline seed. |
| `class-booking.spec.ts` | (no direct equivalent) | New | Booking flows were partially in `member-home`; extract to own spec |
| `user-profile.spec.ts` | `user-profile-management.spec.ts` | Rewrite | Renamed to match SDD slug |
| `entity-image-management.spec.ts` | `entity-image-management.spec.ts` | Rewrite | Same scope; rewrite to use `freshUser` fixture |

The old `landing-page.spec.ts` has no corresponding new spec in `e2e/specs/`. Landing page ACs
covered by `auth.spec.ts` navigation tests (unauthenticated redirect behaviour). Dedicated
landing-page spec is not carried forward — the page contains no authenticated state and is
trivial to cover within the auth spec.

### 4.2 Clean-slate specs

| New spec (`e2e/clean-slate/`) | Premise | Reset required because |
|-------------------------------|---------|------------------------|
| `onboarding-empty-state.spec.ts` | New member sees empty state on home with no plans, no trainers, no classes | Baseline seed provides trainers and class templates; only a full reset can guarantee their absence |
| `admin-first-install.spec.ts` | Admin logs in with no reference data configured | Same: baseline seed provides reference data |

### 4.3 Baseline seed content (`e2e-seed/baseline.sql`)

The baseline seed is the minimum reference data all `default` project specs assume:
- At least 2 membership plans (names: `Starter Monthly`, `Unlimited Monthly`)
- At least 3 trainers
- At least 3 class templates (e.g. `HIIT Bootcamp`, `Yoga Flow`, `Spin Cycle`)
- At least 2 rooms (`Studio A`, `Studio B`)
- At least 5 class instances spread across the current ISO week (Monday–Friday)

The seed does NOT create any member users. Tests create users via `ApiClient.registerUser()`.

The seed uses `INSERT ... ON CONFLICT DO NOTHING` throughout so it is safe to apply against a
DB that already has data (idempotent).

---

## 5. Deletion Inventory (Step 5)

The following are deleted in the `chore/testing-reset-step-5` PR. Nothing is deleted before
the replacement is green in CI.

### Files and directories to delete

**E2E package (old location):**
```
frontend/e2e/auth.spec.ts
frontend/e2e/class-schedule.spec.ts
frontend/e2e/entity-image-management.spec.ts
frontend/e2e/group-classes-schedule-view.spec.ts
frontend/e2e/membership-plans.spec.ts
frontend/e2e/user-membership-purchase.spec.ts
frontend/e2e/trainer-discovery.spec.ts
frontend/e2e/user-profile-management.spec.ts
frontend/e2e/member-home.spec.ts
frontend/e2e/landing-page.spec.ts
frontend/e2e/global-setup.ts
frontend/e2e/global-teardown.ts   (if present)
frontend/playwright.config.ts
```

The `frontend/e2e/` directory itself is removed once empty.

**QA docs:**
```
docs/qa/test-manifest.md
docs/qa/e2e-flow-coverage.csv
docs/qa/e2e-test-cases-catalog.md
docs/qa/seed-users.md
docs/qa/e2e-flow-coverage-process.md
```

The `docs/qa/` directory itself is removed once empty.

**Bug docs (entire directory):**
```
docs/bugs/   (all 24+ files)
```

**Gap docs:**
```
docs/gaps/seeding-consolidation.md
```

The `docs/gaps/` directory is removed only if it is empty after the above deletion.

**Old compose file:**
```
docker-compose.review.yml
```

(The new `docker-compose.e2e.yml` replaces the old one in Step 1. The old one is overwritten,
not separately deleted.)

**Skill:**
```
.claude/skills/test-manifest/   (entire directory)
```

### Frontend `package.json` changes

Remove `test:e2e` script and `@playwright/test` dev dependency from `frontend/package.json`
in Step 5. Playwright is a dependency of `e2e/package.json` only after the reset.

---

## 6. Skill and Command Changes

### 6.1 `/run` skill

**Current behaviour:** `docker compose -f docker-compose.review.yml up -d` + health check.

**New behaviour:** `docker compose -f docker-compose.dev.yml up -d` + health check.

No other changes to the `/run` skill.

### 6.2 `/verify` skill

**Current behaviour:** e2e stack up (without `--build`) + Playwright via `npm run test:e2e` in
`frontend/`.

**New behaviour:**
```
docker compose -f docker-compose.e2e.yml up -d --build
# wait for all services healthy
cd e2e && npm ci && npx playwright test
```

Subcommands:
- `/verify default` — `npx playwright test --project=default`
- `/verify clean-slate` — `npx playwright test --project=clean-slate`
- `/verify --spec <name>` — `npx playwright test specs/<name>.spec.ts`

The `--build` flag is non-negotiable in `/verify` (codifies Lesson 7: rebuilt containers before
running tests).

### 6.3 `/deliver` skill

Remove all references to the `test-manifest` skill. Remove the step that updates
`docs/qa/test-manifest.md` after spec writing.

Add rule: "A bug confirmed reproducible in the UI must become a failing spec in `e2e/specs/`
before the fix PR is raised. The spec file is the bug record. A one-line `// regression: ...`
comment is acceptable."

### 6.4 `test-manifest` skill

Deleted entirely. The `test-manifest` skill directory (`.claude/skills/test-manifest/`) is
removed in Step 5.

### 6.5 CLAUDE.md changes

Remove:
- References to `docs/qa/`
- References to `docs/bugs/`

Add a **Testing** section with the following content:

**Two stacks:**
- `docker-compose.dev.yml` — manual playground. Start with `/run`. Rich demo data. Never run
  Playwright against this stack.
- `docker-compose.e2e.yml` — Playwright target. Start automatically by `/verify`. Baseline
  seed only.

**DB state approaches:**
- Approach D (default): each test creates its own user via `ApiClient.registerUser()`. Email
  ends in `@test.gympulse.local`. No cleanup required per test.
- Approach C (clean-slate): tests in `e2e/clean-slate/` call `resetDatabase()` in `beforeAll`.
  Serial execution only (`workers: 1`).

**Rules:**
- No SQL or direct DB access from any spec file. If a precondition cannot be established via the
  real API, the spec belongs in `clean-slate/` and requires `resetDatabase()`.
- All test emails end with `@test.gympulse.local`. This is enforced by `ApiClient`.
- Bugs become specs. No markdown bug docs. A one-line `// regression: ...` comment is acceptable
  when history context helps a future reader.
- `/verify` always passes `--build`. Never run the suite against a stale container.

**MCP table update:**
- Postgres MCP defaults to dev DB (`:5432`). For E2E DB inspection during debugging, connect to
  `:5433`.

---

## 7. Guardrails

These rules apply to every PR under this reset. They are not negotiable.

1. **Green before delete.** Every existing green E2E spec must be re-covered by a new spec in
   `e2e/specs/` or `e2e/clean-slate/` before its old counterpart in `frontend/e2e/` is deleted.
   Step 5 (deletion sweep) cannot begin until all 9 ported specs and both clean-slate specs are
   green in CI.

2. **No shared-seed coupling (Lesson 6).** No spec may depend on the absence of data that the
   baseline seed provides. If a test premise requires "no X exists in the system", it belongs in
   `clean-slate/` with `resetDatabase()`.

3. **Rebuild discipline (Lesson 7).** `/verify` must always rebuild containers (`--build`) before
   running tests. This is enforced at the skill level. Manual invocations that skip `--build`
   are not supported and must not be documented as a valid workflow.

4. **Backend unit tests untouched.** No PR under this reset modifies any file under
   `backend/src/test/`. Backend tests are out of scope.

5. **No product behaviour changes.** No PR under this reset modifies any frontend component,
   backend controller, service, or migration. Infrastructure and test files only.

6. **One spec per feature.** Spec file names match the SDD slug for the feature they cover.
   No catch-all or multi-feature spec files.

7. **Hard limit: ≤5 clean-slate specs.** If more than 5 specs require `resetDatabase()`,
   re-examine whether the premise can instead be established via `ApiClient`. Only true
   empty-state or first-install scenarios qualify for `clean-slate/`.

8. **Max 7 ACs per PRD** if PRDs are written for this reset (one per migration step, 6 total).

---

## 8. Risks and Notes

### Assumptions

**A1.** The baseline seed will be sufficient reference data for all `default` project specs.
If a spec needs a trainer, plan, class template, or room that the baseline does not provide,
the spec must either accept the baseline data as-is or use `ApiClient` to create the additional
data (for entities where the API allows member-level or admin-level creation). This assumption is
stated because the exact API surface for admin operations (trainer create, room create) from
within a test has not been validated at the time of writing.

**A2.** The `GYMFLOW_TEST_SUPPORT_ENABLED` flag (already present in the current
`docker-compose.e2e.yml` backend env) continues to control the `/test-support/e2e/cleanup`
endpoint. The new design does not use that endpoint — cleanup is handled by the nightly
`scripts/cleanup-test-users.sh` script for the E2E DB. The flag remains `"true"` in the e2e
stack only, to allow the `resetDatabase()` function's schema-drop approach to work alongside any
test-support-gated routes.

**A3.** `docker-compose.dev.yml` retains the `demo-seeder` service and its `demo_seeder_data`
volume. The `demo-seeder` is not modified by this reset.

**A4.** The Playwright image tag `mcr.microsoft.com/playwright:v1.58.2-jammy` is carried forward
from the current `docker-compose.e2e.yml`. It should be updated to the version matching
`e2e/package.json` when Step 2 sets the Playwright version in the new package.

### Structural defect fixed

The current `docker-compose.e2e.yml` sets `POSTGRES_DB: gymflow` (container DB name is `gymflow`)
but the backend `DB_URL` is `jdbc:postgresql://postgres:5432/gymflow_e2e`. These do not match.
The Postgres init script in `docker/postgres/init/` creates `gymflow`, not `gymflow_e2e`, so
the backend connects to a database that either does not exist or is created ad-hoc by Flyway.
The new `docker-compose.e2e.yml` fixes this by setting `POSTGRES_DB: gymflow_e2e` so that the
container, the init script (if applicable), and the backend `DB_URL` all agree on the DB name.

### Nightly cleanup job

`scripts/cleanup-test-users.sh` deletes rows matching `%@test.gympulse.local` older than 24h
from the E2E DB. This script is created in Step 1 alongside the new compose files. CI does not
need it: on every CI run the E2E volume is either fresh or the suite creates fresh UUIDs that
do not collide with prior runs. The script is for long-running local environments where the
volume is never nuked.

### Frontend `baseURL` port change

Current specs target `http://localhost:3000` (the `frontend` service in `docker-compose.review.yml`
maps container port 80 to host port 3000). After the reset, the dev stack frontend is on `:5173`
and the e2e stack frontend is on `:5174`. The new `playwright.config.ts` defaults to `:5174`
(e2e stack). The `/verify` skill sets `E2E_BASE_URL=http://localhost:5174` explicitly.

### `docs/sdd/seeding-consolidation.md`

The file `docs/sdd/seeding-consolidation.md` is an SDD (not a gap report). It is not deleted
by this reset. Only `docs/gaps/seeding-consolidation.md` is deleted.