# SDD: Seeding Consolidation

## Reference
- Gap report (acts as PRD): `docs/gaps/seeding-consolidation.md` — Agreed Scope (2026-04-13) is binding
- Existing SDDs: `docs/sdd/demo-seeder-data-generation.md`, `docs/sdd/demo-seeder-credentials-and-state.md`
- Date: 2026-04-13
- Amended: 2026-04-21 — QA fixed-user pool removed (see §12)

## Architecture Overview

Three Flyway migrations currently mix demo data with the application schema lifecycle: V13 (class templates + rooms), V16 (10 trainers), and V17 (10 membership plans + 10 class templates + 10 QA users + user profiles). These migrations run on every stack — including E2E — which couples test infrastructure to demo content decisions.

This chore moves all three migrations into the `demo-seeder/` Node.js service. After this work:
- Flyway is limited to schema DDL plus two system-bootstrap rows (admin user via V3 + V5).
- `demo-seeder/` owns all reference and demo data seeding for the demo and review stacks.
- The E2E stack loses the data previously supplied by V13/V16/V17. This breakage is accepted; the test strategy is out of scope.

Layers affected: `demo-seeder/src/` (new data files + new seeding phase), `backend/src/main/resources/db/migration/` (deletion of three files), `docs/qa/seed-users.md` (deprecation).

No backend Kotlin code changes are required. No new REST endpoints are needed.

---

## 1. Migration Removal Plan

### Files to delete

| File | Lines | Reason |
|------|-------|--------|
| `backend/src/main/resources/db/migration/V13__seed_scheduler_reference_data.sql` | 16 | Class templates + rooms moved to demo-seeder |
| `backend/src/main/resources/db/migration/V16__seed_trainers.sql` | 289 | Trainers moved to demo-seeder |
| `backend/src/main/resources/db/migration/V17__seed_qa_reference_data.sql` | 479 | Plans + templates + QA users moved to demo-seeder |

### Flyway history and the `flyway repair` decision

Flyway records a row in `flyway_schema_history` for every migration it has applied. Deleting a migration SQL file does NOT automatically remove that history row. On the next `flyway migrate`, Flyway will detect that V13, V16, and V17 are present in history but absent from the classpath and will abort with a "detected resolved migration not applied" or "missing migration" error.

**Decision: run `flyway repair` once after deleting the files.**

`flyway repair` removes history rows whose corresponding migration file no longer exists. After repair, the backend starts cleanly with no checksum or missing-migration error.

**Ops step required on every environment that previously ran V13/V16/V17:**

```
flyway repair -url=... -user=... -password=...
```

In Docker Compose stacks this is handled by adding a one-time `flyway repair` invocation before `flyway migrate`, or by running it manually before deploying the migration-removed version. The exact mechanism is left to the developer executing this work; the SDD only mandates that repair must happen before the first clean startup.

**The data rows themselves remain in the database.** This chore does not drop the rows that V13/V16/V17 inserted. The demo-seeder will re-upsert them on the next generation run. If a clean slate is needed on an existing environment, the operator must manually truncate or delete those rows before running the new demo-seeder.

No compensating migration (V21 or later) is needed to drop the data, because the seeder uses upsert logic and duplicate rows will not be created.

---

## 2. demo-seeder Data Files

All new files live under `demo-seeder/src/data/`.

### 2.1 `demo-seeder/src/data/classTemplatesV13.ts`

Contains the 5 class templates previously in V13. These rows do not have fixed UUIDs in V13 (inserted with `ON CONFLICT (name) DO NOTHING`), so no UUIDs are stored here. The seeder upserts by `name`.

```typescript
export interface ClassTemplateRecord {
  name: string;
  description: string | null;
  category: string;
  defaultDurationMin: number;
  defaultCapacity: number;
  difficulty: string;
  isSeeded: boolean;
}

export const V13_CLASS_TEMPLATES: ClassTemplateRecord[] = [
  {
    name: 'HIIT Bootcamp',
    description: null,
    category: 'Cardio',
    defaultDurationMin: 60,
    defaultCapacity: 20,
    difficulty: 'All Levels',
    isSeeded: true,
  },
  {
    name: 'Yoga Flow',
    description: null,
    category: 'Flexibility',
    defaultDurationMin: 60,
    defaultCapacity: 15,
    difficulty: 'All Levels',
    isSeeded: true,
  },
  {
    name: 'Spin Cycle',
    description: null,
    category: 'Cardio',
    defaultDurationMin: 45,
    defaultCapacity: 25,
    difficulty: 'Intermediate',
    isSeeded: true,
  },
  {
    name: 'Strength & Conditioning',
    description: null,
    category: 'Strength',
    defaultDurationMin: 60,
    defaultCapacity: 12,
    difficulty: 'Intermediate',
    isSeeded: true,
  },
  {
    name: 'Pilates Core',
    description: null,
    category: 'Flexibility',
    defaultDurationMin: 50,
    defaultCapacity: 10,
    difficulty: 'Beginner',
    isSeeded: true,
  },
];
```

### 2.2 `demo-seeder/src/data/rooms.ts`

Contains the 3 rooms previously in V13. No fixed UUIDs in the original migration; upserted by `name`.

```typescript
export interface RoomRecord {
  name: string;
  capacity: number;
  description: string;
}

export const V13_ROOMS: RoomRecord[] = [
  { name: 'Studio A', capacity: 30, description: 'Main group fitness studio' },
  { name: 'Studio B', capacity: 20, description: 'Spin and cycling studio' },
  { name: 'Weight Room', capacity: 15, description: 'Strength training area' },
];
```

### 2.3 `demo-seeder/src/data/trainers.ts`

