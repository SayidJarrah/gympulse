# SDD: Seeder Presets

## Reference
- Brief: `docs/briefs/seeder-presets.md`
- Prior SDD (data generation): `docs/sdd/demo-seeder-data-generation.md`
- Prior SDD (credentials & state): `docs/sdd/demo-seeder-credentials-and-state.md`
- Consolidation gap report: `docs/gaps/seeding-consolidation.md`
- Date: 2026-04-13

## Architecture Overview

This feature is scoped entirely to the `demo-seeder/` TypeScript/Node.js service. No Flyway
migrations, no Spring Boot backend changes, no frontend React changes, no E2E test modifications.

The seeder today always passes the full reference-data arrays to Postgres regardless of preset.
This feature adds a `preset` field to `SeederConfig` and propagates it to `referenceSeeder.ts`
so each preset receives a slice of the canonical data arrays. The UI is updated to present the
three presets by their new names with reference-data counts shown, and the "Add on top anyway"
bypass is removed.

Affected files:

| File | Change type |
|------|-------------|
| `demo-seeder/src/seeder.ts` | Extend `SeederConfig` with `preset`; pass slice counts to `seedReferenceData` |
| `demo-seeder/src/referenceSeeder.ts` | Accept and apply `PresetConfig` to slice arrays before upsert |
| `demo-seeder/src/server.ts` | Replace four individual query params with `preset=small\|medium\|large`; add one-seed-lock check |
| `demo-seeder/src/state.ts` | Add `trainers` and `rooms` counts to `DemoState` |
| `demo-seeder/src/data/trainers.ts` | Replace `picsum.photos` URLs with `randomuser.me` portrait URLs |
| `demo-seeder/src/data/rooms.ts` | Expand to 6 rooms (Large Gym capacity); add `imageUrl` field |
| `demo-seeder/src/data/classTemplatesV13.ts` | Add `imageUrl` field to 5 base templates |
| `demo-seeder/src/data/classTemplatesV17.ts` | Add `imageUrl` field to 10 extended templates |
| `demo-seeder/public/index.html` | Rename preset buttons; add reference-data counts; add `trainers`/`rooms` stat cards; remove dismiss button |

---

## §1 — Preset Definitions

The three presets map to concrete values for every dimension of seeding. The server derives
all config from the preset string — the four legacy individual query params (`members`, `weeks`,
`membershipPct`, `densityPct`) are removed from the external API.

| Preset | rooms | trainers | classTemplates | membershipPlans | memberCount | weekCount | membershipPct | densityPct |
|--------|-------|----------|----------------|-----------------|-------------|-----------|---------------|------------|
| `small` | 2 | 3 | 5 | 3 | 10 | 1 | 50 | 30 |
| `medium` | 4 | 6 | 10 | 6 | 25 | 2 | 80 | 60 |
| `large` | 6 | 10 | 15 | 10 | 50 | 4 | 90 | 90 |

**Derivation rules:**

- `rooms` — take the first N entries from `V13_ROOMS` (sorted by array position, which matches
  gym-space narrative order: Studio A, Studio B, Weight Room, Functional Space, Outdoor Terrace,
  Recovery Suite).
- `trainers` — take the first N entries from `TRAINERS` array in `trainers.ts` (current order
  is preserved; the first 3 are Amelia Stone, Marco Alvarez, Priya Nair — a strength, HIIT,
  and yoga specialist, which forms a coherent small-gym roster).
- `classTemplates` — take the first N entries from the combined V13 + V17 template list,
  ordered: V13 templates first (5 entries), then V17 templates in array order. Small gets
  the 5 V13 templates. Medium gets all 5 V13 + first 5 V17. Large gets all 15.
- `membershipPlans` — take the first N entries from `MEMBERSHIP_PLANS` array. The array is
  ordered by ascending price tier: Small gets entry-level plans (Starter, Standard, Unlimited),
  Medium adds Quarterly Saver, Annual Unlimited, Off-Peak Monthly, Large adds all 10.
- `memberCount`, `weekCount`, `membershipPct`, `densityPct` — hardcoded per preset as above.

**TypeScript constant** (new, in `server.ts`):

