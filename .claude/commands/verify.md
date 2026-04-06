Run the full E2E suite against the **E2E stack** (`docker-compose.e2e.yml`).

> **Two stacks in this project:**
> - **Review stack** (`docker-compose.review.yml`) — ports 5432 / 8080 / 3000 — for manual testing and PR review. Started by `/run`.
> - **E2E stack** (`docker-compose.e2e.yml`) — ports 5433 / 8081 / 3001 — for automated tests only. Uses a dedicated `gymflow_e2e` database and has `GYMFLOW_TEST_SUPPORT_ENABLED=true`. **Self-starting** — no need to run `/run` first.

## Run Suite

The E2E stack starts its own services (postgres → backend → frontend) automatically before running tests.

```bash
docker compose -f docker-compose.e2e.yml run --rm playwright
```

### Running a single spec directly on the host

If running `npx playwright test` directly (not via Docker), the host machine may also have the **review stack** running on the default ports (8080 / 3000). Always pass the E2E stack ports explicitly:

```bash
cd frontend
E2E_BASE_URL=http://localhost:3001 E2E_API_BASE=http://localhost:8081/api/v1 \
  npx playwright test e2e/{feature}.spec.ts --reporter=list
```

### After code changes — rebuild before re-running

After any source-code change, rebuild the affected container before re-running tests or results will reflect the old bundle:

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
  - frontend/e2e/{feature}.spec.ts — "{test name}"
  - ...

Invoke the tester agent to investigate and write bug briefs.
```

Do not investigate or fix anything here. Tester handles investigation.
