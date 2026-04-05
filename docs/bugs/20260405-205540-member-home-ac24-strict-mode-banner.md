# Bug Brief: member-home — AC-24 strict mode violation when asserting membership activation banner

Date: 2026-04-05 20:55

## Failing Test
Spec: `frontend/e2e/member-home.spec.ts`
Test name: `Member Home › AC-24 navigating to /home with ?membershipBanner=activated shows activated banner`

## Failure
```
Error: expect(locator).toBeVisible() failed
Locator: getByTestId('member-home-root').getByText(/activated|welcome|membership active/i)
Expected: visible
Error: strict mode violation: getByTestId('member-home-root').getByText(/activated|welcome|membership active/i) resolved to 2 elements:
    1) <h1 ...>Welcome back</h1> aka getByRole('heading', { name: 'Welcome back' })
    2) <p ...>Membership activated</p> aka getByText('Membership activated')
```

## Steps to Reproduce
1. Log in as a USER with an active membership.
2. Navigate to `/home?membershipBanner=activated`.
3. The spec asserts `page.getByTestId('member-home-root').getByText(/activated|welcome|membership active/i)` is visible.
4. The regex `/activated|welcome|membership active/i` matches both the hero h1 (`Welcome back`) and the banner text (`Membership activated`).
5. Playwright strict mode rejects a locator that resolves to more than one element.

## Evidence
Console errors: none

The page correctly renders the activation banner ("Membership activated" paragraph) AND also renders the hero heading "Welcome back" — both match the spec's overly broad regex. The spec intent is to verify the activation banner is visible, but the regex is too permissive.

Additionally, the unit test confirms the URL after landing on the banner page should be `/home#membership` (the `membershipBanner` param is stripped and the hash is preserved), but the spec also asserts `await expect(page).not.toHaveURL(/membershipBanner/)` — this assertion may pass, but it is not reached because the strict mode violation fires first.

## Severity
Regression — the feature works correctly (banner renders); the spec selector is too broad.

Likely agent: QA (spec fix) — the selector should be narrowed to match only the banner element, e.g. `page.getByTestId('member-home-root').getByText('Membership activated')` or `page.getByText(/Membership activated/i)`.

## Files to Change
(leave blank — developer fills after root cause analysis)

## Proposed Fix
(leave blank — developer fills after root cause analysis)
