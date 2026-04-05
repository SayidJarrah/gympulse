# Bug Brief: member-home — USER without active membership is redirected to /plans instead of /home after login

Date: 2026-04-05 20:55

## Failing Test
Spec: `frontend/e2e/member-home.spec.ts`
Test name: `Member Home › AC-01 authenticated USER account is routed to /home as the post-login destination`

## Failure
```
Error: expect(page).toHaveURL(expected) failed
Expected: "http://localhost:3001/home"
Received: "http://localhost:3001/plans"
Timeout:  5000ms

Call log:
  - 2 × unexpected value "http://localhost:3001/login"
  - 7 × unexpected value "http://localhost:3001/plans"
```

## Steps to Reproduce
1. Register a new USER account (no membership purchased).
2. Navigate to `/login`.
3. Enter valid credentials and click "Sign in".
4. Observe destination URL.
5. Expected: `/home` (per PRD AC 1 — "Authenticated USER accounts are routed to Member Home as their primary post-login destination").
6. Actual: `/plans` (the old plans catalogue).

## Evidence
Screenshots: `test-results/member-home-Member-Home-AC-37973--the-post-login-destination-chromium/test-failed-1.png`

Console errors: none

Source code — `LoginPage.tsx` lines 12–17:
```tsx
const { hasActiveMembership } = await login(email, password)
const role = useAuthStore.getState().user?.role
if (role === 'ADMIN') {
  navigate('/admin/plans')
} else {
  navigate(hasActiveMembership ? '/home' : '/plans')
}
```

The redirect is conditional: users WITH an active membership go to `/home`, users WITHOUT go to `/plans`. PRD AC 1 states all authenticated USER accounts should land on Member Home regardless of membership status — the membership state is surfaced within the `/home` page itself (AC 7 handles the no-active-membership state).

## Severity
Critical — AC 1 from the member-home PRD is not implemented. New users and users after a cancellation always land on the plans page instead of the intended home page.

## Files to Change
(leave blank — developer fills after root cause analysis)

## Proposed Fix
(leave blank — developer fills after root cause analysis)
