#!/usr/bin/env bash
# e2e-seed/reset.sh
#
# Full E2E database reset: drop schema, re-run Flyway migrations, apply baseline seed.
# Used by the clean-slate Playwright project's resetDatabase() fixture.
#
# Usage: bash e2e-seed/reset.sh
#        Must be run from the project root (where docker-compose.e2e.yml lives).

set -euo pipefail

COMPOSE_FILE="docker-compose.e2e.yml"
BACKEND_HEALTH_URL="http://localhost:8081/api/v1/health"
MAX_WAIT_SECONDS=60
POLL_INTERVAL=2

echo "[reset] Dropping public schema in gymflow_e2e..."
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U gymflow -d gymflow_e2e \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "[reset] Restarting backend (Flyway will re-run all migrations on boot)..."
docker compose -f "$COMPOSE_FILE" restart backend

echo "[reset] Waiting for backend to become healthy (up to ${MAX_WAIT_SECONDS}s)..."
elapsed=0
until curl -sf "$BACKEND_HEALTH_URL" > /dev/null 2>&1; do
  if [ "$elapsed" -ge "$MAX_WAIT_SECONDS" ]; then
    echo "[reset] ERROR: backend did not become healthy within ${MAX_WAIT_SECONDS}s" >&2
    exit 1
  fi
  sleep "$POLL_INTERVAL"
  elapsed=$((elapsed + POLL_INTERVAL))
done
echo "[reset] Backend is healthy."

echo "[reset] Applying baseline seed..."
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U gymflow -d gymflow_e2e \
  -f /docker-entrypoint-initdb.d/02-baseline.sql

echo "[reset] Done. Database is in clean-slate state with baseline seed applied."
