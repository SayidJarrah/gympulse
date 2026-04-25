# Review: Seeder Presets — 2026-04-13

## Blockers (must fix before PR)

- [x] `seeder.ts:386` — SSE `start` event config payload is missing `rooms`, `trainers`, `classTemplates`, and `membershipPlans` fields. `SeederConfig` only carries `{ preset, memberCount, weekCount, membershipPct, densityPct }`, so the emitted config object diverges from the SDD §2 start-event shape. Operators watching the SSE stream cannot confirm which reference-data slice was applied. Fix: either extend `SeederConfig` to carry all 8 fields (populate from `PRESET_CONFIG[preset]` in `server.ts` before calling `runSeeder`), or spread `presetConfig` into the emit call: `emit('start', { sessionId, config: { preset, ...presetConfig, memberCount: config.memberCount, weekCount: config.weekCount, membershipPct: config.membershipPct, densityPct: config.densityPct } })`. — Fixed: added `const presetConfig = PRESET_CONFIG[config.preset]` and changed emit to `emit('start', { sessionId, config: { ...config, ...presetConfig } })`, producing all 9 SDD §2 fields.

## Suggestions (non-blocking)

- `index.html:181` — Warning banner condition is `state.hasData && state.demoUsers > 0`. The SDD §5 states "the Generate button must be disabled when `state.hasData === true`". If a partial run seeds reference data but registers zero demo users (possible on crash mid-run), `hasData` becomes true but `demoUsers` stays 0, leaving the Generate button enabled in the UI while the server-side 409 lock fires. The server lock prevents actual double-seeding, but the UX is confusing — the user clicks Generate and gets a 409 error banner rather than a visual block. Simplify the condition to `if (state.hasData)` to match the SDD and close the visual gap.

- `cleanup.ts:77-113` — Class instances that reference a seeded room but a non-seeded template are not deleted in step 5 (the DELETE WHERE template_id IN seeded templates). If such orphan rows exist, the rooms DELETE at step 10 will fail with an FK constraint violation and roll back the entire transaction, leaving a partially-deleted state. This scenario is low-probability in a demo environment, but a safety-net DELETE (`DELETE FROM class_instances WHERE room_id = ANY(SELECT id FROM rooms WHERE name = ANY($1))`) before step 10 would close the gap entirely.

- `referenceSeeder.ts:291` — `upsertClassTemplatesV13` hardcodes the count argument to `5` rather than using the floor derived from `presetConfig.classTemplates`. This is correct today because V13 is always seeded in full, but the hardcoded literal is a silent invariant that could mislead a future developer changing the slicing logic. A named constant `V13_TEMPLATE_COUNT = 5` (or deriving it as `V13_CLASS_TEMPLATES.length`) would make the intent explicit and keep the code self-consistent with the rest of the slicing strategy.

- `state.ts:42-46` — The `rooms` query counts all rows in the `rooms` table (`SELECT COUNT(*) FROM rooms`) rather than only the seeded room names. If the target gym database already has operator-created rooms before the demo seed runs, the `rooms` stat card will report inflated counts. The SDD §7 specifies this exact query, so this is faithful to the spec; logging it here as a known limitation that should be noted in SDD §10 Risks.

## Verdict

APPROVED
