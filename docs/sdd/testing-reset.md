# SDD: E2E Testing Strategy Reset

## Reference
- Brief: docs/briefs/testing-reset.md
- Date: 2026-04-13
- Revised: 2026-04-19a — greenfield scenario scope; 3-step migration; onboarding / PT / class-booking integrated; admin out of scope
- Revised: 2026-04-19b — **single-scenario scope**: one happy-path-onboarding spec, no `ApiClient`, no fixtures, no clean-slate project; full legacy-testing cleanup (docs, specs, skills, agents, commands, codex prompts, AGENTS.md) folded into Step 2; migration collapses to 2 steps

## Revision summary (2026-04-19b — current)

Step 1 of the original plan (scaffold + baseline seed + docs) is complete. When rebasing against `main` six days of product delivery had landed (onboarding wizard, personal-training booking, class-booking cancellation, landing / home / profile redesigns, `MemberNav`, favorites removal, design-system token extraction).

After reviewing the 13-scenario greenfield proposal from the first revision (2026-04-19a), scope was further reduced. Decisions for this revision:

1. **Single scenario only.** One spec — `onboarding-happy-path.spec.ts` — exercising: register via UI → redirect to `/onboarding` → walk the wizard with required profile + skip optional steps → accept terms → land on `/home`. Nothing else. New scenarios get added on demand, driven by incident or feature risk, not by pre-emptive coverage.
2. **Greenfield, still.** No test case, selector, helper, fixture, or flow is copied from `frontend/e2e/`. The old suite is the problem, not the template.
3. **No ApiClient, no fixtures, no helpers.** The single spec walks the UI end-to-end with no API setup calls. Infrastructure for helper layers is deliberately deferred until a second scenario creates real demand.
4. **Full legacy cleanup is in-scope for Step 2.** `frontend/e2e/`, `docs/qa/`, `docs/bugs/`, `docs/gaps/seeding-consolidation.md`, the `test-manifest` skill, and every reference in `.claude/` skills/commands/agents, `.codex/prompts/`, `frontend/AGENTS.md`, `backend/AGENTS.md`, and `CLAUDE.md` go away in the same PR as the new spec. No half-state where some config still points at retired paths.
5. **Admin out of scope** (unchanged).
6. **Migration collapses to 2 steps.** Scaffold (this PR, done) → cleanup + single spec + config sweep (one PR). Both steps sequenced; Step 2 cannot merge until the one spec is green.

The 2026-04-19a revision is retained below for historical context but **superseded by this revision** — §1, §3, §4, §5, §6, §7, §8 reflect 2026-04-19b.

Note on the brief: `docs/briefs/testing-reset.md` describes the original 11-spec / 3-5-clean-slate approach. The brief is a historical point-in-time record and is not retroactively edited. This SDD is authoritative when the two disagree.

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
- `docker-compose.e2e.yml` = Playwright target. Separate Postgres container with its own volume. No demo data; only a baseline seed.
- `e2e/` = top-level Playwright package with its own `package.json`. One project, one spec initially — see §4.
- Bugs become specs: a reproducible UI bug is added as a failing `test()` case that goes green once fixed. No markdown bug briefs under `docs/bugs/`.

---

## 1. Migration Plan

Two sequential PRs. Step 2 cannot merge until the single spec is green.

| Step | Branch | Scope |
|------|--------|-------|
| 1 | `chore/testing-reset-step-1` | Scaffold new stacks, baseline seed, SDD — **this PR** |
| 2 | `chore/testing-reset-step-2` | (a) Scaffold `e2e/` package. (b) Write and green the single `onboarding-happy-path.spec.ts`. (c) Delete all legacy testing surface: `frontend/e2e/`, `docs/qa/`, `docs/bugs/`, `docs/gaps/seeding-consolidation.md`, `test-manifest` skill. (d) Rewrite every reference in `.claude/skills/`, `.claude/commands/`, `.claude/agents/`, `.codex/prompts/`, `frontend/AGENTS.md`, `backend/AGENTS.md`, `CLAUDE.md`. All in one PR. |

**Ordering inside Step 2's PR.** The reviewer gate is: new spec green → then deletions + config edits. If the spec is not green, nothing else in Step 2 may merge. This protects against the failure mode where config references get updated but the replacement test does not actually run.

