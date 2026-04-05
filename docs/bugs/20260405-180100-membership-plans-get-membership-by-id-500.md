# Bug Brief: membership-plans — GET /memberships/{id} returns 500 INTERNAL_ERROR
Date: 2026-04-05 18:01

## Failing Test
Spec: `frontend/e2e/membership-plans.spec.ts`
Test name: `PLAN-20 AC19: deactivating a plan leaves existing UserMembership records intact`

## Failure
```
Error: expect(received).toBeTruthy()

Received: false

      634 |       headers: { Authorization: `Bearer ${userSession.accessToken}` },
      635 |     });
    > 636 |     expect(membershipGetResponse.ok()).toBeTruthy();
          |                                        ^
```

`GET /api/v1/memberships/{id}` returns HTTP 500 with body
`{"error":"An unexpected error occurred","code":"INTERNAL_ERROR"}` when called by the
authenticated owner of that membership record. The endpoint was never reached; the 500
was produced by the backend handler itself (no routing 404).

## Steps to Reproduce
1. POST `/api/v1/auth/register` to create a plain user
2. POST `/api/v1/auth/login` to obtain a user JWT
3. POST `/api/v1/memberships` with a valid `planId` → record the returned membership `id`
4. GET `/api/v1/memberships/{id}` with the user's JWT
5. Observed: HTTP 500, `{"error":"An unexpected error occurred","code":"INTERNAL_ERROR"}`
6. Expected: HTTP 200 with the membership object

Confirmed via direct `curl` against `http://localhost:8081` using a known-good membership ID
(`96917b0b-1a2b-41a5-a615-b0b68a2d7b4e`) obtained from a successful POST `/api/v1/memberships`
response. The 500 reproduces every time. No exception is logged to the backend container stdout.

## Evidence
Screenshots: none (API-level test)
Console errors: none logged by backend for this specific request
Network requests:
- `POST http://localhost:8081/api/v1/memberships` → HTTP 200, returns full membership object
  including `id`, `planId`, `status: "ACTIVE"`
- `GET http://localhost:8081/api/v1/memberships/96917b0b-1a2b-41a5-a615-b0b68a2d7b4e` → HTTP 500

Backend logs during this session do contain FK-violation errors from the test-support cleanup
endpoint (`POST /test-support/e2e/cleanup → 500`) caused by a separate issue: the cleanup
routine attempts to DELETE `membership_plans` rows that are still referenced by `user_memberships`
rows. Those log lines (SQLState 23503) are unrelated to the membership GET 500, but they
indicate the test-support cleanup endpoint also needs attention.

## Secondary observation
Because `GET /memberships/{id}` returns 500, the test cannot assert AC19 (that deactivating
a plan leaves the `UserMembership` record intact). The AC19 guarantee itself may be correct in
the database — the gap report audit noted "Membership record retained with status=ACTIVE and
correct planId after plan deactivated (PASS)" when verified directly via SQL — but the API
surface for reading a membership by ID is broken, making automated assertion impossible until
the endpoint is fixed.

## Severity
Critical — `GET /memberships/{id}` is the primary read path for a member to inspect their own
membership record. A 500 on every call means this endpoint is completely non-functional.

## Files to Change
(leave blank — developer fills after root cause analysis)

## Proposed Fix
(leave blank — developer fills after root cause analysis)
