# Brief: seeder-presets

## Problem

The demo-seeder has two separate concerns today:

1. **Hardcoded reference data** — rooms, class templates, trainers, membership plans, and QA users are fixed in Flyway migrations (V13, V16, V17) or always seeded in fixed quantities. There is no way to vary them per run.
2. **Dynamic scenario data** — users, memberships, and schedules are generated via a preset option in `demo-seeder`, but that preset only controls the dynamic layer.

The result is that a "small gym" preset still gets 10 trainers, 3 rooms, 15 templates, and 10 plans — the same as a "large gym". Sales managers cannot demonstrate a small-boutique vs large-chain scenario convincingly, and developers cannot manually review a feature in a realistic scaled context.

## Roles

- **Sales Manager** — runs the seeder before customer demos; needs preset-driven, realistic-looking data without any technical setup
- **Developer** — runs the seeder for manual feature review during active development; needs the same flow but may want a lighter or heavier dataset depending on what is being tested

## Key Actions

- **Sales Manager / Developer:**
  - Pick a preset (e.g. Small Gym / Medium Gym / Large Gym)
  - Trigger a full seed — reference data (rooms, trainers, templates, plans) AND dynamic data (users, memberships, schedule) are seeded according to the preset
  - View a summary of what was seeded (entity counts, credential list)
  - Clean up all seeded data when done, returning the database to a clean state

## Business Rules

- Presets are **fixed** at this stage: Small Gym / Medium Gym / Large Gym (counts TBD in SDD, e.g. 1–2 rooms / 3–5 rooms / 6–10 rooms)
- **One active seed at a time** — if data is already seeded, the seed action is blocked. User must clean up first before re-seeding
- **Referential integrity via shuffle:** class instances must have a trainer and room assigned, memberships must belong to a real seeded user — but exact pairings are randomised, not hardcoded
- **Data quality — hard requirement:** all seeded entities must use realistic data:
  - Person names must be plausible full names (not "User1", "Demo Trainer")
  - Avatar/profile images must match the person's apparent gender
  - Room images must depict actual gym spaces
  - Class images must correspond to the class type (e.g. yoga → yoga studio image)
  - Trainer specialisations, bios, and class types must be internally consistent

## Out of Scope

- Custom / user-defined presets with arbitrary entity counts
- CI/CD integration or seeding of non-local environments (staging, production)
- A separate backend UI for configuring presets — configuration lives inside the seeder presets; the existing demo-seeder UI surface is sufficient
- Modifications to the E2E test stack (`docker-compose.e2e.yml`) or `global-setup.ts` — E2E fixture seeding remains independent
- Flyway bootstrap data (V3 admin user, V5 password fix) — these stay in Flyway unconditionally