Contains the 10 trainers previously in V16. **Fixed UUIDs must be preserved exactly** — `seeder.ts` queries trainers by `email LIKE '%@gymflow.local'` and downstream class-instance assignments rely on these rows being stable.

```typescript
export interface TrainerRecord {
  id: string;           // fixed UUID — must not change
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  specialisations: string[];
  experienceYears: number;
  profilePhotoUrl: string | null;
}

export const TRAINERS: TrainerRecord[] = [
  {
    id: '11111111-1111-1111-1111-111111111101',
    firstName: 'Amelia',
    lastName: 'Stone',
    email: 'amelia.stone@gymflow.local',
    phone: '+14155550101',
    bio: 'Amelia leads high-energy strength sessions with a focus on sustainable progress, clean technique, and confidence under load.',
    specialisations: ['Strength Training', 'Functional Fitness', 'Mobility'],
    experienceYears: 12,
    profilePhotoUrl: 'https://picsum.photos/seed/gymflow-trainer-amelia/600/800',
  },
  {
    id: '11111111-1111-1111-1111-111111111102',
    firstName: 'Marco',
    lastName: 'Alvarez',
    email: 'marco.alvarez@gymflow.local',
    phone: '+14155550102',
    bio: 'Marco blends boxing footwork, conditioning, and interval programming to help members build endurance without losing form.',
    specialisations: ['HIIT', 'Boxing Conditioning', 'Cardio'],
    experienceYears: 9,
    profilePhotoUrl: 'https://picsum.photos/seed/gymflow-trainer-marco/600/800',
  },
  {
    id: '11111111-1111-1111-1111-111111111103',
    firstName: 'Priya',
    lastName: 'Nair',
    email: 'priya.nair@gymflow.local',
    phone: '+14155550103',
    bio: 'Priya coaches mindful movement and breath-led practice, specialising in mobility-focused yoga for busy professionals.',
    specialisations: ['Yoga', 'Mobility', 'Breathwork'],
    experienceYears: 11,
    profilePhotoUrl: 'https://picsum.photos/seed/gymflow-trainer-priya/600/800',
  },
  {
    id: '11111111-1111-1111-1111-111111111104',
    firstName: 'Jordan',
    lastName: 'Kim',
    email: 'jordan.kim@gymflow.local',
    phone: '+14155550104',
    bio: 'Jordan designs athletic performance programs that combine explosive power, sprint mechanics, and injury-aware recovery work.',
    specialisations: ['Athletic Performance', 'Strength Training', 'Recovery'],
    experienceYears: 8,
    profilePhotoUrl: null,
  },
  {
    id: '11111111-1111-1111-1111-111111111105',
    firstName: 'Sofia',
    lastName: 'Rossi',
    email: 'sofia.rossi@gymflow.local',
    phone: '+14155550105',
    bio: 'Sofia specialises in core control and posture-first coaching, making Pilates accessible for beginners and advanced members alike.',
    specialisations: ['Pilates', 'Core', 'Posture'],
    experienceYears: 7,
    profilePhotoUrl: 'https://picsum.photos/seed/gymflow-trainer-sofia/600/800',
  },
  {
    id: '11111111-1111-1111-1111-111111111106',
    firstName: 'Ethan',
    lastName: 'Brooks',
    email: 'ethan.brooks@gymflow.local',
    phone: '+14155550106',
    bio: 'Ethan focuses on barbell fundamentals, movement quality, and progressive overload for members returning to structured training.',
    specialisations: ['Powerlifting', 'Strength Training', 'Technique'],
    experienceYears: 10,
    profilePhotoUrl: 'https://picsum.photos/seed/gymflow-trainer-ethan/600/800',
  },
  {
    id: '11111111-1111-1111-1111-111111111107',
    firstName: 'Layla',
    lastName: 'Haddad',
    email: 'layla.haddad@gymflow.local',
    phone: '+14155550107',
    bio: 'Layla builds low-impact conditioning classes around stability, balance, and joint-friendly movement patterns.',
    specialisations: ['Low Impact', 'Mobility', 'Functional Fitness'],
    experienceYears: 6,
    profilePhotoUrl: null,
  },
  {
    id: '11111111-1111-1111-1111-111111111108',
    firstName: 'Noah',
    lastName: 'Bennett',
    email: 'noah.bennett@gymflow.local',
    phone: '+14155550108',
    bio: 'Noah coaches indoor cycling and endurance blocks with data-informed pacing, cadence work, and clear progression cues.',
    specialisations: ['Cycling', 'Cardio', 'Endurance'],
    experienceYears: 5,
    profilePhotoUrl: 'https://picsum.photos/seed/gymflow-trainer-noah/600/800',
  },
  {
    id: '11111111-1111-1111-1111-111111111109',
    firstName: 'Mina',
    lastName: 'Park',
    email: 'mina.park@gymflow.local',
    phone: '+14155550109',
    bio: 'Mina combines dance conditioning, flexibility work, and upbeat coaching to keep group sessions technical and welcoming.',
    specialisations: ['Dance Fitness', 'Flexibility', 'Cardio'],
    experienceYears: 4,
    profilePhotoUrl: 'https://picsum.photos/seed/gymflow-trainer-mina/600/800',
  },
  {
    id: '11111111-1111-1111-1111-111111111110',
    firstName: 'Daniel',
    lastName: 'Okafor',
    email: 'daniel.okafor@gymflow.local',
    phone: '+14155550110',
    bio: 'Daniel works with members on kettlebell flow, unilateral strength, and practical conditioning for everyday resilience.',
    specialisations: ['Kettlebells', 'Functional Fitness', 'Conditioning'],
    experienceYears: 13,
    profilePhotoUrl: null,
  },
];
```

