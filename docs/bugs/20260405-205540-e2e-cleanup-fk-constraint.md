# Bug Brief: global-setup — E2E pre-run cleanup returns 500 due to FK constraint violation when deleting plans

Date: 2026-04-05 20:55

## Failing Component
`frontend/e2e/global-setup.ts` — `cleanupExistingE2eData()` function
Endpoint: `POST /api/v1/test-support/e2e/cleanup`

## Failure
```
E2E pre-run cleanup skipped Error: POST http://localhost:8081/api/v1/test-support/e2e/cleanup failed:
500 {"error":"An unexpected error occurred","code":"INTERNAL_ERROR"}
```

Backend logs:
```
ERROR: update or delete on table "membership_plans" violates foreign key constraint
       "user_memberships_plan_id_fkey" on table "user_memberships"
SQLState: 23503
```

## Steps to Reproduce
1. Run the E2E suite (`npx playwright test`) against the E2E stack.
2. The global-setup calls `POST /api/v1/test-support/e2e/cleanup` with:
   ```json
   { "emailPrefixes": ["e2e-member-", "e2e-register-"], "planPrefixes": ["E2E Seed ", "E2E Plan "] }
   ```
3. The `E2eTestSupportService.cleanupByPrefixes()` deletes memberships for matched users, then deletes users, then deletes plans matching the plan prefixes.
4. The plan deletion fails because `user_memberships` rows referencing those plans still exist — they belong to users whose email prefix does NOT match the cleanup prefixes (e.g., admin-created test data or users from other test runs with different prefixes).
5. The Postgres FK constraint `user_memberships_plan_id_fkey` prevents plan deletion when active memberships reference the plan.

## Evidence
Backend log excerpt shows repeated `SQLState: 23503` FK violations during cleanup calls.

Source code — `E2eTestSupportService.kt` lines 48–58:
```kotlin
val matchedPlans = normalizedPlanPrefixes
    .flatMap { prefix -> membershipPlanRepository.findAllByNameStartingWith(prefix) }
    .distinctBy { it.id }

if (matchedPlans.isNotEmpty()) {
    for (prefix in distinctPlanPrefixes) {
        membershipPlanRepository.deleteAllByNameStartingWith(prefix)
    }
}
```

The plan deletion does not first delete (or check for) existing `user_memberships` rows that reference those plans. The FK constraint on `user_memberships.plan_id` prevents the delete.

## Impact
- Every E2E suite run starts with a failed cleanup.
- The E2E database accumulates stale seed data across runs.
- Tests that depend on a clean plan set (e.g., `AC-09 when no active plans exist`) cannot establish the required state because the accumulated plans are never cleaned up.
- The global-setup continues running despite the cleanup failure (it is caught and warned), so tests run on dirty data.

## Severity
Critical — this is an infrastructure-level failure that affects test isolation across every suite run. It is the root cause of multiple test failures that depend on plan state.

## Files to Change
(leave blank — developer fills after root cause analysis)

## Proposed Fix
(leave blank — developer fills after root cause analysis)
