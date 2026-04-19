#!/usr/bin/env bash
# scripts/cleanup-test-users.sh
#
# Deletes test user rows (email ending in @test.gympulse.local) older than 24 hours
# from the E2E database. Run weekly on long-lived local environments where the E2E
# volume is never nuked between sessions.
#
# CI does not need this script — the E2E volume is either fresh per run or the suite
# creates fresh UUIDs that do not collide with prior runs.
#
# Usage: bash scripts/cleanup-test-users.sh
#        Must be run from the project root (where docker-compose.e2e.yml lives).

set -euo pipefail

COMPOSE_FILE="docker-compose.e2e.yml"

echo "[cleanup] Deleting test users older than 24h from gymflow_e2e..."

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U gymflow -d gymflow_e2e \
  -c "DELETE FROM users WHERE email LIKE '%@test.gympulse.local' AND created_at < NOW() - INTERVAL '24 hours';"

echo "[cleanup] Done."
