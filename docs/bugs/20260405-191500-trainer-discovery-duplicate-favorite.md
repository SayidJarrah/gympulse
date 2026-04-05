# Bug Brief: trainer-discovery — Duplicate POST /favorites returns 201 instead of 409

Date: 2026-04-05 19:15

## Failing Test
Spec: `frontend/e2e/trainer-discovery.spec.ts`
Test name: No spec yet — discovered during audit. Maps to AC 18.

## Failure
AC 18 states: "Attempting to save a trainer that is already in the user's favorites list returns 409
with error code `ALREADY_FAVORITED`."

Observed: A second `POST /api/v1/trainers/{id}/favorites` for the same trainer and same user returns
HTTP 201 with the trainer's name and id in the body, identical to the first successful save.
Expected: HTTP 409 with body `{"error": "...", "code": "ALREADY_FAVORITED"}`.

## Steps to Reproduce
1. Authenticate as a Member (active membership).
2. `POST /api/v1/trainers/11111111-1111-1111-1111-111111111102/favorites` — returns 201 (first save).
3. Repeat the same `POST` request — returns 201 again (should be 409).

Curl reproduction:
```
TOKEN=<member_access_token>
curl -s -w "\nHTTP:%{http_code}" -X POST \
  http://localhost:8080/api/v1/trainers/11111111-1111-1111-1111-111111111102/favorites \
  -H "Authorization: Bearer $TOKEN"
# First call: HTTP:201  {"trainerId":"...","firstName":"Marco","lastName":"Alvarez"}
# Second call: HTTP:201  (same body — should be HTTP:409)
```

## Evidence
Screenshots: none (API-level issue)
Console errors: none
Network requests:
- `POST /api/v1/trainers/11111111-1111-1111-1111-111111111102/favorites` => 201 (both calls)

## Severity
Critical — the uniqueness constraint on `user_trainer_favorites (user_id, trainer_id)` is either
missing from the DB schema or not being enforced by the service layer before inserting. The frontend
optimistic-update path (AC 36) and the "already favorited" UI indicator (AC 35) both depend on this
error code to function correctly.

## Files to Change
(leave blank — developer fills after root cause analysis)

## Proposed Fix
(leave blank — developer fills after root cause analysis)