**Coverage gap during Steps 1→2.** Between Step 1 merge and Step 2 green there is effectively no automated E2E coverage — the old `frontend/e2e/` suite still exists but `/verify` has not been updated to target it reliably after the e2e compose file changed. The old suite can still be invoked manually via `cd frontend && npm run test:e2e` against the old `docker-compose.review.yml` (if it still exists locally), but is not required to be green for a feature merge during this window. Mitigation: fast execution of Step 2 (target: same week as Step 1 merge). In-progress product features rely on backend unit tests and manual verification in this window.

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
│   └── specs/
│       └── onboarding-happy-path.spec.ts
└── e2e-seed/
    ├── baseline.sql          # present from Step 1; unused by the single spec; retained for future scenarios
    └── reset.sh              # present from Step 1; unused by the single spec; retained for future scenarios
```

No `fixtures/`, no `helpers/`, no `clean-slate/`. They are not introduced until a second scenario creates real demand — at which point their design is the problem of that PR, not this one.

`e2e-seed/baseline.sql` and `e2e-seed/reset.sh` remain in the repo from Step 1. The single onboarding-happy-path spec does not read any baseline data (onboarding needs no pre-existing trainers, plans, or classes — the user skips the membership + booking steps). Baseline and reset are retained as already-landed infrastructure and will be exercised when a second scenario arrives.

The `e2e/` package is entirely outside `frontend/`. Playwright upgrades and `frontend/`
dependency changes are fully independent.

### 3.2 `e2e/playwright.config.ts` — one project

```
testDir: ./specs
workers: undefined  (Playwright default: half CPU cores; irrelevant with a single spec)
retries: 0
timeout: 30_000
reporter: [['html', { open: 'never' }], ['list']]
use:
  baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5174'
  screenshot: 'only-on-failure'
  trace: 'retain-on-failure'
