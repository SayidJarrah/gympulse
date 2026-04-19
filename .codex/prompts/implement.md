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

## Step 3 — E2E spec (tester agent)

Use the tester agent with this instruction:
"Read docs/prd/{ARGUMENTS}.md and docs/sdd/{ARGUMENTS}.md.
Write e2e/specs/{ARGUMENTS}.spec.ts covering the primary happy-path user journey
for this feature — one scenario. Do not mirror every AC.
Do NOT run the suite yet — Step 4 will do that."

## Step 4 — Verify

Run the E2E suite:
```bash
docker compose -f docker-compose.e2e.yml up -d --build
cd e2e && npm ci && E2E_BASE_URL=http://localhost:5174 npx playwright test
```

If the spec fails and the tester reports an app bug, follow this fix loop.
Do not invoke developer with an open-ended "fix it" instruction.

### Fix Loop (max 3 iterations)

1. Confirm the tester has reported the failure with a specific file + error excerpt.
2. If the required fix scope > 3 files, stop and escalate to solution-architect
   before any fix attempt.
3. Invoke the developer agent in Bug Fix Mode:
   "Fix the failing spec at e2e/specs/{ARGUMENTS}.spec.ts. Error excerpt: {...}.
   Fix scope: {files}. You are in Bug Fix Mode — stay within these files."
4. Re-run the E2E suite.
5. Tests pass → continue to Step 5. Tests still fail → next iteration.

After 3 failed iterations: stop. Report to the user with the latest failure
excerpt and iteration history. Do not continue to Step 5.

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
- e2e/specs/{ARGUMENTS}.spec.ts — 1 happy-path scenario

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
