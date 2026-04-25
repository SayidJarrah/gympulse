# GymPulse — Product Specification

This is the canonical living spec for every feature. One section per feature.
Behavioural rules instead of numbered acceptance criteria. Cross-references between
sections use slug syntax (e.g. ``Depends on: `auth`, `membership-plans` ``).

For domain entities, schema, API endpoints, routes, stores, and component directories,
see `docs/architecture.md`.

---

## Auth — `auth`

**Status:** active
**Owner of:** `/login`, `/register` (legacy redirect to `/onboarding`); `authStore`; `frontend/src/pages/auth/`, `frontend/src/components/auth/`
**Depends on:** —

### What user can do
- A guest can register with email + password and receive auth tokens.
- A guest can log in with email + password and receive an access token + refresh token.
- An authenticated user can exchange a refresh token for a new access + refresh token (token rotation).
- An authenticated user can log out, invalidating the submitted refresh token.
- An admin (seeded via Flyway migration) can log in with the same endpoint as users.

### Rules and invariants
- Passwords are stored as bcrypt hashes (cost factor ≥ 10); plaintext never appears in logs, responses, or DB.
- Self-registration always produces role `USER`. A `role` field in the request body is silently ignored — no API path creates an `ADMIN`.
- Access tokens are signed JWTs with claims `sub`, `role`, `iat`, `exp`. Lifetime is configurable via `JWT_EXPIRY_MS` (default 1 hour).
- Refresh tokens are server-side only; the DB stores their hash, not the raw value. Lifetime is configurable via `REFRESH_TOKEN_EXPIRY_DAYS` (default 30 days).
- Refresh rotation: every successful `/refresh` call invalidates the submitted token atomically with issuing the new pair. Re-using a rotated-out token returns `REFRESH_TOKEN_INVALID`.
- Login with unknown email and login with wrong password return the same `INVALID_CREDENTIALS` response, to prevent user enumeration.
- Email validation uses RFC 5322 basic format; password is 8–15 characters.
- `/auth/register`, `/auth/login`, `/auth/refresh` are public. `/auth/logout` requires a valid access token. Logout is idempotent — calling it with an unknown or already-invalidated refresh token still returns 204.
- The register endpoint also creates a `user_profiles` row and returns the same shape as login (tokens + expiresIn + hasActiveMembership), so the onboarding flow can authenticate immediately. (See `onboarding-unified-signup`, `onboarding-terms-early`.)

### Screens
- Login page — email + password form, error banner on bad credentials.
- Register page — kept only as a permanent redirect to `/onboarding`; the wizard's credentials step is the new signup surface.

### Out of scope (deferred)
- Password reset / forgot-password flow.
- Email verification on registration (account is active immediately).
- Social login (Google, Apple, Facebook).
- Multi-factor authentication.
- Account lockout after N failed attempts.
- Session listing or "log out all devices".

### History
- 2026-04-25 — initial (extracted from `docs/prd/auth.md`, `docs/sdd/auth.md`).

---

## Membership Plans — `membership-plans`

**Status:** active
**Owner of:** `/plans`, `/plans/:id`, `/admin/plans`; `membershipPlanStore`; `frontend/src/pages/plans/`, `frontend/src/components/plans/`
**Depends on:** `auth`

### What user can do
- A guest or authenticated user can browse the public list of active plans (paginated).
- A guest or authenticated user can view a single active plan's full detail.
- An admin can create a new plan with name, description, price, and duration.
- An admin can edit any field on an existing plan.
- An admin can deactivate a plan (removes it from the public catalogue without deleting it) and reactivate a deactivated plan.
- An admin can list all plans regardless of status, optionally filtering by `?status=ACTIVE|INACTIVE`.

### Rules and invariants
- Plans have status `ACTIVE` or `INACTIVE`.
- The public list and detail endpoints only return `ACTIVE` plans. An `INACTIVE` plan returns `PLAN_NOT_FOUND` to non-admin callers (no leaking of existence).
- Creation/update validation: `priceInCents > 0` (`INVALID_PRICE`), `durationDays > 0` (`INVALID_DURATION`), non-blank `name` (`INVALID_NAME`), non-blank `description` (`INVALID_DESCRIPTION`).
- Editing `priceInCents` on a plan with at least one active `UserMembership` is rejected with `PLAN_HAS_ACTIVE_SUBSCRIBERS`.
- Deactivating a plan does not alter or invalidate any existing `UserMembership` rows that reference it.
- Toggling status of an already-active or already-inactive plan returns `PLAN_ALREADY_ACTIVE` / `PLAN_ALREADY_INACTIVE`.
- Plans are stored in cents (integer) to avoid floating-point monetary rounding. Optimistic locking (`@Version`) prevents lost-update races between concurrent admin edits.
- Two plans may share the same name (no duplicate-name check).
- Per-plan booking limits (`maxBookingsPerMonth`) live on the plan but are owned/enforced by `class-booking` policy decisions.

### Screens
- Public plans catalogue — grid of active plan cards with price + duration.
- Plan detail page — full description and call-to-action to purchase.
- Admin plans page — table of all plans with create / edit / activate / deactivate controls.

### Out of scope (deferred)
- Hard delete of a plan — only deactivation is supported, to preserve referential integrity.
- Plan versioning or audit history of field changes.
- Promotional pricing, discount codes, time-limited offers.
- Plan images.
- Payment / checkout — see `user-membership-purchase`.

### History
- 2026-04-25 — initial (extracted from `docs/prd/membership-plans.md`, `docs/sdd/membership-plans.md`).

---

## User Membership Purchase — `user-membership-purchase`

**Status:** active
**Owner of:** `/membership`; `membershipStore`; `frontend/src/pages/membership/`, `frontend/src/components/membership/`
**Depends on:** `auth`, `membership-plans`

### What user can do
- An authenticated user can activate (purchase) a membership plan, immediately becoming a Member with an `ACTIVE` `UserMembership`.
- An authenticated user can view their own current `ACTIVE` membership: plan name, start date, end date, bookings used / max, renewal date.
- An authenticated user can cancel their own active membership.
- An authenticated user can re-purchase any active plan immediately after cancelling (no lock-in).
- An admin can list all `UserMembership` rows across all users, filterable by `?status=` and `?userId=`.
- An admin can manually cancel any user's `ACTIVE` membership.

### Rules and invariants
- A user may hold at most one membership with `status = ACTIVE` at a time. The DB enforces this via a partial unique index on `(user_id) WHERE status = 'ACTIVE'`. Two concurrent purchase requests result in exactly one creation; the loser receives `MEMBERSHIP_ALREADY_ACTIVE` (HTTP 409).
- Activation is free and instant — there is no payment integration in this version.
- `startDate` is today, `endDate = today + plan.durationDays`. Both stored as `DATE` (not timestamp).
- Activating an `INACTIVE` plan returns `PLAN_NOT_AVAILABLE` (HTTP 422). Activating a non-existent plan returns `PLAN_NOT_FOUND`.
- `bookingsUsedThisMonth` resets at the start of each calendar month (mechanism owned by the architect; deferred — see Out of scope).
- Cancellation sets `status = CANCELLED` but never deletes the row — history is preserved.
- Cancelling a non-existent or already-non-`ACTIVE` membership returns `MEMBERSHIP_NOT_ACTIVE` / `MEMBERSHIP_NOT_FOUND` / `NO_ACTIVE_MEMBERSHIP`.
- Admins cannot create a membership on behalf of a user — activation is self-service only.
- Status `EXPIRED` exists in the data model but the auto-expiry job is a deferred feature; the booking gate filters by `status = ACTIVE` only and does not check `endDate`.
- Status `PLAN_PENDING` exists in the data model and is owned by `onboarding-unified-signup`/`onboarding-terms-early`; this feature does not transition into or out of `PLAN_PENDING`.

