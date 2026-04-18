# PRD: Personal Training Booking

**Feature:** personal-training-booking  
**Date:** 2026-04-18  
**Status:** Draft

---

## Problem Statement

GymPulse currently supports only group class bookings. Members who want one-on-one coaching have no way to book a personal training session through the platform — they must contact the gym directly, creating friction and lost revenue. This feature closes that gap by giving members a self-service flow to browse trainers, view real-time availability, and book a 1-hour PT session.

---

## Goals

1. Allow members to discover trainers and book personal training sessions without gym-staff involvement.
2. Give trainers a read-only view of their upcoming PT schedule alongside group classes.
3. Give admins full visibility into all PT sessions across the club with filtering and CSV export.

---

## User Roles & Flows

### Member
1. Navigate to `/training` (requires authentication + active membership).
2. Browse the trainer directory; filter by specialty chip.
3. Select a trainer to open the slot picker (7-day calendar).
4. Click an available slot to open the Confirm Booking modal.
5. Confirm the booking; see it appear in "Your upcoming sessions" at the top of the page.
6. Cancel a future booking from the upcoming-sessions card (with a confirm dialog).

### Trainer
1. Navigate to `/trainer/sessions` (requires TRAINER role).
2. View upcoming sessions grouped by day — both PT sessions (green border) and group classes (orange border) that block PT slots.
3. See 3 stat tiles: PT sessions / Group classes / Total.
4. No create/edit/cancel actions — read-only.

### Admin
1. Navigate to `/admin/pt-sessions` (requires ADMIN role).
2. View 4 stat tiles: Active / Members booking / Trainers in play / Cancellations.
3. Filter sessions by full-text search, trainer, and status.
4. Export filtered results as CSV.
5. No create/edit actions from this view.

---

## Acceptance Criteria

### Member — Trainer Directory
1. AC-01: A logged-in member with an active membership can access `/training` and see a list of all active trainers.
2. AC-02: Each trainer card displays: avatar (initial fallback), name, bio, specialties, years of experience, next available slot date/time, and count of open slots this week.
3. AC-03: Clicking a specialty filter chip filters the trainer grid to show only trainers with that specialty; clicking the active chip (or "All") clears the filter.
4. AC-04: A member without an active membership who attempts to access `/training` is redirected to `/plans`.

### Member — Slot Picker
5. AC-05: After selecting a trainer, the slot picker displays a 7-column calendar (today + next 6 days) with all gym-hour slots (06:00–21:00).
6. AC-06: Slots are colour-coded: available (green "Book" button), group class (orange "Class" panel), booked by another member (dashed/white), or past / within 24h (muted dashed).
7. AC-07: The week paginator allows navigating up to 14 days forward from today; the forward button disables at the 14-day boundary.
8. AC-08: Slots that start less than 24 hours from now are rendered as "past" (non-interactive) even if the trainer is otherwise free.
9. AC-09: Clicking "Back to trainers" returns the member to the trainer directory without losing the specialty filter state.

### Member — Confirm & Book
10. AC-10: Clicking an available slot opens the Confirm Booking modal showing: trainer name + specialties, When, Duration (1 hour), Room, Cost (included), and cancel-policy footnote.
11. AC-11: Clicking "Confirm booking" creates the booking; the modal closes; a toast "Booked with {trainer} — {when}" appears for 2.6 s; the slot becomes non-interactive.
12. AC-12: If the slot was taken between page load and confirm (race condition), the server returns 409 and the modal displays an inline error "This slot is no longer available."
13. AC-13: Clicking "Not yet" or the backdrop closes the modal without creating a booking.

### Member — Upcoming Sessions
14. AC-14: The "Your upcoming sessions" card appears at the top of `/training` when the member has at least one confirmed future PT booking; it is hidden when there are none.
15. AC-15: Each session row shows: trainer avatar, date/time, session type pill, room, countdown, and a Cancel button.
16. AC-16: Clicking Cancel opens a confirm dialog; confirming sends the delete request; the row disappears on success.

### Trainer View
17. AC-17: A logged-in trainer navigating to `/trainer/sessions` sees only their own sessions.
18. AC-18: Sessions are grouped by calendar day with a sticky day label and item count.
19. AC-19: PT session rows have a green left border; group-class rows have an orange left border.
20. AC-20: The three stat tiles at the top show the correct counts for PT sessions, group classes, and their total within the displayed window.

### Admin View
21. AC-21: A logged-in admin navigating to `/admin/pt-sessions` sees all PT sessions across all trainers.
22. AC-22: The four stat tiles show: active (confirmed) bookings, unique members who have booked, unique trainers with bookings, and cancellations.
23. AC-23: The search input filters rows by trainer name, member name, room, and date (debounced 150 ms); result count is announced to screen readers via `aria-live`.
24. AC-24: The Trainer and Status selects further filter the visible rows.
25. AC-25: Clicking "Export CSV" downloads a CSV file containing all rows matching the current filters.
26. AC-26: Cancelled session rows render with strikethrough text and a red "Cancelled" pill.

### Business Rules (server-enforced)
27. AC-27: Booking a slot that starts less than 24 hours from now returns HTTP 422 with code `PT_LEAD_TIME_VIOLATION`.
28. AC-28: Booking a slot that overlaps an existing PT booking for the same trainer returns HTTP 409 with code `PT_TRAINER_OVERLAP`.
29. AC-29: Booking a slot that overlaps a group class assigned to the same trainer returns HTTP 409 with code `PT_TRAINER_CLASS_OVERLAP`.
30. AC-30: All PT sessions are exactly 1 hour; `endAt` is always `startAt + 1 hour` (the client never sends a duration).
31. AC-31: A trainer cannot set custom availability windows; availability is derived from gym hours minus existing assignments.

---

## Out of Scope

The following items are explicitly deferred and must NOT be built in this iteration:

- **Payments** — PT sessions are included in membership; no payment flow.
- **Recurring bookings** — "every Monday 9am for 8 weeks" is not supported.
- **Waitlist** — no waitlist when a trainer is fully booked.
- **Trainer intake forms / session notes** — the `note` field on a session row is reserved for a future spec.
- **Notifications** — no email/push on book, reminder, or trainer-side new-booking alert.
- **Mobile responsiveness** — the calendar grid is not designed for <640 px viewports.
- **Trainer custom availability** — trainers cannot block or open slots; availability is always gym hours minus assignments.
- **Trainer-initiated cancellations** — trainers cannot cancel a member's PT booking through the UI.
- **Trainer profile deep-link page** — no dedicated `/trainers/:id` page in this iteration.
- **Cancel policy enforcement** — cancellation is unconditional in this iteration (no 6-hour penalty window).
- **Booking quota** — whether a PT session counts against the monthly booking quota is deferred pending product confirmation.

---

## Business Rules Summary

| Rule | Enforcement |
|------|-------------|
| Duration fixed at 1 hour | Server always sets `endAt = startAt + 1h`; client never sends duration |
| 24-hour lead time | Server rejects `startAt < now + 24h` with `PT_LEAD_TIME_VIOLATION` |
| No trainer PT overlap | Server checks existing `pt_bookings` for same trainer in `[startAt, endAt)` |
| No trainer class overlap | Server checks `class_instances` assigned to trainer in `[startAt, endAt)` |
| Availability = gym hours − group classes − existing PT | Derived server-side; trainers cannot edit |
