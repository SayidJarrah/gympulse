# SDD: E2E Testing Strategy Reset

## Reference
- Brief: docs/briefs/testing-reset.md
- Date: 2026-04-13
- Revised: 2026-04-19 — greenfield scenario scope; 3-step migration; onboarding / PT / class-booking integrated; admin out of scope; §4 rewritten

## Revision summary (2026-04-19)

Step 1 of the original plan (scaffold + baseline seed + docs) is complete. When rebasing Step 1 against `main` six days of product delivery had landed (onboarding wizard, personal-training booking, class-booking cancellation, landing / home / profile redesigns, `MemberNav`, favorites removal, design-system token extraction). The original §4 spec inventory was a one-to-one port of the existing `frontend/e2e/` suite — that assumption no longer holds. Decisions for this revision:

1. **No ports.** Do not carry any test case, selector, or flow from `frontend/e2e/` into `e2e/`. Treat the new suite as greenfield.
2. **Thin coverage, main journeys only.** Ship ≤15 scenarios covering the core member + guest user journeys. No error-permutation fans, no visual-regression harness, no edge-case sweeps.
3. **Admin surface out of scope** for this reset. Admin flows are exercised by backend unit tests plus manual verification via the dev stack. An admin E2E spec file may be added later if the risk profile changes.
4. **Onboarding is a first-class citizen** of the test setup. `ApiClient.registerUser()` returns a user whose onboarding is still open. Tests that need a fully onboarded member call `api.registerUserAndCompleteOnboarding()` which walks the real onboarding API (profile → complete). No test-support shortcut — completing onboarding through real endpoints gives onboarding implicit regression coverage on every run.
5. **Migration collapses to 3 steps.** Scaffold (this PR, done) → scenarios (one PR) → deletion sweep (one PR).

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

3. Bug tracking lives in 20+ markdown files under `docs/bugs/`. No spec prevents regression on
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

Three sequential PRs. Each must merge green before the next begins.

| Step | Branch | Scope |
|------|--------|-------|
| 1 | `chore/testing-reset-step-1` | Scaffold new stacks, baseline seed, SDD — **this PR** |
| 2 | `chore/testing-reset-step-2` | Scaffold `e2e/` package + write all 13 greenfield scenarios green against the new stack |
| 3 | `chore/testing-reset-step-3` | Delete old `frontend/e2e/`, `docs/bugs/`, `docs/qa/`, `docs/gaps/seeding-consolidation.md`, `test-manifest` skill; update `/run`, `/verify`, `/deliver`, CLAUDE.md |

**Coverage gap.** Between Step 1 merge and Step 2 green there is no E2E coverage at all — the old suite still exists but is not run by `/verify` after Step 3 updates the skill. During this window (Steps 1 → 2) the old `frontend/e2e/` suite remains runnable manually via `cd frontend && npm run test:e2e`, but it is not required to be green for a feature merge. This is an intentional trade-off against the much larger cost of keeping the old suite alive while building the new one. Fast execution of Step 2 (target: same week as Step 1 merge) is the mitigation.

In-progress product features during Steps 1→2 are expected to rely on backend unit tests and manual verification until the new suite is green.

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
│   │   ├── landing.spec.ts
│   │   ├── register.spec.ts
│   │   ├── onboarding.spec.ts
│   │   ├── login.spec.ts
│   │   ├── plans.spec.ts
│   │   ├── membership-purchase.spec.ts
│   │   ├── class-schedule.spec.ts
│   │   ├── class-booking.spec.ts
│   │   ├── personal-training.spec.ts
│   │   ├── trainer-directory.spec.ts
│   │   ├── profile-edit.spec.ts
│   │   └── logout.spec.ts
│   └── clean-slate/
│       └── empty-state.spec.ts
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
direct DB access. Member-only surface; admin methods are not included (admin E2E is out of scope).

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
  onboardingCompletedAt: string | null;
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
- Returns spread of input plus `userId`, `accessToken`, and `onboardingCompletedAt: null`
- The returned user is NOT onboarded. UI-level navigation after login will land on `/onboarding`.

