# GymFlow Frontend — Developer Context

See root `/AGENTS.md` for project-wide context, conventions, and implementation status.

## React/TypeScript Conventions

### Types
- All types in `src/types/` — one file per domain (e.g. `booking.ts`, `class.ts`)
- Type names match backend DTO names exactly (e.g. backend `BookingResponse` → frontend `BookingResponse`)
- Never use `any` — use `unknown` and narrow, or define the type properly
- API error shape: `{ error: string; code: string }`

### API Layer
- All Axios calls live in `src/api/` — never fetch inline inside components or hooks
- Every API function is async and returns the typed response directly (unwrap `.data`)
- Handle errors by letting them propagate — catch at the hook or page level

### Hooks
- Data fetching hooks live in `src/hooks/` — named `use{Feature}` (e.g. `useBookings`)
- Each hook manages: data state, loading state, error state — always all three
- Hooks call API functions, never Axios directly

### Components
- Functional components only, no class components
- Props interfaces defined inline above the component: `interface Props { ... }`
- Loading states: show a skeleton or spinner, never render partial data
- Error states: always display a user-friendly message — never swallow errors silently

### Error Code Mapping
Map backend error codes to user messages in `src/utils/errorMessages.ts`.
Example: `CLASS_FULL` → "This class is fully booked"

## Directory Layout
```
src/
├── api/          # Axios functions (one file per domain, never inline in components)
├── components/   # Reusable UI components
├── hooks/        # Custom React hooks (data fetching, loading/error state)
├── pages/        # Route-level page components
├── store/        # Zustand global state stores
└── types/        # TypeScript types — must match backend DTO field names exactly
```

## When Adding a Feature (follow this order)
1. Types in `src/types/{feature}.ts` — mirror backend DTO fields exactly
2. API functions in `src/api/{feature}.ts` — Axios calls only, no fetch inside components
3. Custom hook in `src/hooks/use{Feature}.ts` — wraps API, exposes loading + error state
4. Page component in `src/pages/{feature}/`
5. Reusable sub-components in `src/components/{feature}/`
6. Add route in `App.tsx`

## Design System Quick Reference
Full spec: `docs/design/system.md`

| Token | Value |
|-------|-------|
| Page background | `bg-[#0F0F0F]` |
| Card / input surface | `bg-gray-900` |
| Elevated surface | `bg-gray-800` |
| Primary | `bg-green-500` / `text-green-500` / `#22C55E` |
| Accent | `bg-orange-500` / `#F97316` |
| Default text | `text-white` |
| Muted text | `text-gray-400` |
| Focus ring | `ring-green-500 ring-offset-gray-900` |

## Key Rules
- No `any` types — TypeScript strict mode throughout
- No inline styles — Tailwind classes only
- No API calls inside components — always via `src/api/`
- Forms: React Hook Form + Zod validation
- Global state: Zustand store; local UI state: useState
- Always show loading states and handle errors with user-friendly messages

## E2E Tests
Specs live in `e2e/` (one `{feature}.spec.ts` per feature slug).
Run: `npm run test:e2e`
Run `npm run test:e2e:report` after a suite run to open the interactive HTML report.

## Verification Workflow

When asked to "verify", "test", "run tests", or "check if X works", follow these steps.
**Never fix app code or spec files during verification — produce reports only.**

### Prerequisites
```bash
curl -sf http://localhost:8080/api/v1/health
```
If not healthy, stop: "Stack is not running. Start the stack first."

### Step 1 — Smoke tests
```bash
curl -s http://localhost:8080/api/v1/health
curl -sf http://localhost:3000 -o /dev/null -w "%{http_code}\n"
```

### Step 2 — E2E suite
```bash
cd frontend && npm run test:e2e 2>&1
```
The `list` reporter prints each test inline:
- `✓ Feature › Test name (Xms)` — passed
- `✗ Feature › Test name` + error block — failed
- Skipped tests appear as `○`

After the run, Playwright saves artefacts for failed tests under `frontend/test-results/`.
Each failed test gets a directory like:
`test-results/e2e-{spec-file}-{test-title}-chromium/`
containing `test-failed-1.png` (screenshot) and `trace.zip` (full browser trace with network + console).

### Step 3 — On failure: write an observation report

For **each** failing test, create `docs/bugs/` if it does not exist, then write:
`docs/bugs/YYYYMMDD-HHMMSS-{feature}.md`

```markdown
# Observation Report: {feature} — {one-line description}
Date: {YYYY-MM-DD HH:MM}
Reported by: codex

## Failing Test
Spec file: `frontend/e2e/{feature}.spec.ts`
Test name: `{exact test name from terminal output}`

## Assertion That Failed
{Paste the exact Playwright error block from terminal output — expected vs received}

## Test Artefacts
Screenshot: `frontend/test-results/{dir}/test-failed-1.png`
Trace (network + console): `frontend/test-results/{dir}/trace.zip`
Open trace: npx playwright show-trace frontend/test-results/{dir}/trace.zip

## Steps Being Executed When Failure Occurred
{Based on the spec file — list the steps up to the failing assertion}

## Suspicion (observation only — developer to confirm)
{Optional: "Button with role X was not found. Selector may be outdated, or the feature may not be rendered."}

## Suggested Agent
@{frontend-dev | backend-dev}

---
*Root cause: run `/debug {feature} docs/bugs/{this-filename}`*
*Spec fix (if needed): fill ## Spec Fix Required below, then run `/fix-spec docs/bugs/{this-filename}`*

## Spec Fix Required
*(Filled by developer after root cause analysis — leave blank until then)*
Spec file:
Test name:
Change needed:
```

### Step 4 — Report summary

```
✅ / ❌ Backend healthy (http://localhost:8080)
✅ / ❌ Frontend serving (http://localhost:3000)
✅ / ❌ E2E suite — N passed / M failed

Failures:
- {test name} → docs/bugs/{filename}  (next: /debug {slug} docs/bugs/{filename})
```

## Bug Report Workflow

E2E failures are reported as **observation reports** in `docs/bugs/`.
These are written by the e2e-tester and contain browser evidence (screenshots,
console errors, network logs, page snapshot) — but no root cause analysis.

When you receive a bug brief to investigate:

1. **Assess first — app bug or spec issue?**
   - Is the UI doing something wrong (missing element, broken navigation, wrong data)? → **App bug** — fix the app code.
   - Is the spec asserting something the app never did and the SDD never required? → **Spec issue**.
   - Does the app match the SDD but the spec expects something different? → **Spec issue**.
   - Unsure? Check the SDD for this feature. App matches SDD → spec issue. App deviates → app bug.

2. **If app bug:** fix the relevant component/hook/API function (≤ 3 files). Re-run the spec to confirm.

3. **If spec issue:** do NOT change any app file. Fill in the `## Spec Fix Required` section
   at the bottom of the bug brief:
   ```
   Spec file: frontend/e2e/{feature}.spec.ts
   Test name: {exact test name}
   Change needed: {what selector/assertion/value is wrong and what it should be}
   ```
   Then tell the user to run `/fix-spec docs/bugs/{filename}`.

## Updating Implementation Status
After all pages/components are built and working, update the **Frontend** column
in the Implementation Status table in `/AGENTS.md` to ✅.
