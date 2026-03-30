You are running Stage 3 of the GymFlow delivery pipeline: Implementation.

SDD to implement from: $ARGUMENTS
(Pass the feature slug, e.g. "class-booking". The SDD is at docs/sdd/$ARGUMENTS.md)

Read docs/sdd/$ARGUMENTS.md fully before starting. Do not implement anything
not listed in the SDD task lists.

## Step 1 — Backend (backend-dev agent)

Use the backend-dev agent with this instruction:
"Read the full SDD at docs/sdd/$ARGUMENTS.md.
Implement every item in the '→ backend-dev' task list, in this order:
1. Flyway migration (Section 1)
2. Kotlin entities and DTOs (Section 3)
3. Repository interfaces
4. Service layer with business logic
5. Controller with endpoints matching Section 2 exactly
6. Unit tests for the service (happy path + all error cases from Section 2)
   Follow all conventions in CLAUDE.md and the kotlin-conventions skill.
   After completing, update the Backend and Tests columns in CLAUDE.md to ✅."

Confirm backend implementation is complete before continuing to Step 2.

## Step 2 — Frontend (frontend-dev agent)

Check whether a design spec exists at `docs/design/$ARGUMENTS.md`.
If it exists, include it in the instruction below. If not, proceed without it
(the design step is optional — frontend-dev will use sensible defaults).

Use the frontend-dev agent with this instruction:

```text
Read the full SDD at docs/sdd/$ARGUMENTS.md.
[If design spec exists:] Also read docs/design/$ARGUMENTS.md — implement every
screen and component exactly as specified there. Follow the design system at
docs/design/system.md (colors, typography, spacing, component patterns).
[If no design spec:] Follow the design system at docs/design/system.md if it
exists, otherwise use sensible defaults consistent with existing components.
```
Implement every item in the '→ frontend-dev' task list:
1. TypeScript types matching backend DTOs exactly (Section 4)
2. Axios API functions (Section 4)
3. Zustand store additions (Section 4)
4. Custom hooks
5. Page components and sub-components (Section 4 / design spec)
6. Route registration in App.tsx
   Handle every error code from Section 2 with a user-friendly message.
   Follow all conventions in CLAUDE.md and the react-conventions skill.
   After completing, update the Frontend column in CLAUDE.md to ✅."

## Step 2.5 — E2E spec (e2e-tester agent)

Use the e2e-tester agent with this instruction:
"Read the PRD at docs/prd/$ARGUMENTS.md (acceptance criteria) and the SDD at
docs/sdd/$ARGUMENTS.md (API contract + error codes).
Write frontend/e2e/$ARGUMENTS.spec.ts covering every acceptance criterion.
Do NOT run the suite yet — /verify will do that after the PR is created.
When the spec file is written, update the E2E column in CLAUDE.md to ✅ for $ARGUMENTS."

## Step 3 — Quality gate

Run the /review command scoped to all files created in Steps 1, 2, and 2.5.
Fix any issues before continuing.

## Step 4 — Verify

Run /verify $ARGUMENTS

If any E2E tests fail and the e2e-tester reports an app bug, follow this
structured fix loop — **do not invoke frontend-dev or backend-dev directly
with an open-ended "fix it" instruction**:

### Fix Loop (max 3 iterations)

**Iteration start:**
1. Confirm the e2e-tester has written a bug brief to `docs/bugs/`. If not,
   invoke e2e-tester to produce one before proceeding.
2. Read the bug brief. Check "Estimated scope" — if scope is >3 files,
   stop and escalate to solution-architect before any fix attempt.
3. Invoke the fixing agent (frontend-dev or backend-dev) in Bug Fix Mode:
   "Read the bug brief at docs/bugs/{bug-brief-filename} and fix the issue.
   You are in Bug Fix Mode — stay within the files and proposed fix listed in the brief."
4. Re-run /verify $ARGUMENTS.
5. If tests pass → continue to Step 5.
   If tests still fail → go back to step 1 of the next iteration.

**After 3 failed iterations:** Stop. Do not continue to Step 5.
Report to the user with the last bug brief path and the iteration history.
Tell the user: "Three fix attempts failed. Manual review required before proceeding."

## Step 5 — GitHub PR

Use the GitHub MCP to create a pull request:

1. Check current git status and stage all files created or modified in Steps 1–2.5:
   ```bash
   git checkout -b feature/$ARGUMENTS
   git add <all new/modified files>
   git commit -m "feat($ARGUMENTS): implement feature

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
   git push -u origin feature/$ARGUMENTS
   ```

2. Create a draft PR using the GitHub MCP (`mcp__github__create_pull_request`) with:
   - **title:** `feat($ARGUMENTS): <one-line description from SDD>`
   - **head:** `feature/$ARGUMENTS`
   - **base:** `main`
   - **draft:** true
   - **body:** structured summary (see template below)

PR body template:
```
## Summary
- Brief bullet points of what was built (backend endpoints, frontend pages/components)

## Files changed
### Backend
- List of Kotlin/SQL files created

### Frontend
- List of TypeScript/TSX files created

### E2E
- frontend/e2e/$ARGUMENTS.spec.ts — N tests covering acceptance criteria

## Test coverage
- Number of unit tests, what they cover
- Number of E2E specs, pass/fail summary

## Quality gate
- Issues found and fixed by /review, or "No issues found"

## Acceptance criteria
- ✅/❌ per PRD criterion

## How to test
1. Run `/run $ARGUMENTS` to start the stack, then `/verify $ARGUMENTS`
2. Key flows to verify manually

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## When done, report:
- All files created (grouped by backend / frontend)
- Test results summary
- Any issues found and fixed by /review
- Any PRD acceptance criteria that could not be implemented (flag as risk)
- PR URL
