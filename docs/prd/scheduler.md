# PRD: Scheduler (Admin)

## Overview
The Scheduler feature gives gym administrators a dedicated workspace to define trainer profiles, create and manage class templates, assign trainers to classes, and compose a weekly schedule through a visual drag-and-drop calendar interface. Admins can also import an existing schedule from a file and export the current schedule for offline sharing or backup. User-facing booking and client-side interaction are explicitly out of scope for this phase; the feature is purely an admin tool for building and maintaining the gym's programme.

## Goals
- What user problem does this solve? Admins today have no structured way to define who teaches what, when classes run, or how many spots are available. The Scheduler replaces ad-hoc spreadsheets and paper rosters with a single, authoritative source of truth for the weekly programme.
- What business outcome does it enable? A complete, machine-readable schedule unlocks the future Class Booking feature (the next phase), ensures trainers are never double-booked, and gives the gym a professional programme that members can trust.

## User Roles Involved
- **Admin** — the only role that interacts with this feature. All create, edit, delete, schedule, import, and export actions are Admin-only.
- **Guest / User / Trainer** — no interaction in this phase. The schedule data will be read by members in a future phase.

## User Stories

### Happy Path Stories

- As an admin, I want to create a trainer profile with their name, photo, bio, specialisations, contact email, and phone number so that I have a complete record of each trainer before assigning them to classes.
- As an admin, I want to upload a profile photo for a trainer so that members will later see a recognisable face next to each class.
- As an admin, I want to create a room with a name, optional capacity, and optional description so that rooms can be selected when scheduling classes.
- As an admin, I want to edit an existing room so that I can keep its details accurate.
- As an admin, I want to delete a room that is no longer in use; if the room is assigned to scheduled class instances, show a confirmation listing the affected instances before proceeding (room is removed from instances, not instances deleted).
- As an admin, I want to select a room from a managed list when creating a class template or editing a class instance, rather than typing free text.
- As an admin, I want to create a class template (e.g. "HIIT Bootcamp") with a name, description, category, default duration, default capacity, difficulty level, and default room so that I can reuse that definition when scheduling the class multiple times per week.
- As an admin, I want a library of predefined class templates pre-loaded on first use so that I do not have to type common classes from scratch.
- As an admin, I want to edit any field on an existing trainer profile or class template so that I can keep information accurate as the gym evolves.
- As an admin, I want to delete a trainer profile that is no longer active so that stale records do not clutter the trainer list.
- As an admin, I want to delete a class template that is no longer offered so that the schedule builder stays clean.
- As an admin, I want to assign one or more trainers to a scheduled class instance so that coverage is clear and double-booking is prevented.
- As an admin, I want to drag a class from a palette onto a weekly calendar grid (day + time slot) and see it placed immediately so that building the weekly programme is fast and visual.
- As an admin, I want to drag an already-placed class instance to a different day or time slot so that I can reschedule without deleting and recreating.
- As an admin, I want to set the specific start time, duration, capacity, and assigned trainer(s) for each individual scheduled instance, overriding the class template defaults where needed, so that the schedule reflects the real-world programme accurately.
- As an admin, I want to export the current weekly schedule as a CSV or iCal file so that I can share it with staff via email or import it into external calendars.
- As an admin, I want to import a schedule from a CSV file so that I can migrate an existing programme without re-entering every entry manually.
- As an admin, I want to navigate forward and backward between weeks so that I can plan multiple weeks in advance or review past schedules.
- As an admin, I want to copy the current week's schedule to the next week so that recurring programmes require minimal re-entry.

### Edge Case Stories