### 2.4 `demo-seeder/src/data/membershipPlans.ts`

Contains the 10 membership plans previously in V17 (lines 3–129). **Fixed UUIDs must be preserved exactly** — `seeder.ts` loads plans from Postgres at run time and assigns them to demo users by ID; the UUIDs are the stable reference.

```typescript
export interface MembershipPlanRecord {
  id: string;                    // fixed UUID — must not change
  name: string;
  description: string;
  priceInCents: number;
  durationDays: number;
  status: 'ACTIVE' | 'INACTIVE';
  maxBookingsPerMonth: number;   // 0 = unlimited
}

export const MEMBERSHIP_PLANS: MembershipPlanRecord[] = [
  {
    id: '22222222-2222-2222-2222-222222222201',
    name: 'Starter Monthly',
    description: 'Entry-level access with a limited monthly booking allowance.',
    priceInCents: 3900,
    durationDays: 30,
    status: 'ACTIVE',
    maxBookingsPerMonth: 8,
  },
  {
    id: '22222222-2222-2222-2222-222222222202',
    name: 'Standard Monthly',
    description: 'Balanced monthly plan for regular class attendance.',
    priceInCents: 5900,
    durationDays: 30,
    status: 'ACTIVE',
    maxBookingsPerMonth: 16,
  },
  {
    id: '22222222-2222-2222-2222-222222222203',
    name: 'Unlimited Monthly',
    description: 'Unlimited class bookings with full schedule access.',
    priceInCents: 7900,
    durationDays: 30,
    status: 'ACTIVE',
    maxBookingsPerMonth: 0,
  },
  {
    id: '22222222-2222-2222-2222-222222222204',
    name: 'Quarterly Saver',
    description: 'Prepay for 3 months and save on the monthly rate.',
    priceInCents: 16500,
    durationDays: 90,
    status: 'ACTIVE',
    maxBookingsPerMonth: 48,
  },
  {
    id: '22222222-2222-2222-2222-222222222205',
    name: 'Annual Unlimited',
    description: 'Best value annual plan with unlimited bookings.',
    priceInCents: 69900,
    durationDays: 365,
    status: 'ACTIVE',
    maxBookingsPerMonth: 0,
  },
  {
    id: '22222222-2222-2222-2222-222222222206',
    name: 'Off-Peak Monthly',
    description: 'Discounted plan for midday and early afternoon bookings.',
    priceInCents: 3500,
    durationDays: 30,
    status: 'ACTIVE',
    maxBookingsPerMonth: 8,
  },
  {
    id: '22222222-2222-2222-2222-222222222207',
    name: 'Student Flex',
    description: 'Flexible plan for students with capped monthly bookings.',
    priceInCents: 3200,
    durationDays: 30,
    status: 'ACTIVE',
    maxBookingsPerMonth: 10,
  },
  {
    id: '22222222-2222-2222-2222-222222222208',
    name: 'Family Duo',
    description: 'Shared plan intended for two household members.',
    priceInCents: 9900,
    durationDays: 30,
    status: 'ACTIVE',
    maxBookingsPerMonth: 20,
  },
  {
    id: '22222222-2222-2222-2222-222222222209',
    name: 'Recovery & Wellness',
    description: 'Lower intensity plan focused on mobility, yoga, and recovery.',
    priceInCents: 4500,
    durationDays: 30,
    status: 'ACTIVE',
    maxBookingsPerMonth: 8,
  },
  {
    id: '22222222-2222-2222-2222-222222222210',
    name: 'Trial Week',
    description: 'Short-term trial plan for new members.',
    priceInCents: 1500,
    durationDays: 7,
    status: 'ACTIVE',
    maxBookingsPerMonth: 2,
  },
];
```

### 2.5 `demo-seeder/src/data/classTemplatesV17.ts`

Contains the 10 additional class templates previously in V17 (lines 131–261). **Fixed UUIDs must be preserved exactly** — these rows use `ON CONFLICT (name) DO UPDATE` in the original migration, meaning names are the natural key too. The UUIDs are fixed for consistency.