```typescript
export type Preset = 'small' | 'medium' | 'large';

export const PRESET_CONFIG: Record<Preset, PresetConfig> = {
  small:  { rooms: 2, trainers: 3, classTemplates: 5,  membershipPlans: 3,  memberCount: 10, weekCount: 1, membershipPct: 50, densityPct: 30 },
  medium: { rooms: 4, trainers: 6, classTemplates: 10, membershipPlans: 6,  memberCount: 25, weekCount: 2, membershipPct: 80, densityPct: 60 },
  large:  { rooms: 6, trainers: 10, classTemplates: 15, membershipPlans: 10, memberCount: 50, weekCount: 4, membershipPct: 90, densityPct: 90 },
};

export interface PresetConfig {
  rooms: number;
  trainers: number;
  classTemplates: number;
  membershipPlans: number;
  memberCount: number;
  weekCount: number;
  membershipPct: number;
  densityPct: number;
}
```

The `PresetConfig` type replaces `SeederConfig`. The legacy `SeederConfig` interface in
`seeder.ts` is updated to include `preset: Preset` and the four derived number fields are
preserved as-is so `runSeeder`'s internal logic is unchanged — only the source of those
values changes from parsed query params to `PRESET_CONFIG[preset]`.

---

## §2 — API Changes

### GET /api/generate/stream

**Before:**
```
GET /api/generate/stream?members=25&weeks=2&membershipPct=80&densityPct=60
```

**After:**
```
GET /api/generate/stream?preset=small|medium|large
```

| Param | Type | Required | Default | Valid values |
|-------|------|----------|---------|--------------|
| `preset` | string | No | `medium` | `small`, `medium`, `large` |

An unrecognised preset value falls back to `medium` (same clamping philosophy as before —
never reject, always produce a valid config).

**409 responses (extended):**

| Condition | Response |
|-----------|----------|
| `isGenerating === true` | `{ "error": "Generation already in progress" }` |
| `hasDemoData() === true` | `{ "error": "Demo data already exists. Run cleanup before seeding again.", "code": "DEMO_DATA_EXISTS" }` |

The second 409 is the one-seed lock. `hasDemoData()` is the existing SQLite helper in `db.ts`
that returns true when `demo_users` count > 0. No changes needed to `db.ts`.

**SSE `start` event — updated config payload:**

```json
{
  "type": "start",
  "sessionId": "uuid",
  "config": {
    "preset": "medium",
    "rooms": 4,
    "trainers": 6,
    "classTemplates": 10,
    "membershipPlans": 6,
    "memberCount": 25,
    "weekCount": 2,
    "membershipPct": 80,
    "densityPct": 60
  }
}
```

All other SSE event shapes are unchanged.

---

### GET /api/state

**Before:**
```json
{
  "demoUsers": 20,
  "activeMemberships": 16,
  "classesThisWeek": 48,
  "totalClassInstances": 96,
  "hasData": true
}
```

**After (new fields added):**
```json
{
  "demoUsers": 20,
  "activeMemberships": 16,
  "classesThisWeek": 48,
  "totalClassInstances": 96,
  "hasData": true,
  "trainers": 6,
  "rooms": 4
}
```

| New field | Source | Query |
|-----------|--------|-------|
| `trainers` | Postgres live count | `SELECT COUNT(*) FROM trainers WHERE deleted_at IS NULL AND email LIKE '%@gymflow.local'` |
| `rooms` | Postgres live count | `SELECT COUNT(*) FROM rooms` |

Both queries are added to the parallel `Promise.all` block in `state.ts`. The `DemoState`
interface is extended with `trainers: number` and `rooms: number`.

---

### POST /api/cleanup

The endpoint signature and response shape are unchanged. The implementation in `cleanup.ts`
is extended to also delete reference data. See §6 for the full deletion sequence.

**Response (unchanged shape, updated fields):**
```json
{
  "deletedClassInstances": 48,
  "deletedMemberships": 20,
  "deletedUsers": 25,
  "deletedTrainers": 6,
  "deletedRooms": 4,
  "deletedClassTemplates": 10,
  "deletedMembershipPlans": 6,
  "deletedQaUsers": 10
}
```

The `CleanupResult` interface in `cleanup.ts` is extended with the four new fields. Each
field is `0` if nothing was deleted (not absent from the response — the UI log message
already handles `result.deletedUsers` etc., and the new fields are additive).

