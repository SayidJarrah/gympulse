# Bug Brief: member-home — AC-15 class preview cards not found in the schedule section

Date: 2026-04-05 20:55

## Failing Test
Spec: `frontend/e2e/member-home.spec.ts`
Test name: `Member Home › AC-15 each class card includes class name, scheduled date, start time, and trainer name`

## Failure
```
Error: expect(locator).toBeVisible() failed
Locator: locator('section').filter({ has: getByRole('heading', { name: 'Next up in the club' }) }).getByRole('article').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

## Steps to Reproduce
1. Log in as any USER (no membership needed).
2. Navigate to `/home`.
3. Wait for page load.
4. Inspect the "Next up in the club" section for `<article>` elements representing class cards.
5. Expected: at least one `<article>` with class name, time range, and day label.
6. Actual: no `<article>` elements found inside the section.

## Evidence
Screenshots: `test-results/member-home-Member-Home-AC-278ca-start-time-and-trainer-name-chromium/test-failed-1.png`

Console errors: none confirmed

Direct API investigation confirmed the root cause:
- `GET /api/v1/member-home/classes-preview?timeZone=UTC` returns `entries: []` for the current 14-day window (2026-04-05 to 2026-04-19).
- DB query confirmed: all class instances have `scheduled_at` between 2026-05-29 and 2026-09-23 — none fall within the member-home preview window.
- Global-setup creates instances for the current week but the `sweepNearbyInstances()` call in a prior run swept those instances (it deletes all instances within ±4 weeks of today). The subsequent global-setup created instances for "this week" (around 2026-04-07), but those appear to have been swept again or never persisted into the window due to the cleanup failure cascading into the sweep step.

Result: the member-home classes-preview API returns an empty list, the page renders the empty-state ("No upcoming classes"), and there are no `<article>` elements for the test to find.

## Severity
Critical — the test cannot pass because there are no class instances in the 14-day preview window. This is a data state issue caused by the accumulating dirty database (cleanup endpoint broken) and the `sweepNearbyInstances` sweep logic deleting seed data from prior runs.

Root environment cause: companion bug `20260405-205540-e2e-cleanup-fk-constraint.md`.

## Files to Change
(leave blank — developer fills after root cause analysis)

## Proposed Fix
(leave blank — developer fills after root cause analysis)