- As an admin, I want to see a clear validation error when I try to schedule the same trainer in two overlapping class instances in the same week so that I cannot accidentally create a double-booking.
- As an admin, I want to see a warning (not a hard block) when I place two class instances in the same room at the same overlapping time, so that I am informed of a potential room conflict but can override it if needed.
- As an admin, I want to be prevented from saving a scheduled class instance with a capacity of zero or a duration of zero minutes so that invalid data does not reach the system.
- As an admin, I want to see a clear error message when an import file has an unrecognised format or missing required columns so that I know exactly what to fix before retrying.
- As an admin, I want to receive a partial-success report when an import file has some valid rows and some invalid rows so that valid entries are saved and I know which rows need manual correction.
- As an admin, I want to be asked for confirmation before deleting a trainer profile that is assigned to one or more scheduled class instances, listing the affected instances, so that I do not accidentally orphan scheduled classes.
- As an admin, I want to be asked for confirmation before deleting a class template that has existing scheduled instances, listing the affected instances, so that I do not accidentally break the schedule.
- As an admin, I want to see a visual indicator on a class card in the calendar when no trainer is assigned so that unassigned slots are immediately obvious and easy to fix.
- As an admin, I want to see a validation error if I try to upload a trainer photo that exceeds 5 MB or is not a JPEG/PNG/WEBP file so that the system does not accept unusable images.
- As an admin, when a CSV import row contains a `room` value that does not match any existing room name, the row should be rejected with reason `ROOM_NOT_FOUND`.

## Acceptance Criteria

### Trainer Profile Management

1. An admin can create a trainer profile with the following fields: first name (required), last name (required), profile photo (optional at creation, uploadable separately), email address (required, unique across trainers), phone number (optional), bio/description (optional, max 1000 characters), and specialisations (optional, stored as a list of free-text tags, max 10 tags, each max 50 characters).
2. An admin can upload a profile photo for a trainer; accepted formats are JPEG, PNG, and WEBP; maximum file size is 5 MB; the system returns error code `INVALID_PHOTO_FORMAT` for wrong formats and `PHOTO_TOO_LARGE` for oversized files.
3. An admin can edit any field on an existing trainer profile and save the changes; the updated values are persisted and reflected immediately in the UI.
4. An admin can delete a trainer profile that has no assigned scheduled class instances; the profile is removed and no longer appears in the trainer list.
5. When an admin attempts to delete a trainer profile that is assigned to one or more scheduled class instances, the system returns a confirmation prompt listing the names and scheduled times of the affected instances before proceeding; if confirmed, the trainer is removed from those instances (leaving the slot unassigned) and the profile is deleted.
6. The trainer list is paginated at 20 records per page, sortable by last name ascending by default, and searchable by first name, last name, or email.
7. Attempting to create or update a trainer with a duplicate email returns 409 with error code `TRAINER_EMAIL_CONFLICT`.
8. Attempting to create a trainer without a first name, last name, or email returns 422 with error code `VALIDATION_ERROR` and a list of the failing fields.

### Room Management

9. An admin can create a room with the following fields: name (required, max 100 characters, unique across all rooms), capacity (optional integer, min 1), and description (optional, max 500 characters).
10. The room list is paginated at 20 per page, sortable by name ascending by default, and searchable by name.
11. An admin can edit any field on an existing room; changes do NOT retroactively affect existing scheduled class instances that already reference that room.
12. An admin can delete a room that has no scheduled class instances assigned to it; the room is removed from the list.
13. When an admin attempts to delete a room that is assigned to one or more scheduled class instances, the system shows a confirmation prompt listing the affected instances; if confirmed, those instances have their room cleared (set to null) and the room is deleted.
14. Attempting to create or update a room with a name that already exists returns 409 with error code `ROOM_NAME_CONFLICT`.
15. Attempting to create a room without a name returns 422 with error code `VALIDATION_ERROR`.

### Class Template Management

16. On first launch of the Scheduler (i.e., when zero class templates exist), the system seeds the following predefined class templates automatically: HIIT Bootcamp, Yoga Flow, Spin Cycle, Pilates Core, Boxing Fundamentals, Strength & Conditioning, Zumba Dance, CrossFit WOD, Aqua Aerobics, Meditation & Stretch. Each seed template is created with a default duration of 60 minutes, default capacity of 20, and the appropriate category (Cardio, Mind & Body, Cycling, Core, Combat, Strength, Dance, Functional, Aqua, Wellness respectively).
17. An admin can create a custom class template with the following fields: name (required, max 100 characters), description (optional, max 500 characters), category (required; one of: Cardio, Strength, Flexibility, Mind & Body, Cycling, Combat, Dance, Functional, Aqua, Wellness, or Other), default duration in minutes (required, integer, min 15, max 240), default capacity (required, integer, min 1, max 500), difficulty level (required; one of: Beginner, Intermediate, Advanced, All Levels), and default room (optional; selected from the managed room list).
18. An admin can edit any field on a class template; changes to default values do NOT retroactively update already-scheduled class instances that were derived from that template.
19. An admin can delete a class template that has no scheduled instances; the template is removed from the palette.
20. When an admin attempts to delete a class template that has one or more scheduled instances, the system shows a confirmation prompt listing the affected instances; if confirmed, those instances remain on the schedule but are no longer linked to a template (they become standalone instances), and the template is deleted.
21. The class template list is searchable by name and filterable by category.
22. Attempting to create a class template with a name that already exists returns 409 with error code `CLASS_TEMPLATE_NAME_CONFLICT`.