`registerUserAndCompleteOnboarding(overrides?: Partial<RegisterInput>): Promise<RegisteredUser>`
- Calls `registerUser(overrides)` to obtain a fresh account
- Walks the real onboarding API to completion:
  1. `PUT /api/v1/profile/me` with the required profile fields (`firstName`, `lastName`, `phone`, `dateOfBirth`). Uses a deterministic phone `+15550100000 + <uuid8>` and dateOfBirth `1995-01-01` so tests do not depend on randomness.
  2. `POST /api/v1/onboarding/complete`
- Returns the user with `onboardingCompletedAt` populated from the final profile GET (or current ISO timestamp if the server does not return it).
- This is the default path for any test that needs a member on `/home`.

`purchasePlan(accessToken: string, planId: string): Promise<string>`
- POST `/api/v1/memberships` with `{ planId }`
- Bearer token from `accessToken`
- `expect(res.ok()).toBeTruthy()`
- Returns the created `membershipId`

`listPlans(): Promise<Array<{ id: string; name: string }>>`
- GET `/api/v1/plans` (public endpoint)
- Used to resolve the baseline seed plan IDs without hardcoding the UUIDs in specs that want to look up plans by name

`listClassInstances(from: string, to: string): Promise<Array<{ id: string; name: string; scheduledAt: string }>>`
- GET `/api/v1/classes/schedule?from=...&to=...`
- Used by class-booking specs to resolve a bookable instance ID without UI scraping

`bookClass(accessToken: string, classInstanceId: string): Promise<string>`
- POST `/api/v1/bookings` with `{ classInstanceId }`
- Returns the created `bookingId`

`cancelClassBooking(accessToken: string, bookingId: string): Promise<void>`
- DELETE `/api/v1/bookings/<bookingId>` (or PATCH per current class-booking SDD)
- Exact verb and path must match `docs/sdd/class-booking.md` §API at the time Step 2 is written

`listPtTrainers(): Promise<Array<{ id: string; firstName: string; lastName: string }>>`
- GET `/api/v1/trainers/pt`
- Used by the PT spec to resolve a trainer ID

`bookPtSession(accessToken: string, trainerId: string, startAt: string): Promise<string>`
- POST `/api/v1/trainers/pt/bookings` with `{ trainerId, startAt }`
- `startAt` must be an ISO 8601 UTC timestamp on the hour, ≥24h ahead, within gym open hours (6:00–22:00 UTC). The PT spec uses a helper that picks the first such slot tomorrow at 15:00 UTC.
- Returns the created PT booking ID

**Rules enforced inside `ApiClient` (never relaxed in specs):**
- Every email must end with `@test.gympulse.local`
- Response assertions (`expect(res.ok())`) live inside the client; specs do not re-assert setup
- No SQL or DB calls