```

No `projects` array, no `globalSetup`, no `globalTeardown`. The second-scenario PR may introduce projects if `clean-slate` or parallel vs serial splits become necessary.

### 3.3 Deferred infrastructure

`ApiClient`, shared fixtures (`test-user.ts`), `reset-db.ts`, `login.ts`, and `selectors.ts` are **not** part of Step 2. The single spec does not need them:

- It generates a unique email inline (`u-<uuid8>@test.gympulse.local`) via `crypto.randomUUID()`.
- It drives registration through the UI, not via `POST /api/v1/auth/register`, so no `APIRequestContext` is required.
- It walks the onboarding wizard through the UI, so no onboarding-completion helper is required.
- It asserts URLs and visible text via standard Playwright locators; no shared selector constants are needed for a single file.

When a second scenario is added later, that PR introduces whichever of these abstractions its spec actually needs. The shape proposed in the 2026-04-19a revision (full `ApiClient` with `registerUser` / `registerUserAndCompleteOnboarding` / `purchasePlan` / `bookClass` / `bookPtSession` etc.) is explicitly **not** locked in; the second-scenario PR is free to choose a different shape based on what it actually requires.

---

## 4. Scenario Inventory

**Total: 1 scenario.** Everything else is explicitly deferred.

### 4.1 The scenario — `onboarding-happy-path.spec.ts`

**Journey.** A brand-new user registers, completes the onboarding wizard on the happy path (required profile filled; optional steps skipped; terms accepted), and lands on `/home` as a fully onboarded member.

**Why this one.** Onboarding is the newest and most critical first-run flow in the product. It touches registration, the auth gate, the onboarding store, the profile API, the onboarding-complete API, and the route-guard redirect — if any of those break, a new user cannot enter the product at all. A single spec covering this end-to-end gives us a canary on the most fragile and most recently shipped surface.

**File:** `e2e/specs/onboarding-happy-path.spec.ts`

**Setup:** none. No fixtures, no API seeding. The test generates a unique email via `crypto.randomUUID()` with the `@test.gympulse.local` suffix (enforced inline in the test, not via a shared helper).

**Steps (UI-driven, end-to-end):**

1. `page.goto('/')` — landing page loads.
2. Click "Sign up" (or navigate directly to `/register` if the CTA selector is brittle; the spec picks the most stable of the two at Step 2 authoring time).
3. On `/register`, fill email + password + confirm password → submit.
4. **Assertion A:** URL becomes `/onboarding`.
5. Walk the wizard:
   a. Welcome step — click Continue / Next.
   b. Profile step — fill required fields: `firstName`, `lastName`, `phone` (`+15550100000` + a fragment of the unique suffix so the value is unique per run), `dateOfBirth` (`1995-01-01`). Skip all optional enrichment fields. Click Next.
   c. Preferences step — leave blank / skip. Click Next.
   d. Membership step — click Skip (do not select a plan).
   e. Booking step — should be hidden (only shown if a plan was selected). If visible, the test fails.
   f. Terms step — check "I agree" → click Finish / Complete.
6. **Assertion B:** URL becomes `/home`.
7. **Assertion C:** `/home` renders without a crash — at minimum the MemberNav is visible.

**Explicitly not asserted in this spec:**

- `GET /api/v1/profile/me` — no API introspection, no `onboardingCompletedAt` value check. The UI landing on `/home` under the existing route-guard logic is sufficient proof that the completion flag is set. A future spec may add the API-level assertion if onboarding-completion bugs recur.
- Backend error paths (duplicate email, invalid password, profile validation failures).
- Any content on `/home` beyond "page loaded, nav visible".
- Any onboarding resume behaviour, partial-state persistence, per-user store isolation.

**Expected duration:** under 30 seconds. If the spec takes longer than 30s in CI, investigate — it is probably waiting on something it should be asserting directly.

**Selectors:** The spec inlines its selectors (`getByRole`, `getByLabel`, `page.locator('[data-testid=...]')`). No `selectors.ts` helper is created. When the second scenario arrives, if two specs need the same selector, a helper is introduced at that point.

### 4.2 Explicitly deferred (out of scope for Step 2)

Documented so reviewers do not flag as missing:

- **All other user journeys** — login, registration edge cases, plans browse, membership purchase, class schedule, class booking, class cancellation, personal training, trainer directory, profile edit, logout, landing-page flows
- **Admin surface** — plan CRUD, class template CRUD, scheduler, PT-session admin, user detail, attendee list
- **Clean-slate / empty-state scenarios** — the `clean-slate` Playwright project and `reset-db.ts` helper are not introduced in Step 2
- **API-layer infrastructure** — `ApiClient`, shared fixtures, login helpers, selector constants
- **Error permutations** — duplicate email, wrong password, expired token, validation failures
- **Visual regression / screenshot diffing / performance / accessibility scans**

New scenarios may be added later — each addition must have a concrete user-journey or incident-driven justification, not "while we're at it." When the second scenario arrives, re-evaluate what shared infrastructure (fixtures, helpers, `ApiClient`) is justified.

### 4.3 Baseline seed content (`e2e-seed/baseline.sql`)

Unchanged from Step 1. The single onboarding-happy-path spec does not read any baseline data — it skips the membership and booking steps. The seed is retained for future scenarios:

- 2 membership plans (names: `Starter Monthly`, `Unlimited Monthly`)
- 3 trainers
- 3 class templates (`HIIT Bootcamp`, `Yoga Flow`, `Spin Cycle`)
- 2 rooms (`Studio A`, `Studio B`)
- 10 class instances across the current ISO week Mon–Fri at 09:00 and 11:00 UTC

The seed uses `INSERT ... ON CONFLICT (id) DO NOTHING` throughout. TD-082 tracks tightening the idempotency comment.

---

## 5. Deletion Inventory (Step 2)

Everything in this section is deleted or edited in the Step 2 PR. Ordering within that PR: the new `onboarding-happy-path.spec.ts` is green in CI before any deletion or config edit is applied.

### 5.1 Files and directories to delete outright

**Old E2E package:**
```
frontend/e2e/                           (whole directory — 10 specs + global-setup + global-teardown if present)
frontend/playwright.config.ts
```

**QA docs:**
```
docs/qa/                                (whole directory — test-manifest.md, e2e-flow-coverage.csv, e2e-test-cases-catalog.md, seed-users.md, e2e-flow-coverage-process.md)
```

**Bug docs:**
```
docs/bugs/                              (whole directory — all 20+ files)
```

**Gap doc:**
```
docs/gaps/seeding-consolidation.md
```

The `docs/gaps/` directory is NOT deleted as a whole — other gap reports (auth, member-home, landing-page, etc.) remain for now as historical records.

**Old compose file:**
```
docker-compose.review.yml
```

(`docker-compose.dev.yml` replaces it; the review file is explicitly removed rather than left orphaned, because several `.claude/commands/*` still reference it by name and the deletion keeps those references from reintroducing stale paths.)

**Skill:**
```
.claude/skills/test-manifest/           (whole directory — SKILL.md)
```

### 5.2 Files to edit (references to retired paths)

Every file below contains at least one reference to `frontend/e2e/`, `docs/bugs/`, `docs/qa/`, `test-manifest`, or `docker-compose.review.yml`. Each must be rewritten to point at `e2e/specs/`, the new testing regime (no `docs/bugs/`, no `docs/qa/`), or `docker-compose.dev.yml` as appropriate. If the section that contains the reference becomes obsolete, remove the section entirely rather than leaving a dangling hint.

**Claude configuration (`.claude/`):**
```
.claude/skills/deliver/SKILL.md          (one test-manifest reference on line ~239)
.claude/commands/run.md                  (many docker-compose.review.yml references)
.claude/commands/verify.md               (docker-compose.review.yml + frontend/e2e + test-manifest)
.claude/commands/deliver.md              (test-manifest + docs/bugs + frontend/e2e + docs/qa)
.claude/commands/audit.md                (test-manifest)
.claude/commands/status.md               (frontend/e2e path check)
.claude/agents/tester.md                 (review/e2e stack table, frontend/e2e specs, docs/bugs, test-manifest)
.claude/agents/developer.md              (docs/bugs bug brief workflow)
.claude/agents/reviewer.md               (docs/bugs escalation path)
.claude/agents/solution-architect.md     (docs/bugs architect review append)
```

**Codex prompts (`.codex/`):**
```
.codex/prompts/run.md
.codex/prompts/verify.md
.codex/prompts/implement.md
```

**Project-level agent configs:**
```
frontend/AGENTS.md                       (references to frontend/e2e and test layout)
backend/AGENTS.md                        (same)
```

**Top-level docs:**
```
CLAUDE.md                                (docs/qa reference in Project Structure tree; docs/bugs if present; frontend/src/e2e in the Project Structure tree (already inaccurate — e2e directory is top-level-adjacent, not under src))
```

`docs/lessons.md` is NOT edited. Lesson 6 references `global-setup.ts` as the incident that produced the rule — rewriting that reference would erase the historical anchor. The rule itself remains correct for the new regime.

Historical review docs (`docs/reviews/*.md`), historical briefs (`docs/briefs/*.md`), and historical TD entries referencing `frontend/e2e` spec paths are NOT edited. They are point-in-time records.

### 5.3 Frontend `package.json`

Step 2 removes:
- `test:e2e` script
- `@playwright/test` dev dependency

Playwright lives in `e2e/package.json` after Step 2.

### 5.4 Positive edits (not deletions)

`CLAUDE.md` gains a new **Testing** section with the single-scenario regime documented (see §6.5 below for exact content). `/run`, `/verify`, `/deliver`, and the agent configs are rewritten, not just stripped of references — they must describe the current (post-reset) regime or be removed entirely when they have no remaining content.

---

## 6. Skill, Command, Agent, and Codex-Prompt Changes

All edits in this section are part of the Step 2 PR.

### 6.1 `/run` command (`.claude/commands/run.md`, `.codex/prompts/run.md`)

**Current behaviour:** `docker compose -f docker-compose.review.yml up -d` + health check.

**New behaviour:** `docker compose -f docker-compose.dev.yml up -d` + health check.

Every string `docker-compose.review.yml` in the file is rewritten to `docker-compose.dev.yml`. Descriptions that call it "the review stack" are rewritten to "the dev stack". Nothing else changes in the health-check logic.

### 6.2 `/verify` command (`.claude/commands/verify.md`, `.codex/prompts/verify.md`)

**Current behaviour:** e2e stack up (without `--build`) + Playwright via `npm run test:e2e` in `frontend/`.

**New behaviour:**
```
docker compose -f docker-compose.e2e.yml up -d --build
# wait for all services healthy
cd e2e && npm ci && npx playwright test
```

No `--project` subcommand exists yet (only one project). No `--spec` subcommand needs to be documented yet (only one spec). These may be added when the second scenario lands.

The `--build` flag is non-negotiable (codifies Lesson 7: rebuild before running tests).

All references to `frontend/e2e/` in the verify command are removed. All references to `docker-compose.review.yml` (from cross-linking) are rewritten to `docker-compose.dev.yml`.

### 6.3 `/deliver` command (`.claude/commands/deliver.md`)

Strip every reference to:
- `test-manifest` skill
- `docs/qa/test-manifest.md`
- `docs/bugs/` bug-brief workflow
- `frontend/e2e/{feature}.spec.ts` path template

Replace the old Tester stage with: "Write `e2e/specs/{feature}.spec.ts` covering the **primary happy path for this feature — one user journey**. Do not mirror every AC. If a bug surfaces during delivery and is reproducible in the UI, add a second spec (or a second `test()` block in the same file) asserting the regression. No markdown bug briefs."

### 6.4 `/audit` command (`.claude/commands/audit.md`)

Strip the `test-manifest` skill load. The audit command reads the feature's PRD / SDD / design handoff and compares against the running stack; it no longer produces bug briefs under `docs/bugs/`. Gaps that require a regression test are written directly as failing `e2e/specs/` entries.

### 6.5 `/status` command (`.claude/commands/status.md`)

Rewrite the `Tests:` check. Current logic reads `ls frontend/e2e/$SLUG.spec.ts`. New logic reads `ls e2e/specs/$SLUG.spec.ts` (or a variant matching the file naming the Step 2 author picks, e.g. `onboarding-happy-path.spec.ts` does not match a feature slug).

Given that the new suite is intentionally thin and file names may not match SDD slugs 1:1, the Step 2 author may simplify the `Tests:` check to `ls e2e/specs/` (report presence of any spec) rather than per-feature.

### 6.6 `test-manifest` skill

Deleted entirely. The `.claude/skills/test-manifest/` directory is removed in Step 2. Any skill/command/agent file that loads or references `test-manifest` has that load removed.

### 6.7 Agent configs (`.claude/agents/`)

- **tester.md** — rewrite. Drop the stack-comparison table (only one dev stack and one e2e stack remain). Drop the bug-brief workflow. New responsibility: "Write `e2e/specs/{feature}.spec.ts` for the feature being delivered — one happy-path test. Report failures in-conversation; do not author markdown bug briefs."
- **developer.md** — remove the `docs/bugs/` bug-brief consumption flow. If the section has no remaining content, remove it.
- **reviewer.md** — remove the `docs/bugs/` escalation path. Escalations that require structural rework now open a comment on the PR or produce an SDD revision, not a bug file.
- **solution-architect.md** — remove the "append Architect Review to the bug brief" step. SA reviews happen inline on the PR or in the SDD.

### 6.8 Project AGENTS files

- **frontend/AGENTS.md** — remove any instruction pointing to `frontend/e2e/`. Replace with a one-line pointer: "E2E specs live at `e2e/specs/` at the repo root. Playwright runs via `/verify`."
- **backend/AGENTS.md** — same one-line pointer if it contains any test-location instructions.

### 6.9 CLAUDE.md changes

**Remove from Project Structure tree:**
- `frontend/src/e2e/` (this entry is already inaccurate — Playwright specs live in `frontend/e2e/`, not `src/e2e/`; the replacement points at the new location regardless)
- The `qa/` subdirectory under `docs/`

**Add to Project Structure tree:**
- `e2e/` at the top level with `specs/` subdirectory
- `e2e-seed/` at the top level

**Remove from the Project Structure tree's `docs/` section:**
- `bugs/` subdirectory (it is not in the current tree listing; only remove if present)

**Add a new top-level section: Testing**

```
## Testing

**Two stacks:**
- `docker-compose.dev.yml` — manual playground. Start with `/run`. Rich demo data via `demo-seeder`. Never run Playwright against this stack.
- `docker-compose.e2e.yml` — Playwright target. Started automatically by `/verify` with `--build`. Baseline reference data via `e2e-seed/baseline.sql`; no demo users.

**Where specs live:** `e2e/specs/*.spec.ts` at the repo root. `frontend/e2e/` does not exist after this reset.

**What is tested:** one happy-path scenario per feature, added on demand. No error-permutation fans, no visual regression, no admin E2E. The current suite is intentionally thin; see `docs/sdd/testing-reset.md` §4 for scope.

**Rules:**
- All test emails end with `@test.gympulse.local`. Unique per test via `crypto.randomUUID()`.
- `/verify` always passes `--build`. Never run the suite against a stale container (Lesson 7).
- No `waitForTimeout`. Use `expect.poll`, `waitForResponse`, or direct UI-state assertions.
- No markdown bug docs. A bug reproducible in the UI becomes a `test()` case that fails before the fix and passes after.
```

**MCP table update:**
- Postgres MCP defaults to dev DB (`:5432`). For E2E DB inspection during debugging, connect to `:5433`.

---

## 7. Guardrails

These rules apply to every PR under this reset. They are not negotiable.

1. **Greenfield, no ports.** No test case, selector string, helper, or flow from `frontend/e2e/` is copied into `e2e/`. Step 2 writes the single spec from scratch against the new stack. Non-negotiable.

2. **Green before delete.** The new `onboarding-happy-path.spec.ts` must be green in CI before any deletion or config edit in the Step 2 PR may merge. If the spec does not pass, the whole PR is blocked.

3. **Rebuild discipline (Lesson 7).** `/verify` must always rebuild containers (`--build`). Enforced at the command level.

4. **Backend unit tests untouched.** No PR under this reset modifies any file under `backend/src/test/`.

5. **No product behaviour changes.** No frontend component, backend controller, service, or Flyway migration is modified by Step 2. Infrastructure and test files only.

6. **One file, one scenario.** Step 2 ships exactly one spec file with exactly one happy-path journey. Multi-case specs, setup/teardown fans, and error permutations are prohibited in the initial delivery.

7. **No `waitForTimeout`** (Playwright anti-pattern). Use `expect.poll`, `waitForResponse`, or direct UI-state assertions.

8. **Admin flows out of scope.** No admin spec. Backend unit tests + manual verification.

9. **No API setup shortcuts.** The single spec walks UI end-to-end. It does not call `POST /api/v1/auth/register` directly, does not hit `/test-support/*`, does not read the DB. Any later scenario that wants an API shortcut must justify the shortcut on its own merits.

10. **Full-cleanup cutover.** Step 2's PR cannot half-land. If any legacy reference (to `frontend/e2e/`, `docs/qa/`, `docs/bugs/`, `test-manifest`, `docker-compose.review.yml`) remains in the `.claude/` tree, `.codex/` tree, `CLAUDE.md`, `frontend/AGENTS.md`, or `backend/AGENTS.md` after Step 2 merges, the PR is not done. Reviewer must grep for these five strings before approval.

---

## 8. Risks and Notes

### Assumptions

**A1.** The onboarding UI flow matches `docs/sdd/onboarding-flow.md` at Step 2 authoring time — specifically: Welcome → Profile (required: firstName, lastName, phone, dateOfBirth) → Preferences (optional, skippable) → Membership (skippable) → Booking (only shown when a plan is selected) → Terms. If the wizard structure changes between this SDD's approval and Step 2 authoring, the spec's step sequence must be updated accordingly. The handoff at `docs/design-system/handoffs/onboarding-flow/README.md` is the visual source of truth.

**A2.** The `GYMFLOW_TEST_SUPPORT_ENABLED` flag remains `"true"` in the e2e stack, unused by this single-spec delivery. It is kept because `e2e-seed/reset.sh` (retained from Step 1) and any future clean-slate scenarios may require test-support endpoints. The baseline cleanup strategy is nightly `scripts/cleanup-test-users.sh` for long-running local volumes; CI volumes are ephemeral and do not need it.

**A3.** `docker-compose.dev.yml` retains the `demo-seeder` service and its `demo_seeder_data` volume. Unchanged by this reset.

**A4.** The Playwright image tag `mcr.microsoft.com/playwright:v1.58.2-jammy` is carried forward from Step 1. It must be updated to match `e2e/package.json` when Step 2 sets the Playwright version.

**A5.** The registration form at `/register` has stable labels/roles for email, password, confirm-password fields and a submit button. The Step 2 author picks the most stable selector strategy at authoring time — accessible-name queries (`getByRole`, `getByLabel`) are preferred; `data-testid` is a fallback if the form has them. If the form lacks stable selectors, the Step 2 author coordinates with the UI owner to add `data-testid` attributes rather than committing a flaky spec. This is a productised cost of the greenfield approach: selectors are designed alongside the test, not inherited.

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