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
for i in $(seq 1 12); do curl -sf http://localhost:8080/api/v1/health && break || sleep 5; done
````
If still not healthy after 60s, run `docker-compose -f docker-compose.full.yml logs backend`
and report the last 30 lines.

## Step 5 — Report

If the stack reached a healthy state in Step 4:
"Stack is running. Open http://localhost:3000 to review manually.
Run /verify $ARGUMENTS to run smoke tests and the E2E suite.
E2E tests run inside Docker: docker-compose -f docker-compose.full.yml run --rm playwright"

If the stack did not reach a healthy state, classify the failure and say what
to run next:

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