### Screens
- My Membership page — current plan summary with cancel action and confirmation dialog.

### Out of scope (deferred)
- Payment processing, invoicing, refunds, credits.
- Membership renewal — cancelled users must purchase again.
- Auto-expiry scheduler (status transition `ACTIVE → EXPIRED` on `endDate` passing) — placeholder: `EXPIRED` enum value already exists; downstream booking access checks `status = ACTIVE` only.
- Plan upgrade / downgrade / switch — user must cancel and re-purchase.
- Pause or freeze a membership.
- Transferring membership between users.
- Notifications on purchase or cancellation.
- `bookingsUsedThisMonth` increment / monthly reset logic — owned by `class-booking` and a future scheduler.

### History
- 2026-04-25 — initial (extracted from `docs/prd/user-membership-purchase.md`, `docs/sdd/user-membership-purchase.md`).

---

## User Profile Management — `user-profile-management`

**Status:** active
**Owner of:** `/profile`; `profileStore`; `frontend/src/pages/profile/UserProfilePage.tsx`, `frontend/src/components/profile/`
**Depends on:** `auth`, `user-membership-purchase`, `entity-image-management`

### What user can do
- An authenticated user can view their own profile in one place: identity (`email` read-only), name, contact, optional fitness fields, emergency contact, and membership status block.
- An authenticated user can update first name, last name, phone, date of birth, fitness goals, preferred class types, and emergency contact.
- An authenticated user can sign out, change password (existing password flow), and cancel their membership from the same page.
- The profile page surfaces the active membership plan name, booking usage bar, renewal date, and price (the Membership Control card) alongside personal information.
- (Photo upload is delivered as part of `entity-image-management`.)

### Rules and invariants
- Profile data lives in `user_profiles`, keyed one-to-one by `user_id` (separate from the auth-focused `users` table).
- `email`, `role`, and `userId` are read-only at this endpoint; submitting any of them to `PUT /profile/me` returns `READ_ONLY_FIELD` (HTTP 400).
- `GET /profile/me` returns HTTP 200 even when the caller has never saved a profile — editable fields come back as `null` or empty arrays.
- Field validation: `firstName` / `lastName` 1–50 chars (`INVALID_FIRST_NAME` / `INVALID_LAST_NAME`); `phone` valid international format ≤ 20 chars (`INVALID_PHONE`); `dateOfBirth` valid calendar date not in the future, member must be ≥ 16 years old (`INVALID_DATE_OF_BIRTH`); `fitnessGoals` and `preferredClassTypes` ≤ 5 items each, each 1–50 chars after trim (`INVALID_FITNESS_GOALS` / `INVALID_PREFERRED_CLASS_TYPES`).
- List fields are de-duplicated case-insensitively before persistence; first-occurrence order is preserved.
- `emergencyContact` is optional. If provided, both `name` and `phone` must be non-blank (name ≤ 100, phone ≤ 30); a partial object returns `INVALID_EMERGENCY_CONTACT`. Submitting `null` clears it.
- Membership is not required to manage profile data — every authenticated `USER` can edit their profile.
- A user can only access `/me` — there is no endpoint accepting an arbitrary `userId` from the client.
- `createdAt` is set on first save; `updatedAt` is bumped on every successful update.
- The profile page redesign (member-profile-redesign, 2026-04-18) introduces the Pulse-DNA two-column layout and inline-edit per field, plus the consolidated Membership Control card and Account Actions row.

### Screens
- Profile page — Personal Information card + Membership Control card (two-column grid) + Account Actions row (sign out, change password, cancel membership).

### Out of scope (deferred)
- Changing login `email` or `password` — owned by `auth`.
- Medical history, injury notes, waiver data, or other high-sensitivity PII.
- Membership pause flow — placeholder: stub toast only in this iteration.
- Update payment method — placeholder: stub toast only; Stripe out of scope.
- Change plan flow — navigates to `/pricing?intent=change` (existing pricing page).
- Attendance history, booking history (booking history lives on `/profile/bookings`, owned by `class-booking`), or activity timeline.
- Audit trail or version history of profile changes.
- Admin viewing or editing user profiles.

### History
- 2026-04-25 — initial (extracted from `docs/prd/user-profile-management.md`, `docs/sdd/user-profile-management.md`, `docs/sdd/member-profile-redesign.md`).

---

## Scheduler (Admin) — `scheduler`

**Status:** active
**Owner of:** `/admin/scheduler`, `/admin/trainers`, `/admin/rooms`, `/admin/class-templates`; `schedulerStore`; `frontend/src/pages/admin/`, `frontend/src/components/admin/`, `frontend/src/components/scheduler/`, `frontend/src/components/rooms/`
**Depends on:** `auth`, `entity-image-management`

### What user can do
- An admin can manage trainer profiles: create, edit, delete, and search/paginate (20 per page, sortable by last name, searchable by name or email). Photo upload is delegated to `entity-image-management`.
- An admin can manage rooms: create, edit, delete, search/paginate by name. Editing a room does not retroactively affect existing class instances; deleting a room with assigned instances clears the room link on those instances after admin confirmation.
- An admin can manage class templates (reusable definitions with name, description, category, default duration, default capacity, difficulty, default room). On first launch, ten predefined templates are seeded automatically (HIIT Bootcamp, Yoga Flow, Spin Cycle, Pilates Core, Boxing Fundamentals, Strength & Conditioning, Zumba Dance, CrossFit WOD, Aqua Aerobics, Meditation & Stretch).
- An admin can build a weekly schedule on a 7-day grid (06:00–22:00, 15-min increments) by dragging templates from a palette onto day/time slots.
- An admin can drag an existing scheduled class instance to a different day/time within the same week.
- An admin can edit an instance's start time, duration (15–240 min), capacity (1–500), assigned trainers (multi-select), and room.
- An admin can copy the current week's instances to the next week without overwriting any existing rows in the target week.
- An admin can navigate forward and backward between weeks; the URL reflects the selected ISO week (`?week=2026-W14`).
- An admin can import a schedule from CSV (`class_name`, `date`, `start_time`, `duration_minutes`, `capacity`, `trainer_email`, `room`) up to 2 MB; valid rows are imported and invalid rows are reported with row-level reasons (partial success).
- An admin can export the displayed week as CSV (same columns) or as iCal (.ics) per RFC 5545.

### Rules and invariants
- Trainer email must be unique across trainers (`TRAINER_EMAIL_CONFLICT`).
- Room name must be unique across rooms (`ROOM_NAME_CONFLICT`).
- Class template name must be unique (`CLASS_TEMPLATE_NAME_CONFLICT`).
- Trainer double-booking is a hard block: assigning a trainer to a class instance that overlaps another assignment for the same trainer returns `TRAINER_SCHEDULE_CONFLICT` (HTTP 409). Enforced server-side, not just in UI.
- Room conflict is a soft warning (amber indicator on both cards), not a hard block. Detection uses `room_id` FK equality, not string matching. Overrides are logged.
- Validation: capacity 1–500, duration 15–240 min; instance with 0 duration or 0/negative capacity returns `VALIDATION_ERROR`.
- Deleting a trainer / template / room with assigned instances requires a confirmation listing the affected instances. On confirm, the trainer/template is unlinked from those instances (instances are not deleted), then the entity is deleted.
- Class templates have a `category` from a fixed list (Cardio, Strength, Flexibility, Mind & Body, Cycling, Combat, Dance, Functional, Aqua, Wellness, Other) and difficulty from `Beginner | Intermediate | Advanced | All Levels`.
- A scheduled instance with no assigned trainer renders with a distinct visual indicator ("Unassigned" / red border).
- Edits to template defaults do NOT retroactively update already-scheduled instances.
- CSV import: `trainer_email` not matching → `TRAINER_NOT_FOUND` row error; `room` not matching → `ROOM_NOT_FOUND` row error; `class_name` not matching → creates a standalone instance not linked to a template; missing required column headers → entire import rejected with `IMPORT_FORMAT_INVALID`; file > 2 MB → `IMPORT_FILE_TOO_LARGE`.
- The seed of predefined class templates on first launch is idempotent — duplicates are not created on re-runs.