**What is deliberately NOT in `ApiClient`:**
- `favoriteTrainer` — the Favorites feature was removed from the product on 2026-04-16; the endpoint no longer exists
- Any admin method (plan CRUD, class template CRUD, user lookup) — admin E2E is out of scope
- Any `/test-support/*` helper — the real onboarding API is walked instead, so `GYMFLOW_TEST_SUPPORT_ENABLED` only gates the schema-reset path used by `reset-db.ts`

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
export const test = base.extend<{
  api: ApiClient;
  freshUser: TestUser;            // registered, onboarding still open — use for register/onboarding specs
  onboardedUser: TestUser;         // registered + onboarding walked to completion — use for all other member specs
}>({
  api: async ({ request }, use) => use(new ApiClient(request)),
  freshUser: async ({ api }, use) => use(await api.registerUser()),
  onboardedUser: async ({ api }, use) => use(await api.registerUserAndCompleteOnboarding()),
});
```

All spec files in `e2e/specs/` import `{ test, expect }` from `../fixtures/test-user` instead of
`@playwright/test` directly.

Specs choose the fixture that matches the starting state:
- `register.spec.ts`, `onboarding.spec.ts` — no fixture; they register inside the test
- All other member-facing specs use `onboardedUser` — it skips the onboarding noise and lands the user straight on `/home` after login

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

## 4. Scenario Inventory (greenfield — replaces old spec inventory)

**Principle.** Do not port any test case from `frontend/e2e/`. Each scenario is the thinnest end-to-end path that proves a feature is alive in production shape. If removing the scenario would not leave a user blocked from completing the journey, the scenario does not belong in the initial set. Error permutations, negative paths beyond one representative case per spec, and pixel-level visual checks are deferred.

**Total: 13 scenarios** — 12 in the `default` project, 1 in `clean-slate`.

### 4.1 Default project — parallel, Approach D (`e2e/specs/`)

All default-project specs use the `onboardedUser` fixture unless noted. No spec may rely on the absence of data the baseline seed provides (Lesson 6).

| # | File | Journey | Fixture | Key assertions |
|---|------|---------|---------|----------------|
| 1 | `landing.spec.ts` | Guest visits `/`, sees hero + primary CTAs; clicking "Sign up" navigates to `/register`; clicking "Sign in" navigates to `/login` | none (guest) | URL transitions only |
| 2 | `register.spec.ts` | Guest registers with a fresh `@test.gympulse.local` email → lands on `/onboarding` | none (creates inside test) | Post-submit URL is `/onboarding`; email appears in auth store |
| 3 | `onboarding.spec.ts` | Fresh just-registered user completes onboarding: fill required profile fields → advance through optional steps → skip membership → skip booking → accept terms → land on `/home` | `freshUser` | Final URL is `/home`; `/profile/me` shows `onboardingCompletedAt` populated |
| 4 | `login.spec.ts` | Two cases in one file: (a) onboarded user logs in with correct creds → `/home`; (b) onboarded user logs in with wrong password → error banner, stays on `/login` | `onboardedUser` | `/home` landing + error copy visibility |
| 5 | `plans.spec.ts` | Onboarded user opens `/plans`, sees baseline seed plans (`Starter Monthly`, `Unlimited Monthly`), opens one plan detail | `onboardedUser` | Plan card and plan-detail render |
| 6 | `membership-purchase.spec.ts` | Onboarded user with no active membership selects `Starter Monthly` and purchases → `/membership` shows active membership card | `onboardedUser` | Post-purchase URL; active membership visible |
| 7 | `class-schedule.spec.ts` | Onboarded user opens `/schedule`, sees class instances for the current ISO week from baseline seed | `onboardedUser` | At least one instance visible per visible weekday in the baseline seed range |
| 8 | `class-booking.spec.ts` | Onboarded user with active membership books an instance from `/schedule` → appears in `/profile/bookings`; then cancels → no longer appears | `onboardedUser` + `api.purchasePlan()` precondition | Booking visible → cancelled → not visible |
| 9 | `personal-training.spec.ts` | Onboarded user with active membership opens `/training`, picks a trainer, selects an available slot ≥24h out, confirms booking → session appears on `/profile/bookings` (or PT sessions list) | `onboardedUser` + `api.purchasePlan()` precondition | PT session persisted and visible |
| 10 | `trainer-directory.spec.ts` | Onboarded user opens `/trainers`, sees all baseline trainers, opens one trainer profile | `onboardedUser` | List count ≥3, profile page renders |
| 11 | `profile-edit.spec.ts` | Onboarded user opens `/profile`, edits first name and phone, saves, reloads — change persists | `onboardedUser` | Post-reload field values equal edited values |
| 12 | `logout.spec.ts` | Two cases: (a) logged-in user logs out → lands on `/`, nav shows guest CTAs; (b) after logout, visiting `/home` redirects to `/login` | `onboardedUser` | Route guard redirect; auth store cleared |

### 4.2 Clean-slate project — serial, Approach C (`e2e/clean-slate/`)

Only one clean-slate scenario. If the clean-slate set grows beyond three specs over time, re-examine each addition to see if the premise can be met via `ApiClient` instead (rule from §7 Guardrail 7).

| # | File | Premise | Reset required because |
|---|------|---------|------------------------|
| 13 | `empty-state.spec.ts` | Immediately after `resetDatabase()`, a fresh user who completes registration and onboarding lands on `/home` and sees empty-state variants (no active classes, no trainers, no plans) without a crash | Baseline seed always provides plans / trainers / classes; only a full DROP + Flyway + empty-baseline run can guarantee the empty state. For this single spec, `resetDatabase()` skips re-applying `baseline.sql` and only re-runs Flyway migrations, leaving the DB at the post-migrate reference-data-free state. |

### 4.3 Explicitly deferred (out of scope for initial set)

Documented here so reviewers do not flag as missing:

- **Admin surface** — plan CRUD, class template CRUD, scheduler, PT-session admin, user detail, attendee list. Covered by backend unit tests and manual verification via the dev stack. May gain an `admin/` spec directory later.
- **Entity image management deep tests** (4 cases today) — subsumed by `profile-edit.spec.ts`, which uploads a photo as part of the edit flow; remove / replace / reject-invalid-type are deferred
- **Class-schedule filter & search permutations** (the 2 128-line current spec)
- **Membership-plan edge cases** — renewal, cancellation, double-purchase guard, plan-pending state
- **Booking edge cases** — late-cancellation window, already-cancelled, capacity-full, overlapping bookings
- **Password reset, email verification** — not in product scope
- **Visual regression / screenshot diffing**
- **Performance / load / accessibility scans**

New scenarios may be added later but each addition must have a concrete user-journey or incident-driven justification, not "while we're at it."

### 4.4 Baseline seed content (`e2e-seed/baseline.sql`)

The baseline seed is the minimum reference data all `default` project specs assume:
- 2 membership plans (names: `Starter Monthly`, `Unlimited Monthly`)
- 3 trainers — reused for both group-class and PT scenarios (no separate PT seed data required; PT availability is computed dynamically by `PtBookingService` from gym hours minus overlaps)
- 3 class templates (`HIIT Bootcamp`, `Yoga Flow`, `Spin Cycle`)
- 2 rooms (`Studio A`, `Studio B`)
- 10 class instances across the current ISO week Mon–Fri at 09:00 and 11:00 UTC

The seed does NOT create any member users. Tests create users via `ApiClient.registerUser()` or `ApiClient.registerUserAndCompleteOnboarding()`.

The seed uses `INSERT ... ON CONFLICT (id) DO NOTHING` throughout. Note: this protects against PK collisions only, not against `UNIQUE(name)` / `UNIQUE(email)` collisions. In practice this is safe because the seed is only applied on a freshly initialised schema or after `reset.sh` (which drops the schema first). TD-082 tracks tightening the comment or adding secondary conflict targets.

**No PT-specific seed rows.** PT booking reuses the baseline trainers. Because baseline class instances land at 09:00 and 11:00 UTC, PT specs pick a booking slot at 15:00 UTC tomorrow to avoid deterministic overlap with the group-class schedule.

---

## 5. Deletion Inventory (Step 3)

The following are deleted in the `chore/testing-reset-step-3` PR. Nothing is deleted before
the 13 greenfield scenarios from Step 2 are green in CI.

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
docs/bugs/   (all 20+ files)
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
in Step 3. Playwright is a dependency of `e2e/package.json` only after the reset.

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
removed in Step 3.

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

1. **Greenfield, no ports.** No test case, selector string, helper, or flow from `frontend/e2e/` is copied into `e2e/`. Step 2 writes the 13 scenarios from scratch against the new stack. This is intentional and non-negotiable: the old suite is the problem being solved, not the template.

2. **Green before delete.** Step 3 (deletion sweep) cannot begin until all 12 default-project scenarios and the 1 clean-slate scenario from Step 2 are green in CI.

3. **No shared-seed coupling (Lesson 6).** No spec may depend on the absence of data that the baseline seed provides. If a test premise requires "no X exists in the system", it belongs in `clean-slate/` with `resetDatabase()`.

4. **Rebuild discipline (Lesson 7).** `/verify` must always rebuild containers (`--build`) before running tests. This is enforced at the skill level. Manual invocations that skip `--build` are not supported and must not be documented as a valid workflow.

5. **Backend unit tests untouched.** No PR under this reset modifies any file under `backend/src/test/`. Backend tests are out of scope.

6. **No product behaviour changes.** No PR under this reset modifies any frontend component, backend controller, service, or migration. Infrastructure and test files only.

7. **One spec per scenario, filename matches the journey.** Spec file names match the journey slug listed in §4.1 — no catch-all or multi-feature spec files. A spec should have 1–3 test cases. If a scenario grows past 3 cases it is being scope-crept; split or prune.

8. **Hard limit: ≤3 clean-slate specs.** If more than 3 specs require `resetDatabase()`, re-examine whether the premise can instead be established via `ApiClient`. Only true empty-state scenarios qualify for `clean-slate/`. (Initial set is 1.)

9. **No `waitForTimeout` (Playwright anti-pattern).** Use `expect.poll`, `waitForResponse`, or explicit UI-state assertions. The old suite has multiple instances (tracked in TD-038); none may appear in the new suite.

10. **Admin flows are out of scope** for this reset. No admin spec, no admin method on `ApiClient`. If an admin-surface regression slips through, it must be caught by a backend unit test or manual verification — not a new admin E2E spec in this round.

---

## 8. Risks and Notes

### Assumptions

**A1.** The baseline seed is sufficient for all 12 default-project scenarios. Admin-only operations (create room, create class template, create trainer) are **not** exercised from within any test — the initial scenario set avoids this entirely. If a future scenario requires data the baseline does not contain, add it to `baseline.sql` rather than building admin helpers in `ApiClient`.

**A2.** The `GYMFLOW_TEST_SUPPORT_ENABLED` flag (already present in the current `docker-compose.e2e.yml` backend env) continues to control the `/test-support/e2e/cleanup` endpoint. The new design does not use that endpoint for per-test cleanup. It remains `"true"` in the e2e stack only, because `resetDatabase()`'s schema-drop approach may rely on test-support-gated routes in the future and because the flag is already part of the deployment contract for the e2e stack. The baseline cleanup strategy is: nightly `scripts/cleanup-test-users.sh` for long-running local volumes; CI volumes are ephemeral and do not need it.

**A3.** `docker-compose.dev.yml` retains the `demo-seeder` service and its `demo_seeder_data` volume. The `demo-seeder` is not modified by this reset.

**A4.** The Playwright image tag `mcr.microsoft.com/playwright:v1.58.2-jammy` is carried forward from the current `docker-compose.e2e.yml`. It must be updated to the version matching `e2e/package.json` when Step 2 sets the Playwright version in the new package.

**A5 (new — onboarding).** `ApiClient.registerUserAndCompleteOnboarding()` walks the real onboarding API (`PUT /api/v1/profile/me` with required fields → `POST /api/v1/onboarding/complete`). The exact payload shape and endpoint paths must match `docs/sdd/onboarding-flow.md` §API at the time Step 2 is written. If the onboarding API surface changes after this SDD is approved but before Step 2 is written, the helper must be updated before Step 2 opens a PR. This assumption is a deliberate alternative to adding a `/test-support/e2e/complete-onboarding` shortcut: walking the real flow gives onboarding implicit regression coverage on every spec that uses `onboardedUser`.

**A6 (new — class-booking API).** `ApiClient.cancelClassBooking()` uses the verb and path defined by `docs/sdd/class-booking-cancellation.md` §API. If that SDD is not yet consolidated when Step 2 begins, the helper author reads the current controller code to resolve the contract and records the resolution in the SDD (per the SDD Hygiene rule in CLAUDE.md).

**A7 (new — PT slot selection).** `personal-training.spec.ts` picks the first available slot at 15:00 UTC on `now + 24h` (rounded up to the nearest hour), rather than calling `GET /api/v1/trainers/pt/<id>/availability` and picking from the response. This is a simpler, deterministic path: baseline class instances land at 09:00 and 11:00 UTC, so 15:00 UTC on tomorrow's date is guaranteed to be open for any trainer. If baseline class schedule ever moves into the 14:00–16:00 UTC window, this assumption breaks — update the helper to query availability instead.

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