### Schedule (Calendar) Management

23. The schedule view displays a 7-day week grid with time slots from 06:00 to 22:00 in 15-minute increments; each column represents one day (Monday through Sunday).
24. An admin can drag a class template from the side palette and drop it onto a day/time slot in the calendar; a new scheduled class instance is created with the template's default values pre-filled.
25. An admin can drag an existing scheduled class instance to a different day or time slot within the same week; the instance's start time and day are updated immediately.
26. Each scheduled class instance card on the calendar displays: class name, start time, duration, assigned trainer name(s) (or "Unassigned" if none), and current capacity.
27. An admin can click a scheduled class instance card to open an edit panel where they can override: start time, duration (min 15, max 240 minutes), capacity (min 1, max 500), assigned trainer(s) (multi-select from the trainer list), and room (optional; selected from the managed room list).
28. Assigning a trainer to a class instance that overlaps (same trainer, overlapping time on the same day) with another instance returns 409 with error code `TRAINER_SCHEDULE_CONFLICT`.
29. Two class instances sharing the same room (matched by room FK, not string comparison) with overlapping times display a visual amber warning indicator on both cards; the admin can dismiss the warning and save anyway (soft conflict, not a hard block); the system logs the override.
30. An admin can delete a scheduled class instance from the calendar; the slot is freed immediately.
31. An admin can navigate to the previous or next week using Back/Forward controls; the URL reflects the selected week (e.g., `?week=2026-W14`).
32. An admin can copy all scheduled class instances from the currently displayed week to the next week; instances in the target week that already exist are not affected (no overwrite); a confirmation dialog shows how many instances will be copied before proceeding.
33. An admin can set a class instance capacity to any value between 1 and 500; attempting to save 0 or a negative number returns 422 with error code `VALIDATION_ERROR`.
34. A scheduled class instance with no assigned trainer displays a distinct visual indicator (e.g., a red border or an "Unassigned" badge) on its calendar card.
35. The system prevents saving a class instance with a duration of 0 or fewer minutes, returning 422 with error code `VALIDATION_ERROR`.

### Import

36. An admin can upload a CSV file to import a schedule; the expected columns are: `class_name`, `date` (ISO 8601 date, YYYY-MM-DD), `start_time` (HH:MM, 24-hour), `duration_minutes` (integer), `capacity` (integer), `trainer_email` (optional), `room` (optional).
37. Rows with all required fields valid are imported and appear on the calendar immediately after import completes.
38. Rows with missing or invalid required fields are rejected and listed in an error report returned to the admin; valid rows in the same file are still imported (partial success).
39. If the CSV file has an unrecognised structure (missing required column headers), the entire import is rejected with error code `IMPORT_FORMAT_INVALID` and no rows are saved.
40. A `trainer_email` value in the import that does not match any existing trainer profile is treated as an invalid value for that row; the row is rejected with the reason `TRAINER_NOT_FOUND`.
41. A `room` value in the import that does not match any existing room name is treated as an invalid value for that row; the row is rejected with the reason `ROOM_NOT_FOUND`.
42. A `class_name` in the import that does not match any existing class template creates a new standalone scheduled instance (not linked to a template) using the values from the CSV row.
43. Maximum CSV file size for import is 2 MB; exceeding this returns error code `IMPORT_FILE_TOO_LARGE`.

### Export

