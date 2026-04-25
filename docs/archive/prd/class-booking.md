# PRD: Class Booking

## Overview
Class Booking lets a member with an active plan reserve a spot in a scheduled group class directly from the schedule, cancel that reservation up to two hours before class start, and review their full booking history inside the member cabinet. Admins get two supporting read surfaces: a per-user booking history and a per-class-instance attendee list. The feature turns today's flat "Booking is not available for this class" state on `/schedule` into an actionable workflow while keeping waitlists, notifications, check-in, payment-per-booking, rescheduling, and recurring bookings strictly out of scope.

This PRD **supersedes** `docs/prd/class-booking-cancellation.md` and the matching `docs/sdd/class-booking-cancellation.md`. It reuses existing endpoints, entities, and rules where they remain valid, but applies two deliberate rule changes relative to the superseded spec: (1) the cancellation cutoff is **two hours** before class start (was three), and (2) a member may hold **multiple confirmed bookings on the same class instance** and may hold confirmed bookings on overlapping classes — the prior `ALREADY_BOOKED` rule and any personal-conflict check are removed. Admin "create booking on behalf of a member" is not part of this PRD's acceptance set.

## User Roles
- **Member** — books, cancels, and reviews their own class bookings.
- **Admin** — reviews any member's booking history and the attendee list of any class instance.
- **Guest** — not involved. Guests cannot book.
- **Trainer** — out of scope for this feature.

## User Stories

### Happy Path
- As a Member with an active plan, I want to book a scheduled group class from `/schedule` so that I secure my spot.
- As a Member, I want to cancel a confirmed booking at least two hours before class start so that I can free my spot when plans change.
- As a Member, I want a dedicated "My Bookings" page inside the member cabinet listing my upcoming, past, and cancelled bookings with filters so that I can review my full booking history in one place.
- As a Member, I want to keep using the existing `MyBookingsDrawer` on `/schedule` as a quick peek so I do not have to leave the schedule for a fast check.
- As an Admin, I want to look up any member's booking history so that I can answer support questions without guessing.
- As an Admin, I want to see the attendee list for a specific class instance so that I know exactly who is expected at that session.

### Edge Cases
- As a Member without an active plan, when I try to book, I want the action to be blocked and to be told an active plan is required.
- As a Member, when the class is already at capacity, I want booking to be blocked so I do not receive a confirmation the gym cannot honour.
- As a Member, when a class has already started, I want booking and cancellation to be blocked so I cannot act on a past class.
- As a Member, when I try to cancel within two hours of class start, I want the cancellation to be rejected so the policy is enforced.
- As a Member, I want to be allowed to book the same class instance more than once and to hold overlapping bookings without being blocked — the system does not enforce personal schedule conflicts or duplicate-booking rules on the same class instance.

## Acceptance Criteria

1. A Member with an active plan can create a booking for a future `SCHEDULED` group class whose confirmed bookings count is strictly below capacity; the resulting booking is persisted with `status = CONFIRMED`, and subsequent reads of that class show confirmed bookings increased by exactly one and remaining spots decreased by exactly one.
2. Booking creation is rejected with a distinct, user-visible reason in each of these cases: (a) the caller has no active plan, (b) the class is at or above capacity, (c) the class's scheduled start time is at or before the current time, (d) the class id does not reference an existing, non-deleted, bookable group class. No `CONFIRMED` booking row is created in any of these cases. Having an existing `CONFIRMED` booking on the same class instance is **not** a rejection reason — the member is allowed to book the same instance again.
3. When two booking requests race for the final spot on the same class, at most one succeeds; the other is rejected with a "class is full" outcome, and the class's final confirmed booking count never exceeds capacity. A Member may hold multiple confirmed bookings for the same class instance and for classes whose time windows overlap; the system performs no personal-conflict or duplicate-booking check.
4. A Member can cancel their own `CONFIRMED` booking if and only if the current time is strictly more than two hours before the class's scheduled start. A successful cancellation sets the booking's status to `CANCELLED`, records a cancellation timestamp, and frees exactly one spot on that class for subsequent bookings. Cancellation attempts within the two-hour window, on a booking that is not `CONFIRMED`, or on a booking that does not belong to the caller are rejected with distinct reasons and do not mutate the booking.
5. A Member can retrieve their own booking history — upcoming, past, and cancelled — from two surfaces: (a) the existing `MyBookingsDrawer` quick peek on `/schedule`, and (b) a new dedicated "My Bookings" page inside the member cabinet. The dedicated page groups bookings into Upcoming vs Past/Cancelled, exposes at minimum a status filter (`all | confirmed | cancelled`), and for each row shows class name, scheduled start time, trainer names, booking status, and a cancel action that is enabled only when the booking is `CONFIRMED` and currently more than two hours before class start.
6. An Admin can retrieve the full booking history of any specified Member — including `CONFIRMED`, `CANCELLED`, and `ATTENDED` rows — ordered by scheduled start time with an optional status filter; each row exposes class name, scheduled start time, status, booking timestamp, and cancellation timestamp. Non-admin callers are rejected, and a request for a non-existent user returns a not-found outcome. This surface is exposed in the admin UI as a per-user booking history view.
7. An Admin can retrieve the attendee list for any specified class instance, consisting by default of all Members who currently hold a `CONFIRMED` booking on that instance, with each row exposing booking id, member id, member display name (from profile, with email fallback), status, and booking timestamp, and with capacity vs confirmed-count visible to the admin. Non-admin callers are rejected, and a request for a non-existent class instance returns a not-found outcome. This surface is exposed in the admin UI as a per-class attendee view.

