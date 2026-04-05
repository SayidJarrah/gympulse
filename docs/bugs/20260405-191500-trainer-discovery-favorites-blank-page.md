# Bug Brief: trainer-discovery — /trainers/favorites renders blank page for non-Member

Date: 2026-04-05 19:15

## Failing Test
Spec: `frontend/e2e/trainer-discovery.spec.ts`
Test name: No spec yet — discovered during audit. Maps to AC 38.

## Failure
AC 38 states: "The 'My Favorites' page is accessible at `/trainers/favorites` and is only visible in
the navigation for Members. Navigating to it as a Guest redirects to the membership purchase page."

Observed: When a user without an active membership (admin account used for testing) navigates to
`http://localhost:3000/trainers/favorites`, the page renders completely blank — no heading, no
redirect, no error message, no content of any kind. The accessibility snapshot returns an empty YAML
tree. The browser console shows two 403 errors:
- `GET /api/v1/memberships/me` => 403
- `GET /api/v1/trainers/favorites?sort=lastName%2Casc&page=0&size=12` => 403

Expected: The route should detect the absence of an active membership and redirect the user to the
membership purchase page (e.g., `/plans`).

## Steps to Reproduce
1. Log in as a user with no active membership (or as admin).
2. Navigate directly to `http://localhost:3000/trainers/favorites`.
3. Observe: blank page, no redirect, no content.

## Evidence
Screenshots: blank page captured via Playwright MCP accessibility snapshot (empty YAML)
Console errors:
```
[ERROR] Failed to load resource: the server responded with a status of 403 () @ /api/v1/memberships/me
[ERROR] Failed to load resource: the server responded with a status of 403 () @ /api/v1/trainers/favorites?sort=lastName%2Casc&page=0&size=12
```
Network requests:
- `GET /api/v1/memberships/me` => 403
- `GET /api/v1/trainers/favorites?sort=lastName%2Casc&page=0&size=12` => 403

## Severity
Critical — the page is completely unusable for non-Members and provides no actionable feedback.
The missing redirect means non-Members can reach a broken state with no recovery path visible in
the UI.

## Files to Change
(leave blank — developer fills after root cause analysis)

## Proposed Fix
(leave blank — developer fills after root cause analysis)
