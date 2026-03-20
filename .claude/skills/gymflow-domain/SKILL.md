---
name: gymflow-domain
description: Load GymFlow business domain vocabulary and rules. Activate when
  discussing features, writing PRDs, SDDs, or any business logic.
---

# GymFlow Domain Model & Business Rules

## Core Terms
- **Member** — a registered user with an active membership plan
- **Guest** — a registered user without an active membership
- **Membership** — a UserMembership record linking a user to a plan, with start/end dates
- **Plan** — a MembershipPlan defining price, duration, and booking limits
- **Class** — a scheduled GymClass with a trainer, time, duration, and capacity
- **Spot** — one available booking slot in a class (capacity - confirmed bookings)
- **Booking** — a confirmed or cancelled reservation of a spot in a class
- **Check-in** — marking attendance for a booking on the day of the class

## Key Business Rules
- A user must have an ACTIVE membership (end_date > now) to book classes
- A class is FULL when confirmed bookings >= capacity
- Cancelling a booking immediately frees up one spot
- A trainer can be linked to multiple classes but belongs to one user account
- Admins can book classes on behalf of users (admin bypass membership check)

## Status Values
- Membership: `ACTIVE`, `EXPIRED`, `CANCELLED`
- Booking: `CONFIRMED`, `CANCELLED`, `ATTENDED`
- Class: `SCHEDULED`, `CANCELLED`, `COMPLETED`

## Open Policy Questions (not yet implemented)
- Cancellation window (minimum notice before class start)
- Waitlist behaviour when a spot opens
- Booking limits per membership plan per month