```typescript
export interface ClassTemplateV17Record {
  id: string;                  // fixed UUID — must not change
  name: string;
  description: string;
  category: string;
  defaultDurationMin: number;
  defaultCapacity: number;
  difficulty: string;
  isSeeded: boolean;
}

export const V17_CLASS_TEMPLATES: ClassTemplateV17Record[] = [
  {
    id: '33333333-3333-3333-3333-333333333301',
    name: 'Sunrise Stretch',
    description: 'Gentle flexibility and mobility class to start the day.',
    category: 'Flexibility',
    defaultDurationMin: 45,
    defaultCapacity: 18,
    difficulty: 'Beginner',
    isSeeded: true,
  },
  {
    id: '33333333-3333-3333-3333-333333333302',
    name: 'Power Yoga',
    description: 'Dynamic vinyasa flow with strength and balance sequences.',
    category: 'Mind & Body',
    defaultDurationMin: 60,
    defaultCapacity: 20,
    difficulty: 'Intermediate',
    isSeeded: true,
  },
  {
    id: '33333333-3333-3333-3333-333333333303',
    name: 'Functional Circuit',
    description: 'Timed stations focused on full-body functional movement.',
    category: 'Functional',
    defaultDurationMin: 50,
    defaultCapacity: 24,
    difficulty: 'All Levels',
    isSeeded: true,
  },
  {
    id: '33333333-3333-3333-3333-333333333304',
    name: 'Boxing Fundamentals',
    description: 'Skill-based boxing combinations and footwork drills.',
    category: 'Combat',
    defaultDurationMin: 55,
    defaultCapacity: 22,
    difficulty: 'Beginner',
    isSeeded: true,
  },
  {
    id: '33333333-3333-3333-3333-333333333305',
    name: 'Dance Cardio Blast',
    description: 'High-energy dance workout with simple choreography.',
    category: 'Dance',
    defaultDurationMin: 45,
    defaultCapacity: 30,
    difficulty: 'All Levels',
    isSeeded: true,
  },
  {
    id: '33333333-3333-3333-3333-333333333306',
    name: 'Aqua Flow',
    description: 'Low-impact pool class focused on joint-friendly conditioning.',
    category: 'Aqua',
    defaultDurationMin: 40,
    defaultCapacity: 16,
    difficulty: 'Beginner',
    isSeeded: true,
  },
  {
    id: '33333333-3333-3333-3333-333333333307',
    name: 'Cycle Endurance',
    description: 'Longer ride format that builds aerobic capacity.',
    category: 'Cycling',
    defaultDurationMin: 60,
    defaultCapacity: 28,
    difficulty: 'Intermediate',
    isSeeded: true,
  },
  {
    id: '33333333-3333-3333-3333-333333333308',
    name: 'Core Ignite',
    description: 'Targeted core strength and stability training.',
    category: 'Strength',
    defaultDurationMin: 40,
    defaultCapacity: 20,
    difficulty: 'All Levels',
    isSeeded: true,
  },
  {
    id: '33333333-3333-3333-3333-333333333309',
    name: 'Meditation Reset',
    description: 'Guided breathwork and meditation for recovery and focus.',
    category: 'Wellness',
    defaultDurationMin: 30,
    defaultCapacity: 25,
    difficulty: 'Beginner',
    isSeeded: true,
  },
  {
    id: '33333333-3333-3333-3333-333333333310',
    name: 'Mobility Lab',
    description: 'Joint mobility and movement prep for better training quality.',
    category: 'Flexibility',
    defaultDurationMin: 50,
    defaultCapacity: 18,
    difficulty: 'All Levels',
    isSeeded: true,
  },
];
```

### 2.6 `demo-seeder/src/data/qaUsers.ts`

Contains the 10 QA users and their profiles previously in V17 (lines 263–478). Password hash preserved verbatim from V17 — it is the bcrypt hash of `Admin@1234`.

```typescript
export interface QaUserRecord {
  id: string;             // fixed UUID — must not change
  email: string;
  passwordHash: string;   // bcrypt hash of Admin@1234
  role: 'USER';
}

export interface QaProfileRecord {
  email: string;           // join key — resolved to user_id at insert time
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;     // ISO date string: 'YYYY-MM-DD'
  fitnessGoals: string[];
  preferredClassTypes: string[];
}

const PASSWORD_HASH = '$2a$10$7EqJtq98hPqEX7fNZaFWoOa4Z1GpSgaFjxuqFkEqLzYmI2lHvk3yS';

export const QA_USERS: QaUserRecord[] = [
  { id: '44444444-4444-4444-4444-444444444401', email: 'qa.user01@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
  { id: '44444444-4444-4444-4444-444444444402', email: 'qa.user02@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
  { id: '44444444-4444-4444-4444-444444444403', email: 'qa.user03@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
  { id: '44444444-4444-4444-4444-444444444404', email: 'qa.user04@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
  { id: '44444444-4444-4444-4444-444444444405', email: 'qa.user05@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
  { id: '44444444-4444-4444-4444-444444444406', email: 'qa.user06@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
  { id: '44444444-4444-4444-4444-444444444407', email: 'qa.user07@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
  { id: '44444444-4444-4444-4444-444444444408', email: 'qa.user08@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
  { id: '44444444-4444-4444-4444-444444444409', email: 'qa.user09@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
  { id: '44444444-4444-4444-4444-444444444410', email: 'qa.user10@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
];

export const QA_PROFILES: QaProfileRecord[] = [
  { email: 'qa.user01@gymflow.local', firstName: 'Avery',  lastName: 'West',    phone: '+14155551001', dateOfBirth: '1993-02-10', fitnessGoals: ['Build strength', 'Improve posture'],       preferredClassTypes: ['Strength', 'Mind & Body'] },
  { email: 'qa.user02@gymflow.local', firstName: 'Jordan', lastName: 'Reed',    phone: '+14155551002', dateOfBirth: '1988-11-05', fitnessGoals: ['Increase endurance', 'Lose weight'],      preferredClassTypes: ['Cardio', 'Cycling'] },
  { email: 'qa.user03@gymflow.local', firstName: 'Casey',  lastName: 'Nguyen',  phone: '+14155551003', dateOfBirth: '1996-07-19', fitnessGoals: ['Improve flexibility', 'Reduce stress'],   preferredClassTypes: ['Flexibility', 'Wellness'] },
  { email: 'qa.user04@gymflow.local', firstName: 'Taylor', lastName: 'Diaz',    phone: '+14155551004', dateOfBirth: '1990-03-24', fitnessGoals: ['Build muscle', 'Improve balance'],        preferredClassTypes: ['Strength', 'Functional'] },
  { email: 'qa.user05@gymflow.local', firstName: 'Morgan', lastName: 'Patel',   phone: '+14155551005', dateOfBirth: '1992-12-02', fitnessGoals: ['Increase energy', 'Stay consistent'],     preferredClassTypes: ['Cardio', 'Dance'] },
  { email: 'qa.user06@gymflow.local', firstName: 'Riley',  lastName: 'Chen',    phone: '+14155551006', dateOfBirth: '1985-09-14', fitnessGoals: ['Recover from injury', 'Improve mobility'], preferredClassTypes: ['Wellness', 'Flexibility'] },
  { email: 'qa.user07@gymflow.local', firstName: 'Quinn',  lastName: 'Lopez',   phone: '+14155551007', dateOfBirth: '1998-01-29', fitnessGoals: ['Improve athleticism', 'Build power'],     preferredClassTypes: ['Functional', 'Strength'] },
  { email: 'qa.user08@gymflow.local', firstName: 'Sydney', lastName: 'Foster',  phone: '+14155551008', dateOfBirth: '1994-05-11', fitnessGoals: ['Stay active', 'Reduce stress'],           preferredClassTypes: ['Mind & Body', 'Wellness'] },
  { email: 'qa.user09@gymflow.local', firstName: 'Parker', lastName: 'Singh',   phone: '+14155551009', dateOfBirth: '1989-08-30', fitnessGoals: ['Increase stamina', 'Improve speed'],      preferredClassTypes: ['Cardio', 'Combat'] },
  { email: 'qa.user10@gymflow.local', firstName: 'Drew',   lastName: 'Santos',  phone: '+14155551010', dateOfBirth: '1991-06-08', fitnessGoals: ['Build core strength', 'Improve flexibility'], preferredClassTypes: ['Strength', 'Flexibility'] },
];
```