### Screens
- Admin scheduler page — weekly grid + side palette of class templates.
- Admin trainers, rooms, class templates pages — list/edit CRUD surfaces.
- Class instance edit panel — opens on click from the scheduler grid.

### Out of scope (deferred)
- Member-facing schedule view (owned by `group-classes-schedule-view`).
- Class booking and cancellation by members (owned by `class-booking`).
- Recurring class rules ("every Monday for 12 weeks") — only manual copy-week and drag-and-drop.
- Trainer login / trainer-facing portal beyond the read-only sessions view (owned by `personal-training-booking`).
- Multi-gym / multi-location branching.
- Mobile-optimised drag-and-drop layout (desktop admin only).
- Undo/redo history for drag-and-drop.
- Member-facing schedule export.

### History
- 2026-04-25 — initial (extracted from `docs/prd/scheduler.md`, `docs/sdd/scheduler.md`).

---

## Group Classes Schedule View — `group-classes-schedule-view`

**Status:** active
**Owner of:** `/schedule`; `groupClassScheduleStore`; `frontend/src/pages/schedule/GroupClassesSchedulePage.tsx`, `frontend/src/components/schedule/`
**Depends on:** `auth`, `scheduler`, `class-booking`

### What user can do
- An authenticated `USER` can browse the gym's group class programme inside the portal.
- The user can switch between Week, Day, and List views without losing the selected period context.
- The user can navigate forward and backward through periods (week, day, or 14-day list).
- Default state on first load is the current calendar week in Week view.
- The user can read each class entry's name, scheduled date (when not implied by the view), start time, and assigned trainer name(s).

### Rules and invariants
- Membership is no longer required to *browse* the schedule — the SDD explicitly relaxes the historical "ACTIVE membership only" gate. Browse is `USER`-authenticated only. (Booking from this surface still requires an active plan — that gate lives in `class-booking`.)
- Unauthenticated visitors must sign in before any schedule data is shown.
- Week view: Monday-through-Sunday grid, classes placed under the correct day and start time.
- Day view: classes for one selected calendar date.
- List view: a rolling 14-day window anchored to the selected date, grouped by date and ordered chronologically.
- A class with multiple trainers shows all assigned names. A class with no trainer remains visible with a `Trainer TBA` placeholder.
- Times are displayed in the user's device timezone (consistent across all three views).
- Only `SCHEDULED` instances appear; `CANCELLED` / non-scheduled instances are excluded.
- The member schedule and the admin Scheduler share one source of truth — changes in the admin scheduler appear on next member load/refresh.
- Empty state when the period has zero classes; non-technical error state with a retry action when load fails (no stale data shown as current).
- Read-only — this surface does NOT directly own booking, cancel, waitlist, or trainer-contact actions; those come from the cards via `class-booking`.
- No horizontal page-level scroll at 360 px width.

### Screens
- Group Classes schedule page with Week / Day / List view toggle and prev/next navigation.

### Out of scope (deferred)
- Filtering, sorting, or search by trainer / class type / difficulty / time of day.
- Trainer profile deep-links from the schedule.
- Push notifications, reminders, calendar sync, or schedule export.
- Display of available spots, booking limits, or membership usage counters.
- Historical activity, attended-class history, or recommended classes.

### History
- 2026-04-25 — initial (extracted from `docs/prd/group-classes-schedule-view.md`, `docs/sdd/group-classes-schedule-view.md`).

---

## Class Booking — `class-booking`

**Status:** active
**Owner of:** `/profile/bookings`; `bookingStore`; `frontend/src/pages/profile/MyBookingsPage.tsx`, booking-related components in `frontend/src/components/schedule/` (incl. `MyBookingsDrawer`)
**Depends on:** `auth`, `user-membership-purchase`, `group-classes-schedule-view`, `scheduler`

### What user can do
- A Member with an active membership can book a future `SCHEDULED` group class from `/schedule` while it has remaining capacity.
- A Member can cancel their own `CONFIRMED` booking when more than two hours remain before the class start.
- A Member can review their full booking history — upcoming, past, and cancelled — from two surfaces: the existing `MyBookingsDrawer` quick peek on `/schedule`, and a dedicated "My Bookings" page in the cabinet at `/profile/bookings` with at minimum a `?status=all|confirmed|cancelled` filter.
- An Admin can retrieve the full booking history of any specified Member (per-user history view), including `CONFIRMED`, `CANCELLED`, and `ATTENDED` rows, with optional status filter.
- An Admin can retrieve the attendee list for a specific class instance (member display name, status, booking timestamp, capacity vs confirmed count).

### Rules and invariants
- Booking creation requires: caller has an active plan, class is in the future, class is bookable (`SCHEDULED`), confirmed count strictly below capacity. A successful booking persists `status = CONFIRMED` and atomically increments confirmed count by exactly one.
- Distinct rejection reasons: no active plan (`MEMBERSHIP_REQUIRED`), class full (`CLASS_FULL`), class already started (`CLASS_ALREADY_STARTED`), class not found / not bookable (`CLASS_NOT_FOUND` / `CLASS_NOT_BOOKABLE`).
- **Duplicate bookings on the same class instance are allowed.** A Member may hold multiple `CONFIRMED` bookings on the same instance and on overlapping classes — the system performs no personal-conflict or duplicate-booking check. The previous `ALREADY_BOOKED` rule has been removed (this PRD supersedes `class-booking-cancellation`). The `Book spot` CTA on a class card always creates a new booking when capacity and membership allow.
- Capacity race: when two booking requests compete for the final spot, at most one succeeds; the other gets `CLASS_FULL`. Confirmed count never exceeds capacity.
- Cancellation rule: a Member can cancel their own `CONFIRMED` booking iff current time is **strictly more than two hours** before scheduled start. (The cutoff was 3h in the superseded spec; UI copy must read "2 hours".) A successful cancellation sets `status = CANCELLED`, sets `cancelledAt`, and frees one capacity slot.
- Cancellation rejections: within the 2-hour window (`CANCELLATION_WINDOW_CLOSED`), booking not `CONFIRMED` (`BOOKING_NOT_ACTIVE`), or booking does not belong to the caller (`BOOKING_NOT_FOUND`).
- "My Bookings" page groups Upcoming vs Past/Cancelled; rows show class name, scheduled start, trainer names, booking status, and a cancel action enabled only when status is `CONFIRMED` and currently > 2h before start. Each booked-state card surfaces a "cancellable until {cutoffTime}" line so members are never surprised by a locked cancel button.
- Schedule cards expose distinct UI states inline (no modal needed for the reason): bookable, booked-by-you (cancellable), booked-by-you (too late to cancel), full, past, active-plan-required.
- `maxBookingsPerMonth` is informational only in this version — it is NOT enforced as a hard booking limit.
- Existing bookings are NOT auto-cancelled if the owning membership later becomes `CANCELLED` or `EXPIRED`.
- Admin endpoints reject non-admin callers and return not-found for non-existent users / class instances.

