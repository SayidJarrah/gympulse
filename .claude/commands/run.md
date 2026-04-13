Start the **review stack** (`docker-compose.review.yml`) with full health diagnostics.

> **Review stack only** — ports 5432 / 8080 / 3000 / 3002 — for manual testing and PR review.
> For E2E tests use `/verify`, which manages its own dedicated E2E stack on ports 5433 / 8081 / 3001.

## Pre-flight Checks

Run all checks before touching Docker:

```bash
# Docker running?
docker info > /dev/null 2>&1 && echo "Docker: ✅" || echo "Docker: ❌ NOT RUNNING — start Docker Desktop first"

# Compose file exists?
ls docker-compose.review.yml > /dev/null 2>&1 && echo "Compose file: ✅" || echo "Compose file: ❌ MISSING"

# Ports free?
lsof -i :8080 | grep LISTEN && echo "Port 8080: ❌ IN USE" || echo "Port 8080: ✅ free"
lsof -i :3000 | grep LISTEN && echo "Port 3000: ❌ IN USE" || echo "Port 3000: ✅ free"
lsof -i :3002 | grep LISTEN && echo "Port 3002: ❌ IN USE" || echo "Port 3002: ✅ free"
```

If Docker is not running: **STOP.** Tell user to start Docker Desktop.
If compose file missing: **STOP.** File is required.
If a port is in use: identify the conflicting process, ask user before stopping it.

## Staleness Check

If the stack is already running, check whether the containers are older than the latest commit:

```bash
# Last git commit time (Unix timestamp)
LAST_COMMIT=$(git log -1 --format=%ct)

# Earliest container start time among backend, frontend, and demo-seeder
CONTAINER_START=$(docker inspect --format='{{.State.StartedAt}}' gympulse-backend-1 gympulse-frontend-1 gympulse-demo-seeder-1 2>/dev/null \
  | sort | head -1 | xargs -I{} date -j -f "%Y-%m-%dT%H:%M:%S" "$(echo {} | cut -c1-19)" "+%s" 2>/dev/null \
  || echo 0)

[ "$LAST_COMMIT" -gt "$CONTAINER_START" ] && echo "STALE" || echo "FRESH"
```

- **STALE** — containers started before the last commit. Rebuild required. Proceed to **Detect What Changed**.
- **FRESH** — containers are up to date. Skip to **Health Wait** to confirm the stack is healthy, then report success.
- If containers are not running at all, proceed to **Detect What Changed**.

## Detect What Changed

```bash
git diff --name-only HEAD~1 HEAD 2>/dev/null || git status --short
```

| Changed files | Rebuild |
|---|---|
| `backend/**`, `*.gradle`, `*.sql` | Backend image only |
| `frontend/**` | Frontend image only |
| `demo-seeder/**` | Demo-seeder image only |
| Multiple of the above, or unsure | All affected images |

## Build

**Backend (if needed):**
```bash
docker compose -f docker-compose.review.yml build backend
```
If fails with compilation error in code you just wrote: fix the code, retry.
If fails for any other reason: **STOP** and report the full error.

**Frontend (if needed):**
```bash
docker compose -f docker-compose.review.yml build frontend
```
If fails with TypeScript error in code you just wrote: fix, retry.
If fails for any other reason: **STOP** and report the full error.

**Demo-seeder (if needed):**
```bash
docker compose -f docker-compose.review.yml build demo-seeder
```
If fails for any reason: **STOP** and report the full error.

## Start

```bash
docker compose -f docker-compose.review.yml down --remove-orphans
docker compose -f docker-compose.review.yml up -d
```

## Health Wait (60s max)

**Backend:**
```bash
for i in $(seq 1 12); do
  curl -sf http://localhost:8080/api/v1/health && echo " ✅ Backend healthy" && break || \
  (echo " ⏳ Backend not ready (attempt $i/12)..." && sleep 5)
done
```

**Demo-seeder** (wait for backend to pass first):
```bash
for i in $(seq 1 12); do
  curl -sf http://localhost:3002/health && echo " ✅ Demo-seeder healthy" && break || \
  (echo " ⏳ Demo-seeder not ready (attempt $i/12)..." && sleep 5)
done
```

## Failure Diagnosis

If any health check never returns after 60s:

```bash
docker compose -f docker-compose.review.yml logs --tail=50 backend
docker compose -f docker-compose.review.yml logs --tail=50 frontend
docker compose -f docker-compose.review.yml logs --tail=50 demo-seeder
```

Classify and respond:

| Log pattern | Classification | Recovery |
|---|---|---|
| `FlywayException`, `Unable to obtain connection` | Migration/DB issue | Check the latest V{N} migration file |
| `BeanCreationException`, `NoSuchBeanDefinitionException` | Spring config issue | Check the bean name in config classes |
| `NullPointerException` at startup | Code issue | Report full stack trace |
| `Connection refused` to postgres | DB not ready | Wait 10s, retry once |
| Missing environment variable | Env issue | Check .env file |
| nginx `[error]` | Frontend config | Report nginx error line |
| demo-seeder `ECONNREFUSED` / seed error | Seeder startup issue | Check demo-seeder logs for seed script errors |

Do NOT attempt to fix infrastructure failures (Dockerfiles, compose files, env vars).
Report clearly and stop.

## Success

```
✅ Stack is running.
   Frontend:     http://localhost:3000
   Backend:      http://localhost:8080
   API docs:     http://localhost:8080/api/docs
   Demo-seeder:  http://localhost:3002
```
