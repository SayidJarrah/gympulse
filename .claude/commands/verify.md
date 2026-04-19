Run the E2E suite against the **E2E stack** (`docker-compose.e2e.yml`).

> **Two stacks in this project:**
> - **Dev stack** (`docker-compose.dev.yml`) — ports 5432 / 8080 / 5173 / 3002 — for manual testing and PR review. Started by `/run`. Never run Playwright against this stack.
> - **E2E stack** (`docker-compose.e2e.yml`) — ports 5433 / 8081 / 5174 — Playwright target. Managed by this command. Uses a dedicated `gymflow_e2e` database and has `GYMFLOW_TEST_SUPPORT_ENABLED=true`.

The E2E suite lives at `e2e/` (top-level, outside `frontend/`). It has its own `package.json` and lockfile. Currently a single scenario: `onboarding-happy-path.spec.ts` — see `docs/sdd/testing-reset.md` §4.1.

## Run Suite

`--build` is non-negotiable (Lesson 7: rebuild before running tests).

```bash
# 1. Boot the E2E stack with fresh images
docker compose -f docker-compose.e2e.yml up -d --build

# 2. Wait for backend health (up to 60s)
for i in $(seq 1 12); do
  curl -sf http://localhost:8081/api/v1/health > /dev/null && break
  sleep 5
done

# 3. Install and run specs from the top-level e2e/ package
cd e2e
npm ci
E2E_BASE_URL=http://localhost:5174 npx playwright test
```

To run a single spec file:
```bash
cd e2e
E2E_BASE_URL=http://localhost:5174 npx playwright test specs/onboarding-happy-path.spec.ts
```

## After Code Changes

Rebuild the affected container before re-running. A stale bundle will mask fresh fixes (Lesson 7):

```bash
# Frontend change:
docker compose -f docker-compose.e2e.yml up -d --build frontend

# Backend change:
docker compose -f docker-compose.e2e.yml up -d --build --force-recreate backend
```

Confirm the container shows `Recreated` (not just `Running`) in the compose output.

## Report

**All pass:**
```
✅ N tests passed — suite clean.
```

**Failures:**
```
❌ N failures:
  - e2e/specs/{spec-name}.spec.ts — "{test name}"
  - ...
```

Report failures to the user. A reproducible failure becomes a new `test()` case in an existing or new spec — not a markdown bug brief.