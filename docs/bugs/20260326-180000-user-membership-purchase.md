# Bug Brief: user-membership-purchase — POST /api/v1/memberships returns 500

Date: 2026-03-26 18:00
Reported by: e2e-tester

## Failing Test
Spec file: `frontend/e2e/user-membership-purchase.spec.ts`
Test name: `user can purchase a membership from the plans page (happy path)`

## Symptom
Expected: after clicking "Confirm" in the purchase modal, the page navigates to
`http://localhost:3000/membership` and the spec assertion `await expect(page).toHaveURL('/membership')` passes.

Observed: the modal stays open and shows an inline error banner —
"Something went wrong. Please try again." — and the page remains on
`http://localhost:3000/plans`. The URL never changes.

The root cause is that `POST /api/v1/memberships` returns HTTP 500 with body:
```json
{"error":"An unexpected error occurred","code":"INTERNAL_ERROR"}
```
Because the purchase API call fails, the frontend never receives a success
response and therefore never triggers the navigation to `/membership`.

## Browser Evidence
Screenshot (modal open before Confirm): `screenshots/20260326-120000/02-purchase-modal-open.png`
Screenshot (error state after Confirm): `screenshots/20260326-120000/03-confirm-error-500.png`

The screenshot `03-confirm-error-500.png` shows the "Activate plan?" modal with a
red error banner reading "Something went wrong. Please try again." still on top of
the `/plans` page. The page URL has not changed.

## Network Evidence
Captured via Playwright network request log for the purchase flow:

| Method | URL | Status |
|--------|-----|--------|
| GET | /api/v1/membership-plans?page=0&size=9&sort=createdAt,desc | 200 |
| GET | /api/v1/memberships/me | 404 (expected — new user) |
| POST | /api/v1/memberships | **500** |

Direct curl confirmation (authenticated as fresh test user `testpurchase_diag@test.com`):
```
POST http://localhost:8080/api/v1/memberships
Body: {"planId":"53f9491c-b0e6-40a9-b4b6-4135fb7afb24"}

Response HTTP 500:
{"error":"An unexpected error occurred","code":"INTERNAL_ERROR"}
```

## Suspected Layer
API returns HTTP 500 with INTERNAL_ERROR code → **backend-dev**

The backend service or repository layer throws an unhandled exception when
processing the membership purchase. The frontend error handling is working
correctly (it catches the failure and shows the error banner); the problem is
that the endpoint itself crashes.

## Suggested Agent
@backend-dev

## Reproduction Steps
1. Register a brand-new user (no existing membership) — e.g. via `POST /api/v1/auth/register`
2. Log in and obtain a valid JWT access token
3. Navigate to `http://localhost:3000/plans`
4. Click "Activate" on any plan card — the "Activate plan?" modal opens
5. Click "Confirm"
6. Observe: modal shows "Something went wrong. Please try again."
7. Network tab / curl confirms `POST /api/v1/memberships` → HTTP 500 `INTERNAL_ERROR`
