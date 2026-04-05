# Bug Brief: trainer-discovery — E2E stack backend fails to start (Flyway V5 checksum mismatch)

Date: 2026-04-05 19:15

## Failing Test
Spec: all specs in `frontend/e2e/` — E2E stack is required to run any spec
Test name: N/A — infrastructure failure prevents any test from running

## Failure
The E2E stack backend (`gympulse-e2e-backend-1`) exits immediately with:

```
FlywayValidateException: Validate failed: Migrations have failed validation
Migration checksum mismatch for migration version 5
-> Applied to database : 1241034472
-> Resolved locally    : 448048695
Either revert the changes to the migration, or run repair to update the schema history.
```

The E2E database contains a previously applied V5 migration whose checksum no longer matches the
current migration file on disk. The backend refuses to start until this is resolved.

## Steps to Reproduce
1. `docker compose -f docker-compose.e2e.yml up -d`
2. `docker logs gympulse-e2e-backend-1`
3. Observe: FlywayValidateException for migration version 5.

## Evidence
Console errors: `FlywayValidateException` — full trace in container logs
Network requests: none (backend never starts)

## Severity
Critical — the E2E stack is the only valid target for running automated Playwright specs.
No E2E tests can be executed until this is resolved. The review stack was used for the
manual walkthrough in this audit as a workaround.

## Files to Change
(leave blank — developer fills after root cause analysis)

## Proposed Fix
(leave blank — developer fills after root cause analysis)
