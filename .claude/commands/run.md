Start a stack with full health diagnostics. Two modes:

| Form | Mode | Stack | Ports | DB |
|---|---|---|---|---|
| `/run` | **dev** (default) | `docker-compose.dev.yml` — manual playground, demo data via `demo-seeder` | 5432 / 8080 / 5173 / 3002 | `gymflow` |
| `/run e2e` | **e2e** | `docker-compose.e2e.yml` — Playwright target, `GYMFLOW_TEST_SUPPORT_ENABLED=true` | 5433 / 8081 / 5174 | `gymflow_e2e` |

`--build` is non-negotiable in e2e mode (Lesson 7: never run Playwright against a stale
container). Dev mode rebuilds only what changed.

---

## Mode: dev (default)

Manual testing and PR review. Never run Playwright against this stack.

### Pre-flight Checks

```bash
docker info > /dev/null 2>&1 && echo "Docker: ✅" || echo "Docker: ❌ NOT RUNNING — start Docker Desktop first"
ls docker-compose.dev.yml > /dev/null 2>&1 && echo "Compose file: ✅" || echo "Compose file: ❌ MISSING"

lsof -i :8080 | grep LISTEN && echo "Port 8080: ❌ IN USE" || echo "Port 8080: ✅ free"
lsof -i :5173 | grep LISTEN && echo "Port 5173: ❌ IN USE" || echo "Port 5173: ✅ free"
lsof -i :3002 | grep LISTEN && echo "Port 3002: ❌ IN USE" || echo "Port 3002: ✅ free"
```

If Docker is not running: **STOP.** Tell the user to start Docker Desktop.
If the compose file is missing: **STOP.**
If a port is in use: identify the conflicting process and ask the user before stopping it.

### Staleness Check

If the stack is already running, check whether containers are older than the latest commit:

```bash
LAST_COMMIT=$(git log -1 --format=%ct)

CONTAINER_START=$(docker inspect --format='{{.State.StartedAt}}' gympulse-backend-1 gympulse-frontend-1 gympulse-demo-seeder-1 2>/dev/null \
  | sort | head -1 | xargs -I{} date -j -f "%Y-%m-%dT%H:%M:%S" "$(echo {} | cut -c1-19)" "+%s" 2>/dev/null \
  || echo 0)

[ "$LAST_COMMIT" -gt "$CONTAINER_START" ] && echo "STALE" || echo "FRESH"
```

- **STALE** — containers started before the last commit. Rebuild required. Proceed to *Detect What Changed*.
- **FRESH** — containers are up to date. Skip to *Health Wait* and report success.
- Containers not running at all → proceed to *Detect What Changed*.

### Detect What Changed

```bash
git diff --name-only HEAD~1 HEAD 2>/dev/null || git status --short
```

| Changed files | Rebuild |
|---|---|
| `backend/**`, `*.gradle`, `*.sql` | Backend image only |
| `frontend/**` | Frontend image only |
| `demo-seeder/**` | Demo-seeder image only |
| Multiple of the above, or unsure | All affected images |

### Build

**Backend (if needed):**
```bash
docker compose -f docker-compose.dev.yml build backend
```
Compilation error in code you just wrote → fix and retry. Any other error → **STOP** and report.

**Frontend (if needed):**
```bash
docker compose -f docker-compose.dev.yml build frontend
```
TypeScript error in code you just wrote → fix and retry. Any other error → **STOP** and report.

**Demo-seeder (if needed):**
```bash
docker compose -f docker-compose.dev.yml build demo-seeder
```
Any failure → **STOP** and report.

### Start

```bash
docker compose -f docker-compose.dev.yml down --remove-orphans
docker compose -f docker-compose.dev.yml up -d --build
```

### Health Wait (60s max)

**Backend:**
```bash
for i in $(seq 1 12); do
  curl -sf http://localhost:8080/api/v1/health && echo " ✅ Backend healthy" && break || \
  (echo " ⏳ Backend not ready (attempt $i/12)..." && sleep 5)
done
```

**Demo-seeder** (after backend passes):
```bash
for i in $(seq 1 12); do
  curl -sf http://localhost:3002/health && echo " ✅ Demo-seeder healthy" && break || \
  (echo " ⏳ Demo-seeder not ready (attempt $i/12)..." && sleep 5)
done
```

### Failure Diagnosis

If any health check never returns after 60s:

```bash
docker compose -f docker-compose.dev.yml logs --tail=50 backend
docker compose -f docker-compose.dev.yml logs --tail=50 frontend
docker compose -f docker-compose.dev.yml logs --tail=50 demo-seeder
```

| Log pattern | Classification | Recovery |
|---|---|---|
| `FlywayException`, `Unable to obtain connection` | Migration/DB | Check the latest `V{N}` migration |
| `BeanCreationException`, `NoSuchBeanDefinitionException` | Spring config | Check the bean name in config classes |
| `NullPointerException` at startup | Code | Report the full stack trace |
| `Connection refused` to postgres | DB not ready | Wait 10s, retry once |
| Missing environment variable | Env | Check `.env` |
| nginx `[error]` | Frontend config | Report the nginx error line |
| demo-seeder `ECONNREFUSED` / seed error | Seeder startup | Check demo-seeder logs |

Do NOT attempt to fix infrastructure failures (Dockerfiles, compose files, env vars).
Report clearly and stop.

### Success

```
✅ Dev stack is running.
   Frontend:     http://localhost:5173
   Backend:      http://localhost:8080
   API docs:     http://localhost:8080/api/docs
   Demo-seeder:  http://localhost:3002
```

---

## Mode: e2e

Playwright target. Boots the dedicated E2E stack with `--build` and runs the suite at
`e2e/specs/*.spec.ts`. Used by the tester agent inside `/deliver` and for ad-hoc
post-merge runs.

### Boot the E2E Stack

```bash
docker compose -f docker-compose.e2e.yml up -d --build

# Wait for backend health (up to 60s)
for i in $(seq 1 12); do
  curl -sf http://localhost:8081/api/v1/health > /dev/null && break
  sleep 5
done
```

### Run the Suite

```bash
cd e2e
npm ci
E2E_BASE_URL=http://localhost:5174 npx playwright test
```

Single spec:
```bash
cd e2e
E2E_BASE_URL=http://localhost:5174 npx playwright test specs/{spec-name}.spec.ts
```

### After Code Changes (during a fix loop)

Rebuild the affected container before re-running. A stale bundle masks fresh fixes
(Lesson 7):

```bash
# Frontend change:
docker compose -f docker-compose.e2e.yml up -d --build frontend

# Backend change:
docker compose -f docker-compose.e2e.yml up -d --build --force-recreate backend
```

Confirm the container shows `Recreated` (not just `Running`) in the compose output.

### Report

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

A reproducible failure becomes a new `test()` case in an existing or new spec — never a
markdown bug brief.
