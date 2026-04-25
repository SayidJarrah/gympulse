# PRD: Membership Plans

## Overview
Membership plans are the catalogue of subscription offerings that a gym sells to its members.
Admins can create new plans, update their details, and deactivate plans that should no longer
be available for purchase. Any visitor to the site — authenticated or not — can browse the list
of active plans so they can make an informed decision before registering or buying.

## Goals
- Allow admins to maintain a live catalogue of membership options without developer involvement.
- Give prospective members full pricing and duration transparency before committing to a purchase.
- Prevent deactivated plans from appearing in the public catalogue while preserving historical
  data for existing subscribers whose memberships reference those plans.

## User Roles Involved
- **Guest** (unauthenticated visitor) — can list and view active plans.
- **User** (authenticated member) — can list and view active plans (same read access as Guest).
- **Admin** — can create, edit, and deactivate/reactivate any plan.

## User Stories

### Happy Path Stories
- As a guest, I want to browse all active membership plans so that I can compare pricing and
  duration before deciding to sign up.
- As a guest, I want to view the full details of a single active plan so that I can read the
  description before registering.
- As an admin, I want to create a new membership plan with a name, description, price, and
  duration so that it immediately appears in the public catalogue.
- As an admin, I want to edit an existing plan's name, description, price, and duration so
  that I can correct mistakes or update pricing.
- As an admin, I want to deactivate a plan so that it no longer appears in the public catalogue
  and cannot be purchased, while existing memberships on that plan are unaffected.
- As an admin, I want to reactivate a previously deactivated plan so that it becomes purchasable
  again without having to recreate it from scratch.
- As an admin, I want to list all plans (active and inactive) so that I can see the full
  catalogue history and manage individual plans.

### Edge Case Stories
- As a guest, I want to receive a clear not-found response when I request a plan that does not
  exist, so that I know the plan ID is invalid.
- As a guest, I want to be blocked from viewing an inactive plan's details via direct URL so
  that I cannot circumvent the public filter by guessing plan IDs.
- As an admin, I want to be prevented from creating a plan with a price of zero or less so
  that invalid pricing never reaches the catalogue.
- As an admin, I want to be prevented from creating a plan with a duration of zero or fewer
  days so that a logically invalid plan cannot be saved.
- As an admin, I want to be prevented from creating a plan with an empty or whitespace-only
  name so that every plan in the catalogue has a meaningful title.
- As a user without the ADMIN role, I want to receive a 403 error when I attempt to create,
  edit, or deactivate a plan so that plan management is strictly admin-only.

## Acceptance Criteria

1. `GET /api/v1/membership-plans` returns HTTP 200 with a paginated list of plans where
   `status = ACTIVE`, accessible without authentication.
2. Each plan object in the list response contains: `id`, `name`, `description`, `priceInCents`,
   `durationDays`, `status`, `createdAt`, `updatedAt`.
3. `GET /api/v1/membership-plans/{id}` returns HTTP 200 for an existing active plan, accessible
   without authentication.
4. `GET /api/v1/membership-plans/{id}` returns HTTP 404 with error code `PLAN_NOT_FOUND` when
   the plan ID does not exist.
5. `GET /api/v1/membership-plans/{id}` returns HTTP 404 with error code `PLAN_NOT_FOUND` when
   the plan exists but has `status = INACTIVE` and the caller is not an admin.
6. `POST /api/v1/membership-plans` creates a new plan with `status = ACTIVE` and returns HTTP
   201 with the full plan object; requires ADMIN role.
7. `POST /api/v1/membership-plans` without an ADMIN JWT returns HTTP 403 with error code
   `ACCESS_DENIED`.
8. `POST /api/v1/membership-plans` with `priceInCents <= 0` returns HTTP 400 with error code
   `INVALID_PRICE`.
9. `POST /api/v1/membership-plans` with `durationDays <= 0` returns HTTP 400 with error code
   `INVALID_DURATION`.
10. `POST /api/v1/membership-plans` with a blank or missing `name` returns HTTP 400 with error
    code `INVALID_NAME`.
