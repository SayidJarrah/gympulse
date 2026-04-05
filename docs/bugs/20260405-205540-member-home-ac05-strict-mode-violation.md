# Bug Brief: member-home — AC-05 fails due to strict mode violation on getByText('Active')

Date: 2026-04-05 20:55

## Failing Test
Spec: `frontend/e2e/member-home.spec.ts`
Test name: `Member Home › AC-05 active membership card shows plan name, status badge, start date, end date, and booking usage`

## Failure
```
Error: expect(locator).toBeVisible() failed
Locator: getByText('Active')
Expected: visible
Error: strict mode violation: getByText('Active') resolved to 3 elements:
    1) <p ...>Active member</p>
    2) <p ...>Your membership is active and ready for class boo…</p>
    3) <span aria-label="Status: Active" ...>Active</span>
```

## Steps to Reproduce
1. Log in as a USER with an active membership.
2. Navigate to `/home`.
3. The spec calls `await expect(page.getByText('Active')).toBeVisible()`.
4. The locator matches 3 elements (two paragraph elements whose text contains "Active" and the exact badge span).
5. Playwright strict mode rejects any locator that matches more than one element.

## Evidence
Screenshots: `test-results/member-home-Member-Home-AC-278ca-start-time-and-trainer-name-chromium/test-failed-1.png`

Console errors: none

The page contains at least three DOM elements whose text matches `getByText('Active')`:
- A paragraph "Active member"
- A paragraph "Your membership is active and ready for class boo…"
- The status badge span with `aria-label="Status: Active"` and text `Active`

The spec uses a loose `getByText('Active')` selector. The badge can be uniquely selected via `getByLabel('Status: Active')` (already used in other tests in the same file: MEM-01, MEM-05).

## Severity
Regression — this is a spec selector issue. The feature itself renders the badge correctly; the selector is too broad.

Likely agent: QA (spec fix) — the selector should be `page.getByLabel('Status: Active')` to match the badge exclusively.

## Files to Change
(leave blank — developer fills after root cause analysis)

## Proposed Fix
(leave blank — developer fills after root cause analysis)
