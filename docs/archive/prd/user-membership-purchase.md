# PRD: User Membership Purchase

## Overview
The User Membership Purchase feature allows an authenticated member to select an active
membership plan and activate it immediately, creating a `UserMembership` record that
tracks their subscription start date, end date, and booking entitlements. There is no
payment processor involved in this version — activation is instant and free. This is
the critical missing link between browsing plans and using the platform, because without
an active membership a user cannot book classes.

## Goals
- Allow members to self-serve their way from "browsing plans" to "having an active
  membership" without requiring admin intervention.
- Enforce the business rule that a member may hold only one ACTIVE membership at a time.
- Establish the `UserMembership` record that downstream features (class booking,
  attendance check-in) will gate access against.
- Give admins visibility into who holds which membership so they can support members
  and audit usage.

## User Roles Involved
- **User** (authenticated member) — purchases a plan, views their own active membership,
  and cancels their own membership.
- **Admin** — views any user's membership, and can manually cancel any membership.
- **Guest** (unauthenticated) — no access; must register and log in first.

## User Stories

### Happy Path Stories
- As a user, I want to activate a membership plan so that I gain access to class bookings
  immediately.
- As a user, I want to see my current active membership (plan name, start date, end date,
  remaining booking slots) so that I know what I am entitled to.
- As a user, I want to cancel my active membership so that I can switch to a different plan.
- As a user, I want to activate a new plan after cancelling my previous one so that the
  new membership starts from today.
- As an admin, I want to view all active memberships across all users so that I can audit
  subscription usage.
- As an admin, I want to view the membership history for a specific user so that I can
  assist with support requests.
- As an admin, I want to manually cancel any user's active membership so that I can handle
  exceptional situations (fraud, policy violations).

### Edge Case Stories
- As a user, I want to receive a clear error when I attempt to purchase a plan while I
  already hold an active membership, so that I understand I must cancel first.
- As a user, I want to receive a clear error when I attempt to activate a plan that has
  been deactivated, so that I know the plan is no longer available.
- As a user, I want to receive a clear error when I attempt to cancel a membership that
  is already cancelled or expired, so that I am not confused by duplicate actions.
- As a user, I want to be prevented from purchasing a membership without being logged in,
  so that anonymous users cannot create subscription records.
- As an admin, I want to be prevented from activating a membership on behalf of a user who
  already has an active one, so that the one-active-membership invariant is always enforced.
- As a user, I want my membership end date to be calculated automatically from the plan's
  `durationDays` starting from today, so that I do not have to provide a date manually.

## Acceptance Criteria

1. `POST /api/v1/memberships` with a valid `planId` and a Bearer token for a USER-role
   account creates a `UserMembership` with `status = ACTIVE`, `startDate = today`,
   `endDate = today + plan.durationDays`, and returns HTTP 201 with the full membership
   object.
2. The response body for all membership endpoints includes: `id`, `userId`, `planId`,
   `planName`, `startDate`, `endDate`, `status`, `bookingsUsedThisMonth`,
   `maxBookingsPerMonth`, `createdAt`.
3. `POST /api/v1/memberships` without a Bearer token returns HTTP 401 with error code
   `UNAUTHORIZED`.
4. `POST /api/v1/memberships` when the authenticated user already has a `UserMembership`
   with `status = ACTIVE` returns HTTP 409 with error code `MEMBERSHIP_ALREADY_ACTIVE`.
5. `POST /api/v1/memberships` with a `planId` that does not exist returns HTTP 404 with
   error code `PLAN_NOT_FOUND`.
6. `POST /api/v1/memberships` with a `planId` whose `status = INACTIVE` returns HTTP 422
   with error code `PLAN_NOT_AVAILABLE`.
7. `POST /api/v1/memberships` with a missing or blank `planId` returns HTTP 400 with
   error code `INVALID_PLAN_ID`.
8. `GET /api/v1/memberships/me` returns HTTP 200 with the caller's current ACTIVE
   `UserMembership`; requires a USER-role Bearer token.
9. `GET /api/v1/memberships/me` returns HTTP 404 with error code `NO_ACTIVE_MEMBERSHIP`
   when the authenticated user has no membership with `status = ACTIVE`.
10. `DELETE /api/v1/memberships/me` sets the caller's ACTIVE membership to
    `status = CANCELLED` and returns HTTP 200 with the updated membership object; requires
    a USER-role Bearer token.
11. `DELETE /api/v1/memberships/me` when the authenticated user has no ACTIVE membership
    returns HTTP 404 with error code `NO_ACTIVE_MEMBERSHIP`.
