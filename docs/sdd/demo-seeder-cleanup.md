# SDD: Demo Seeder — Cleanup

## Reference
- PRD: `docs/prd/demo-seeder-cleanup.md`
- Date: 2026-04-11

> **Implementation note:** This SDD documents the target state. The ADMIN_TOKEN auth gate on `POST /api/cleanup` is implemented in the same branch as this document — see `demo-seeder/src/server.ts`.

## Architecture Overview

The cleanup sub-feature is implemented in:
- `demo-seeder/src/server.ts` — `POST /api/cleanup` endpoint with auth gate
- `demo-seeder/src/cleanup.ts` — `runCleanup()` function

Cleanup is a destructive, transactional operation. It deletes all Postgres rows tracked in the current SQLite session, runs a safety-net sweep, then clears SQLite tracking.

---

## 1. Endpoint: POST /api/cleanup

Wipes all demo data from Postgres and resets the SQLite session.

**Authentication:** The request must include the header:
```
X-Admin-Token: <value of ADMIN_TOKEN env var>
```

**401 — missing or wrong token:**
```json
{ "error": "Unauthorized", "code": "INVALID_ADMIN_TOKEN" }
```

**409 — generation in progress:**
```json
{ "error": "Cannot cleanup while generation is in progress" }
```

**Response: 200**
```json
{
  "deletedClassInstances": 96,
  "deletedMemberships": 16,
  "deletedUsers": 20
}
```

The counts reflect rows actually deleted. If SQLite has no tracked IDs for a given entity type, the corresponding delete is skipped and the count is 0.

---

## 2. Cleanup Transaction

All deletes run inside a single Postgres transaction (`BEGIN` / `COMMIT` / `ROLLBACK` on error).

**Execution order (FK-safe):**

1. `DELETE FROM class_instances WHERE id = ANY($1::uuid[])` — cascades `class_instance_trainers` (FK with `ON DELETE CASCADE`)
2. `DELETE FROM user_memberships WHERE id = ANY($1::uuid[])`
3. `DELETE FROM users WHERE id = ANY($1::uuid[])` — cascades `user_profiles`, `user_trainer_favorites`

Each delete only runs when the corresponding tracked ID list is non-empty.

**Safety-net sweep (step 4, always runs):**
```sql
DELETE FROM users WHERE email LIKE 'demo.%@gym.demo' AND deleted_at IS NULL
```
This sweep runs unconditionally after the tracked-ID deletes, even when SQLite has no tracked users. It catches:
- Users created by a run that crashed before writing to SQLite
- Users from a previous run whose SQLite session was cleared manually

The safety-net does not return a count in the response body (tracked deletes are sufficient for operator feedback).

**On error:** The transaction rolls back entirely. `clearTracking()` is NOT called if the transaction fails — SQLite retains the tracked IDs so a retry is possible.

---

## 3. SQLite Reset

After a successful `COMMIT`, `clearTracking()` is called:
```sql
DELETE FROM demo_users;
DELETE FROM demo_memberships;
DELETE FROM demo_class_instances;
DELETE FROM seeder_meta;
```
This is executed as a single `db.exec()` call and is not wrapped in a Postgres transaction.

---

## 4. Environment Variables

| Var | Required | Description |
|-----|----------|-------------|
| `ADMIN_TOKEN` | Yes | Token value that must match the `X-Admin-Token` request header. Startup assertion — service refuses to start if absent. |
| `DB_*` | Yes | Postgres connection (see data-generation SDD) |

---

## 5. Security Decision

The cleanup endpoint is unauthenticated at the application level (no GymFlow JWT required) because the demo-seeder has no user accounts. The `ADMIN_TOKEN` env var provides a simple shared-secret gate sufficient for an internal operator tool accessible only within the Docker Compose network (or via an exposed port in dev stacks).

This trade-off is explicitly accepted. The demo-seeder is not intended to be publicly accessible.