11. `PUT /api/v1/membership-plans/{id}` updates an existing plan's `name`, `description`,
    `priceInCents`, and `durationDays`; returns HTTP 200 with the updated plan object; requires
    ADMIN role.
12. `PUT /api/v1/membership-plans/{id}` applies the same field-level validation rules as
    creation (criteria 8–10) and returns the corresponding 400 error codes on violation.
13. `PUT /api/v1/membership-plans/{id}` on a non-existent plan ID returns HTTP 404 with error
    code `PLAN_NOT_FOUND`.
14. `PATCH /api/v1/membership-plans/{id}/deactivate` sets `status = INACTIVE` and returns HTTP
    200 with the updated plan object; requires ADMIN role.
15. `PATCH /api/v1/membership-plans/{id}/deactivate` on an already inactive plan returns HTTP
    409 with error code `PLAN_ALREADY_INACTIVE`.
16. `PATCH /api/v1/membership-plans/{id}/activate` sets `status = ACTIVE` and returns HTTP 200
    with the updated plan object; requires ADMIN role.
17. `PATCH /api/v1/membership-plans/{id}/activate` on an already active plan returns HTTP 409
    with error code `PLAN_ALREADY_ACTIVE`.
18. `GET /api/v1/admin/membership-plans` returns HTTP 200 with a paginated list of ALL plans
    regardless of status; requires ADMIN role. Supports optional `?status=ACTIVE|INACTIVE` query
    parameter to filter by status.
18a. `PUT /api/v1/membership-plans/{id}` with a changed `priceInCents` on a plan that has at
    least one active `UserMembership` returns HTTP 409 with error code
    `PLAN_HAS_ACTIVE_SUBSCRIBERS`.
18b. `POST /api/v1/membership-plans` or `PUT /api/v1/membership-plans/{id}` with a blank or
    missing `description` returns HTTP 400 with error code `INVALID_DESCRIPTION`.
19. Deactivating a plan does not alter or invalidate any existing `UserMembership` records that
    reference that plan.
20. All write operations (`POST`, `PUT`, `PATCH`) update the plan's `updatedAt` timestamp.
21. Pagination on list endpoints respects `?page`, `?size`, and `?sort` query parameters per
    the API conventions.

## Out of Scope (for this version)
- Deleting a plan permanently (only deactivation is supported to preserve referential integrity).
- Duplicate-name detection or enforcement — two plans may share the same name.
- Plan versioning or audit history of field changes.
- Attaching images or media to a plan.
- Promotional pricing, discount codes, or time-limited offers.
- Per-plan booking limits (`maxBookingsPerMonth`) — the domain model field exists but is managed
  by the User Membership Purchase feature.
- Any payment or checkout flow — that belongs to the "User membership purchase" feature.

## Open Questions
~~All open questions resolved by stakeholder on 2026-03-21.~~

**Resolved decisions:**
1. Admin list endpoint supports `?status=ACTIVE|INACTIVE` filtering. Without the parameter, all plans are returned.
2. Editing `priceInCents` on a plan that has active subscribers is **blocked** — returns HTTP 409 with error code `PLAN_HAS_ACTIVE_SUBSCRIBERS`.
3. `description` is **required** — blank or missing description returns HTTP 400 with error code `INVALID_DESCRIPTION`.

## Technical Notes for the Architect
- The `MembershipPlan` entity already appears in the domain model in CLAUDE.md; the DB schema
  will need to add `description` (text, NOT NULL), `status` (enum ACTIVE/INACTIVE), and
  `updated_at` columns if not already present.
- `priceInCents` should be stored as an integer (not a float) to avoid floating-point rounding
  errors on monetary values.
- The public list endpoint must not require a JWT — Spring Security must permit it for
  unauthenticated callers.
- The admin-only endpoints must be protected with `@PreAuthorize("hasRole('ADMIN')")`.
- Concurrency is low-risk for this feature (plan management is infrequent), but optimistic
  locking with a `version` column is worth considering to prevent lost-update races between
  two admins editing the same plan simultaneously.
