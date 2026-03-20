# File: .claude/commands/rollback.md

Perform a safe rollback for: $ARGUMENTS
(Describe what went wrong, e.g. "cancellation window feature — broke startup")

## Step 1 — Identify what to revert
Run `git log --oneline -20` and identify the commit(s) that introduced
the broken feature. List them before doing anything.

## Step 2 — Revert the code
Use `git revert <hash>` for each commit, newest first.
Never use git reset on a pushed branch.

## Step 3 — Undo the database changes
Check if any Flyway migrations were added in the reverted commits.
If yes, write a new forward migration V{next}__revert_{description}.sql
that contains the inverse SQL (DROP TABLE, DROP COLUMN, etc.).
Never edit or delete existing migration files.

## Step 4 — Update CLAUDE.md
Find the feature row in the Implementation Status table.
Reset any columns that no longer reflect reality back to ❌.
If the feature is fully scrapped, add a note in the row: "reverted — see V{N}".

## Step 5 — Verify
Run the backend: ./gradlew bootRun
Confirm startup succeeds and the reverted behaviour is gone.
Run ./gradlew test — all tests must pass.

Report: which commits were reverted, which migration was written, what was
updated in CLAUDE.md.