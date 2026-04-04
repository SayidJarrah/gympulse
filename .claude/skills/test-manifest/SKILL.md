---
name: test-manifest
description: GymPulse test registry management. Load when writing, running, or
  auditing E2E specs. Defines how to maintain the test manifest and detect regression risk.
---

# GymPulse Test Manifest

The manifest lives at `docs/qa/test-manifest.md`. Tester owns and maintains it.

## Before Writing New Specs

1. Read `docs/qa/test-manifest.md`
2. Check the Regression Risk Map — identify which existing specs the new feature might affect
3. Flag at-risk specs in your report before writing anything new
4. If at-risk specs exist: run them first to confirm they currently pass (establish baseline)

## After Writing New Specs

Update `docs/qa/test-manifest.md`:
- Add a new row to the Coverage Registry for the new feature
- List which AC numbers from the PRD are covered (e.g. "1,2,3,4" or "all")
- Set "Last passing" to today's date

## Spec Conventions

- One `{feature}.spec.ts` file per feature slug in `frontend/e2e/`
- Each test covers one acceptance criterion; test name = the AC text
- Use `page.getByRole(...)` for buttons, headings, dialogs — prefer semantic selectors
- Use `page.fill('#id', value)` for form inputs with stable IDs
- Seed admin: `admin@gymflow.local` / `Admin@1234`
- Unique test data: `Date.now()` suffix on emails and names
- Each test is independent — no shared state, no test order dependencies

## Bi-Directional Coverage (audit mode)

When running `/audit`, check both directions:

**Docs → Code:** For each AC in the PRD, does a spec exist that covers it?
Flag ACs with no spec as "missing coverage".

**Code → Docs:** For each user-visible flow in the app (navigation, form submission,
error display), does a spec exist? Flag untested flows as "undocumented coverage gap".

## Bug Brief Format

When a spec fails, write to `docs/bugs/YYYYMMDD-HHMMSS-{feature}.md`:

```markdown
# Bug Brief: {feature} — {one-line description}
Date: {YYYY-MM-DD HH:MM}

## Failing Test
Spec: `frontend/e2e/{feature}.spec.ts`
Test name: `{exact name}`

## Failure
{Exact Playwright error output}

## Steps to Reproduce
1. {action}
2. {action}
3. {what was observed vs expected}

## Evidence
Screenshots: `screenshots/{folder}/`
Console errors: {paste or "none"}
Network requests: {relevant API calls and status codes}

## Severity
{Critical — feature broken | Regression — previously passing}

## Files to Change
(leave blank — developer fills after root cause analysis)

## Proposed Fix
(leave blank — developer fills after root cause analysis)
```