### Screens
- My Bookings cabinet page (`/profile/bookings`) — Upcoming + Past/Cancelled groupings, status filter, cancel action.
- `MyBookingsDrawer` quick peek on `/schedule` with a "See all my bookings" link to the cabinet page.
- Schedule class cards — booking and cancel CTAs with state-driven copy.
- Admin per-user booking history table inside an admin user-detail surface.
- Admin attendee list inside the class-instance detail in `/admin/scheduler`.

### Out of scope (deferred)
- Waitlists or pending-booking queues when a class is full.
- Trainer-facing views.
- Email, push, or in-app notifications related to booking or cancellation.
- Payment per booking.
- Attendance check-in, no-show tracking, automatic `CONFIRMED → ATTENDED` transitions — placeholder: `ATTENDED` enum value already exists; no UI flow transitions into it in this version.
- Rescheduling across classes (member must cancel and re-book).
- Recurring bookings.
- Admin "create booking on behalf of a member" — `POST /api/v1/admin/bookings` may remain in code from the superseded spec but is not part of this PRD's acceptance set; no new UI entry.
- Enforcing `maxBookingsPerMonth` as a hard limit.
- Auto-cancelling bookings on membership expiry.

### History
- 2026-04-25 — initial (extracted from `docs/prd/class-booking.md`, `docs/sdd/class-booking.md`); supersedes `class-booking-cancellation`.

---

## Class Booking Cancellation — `class-booking-cancellation`

**Status:** sunset
**Owner of:** —
**Depends on:** —

This feature was the predecessor of `class-booking`. It has been superseded — see `docs/sdd/class-booking.md` "Supersedes" header. The behavioural rule changes that triggered the supersession:
- Cancellation cutoff changed from 3 hours to 2 hours before class start.
- The `ALREADY_BOOKED` rule and personal-conflict check were removed; duplicate and overlapping bookings are now allowed.
- The "My Bookings" cabinet page was added as a sibling surface to the existing `MyBookingsDrawer`.

The `AlreadyBookedException` class definition and its `GlobalExceptionHandler` mapping intentionally remain in code — they are still invoked by the out-of-scope admin "book on behalf of member" path inherited from this spec.

### History
- 2026-04-25 — marked sunset; replaced by `class-booking`.

---

## Trainer Discovery — `trainer-discovery`

**Status:** active
**Owner of:** `/trainers`, `/trainers/:id`, `/trainers/favorites`; `frontend/src/pages/trainers/`, `frontend/src/components/trainers/`, `frontend/src/components/trainer/`
**Depends on:** `auth`, `user-membership-purchase`, `scheduler`, `entity-image-management`

### What user can do
- Any authenticated user (Guest or Member) can browse a paginated list of trainers (default 12 per page, default sort lastName ascending).
- Any authenticated user can view a trainer's full profile.
- Any authenticated user can filter the list by one or more specializations (case-insensitive, multi-value via repeated query param).
- Any authenticated user can sort by `lastName,asc|desc` or `experienceYears,asc|desc`. Trainers with `null` `experienceYears` always sort to the end regardless of direction.
- A Member can save a trainer to a personal favorites list, remove a trainer from it, and view the favorites list at `/trainers/favorites`. Favorites endpoints require `MEMBERSHIP_REQUIRED` (an active membership).
- The trainer card and profile page show whether the current Member has favorited that trainer; toggling is optimistic.
- The profile page shows an availability preview: a 7-day grid of `MORNING (06:00–12:00) / AFTERNOON (12:00–17:00) / EVENING (17:00–22:00)` blocks per day, derived at query time from currently `SCHEDULED` class instances assigned to that trainer.

### Rules and invariants
- Trainer DTOs expose `id`, `firstName`, `lastName`, `profilePhotoUrl` (nullable), `bio`, `specializations`, `experienceYears` (nullable), `classCount` (currently `SCHEDULED` instances), and `availabilityPreview` (profile only). **`email` is never returned to clients**, even though it is stored on the entity.
- Specialization filter matches case-insensitively (`LOWER(...)`); unknown query parameters are silently ignored. Unsupported sort field returns `INVALID_SORT_FIELD` (HTTP 400).
- Favorites: `POST .../favorites` returns 201 with `id`/`firstName`/`lastName`. Re-favoriting returns `ALREADY_FAVORITED` (HTTP 409). Removing a non-favorite returns `FAVORITE_NOT_FOUND` (HTTP 404). Favoriting a non-existent trainer returns `TRAINER_NOT_FOUND`.
- When a Member's membership is no longer `ACTIVE`, favorites endpoints return `MEMBERSHIP_REQUIRED` (HTTP 403). The favorites list is **retained** in the DB — not deleted — and becomes accessible again on renewal.
- Availability preview is empty arrays (not null, not omitted) for days/blocks with no scheduled class. A trainer with no scheduled classes returns all seven day entries as empty lists.
- The list page shows a skeleton placeholder during load, an error banner with retry on failure, and an empty-with-`Clear filters` state when filters yield zero matches.
- The "Save to Favorites" affordance is visible to Guests but disabled with a tooltip "Membership required to save favorites." Navigating to `/trainers/favorites` as a Guest redirects to membership purchase.

### Screens
- Trainer list page — grid of trainer cards (photo or avatar, name, up to 3 specialization tags + "+N more", experience years, favorite heart for Members). Filter panel + sort dropdown.
- Trainer profile page — full photo, bio, specializations, experience, class count, availability preview grid (`Trainer not found` message + back link on 404).
- My Favorites page (Members only) — same DTO shape as the main list, supports the same sort parameters.

### Out of scope (deferred)
- Booking a personal training session with a trainer (owned by `personal-training-booking`).
- Direct trainer messaging / contact.
- Trainer self-service profile editing (admin-managed via `scheduler`).
- Ratings or reviews.
- Free-text name search.
- Public unauthenticated access to trainer data.
- Notifications when a favorited trainer's availability changes.

### History
- 2026-04-25 — initial (extracted from `docs/prd/trainer-discovery.md`, `docs/sdd/trainer-discovery.md`).

---

## Member Home — `member-home`

**Status:** sunset
**Owner of:** —
**Depends on:** —

This was the original v1 Member Home spec (post-login destination with a flat-grid layout containing membership status, trainer carousel, and upcoming classes carousel). It has been replaced by the Pulse redesign — see `home-page-redesign`. The old `src/components/home/` flat-grid components (`MemberHomeHero`, `MembershipPrimaryCard`, `QuickActionsPanel`, `TrainerPreviewCarousel`, `ClassPreviewCarousel`, etc.) are deleted by that redesign.

### History
- 2026-04-25 — marked sunset; replaced by `home-page-redesign`.

---

## Home Page Redesign (Pulse) — `home-page-redesign`

**Status:** active
**Owner of:** `/home` (authenticated members); `frontend/src/pages/home/MemberHomePage.tsx`; reuses Pulse primitives from `frontend/src/components/landing/`
**Depends on:** `auth`, `user-membership-purchase`, `class-booking`, `trainer-discovery`, `landing-page`, `group-classes-schedule-view`

### What user can do
- An authenticated Member lands on a live, activity-driven home page in the "Pulse" visual system.
- The user with a next booked class sees a live ticking countdown to that class as the first thing on the page, with trainer name, studio, and duration alongside.
- The user with a next booked class can trigger "Add to calendar" (downloads a `.ics` file generated client-side) or "Cancel booking" (confirmation dialog → `DELETE /bookings/{id}` → optimistic update).
- The user with no upcoming bookings sees the `HeroNoBooked` variant (next open class with a "Grab a spot" CTA), reused from the landing page.
- The user sees three stat cells: bookings left, days to plan renewal, favorite coaches count.
- The user sees their next three `CONFIRMED` upcoming bookings as clickable rows that deep-link into `/schedule?classId={id}`.
- The user sees a compact membership card: plan name, status pill, bookings progress bar, renewal mini-card, "Manage membership" link to `/membership`.
- The user sees a live club Activity Feed (eyebrow `AT THE CLUB`) filtered to `kind ∈ ["booking", "class"]` (no personal check-ins or PRs); the feed subscribes to the existing landing SSE stream.

