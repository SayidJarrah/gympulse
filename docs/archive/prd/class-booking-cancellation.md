# PRD: Class Booking & Cancellation

## Overview
Class Booking & Cancellation allows a member with an ACTIVE membership to reserve a spot in a scheduled group class and cancel that reservation up to three hours before the class starts. The feature turns the existing read-only class schedule into an actionable member workflow while keeping full classes blocked, waitlist behavior out of scope, and monthly booking-plan limits informational only for this phase.

## Goals
- What user problem does this solve?
  Members can already browse the schedule, but they cannot act on it. They need a direct way to reserve and release spots in scheduled classes without contacting staff.
- What business outcome does it enable?
  Direct booking increases member engagement, reduces front-desk booking work, and activates the core commercial value of a membership-based class programme.

## User Roles Involved
- User
- Admin

## User Stories
Format every story as:
As a {role}, I want to {action} so that {benefit}.

### Happy Path Stories
- As a User with an ACTIVE membership, I want to book a scheduled class so that I can secure a place in that session.
- As a User, I want to see whether I already booked a class so that I do not have to guess my reservation state.
- As a User, I want to cancel my booking more than three hours before class start so that I can free my spot when my plans change.
- As an Admin, I want to book a class on behalf of a user so that staff can assist members directly when needed.
- As a User, I want a cancelled booking to release the class spot immediately so that another member can book it.

### Edge Case Stories
- As a User, I want to be blocked from booking a class that is already full so that I understand there are no spots remaining.
- As a User without an ACTIVE membership, I want to be blocked from booking so that membership-gated booking rules remain consistent.
- As a User, I want to be prevented from booking the same class twice so that duplicate reservations do not appear.
- As a User, I want to be blocked from cancelling within three hours of the class start time so that the cancellation policy is enforced consistently.
- As a User, I want to see a clear error when I try to book a class that does not exist, is no longer `SCHEDULED`, or has already started so that I understand why the action failed.
- As an Admin, I want the on-behalf booking flow to bypass the user's membership requirement but still respect capacity and class validity so that staff support does not create impossible bookings.

## Acceptance Criteria
1. `POST /api/v1/bookings` with a valid `classId` and a Bearer token for a `USER` account with an ACTIVE membership creates a `Booking` with `status = CONFIRMED` and returns HTTP 201 with the full booking object.
2. The booking response body includes, at minimum: `id`, `userId`, `classId`, `status`, `bookedAt`, `className`, `scheduledAt`, and `trainerNames`.
3. `POST /api/v1/bookings` without authentication returns HTTP 401 with error code `UNAUTHORIZED`.
4. `POST /api/v1/bookings` by a `USER` account that does not have an ACTIVE membership returns HTTP 403 with error code `MEMBERSHIP_REQUIRED`.
5. `POST /api/v1/bookings` with a `classId` that does not exist returns HTTP 404 with error code `CLASS_NOT_FOUND`.
6. `POST /api/v1/bookings` for a class whose status is not `SCHEDULED` returns HTTP 409 with error code `CLASS_NOT_BOOKABLE`.
7. `POST /api/v1/bookings` for a class whose start time is at or before the current time returns HTTP 409 with error code `CLASS_ALREADY_STARTED`.
8. `POST /api/v1/bookings` when confirmed bookings for the class are already equal to capacity returns HTTP 409 with error code `CLASS_FULL`.
9. When booking is blocked because the class is full, the user-facing error message clearly states that the class is fully booked.
10. `POST /api/v1/bookings` when the authenticated user already has a `CONFIRMED` booking for the same `classId` returns HTTP 409 with error code `ALREADY_BOOKED`.
11. A successful booking increments the class's confirmed-booking count by exactly one and reduces the remaining available spots by exactly one for subsequent reads.
12. When a class is full, the system does not create a waitlist entry or any pending booking record in this version.
13. Booking creation is not blocked by `maxBookingsPerMonth` in this phase; the plan limit remains informational only.
14. `GET /api/v1/bookings/me` returns a paginated list of the authenticated user's bookings ordered by `scheduledAt` ascending by default.
15. `GET /api/v1/bookings/me` supports optional filtering by `status=CONFIRMED|CANCELLED|ATTENDED`.
16. `DELETE /api/v1/bookings/{bookingId}` by the booking owner on a `CONFIRMED` booking more than three hours before `scheduledAt` sets the booking status to `CANCELLED` and returns HTTP 200 with the updated booking object.
17. `DELETE /api/v1/bookings/{bookingId}` by the booking owner when the class starts in less than three hours returns HTTP 409 with error code `CANCELLATION_WINDOW_CLOSED`.
18. The three-hour cancellation cutoff is measured against the class's scheduled start timestamp.
19. `DELETE /api/v1/bookings/{bookingId}` on a non-existent booking returns HTTP 404 with error code `BOOKING_NOT_FOUND`.
20. `DELETE /api/v1/bookings/{bookingId}` on a booking that belongs to another user returns HTTP 404 with error code `BOOKING_NOT_FOUND`.
21. `DELETE /api/v1/bookings/{bookingId}` on a booking that is already `CANCELLED` returns HTTP 409 with error code `BOOKING_NOT_ACTIVE`.
22. A successful cancellation frees exactly one spot in the class for subsequent reads and future bookings.
23. `POST /api/v1/admin/bookings` with a valid `userId`, valid `classId`, and an ADMIN Bearer token creates a `CONFIRMED` booking on behalf of the target user and returns HTTP 201 with the full booking object.
24. The admin on-behalf booking flow bypasses the target user's membership requirement.
25. The admin on-behalf booking flow still returns the same failure outcomes as member self-booking for invalid class ID, non-bookable class status, class already started, class full, and duplicate booking.
26. `POST /api/v1/admin/bookings` without an ADMIN Bearer token returns HTTP 403 with error code `ACCESS_DENIED`.
27. If two booking requests compete for the final available spot in a class, at most one request succeeds; the other returns HTTP 409 with error code `CLASS_FULL`.
28. Member-facing schedule surfaces show the booking state for the current user so that booked classes can be distinguished from unbooked classes.
29. Member-facing schedule surfaces show full classes as not bookable in the UI and do not present them as available spots.

## Out of Scope (for this version)
- Waitlist behavior when a class is full.
- Enforcing `maxBookingsPerMonth` as a hard booking limit.
- Attendance check-in or automatic transition from `CONFIRMED` to `ATTENDED`.
- Personal training selection or personal training booking.
- Admin cancellation of bookings on behalf of users.
- Automatic cancellation of existing bookings if a membership later becomes `CANCELLED` or `EXPIRED`.
- Preventing a user from holding overlapping bookings across two different classes.
- Notifications, reminders, or calendar sync on booking or cancellation.

## Open Questions
- Assumption for confirmation: booking entry points will first appear in the member-facing group schedule and any later member-home class preview surface, rather than requiring a separate dedicated bookings page in v1.

## Technical Notes for the Architect
- Capacity control is concurrency-sensitive because multiple users may attempt to claim the final spot at the same time.
- This feature is permission-sensitive because member self-booking depends on ACTIVE membership, while admin on-behalf booking explicitly bypasses that check.
- The booking flow should reuse the existing scheduled class source of truth from the Scheduler and Group Classes Schedule View.
- Clear state propagation matters: booking and cancellation outcomes must be reflected promptly in any member-facing class surface that shows spot availability or booking state.