## Out of Scope
- Waitlists or pending-booking queues when a class is full.
- Trainer-facing views of any kind.
- Email, push, or in-app notifications related to booking or cancellation.
- Payment or charge per booking (bookings are covered by the active membership).
- Attendance check-in, no-show tracking, or automatic `CONFIRMED` → `ATTENDED` transitions.
- Rescheduling a booking across classes (member must cancel and re-book).
- Recurring bookings.
- Admin creating, cancelling, or editing a booking on behalf of a member (the `POST /api/v1/admin/bookings` route may remain in code from the superseded spec but is not part of this PRD's acceptance criteria; no new UI entry point is introduced).
- Enforcing `maxBookingsPerMonth` from the membership plan as a hard booking limit.
- Duplicate-booking prevention on the same class instance and overlapping-booking prevention across different classes (both explicitly allowed per brief).
- Automatic cancellation of existing bookings if the owning membership later becomes `CANCELLED` or `EXPIRED`.
- Personal training booking.

## Open Questions
1. **Exact route for the new "My Bookings" cabinet page.** Candidates: `/profile/bookings`, `/bookings`, or a tab embedded inside the existing `UserProfilePage`. Default assumption: a sibling route under the cabinet area (e.g. `/profile/bookings`) with a link in the profile navigation.
2. **Past-booking pagination depth on the "My Bookings" page.** Should past bookings be capped (e.g. last 90 days) or fully paginated history? Default assumption: fully paginated history; upcoming sorted ascending by start time, past/cancelled sorted descending.
3. **Admin surface location for the two new read views.** Candidates: a new admin member-detail screen for per-user history; a panel inside the class-instance edit/detail context in `/admin/scheduler` for the attendee list; or dedicated admin bookings pages. Default assumption: per-user history lives inside an admin member-detail surface; attendee list lives in the class-instance detail inside `/admin/scheduler`.
4. **Duplicate-booking UX on `/schedule`.** With `ALREADY_BOOKED` removed, should the class card keep a single "Book spot" CTA that always creates a new booking (possibly producing multiple confirmed rows per instance for the same user), or switch to a "Booked — book again" affordance after the first booking? Default assumption: keep a single "Book spot" CTA that always creates a new booking when capacity and membership allow; the drawer and cabinet page reflect every confirmed row the member holds.
5. **Contract change on the cancellation-window error copy.** The superseded spec ships "You can no longer cancel within 3 hours of class start." This PRD requires the message to change to reflect two hours. Confirm the exact user-visible string, or accept the default: `You can no longer cancel within 2 hours of class start.`

## Notes for Designer
- The 2-hour cancellation cutoff replaces every existing "3 hours" string in class-booking UI — class card helper text, modals, drawer messages, toasts, and the new cabinet page.
- The `ALREADY_BOOKED` UI state and "You already booked this class" copy must be removed entirely. The schedule card should not block a repeat booking or show a "you already booked" state; with duplicates allowed, the booked/cancellable UI continues to reflect the member's most relevant upcoming booking for that class but must never disable the `Book spot` CTA on "already booked" grounds.
- Design the dedicated cabinet "My Bookings" page consistently with `UserProfilePage` (dark fitness theme: `bg-[#0F0F0F]` background, `bg-gray-900` cards, `text-white`/`text-gray-400`). Include loading, error, empty ("No upcoming bookings", "No past bookings"), and populated states; group Upcoming vs Past/Cancelled; expose a status filter; expose a cancel action gated on the 2-hour rule.
- Keep `MyBookingsDrawer` on `/schedule` as a lightweight quick peek, not a replacement for the cabinet page. Add a clear link from the drawer footer to the full cabinet page ("See all my bookings").
- The schedule page should keep distinct actionable states: bookable, booked-by-you (cancellable), booked-by-you (too late to cancel), full, past, and active-plan-required. Each state should make the reason for any disabled CTA visible inline without requiring a modal.
- Surface a "cancellable until {cutoffTime}" line on every booked-state card so members are never surprised by a locked cancel button.
- Admin per-user booking history: read-only table keyed by scheduled start time with status chips (`CONFIRMED`, `CANCELLED`, `ATTENDED`) and a status filter. No cancel or book actions.
- Admin attendee list: compact, read-only list inside the class-instance detail with member display name, status, and booking timestamp. Show capacity vs confirmed count at the top.
- No notifications or reminders exist in v1 — avoid any UI copy that implies the system will remind the member (calendar sync, email, push).
