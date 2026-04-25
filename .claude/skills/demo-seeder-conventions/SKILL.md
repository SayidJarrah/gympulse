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
| `class_instances` | `seeder.ts` → `createClassInstances()` | Dynamic per preset |
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
