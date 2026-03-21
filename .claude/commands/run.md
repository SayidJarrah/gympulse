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


## Step 5b — Browser verification (if stack is healthy)
Use the e2e-tester agent to run through the key user flow for this feature.
Pass it: "Test the $ARGUMENTS feature. PRD is at docs/prd/$ARGUMENTS.md."

## Step 6 — Report

Print a summary:
- ✅ / ❌ Backend healthy (http://localhost:8080)
- ✅ / ❌ Frontend serving (http://localhost:3000)
- ✅ / ❌ Each smoke test result

If all green: "Stack is running. Open http://localhost:3000 to review manually."

If anything failed, classify the failure and say exactly what to run next:

**Gradle build failed** (Step 1 error):
"Build error — code issue. Invoke:
@backend-dev The bootJar build failed: [paste error]. Read docs/sdd/{feature}.md and fix."

**Frontend npm build failed** (Step 2 error):
"Build error — code issue. Invoke:
@frontend-dev The npm build failed: [paste error]. Fix it."

**Container built but won't stay healthy** — check logs first:
`docker-compose -f docker-compose.full.yml logs backend`

If the log shows a Spring exception (Flyway error, bean creation, NullPointer):
"App startup error — code issue. Invoke:
@backend-dev Spring Boot crashed on startup: [paste log]. Fix the issue."

If the log shows connection refused, missing env var, or port conflict:
"Infrastructure error — container config. Invoke:
@devops Backend container failing: [paste log]. Check docker-compose.full.yml."

**Frontend container unhealthy**:
`docker-compose -f docker-compose.full.yml logs frontend`
Nginx config issue → @devops. Build artefact missing → @frontend-dev.

Always paste the actual error into the agent message.
Agents cannot see what was printed here — they only know what you give them.