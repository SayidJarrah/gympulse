# Prompt: implement {feature-slug}

Stage 3 of the GymFlow delivery pipeline: Implementation.

Feature slug: {ARGUMENTS}
SDD: docs/sdd/{ARGUMENTS}.md

Read docs/sdd/{ARGUMENTS}.md fully before starting.
Do not implement anything not listed in the SDD task lists.

## Step 1 — Backend (backend-developer agent)

Use the backend-developer agent with this instruction:
"Read the full SDD at docs/sdd/{ARGUMENTS}.md.
Implement every item in the '→ backend-dev' task list, in this order:
1. Flyway migration (Section 1)
2. Kotlin entities and DTOs (Section 3)
3. Repository interfaces
4. Service layer with business logic
5. Controller with endpoints matching Section 2 exactly
6. Unit tests for the service (happy path + all error cases from Section 2)
Follow all conventions in AGENTS.md and kotlin-conventions.
After completing, update the Backend and Tests columns in AGENTS.md to ✅."

Confirm backend implementation is complete before continuing to Step 2.

## Step 2 — Frontend (frontend-developer agent)

Check whether a design spec exists at docs/design/{ARGUMENTS}.md.

Use the frontend-developer agent with this instruction:
"Read the full SDD at docs/sdd/{ARGUMENTS}.md.
[If design spec exists:] Also read docs/design/{ARGUMENTS}.md — implement every
screen and component exactly as specified. Follow the design system at docs/design/system.md.
[If no design spec:] Follow docs/design/system.md if it exists, otherwise use
patterns consistent with existing components.
Implement every item in the '→ frontend-dev' task list:
1. TypeScript types matching backend DTOs exactly (Section 4)
2. Axios API functions (Section 4)
3. Zustand store additions (Section 4)
4. Custom hooks
5. Page components and sub-components (Section 4 / design spec)
6. Route registration in App.tsx
Handle every error code from Section 2 with a user-friendly message.
After completing, update the Frontend column in AGENTS.md to ✅."

Confirm frontend implementation is complete before continuing to Step 3.

## Step 3 — E2E spec (e2e-tester agent)

Use the e2e-tester agent with this instruction:
"Read docs/prd/{ARGUMENTS}.md (acceptance criteria) and docs/sdd/{ARGUMENTS}.md
(API contract and error codes).
Write frontend/e2e/{ARGUMENTS}.spec.ts covering every acceptance criterion.
Do NOT run the suite yet — Step 4 will do that.
After saving the spec, update the E2E column in AGENTS.md to ✅ for {ARGUMENTS}."

## Step 4 — Verify

Run the E2E suite:
```bash
docker-compose -f docker-compose.e2e.yml run --rm playwright
```

If E2E tests fail and the e2e-tester reports an app bug, follow this fix loop.
Do not invoke frontend-developer or backend-developer with an open-ended "fix it" instruction.

### Fix Loop (max 3 iterations)

1. Confirm the e2e-tester has written a bug brief to docs/bugs/. If not, invoke
   e2e-tester to produce one first.
2. Read the bug brief. If scope > 3 files, stop and escalate to solution-architect
   before any fix attempt.
3. Invoke the fixing agent (frontend-developer or backend-developer) in Bug Fix Mode:
   "Read the bug brief at docs/bugs/{bug-brief-filename} and fix the issue.
   You are in Bug Fix Mode — stay within the files and proposed fix listed in the brief."
4. Re-run the E2E suite.
5. Tests pass → continue to Step 5. Tests still fail → next iteration.

After 3 failed iterations: stop. Report to the user with the last bug brief path
and iteration history. Do not continue to Step 5.

## Step 5 — PR

Create a pull request for the completed feature:
- Branch: feature/{ARGUMENTS}
- Title: feat({ARGUMENTS}): <one-line description from SDD>
- Draft: true

PR body:
```
## Summary
- Brief bullet points of what was built

## Files changed
### Backend
- List of Kotlin/SQL files

### Frontend
- List of TypeScript/TSX files

### E2E
- frontend/e2e/{ARGUMENTS}.spec.ts — N tests

## Test coverage
- Unit tests: N, covering X
- E2E: N passed

## Acceptance criteria
- ✅/❌ per PRD criterion

## How to test
1. Start the stack, then run the E2E suite
2. Key flows to verify manually
```

## When done, report:
- All files created (backend / frontend / e2e)
- Test results summary
- Any PRD acceptance criteria that could not be implemented (flag as risk)
- PR URL
