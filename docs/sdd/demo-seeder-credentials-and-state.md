# SDD: Demo Seeder — Credentials & State

## Reference
- PRD: `docs/prd/demo-seeder-credentials-and-state.md`
- Date: 2026-04-11

> **Implementation note:** This SDD documents the target state. The DEMO_PASSWORD env-var requirement is implemented in the same branch as this document — see `demo-seeder/src/server.ts` startup assertions.

## Architecture Overview

The credentials-and-state sub-feature is implemented in:
- `demo-seeder/src/server.ts` — three read endpoints
- `demo-seeder/src/state.ts` — `getState()` function combining SQLite + two Postgres queries
- `demo-seeder/src/db.ts` — `getDemoUsers()`, `hasDemoData()`, `getTrackedIds()` SQLite helpers

All endpoints are read-only. No writes to Postgres or SQLite occur in this sub-feature.

---

## 1. Endpoint: GET /api/state

Returns a dashboard summary combining SQLite session data and live Postgres counts.

**Response: 200**
```json
{
  "demoUsers": 20,
  "activeMemberships": 16,
  "classesThisWeek": 48,
  "totalClassInstances": 96,
  "hasData": true
}
```

| Field | Source | Notes |
|-------|--------|-------|
| `demoUsers` | SQLite `demo_users` row count | Only users from the current SQLite session |
| `activeMemberships` | Postgres: `COUNT(*) FROM user_memberships JOIN users WHERE email LIKE 'demo.%@gym.demo' AND status = 'ACTIVE' AND deleted_at IS NULL` | Counts active memberships for all demo-email users in Postgres, not filtered to SQLite session |
| `classesThisWeek` | Postgres: `COUNT(*) FROM class_instances WHERE status = 'SCHEDULED' AND scheduled_at in current UTC week` | **Counts ALL scheduled class instances this week, not only seeder-created ones.** If non-demo classes exist, this number will be higher than expected. This is a known limitation, documented as accepted. |
| `totalClassInstances` | SQLite `demo_class_instances` row count | Only instances from the current SQLite session |
| `hasData` | `demo_users.cnt > 0` in SQLite | True when at least one demo user is tracked |

**V18 dependency:** The `classesThisWeek` query requires the `status` column on `class_instances` (added by V18). If V18 has not been applied, this query will throw `column "status" does not exist` and `getState()` will propagate a 500 error. All supported stacks apply full Flyway migrations.

**Error: 500**
```json
{ "error": "Error: column \"status\" does not exist" }
```
(or similar Postgres error message — exposed as-is since this is an operator-only internal tool)

---

## 2. Endpoint: GET /api/credentials

Returns the list of demo users tracked in the current SQLite session.

**Response: 200**
```json
[
  {
    "id": "uuid",
    "email": "demo.jane.smith@gym.demo",
    "first_name": "Jane",
    "last_name": "Smith",
    "plan_name": "Monthly Unlimited"
  }
]
```

`plan_name` is `null` for users who did not receive a membership. The list is ordered by `first_name, last_name` (SQLite `ORDER BY`).

**Scope:** Returns only users tracked in the current SQLite session — not all `demo.%@gym.demo` rows in Postgres.

---

## 3. Endpoint: GET /api/credentials.csv

Returns credentials as a downloadable CSV file.

**Response headers:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="demo-credentials.csv"
```

**CSV format:**
```
email,password,membership_plan
demo.jane.smith@gym.demo,<DEMO_PASSWORD env var value>,Monthly Unlimited
demo.john.doe@gym.demo,<DEMO_PASSWORD env var value>,
```

The `password` column contains the value of the `DEMO_PASSWORD` environment variable at response time — not a hardcoded string. The `membership_plan` column is empty for users without a plan.

---

## 4. Dashboard UI Behaviour

The operator dashboard (`public/index.html`) uses these endpoints as follows:

| Behaviour | Implementation |
|-----------|---------------|
| Stat cards populate on load | `GET /api/state` called on `DOMContentLoaded` |
| State auto-refreshes | `setInterval(() => fetch('/api/state'), 10_000)` — every 10 seconds |
| Warning banner shown | When `state.hasData && state.demoUsers > 0` |
| Export CSV button hidden | Until `state.demoUsers > 0` (i.e. `hasData` is true) |
| Credentials list populated | `GET /api/credentials` called after successful generation |
| Copy-to-clipboard on email | Browser `navigator.clipboard.writeText(email)` |

---

## 5. Environment Variables

| Var | Required | Description |
|-----|----------|-------------|
| `DEMO_PASSWORD` | Yes | Value written into the CSV `password` column. Startup assertion — service refuses to start if absent. |
| `DB_*` | Yes | Postgres connection (see data-generation SDD) |
