# PRD: Demo Seeder — Credentials & State

## Overview
The credentials and state sub-feature gives the operator real-time visibility into what demo data currently exists in the database and provides two ways to retrieve demo account credentials: a browsable in-dashboard list and a downloadable CSV file. The dashboard polls the state endpoint every 10 seconds and warns the operator when pre-existing demo data would be overwritten by a new generation run. This sub-feature is entirely read-only with respect to the GymFlow database.

## User Roles
**Operator** — a sales or devops person with direct access to port 3001. No application-level authentication is required to read state or credentials.

## User Stories

### Happy Path
- As an Operator, I want the dashboard to show me how many demo users, active memberships, classes this week, and total class sessions exist, so that I can confirm the demo environment is ready before a customer call.
- As an Operator, I want to see a list of every demo account's name, email, and plan in the dashboard, so that I can quickly log in as a specific persona during the demo.
- As an Operator, I want to download all demo credentials as a CSV file, so that I can share them with a colleague who will run the demo.

### Edge Cases
- As an Operator, when I open the dashboard and demo data already exists from a previous run, I want to see a warning banner with the existing counts, so that I do not accidentally generate a second dataset on top of the first.
- As an Operator, when no demo data has been generated yet, I want the Export CSV button to be hidden, so that I am not offered a download that would produce an empty file.

## Acceptance Criteria

1. `GET /api/state` returns a JSON object with exactly four numeric fields — `demoUsers`, `activeMemberships`, `classesThisWeek`, `totalClassInstances` — and a boolean `hasData` field; the values must reflect current database and SQLite state at the moment of the request.
2. `GET /api/credentials` returns a JSON array of objects, one per demo user tracked in the current SQLite session, each containing at minimum `id`, `email`, `first_name`, `last_name`, and `plan_name` (nullable); the response contains only users from the SQLite session, not every `demo.%@gym.demo` email in Postgres.
3. `GET /api/credentials.csv` responds with `Content-Type: text/csv`, a `Content-Disposition: attachment; filename="demo-credentials.csv"` header, and a body whose rows contain `email`, `password`, and `membership_plan` columns — one header row followed by one data row per demo user; the password column value is the value of the `DEMO_PASSWORD` environment variable, not a hardcoded string.
4. When the dashboard loads (and every 10 seconds thereafter) and `hasData` is `true` and `demoUsers > 0`, a warning banner is displayed stating the existing user, membership, and class session counts; the banner is hidden when no demo data exists.
5. The "Export credentials CSV" button in the dashboard header is hidden on page load and becomes visible only after `GET /api/credentials` returns a non-empty array.

## Out of Scope
- Writing or modifying any data via this sub-feature.
- Authentication or access control on the state or credentials endpoints.
- Paginating the credentials list (the maximum 50 users fits on one page).
- Persisting the warning banner dismissal across page reloads.
- Test suite for the demo-seeder service itself.
- Production data management or migration tooling.

## Open Questions
None — all decisions are resolved.
