# User Membership Purchase Test Coverage Review

Date: 2026-03-28
Scope: membership purchase, self-service membership page, and admin membership management

## Executive Summary

User Membership Purchase has broad test volume, but some of that breadth is deceptive.

- Backend service tests cover many important business rules.
- Playwright covers the main happy paths and several UI error states.
- Some important backend-contract cases are still missing.
- Several browser tests prove UI mapping by intercepting network calls rather than exercising the real backend path.

Result: the feature is better covered than Membership Plans, but its API contract and several edge cases still have gaps.

## Reviewed Sources

- `backend/src/test/kotlin/com/gymflow/service/UserMembershipServiceTest.kt`
- `frontend/e2e/user-membership-purchase.spec.ts`
- `docs/prd/user-membership-purchase.md`
- `docs/design/user-membership-purchase.md`
- `docs/sdd/user-membership-purchase.md`

## Current Automated Coverage

| Scenario | Current automation | Status | Notes |
| --- | --- | --- | --- |
| Purchase happy path | Backend service + Playwright | Covered | Good functional path coverage. |
| View active membership page | Playwright | Covered | Verifies the page shell and main fields. |
| Cancel own membership | Backend service + Playwright | Covered | Good core path coverage. |
| Repurchase after cancellation | Playwright | Covered | Important workflow is covered. |
| Hide activate buttons when user already has active membership | Playwright | Partial | Covers UI guard, not the backend rule. |
| Plan inactive error | Backend service + Playwright intercept | Partial | Real backend rule exists, but browser test mocks the response. |
| Already-active error | Backend service + Playwright intercept | Partial | Same issue: browser coverage proves error mapping, not the real backend flow. |
| Empty state when user has no active membership | Backend service + Playwright | Covered | Good user-facing coverage. |
| Admin memberships page access and table shell | Playwright | Covered | Basic page presence only. |
| Admin cancel membership | Backend service + Playwright | Covered | Real workflow is exercised. |
| Admin status filter | Backend service + Playwright | Partial | Browser check is superficial and does not prove request semantics. |
| Pagination | Backend service + Playwright | Partial | Browser test passes when pagination is absent. |
| Concurrency guard on duplicate purchase | Backend service | Partial | Service-level only. |

## Important Gaps

| Gap | Status | Why it matters |
| --- | --- | --- |
| Controller/integration coverage for membership endpoints | Missing | Exact HTTP status/error code behavior is not directly protected. |
| `PLAN_NOT_FOUND` purchase path | Missing | Core error scenario from the PRD is not covered. |
| Invalid or blank `planId` | Missing | Request validation path is untested. |
| Real backend verification of `PLAN_NOT_AVAILABLE` in browser flow | Missing | Current browser test stubs the API response. |
| Real backend verification of `MEMBERSHIP_ALREADY_ACTIVE` in browser flow | Missing | Current browser test stubs the API response. |
| Cancel own membership when none is active | Missing | Important user error path is not covered. |
| Admin cancel returns `MEMBERSHIP_NOT_FOUND` | Missing | Required by the PRD and not tested. |
| Positive userId filter behavior in admin table | Missing | Only the no-result case is covered. |
| Real pagination behavior across pages | Missing | Current test only checks controls if they exist. |
| Membership details exact date calculations | Partial | Browser tests verify labels, not actual computed dates. |
| Updated timestamp changes on writes | Missing | Required by the PRD and untested. |
| Concurrency at integration level | Missing | Service translation exists, but the real endpoint path is not exercised. |

## False-Green Patterns

### Error-state UI tests use route interception

The tests for:

- `PLAN_NOT_AVAILABLE`
- `MEMBERSHIP_ALREADY_ACTIVE`
- admin `MEMBERSHIP_NOT_ACTIVE`

verify user-facing messages correctly, but they do not prove the real backend ever returns the expected response in the full stack.

### Pagination test is permissive

The pagination test succeeds when no pagination controls are rendered. That means it does not fail if the dataset is too small or if pagination silently breaks.

### Admin cancel error test can silently exit

The admin `MEMBERSHIP_NOT_ACTIVE` modal test returns early when there is no cancellable row. That keeps the suite green without proving the scenario.

## What Is Well Covered

- Purchase, view, cancel, and repurchase user flows.
- Empty-state behavior for users without membership.
- Admin cancellation happy path.
- Core service-layer rules:
  - active-membership uniqueness
  - inactive plan rejection
  - no-active-membership errors
  - invalid status filter
  - cancellation state transitions

## Recommended Next Coverage

### 1. Add controller integration tests for membership endpoints

Target:

- purchase success and error matrix
- get-my-membership success and no-active path
- cancel-my-membership success and no-active path
- admin list access-denied behavior
- admin cancel success, not-found, and not-active errors

### 2. Replace mocked browser error flows with real setup where feasible

Target:

- create an inactive plan and verify a real `PLAN_NOT_AVAILABLE` response
- trigger a true already-active purchase and verify the modal state

### 3. Strengthen admin list coverage

Target:

- positive userId filter
- deterministic pagination with enough seeded memberships
- filter request/result correctness across ACTIVE, CANCELLED, EXPIRED

### 4. Add date and audit assertions

Target:

- `startDate = today`
- `endDate = today + durationDays`
- cancellation does not delete the row
- timestamp changes on write

## Priority Gaps To Fix First

1. Add controller tests for purchase and cancel endpoint contracts.
2. Replace intercepted browser error tests with real backend-driven scenarios.
3. Add real pagination coverage with deterministic seed data.
4. Add missing `PLAN_NOT_FOUND`, `INVALID_PLAN_ID`, and admin `MEMBERSHIP_NOT_FOUND` cases.

## Bottom Line

User Membership Purchase has decent functional coverage, but too much trust is placed in mocked browser responses and service-only tests. The next quality step is to close the controller and real-backend browser gaps.
