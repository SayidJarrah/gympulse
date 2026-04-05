# Bug Brief: user-membership-purchase — Post-purchase navigation lands on /home#membership instead of /membership

Date: 2026-04-05 20:55

## Failing Tests
Spec: `frontend/e2e/user-membership-purchase.spec.ts`

- `MEM-01 purchases a membership from the plans page`
- `MEM-04 shows Activate CTAs only for an authenticated user without an active membership`
- `MEM-05 renders active membership details on /membership`
- `MEM-07 navigates from the empty-state CTA back to /plans`
- `MEM-09 cancels an active membership and shows the empty state afterwards`
- `MEM-10 dismisses the cancel modal without cancelling the membership`
- `MEM-11 allows a user to purchase another membership after cancelling the previous one`
- `MEM-13 blocks a duplicate purchase when the user gains an active membership before confirmation`

## Failure (representative)
```
Error: expect(page).toHaveURL(expected) failed
Expected: "http://localhost:3001/membership"
Received: "http://localhost:3001/home#membership"
```

For MEM-07 and MEM-04 (which call `loginViaUi` and then navigate to `/plans`):
```
Error: expect(page).toHaveURL(expected) failed
Expected: "http://localhost:3001/plans"
Received: "http://localhost:3001/home"
```

This secondary failure in MEM-04 and MEM-07 is a cascade: `loginViaUi` calls `await expect(page).toHaveURL('/plans')` after login, which fails for users without a membership because they are now redirected to `/home` (see companion bug 20260405-205540-login-redirect-user-without-membership.md for MEM-07), or because users WITH an active membership are redirected to `/home` via `buildHomeMembershipPath`.

## Steps to Reproduce
1. Log in as a USER with no active membership.
2. Navigate to `/plans`.
3. Click "Activate" on a plan card.
4. Confirm the purchase dialog.
5. Expected: navigation to `/membership`.
6. Actual: navigation to `/home#membership` (with `?membershipBanner=activated` query param also present).

## Evidence
Console errors: none

Source code — `PurchaseConfirmModal.tsx` line 25 and `accessFlowNavigation.ts`:
```tsx
// Default redirectTo is:
redirectTo = buildHomeMembershipPath('activated')
// which resolves to: /home?membershipBanner=activated#membership
```

`buildHomeMembershipPath` always returns a path under `/home`, never `/membership`. The specs were written assuming purchase confirmation navigates to `/membership` (the dedicated My Membership page), but the implementation navigates to the member home page scrolled to the `#membership` anchor.

Additionally, `loginViaUi` helper in the spec asserts `await expect(page).toHaveURL('/plans')` after login, which itself now fails for users with an active membership (they are redirected to `/home`). This creates cascading failures across MEM-04, MEM-05, MEM-07, MEM-09, MEM-10, MEM-11, MEM-13.

## Severity
Critical — the entire membership purchase flow navigation is mismatched between specs and implementation. This affects 8 tests.

## Files to Change
(leave blank — developer fills after root cause analysis)

## Proposed Fix
(leave blank — developer fills after root cause analysis)