44. An admin can export the currently displayed week's schedule as a CSV file; the downloaded file contains the same columns as the import format (`class_name`, `date`, `start_time`, `duration_minutes`, `capacity`, `trainer_email`, `room`), one row per scheduled instance; the `room` column outputs the room's name (or blank if no room is assigned).
45. An admin can export the currently displayed week's schedule as an iCal (.ics) file; each scheduled instance is exported as a VEVENT with SUMMARY (class name), DTSTART, DTEND, LOCATION (room name, or omitted if no room assigned), and DESCRIPTION (trainer name(s) and class description).
46. Both export actions complete synchronously for schedules up to 200 instances per week; the file download begins immediately with no loading screen longer than 3 seconds.

## Out of Scope (for this version)

- Member-facing class schedule view (browsing classes as a user/guest)
- Class booking and cancellation by members
- Waitlist management
- Recurring class rules (e.g., "every Monday at 09:00 for 12 weeks") — only manual copy-week and drag-and-drop are supported
- Push or email notifications when a class is created, edited, or deleted
- Trainer login accounts or a trainer-facing portal
- Payment or refund handling related to class cancellations
- Multi-gym / multi-location branching (all classes belong to one gym in this version)
- Analytics or reporting on class utilisation
- Member-facing schedule export (only admin can export)
- Undo/redo history for drag-and-drop actions
- Mobile-optimised layout for the drag-and-drop calendar (desktop admin view only)

## Open Questions

1. Should the weekly schedule be scoped to a specific "programme period" (e.g., a 4-week block that repeats), or is it a true open-ended infinite calendar where admins populate any week individually? The current acceptance criteria assume infinite per-week scheduling — confirm this is correct.
2. The brief says "multiple trainers per class" — should there be a cap on the number of co-trainers per class instance (e.g., max 3)? Currently no cap is specified; leaving it unconstrained.
3. Should deleting a trainer profile from the system also remove them from exported iCal events that were previously downloaded, or is export always a point-in-time snapshot with no retroactive changes? Assumption: export is a point-in-time snapshot.
4. Should the "copy week" feature copy to the immediately next calendar week only, or allow the admin to choose any target week? Currently scoped to next week only.
5. What is the desired behaviour when two class instances in the same room overlap and the admin saves with the warning dismissed — should this generate an audit log entry or admin-visible history, or just a server-side log?
6. Is there a maximum number of class instances allowed per day or per week, or is the system unbounded? No cap is assumed currently.
7. Should imported class instances that conflict with existing trainer schedules be rejected (respecting the trainer double-booking rule) or imported with a warning? Currently assumed: rejected with `TRAINER_SCHEDULE_CONFLICT` error in the row-level error report.

## Technical Notes for the Architect

- The weekly calendar grid will need efficient querying of all scheduled class instances within a date range (start of week to end of week); an index on `scheduled_at` is essential.
- Drag-and-drop on the frontend will need optimistic UI updates: update local state immediately on drop, then confirm with a PATCH call and roll back on failure.
- Trainer double-booking detection requires a time-overlap query scoped to the trainer and date; this must be enforced in the service layer (not just the UI) to prevent race conditions.
- Trainer photo upload should be handled via a dedicated multipart endpoint; photos should be stored in object storage (e.g., S3-compatible), not the database; only the URL is persisted.
- The iCal export format must comply with RFC 5545; use a library rather than hand-rolling the serialisation.
- CSV import should be processed synchronously for files up to 2 MB; for larger files (out of scope now) the future pattern would be async job + polling.
- The seeding of predefined class templates on first launch must be idempotent — running it twice must not create duplicates (check by template name before inserting).
- Room conflict detection is a soft check (warn, not block); the UI must clearly differentiate soft conflicts (amber warning) from hard conflicts (trainer double-booking, which is a hard block). Room conflict detection uses `room_id` FK equality (not string matching), making it reliable even when room names change.
- The `Room` entity requires a new table with a unique name constraint. `class_templates` and `class_instances` store a nullable FK `room_id` referencing `rooms.id`. This replaces any free-text room label approach.
- The `GymClass` entity in the current domain model uses `trainerId` (single FK); this feature requires a many-to-many relationship between scheduled class instances and trainers; a migration to introduce a join table will be needed.
- The existing domain model has `GymClass` and `Trainer` entities; this PRD introduces the concept of a "class template" (reusable definition) separate from a "scheduled class instance" (a concrete occurrence on a specific date/time); the architect should decide whether to extend `GymClass` to serve both roles or introduce a new `ClassTemplate` entity.
