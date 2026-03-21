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

## Step 3 — Quality gate

Run the /review command scoped to all files created in Steps 1 and 2.
Fix any issues before finishing.

## When done, report:
- All files created (grouped by backend / frontend)
- Test results summary
- Any issues found and fixed by /review
- Any PRD acceptance criteria that could not be implemented (flag as risk)