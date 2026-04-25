# PRD: Demo Seeder — Cleanup

## Overview
The cleanup sub-feature allows an operator to wipe all demo data from the GymFlow PostgreSQL database and reset the SQLite session tracking in a single authenticated, atomic operation. Cleanup deletes demo class instances, memberships, and users using the IDs tracked in SQLite, then runs a safety-net sweep to catch any untracked rows that match the demo email pattern — for example, rows left behind by a generation run that crashed before completing. The operation is protected by an `X-Admin-Token` header to prevent accidental or unauthorised wipes.

## User Roles
**Operator** — a sales or devops person with direct access to port 3001. The operator must supply a valid `X-Admin-Token` header whose value matches the `ADMIN_TOKEN` environment variable.

## User Stories

### Happy Path
- As an Operator, I want to click Cleanup and have all demo users, memberships, and class sessions removed from the database in one step, so that I can reset the portal between demos without manual SQL.
- As an Operator, I want the cleanup response to tell me exactly how many rows were deleted for each entity type, so that I can confirm the database is clean.

### Edge Cases
- As an Operator, when a generation run is in progress, I want the cleanup request to be rejected immediately, so that I cannot delete data that is actively being written.
- As an Operator, when I send a cleanup request without the correct admin token, I want to receive a 401 response, so that demo data cannot be wiped by an accidental browser request or an unauthorised party.
- As an Operator, when the database deletes fail partway through, I want the entire operation to roll back so that the database is not left in a partially deleted state.
- As an Operator, when a previous generation run crashed and left untracked rows in the database, I want cleanup to remove those rows too using the email pattern `demo.%@gym.demo`, so that no orphaned demo data lingers after cleanup.

## Acceptance Criteria

1. `POST /api/cleanup` received while `isGenerating` is `true` returns HTTP 409 with `{ "error": "Cannot cleanup while generation is in progress" }` and performs no database operations.
2. `POST /api/cleanup` without an `X-Admin-Token` header, or with a value that does not match the `ADMIN_TOKEN` environment variable, returns HTTP 401 and performs no database operations.
3. All deletions — class instances, memberships, users by tracked ID, and the safety-net email-pattern sweep — execute within a single Postgres transaction; if any statement raises an error, the transaction is rolled back and the error is returned as HTTP 500 with `{ "error": "<message>" }`.
4. The safety-net query `DELETE FROM users WHERE email LIKE 'demo.%@gym.demo' AND deleted_at IS NULL` always executes as part of the cleanup transaction, regardless of whether any tracked IDs exist in SQLite.
5. After a successful commit, all rows in the SQLite `demo_users`, `demo_memberships`, `demo_class_instances`, and `seeder_meta` tables are deleted, leaving the tracking database empty.
6. A successful cleanup response is HTTP 200 with a JSON body containing exactly three numeric fields: `deletedUsers`, `deletedMemberships`, and `deletedClassInstances`, each reflecting the actual Postgres `rowCount` for that delete statement.

## Out of Scope
- Selective cleanup (deleting only users, only classes, etc.).
- Soft-delete or archiving of demo data — cleanup is a hard delete.
- Cleanup of trainer or room records seeded by Flyway migrations.
- Any member-facing surface or application-level account for the operator.
- Test suite for the demo-seeder service itself.
- Production data management or migration tooling.

## Open Questions
None — all decisions are resolved.
