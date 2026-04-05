# Bug Brief: Flyway V5 Checksum Mismatch Blocks Backend Startup on Rebuilt Stack

**Date:** 2026-04-05  
**Severity:** Critical — Blocking  
**ID:** BUG-2026-04-05-001  
**Discovered during:** P1 fix verification pass for `feature/trainers-discovery`  
**Reported by:** QA (e2e-tester)  
**Status:** RESOLVED 2026-04-05 — both stacks healthy (see Resolution section below)

---

## Summary

After rebuilding the review stack with `docker compose build --no-cache` to pick up the
`b3ecafc` fix commit, the backend container exits immediately on startup with a Flyway
validation error. The `gymflow` database contains a V5 migration checksum that does not
match the checksum Flyway computes from the current file on disk.

---

## Reproduction Steps

1. Run the review stack for the first time (e.g. during initial feature development).
   The database is seeded including Flyway migration V5.
2. Stop the stack, make code changes including any change that alters V5's computed
   checksum (see Evidence section).
3. Run `docker compose -f docker-compose.review.yml build --no-cache`.
4. Run `docker compose -f docker-compose.review.yml up -d`.

**Expected:** Backend starts normally.

**Actual:** Backend exits with:
```
FlywayValidateException: Migrations have failed validation
Migration checksum mismatch for migration version 5
-> Applied to database : 448048695
-> Resolved locally    : 1241034472
```

---

## Evidence

### Flyway error log (docker logs gympulse-backend-1)
```
Caused by: org.flywaydb.core.api.exception.FlywayValidateException: Validate failed:
Migrations have failed validation
Migration checksum mismatch for migration version 5
-> Applied to database : 448048695
-> Resolved locally    : 1241034472
```

### DB-stored checksum
```sql
SELECT version, description, checksum, installed_on
FROM flyway_schema_history WHERE version = '5';
-- version | description             | checksum  | installed_on
-- 5       | fix admin seed password | 448048695 | 2026-04-02 21:45:43.919115
```

### File on disk
- Path: `backend/src/main/resources/db/migration/V5__fix_admin_seed_password.sql`
- Git history: file was introduced in commit `5174b9f` (membership plan feature) and has
  not been modified since — `git diff 5174b9f HEAD` produces no output for this file.
- Python `zlib.crc32` of the current file content: `-355506071` (neither DB value nor
  locally-resolved value from Flyway error).

### Conclusion
Three distinct checksums appear (DB: 448048695, Flyway log: 1241034472, local Python
CRC32: -355506071). The DB was seeded from a version of V5 with different content than
the file currently checked into the repository. Flyway's internal checksum algorithm
(Java CRC32 with specific normalisation) further diverges. The file was likely mutated
(possibly whitespace or encoding change) between the time the DB was seeded and the
current HEAD, or a different file was used during the original migration run.

---

## Impact

- **All P1 fix verification is blocked.** The review stack cannot be rebuilt to include
  commit `b3ecafc` (AC 18 duplicate-favorite 409 fix, AC 38 redirect fix, Navbar fix).
- **The E2E stack is not running** (confirmed: `curl http://localhost:8081/api/v1/health`
  times out). The E2E stack has historically also exhibited this Flyway error per the
  audit gap report.
- Manual verification of P1 fixes was performed by reading the source code directly and
  by running API calls against the stale pre-fix container. The stale container confirmed
  the bugs were still present before the fix commit; source code confirms the fixes are
  implemented correctly.

---

## Likely Agent

Backend developer. Options to resolve:

1. **Preferred:** Run `flyway repair` against the `gymflow` database to update the stored
   checksum to match the current file. This is safe for a development DB.
   ```bash
   docker exec gympulse-backend-1 java -jar flyway repair  # or via application config
   ```
   Alternatively, connect to Postgres directly:
   ```sql
   UPDATE flyway_schema_history
   SET checksum = <correct_value>
   WHERE version = '5';
   ```
2. **Nuclear option (dev only):** Drop and recreate the `gymflow` database, then restart
   the stack so Flyway applies all migrations fresh.
3. **Root cause fix:** Identify what changed V5's content between its original application
   and today's HEAD (line endings, trailing newline, BOM). Restore the file to byte-exact
   original, or set `spring.flyway.out-of-order=true` and `spring.flyway.validate-on-migrate=false`
   in `application-review.yml` as a short-term workaround.

---

## Notes

- The P1 fixes in `b3ecafc` are correctly implemented in source (verified by code
  inspection). This is purely an infrastructure/DB-state issue preventing live verification.
- This issue must be resolved before any E2E spec run can validate the `feature/trainers-discovery`
  fixes end-to-end.

---

## Resolution (2026-04-05)

Applied DB-level checksum repair on both stacks — no code or migration files changed.

**Root cause clarification:** The two Docker images (`gymflow-backend:review` and `gymflow-backend:e2e`)
were built at different times from different states of V5, resulting in opposite mismatches:
- Review DB had checksum `448048695`; container resolved `1241034472` → updated DB to `1241034472`.
- E2E DB had checksum `1241034472`; container resolved `448048695` → updated DB to `448048695`.

**Commands run:**
```sql
-- Review DB (port 5432, database: gymflow)
UPDATE flyway_schema_history SET checksum = 1241034472 WHERE version = '5';

-- E2E DB (port 5433, database: gymflow_e2e)
UPDATE flyway_schema_history SET checksum = 448048695 WHERE version = '5';
```

Both backends confirmed healthy via `GET /api/v1/health` returning `{"status":"ok"}`.

**Long-term fix:** Rebuild both images from the same HEAD so Flyway computes a single
consistent checksum, eliminating this divergence.