---

## §3 — Data Slicing Strategy

The canonical data arrays in `demo-seeder/src/data/` hold the maximum item count for the
Large Gym preset. Smaller presets receive `array.slice(0, N)`.

Slicing is applied in `referenceSeeder.ts` inside `seedReferenceData()`, which now accepts
a `PresetConfig` argument. The upsert helpers (`upsertRooms`, `upsertClassTemplatesV13`,
`upsertClassTemplatesV17`, `upsertTrainers`, `upsertMembershipPlans`) each accept a count
parameter and slice their source array before iterating.

```typescript
// Before (upsertRooms — upserts all rooms unconditionally)
for (const room of V13_ROOMS) { ... }

// After (upserts only the first `count` rooms)
for (const room of V13_ROOMS.slice(0, count)) { ... }
```

**Combined template slicing:** V13 has 5 templates and V17 has 10, total 15 for Large Gym.
The count is distributed as follows:

| Preset | V13 count | V17 count | Total |
|--------|-----------|-----------|-------|
| `small` | 5 | 0 | 5 |
| `medium` | 5 | 5 | 10 |
| `large` | 5 | 10 | 15 |

Rule: V13 templates are always seeded in full for every preset (minimum 5). The V17 count
is `Math.max(0, classTemplates - 5)`. This preserves the V13 baseline that the rest of the
system relies on (E2E `global-setup.ts` validates these 5 templates exist).

**Rooms expansion:** The `V13_ROOMS` array must be expanded from 3 to 6 entries to support
Large Gym. The 3 existing entries are kept at positions 0–2 (name-conflict-safe). Three new
entries are appended at positions 3–5. Small and Medium presets use only positions 0–1 and
0–3 respectively, so the new rooms are invisible to those presets.

New rooms to append (positions 3–5):

| Position | Name | Capacity | Description |
|----------|------|----------|-------------|
| 3 | Functional Space | 18 | Open functional training area with rigs and sleds |
| 4 | Outdoor Terrace | 25 | Covered outdoor training terrace |
| 5 | Recovery Suite | 10 | Dedicated mobility, foam rolling and recovery area |

---

## §4 — Image URLs

All image URLs are deterministic, stable, and require no API key.

> **Fetch failures are not silent.** `fetchPhoto` in `referenceSeeder.ts` emits a `warning` SSE event when the URL returns non-2xx or throws. The row is still inserted with a NULL `photo_data`, but the operator sees the failure in the generation log and can patch the URL list. This rule applies to room images, V13/V17 class-template images, and any future image sources added to the reference seeder.

### Trainer Photos

Pattern: `https://randomuser.me/api/portraits/{men|women}/{N}.jpg`

These URLs are stable CDN assets that return a real photograph at index `N` (0–99).
Gender must match the trainer's apparent gender. Index chosen per trainer to avoid duplicates.

| Trainer | Gender | URL |
|---------|--------|-----|
| Amelia Stone | women | `https://randomuser.me/api/portraits/women/44.jpg` |
| Marco Alvarez | men | `https://randomuser.me/api/portraits/men/32.jpg` |
| Priya Nair | women | `https://randomuser.me/api/portraits/women/67.jpg` |
| Jordan Kim | women | `https://randomuser.me/api/portraits/women/52.jpg` |
| Sofia Rossi | women | `https://randomuser.me/api/portraits/women/28.jpg` |
| Ethan Brooks | men | `https://randomuser.me/api/portraits/men/55.jpg` |
| Layla Haddad | women | `https://randomuser.me/api/portraits/women/73.jpg` |
| Noah Bennett | men | `https://randomuser.me/api/portraits/men/18.jpg` |
| Mina Park | women | `https://randomuser.me/api/portraits/women/81.jpg` |
| Daniel Okafor | men | `https://randomuser.me/api/portraits/men/76.jpg` |

Note on Jordan Kim: the brief specifies gender-appropriate images. Jordan's bio describes
athletic performance coaching. The name is ambiguous — the SDD assigns `women/52` as the
canonical choice. If the brief author has a different intent, this is documented as an
assumption (see §9).

