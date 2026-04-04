---
name: gymflow-domain
description: GymPulse business domain — real entities, statuses, and rules derived
  from the actual codebase. Load when discussing features, writing PRDs/SDDs, or any business logic.
---

# GymPulse Domain Model

## Core Concepts

- **Member** — a registered user with an ACTIVE UserMembership
- **Guest** — a registered user without an active membership
- **Plan** — a MembershipPlan: name, description, priceInCents, durationDays, maxBookingsPerMonth, status
- **Membership** — a UserMembership linking a user to a plan with start/end dates and monthly booking counter
- **Template** — a ClassTemplate: reusable class definition (name, category, difficulty, defaultCapacity, room)
- **Instance** — a ClassInstance: a scheduled occurrence of a template on a specific date/time, with assigned trainers and room
- **Room** — a physical space where instances are held; has name, capacity, and optional photo
- **Trainer** — a staff member with specialisations (text[]), experienceYears, bio, and optional photo
- **Booking** — a user's reservation of a spot in a ClassInstance
- **Spot** — one available slot: `instance.capacity - confirmedBookings`
- **Favourite** — a UserTrainerFavorite linking a user to a trainer they follow
- **Profile** — a UserProfile with extended personal information (separate from the User auth record): firstName, lastName, phone, dateOfBirth, fitnessGoals (JSON array), preferredClassTypes (JSON array), profilePhotoData/profilePhotoMimeType, deletedAt

## Entity Status Values

### UserMembership.status
- `ACTIVE` — valid, end_date > now, can book classes
- `EXPIRED` — end_date has passed
- `CANCELLED` — manually cancelled

### MembershipPlan.status
- `ACTIVE` — plan is available for purchase
- (other values possible; enforced as a String column)

### ClassInstance.status
- `SCHEDULED` — upcoming, accepting bookings
- `CANCELLED` — cancelled by admin
- `COMPLETED` — class has finished

### ClassInstance.type
- `GROUP` — standard group class (only type currently implemented)

### Booking.status
- `CONFIRMED` — active reservation
- `CANCELLED` — cancelled by user or admin

## Key Business Rules

- A user must have an ACTIVE membership (`end_date > now AND status = ACTIVE`) to book classes
- A class is FULL when `confirmedBookings >= instance.capacity`
- Cancelling a booking immediately frees one spot
- A ClassInstance is linked to a ClassTemplate via `template_id` (nullable — instances can exist without a template)
- One ClassInstance can have multiple Trainers (ManyToMany via `class_instance_trainers` join table)
- `bookingsUsedThisMonth` on UserMembership is tracked; enforcement depends on `maxBookingsPerMonth` in Plan
- MembershipPlan prices are stored as `priceInCents` (integer) — always convert to display currency on the frontend
- Admins bypass membership check for booking on behalf of users
- Soft-delete pattern: `deletedAt` field on User, Trainer, Booking, UserMembership, ClassInstance, UserProfile

## Error Code Convention

All errors return: `{ "error": "Human readable", "code": "SCREAMING_SNAKE_CASE" }`
Error codes are defined as an enum in `domain/ErrorCode.kt`.

Known codes:
- `NO_ACTIVE_MEMBERSHIP` — user has no valid membership
- `CLASS_FULL` — no spots available
- `ALREADY_BOOKED` — duplicate booking attempt
- `CLASS_NOT_FOUND` — classId does not exist

## Image Storage

Trainers, Rooms, and ClassTemplates support images stored as binary (`photoData: ByteArray`)
with a corresponding `photoMimeType: String?` field.
UserProfile also stores a photo as `profilePhotoData: ByteArray?` / `profilePhotoMimeType: String?`.
Served via dedicated `GET /{entity}/{id}/photo` endpoints.

## Open Policy Questions (not yet implemented)

- Cancellation window (minimum notice before class start)
- Waitlist behaviour when a spot opens
- Monthly booking limit enforcement (field exists, enforcement partial)
