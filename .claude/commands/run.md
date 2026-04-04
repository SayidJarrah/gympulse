Start the GymPulse stack with full health diagnostics.

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
```

If Docker is not running: **STOP.** Tell user to start Docker Desktop.
If compose file missing: **STOP.** File is required.
If a port is in use: identify the conflicting process, ask user before stopping it.

## Detect What Changed

```bash
git diff --name-only HEAD~1 HEAD 2>/dev/null || git status --short
```

| Changed files | Rebuild |
|---|---|
| `backend/**`, `*.gradle`, `*.sql` | Backend image only |
| `frontend/**` | Frontend image only |
| Both, or unsure | Both |

## Build

**Backend (if needed):**
```bash
docker-compose -f docker-compose.review.yml build backend
```
If fails with compilation error in code you just wrote: fix the code, retry.
If fails for any other reason: **STOP** and report the full error.

**Frontend (if needed):**
```bash
docker-compose -f docker-compose.review.yml build frontend
```
If fails with TypeScript error in code you just wrote: fix, retry.
If fails for any other reason: **STOP** and report the full error.

## Start

```bash
docker-compose -f docker-compose.review.yml down --remove-orphans
docker-compose -f docker-compose.review.yml up -d
```

## Health Wait (60s max)

```bash
for i in $(seq 1 12); do
  curl -sf http://localhost:8080/api/v1/health && echo " ✅ Backend healthy" && break || \
  (echo " ⏳ Not ready (attempt $i/12)..." && sleep 5)
done
```

## Failure Diagnosis

If health never returns after 60s:

```bash
docker-compose -f docker-compose.review.yml logs --tail=50 backend
docker-compose -f docker-compose.review.yml logs --tail=50 frontend
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

Do NOT attempt to fix infrastructure failures (Dockerfiles, compose files, env vars).
Report clearly and stop.

## Success

```
✅ Stack is running.
   Frontend: http://localhost:3000
   Backend:  http://localhost:8080
   API docs: http://localhost:8080/api/docs
```