These URLs replace the current `picsum.photos/seed/...` values in `trainers.ts`. Trainers
currently with `profilePhotoUrl: null` (Jordan, Layla, Daniel) gain real URLs. The
`profilePhotoUrl` field in `TrainerRecord` type changes from `string | null` to `string`
(all trainers now have a photo URL).

The upsert SQL in `referenceSeeder.ts` already sets `profile_photo_url = $9` on UPDATE, so
no SQL changes are needed — only the data file values change.

---

### Room Images

The `RoomRecord` interface gains an `imageUrl: string` field. The rooms table in Postgres
already has a `description` column but no `image_url` column. This feature does NOT add an
`image_url` column to the `rooms` table — the seeder only uses image URLs in the UI stats
display and future room cards; they are stored in the data file only, not persisted to the DB.

Unsplash direct photo URLs (`https://images.unsplash.com/photo-{ID}?w=800&auto=format&fit=crop`):

| Room | Photo ID | Subject |
|------|----------|---------|
| Studio A (main group fitness) | `1534438327535-0c01b3c3ea3a` | Bright open fitness studio with group class in session |
| Studio B (spin/cycling) | `1558618666-fcd25c85cd64` | Indoor cycling studio with rows of bikes and dramatic lighting |
| Weight Room | `1571019613454-1cb2f99b2d8b` | Free weights area with barbells, racks and mirrors |
| Functional Space | `1601422407176-00bd94c73b7f` | Open gym floor with suspension trainers and battle ropes |
| Outdoor Terrace | `1571731956672-f9e7ffe66da7` | Outdoor workout terrace with natural light and city backdrop |
| Recovery Suite | `1574680096145-d05b474e2155` | Quiet recovery room with foam rollers and yoga mats |

Full URLs:
- Studio A: `https://images.unsplash.com/photo-1534438327535-0c01b3c3ea3a?w=800&auto=format&fit=crop`
- Studio B: `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop`
- Weight Room: `https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop`
- Functional Space: `https://images.unsplash.com/photo-1601422407176-00bd94c73b7f?w=800&auto=format&fit=crop`
- Outdoor Terrace: `https://images.unsplash.com/photo-1571731956672-f9e7ffe66da7?w=800&auto=format&fit=crop`
- Recovery Suite: `https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop`

---

### Class Template Images

Both `ClassTemplateRecord` (V13) and `ClassTemplateV17Record` (V17) gain an `imageUrl: string`
field. Same storage approach as rooms — data-file only, not persisted to `class_templates`
in Postgres (the DB table has no `image_url` column and this feature does not add one).

One URL per class category, applied to all templates of that category:

| Category | Photo ID | Subject |
|----------|----------|---------|
| HIIT / Cardio | `1571019614242-e66b2ee5f68b` | High-intensity group workout in a modern studio |
| Yoga / Mind & Body / Flexibility | `1506629082153-54e546b5a358` | Yoga class in warrior pose, warm studio lighting |
| Strength | `1534367990453-3bcd4d4f8a9f` | Barbell squat in a well-lit weight room |
| Spin / Cycling | `1558618666-fcd25c85cd64` | Indoor cycling studio (same as Studio B — appropriate) |
| Pilates / Core | `1518611012118-696072aa579a` | Pilates reformer class in a bright studio |
| Functional | `1605296867304-46d5465a13f1` | Functional movement class with kettlebells |
| Combat / Boxing | `1549824846-7a83ffc5b7da` | Boxing class with gloves and bags |
| Dance | `1571019613454-1cb2f99b2d8b` | Dance fitness class — energetic group shot |
| Wellness / Meditation | `1544367567-0f2fcb009e0b` | Meditation class seated on mats, calm lighting |
| Aqua | `1571019613975-0b56b2bcf1f8` | Aqua aerobics class in a pool |

Full template → URL assignment:

**V13 templates:**
- HIIT Bootcamp → `https://images.unsplash.com/photo-1571019614242-e66b2ee5f68b?w=800&auto=format&fit=crop`
- Yoga Flow → `https://images.unsplash.com/photo-1506629082153-54e546b5a358?w=800&auto=format&fit=crop`
- Spin Cycle → `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop`
- Strength & Conditioning → `https://images.unsplash.com/photo-1534367990453-3bcd4d4f8a9f?w=800&auto=format&fit=crop`
- Pilates Core → `https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop`

