# Review: Seeding Consolidation — 2026-04-13

## Blockers (must fix before PR)

- [x] `demo-seeder/src/referenceSeeder.ts:71-98` — `upsertClassTemplatesV17()` uses `ON CONFLICT (name)` but the SDD idempotence table (§3.2) specifies the primary conflict key for V17 templates is `id`, with `name` as fallback. The current single-target `ON CONFLICT (name)` cannot resolve a conflict where the row already exists under the correct UUID but with a renamed `name`. Postgres `ON CONFLICT` supports only one constraint target per statement; the correct implementation is two statements (UPDATE WHERE id = $1, then INSERT … WHERE NOT EXISTS), matching the trainer pattern — or conflict on `(id)` only since V17 rows carry fixed UUIDs and the name unique constraint will prevent duplicates by name anyway. Align with SDD §3.2 and the SQL spec in §3.3.
  Fixed in 0abc368: replaced single `ON CONFLICT (name)` statement with the two-statement UPDATE-by-id-or-name + INSERT-WHERE-NOT-EXISTS pattern, wrapped in BEGIN/ROLLBACK/COMMIT — matches the trainer pattern exactly and is idempotent on both id and name. Trainer upsert is intact and unmodified.

- [x] `demo-seeder/src/data/qaUsers.ts:4` — The comment reads `// bcrypt hash of Admin@1234`. This introduces the cleartext password string into committed source code. The hash itself is fine; the human-readable password hint is the problem. Replace the comment with `// bcrypt hash — see docs/qa/seed-users.md for credentials` or similar, removing the password from source. (`docs/qa/seed-users.md` and `docs/sdd/seeding-consolidation.md` already carry the plaintext; the code file should not add a third location.)
  Fixed in 0abc368: comment now reads `// bcrypt hash — see docs/qa/seed-users.md for credentials`; `docs/qa/seed-users.md` updated to remove the plaintext password line. `grep -R "Admin@1234" demo-seeder/ docs/qa/` returns 0 matches in the worktree files.

## Suggestions (non-blocking)

- **Stale error-guard messages in `seeder.ts` (lines 376, 380)** — After `seedReferenceData()` runs unconditionally before `loadReferenceData()`, the guard messages "Ensure Flyway migrations have run" are no longer accurate. They should read "Ensure `seedReferenceData()` completed successfully" to avoid misleading ops engineers on a post-consolidation stack. Low effort, high clarity value.

- **`upsertClassTemplatesV13` generates a new UUID on every insert attempt** — `gen_random_uuid()` is called as the `$1` value for V13 rows. On the first run this is correct. On a re-run the `ON CONFLICT (name)` branch fires and the new UUID is discarded, so no harm done. However, if a V13 template is ever dropped and re-seeded, it will receive a new UUID, silently breaking any class instances that referenced the old UUID. Consider persisting fixed UUIDs for V13 templates in the data file (matching whatever Postgres assigned on first seed) once the stack has been run once, or documenting this limitation in `docs/sdd/seeding-consolidation.md` §2.1.

- **No transaction wrapping the full reference phase** — Each entity upserts in its own connection grab. A partial failure (e.g., plans succeed, QA users fail) leaves the DB in a partially-seeded state with no rollback path. The trainer upsert correctly wraps per-trainer in a transaction, but the orchestrating `seedReferenceData()` function has no outer transaction. This is acceptable for a dev/demo tool but worth noting; if idempotence is complete (all statements are upserts) the only real risk is a run that emits success for some entities but errors mid-way. Wrapping the six steps in a single transaction would make the function atomic.

## Verdict

APPROVED