### Rules and invariants
- Visual: `#0F0F0F` page background, Barlow Condensed display type, electric-green primary, ambient waveform, radial green glow.
- Layout: hero row 1.3fr : 1fr grid, gap 40px, min-height 440px; stats strip 3-col, gap 14px; bottom row 1.4fr : 1fr grid, gap 20px.
- Countdown ticks every second. At T-0 the countdown is replaced by a "Class started · Check in now" banner; the next upcoming booking then drives a fresh countdown.
- `prefers-reduced-motion: reduce` halts ambient waveform, dot pulse, and feed crossfade. The countdown continues ticking (it is information, not decoration).
- Activity feed rotation is 2800 ms; `role="log"`, `aria-live="polite"`. Countdown `aria-label` updates each tick.
- Membership progress: when `bookingsMax` is `null` or `Infinity`, hide the bar and show "Unlimited".
- "Next up" pill on the first upcoming row is backed by text, not color alone.
- Shared Pulse primitives (`PulseNav`, `PulseFooter`, `AmbientWaveform`, `ActivityFeed`, `BigCountdown`, `StatsStrip`, `HeroNoBooked`) are imported from `frontend/src/components/landing/`, never duplicated into a home-specific directory.
- No new backend endpoints; reuses `/landing/viewer-state`, `/bookings/me`, `DELETE /bookings/{id}`, `/memberships/me`, `/trainers/favorites`, `/landing/activity` + `/landing/activity/stream`.
- Page is not horizontally scrollable at 360 px.

### Screens
- Member Home page — hero (booked or no-booked variant), stats strip, upcoming sessions, membership card, activity feed.

### Out of scope (deferred)
- Mobile layout (handoff is desktop-first; mobile follow-up).
- Google Calendar OAuth integration ("Add to calendar" downloads `.ics` only).
- Multi-location eyebrow.
- Admin-specific home variant.
- Notifications, recommendations, personalised ranking.

### History
- 2026-04-25 — initial (extracted from `docs/prd/home-page-redesign.md`, `docs/sdd/home-page-redesign.md`); supersedes `member-home`.

---

## Landing Page (Pulse) — `landing-page`

**Status:** active
**Owner of:** `/`; `frontend/src/pages/landing/PulseLandingPage.tsx`, `frontend/src/components/landing/`
**Depends on:** `auth`, `class-booking`, `scheduler`, `group-classes-schedule-view`, `trainer-discovery`

### What user can do
- A guest, an authenticated member with a CONFIRMED booking in [now, now+24h), and an authenticated member with no qualifying booking each see a dedicated viewer-state hero variant (`loggedOut`, `booked`, `nobooked`).
- A `booked` member sees a live countdown to the next class with a "Check in now" CTA and the trainer/studio details.
- A `nobooked` member sees the next open class on the current day with `spotsLeft`, the spot count rendered in accent-orange when `spotsLeft <= 3`, and a one-tap "Grab a spot" CTA deep-linking to `/schedule?classId={id}`.
- A `loggedOut` visitor sees a brand statement, a 7-day-trial primary CTA (`/register`), and an anonymized live activity feed (no PII).
- All viewers see a live activity feed (rotating active row every 2800 ms) and a stats strip.
- All viewers can navigate to `Schedule`, `Trainers`, the `Pricing` page (public viewers), or `Log in` / `Join GymFlow`.

### Rules and invariants
- Viewer-state derivation is server-side at `GET /api/v1/landing/viewer-state` (auth optional → resolves to `loggedOut`); the frontend must not re-derive state from raw booking data on the client.
- "Within 24h" = `scheduled_at ∈ [now, now+24h)`. "Next open class" = earliest `scheduled_at > now+15min` on the current calendar day with `status = SCHEDULED`, `deleted_at IS NULL`, and `spotsLeft > 0`.
- Authed activity feed shows the last 20 events with real actor names. Public feed shows the last 20 events with actors anonymised to "A member" and `pr` event values omitted.
- The activity feed subscribes to a SSE stream after initial page load (`GET /api/v1/landing/activity/stream`); on disconnect, the browser's native `EventSource` reconnect is used and no error is shown to the user.
- Stats are fetched on page load only (no auto-refresh during the session). Authed strip shows `On the floor` / `Classes today` / `Spots left · {className}`. Public strip shows `Members` / `Classes today` / `Coaches`.
- Countdown is updated every 1000 ms with tabular-nums; clamps to `00:00:00` when the target passes (T-0 end state is deferred — see Open items).
- `prefers-reduced-motion` freezes the pulsing dot and ambient waveform but the countdown keeps ticking.
- Visual: single-screen 1440×900 layout, `overflow: hidden` on root, `height: 100vh`. Ambient waveform regenerates every animation frame at 60px/s with an ECG-style QRS spike every 220px. Radial green glow + waveform are absolutely positioned and do not affect layout flow.
- Page must render without console errors in all three viewer states. `StateSwitcher` dev tool is excluded from production builds.
- Membership plans preview, "how it works", and FAQ sections from the v1 landing-page spec are intentionally retired and deferred.

### Screens
- Public landing page with three hero variants and shared nav, ambient waveform, activity feed, stats strip, footer.

### Out of scope (deferred)
- Mobile layout — placeholder for follow-up ticket.
- Check-in QR modal.
- Multi-location selector.
- Countdown T-0 end state — placeholder: clamp to `00:00:00`; design lead to specify before implementing the transition.
- Full screen-reader accessibility audit.
- CMS or admin-managed homepage content.
- Membership plans preview, how-it-works section, FAQ block (retired from v1).
- New analytics events beyond v1 minimum set.

### History
- 2026-04-25 — initial (extracted from `docs/prd/landing-page.md`, `docs/sdd/landing-page.md`); supersedes the v1 landing-page SDD (2026-03-29).

---

## User Access Flow — `user-access-flow`

**Status:** active
**Owner of:** primary nav rules for authenticated `USER` accounts (no dedicated route — implemented across `MemberNav` + redirects)
**Depends on:** `auth`, `home-page-redesign`, `membership-plans`, `user-membership-purchase`

### What user can do
- An authenticated `USER` lands on `/home` after login as the primary post-login destination.
- The primary navigation does NOT include `Plans` as a top-level tab.
- The user with an `ACTIVE` membership sees the current plan summary first on `/home`; the full plans catalogue is NOT rendered inline as the main content.
- The user without an `ACTIVE` membership sees a native plan-discovery preview directly in the home membership section, with a clear path into the full plan-comparison and purchase flow.
- Legacy logged-in `/plans` deep links route to the approved replacement experience instead of an orphaned standalone tab.

### Rules and invariants
- Authenticated nav exposes: `Home`, `Schedule`, `Trainers`, `My Favorites`, `Profile`. (This set may evolve only via a future navigation-redesign PRD.)
- Highlighted plan preview on `/home` shows a limited curated set, not the full grid. Each preview includes plan name, duration, price, and one supporting value point.
- If no active plans exist, the membership section shows a clear unavailable state — no broken or empty teaser rail.
- The path from the home membership section to the full plan comparison may be a route, modal, or drawer, but it must be triggered from the membership section, not from a primary nav tab. Direct-link fallback must remain supported for refresh resilience.
- Membership-state-driven behaviour keys off the same `ACTIVE` / `CANCELLED` / `EXPIRED` source of truth used by `user-membership-purchase`.
- After a successful purchase initiated from the home section, the user returns to the `ACTIVE` state on `/home` without logging out and back in.
- Mobile and desktop usability preserved; no nav dead ends introduced by the plan-tab removal.