**V17 templates:**
- Sunrise Stretch → `https://images.unsplash.com/photo-1506629082153-54e546b5a358?w=800&auto=format&fit=crop`
- Power Yoga → `https://images.unsplash.com/photo-1506629082153-54e546b5a358?w=800&auto=format&fit=crop`
- Functional Circuit → `https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&auto=format&fit=crop`
- Boxing Fundamentals → `https://images.unsplash.com/photo-1549824846-7a83ffc5b7da?w=800&auto=format&fit=crop`
- Dance Cardio Blast → `https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop`
- Aqua Flow → `https://images.unsplash.com/photo-1571019613975-0b56b2bcf1f8?w=800&auto=format&fit=crop`
- Cycle Endurance → `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop`
- Core Ignite → `https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop`
- Meditation Reset → `https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop`
- Mobility Lab → `https://images.unsplash.com/photo-1506629082153-54e546b5a358?w=800&auto=format&fit=crop`

---

## §5 — One-Seed Lock

**Behaviour:** If `hasDemoData()` returns `true` when `GET /api/generate/stream` is called,
the server returns HTTP 409 immediately — before any SSE headers are sent — and does not
begin generation.

**Implementation in `server.ts`:**

```typescript
app.get('/api/generate/stream', async (req: Request, res: Response) => {
  if (isGenerating) {
    res.status(409).json({ error: 'Generation already in progress' });
    return;
  }
  // NEW: one-seed lock
  if (hasDemoData()) {
    res.status(409).json({
      error: 'Demo data already exists. Run cleanup before seeding again.',
      code: 'DEMO_DATA_EXISTS',
    });
    return;
  }
  // ... remainder unchanged
});
```

`hasDemoData()` is already exported from `db.ts`. No changes needed to `db.ts`.

**UI enforcement:** The Generate button must be disabled when `state.hasData === true`.
The warning banner's "Add on top anyway" button (`onclick="dismissWarning()"`) is removed.
Only the "Clean up first" button remains in the warning banner.

The `startGenerate()` function in `index.html` already checks `btn.disabled`. The caller
must not enable the Generate button when the warning banner is visible. Implementation:
in `updateWarningBanner()`, when `state.hasData`:
1. Show the warning banner (existing behaviour).
2. Call `document.getElementById('generateBtn').disabled = true` (new).

When the banner is hidden (state has no data), re-enable the button:
3. Call `document.getElementById('generateBtn').disabled = false` (new).

If the user dismisses the warning via cleanup, `loadState()` is called after cleanup
completes and `updateWarningBanner` will re-enable the button automatically.

---

## §6 — Cleanup Extension

The existing `runCleanup()` deletes dynamic data (class instances, memberships, users).
It must now also delete seeded reference data in FK-safe order.

**Full deletion sequence (single transaction):**

```
1. class_instance_trainers  — via CASCADE on class_instances delete (already handled)
2. class_instances          — DELETE WHERE id = ANY(tracked IDs) + safety-net email pattern (existing)
3. user_memberships         — DELETE WHERE id = ANY(tracked IDs) (existing)
4. users                    — DELETE WHERE id = ANY(tracked IDs) + safety-net email pattern (existing)
5. class_instances          — DELETE WHERE template_id IN (seeded template IDs)
                              [catches any class instances referencing templates about to be deleted;
                               needed because referenceSeeder may have seeded templates consumed
                               by a prior run that wasn't tracked]
6. class_templates          — DELETE WHERE is_seeded = TRUE AND id NOT IN (V13 baseline IDs)
                              [V13 templates are the 5 baseline templates; they are re-seeded
                               unconditionally and should also be removed so a fresh seed starts clean]
                              Simplification: DELETE WHERE is_seeded = TRUE (all seeded templates)
7. class_instance_trainers  — already handled by CASCADE in step 5
8. trainers                 — DELETE WHERE email LIKE '%@gymflow.local' AND deleted_at IS NULL
9. rooms                    — DELETE WHERE name IN (known seeded room names)
                              [rooms table has no `is_seeded` flag; names are the safe discriminator]
10. user_memberships        — DELETE WHERE plan_id IN (seeded plan IDs)
                              [catches memberships for non-tracked users that used seeded plans]
11. membership_plans        — DELETE WHERE id = ANY(known seeded plan UUIDs)
12. users (QA)              — DELETE WHERE email LIKE '%@gymflow.local' AND email != 'admin@gymflow.local'
                              [QA users from qaUsers.ts, identified by @gymflow.local domain]
13. user_profiles           — CASCADE via users delete (no separate step needed if FK has CASCADE)
```