12. `GET /api/v1/admin/memberships` returns HTTP 200 with a paginated list of all
    `UserMembership` records across all users; requires ADMIN role. Supports optional
    `?status=ACTIVE|CANCELLED|EXPIRED` and `?userId={uuid}` query parameters for
    filtering.
13. `GET /api/v1/admin/memberships` without an ADMIN-role Bearer token returns HTTP 403
    with error code `ACCESS_DENIED`.
14. `DELETE /api/v1/admin/memberships/{membershipId}` sets the target membership to
    `status = CANCELLED` and returns HTTP 200 with the updated object; requires ADMIN role.
15. `DELETE /api/v1/admin/memberships/{membershipId}` on a membership that is already
    `CANCELLED` or `EXPIRED` returns HTTP 409 with error code `MEMBERSHIP_NOT_ACTIVE`.
16. `DELETE /api/v1/admin/memberships/{membershipId}` on a non-existent membership ID
    returns HTTP 404 with error code `MEMBERSHIP_NOT_FOUND`.
17. After a successful purchase, the `bookingsUsedThisMonth` counter on the new membership
    is set to `0`.
18. Two concurrent `POST /api/v1/memberships` requests for the same user result in exactly
    one `UserMembership` being created; the second request receives HTTP 409 with error
    code `MEMBERSHIP_ALREADY_ACTIVE`.
19. Cancelling a membership does not delete the `UserMembership` row — it only sets
    `status = CANCELLED`; the record remains queryable for audit purposes.
20. All write operations update the membership's `updatedAt` timestamp.
21. Pagination on `GET /api/v1/admin/memberships` respects `?page`, `?size`, and `?sort`
    query parameters per the API conventions in CLAUDE.md.

## Out of Scope (for this version)
- Payment processing, invoicing, or any financial transaction — activation is free/direct.
- Membership renewal — a user who has cancelled must purchase again as a new activation.
- Automatic expiry of memberships when `endDate` is reached — status transitions to
  EXPIRED are deferred to a future scheduled-job feature.
- Waitlist or queue for plans with limited seats.
- Transferring a membership from one user to another.
- Pausing or freezing a membership temporarily.
- Refunds or credits on cancellation.
- Email or in-app notifications on purchase or cancellation — that belongs to the
  Notifications feature.
- Admin creating a membership on behalf of a user — the activation endpoint is
  user-self-service only. Admins can only cancel.
- The `bookingsUsedThisMonth` counter increment logic — that belongs to the
  Class Booking feature.

## Open Questions

All questions resolved by stakeholder (2026-03-23):

1. **Expiry enforcement** — A background scheduler will set `status = EXPIRED` when
   `endDate` passes. The Booking feature should check `status = ACTIVE` only (not
   `endDate >= today`). ✅ **Decision: scheduler-based expiry.**
2. **Re-purchase after cancellation** — A user may purchase a new plan immediately after
   cancelling; there is no lock-in period. ✅ **Decision: immediate re-purchase allowed.**
3. **Plan upgrade/downgrade** — Out of scope for this phase. A user must cancel and
   re-purchase to change plans. ✅ **Decision: out of scope.**
4. Should `maxBookingsPerMonth` be enforced at the membership level during booking, or
   is that purely informational for this version? The booking feature will consume this
   field but this PRD does not enforce it — deferred to Class Booking feature.

## Technical Notes for the Architect
- The one-active-membership constraint should be enforced at the DB level with a partial
  unique index on `(user_id)` where `status = 'ACTIVE'` to prevent race conditions, in
  addition to application-level validation.
- Concurrency risk is real: two simultaneous purchase requests from the same user could
  both pass the application-layer check before either commits. The partial unique index
  is the hard guard; the service should handle the resulting constraint violation and
  translate it to HTTP 409 with `MEMBERSHIP_ALREADY_ACTIVE`.
- `startDate` and `endDate` should be stored as `DATE` (not `TIMESTAMP`) since membership
  duration is day-granular and timezone handling is simpler with dates.
- `bookingsUsedThisMonth` needs a reset mechanism at the start of each calendar month —
  this can be a Flyway-managed scheduled job or a flag on the entity; design decision
  deferred to the architect.
- The `GET /api/v1/memberships/me` endpoint filters by `status = ACTIVE` only. A
  scheduler (separate feature) is responsible for flipping `status → EXPIRED` when
  `endDate` passes; the query layer does not need to check `endDate`.
- The `UserMembership` entity already appears in the domain model in CLAUDE.md; the DB
  migration will need `status` (enum: ACTIVE/CANCELLED/EXPIRED), `bookings_used_this_month`
  (integer, default 0), `created_at`, and `updated_at` columns.
- All write endpoints must be `@Transactional` in the service layer.
