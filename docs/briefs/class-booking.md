# Brief: class-booking

## Problem
Members cannot book classes from the scheduler — every class currently shows "Booking is not available for this class". There is also no way for a member to see a history of their bookings in their cabinet, and no way for an admin to see who has booked what.

## Roles
- **Member** — books and manages their own class bookings
- **Admin** — views booking history across users and attendee lists per class instance
- **Guest** — not involved (no booking ability)
- **Trainer** — out of scope for this feature

## Key Actions
- **Member:**
  - Book a class from the scheduler
  - Cancel a booking
  - View booking history in the member cabinet
- **Admin:**
  - View booking history per user
  - View attendee list for a specific class instance

## Business Rules
- A member must have an active plan to book a class.
- A class instance cannot be booked beyond its capacity. No waitlists.
- A booking can only be cancelled up to 2 hours before the class start time; cancellation is not allowed within 2 hours of start.
- A member may book the same class (across different instances) and may book overlapping classes — no conflict checks.
- Past class instances (those whose start time has already passed) are not bookable.

## Out of Scope
- Waitlists
- Trainer-facing views
- Email / push notifications
- Payment per booking
- Check-in / attendance tracking
- Rescheduling a booking across classes
- Recurring bookings