**Seeded room names** (discriminator for step 9):
```
'Studio A', 'Studio B', 'Weight Room', 'Functional Space', 'Outdoor Terrace', 'Recovery Suite'
```

These are hardcoded in `cleanup.ts` matching the names in `rooms.ts`. If a name ever changes
in the data file, the cleanup list must be updated in the same PR.

**Seeded plan UUIDs** (discriminator for step 11): all 10 IDs from `membershipPlans.ts`
(prefix `22222222-2222-2222-2222-2222222222{01..10}`). These are imported and passed as an
array to the DELETE query.

**FK constraint assumptions:**

- `class_instances.template_id` references `class_templates(id)` — constraint is RESTRICT by
  default (no CASCADE). Step 5 deletes class instances first; step 6 deletes templates.
- `class_instances.room_id` references `rooms(id)` — RESTRICT. Step 5 already clears class
  instances before step 9 deletes rooms.
- `class_instance_trainers.trainer_id` references `trainers(id)` — RESTRICT. Step 5 already
  removed all class instances (and their trainer rows cascade or are covered by step 5's
  DELETE on class_instances which cascades to class_instance_trainers).
- `user_memberships.plan_id` references `membership_plans(id)` — RESTRICT. Step 10 deletes
  memberships first; step 11 deletes plans.

**Caveat:** The cleanup deletes ALL seeded reference data regardless of what the current preset
was. A Medium-preset seed creates 6 rooms; cleanup deletes all 6 known room names. This is
intentional — a clean-slate cleanup is simpler and safer than partial cleanup.

**Updated `CleanupResult` interface:**

```typescript
export interface CleanupResult {
  deletedClassInstances: number;
  deletedMemberships: number;
  deletedUsers: number;
  deletedTrainers: number;
  deletedRooms: number;
  deletedClassTemplates: number;
  deletedMembershipPlans: number;
  deletedQaUsers: number;
}
```

---

## §7 — State Response Extension

`DemoState` interface in `state.ts`:

```typescript
export interface DemoState {
  demoUsers: number;
  activeMemberships: number;
  classesThisWeek: number;
  totalClassInstances: number;
  hasData: boolean;
  trainers: number;   // NEW
  rooms: number;      // NEW
}
```

New Postgres queries added to the `Promise.all` in `getState()`:

```sql
-- trainers
SELECT COUNT(*) AS cnt
FROM trainers
WHERE deleted_at IS NULL
  AND email LIKE '%@gymflow.local'

-- rooms
SELECT COUNT(*) AS cnt
FROM rooms
```

Both queries are cheap (single-table scans with no joins). They are added to the existing
`Promise.all` block and their results are destructured alongside `membershipsRes` and
`weekClassesRes`.

---

## §8 — Migration Path

### Data arrays

The current 10-trainer array in `trainers.ts` maps directly to the Large Gym slice. Ordering
is preserved — no reordering required. The first 3 trainers (Amelia, Marco, Priya) cover
strength, HIIT, and yoga — a coherent Small Gym roster.

The current 3-room array in `rooms.ts` covers positions 0–2 (Small Gym uses 0–1, Medium uses
0–3 after expansion). Three new rooms are appended at positions 3–5. No existing room entries
are moved or renamed.

The current 10 membership plans cover positions 0–9. Small uses positions 0–2 (Starter,
Standard, Unlimited Monthly). Medium uses positions 0–5. Large uses all 10.

### Backwards compatibility

The legacy query params (`members`, `weeks`, `membershipPct`, `densityPct`) on
`GET /api/generate/stream` are removed. Any client hardcoding those params (e.g. a
bookmarked URL) will receive a `medium` preset response (default fallback).

