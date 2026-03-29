# Task: E2E Seed Data — Class Schedule

**Needed by:** `frontend/e2e/class-schedule.spec.ts`
**Blocks tests:** AC 5, 13, 16, 20, 21, 24–30, 33–35, 37–38
**Agents:** `backend-dev` (Flyway migration) + `frontend-dev` (Playwright globalSetup)

---

## Why this is needed

Several tests in `class-schedule.spec.ts` use conditional logic (`if (count > 0)`)
or are structural-only stubs because they need pre-existing DB state to exercise
the real UI flow. Without seed data those acceptance criteria are not meaningfully
tested.

---

## Part 1 — Flyway Migration (backend-dev)

These are reference/config records that make sense in all non-production environments
(dev + test). Create a single migration:

**File:** `backend/src/main/resources/db/migration/V{N}__seed_scheduler_reference_data.sql`

### Class Templates to seed

| name | category | difficulty | duration_min | capacity |
|------|----------|------------|-------------|----------|
| HIIT Bootcamp | CARDIO | ALL_LEVELS | 60 | 20 |
| Yoga Flow | FLEXIBILITY | ALL_LEVELS | 60 | 15 |
| Spin Cycle | CARDIO | INTERMEDIATE | 45 | 25 |
| Strength & Conditioning | STRENGTH | INTERMEDIATE | 60 | 12 |
| Pilates Core | FLEXIBILITY | BEGINNER | 50 | 10 |

These are referenced by name in test AC 16 (`HIIT Bootcamp`, `Yoga Flow`, `Spin Cycle`
must exist), AC 21 (HIIT Bootcamp must be category CARDIO), and AC 37–38 (CSV import
uses `HIIT Bootcamp` as a valid `class_name`).

Use `INSERT ... ON CONFLICT DO NOTHING` so re-running migrations is safe.

### Rooms to seed

| name | capacity | description |
|------|----------|-------------|
| Studio A | 30 | Main group fitness studio |
| Studio B | 20 | Spin and cycling studio |
| Weight Room | 15 | Strength training area |

---

## Part 2 — Playwright globalSetup (frontend-dev)

Create `frontend/e2e/global-setup.ts` that runs **before the test suite** and
seeds the dynamic test state that changes week-to-week. Tear it down in
`frontend/e2e/global-teardown.ts`.

Reference the setup/teardown files in `playwright.config.ts`:
```ts
globalSetup: './e2e/global-setup.ts',
globalTeardown: './e2e/global-teardown.ts',
```

The setup must call the GymFlow API (authenticated as admin) to create:

### 2a — Trainer with assignments (needed for AC 5)

1. Create a trainer: `{ firstName: "Seed", lastName: "Trainer", email: "seed-trainer@gymflow.local" }`
2. Create a class instance on the current week and assign this trainer to it
3. Store the trainer ID and instance ID in a temp file (`/tmp/gymflow-e2e-seed.json`)
   so teardown can clean them up

**Purpose:** When the test tries to delete this trainer, the backend returns
`TRAINER_HAS_ASSIGNMENTS`, triggering the confirmation modal with affected classes listed.

### 2b — Room with assignments (needed for AC 13)

1. Create a room: `{ name: "SeedRoom-E2E", capacity: 10 }`
2. Create a class instance in this room on the current week
3. Store IDs for teardown

**Purpose:** Deleting this room returns `ROOM_HAS_INSTANCES`, triggering the
"Delete Anyway" confirmation modal.

### 2c — Template with assignments (needed for AC 20)

1. Use the seeded "Yoga Flow" template (from Part 1)
2. Create a class instance using this template on the current week
3. Store the instance ID for teardown

**Purpose:** Deleting "Yoga Flow" template returns `CLASS_TEMPLATE_HAS_INSTANCES`.

### 2d — Class instances on current week (needed for AC 24–30, 33–35)

Create the following class instances for **the current calendar week** (Mon–Sun):

| # | template | day | start_time | trainers | room | purpose |
|---|----------|-----|------------|----------|------|---------|
| 1 | HIIT Bootcamp | Monday | 09:00 | seed-trainer@gymflow.local | Studio A | AC 26, 27, 30, 33, 35 (assigned card) |
| 2 | Yoga Flow | Tuesday | 10:00 | _(none)_ | Studio B | AC 34 (unassigned badge) |
| 3 | Spin Cycle | Wednesday | 09:00 | seed-trainer@gymflow.local | Studio B | AC 28 (trainer conflict base) |
| 4 | Strength & Conditioning | Wednesday | 09:00 | seed-trainer@gymflow.local | Studio A | AC 28 (assigns same trainer as #3 → TRAINER_SCHEDULE_CONFLICT) |
| 5 | Pilates Core | Thursday | 11:00 | _(none)_ | Studio A | AC 29 (room conflict base) |
| 6 | HIIT Bootcamp | Thursday | 11:00 | _(none)_ | Studio A | AC 29 (same room + overlapping time → room conflict amber dot) |

Store all instance IDs in `/tmp/gymflow-e2e-seed.json` for teardown.

### 2e — Teardown

`global-teardown.ts` reads `/tmp/gymflow-e2e-seed.json` and deletes all created
instances, trainer, and room in reverse order (instances first, then trainer/room).
Use the admin API with force-delete if available, or delete instances before their
parent entities.

---

## Acceptance

The E2E suite is considered fully seeded when:
- [x] Flyway migration exists: `backend/src/main/resources/db/migration/V13__seed_scheduler_reference_data.sql`
  with class templates + rooms inserted using `ON CONFLICT DO NOTHING`.
- [x] Playwright global setup/teardown are added:
  `frontend/e2e/global-setup.ts`, `frontend/e2e/global-teardown.ts`.
- [x] Playwright config references them:
  `frontend/playwright.config.ts` includes `globalSetup` and `globalTeardown`.
- [x] Seed file is written to `/tmp/gymflow-e2e-seed.json` and used for teardown cleanup.
- [x] Seeded schedule includes:
  - Trainer-assigned instance for AC 5.
  - Room-assigned instance for AC 13.
  - Yoga Flow instance for AC 20.
  - Unassigned instances (AC 34).
  - Room conflict pair (AC 29).
  - Trainer conflict setup: one instance already assigned to seed trainer and a second
    conflicting instance at the same time with no trainer (so UI can trigger conflict on assign).
- [ ] `cd frontend && npm run test:e2e -- --grep "class-schedule"` runs without any
  test being skipped due to `count === 0` conditional guards.
- [ ] AC 5, 13, 20 trigger their respective confirmation modals in a seeded run.
- [ ] AC 26 finds at least one card with a valid `aria-label` containing a time.
- [ ] AC 28 shows the trainer conflict error message in the edit panel when assigning
  the seed trainer to the conflicting instance.
- [ ] AC 29 shows at least one card with a room conflict amber indicator.
- [ ] AC 34 finds at least one card with aria-label containing "Unassigned".
- [ ] All seed data is cleaned up after the suite completes (teardown log shows 0 remaining).
