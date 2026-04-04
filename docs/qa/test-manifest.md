# GymPulse — Test Manifest

Maintained by the tester agent. Updated after every spec-writing session.
Read before writing new specs to identify regression risk.

## Coverage Registry

| Feature | Spec file | ACs covered | Last passing |
|---------|-----------|-------------|--------------|
| auth | `e2e/auth.spec.ts` | all | — |
| membership-plans | `e2e/membership-plans.spec.ts` | all | — |
| user-membership-purchase | `e2e/user-membership-purchase.spec.ts` | all | — |
| group-classes-schedule-view | `e2e/group-classes-schedule-view.spec.ts` | all | — |
| trainer-discovery | `e2e/trainer-discovery.spec.ts` | all | — |
| class-schedule | `e2e/class-schedule.spec.ts` | all | — |
| entity-image-management | `e2e/entity-image-management.spec.ts` | all | — |
| user-profile-management | `e2e/user-profile-management.spec.ts` | all | — |
| landing-page | `e2e/landing-page.spec.ts` | all | — |

## Regression Risk Map

Features that commonly affect each other when changed:
- `auth` ↔ any feature (auth token flow underpins everything)
- `membership-plans` ↔ `user-membership-purchase` (plan data is prerequisite)
- `group-classes-schedule-view` ↔ `class-schedule` (share class instance data)
- `trainer-discovery` ↔ `group-classes-schedule-view` (trainer data shown in class cards)