The `SeederConfig` type exported from `seeder.ts` gains a `preset` field. The `config` JSON
payload in the SSE `start` event gains `preset`, `rooms`, `trainers`, `classTemplates`, and
`membershipPlans` fields. Old UI polling these fields will see them as unknown but will not
break (JavaScript object access on unknown keys returns `undefined`, not an error).

---

## §9 — Task List

### developer (implementation)

- [ ] Expand `V13_ROOMS` in `demo-seeder/src/data/rooms.ts` to 6 entries; add `imageUrl` field
- [ ] Update `TrainerRecord` in `demo-seeder/src/data/trainers.ts`: change `profilePhotoUrl` to non-null; replace all 10 `picsum.photos` URLs with `randomuser.me` portrait URLs from §4
- [ ] Add `imageUrl` field to `ClassTemplateRecord` in `classTemplatesV13.ts`; populate per §4
- [ ] Add `imageUrl` field to `ClassTemplateV17Record` in `classTemplatesV17.ts`; populate per §4
- [ ] Add `Preset`, `PresetConfig`, `PRESET_CONFIG` to `server.ts`; update `SeederConfig` in `seeder.ts` with `preset` field
- [ ] Update `referenceSeeder.ts`: add `PresetConfig` parameter to `seedReferenceData()`; pass slice counts to each upsert helper; update all upsert helpers to accept and apply count
- [ ] Update `server.ts` `GET /api/generate/stream`: replace 4 query params with `preset`; add `hasDemoData()` 409 check before SSE headers
- [ ] Update `state.ts`: add `trainers` and `rooms` Postgres queries; extend `DemoState`
- [ ] Update `cleanup.ts`: extend deletion sequence per §6; update `CleanupResult` interface
- [ ] Update `public/index.html`: rename preset buttons to Small/Medium/Large; add reference-data counts sub-line; remove "Add on top anyway" button; add Trainers and Rooms stat cards; disable Generate button when `state.hasData`
- [ ] Manual smoke test: seed Small, verify counts, cleanup, verify state zeroed
- [ ] Manual smoke test: seed Large, verify all 10 trainers and 6 rooms present, cleanup

---

## §10 — Risks & Notes

**Assumptions made:**

1. **Jordan Kim gender assignment** — name is ambiguous. SDD assigns `women/52` portrait.
   Treat as a known assumption; reverse if product owner specifies male.

2. **`class_instance_trainers` FK** — assumed `ON DELETE CASCADE` from `class_instances`.
   If the constraint is `RESTRICT`, step 5 of cleanup must be split into (a) delete
   `class_instance_trainers` first, then (b) delete `class_instances`. Developer must
   verify against Flyway migrations before implementing §6.

3. **`user_profiles` FK** — assumed `ON DELETE CASCADE` from `users`. If RESTRICT, a
   separate DELETE on `user_profiles` is required before deleting QA users.

4. **`rooms` table has no `is_seeded` flag** — cleanup uses name matching. If an operator
   creates a room with the same name as a seeded room, cleanup will delete that room too.
   Accepted as low risk for a demo-only internal tool.

5. **Unsplash photo IDs** — IDs listed in §4 are known public Unsplash photos as of
   2026-04-13. Unsplash does not guarantee URL stability for photos that are deleted by
   their authors. If a URL returns 404, it fails gracefully (broken image in UI only;
   no runtime error). Deterministic fallback: the `description` field still describes the
   space/class type.

6. **`rooms` table `image_url` column absent** — image URLs for rooms and templates are
   stored in the TypeScript data files only, not in Postgres. If the frontend needs to
   display room/template images from the API, a separate schema change + SDD update will
   be required. This feature does not add DB columns.

7. **QA users cleanup scope** — step 12 in §6 deletes all `%@gymflow.local` users except
   admin. This includes QA users seeded by `referenceSeeder.ts`. This is intentional —
   a clean-slate means no QA users either. They are re-seeded on the next generate run.

8. **The `seeding-consolidation` gap report** recommended keeping V13 templates in Flyway.
   This SDD supersedes that recommendation for the demo-seeder context: since
   `chore/seeding-consolidation` migrated V13 into `referenceSeeder.ts`, all 15 templates
   (including the 5 V13 ones) are now owned by the seeder and are deleted on cleanup.
   The E2E stack does not use demo-seeder and is unaffected.
