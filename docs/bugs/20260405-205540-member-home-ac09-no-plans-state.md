# Bug Brief: member-home — AC-09 no-plans-available state not visible after deactivating all plans

Date: 2026-04-05 20:55

## Failing Test
Spec: `frontend/e2e/member-home.spec.ts`
Test name: `Member Home › AC-09 when no active plans exist, membership section shows unavailable state instead of empty purchase area`

## Failure
```
Error: expect(locator).toBeVisible() failed
Locator: locator('#membership').getByText('No plans available right now')
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

## Steps to Reproduce
1. The test calls `deactivateAllPlansViaApi` which fetches page 0 of size 50 from `/membership-plans?page=0&size=50`.
2. In a dirty E2E database (due to the cleanup endpoint returning 500), there are 50+ active plans accumulated from prior test runs.
3. The test only deactivates the first 50 — plans on pages 1+ remain active.
4. The home page fetches the first 3 active plans via `getMemberHomePlanTeasers()` → `getActivePlans(0, 3)`.
5. At least one active plan is still present, so the "No plans available right now" empty state is never rendered.
6. Instead, plan teasers are shown (AC-08 state).

## Evidence
Screenshots: `test-results/member-home-Member-Home-AC-f3106-tead-of-empty-purchase-area-chromium/test-failed-1.png`

API confirmed 58 total plans in the E2E DB at time of investigation.

Root environment cause: the global-setup cleanup endpoint `POST /api/v1/test-support/e2e/cleanup` returns 500 (FK constraint violation — see companion bug `20260405-205540-e2e-cleanup-fk-constraint.md`). Because cleanup fails, the DB accumulates plans from previous runs, causing the pagination assumption in `deactivateAllPlansViaApi` to break.

Two compounding issues:
1. The cleanup endpoint is broken (separate bug).
2. `deactivateAllPlansViaApi` does not handle pagination — it only fetches page 0 size 50.

## Severity
Critical — the test relies on a database state that cannot be reliably established because the cleanup mechanism is broken and the deactivation helper does not paginate.

## Files to Change
(leave blank — developer fills after root cause analysis)

## Proposed Fix
(leave blank — developer fills after root cause analysis)