---

## 3. demo-seeder Seeding Orchestration

### 3.1 New "reference phase" in `seeder.ts`

A new function `seedReferenceData()` is added to `demo-seeder/src/seeder.ts`. It runs before the existing three-phase generation and is called unconditionally whenever `runSeeder()` is invoked (i.e., always-on — see rationale below).

**Execution order within a generation run:**

```
seedReferenceData()
  └─ 1. Rooms        (upsert by name)
  └─ 2. Class templates V13  (upsert by name)
  └─ 3. Class templates V17  (upsert by id and name)
  └─ 4. Trainers     (upsert by id and email)
  └─ 5. Membership plans  (upsert by id)
  └─ 6. QA users + profiles (upsert by id/email)
runSeeder() phases (unchanged):
  └─ Phase 1: Demo users
  └─ Phase 2: Memberships
  └─ Phase 3: Class instances
```

The reference phase is always-on. Rationale: the existing `loadReferenceData()` function hard-fails if `class_templates`, `trainers`, `rooms`, or `membership_plans` are empty. Making the reference phase always-on guarantees that prerequisites are met before any generation attempt, regardless of whether the environment was freshly booted from a post-V13/V16/V17 schema. Opt-in would require operators to manually trigger the reference phase before generation, which is error-prone.

### 3.2 Idempotence

Every upsert in `seedReferenceData()` must be safe to run multiple times without creating duplicates or overwriting operator-made changes beyond what is specified here.

| Entity | Conflict key | On conflict action |
|--------|-------------|-------------------|
| Rooms | `name` | Update `capacity`, `description`; preserve `id` |
| Class templates (V13) | `name` | Update all fields; set `is_seeded = TRUE` |
| Class templates (V17) | `id` (primary); fallback `name` | Update all fields; set `is_seeded = TRUE` |
| Trainers | `id` (primary); fallback `email` | Update all fields; set `deleted_at = NULL` |
| Membership plans | `id` | Update all fields; preserve `status` as written in data file |
| QA users | `email` | Update `password_hash`, `role`; set `deleted_at = NULL` |
| QA user profiles | `user_id` (resolved from `email`) | Update all profile fields; set `deleted_at = NULL` |

### 3.3 SQL for each upsert

All upserts run via direct Postgres queries using `pgPool` — the same pattern as Phase 3 class-instance inserts in the existing seeder. The connection is obtained from `pgPool.connect()` and released in a `finally` block.

**Rooms** (conflict on `name`):
```sql
INSERT INTO rooms (name, capacity, description)
VALUES ($1, $2, $3)
ON CONFLICT (name) DO UPDATE
SET capacity = EXCLUDED.capacity,
    description = EXCLUDED.description;
```

**Class templates** (conflict on `name`; for V17 rows also supply `id`):
```sql
INSERT INTO class_templates (id, name, description, category, default_duration_min, default_capacity, difficulty, room_id, is_seeded)
VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8)
ON CONFLICT (name) DO UPDATE
SET description         = EXCLUDED.description,
    category            = EXCLUDED.category,
    default_duration_min = EXCLUDED.default_duration_min,
    default_capacity    = EXCLUDED.default_capacity,
    difficulty          = EXCLUDED.difficulty,
    is_seeded           = TRUE;
```

For V13 templates (no fixed UUIDs), supply `gen_random_uuid()` as `$1` in the INSERT; on conflict the `id` is not updated (Postgres `ON CONFLICT DO UPDATE` does not update the conflict key column, so the existing `id` is preserved).

**Trainers** — two-statement pattern mirroring V16 exactly (UPDATE existing, then INSERT missing):
```sql
-- Step 1: update existing rows
UPDATE trainers
SET first_name        = $2,
    last_name         = $3,
    email             = $4,
    phone             = $5,
    bio               = $6,
    specialisations   = $7,
    experience_years  = $8,
    profile_photo_url = $9,
    deleted_at        = NULL,
    updated_at        = NOW()
WHERE id = $1 OR email = $4;

-- Step 2: insert if neither id nor email exists
INSERT INTO trainers (id, first_name, last_name, email, phone, bio, specialisations, experience_years, profile_photo_url)
SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9
WHERE NOT EXISTS (
  SELECT 1 FROM trainers WHERE id = $1 OR email = $4
);
```

Both steps execute per trainer row inside a single transaction over the pool connection.

