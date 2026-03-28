# Auth Test Coverage Review

Date: 2026-03-28
Scope: register, login, refresh, logout, and auth-related route protection

## Executive Summary

Auth has the strongest backend coverage in the repo today, but frontend and end-to-end coverage is still narrow.

- Backend service and controller tests cover most core auth business rules.
- Frontend unit tests cover form validation and page-level navigation wiring.
- End-to-end coverage only proves a small slice of the full feature.

Result: the API contract is reasonably protected, but session lifecycle behavior in the browser is still under-tested.

## Reviewed Sources

- `backend/src/test/kotlin/com/gymflow/controller/AuthControllerIntegrationTest.kt`
- `backend/src/test/kotlin/com/gymflow/service/AuthServiceTest.kt`
- `frontend/e2e/auth.spec.ts`
- `frontend/src/components/auth/__tests__/AuthForm.test.tsx`
- `frontend/src/pages/auth/__tests__/LoginPage.test.tsx`
- `frontend/src/pages/auth/__tests__/RegisterPage.test.tsx`
- `docs/prd/auth.md`

## Current Automated Coverage

| Scenario | Current automation | Status | Notes |
| --- | --- | --- | --- |
| Register happy path | Backend controller + service, frontend unit, Playwright | Covered | Good layered coverage for the basic registration flow. |
| Register duplicate email | Backend controller + service, frontend page error rendering | Covered | UI error rendering is only indirect; browser flow is not exercised end to end. |
| Register email/password validation | Backend controller + frontend form tests | Covered | Strong on validation messages, but no browser-level regression path. |
| Login happy path | Backend controller + service, Playwright admin login | Partial | Browser coverage exists only for the seeded admin user. |
| Login invalid credentials | Backend controller + service, Playwright wrong-password case | Covered | Good contract coverage. |
| Refresh token happy path | Backend controller + service | Partial | No browser or integration flow proves token refresh in a real session. |
| Refresh token invalid or expired | Backend controller + service | Covered | API-level only. |
| Logout happy path and idempotency | Backend controller + service | Partial | No UI or browser session test exercises logout. |
| Logout requires auth | Backend controller | Covered | API-level only. |
| Route protection for unauthenticated admin access | Playwright | Partial | Only `/admin/plans` is checked at auth-feature level. |

## What Is Well Covered

### Backend

- Registration success, duplicate email, invalid email, and password length rules are covered.
- Login success and invalid-credential behavior are covered.
- Refresh success, invalid token, and expired token are covered.
- Logout success, missing auth, and idempotency are covered.
- Password hashing behavior is explicitly checked in the service tests.

### Frontend unit and page tests

- `AuthForm` validates required fields and register-mode password limits.
- `LoginPage` and `RegisterPage` verify submit wiring, loading states, and error display.
- Basic navigation behavior after successful form submission is covered.

## Important Gaps

| Gap | Status | Why it matters |
| --- | --- | --- |
| Regular USER login end-to-end flow | Missing | Only admin login is verified in the browser. |
| Refresh-token rotation in a real browser session | Missing | Core session persistence behavior can break without test failure. |
| Logout end-to-end flow | Missing | There is no browser test that proves tokens/session are cleared and protected pages become inaccessible. |
| Registration request ignores injected `role=ADMIN` | Missing | This is a privilege-escalation requirement in the PRD. |
| Seeded admin login returns ADMIN-specific behavior beyond redirect | Partial | Redirect is tested, but not broader role-sensitive session behavior. |
| Access control for non-admin authenticated users on admin routes as an auth concern | Missing | Covered elsewhere for some pages, but not comprehensively from the auth feature perspective. |
| Refresh-token replay after a successful rotation | Partial | The invalid-token path is tested, but not the exact old-token reuse sequence after refresh. |
| Public accessibility of register/login/refresh endpoints | Partial | Controller tests imply this, but there is no explicit security-focused integration matrix. |

## Coverage Risks

### Browser session lifecycle is mostly untested

The current browser suite verifies:

- registration redirects to `/login`
- admin login redirects to `/admin/plans`
- wrong password stays on `/login`

It does not verify:

- what happens after a normal user session expires
- whether refresh is invoked and works
- whether logout actually removes access
- whether the app recovers correctly after refresh failure

### Most sensitive auth rule is not directly exercised

The PRD requires that any `role` field in registration be ignored and that self-registration can never create an admin. Current tests do not submit a manipulated payload through the controller or service boundary for that case.

## Recommended Next Coverage

### 1. Add explicit auth-integration tests for security-sensitive cases

Target:

- register payload containing `role=ADMIN` still creates `USER`
- refreshed token invalidates the previous refresh token
- logout invalidates the current refresh token, and a later refresh attempt fails

### 2. Add browser tests for session lifecycle

Target:

- regular user login lands on the expected user route
- logout returns the user to a guest state
- protected user pages reject access after logout
- refresh failure forces re-authentication

### 3. Add a compact security matrix

Target:

- guest access to public auth endpoints
- guest rejection for logout
- user rejection for admin-only pages
- admin success on admin-only pages

## Priority Gaps To Fix First

1. Add an end-to-end logout test.
2. Add a backend integration test that registration ignores an injected admin role.
3. Add a refresh-rotation test that reuses the old refresh token after a successful refresh.
4. Add a regular USER login browser test.

## Bottom Line

Auth is not the weakest-tested area, but the safest-looking coverage is concentrated at the service and controller layer. Browser-level session lifecycle still has material blind spots.
