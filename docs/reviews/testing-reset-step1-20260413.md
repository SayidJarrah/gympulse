# Review: Testing Reset Step 1 — 2026-04-13

Reviewed against `docs/sdd/testing-reset.md` Sections 2 (Infrastructure Contracts) and 4.3
(Baseline seed content). No design spec applies (infra/chore path).

---

## Blockers (must fix before PR)

None.

---

## Suggestions (non-blocking)

- **`e2e-seed/baseline.sql` — `ON CONFLICT (id)` is not a true idempotency guard against
  duplicate-name violations.** `class_templates` has `UNIQUE (name)` and `trainers` has
  `UNIQUE (email)`. The seed uses `ON CONFLICT (id) DO NOTHING` throughout, which only fires
  when the primary key already exists. If either a template name or trainer email already exists
  under a different UUID, the INSERT will throw a unique constraint error rather than silently
  skip. In practice this cannot happen on a fresh container start or after `reset.sh` (which
  drops the schema first), but the header comment claims the seed is "safe to apply against a DB
  that already has data (idempotent)." That claim is not fully accurate. Either add a second
  conflict target (e.g. `ON CONFLICT (name) DO NOTHING` for class_templates, `ON CONFLICT
  (email) DO NOTHING` for trainers) or narrow the idempotency comment to state it is safe only
  on a freshly initialised schema. Logged as TD-082 (renumbered on rebase — `main` grew to TD-081).

- **`scripts/cleanup-test-users.sh` — header comment says "Run weekly"; SDD Section 8 calls it
  a "nightly cleanup job".** The SDD is the source of truth. Update the script comment from
  "Run weekly" to "Run nightly" to stay in sync. Logged as TD-083 (renumbered on rebase).

- **`docker-compose.e2e.yml` — Playwright image tag is pinned to `v1.58.2-jammy` before the
  `e2e/` package exists.** SDD Assumption A4 acknowledges this explicitly and defers the version
  alignment to Step 2. No action needed now — just ensure Step 2's PR updates the tag to match
  `e2e/package.json`.

---

## Verdict

APPROVED

All SDD Section 2.1 and 2.2 infrastructure contracts are satisfied. Baseline seed meets all
Section 4.3 quantity and content requirements (2 plans, 2 rooms, 3 trainers, 3 class templates,
10 class instances across the current ISO week Mon–Fri at 09:00 and 11:00 UTC, trainer-to-instance
wiring, no member users, `ON CONFLICT DO NOTHING` throughout). `reset.sh` implements all four
`resetDatabase()` steps in the correct order. `cleanup-test-users.sh` targets the correct email
domain and age threshold. The structural E2E DB defect (`POSTGRES_DB: gymflow` vs
`DB_URL: .../gymflow_e2e`) is fixed. No blockers.
