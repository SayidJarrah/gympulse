# Bug Brief: membership-plans — updatedAt not updated after PUT
Date: 2026-04-05 18:00

## Failing Test
Spec: `frontend/e2e/membership-plans.spec.ts`
Test name: `PLAN-19 AC20: updatedAt is updated after editing a plan via PUT`

## Failure
```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 1775411872510
Received:   1775411872510

      589 |
      590 |     // The PUT response itself must show updatedAt strictly after createdAt.
    > 591 |     expect(new Date(putBody.updatedAt).getTime()).toBeGreaterThan(
          |                                                   ^
      592 |       new Date(putBody.createdAt).getTime()
      593 |     );
```

The `updatedAt` value returned by `PUT /api/v1/membership-plans/{id}` is identical to `createdAt`
even after a 1.1-second wait between the POST and the PUT. The timestamp does not change.

## Steps to Reproduce
1. POST `/api/v1/membership-plans` with a valid admin JWT → record `createdAt`
2. Wait 1+ second
3. PUT `/api/v1/membership-plans/{id}` with a changed `name`
4. Inspect `updatedAt` in the response body
5. Observed: `updatedAt` == `createdAt` (unchanged)
6. Expected: `updatedAt` > `createdAt`

Confirmed independently via direct `curl` during the audit on 2026-04-05:
- PUT with a 5-second gap between create and edit still returned the original `updatedAt`.
- This was already documented in the gap report (`docs/gaps/membership-plans.md`) under AC20.

## Evidence
Screenshots: none (API-level test, no UI)
Console errors: none
Network requests:
- `PUT http://localhost:8081/api/v1/membership-plans/{id}` → HTTP 200
- Response body: `updatedAt` value identical to `createdAt` value

## Severity
Critical — AC20 explicitly requires all write operations to update `updatedAt`. The `@PreUpdate`
JPA lifecycle callback is absent or not firing on `MembershipPlan.kt`. Any consumer relying on
`updatedAt` to detect changes (cache invalidation, sync, audit) receives stale data.

## Files to Change
(leave blank — developer fills after root cause analysis)

## Proposed Fix
(leave blank — developer fills after root cause analysis)
