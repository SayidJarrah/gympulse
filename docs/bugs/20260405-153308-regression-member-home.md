# Bug Brief: member-home — global-setup crashes on class instances with active bookings, blocking all E2E specs

Date: 2026-04-05 15:33

## Failing Test
Spec: `frontend/e2e/member-home.spec.ts` (and ALL specs — global setup is shared)
Test name: (global setup — no individual test reached)

## Failure

```
Error: DELETE http://localhost:8080/api/v1/admin/class-instances/39ff42d9-bd8d-45ae-9b77-3e37460d494b failed: 409 {"error":"Class has active bookings and cannot be deleted","code":"CLASS_HAS_ACTIVE_BOOKINGS"}

   at global-setup.ts:98

   96 |   if (!response.ok) {
   97 |     const text = await response.text()
>  98 |     throw new Error(`${method} ${url} failed: ${response.status} ${text}`)
      |           ^
   99 |   }
```

Identical 409 on second instance ID `e65fb5be-949d-4f11-975c-0def0932af0b`.

Secondary warning (non-fatal, caught):
```
E2E pre-run cleanup skipped Error: POST http://localhost:8080/api/v1/test-support/e2e/cleanup failed: 500
```

## Steps to Reproduce

1. Ensure the stack is running (`http://localhost:8080/api/v1/health` returns `{"status":"ok"}`).
2. Run any spec: `cd frontend && npx playwright test e2e/auth.spec.ts`.
3. Global setup executes `sweepNearbyInstances(token)`.
4. `sweepNearbyInstances` fetches all class instances in a ±4-week window and calls `DELETE /api/v1/admin/class-instances/:id` on each.
5. At least two instances (`39ff42d9…` and `e65fb5be…`) have active bookings and return `409 CLASS_HAS_ACTIVE_BOOKINGS`.
6. The unhandled 409 propagates out of `globalSetup()` and Playwright aborts all tests.

## Evidence

Screenshots: none (failure is pre-browser)

Console errors:
- `DELETE /api/v1/admin/class-instances/39ff42d9-bd8d-45ae-9b77-3e37460d494b → 409`
- `DELETE /api/v1/admin/class-instances/e65fb5be-949d-4f11-975c-0def0932af0b → 409`
- `POST /api/v1/test-support/e2e/cleanup → 500`

Network requests:
- Both `DELETE` calls confirmed 409 via `curl` manually.
- `test-support/e2e/cleanup` returns 500 (separate, non-fatal issue).

## Severity

Regression — previously passing. This blocks ALL E2E specs from running, not just member-home. 100% of the test suite is blocked.

## Files to Change

(leave blank — developer fills after root cause analysis)

## Proposed Fix

(leave blank — developer fills after root cause analysis)

---

## Notes for Developer

`sweepNearbyInstances` in `frontend/e2e/global-setup.ts` (line 283–300) does not handle 409 responses. Two possible approaches:
1. Wrap the `deleteInstance` call in a try/catch and skip instances that return 409.
2. Cancel bookings on those instances before deleting them, if the intent is true cleanup.

The `test-support/e2e/cleanup` 500 is a separate concern and is already handled by a `console.warn` in the setup. That issue does not block execution.