### Screens
- `MemberNav` (the authenticated nav strip) — owned by this feature.
- Home membership section variants — owned jointly with `home-page-redesign`.

### Out of scope (deferred)
- Public guest-facing plans catalogue and marketing-site nav.
- Plan upgrade / downgrade / switch logic for `ACTIVE` users.
- Redesigning trainer / class schedule / favorites / profile features.
- Final visual design — handed off to design system.

### History
- 2026-04-25 — initial (extracted from `docs/prd/user-access-flow.md`, `docs/sdd/user-access-flow.md`).

---

## Onboarding — Unified Signup — `onboarding-unified-signup`

**Status:** sunset
**Owner of:** —
**Depends on:** —

This was the first iteration of the unified onboarding wizard, in which `terms` was the LAST mandatory step (after `preferences`, `membership`, and conditional `booking`). It has been superseded by `onboarding-terms-early`, which moves `terms` to step 3 — see that section for the active behaviour. The behavioural reason: under unified-signup ordering, the `booking` step ran while the user was still an unauthenticated guest, so member-only endpoints (`/class-schedule`, `/pt/trainers`, `/bookings`) returned 401 and the user saw "Unable to load upcoming classes" or a silent no-op.

This sunset note also captures the load-bearing placeholder this feature introduced into the data model: **`PLAN_PENDING`** as a `UserMembership.status` value. This was correct for unified-signup (no real activation until the deferred payment feature ships), but downstream callers like `class-booking` and `GET /memberships/me` treated `PLAN_PENDING` as "not active." `onboarding-terms-early` resolved this by switching the persisted status to `ACTIVE` with a real `endDate = today + plan.durationDays`, on the basis that the user has now committed via terms.

### History
- 2026-04-25 — marked sunset; replaced by `onboarding-terms-early`.

---

## Onboarding — Terms Early — `onboarding-terms-early`

**Status:** active
**Owner of:** `/onboarding`; `onboardingStore`; `frontend/src/pages/onboarding/`, `frontend/src/components/onboarding/`
**Depends on:** `auth`, `user-profile-management`, `membership-plans`, `user-membership-purchase`, `class-booking`, `personal-training-booking`, `group-classes-schedule-view`

### What user can do
- A guest clicking "Sign up" / "Join GymFlow" on the public landing page is routed directly into the wizard at step 1 (`credentials`). No detour through `/login` or `/register`. (`/register` permanently redirects to `/onboarding`.)
- Step 1 — Credentials (Guest): enter email + password (held client-side; no backend call yet).
- Step 2 — Profile (Guest): enter mandatory profile fields — first name, last name, phone, date of birth (held client-side).
- Step 3 — Terms (Guest → Member): check the required terms and waiver toggles. Submitting fires the combined-payload `POST /api/v1/auth/register` with credentials + mandatory profile + terms acks. Tokens are stored; user is now authenticated. **This is the first and only point at which a `users` row exists.**
- Step 4 — Preferences (Member, optional): fill or skip; runs as authenticated.
- Step 5 — Membership (Member, optional): pick a plan or skip. Picking a plan creates a `UserMembership` with `status = ACTIVE` and `endDate = today + plan.durationDays` (replaces a prior `ACTIVE` membership for this user). If a plan is picked the wizard advances to `booking`; if not, it advances to `done`.
- Step 6 — Booking (Member, only if plan selected): fetches real class schedule and trainer list; selecting a class or trainer slot and confirming creates a real booking via the existing authed endpoints.
- Step 7 — Done (Member): on mount, fires `POST /api/v1/onboarding/complete`; `onboardingCompletedAt` is set on the `user_profiles` row. Final CTA navigates to `/home` as a fully onboarded Member.

### Rules and invariants
- The combined-payload register endpoint is unchanged in shape from the unified-signup version; only its trigger position moves from step 6 to step 3.
- Pre-terms (steps 1–2): no `users` row, no `user_profiles` row, no waiver/terms acceptance on the server. Closing the tab leaves zero server-side trace; the email remains available.
- Once the user advances past `terms`, Back navigation cannot return them to `terms`, `profile`, or `credentials`. The Back control on `preferences` (the first post-terms step) is hidden or disabled. Within steps 4–6, Back works between adjacent steps in visit order.
- `onboardingCompletedAt` is set ONLY at the `done` step (not at terms-step submission). `UserRoute` reads `onboardingCompletedAt` from `GET /api/v1/profile/me` on bootstrap and redirects users with no completion timestamp back into the wizard.
- Step state is persisted in `localStorage` keyed `gf:onboarding:v1:{userId}` so a returning user resumes at the appropriate post-terms step (compute via the existing `computeResumeStep`). The pre-terms credentials/profile state is also persisted so a returning guest does not retype.
- Once inside the wizard, there is no "back to login" escape hatch — the only ways out are to finish or to leave the app. Returning to the landing page restarts the wizard from `credentials`.
- Email uniqueness is enforced at register time (`EMAIL_ALREADY_EXISTS`); the credentials step surfaces it as a field-level error.
- Loading state for the bootstrap profile fetch must be implemented in the same pass as the route guard — a route guard reading async data must handle the loading case explicitly.
- Migrating mid-flow users from the unified-signup ordering is explicitly NOT in scope — they continue under existing onboarding-flow resume logic.
- Backend security is unchanged: no endpoint becomes public or changes shape; the structural reorder removes the need.

### Screens
- Onboarding page (single full-screen `/onboarding` route): Mini Nav, Progress Bar, Step Rail, content slot, sticky footer.
- Six step components (`StepCredentials`, `StepProfile`, `StepTerms`, `StepPreferences`, `StepMembership`, `StepBooking`) plus `StepDone` (full-width replacement layout).

### Out of scope (deferred)
- Email verification / confirmation link.
- Social auth (Google / Apple).
- Real paid-membership activation — placeholder: the `Membership` step persists a `UserMembership` row with `status = ACTIVE` and synthetic `endDate`; real payment + activation is a future feature.
- Allowing the user to edit credentials, profile, or terms acceptance from inside the wizard after register.
- Migrating users mid-flow under the unified-signup ordering.
- Backend security changes (endpoints stay private; no contract change).
- Password reset flow changes.
- Admin-created accounts (trainers/admins invited via backoffice) — unchanged.

### History
- 2026-04-25 — initial (extracted from `docs/prd/onboarding-terms-early.md`, `docs/prd/onboarding-unified-signup.md`, `docs/sdd/onboarding-flow.md`, `docs/sdd/onboarding-unified-signup.md`, `docs/sdd/onboarding-terms-early.md`); supersedes `onboarding-unified-signup`.

---

## Personal Training Booking — `personal-training-booking`

**Status:** active
**Owner of:** `/training`, `/trainer/sessions`, `/admin/pt-sessions`; `ptBookingStore`; `frontend/src/pages/training/`, `frontend/src/pages/trainer/`, `frontend/src/components/training/`, `frontend/src/components/trainer/`
**Depends on:** `auth`, `user-membership-purchase`, `trainer-discovery`, `scheduler`

