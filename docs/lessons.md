# GymPulse — Project Lessons

Lessons learned from corrections and mistakes. Loaded at every session start via CLAUDE.md.
Each lesson is a rule, not a description. After every 10 new lessons, consolidate similar ones.

## Format

```
## Lesson N — {short title}
Date: YYYY-MM-DD
Correction: {what the user said or did}
Rule: {instruction to future Claude — specific and actionable}
Applies when: {situation where this rule kicks in}
```

---

<!-- Add lessons below this line -->

## Lesson 8 — Never edit files in the main working directory when using worktrees
Date: 2026-04-13
Correction: Edited CLAUDE.md directly in the main working directory, then copied it into the worktree. After the PR merged, the main directory still showed CLAUDE.md as modified because the change was never committed there.
Rule: Create the worktree FIRST. Make ALL edits inside the worktree directory. Never touch files in the main working directory as part of branch work — not even as a "quick edit before creating the worktree."
Applies when: Any time branch work involves file changes, regardless of how small the change is.

## Lesson 7 — Rebuild E2E containers after code changes before re-running tests
Date: 2026-04-06
Correction: After fixing a source-code bug, PROFILE-01 and PROFILE-02 still failed because the E2E frontend container was serving a Vite bundle that predated the fix commit. The tests ran against stale compiled code and the "fix" appeared not to have taken effect.
Rule: After any code change on a fix branch, rebuild the affected E2E container(s) before re-running the test suite. Frontend changes: `docker compose -f docker-compose.e2e.yml up -d --build frontend`. Backend changes: `docker compose -f docker-compose.e2e.yml up -d --build --force-recreate backend`. Confirm the container was recreated (not just "Running") in the compose output. Never declare a fix "didn't work" until the relevant container has been rebuilt with the new code.
Applies when: Re-running E2E tests after making source-code changes during a fix loop. Extends Lesson 2 (stale stack check applies to the E2E stack, not just the review stack).

## Lesson 6 — Test preconditions that assume global DB emptiness are fragile
Date: 2026-04-05
Correction: After fixing the E2E cleanup endpoint, AC-09 ("when no active plans exist") still failed — not because of dirty DB state, but because global-setup unconditionally re-seeds plans after cleanup. The test assumed zero plans would exist at run time, which is structurally impossible given the seed.
Rule: When a test requires a specific DB state (e.g. "no active plans"), do not rely on cleanup alone to establish that state if global-setup seeds data unconditionally. Use test-local setup (seed only what the test needs, cancel/delete it in afterEach) or a dedicated fixture that creates then tears down the exact precondition. Never write a test whose precondition contradicts what the shared seed guarantees.
Applies when: Writing or reviewing E2E tests that depend on the absence of a resource (no plans, no trainers, no bookings) or on a specific count of resources.

## Lesson 5 — Verify external tool capabilities before writing a plan that depends on them
Date: 2026-04-05
Correction: The Figma migration plan (Phase 3) assumed Figma MCP had write access to design content. It does not — Figma's REST API is read-only for frames, components, and styles. The blocker was only discovered at execution time.
Rule: Before writing any plan that depends on an external API or MCP tool, verify the tool's actual operation list covers the required use cases. If uncertain, mark the capability as an assumption and validate it as the first step of the plan — not mid-execution. Never write "agent creates X via MCP" without confirming the MCP exposes a create/update tool for X.
Applies when: Any plan that requires an agent to write to an external system (Figma, GitHub, Jira, etc.) via MCP or REST API.

## Lesson 4 — Resolve contradictions by UX intent, not majority vote
Date: 2026-04-05
Correction: A three-way contradiction (code `/home`, SDD `/classes`, E2E `/plans`) was resolved by picking the value two sources agreed on (`/plans`), ignoring correct UX. A member with an active plan landing on the purchase page on every login is disruptive.
Rule: When sources contradict each other, do not resolve by majority vote. Reason about user intent first: what state is the user in, and where does it make sense to send them? If the answer requires product judgement that cannot be derived from the docs, stop and ask the user before committing to one path.
Applies when: Any time code, SDD, design spec, or E2E tests disagree on a user-facing behaviour — especially navigation, redirects, or flow branching.

## Lesson 3 — Never commit directly to main
Date: 2026-04-05
Correction: A workflow fix was committed directly to main instead of going through a PR.
Rule: All commits must go to a feature/fix/chore branch and merge via PR. Before committing, check the current branch with `git branch --show-current`. If it is `main`, stop — create or switch to an appropriate branch first.
Applies when: Any time code, config, or docs changes are about to be committed.

## Lesson 2 — Always check if running stack is stale before declaring it ready
Date: 2026-04-05
Correction: User pointed out the running stack was 22 hours old and therefore not running the latest code changes.
Rule: When `/run` finds the stack already running, compare container start time against last git commit timestamp. If containers are older than the last commit, treat it as stale and rebuild before reporting success. Never report "stack is running" without confirming it reflects the current code.
Applies when: `/run` finds ports already occupied by Docker containers.

## Lesson 1 — Update review doc when blockers are fixed
Date: 2026-04-05
Correction: User noticed the review doc still showed blockers as `[ ]` after they had been fixed, making the PR state look blocked when it was actually clear.
Rule: After fixing reviewer blockers, always update `docs/reviews/{feature}-{date}.md` — mark each blocker `[x]` with a one-line note of the fix applied, and change the Verdict from BLOCKED to APPROVED. Commit the updated doc to the PR branch before declaring the PR clean.
Applies when: Any time reviewer blockers are resolved during the fix loop or manually.
