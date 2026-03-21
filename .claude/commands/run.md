Build and run the full GymFlow stack in Docker, then verify the feature works.

Feature to verify (optional): $ARGUMENTS

## Pre-flight checks
1. Confirm Docker is running: `docker info`
2. Confirm docker-compose.full.yml exists — if not, tell the user to run
   `@devops Write docker-compose.full.yml and Dockerfiles for backend and frontend`
   and stop here.

## Step 1 — Build backend image
````bash
cd backend && ./gradlew bootJar
docker build -t gymflow-backend:local ./backend
````
If the build fails, report the error and stop. Do not continue to frontend.

## Step 2 — Build frontend image
````bash
docker build -t gymflow-frontend:local ./frontend
````
If the build fails, report the error and stop.

## Step 3 — Start full stack
````bash
docker-compose -f docker-compose.full.yml down --remove-orphans
docker-compose -f docker-compose.full.yml up -d
````

## Step 4 — Wait for services to be healthy
Poll the backend health endpoint until it responds or 60 seconds pass:
````bash
for i in $(seq 1 12); do
  curl -sf http://localhost:8080/api/v1/health && break || sleep 5
done
````
If still not healthy after 60s, run `docker-compose -f docker-compose.full.yml logs backend`
and report the last 30 lines.

## Step 5 — Smoke tests
Run these regardless of whether $ARGUMENTS was provided:
````bash
# Health check
curl -s http://localhost:8080/api/v1/health

# Frontend loads
curl -sf http://localhost:3000 -o /dev/null -w "%{http_code}"
````

If $ARGUMENTS names a specific feature, also run the relevant curl checks
from the SDD at docs/sdd/$ARGUMENTS.md (the example requests in the API
contract section). Use a test user if auth is required.

## Step 6 — Report
Print a summary:
- ✅ / ❌ Backend healthy (http://localhost:8080)
- ✅ / ❌ Frontend serving (http://localhost:3000)
- ✅ / ❌ Each smoke test result
- Any errors with the relevant log lines
- If all green: "Stack is running. Open http://localhost:3000 to review manually."