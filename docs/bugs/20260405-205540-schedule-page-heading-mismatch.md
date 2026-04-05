# Bug Brief: group-classes-schedule-view — Schedule page h1 is "Book your next session" not "Group Classes"

Date: 2026-04-05 20:55

## Failing Tests
Spec: `frontend/e2e/group-classes-schedule-view.spec.ts`

- `SCHED-02 active members can browse week, day, and list views`
- `SCHED-03 members without active plans see the membership-required state`
- `SCHED-05 stays readable on small screens without horizontal scroll`

Spec: `frontend/e2e/entity-image-management.spec.ts`

- `IMG-04 uploaded class template images render in member schedule cards`

## Failure
```
Error: expect(locator).toBeVisible() failed
Locator: getByRole('heading', { name: 'Group Classes' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

For SCHED-03:
```
Error: expect(locator).toBeVisible() failed
Locator: getByRole('heading', { name: 'Membership required' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

## Steps to Reproduce
1. Log in as a USER with an active membership.
2. Navigate to `/schedule?view=week&date=<today>`.
3. Inspect the page h1 heading.
4. Expected: heading `Group Classes`.
5. Actual: h1 reads `Book your next session`.

For SCHED-03:
1. Log in as a USER without an active membership.
2. Navigate to `/schedule?view=week&date=2026-03-30`.
3. Look for a `Membership required` heading.
4. Actual: the page shows an `Activation needed` badge (not a heading), inside the schedule toolbar.

## Evidence
Screenshots: `test-results/group-classes-schedule-vie-97b3c-wse-week-day-and-list-views-chromium/`

Console errors: none

Source code — `GroupClassesSchedulePage.tsx` line 642:
```tsx
<h1 className="font-['Barlow_Condensed'] text-5xl font-bold uppercase ...">
  Book your next session
</h1>
```

The h1 is `Book your next session`. No element with the text `Group Classes` exists as a heading on this page.

For SCHED-03 — `GroupClassesSchedulePage.tsx` line 629:
```tsx
{hasActiveMembership ? 'Membership active' : 'Activation needed'}
```

This is a `<span>` badge, not an `<h2>` heading. There is no `Membership required` heading in the page. The spec expects a gating state that hides schedule content and shows a "Membership required" heading with a "Browse plans" link, but the actual implementation shows schedule content to all authenticated users and only renders the `Activation needed` badge inside the toolbar when `hasActiveMembership` is false.

## Severity
Critical — the schedule page heading and the membership-required state are both different from what the specs assert. SCHED-02, SCHED-03, SCHED-05, and IMG-04 all fail for this reason.

## Files to Change
(leave blank — developer fills after root cause analysis)

## Proposed Fix
(leave blank — developer fills after root cause analysis)
