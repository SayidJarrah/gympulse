# PRD: Demo Seeder — Data Generation

## Overview
The data generation sub-feature allows an operator (sales or devops) to populate the GymFlow PostgreSQL database with synthetic demo data in a single click. It runs as a standalone Node/Express service on port 3001, accepts four configuration parameters, and streams real-time progress back to the operator dashboard over Server-Sent Events. Generation proceeds in three sequential phases: user registration, membership creation, and class schedule building. The feature exists solely to prepare the portal for customer sales demos and has no member-facing surface.

## User Roles
**Operator** — a sales or devops person with direct access to port 3001. No application-level authentication is required to trigger generation.

## User Stories

### Happy Path
- As an Operator, I want to configure the number of members, membership coverage, schedule length, and schedule density, so that I can tailor the demo data to the prospect's gym size.
- As an Operator, I want to click Generate and see live progress in the dashboard log, so that I know generation is working and how far along it is.
- As an Operator, I want the seeder to register users through the GymFlow REST API rather than writing directly to the database, so that passwords are bcrypt-hashed and the data is consistent with a real signup flow.

### Edge Cases
- As an Operator, when I click Generate while a generation run is already in progress, I want to receive an error immediately, so that I cannot launch two concurrent runs that would corrupt the session state.
- As an Operator, when the GymFlow database has not had the required schema migrations applied, I want to see a clear error message explaining what is missing, so that I can fix the prerequisite rather than getting a cryptic failure. (Reference data itself is seeded by the demo-seeder reference phase, not Flyway — see `docs/sdd/seeding-consolidation.md`.)
- As an Operator, when I supply a parameter value outside the allowed range, I want the server to silently clamp it to the nearest valid bound, so that the run is never rejected due to a UI or scripting mistake.

## Acceptance Criteria

1. A `GET /api/generate/stream` request received while `isGenerating` is `true` returns HTTP 409 with `{ "error": "Generation already in progress" }` and does not start a second run.
2. If the database contains no seeded class templates or no seeded trainers (email pattern `%@gymflow.local`) after loading reference data, the stream emits an `error` event with a descriptive message and generation halts without entering phase 1.
3. All four parameters are clamped server-side before use: `members` to [10, 50], `weeks` to [1, 4], `membershipPct` to [0, 100], `densityPct` to [10, 100]; values outside these ranges are silently adjusted rather than rejected.
4. When all three phases complete successfully, the stream emits a `done` event containing the actual count of registered users and the actual count of memberships created, followed by a `stream_end` event that closes the connection.
5. Each demo user is registered by calling `POST /api/v1/auth/register` on the GymFlow API; no user row is inserted directly into the `users` table by the seeder. If a user with that email already exists (HTTP 409 from the API), the seeder emits a warning and reuses the existing user ID rather than aborting the run.
6. Class instances are assigned trainers such that no trainer is scheduled for two overlapping time slots; if no free trainer is available for a slot, exactly one trainer is assigned as a fallback and the run continues rather than failing.
7. Before phase 1 begins, the seeder writes a session ID, ISO-8601 timestamp, and serialised config object to the SQLite `seeder_meta` table; this data persists in SQLite for the lifetime of the session.

## Out of Scope
- Member-facing UI or any API surface accessible to gym members.
- Booking class instances on behalf of demo users (no `class_bookings` rows are created).
- Seeding trainer or room records as a separate operator-invoked step — these are now handled automatically by the demo-seeder reference phase at the start of every generation run (see `docs/sdd/seeding-consolidation.md`).
- Any form of operator authentication or access control on the generate endpoint.
- Automated or scheduled generation runs.
- Test suite for the demo-seeder service itself.
- Production data management or migration tooling.

## Open Questions
None — all decisions are resolved.
