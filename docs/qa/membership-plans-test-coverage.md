# Membership Plans Test Coverage Review

Date: 2026-03-28
Scope: public plan browsing and admin plan management

## Executive Summary

Membership Plans currently has meaningful backend business-rule coverage but very light UI and end-to-end coverage.

- Backend service tests cover many core domain rules.
- The browser suite only covers list, detail navigation, admin page access, and create-plan happy path.
- There are no controller integration tests for the plan endpoints.

Result: the business logic is partly protected, but a large part of the HTTP contract and admin-management workflow can regress without the suite going red.

## Reviewed Sources

- `backend/src/test/kotlin/com/gymflow/service/MembershipPlanServiceTest.kt`
- `frontend/e2e/membership-plans.spec.ts`
- `docs/prd/membership-plans.md`
- `docs/design/membership-plans.md`
- `docs/sdd/membership-plans.md`

## Current Automated Coverage

| Scenario | Current automation | Status | Notes |
| --- | --- | --- | --- |
| Public list shows at least one active plan | Playwright | Covered | Confirms catalogue loads at a basic level. |
| Public plan detail page opens from list | Playwright | Covered | Verifies the first card navigates correctly. |
| Unauthenticated access to `/admin/plans` is blocked | Playwright | Covered | Redirect behavior is covered. |
| Admin can open plans table | Playwright | Covered | Only basic page render check. |
| Admin can create a new plan | Playwright | Covered | Happy path only. |
| Active plan listing and lookup rules | Backend service | Covered | Good service-level coverage. |
| Inactive plan hidden from non-admin callers | Backend service | Covered | Service-level only. |
| Create/update/deactivate/activate business rules | Backend service | Covered | No HTTP-layer verification. |
| Price-change blocked when active subscribers exist | Backend service | Covered | Good domain-rule coverage, but no UI or controller coverage. |

## What Is Missing Or Weak

| Gap | Status | Why it matters |
| --- | --- | --- |
| Admin edit plan flow in UI | Missing | Core admin maintenance path is not covered end to end. |
| Admin deactivate plan flow in UI | Missing | The catalogue visibility rule depends on this working. |
| Admin reactivate plan flow in UI | Missing | Required in the PRD and untested in the browser. |
| Public catalogue hides inactive plans after admin action | Missing | Critical guest-facing rule is not proven end to end. |
| Direct URL to inactive plan returns not found for guest/user | Missing | Security and catalogue consistency rule is untested in browser and controller layers. |
| Non-existent plan detail path | Missing | No browser or controller coverage for `PLAN_NOT_FOUND`. |
| Validation errors for blank name, blank description, invalid price, invalid duration | Missing at HTTP/UI level | Service tests do not replace controller validation coverage. |
| Admin status filter on list | Missing | PRD requires `ACTIVE|INACTIVE` filtering on admin list. |
| Pagination and sort behavior | Missing | API conventions are part of the acceptance criteria. |
| Non-admin authenticated write attempts | Missing | Access-denied behavior is not directly exercised for plan writes. |
| Updated timestamp changes on writes | Missing | Acceptance criterion exists but no test covers it. |

## Key Structural Risk

There is no controller integration suite for membership-plan endpoints. That means several important requirements are only assumed:

- exact HTTP status codes
- exact error codes
- security behavior for admin-only writes
- request validation behavior
- pagination and filter parameter handling

Service tests do not protect those integration points.

## Current Browser Coverage Is Too Narrow

The Playwright suite for plans currently does only five things:

- open `/plans`
- navigate from a card to its detail page
- verify unauthenticated redirect from `/admin/plans`
- verify admin can open the plans table
- create a plan

That leaves most of the admin feature surface unverified.

## Recommended Next Coverage

### 1. Add controller integration tests for membership-plan endpoints

Target:

- public list and detail success
- inactive plan hidden from guest/user
- not-found path
- create/update validation errors
- deactivate/activate conflict errors
- admin-only enforcement on write endpoints

### 2. Add browser coverage for admin lifecycle

Target:

- create plan
- edit plan
- deactivate plan
- reactivate plan
- confirm public catalogue updates after state changes

### 3. Add list-behavior coverage

Target:

- admin status filter
- empty states
- pagination controls with real page changes
- sort behavior if exposed in UI

## Priority Gaps To Fix First

1. Add controller tests for create/update validation and access control.
2. Add Playwright coverage for edit, deactivate, and reactivate.
3. Add end-to-end verification that inactive plans disappear from the public catalogue and direct detail access fails.
4. Add not-found coverage for invalid plan IDs.

## Bottom Line

Membership Plans has enough service-level coverage to catch some domain regressions, but the feature is under-protected at the HTTP and browser layers. Admin plan lifecycle coverage is the biggest missing area.