### What user can do
- A logged-in Member with an active membership can browse the PT trainer directory at `/training`, filter by specialty chip, see each trainer's next available slot and weekly open-slot count.
- A Member can open a trainer's slot picker (7-column calendar of today + next 6 days, all gym-hour slots 06:00–21:00). The week paginator advances up to 14 days forward.
- A Member can click an available slot to open the Confirm Booking modal (trainer + specialties, when, duration, room, cost note, cancel-policy footnote).
- A Member can confirm a booking; on success the slot becomes non-interactive and the row appears in "Your upcoming sessions" at the top of the page.
- A Member can cancel a future PT booking from the upcoming-sessions card via a confirm dialog.
- A Trainer can view their own upcoming PT sessions and overlapping group classes at `/trainer/sessions`, grouped by day with a sticky day label, and sees three stat tiles (PT / group / total). Read-only.
- An Admin can view all PT sessions across all trainers at `/admin/pt-sessions` with four stat tiles (active, members booking, trainers in play, cancellations).
- An Admin can filter by free-text search (debounced 150 ms; result count announced via `aria-live`), trainer, and status. An Admin can export filtered results as CSV.

### Rules and invariants
- All PT sessions are exactly 1 hour. The server always sets `endAt = startAt + 1 hour` — the client never sends a duration.
- 24-hour lead time: booking a slot that starts < 24h from now returns `PT_LEAD_TIME_VIOLATION` (HTTP 422). Slots within that window render as non-interactive even if the trainer is otherwise free.
- Trainer cannot be double-booked: overlapping `pt_bookings` for the same trainer in `[startAt, endAt)` returns `PT_TRAINER_OVERLAP` (HTTP 409); overlapping group class assignment returns `PT_TRAINER_CLASS_OVERLAP` (HTTP 409).
- Availability is derived server-side from gym hours minus existing assignments (group classes + existing PT). Trainers cannot set custom availability windows or open/block slots.
- A Member without an active membership attempting to access `/training` is redirected to `/plans`.
- Slot colour-coding: available (green "Book"), group class (orange "Class" panel), booked by another member (dashed/white), past or within 24h (muted dashed).
- Confirm modal: clicking "Not yet" or the backdrop dismisses without creating a booking. If the slot was taken between page load and confirm (race), the server returns 409 and the modal shows inline "This slot is no longer available."
- Cancellation is unconditional in this iteration (no 6-hour penalty window). Cancelling a non-existent or non-active booking returns `PT_BOOKING_NOT_FOUND` / `PT_BOOKING_NOT_ACTIVE`.
- Trainer view rows: PT sessions get a green left border, group classes get an orange left border. No create/edit/cancel from this view.
- Admin cancelled session rows render with strikethrough + red "Cancelled" pill. No create/edit from the admin view.

### Screens
- `/training` (Member) — Your upcoming sessions card (when ≥ 1 future PT booking) + trainer directory + slot picker + Confirm Booking modal.
- `/trainer/sessions` (Trainer) — read-only sessions grouped by day, three stat tiles.
- `/admin/pt-sessions` (Admin) — four stat tiles + search + trainer + status filters + CSV export.

### Out of scope (deferred)
- Payments — PT sessions are included in membership.
- Recurring bookings ("every Monday 9am for 8 weeks").
- Waitlist when a trainer is fully booked.
- Trainer intake forms / session notes — placeholder: `note` field exists on the `pt_bookings` row, reserved for a future spec.
- Notifications (email/push on book, reminder, trainer-side new-booking alert).
- Mobile responsiveness — calendar grid not designed for < 640 px.
- Trainer custom availability — trainers cannot block or open slots.
- Trainer-initiated cancellations.
- Trainer profile deep-link page — no dedicated `/trainers/:id` page in this iteration.
- Cancel-policy enforcement (no 6-hour penalty window).
- Booking quota — whether a PT session counts against the monthly booking quota is deferred pending product confirmation.

### History
- 2026-04-25 — initial (extracted from `docs/prd/personal-training-booking.md`, `docs/sdd/personal-training-booking.md`).

---

## Entity Image Management — `entity-image-management`

**Status:** active
**Owner of:** image upload/replace/remove for `UserProfile`, `Trainer`, `Room`, `ClassTemplate`; `frontend/src/components/media/`
**Depends on:** `auth`, `user-profile-management`, `scheduler`, `trainer-discovery`

### What user can do
- An authenticated `USER` can upload, replace, and remove their own profile photo (no endpoint accepts an arbitrary user id).
- An admin can upload, replace, and remove the primary photo for a trainer, a room, or a class template.
- Any viewer with read access to those entities sees the current primary image rendered automatically anywhere the entity is presented as an identifiable card, summary, or detail surface — without duplicate configuration.
- A class template's image is reused by every scheduled instance derived from it; editing the template image updates future reads of all linked instances.

### Rules and invariants
- One optional primary image per supported entity type (`UserProfile`, `Trainer`, `Room`, `ClassTemplate`). No galleries, no ordering.
- Supported formats: JPEG, PNG, WEBP. Unsupported format → `INVALID_IMAGE_FORMAT` (HTTP 400).
- Maximum upload size: 5 MB per image. Oversized → `IMAGE_TOO_LARGE` (HTTP 400).
- Replacing an image overwrites the previous primary reference; entities never hold multiple active images.
- Removing an image clears the reference and returns the entity to its default fallback state.
- Read DTOs: `imageUrl` / `photoUrl` (or feature-specific equivalent) returns `null` when no image exists — never an empty string or broken URL.
- Frontend rendering rules (shared primitives, not copy-pasted): null image renders an initials/avatar fallback for people, branded neutral placeholder for rooms and classes; on browser load failure, fall back to the same placeholder treatment (no broken-image icon).
- Storage strategy: DB-backed `BYTEA` for v1, consistent across the four entity types. (Not URL-backed object storage in v1.)
- Standalone class instances (created via import or admin action without a linked template) may render no class image and fall back to the placeholder.
- Dense data-table cells and narrow mobile views may keep text-only rendering when adding an image would reduce readability.

### Screens
- Image controls embedded in admin trainer / room / class-template edit flows and in the user profile page.
- Avatars / cards across trainer discovery, schedule, member home, and admin lists.

### Out of scope (deferred)
- Multiple images per entity, image galleries, ordering.
- Cropping, zooming, focal-point editing, background removal.
- Drag-and-drop asset management or a shared media library.
- Video uploads, animated images, document attachments.
- Public unauthenticated profile pages for users / trainers / rooms / classes.
- Automatic AI-generated images.
- Historical versioning of replaced images.
- Per-occurrence scheduled-class image overrides distinct from the template image.

### History
- 2026-04-25 — initial (extracted from `docs/prd/entity-image-management.md`, `docs/sdd/entity-image-management.md`).

---

## Demo Seeder — `demo-seeder`

**Status:** active
**Owner of:** the `demo-seeder/` Node/Express service on port 3001; SQLite session-tracking DB; operator dashboard at `demo-seeder/public/`; not part of the Spring Boot backend or the React app.
**Depends on:** `auth` (uses the public `POST /api/v1/auth/register` API to create demo accounts)

> Merged from three PRDs (`demo-seeder-cleanup`, `demo-seeder-credentials-and-state`, `demo-seeder-data-generation`) plus two SDDs (`seeder-presets`, `seeding-consolidation`) — they describe one operator-facing tool with three sub-surfaces (cleanup, state/credentials, generation) and two later refactors (preset config, Flyway → seeder migration).

