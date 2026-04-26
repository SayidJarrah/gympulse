---
name: demo-seeder-conventions
description: GymPulse demo seeder rules. Load when writing migrations on
  seeded tables, adding new demo entities, or modifying anything under
  `demo-seeder/`.
---

# GymPulse Demo Seeder Conventions

The demo seeder lives at `demo-seeder/src/` and populates realistic data for
manual testing and demos. It must stay in sync with the DB schema at all
times.

## Seeded tables and owner files

| Table | Owner file | Notes |
|---|---|---|
| `users` | `referenceSeeder.ts` → `upsertQaUsersAndProfiles()` | QA fixed UUIDs |
| `user_profiles` | `referenceSeeder.ts` + `seeder.ts` → `registerUsers()` | Both paths must match |
| `trainers` | `referenceSeeder.ts` → `upsertTrainers()` | Fixed UUIDs in `data/trainers.ts` |
| `membership_plans` | `referenceSeeder.ts` → `upsertMembershipPlans()` | Fixed in `data/membershipPlans.ts` |
| `rooms` | `referenceSeeder.ts` → `upsertRooms()` | Fixed in `data/rooms.ts` |
| `class_templates` | `referenceSeeder.ts` → `upsertClassTemplatesV13()` / `upsertClassTemplatesV17()` | Predefined `is_seeded = TRUE` templates |
| `user_memberships` | `referenceSeeder.ts` → `upsertPlanPendingDemoRow()` + `seeder.ts` → `createMemberships()` | PLAN_PENDING placeholder for qa.user01; ACTIVE rows via `POST /memberships` |
| `class_instances` | `seeder.ts` → `createClassInstances()` | Dynamic per preset |
| `class_instance_trainers` | `seeder.ts` → `createClassInstances()` | Assigned alongside instances; no two overlapping slots per trainer |
| `bookings` | `seeder.ts` → `createBookings()` | Dynamic per preset |
| `pt_bookings` | `seeder.ts` → `createPtBookings()` | Dynamic per preset |

## Hard rules

1. **Any Flyway migration that adds or renames a column on a seeded table
   requires a seeder update in the same PR.** Check the table list above to
   find the owner file.

2. **Any new entity type that needs demo data requires a new seeder
   function** wired into `runSeeder()`. Add the table to the list above at
   the same time.

3. **Fixed reference data** (trainers, rooms, QA users, plans) lives in
   `demo-seeder/src/data/*.ts`. Add fields there first. Fixed UUIDs must
   never change — they are referenced by E2E tests and QA docs.

4. **Dynamic demo data** (members, class instances, bookings, PT bookings)
   is generated in `seeder.ts`. Keep quantity proportional to preset size
   (`small` / `medium` / `large`).

5. **New product entity → demo seeder coverage.** When a new entity row
   lands in `docs/architecture.md`'s schema map, the same PR MUST either:
   - add a seeder function for it (and add the table to the "Seeded tables
     and owner files" map at the top of this file), or
   - record `**Demo seeder:** none — {reason}` on the schema-map row
     (e.g. "internal cache table, not user-visible").
   The audit skill's Stage 7 enforces this — drift is a blocker.

## Realistic-data conventions

- **Demo users are created via the real public API**
  (`POST /api/v1/auth/register`). Passwords go through bcrypt and the
  data path is identical to a real signup — never bypass the controller
  or write directly to `users` / `user_profiles` for member accounts.
  Duplicate-email responses (HTTP 409) emit a warning and reuse the
  existing user id rather than aborting.
- **Email patterns are load-bearing — do not change them silently.**
  - Demo members: `demo.%@gym.demo` (used by the cleanup safety-net
    `DELETE FROM users WHERE email LIKE 'demo.%@gym.demo'` and the
    operator dashboard counts).
  - Seeded trainers: `%@gymflow.local` (used by the generation
    precondition that halts the run before phase 1 if no trainers are
    found matching this pattern).
- **CSV export password column** is the value of the `DEMO_PASSWORD`
  env var — never a hardcoded string.
- **Photo / image fields:** seeded entities (trainers, rooms, class
  templates) carry image data via the BYTEA + MIME-type column pair on
  their own table. The trainer record additionally exposes
  `profilePhotoUrl` for external assets. When introducing a new image
  field, follow the existing BYTEA pair pattern in
  `demo-seeder/src/data/*.ts` rather than inventing a new shape.
- **Trainer assignment for class instances** must avoid double-booking
  a trainer in two overlapping slots; if no free trainer is available,
  exactly one trainer is assigned as fallback and the run continues.

## Preset sizing

- The `preset ∈ {small, medium, large}` field on `SeederConfig` is the
  only external knob — it controls every dimension of seeding (rooms,
  trainers, class templates, plans, members, weeks, etc.).
- Server-side clamps applied to legacy / direct numeric inputs:
  `members ∈ [10, 50]`, `weeks ∈ [1, 4]`, `membershipPct ∈ [0, 100]`,
  `densityPct ∈ [10, 100]`. Out-of-range values are silently adjusted,
  not rejected.
- Generation is single-flight: a second `GET /api/generate/stream`
  while `isGenerating` is true returns 409 immediately.
- Before phase 1, the seeder writes a session id, ISO-8601 timestamp,
  and serialised config object to the SQLite `seeder_meta` table.

## Reference vs demo split (Flyway → seeder consolidation)

The demo-seeder owns all reference and demo seeding (rooms, trainers,
class templates, plans, QA users, member data). Flyway is limited to
schema DDL plus the admin-user bootstrap (V3 + V5). When adding new
seed data, prefer a seeder function over a new Flyway insert. Migrations
V13 / V16 / V17 were retired by this consolidation — environments that
applied them must run `flyway repair` once before the next clean
startup.

## Cleanup contract

- `POST /api/cleanup` is protected by `X-Admin-Token`. A missing or
  wrong token returns 401 and performs no DB operations. Cleanup while
  generation is in progress (`isGenerating === true`) returns 409.
- All cleanup deletions (class instances, memberships, tracked users,
  plus the `demo.%@gym.demo` safety-net sweep) run inside a single
  Postgres transaction. Any error rolls everything back. The safety-net
  query always executes — even when SQLite has no tracked IDs.
- After a successful cleanup commit, the SQLite tables `demo_users`,
  `demo_memberships`, `demo_class_instances`, and `seeder_meta` are
  emptied.
- Cleanup response: HTTP 200 with
  `{ deletedUsers, deletedMemberships, deletedClassInstances }`, each
  set to the actual Postgres `rowCount` for that statement.