**Membership plans** (conflict on `id`):
```sql
INSERT INTO membership_plans (id, name, description, price_in_cents, duration_days, status, max_bookings_per_month)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (id) DO UPDATE
SET name                   = EXCLUDED.name,
    description            = EXCLUDED.description,
    price_in_cents         = EXCLUDED.price_in_cents,
    duration_days          = EXCLUDED.duration_days,
    status                 = EXCLUDED.status,
    max_bookings_per_month = EXCLUDED.max_bookings_per_month;
```

**QA users** (conflict on `email`):
```sql
INSERT INTO users (id, email, password_hash, role)
VALUES ($1, $2, $3, $4)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    role          = EXCLUDED.role,
    deleted_at    = NULL;
```

**QA profiles** (conflict on `user_id`; resolve `user_id` by joining on `email`):
```sql
INSERT INTO user_profiles (user_id, first_name, last_name, phone, date_of_birth, fitness_goals, preferred_class_types)
SELECT u.id, $2, $3, $4, $5::date, $6::jsonb, $7::jsonb
FROM users u
WHERE u.email = $1
ON CONFLICT (user_id) DO UPDATE
SET first_name            = EXCLUDED.first_name,
    last_name             = EXCLUDED.last_name,
    phone                 = EXCLUDED.phone,
    date_of_birth         = EXCLUDED.date_of_birth,
    fitness_goals         = EXCLUDED.fitness_goals,
    preferred_class_types = EXCLUDED.preferred_class_types,
    deleted_at            = NULL;
```

### 3.4 Error handling in the reference phase

If any upsert throws, `seedReferenceData()` propagates the error. `runSeeder()` catches it, emits an `error` SSE event, and halts generation. The existing `stream_end` event is still emitted in the `finally` block — this behaviour is unchanged from the current error-handling pattern.

---

## 4. How demo-seeder Writes Reference Data — REST vs Direct SQL

The choice between REST and direct Postgres SQL is made per entity type.

### REST endpoints for trainers, templates, rooms exist

The backend exposes:
- `POST /api/v1/admin/trainers` — creates one trainer
- `PUT /api/v1/admin/trainers/{id}` — updates one trainer
- `POST /api/v1/admin/class-templates` — creates one template
- `PUT /api/v1/admin/class-templates/{id}` — updates one template
- `POST /api/v1/rooms` — creates one room
- `PUT /api/v1/rooms/{id}` — updates one room
- `POST /api/v1/membership-plans` — creates one plan (admin-only)
- `PUT /api/v1/membership-plans/{id}` — updates one plan (admin-only)

### Why direct SQL is used instead

**1. Fixed UUIDs cannot be set via REST.** `TrainerRequest`, `MembershipPlanRequest`, `ClassTemplateRequest`, and `RoomRequest` do not accept an `id` field. The service layer generates UUIDs at creation time. For trainers and plans this is a hard requirement — their UUIDs must match the values in the data files exactly (downstream code queries by these IDs). Using REST would require a GET-then-match-by-name lookup on every run, which is more complex and still cannot guarantee the UUID.

**2. True upsert semantics require direct SQL.** REST offers create (409 on conflict) or update (requires knowing the ID first). Implementing "upsert by name or by ID" reliably over REST requires multiple round trips per row (GET to find existing, then POST or PUT). Direct SQL achieves this in one statement.

**3. Volume.** The reference phase inserts up to 36 rows (3 rooms + 15 templates + 10 trainers + 10 plans — the 10 QA users and profiles bring the total closer to 56 rows). Direct batched SQL is simpler and faster than 56 sequential HTTP calls with auth headers.

**4. Consistency with existing Phase 3 pattern.** Phase 3 class-instance inserts already use `pgPool` directly. The reference phase follows the same pattern, keeping the seeder's connection management uniform.

**Conclusion:** all reference data is written via direct Postgres queries using `pgPool`. No new REST endpoints are needed.

---

## 5. API Contracts

No new backend endpoints are required. The demo-seeder's existing `GET /api/generate/stream` endpoint triggers the full run including the new reference phase.

The existing SSE event types (`start`, `log`, `progress`, `warning`, `error`, `done`, `stream_end`) are sufficient. The reference phase emits `log` events to indicate progress:

| Event | Payload | When |
|-------|---------|------|
| `log` | `{ message: "Seeding reference data…" }` | Before first upsert in reference phase |
| `log` | `{ message: "Reference data seeded: {N} rooms, {N} templates, {N} trainers, {N} plans, {N} QA users" }` | After last upsert in reference phase |
| `error` | `{ message: "Reference data seeding failed: {cause}" }` | On any upsert error |

The `SeederConfig` type and all query parameters for `GET /api/generate/stream` are unchanged.

---

## 6. Compose / Runtime Changes

### docker-compose.demo.yml and docker-compose.review.yml

No changes required. Both files already include the `demo-seeder` service. The seeder container rebuilds automatically when the source changes. On the next `GET /api/generate/stream` call, the reference phase runs before generation.

### docker-compose.e2e.yml

No changes. The E2E stack does not include `demo-seeder` and will not gain the reference data previously supplied by V13/V16/V17. **This is accepted breakage.** The E2E suite will fail on tests that depend on Flyway-seeded templates, trainers, rooms, or plans. The test strategy for E2E will be redesigned separately and is explicitly out of scope for this work.

---

## 7. docs/qa/seed-users.md

The file at `docs/qa/seed-users.md` currently documents 10 QA users seeded by Flyway migration V17. After V17 is deleted, these users are no longer seeded automatically — they are seeded by the demo-seeder reference phase when `GET /api/generate/stream` is called on the demo or review stack.

**Action: replace the file contents with the following:**