### What user can do
- An Operator (sales / devops with direct access to port 3001) opens the dashboard and sees real-time counts: demo users, active memberships, classes this week, total class instances. The dashboard polls `GET /api/state` every 10 seconds.
- An Operator picks a preset (`small`, `medium`, `large`) and clicks Generate. The seeder runs three sequential phases (user registration → membership creation → class schedule build) and streams progress via SSE.
- An Operator clicks Cleanup with a valid `X-Admin-Token` header to wipe demo users, memberships, and class instances in one atomic transaction. The response reports actual deleted-row counts per entity type.
- An Operator can browse a list of demo account credentials in the dashboard, or download all credentials as a CSV (`email`, `password`, `membership_plan`).
- A warning banner appears when demo data already exists from a previous run (`hasData: true` and `demoUsers > 0`).
- The Export CSV button is hidden until at least one demo user is tracked.

### Rules and invariants
- **Cleanup** is protected by `X-Admin-Token`. A missing or wrong token returns 401 and performs no DB operations. Cleanup while a generation run is in progress (`isGenerating === true`) returns 409.
- Cleanup runs all deletions (class instances, memberships, tracked users, plus a safety-net sweep `DELETE FROM users WHERE email LIKE 'demo.%@gym.demo' AND deleted_at IS NULL`) inside a single Postgres transaction. Any error rolls everything back. The safety-net query always executes — even when SQLite has no tracked IDs.
- After a successful cleanup commit, all rows in SQLite tables `demo_users`, `demo_memberships`, `demo_class_instances`, and `seeder_meta` are deleted.
- Cleanup response shape: HTTP 200 with `{ deletedUsers, deletedMemberships, deletedClassInstances }`, each set to the actual Postgres `rowCount` for that statement.
- **State and credentials endpoints are entirely read-only** with respect to the GymFlow database. No application-level authentication is required to read them.
- `GET /api/state` returns exactly four numeric fields plus `hasData: boolean`, reflecting current DB + SQLite state at the moment of the request.
- `GET /api/credentials` returns objects scoped to the current SQLite session — not every `demo.%@gym.demo` email in Postgres.
- `GET /api/credentials.csv` sets `Content-Type: text/csv` and `Content-Disposition: attachment; filename="demo-credentials.csv"`. The password column value is the value of the `DEMO_PASSWORD` env var, never a hardcoded string.
- **Generation** is single-flight: a second `GET /api/generate/stream` while `isGenerating` is true returns 409 immediately.
- If the database has no seeded class templates or no seeded trainers (email pattern `%@gymflow.local`) after loading reference data, the stream emits an `error` event and halts before phase 1.
- All four parameters are clamped server-side: `members ∈ [10, 50]`, `weeks ∈ [1, 4]`, `membershipPct ∈ [0, 100]`, `densityPct ∈ [10, 100]`. Out-of-range values are silently adjusted, not rejected. (Under the preset refactor — see History — these four params are removed from the external API; the preset name now derives them.)
- Demo users are created via `POST /api/v1/auth/register` (the real public API) so passwords are bcrypt-hashed and the data path is identical to a real signup. Duplicate-email responses (HTTP 409) emit a warning and reuse the existing user id rather than aborting.
- Class instances are assigned trainers such that no trainer holds two overlapping slots; if no free trainer is available, exactly one trainer is assigned as fallback and the run continues.
- Before phase 1, the seeder writes a session id, ISO-8601 timestamp, and serialised config object to the SQLite `seeder_meta` table.
- Final `done` event contains the actual count of registered users and memberships; followed by `stream_end` to close the connection.
- **Preset refactor (2026-04-13):** the `preset ∈ {small, medium, large}` field on `SeederConfig` controls every dimension of seeding (rooms, trainers, class templates, plans, members, weeks, etc.). The legacy four query params and the "Add on top anyway" bypass are removed; the preset name is now the only external knob.
- **Flyway-to-seeder consolidation (2026-04-13):** the demo-seeder owns all reference and demo seeding (rooms, trainers, class templates, plans, QA users, member data). Flyway is limited to schema DDL plus the admin-user bootstrap (V3 + V5). After deleting V13 / V16 / V17, `flyway repair` must be run once before the next clean startup. The E2E stack loses the data previously supplied by V13/V16/V17 — accepted breakage; a separate test strategy owns that.
- The `demo.%@gym.demo` email pattern and the `%@gymflow.local` trainer pattern are load-bearing for cleanup and the trainer-availability precondition; do not change them silently.

### Screens
- Dashboard at `demo-seeder/public/index.html` — preset buttons, reference-data counts, dashboard log, warning banner, credentials list, Export CSV button, Cleanup button.

### Out of scope (deferred)
- Selective cleanup (deleting only users, only classes, etc.).
- Soft-delete or archiving of demo data — cleanup is a hard delete.
- Cleanup of trainer or room records seeded by Flyway migrations (now handled by the demo-seeder reference phase per `seeding-consolidation`).
- Authentication or access control on state, credentials, or generate endpoints.
- Paginating the credentials list (the maximum 50 users fits on one page).
- Persisting the warning-banner dismissal across page reloads.
- Member-facing UI or any application-level account for the operator.
- Booking class instances on behalf of demo users (no `class_bookings` rows are created).
- Automated or scheduled generation runs.
- Test suite for the demo-seeder service itself.
- Production data management or migration tooling.

### History
- 2026-04-25 — initial; merges three PRDs (`demo-seeder-cleanup`, `demo-seeder-credentials-and-state`, `demo-seeder-data-generation`) and two SDDs (`seeder-presets`, `seeding-consolidation`) into one feature, since they describe the same operator-facing service.

---

## E2E Testing Reset — `testing-reset`

**Status:** active
**Owner of:** `docker-compose.dev.yml`, `docker-compose.e2e.yml`, top-level `e2e/` Playwright package, `e2e-seed/` baseline SQL; not part of `frontend/` or `backend/` source.
**Depends on:** `demo-seeder` (dev stack only)

This is an internal infrastructure feature, not a user-facing capability. There is no PRD; the brief is the scope agreement. Captured here so the canonical product spec acknowledges the surface that owns the test infrastructure.

### Rules and invariants
- Two compose stacks, one command (`/run`):
  - `docker-compose.dev.yml` (manual playground): ports 5432 / 8080 / 5173 / 3002. Rich demo data via the `demo-seeder` service. Never run Playwright against this stack.
  - `docker-compose.e2e.yml` (Playwright target): ports 5433 / 8081 / 5174. Separate Postgres container with its own volume. No demo data — only a baseline seed under `e2e-seed/`.
- Specs live at `e2e/specs/*.spec.ts` at the repo root. `frontend/e2e/` does not exist.
- One happy-path scenario per feature, added on demand. No error-permutation fans, no visual regression, no admin E2E.
- Single greenfield baseline scenario as of 2026-04-19b: `onboarding-happy-path.spec.ts` (register → walk wizard with required profile + skip optional steps → accept terms → land on `/home`). New scenarios get added on demand, driven by incident or feature risk.
- All test emails end with `@test.gympulse.local` and are unique per test via `crypto.randomUUID()`.
- `/run e2e` always passes `--build`; never run against a stale container.
- No `waitForTimeout`. Use `expect.poll`, `waitForResponse`, or direct UI-state assertions.
- No markdown bug docs under `docs/bugs/`. A reproducible bug becomes a failing `test()` case that passes after the fix.
- Step 2 of the migration (the cleanup PR) deletes `frontend/e2e/`, `docs/qa/`, `docs/bugs/`, the `test-manifest` skill, and every legacy reference in `.claude/`, `.codex/prompts/`, `frontend/AGENTS.md`, `backend/AGENTS.md`, `CLAUDE.md`, in the same PR as the new spec — no half-state.

### Out of scope (deferred)
- Multi-scenario suites, fixtures, helpers, `ApiClient`. Infrastructure for helper layers is deliberately deferred until a second scenario creates real demand.
- Admin E2E coverage.

### History
- 2026-04-25 — initial (extracted from `docs/sdd/testing-reset.md`).

---