```markdown
# QA Seed Users

These accounts are seeded by the **demo-seeder reference phase**, not by Flyway.
They are present on the demo and review stacks after a generation run has been triggered.
They are NOT available on the E2E stack.

Password for all users: `Admin@1234`

| Email | First Name | Last Name | Role |
|-------|-----------|----------|------|
| qa.user01@gymflow.local | Avery  | West   | USER |
| qa.user02@gymflow.local | Jordan | Reed   | USER |
| qa.user03@gymflow.local | Casey  | Nguyen | USER |
| qa.user04@gymflow.local | Taylor | Diaz   | USER |
| qa.user05@gymflow.local | Morgan | Patel  | USER |
| qa.user06@gymflow.local | Riley  | Chen   | USER |
| qa.user07@gymflow.local | Quinn  | Lopez  | USER |
| qa.user08@gymflow.local | Sydney | Foster | USER |
| qa.user09@gymflow.local | Parker | Singh  | USER |
| qa.user10@gymflow.local | Drew   | Santos | USER |

To seed these accounts: start the demo or review stack and call
`GET http://localhost:3001/api/generate/stream` (demo) or `GET http://localhost:3002/api/generate/stream` (review).
The reference phase runs automatically before user generation.
```

---

## 8. New and Modified Files

### New files

| File path | Purpose |
|-----------|---------|
| `demo-seeder/src/data/classTemplatesV13.ts` | 5 class templates from V13 |
| `demo-seeder/src/data/rooms.ts` | 3 rooms from V13 |
| `demo-seeder/src/data/trainers.ts` | 10 trainers from V16 (fixed UUIDs) |
| `demo-seeder/src/data/membershipPlans.ts` | 10 membership plans from V17 (fixed UUIDs) |
| `demo-seeder/src/data/classTemplatesV17.ts` | 10 class templates from V17 (fixed UUIDs) |
| `demo-seeder/src/data/qaUsers.ts` | 10 QA users + profiles from V17 (fixed UUIDs) |

### Modified files

| File path | Change |
|-----------|--------|
| `demo-seeder/src/seeder.ts` | Add `seedReferenceData()` function; call it at the start of `runSeeder()` before Phase 1 |
| `docs/qa/seed-users.md` | Replace content per Section 7 above |
| `docs/sdd/demo-seeder-data-generation.md` | Update Section 1 (Flyway Prerequisites) to reflect that prerequisites are now seeded by the reference phase, not by Flyway migrations V13/V16/V17 |

### Deleted files

| File path | Reason |
|-----------|--------|
| `backend/src/main/resources/db/migration/V13__seed_scheduler_reference_data.sql` | Data moved to demo-seeder |
| `backend/src/main/resources/db/migration/V16__seed_trainers.sql` | Data moved to demo-seeder |
| `backend/src/main/resources/db/migration/V17__seed_qa_reference_data.sql` | Data moved to demo-seeder |

---

## 9. Rollout Order

Each step must leave the repository in a buildable state if merged independently.

**Step A — Add data files and reference phase to demo-seeder (no deletions yet)**

1. Add the six new `demo-seeder/src/data/*.ts` files.
2. Add `seedReferenceData()` to `demo-seeder/src/seeder.ts`.
3. Verify the demo stack: start `docker-compose.demo.yml`, trigger generation, confirm all reference rows upsert cleanly and the existing three phases complete.
4. The three Flyway migrations still exist at this step — reference data gets inserted twice (once by Flyway on startup, once by demo-seeder on generation). This is safe because all upserts are idempotent.
5. Update `docs/sdd/demo-seeder-data-generation.md` Section 1.

**Step B — Delete V13, V16, V17 and run `flyway repair`**

1. Delete the three migration files.
2. On each environment that previously ran these migrations (local dev, demo, review), run `flyway repair` before restarting the backend.
3. Restart the backend. Flyway should apply no new migrations (schema DDL is unchanged) and start cleanly.
4. Trigger a generation run on the demo stack. Confirm the reference phase seeds all rows correctly from cold (no prior Flyway rows).
5. E2E stack: accept that the suite will fail on tests depending on V13/V16/V17 data. Do not attempt to fix.

**Step C — Update docs**

1. Replace `docs/qa/seed-users.md` with the content specified in Section 7.
2. Verify no other docs reference V13, V16, or V17 as authoritative sources for reference data.

Steps A–C should be committed to the same PR on `chore/seeding-consolidation` and merged together. If intermediate verification of Step A is desired before deletion, Step A may be committed first with Step B following as a second commit on the same branch.

---

## 10. Non-Goals

The following are explicitly out of scope for this chore:

- Fixing or updating the E2E test suite (`frontend/e2e/`). Tests that relied on V13/V16/V17 data will break. This is accepted.
- Designing or implementing a new E2E test strategy for seeded reference data.
- Adding new REST endpoints to the backend Kotlin codebase.
- Splitting or renaming any remaining Flyway files (e.g., renaming V3 or V5).
- Migrating the `TestSupportController` cleanup endpoint.
- Resolving tech-debt items TD-007 or TD-010.
- Modifying `docker-compose.e2e.yml` in any way.
- Adding the demo-seeder as a service to `docker-compose.e2e.yml`.
- Creating any new admin UI for managing reference data.
- Changing the existing `GET /api/generate/stream` query parameters or SSE event shapes.

---

## 11. Risks and Notes

### Assumption A — `ON CONFLICT (name)` exists on `class_templates`

The V13 upsert uses `ON CONFLICT (name) DO NOTHING` and the V17 upsert uses `ON CONFLICT (name) DO UPDATE`. This requires a unique constraint on `class_templates.name`. The Flyway migrations themselves rely on this constraint — if it were absent, the migrations would have failed on first apply. The demo-seeder reference phase relies on the same constraint. No new DB constraint is needed.

### Assumption B — `ON CONFLICT (name)` exists on `rooms`

Same reasoning as Assumption A. V13 uses `ON CONFLICT (name) DO NOTHING` for rooms. Constraint assumed to exist.

### Assumption C — `membership_plans` has a unique constraint on `id`

V17 uses `ON CONFLICT (id) DO UPDATE` for plans. `id` is the primary key — this constraint is always present.

### Assumption D — `users` has a unique constraint on `email`

V17 uses `ON CONFLICT (email) DO UPDATE` for QA users. The existing `AuthController` registration logic already relies on this constraint being present.

### Risk: existing environments with V13/V16/V17 data

On environments where V13/V16/V17 have already been applied (all current local, demo, and review instances), the data rows remain in the DB after the migration files are deleted. `flyway repair` removes the history entries but does not delete the rows. The first demo-seeder reference phase after deletion will upsert over those rows cleanly (idempotent). No data loss risk.

### Risk: `flyway repair` is a manual step

Flyway repair cannot be automated in Docker Compose startup without a custom entrypoint script. If an operator restarts the backend without running repair first, the backend will fail to start with a "detected resolved migration not applied" or "missing migration" error. This is a known operational risk and must be communicated in the PR description and deployment notes.

Mitigation option (not required by this SDD, left to developer discretion): add a `command: ["sh", "-c", "flyway repair && flyway migrate"]` entrypoint to the backend service in `docker-compose.demo.yml` and `docker-compose.review.yml` for the transition period.

### Risk: `seeder.ts` uses `loadReferenceData()` after `seedReferenceData()`

The existing `loadReferenceData()` function queries `class_templates WHERE is_seeded = TRUE`, `trainers WHERE email LIKE '%@gymflow.local'`, `rooms`, and `membership_plans WHERE status = 'ACTIVE'`. After the reference phase inserts these rows, `loadReferenceData()` will find them. No ordering issue — `seedReferenceData()` completes before `loadReferenceData()` is called in Phase 1.

### Note: `docs/sdd/demo-seeder-data-generation.md` Section 1 must be updated

Section 1 currently states that `class_templates`, `trainers`, `rooms`, and `membership_plans` are populated by "the standard Flyway seed migrations". After this chore, that statement is no longer accurate. The section must be updated to read: these rows are now populated by the demo-seeder reference phase, which runs unconditionally at the start of every generation run.

### Note: gap report body vs agreed scope discrepancy

The body of `docs/gaps/seeding-consolidation.md` classifies V13 as "KEEP in Flyway" and V17 as "SPLIT". The "Agreed Scope (2026-04-13)" section at the top overrides this with "MIGRATE to demo-seeder: V13, V16, V17 — in full". This SDD follows the Agreed Scope section, which was designated as binding at the time of this work.

---

## 12. Amendment (2026-04-21) — QA fixed-user pool removed

### Decision

The 10 fixed-UUID QA users seeded by `upsertQaUsersAndProfiles()` (emails `qa.user01..qa.user10@gymflow.local`, UUIDs `44444444-4444-4444-4444-4444444444{01..10}`) are removed. The companion `upsertPlanPendingDemoRow()` function, which depended on `qa.user01`, is also removed. The dev stack now seeds only dynamically-registered members (emails `demo.*@gym.demo`) plus the admin bootstrapped by Flyway V3/V5.

### Rationale

1. **E2E is now isolated.** `docker-compose.e2e.yml` provisions its own Postgres on port 5433 (`gymflow_e2e` database), so the dev stack's seed no longer influences tests. The single active spec (`e2e/specs/onboarding-happy-path.spec.ts`) registers its own user with a unique `@test.gympulse.local` email per run and has no dependency on the fixed pool.
2. **No current spec references the fixed UUIDs.** A grep of `e2e/specs/` for `qa.user` or the `44444444-...` UUID prefix returns nothing after the testing-reset (PR #65).
3. **The PLAN_PENDING demo row was defending a CLAUDE.md rule that no longer exists.** The rule "any valid status value added by a migration must be exercised by the seeder" is no longer in CLAUDE.md's Demo Seeder section. Backend unit tests cover `PLAN_PENDING` state transitions; the dev-stack UI can reach a `PLAN_PENDING` row through the normal signup → pick-plan flow without it being pre-seeded.

### Files changed

- `demo-seeder/src/data/qaUsers.ts` — deleted.
- `demo-seeder/src/referenceSeeder.ts` — dropped `QA_USERS`/`QA_PROFILES` imports, `upsertQaUsersAndProfiles()`, `upsertPlanPendingDemoRow()`, and their call sites in `seedReferenceData()`. Log message updated to omit `QA users` count.
- `demo-seeder/src/cleanup.ts` — dropped `deletedQaUsers` from `CleanupResult`, dropped step 11 (the `DELETE FROM users WHERE email LIKE '%@gymflow.local'` query), simplified the booking-delete WHERE clause to only match `demo.%@gym.demo` users.
- `CLAUDE.md` — Seeded-tables table now shows `users` and `user_profiles` as owned solely by `seeder.ts → registerUsers()`. Rule 3 (fixed reference data list) no longer mentions "QA users".

### Out of scope

- Creating a new test-fixture mechanism to replace the QA pool for future multi-scenario E2E. When needed, the `e2e-seed/` directory (already reserved per the testing-reset SDD) is the intended home.
- Deleting the `admin@gymflow.local` account or changing the V3/V5 bootstrap migrations. Admin remains as the sole `@gymflow.local` user in the dev DB.
