# GymPulse — Architecture

This is the canonical authoritative reference for entities, schema, API endpoints, and
feature ownership. Every cross-feature reference in `docs/product.md` resolves to a
section here.

The latest applied Flyway migration version is **V29**
(`V29__add_bio_to_user_profiles.sql`).

---

## 1. Domain model

Authoritative list of entities is taken directly from `@Entity` classes under
`backend/src/main/kotlin/com/gymflow/domain/`. Invariants are enriched from the
matching PRDs/SDDs.

### User
JPA: `domain/User.kt` · table `users`
- Identity: `id` (UUID), `email` (unique, NOT NULL), `passwordHash`.
- `role`: `USER | ADMIN` (CHECK constraint). Self-registration always produces `USER`. `ADMIN` is seeded via Flyway migration only.
- Lifecycle: `createdAt`, `updatedAt`, soft-delete `deletedAt`.
- Owned by: `auth`.

### RefreshToken
JPA: `domain/RefreshToken.kt` · table `refresh_tokens`
- `tokenHash` (unique, length 64) — the DB never stores the raw token.
- `userId` (FK `users.id` ON DELETE CASCADE).
- `expiresAt`, `invalidated` flag (rotated-out / logged-out tokens are flagged, not deleted, until cleanup).
- Owned by: `auth`. Token rotation must mark the old row invalid atomically with inserting the new one.

### MembershipPlan
JPA: `domain/MembershipPlan.kt` · table `membership_plans`
- `name`, `description` (TEXT NOT NULL), `priceInCents` (CHECK > 0), `durationDays` (CHECK > 0), `maxBookingsPerMonth`, `status ∈ {ACTIVE, INACTIVE}`.
- Optimistic locking via `@Version` to prevent lost-update races between concurrent admin edits.
- Stored as integer cents — never floating-point money.
- Owned by: `membership-plans`.

### UserMembership
JPA: `domain/UserMembership.kt` · table `user_memberships`
- `userId`, `planId`, `status ∈ {ACTIVE, CANCELLED, EXPIRED, PLAN_PENDING}`, `startDate` (DATE), `endDate` (DATE), `bookingsUsedThisMonth ≥ 0`.
- Status `PLAN_PENDING` was widened in V28 to fit the 12-character value (column type `VARCHAR(20)`). The CHECK constraint accepts all four values.
- **Invariant: at most one `ACTIVE` row per user.** Enforced by partial unique index `uidx_user_memberships_one_active_per_user (user_id) WHERE status = 'ACTIVE'`. A `PLAN_PENDING` row is NOT covered by this index, so a user may simultaneously hold one `ACTIVE` and one `PLAN_PENDING` row by design — the future payment feature will transition `PLAN_PENDING → ACTIVE` and at that point the service must cancel any prior active membership first.
- `EXPIRED` is set by a future scheduled job (auto-expiry); the booking gate filters by `status = ACTIVE` only and does not check `endDate`.
- Owned by: `user-membership-purchase`. `PLAN_PENDING` placeholder is owned by `onboarding-terms-early` (formerly `onboarding-unified-signup`).

### UserProfile
JPA: `domain/UserProfile.kt` · table `user_profiles`
- 1:1 with `users` via `userId` PK + FK with ON DELETE CASCADE.
- Editable: `firstName`, `lastName`, `phone`, `dateOfBirth`, `fitnessGoals` (JSONB), `preferredClassTypes` (JSONB), `emergencyContactName`, `emergencyContactPhone`, `bio` (TEXT, nullable, ≤ 500 chars, plain text only — no HTML/markdown/control characters), profile photo (`profilePhotoData` BYTEA + `profilePhotoMimeType`).
- `onboardingCompletedAt` (nullable TIMESTAMPTZ) — set ONLY by `POST /api/v1/onboarding/complete`. Read by `UserRoute` to gate access to the app.
- DOB validation: not in the future AND member must be ≥ 16 years old.
- Emergency contact pair must be both-set or both-null (service-layer enforcement).
- Owned by: `user-profile-management`. Photo storage shared with `entity-image-management`.

### Trainer
JPA: `domain/Trainer.kt` · table `trainers`
- `firstName`, `lastName`, `email` (unique), `phone`, `bio` (≤ 1000 chars), `specialisations` (Postgres `text[]`), photo (`photoData` BYTEA + `photoMimeType`), `experienceYears` (nullable), `profilePhotoUrl`, `accentColor`, `defaultRoom`.
- **Invariant: `email` is stored on the entity but NEVER returned in any client DTO** (per security rule).
- Specialisation filtering is case-insensitive (`LOWER(...)`).
- Owned by: `scheduler` (CRUD), `trainer-discovery` (read + favorites), `personal-training-booking` (PT directory).

### Room
JPA: `domain/Room.kt` · table `rooms`
- `name` (unique), optional `capacity ≥ 1`, optional `description` (≤ 500), photo (`photoData` BYTEA + `photoMimeType`).
- Edits do NOT retroactively affect existing class instances; deleting a room with assigned instances clears `room_id` on those instances after admin confirmation.
- Owned by: `scheduler`.

### ClassTemplate
JPA: `domain/ClassTemplate.kt` · table `class_templates`
- `name` (unique), `description`, `category ∈ {Cardio, Strength, Flexibility, Mind & Body, Cycling, Combat, Dance, Functional, Aqua, Wellness, Other}`, `defaultDurationMin`, `defaultCapacity`, `difficulty ∈ {Beginner, Intermediate, Advanced, All Levels}`, optional `room` FK, photo BYTEA + MIME.
- `isSeeded` flag distinguishes pre-loaded predefined templates from admin-created ones.
- Edits to defaults do NOT retroactively update existing class instances.
- Owned by: `scheduler`. Image reused by every linked instance per `entity-image-management`.

### ClassInstance
JPA: `domain/ClassInstance.kt` · table `class_instances`
- Concrete occurrence of a class. Optional `template` FK (a standalone instance with no template is allowed — falls back to placeholder image).
- `name`, `type ∈ {GROUP, PERSONAL}` (CHECK constraint, default GROUP), `status ∈ {SCHEDULED, …}` (default `SCHEDULED`), `scheduledAt`, `durationMin ∈ [15, 240]`, `capacity ∈ [1, 500]`, optional `room` FK.
- `scheduledAt` is constrained to start at minute 0 or 30 of the hour (CHECK on `EXTRACT(MINUTE FROM scheduled_at AT TIME ZONE 'UTC')`).
- Many-to-many with `Trainer` via join table `class_instance_trainers` (composite PK + cascading deletes).
- Soft-deleted via `deletedAt`. Member schedule view excludes non-`SCHEDULED` and `deleted_at IS NOT NULL` rows.
- **Invariant: trainer cannot be assigned to two overlapping instances.** Hard block enforced server-side (`TRAINER_SCHEDULE_CONFLICT`).
- Owned by: `scheduler` (admin write), `group-classes-schedule-view` (read), `class-booking` (capacity), `personal-training-booking` (overlap check for trainer PT slots).

### Booking
JPA: `domain/Booking.kt` · table `bookings`
- `userId`, `classId` (FK `class_instances.id` ON DELETE RESTRICT), `status ∈ {CONFIRMED, CANCELLED, ATTENDED}` (default CONFIRMED), `bookedAt`, `cancelledAt`, soft-delete.
- CHECK constraints: `cancelledAt` ↔ `status = 'CANCELLED'` consistency, and `cancelledAt >= bookedAt`.
- **Duplicate bookings on the same class instance are explicitly allowed.** V21 dropped the partial unique index `uidx_bookings_one_confirmed_per_user_class` that would have enforced one CONFIRMED booking per (user, class). A member may hold multiple CONFIRMED bookings on the same instance and on overlapping classes — no personal-conflict or duplicate-booking check.
- **Invariant: confirmed-booking count for a class instance ≤ capacity.** Enforced under concurrency by capacity-race resolution returning `CLASS_FULL` to the loser.
- **Invariant: cancellation is allowed iff `now() < scheduled_at - 2h`.** Window is exactly 2 hours (was 3 in the superseded `class-booking-cancellation` spec).
- `ATTENDED` is a placeholder enum value; no UI flow transitions into it in this version.
- Owned by: `class-booking`.

### PtBooking
JPA: `domain/PtBooking.kt` · table `pt_bookings`
- `trainerId` (FK `trainers.id` ON DELETE RESTRICT), `memberId` (FK `users.id` ON DELETE RESTRICT), `startAt`, `endAt` (CHECK `end_at > start_at`), optional `room`, optional `note`, `status ∈ {CONFIRMED, CANCELLED}`, `createdAt`, `cancelledAt`.
- **Invariant: every PT session is exactly 1 hour** — server always sets `endAt = startAt + 1h`; client never sends a duration.
- **Invariant: trainer cannot have two overlapping PT bookings**, and cannot have a PT booking overlapping a group class assigned to them. Returns `PT_TRAINER_OVERLAP` / `PT_TRAINER_CLASS_OVERLAP` (HTTP 409).
- **Invariant: 24-hour lead time** — `startAt < now() + 24h` returns `PT_LEAD_TIME_VIOLATION` (HTTP 422).
- Availability is derived server-side from gym hours (06:00–21:00) minus existing assignments. Trainers cannot set custom availability windows.
- Cancellation is unconditional in this iteration (no penalty window). The `note` field is reserved for a future intake / session-notes spec.
- Owned by: `personal-training-booking`.

### UserTrainerFavorite
JPA: `domain/UserTrainerFavorite.kt` · table `user_trainer_favorites`
- Composite PK `(userId, trainerId)`. `createdAt` for audit.
- Membership-gated: writes return `MEMBERSHIP_REQUIRED` for non-Member callers. The list is **retained** when membership lapses — not deleted — and becomes accessible again on renewal.
- Owned by: `trainer-discovery`.

### ActivityEvent
JPA: `domain/ActivityEvent.kt` · table `activity_events`
- `kind ∈ {checkin, booking, pr, class}` (CHECK constraint).
- Stores both `text` (authed view) and `textPublic` (anonymised "A member …" rendering); for `pr` events the public text omits the specific value.
- Optional `actor` FK (ON DELETE SET NULL) plus denormalised `actorName` (snapshot at event time).
- Indexed by `occurredAt DESC` to back the landing feed query and the SSE stream.
- Owned by: `landing-page` (read + SSE). Reused by `member-home` filtered to `kind ∈ {booking, class}`.

### ErrorCode
JPA: `domain/ErrorCode.kt` (enum, no table) — typed enum of all error codes returned by `GlobalExceptionHandler`. Every code matches exactly the string used in the API contract and frontend error mappings.
- `INVALID_BIO_FORMAT` (added V29) — returned by `PUT /profile/me` when `bio` contains HTML tags, markdown link/image syntax, or control characters other than `\n`/`\t`.

---

## 2. Schema map

Latest Flyway migration: **V29**.

| Table | Owner feature(s) | FK relations | Notes |
|---|---|---|---|
| `users` | `auth` | — | UNIQUE on `email`. CHECK `role IN (USER, ADMIN)`. Soft-delete via `deleted_at`. Admin row seeded by V3 + V5. |
| `refresh_tokens` | `auth` | `user_id → users.id` ON DELETE CASCADE | UNIQUE on `token_hash`. Partial index for active tokens per user. |
| `membership_plans` | `membership-plans` | — | CHECK `status IN (ACTIVE, INACTIVE)`, CHECK price/duration > 0. Optimistic-lock `version` column. |
| `user_memberships` | `user-membership-purchase`; `PLAN_PENDING` placeholder owned by `onboarding-terms-early` | `user_id → users.id`, `plan_id → membership_plans.id` | V28 widened `status` to `VARCHAR(20)` + extended CHECK to include `PLAN_PENDING`. Partial unique index `uidx_user_memberships_one_active_per_user (user_id) WHERE status = 'ACTIVE'`; `PLAN_PENDING` is intentionally NOT covered. CHECK `end_date >= start_date`. |
| `user_profiles` | `user-profile-management`; photo columns shared with `entity-image-management`; `onboarding_completed_at` owned by `onboarding-terms-early` | `user_id → users.id` ON DELETE CASCADE (PK and FK) | JSONB `fitness_goals` and `preferred_class_types`. V19 added `profile_photo_data`/`mime_type` BYTEA pair. V23 added `emergency_contact_name`/`phone`. V27 added `onboarding_completed_at`. V29 added `bio` (TEXT, nullable, member-private — NOT exposed via admin endpoints). |
| `trainers` | `scheduler` (CRUD), `trainer-discovery`, `personal-training-booking` | — | UNIQUE `email`. `specialisations TEXT[]`. Photo BYTEA pair (V8). V15 added `experience_years`, `accent_color`, `default_room`, etc. (Trainer Discovery). V26 added PT-related columns. Soft-delete via `deleted_at`. |
| `rooms` | `scheduler` | — | UNIQUE `name`. CHECK `capacity >= 1`. Photo BYTEA pair (V19). |
| `class_templates` | `scheduler`; image reused by `entity-image-management` | `room_id → rooms.id` ON DELETE SET NULL | UNIQUE `name`. CHECK on `category` and `difficulty`. `is_seeded` flag separates predefined from admin-created templates. Photo BYTEA pair. |
| `class_instances` | `scheduler` (write); `group-classes-schedule-view`, `class-booking`, `personal-training-booking` (read/checks) | `template_id → class_templates.id` ON DELETE SET NULL, `room_id → rooms.id` ON DELETE SET NULL | CHECK `type IN (GROUP, PERSONAL)`, duration ∈ [15, 240], capacity ∈ [1, 500]. CHECK `EXTRACT(MINUTE FROM scheduled_at) IN (0, 30)`. V18 added `status` for member schedule. Soft-delete via `deleted_at`. |
| `class_instance_trainers` | `scheduler` | composite PK + ON DELETE CASCADE on both sides | M:N join. Index on `trainer_id` to back availability + conflict queries. |
| `bookings` | `class-booking` | `user_id → users.id` ON DELETE RESTRICT, `class_id → class_instances.id` ON DELETE RESTRICT | CHECK `status IN (CONFIRMED, CANCELLED, ATTENDED)`. CHECK consistency between `cancelled_at` and `status`. **V21 dropped** the unique partial index that prevented duplicate CONFIRMED bookings — duplicates now allowed. Indexes on `(user_id, status, booked_at DESC)` and `(class_id, status)`. |
| `activity_events` | `landing-page` (read/SSE); reused filtered by `member-home` | `actor_id → users.id` ON DELETE SET NULL | CHECK `kind IN (checkin, booking, pr, class)`. Index on `occurred_at DESC`. Stores both `text` and `text_public` for anonymised view. |
| `pt_bookings` | `personal-training-booking` | `trainer_id → trainers.id` ON DELETE RESTRICT, `member_id → users.id` ON DELETE RESTRICT | CHECK `status IN (CONFIRMED, CANCELLED)`, CHECK `end_at > start_at`. Indexes for trainer/member status queries; partial index on `(trainer_id, start_at, end_at) WHERE status = 'CONFIRMED'` for overlap detection. |
| `user_trainer_favorites` | `trainer-discovery` | composite PK `(user_id, trainer_id)` | Retained when membership lapses — not deleted. |

The `flyway_schema_history` table is also present (managed by Flyway itself); migrations V13, V16, V17 were retired per `seeding-consolidation` and require a one-time `flyway repair` on environments that previously applied them.

---

## 3. API map

Base URL: `/api/v1`. Auth: `Authorization: Bearer <token>` unless noted public. Error format: `{ "error": "...", "code": "..." }`. Endpoints are extracted directly from `@GetMapping` / `@PostMapping` / `@PutMapping` / `@DeleteMapping` / `@PatchMapping` annotations on `@RestController` classes.

### Auth (`auth`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | public | Combined-payload (credentials + mandatory profile + terms) signup. Creates `users` + `user_profiles` rows; returns tokens. |
| POST | `/auth/login` | public | |
| POST | `/auth/refresh` | public | Token rotation. |
| POST | `/auth/logout` | Bearer (any role) | Idempotent. |

### Health
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | public | |

### Onboarding (`onboarding-terms-early`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/onboarding/plan-pending` | `hasRole('USER')` | Persists chosen plan as `UserMembership` (active in current revision). |
| POST | `/onboarding/complete` | `hasRole('USER')` | Idempotent; sets `onboardingCompletedAt`. |

### User profile (`user-profile-management`, `entity-image-management`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/profile/me` | `hasRole('USER')` | Returns 200 even for first-time users (fields null). |
| PUT | `/profile/me` | `hasRole('USER')` | Upsert. |
| POST | `/profile/me/photo` | `hasRole('USER')` | Multipart upload. |
| GET | `/profile/me/photo` | `hasRole('USER')` | |
| DELETE | `/profile/me/photo` | `hasRole('USER')` | |

### Membership plans (`membership-plans`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/membership-plans` | public | Active plans only, paginated. |
| GET | `/membership-plans/{id}` | public | Returns `PLAN_NOT_FOUND` for INACTIVE plans (no leaking). |
| POST | `/membership-plans` | `hasRole('ADMIN')` | |
| PUT | `/membership-plans/{id}` | `hasRole('ADMIN')` | Editing price on plan with active subscribers → `PLAN_HAS_ACTIVE_SUBSCRIBERS`. |
| PATCH | `/membership-plans/{id}/deactivate` | `hasRole('ADMIN')` | |
| PATCH | `/membership-plans/{id}/activate` | `hasRole('ADMIN')` | |
| GET | `/admin/membership-plans` | `hasRole('ADMIN')` | All plans regardless of status; optional `?status=`. |

### User memberships (`user-membership-purchase`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/memberships` | `hasRole('USER')` | One ACTIVE per user invariant. |
| GET | `/memberships/me` | `hasRole('USER')` | |
| DELETE | `/memberships/me` | `hasRole('USER')` | Sets status CANCELLED. |
| GET | `/admin/memberships` | `hasRole('ADMIN')` | Optional `?status=`, `?userId=`. |
| DELETE | `/admin/memberships/{membershipId}` | `hasRole('ADMIN')` | Manual cancel. |

### Trainers — discovery, photo, favorites (`trainer-discovery`, `entity-image-management`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/trainers` | authenticated | Paginated; sort/filter. `email` never exposed. |
| GET | `/trainers/{id}` | authenticated | Includes `availabilityPreview`. |
| GET | `/trainers/favorites` | authenticated (Member-gated in service) | `MEMBERSHIP_REQUIRED` for non-Members. |
| POST | `/trainers/{id}/favorites` | authenticated (Member-gated) | `ALREADY_FAVORITED` on dup. |
| DELETE | `/trainers/{id}/favorites` | authenticated (Member-gated) | |
| GET | `/trainers/{id}/photo` | (any) | |

### Trainers — admin CRUD (`scheduler`)
| Method | Path | Auth |
|---|---|---|
| GET | `/admin/trainers` | `hasRole('ADMIN')` |
| GET | `/admin/trainers/{id}` | `hasRole('ADMIN')` |
| POST | `/admin/trainers` | `hasRole('ADMIN')` |
| PUT | `/admin/trainers/{id}` | `hasRole('ADMIN')` |
| DELETE | `/admin/trainers/{id}` | `hasRole('ADMIN')` |
| POST | `/admin/trainers/{id}/photo` | `hasRole('ADMIN')` |
| DELETE | `/admin/trainers/{id}/photo` | `hasRole('ADMIN')` |

### Rooms (`scheduler`, `entity-image-management`)
| Method | Path | Auth |
|---|---|---|
| GET | `/rooms` | `hasRole('ADMIN')` |
| POST | `/rooms` | `hasRole('ADMIN')` |
| PUT | `/rooms/{id}` | `hasRole('ADMIN')` |
| DELETE | `/rooms/{id}` | `hasRole('ADMIN')` |
| POST | `/admin/rooms/{id}/photo` | `hasRole('ADMIN')` |
| GET | `/rooms/{id}/photo` | (any) |
| DELETE | `/admin/rooms/{id}/photo` | `hasRole('ADMIN')` |

### Class templates (`scheduler`, `entity-image-management`)
| Method | Path | Auth |
|---|---|---|
| GET | `/admin/class-templates` | `hasRole('ADMIN')` |
| POST | `/admin/class-templates` | `hasRole('ADMIN')` |
| PUT | `/admin/class-templates/{id}` | `hasRole('ADMIN')` |
| DELETE | `/admin/class-templates/{id}` | `hasRole('ADMIN')` |
| POST | `/admin/class-templates/{id}/photo` | `hasRole('ADMIN')` |
| GET | `/class-templates/{id}/photo` | (any) |
| DELETE | `/admin/class-templates/{id}/photo` | `hasRole('ADMIN')` |

### Class instances — admin (`scheduler`)
| Method | Path | Auth |
|---|---|---|
| GET | `/admin/class-instances` | `hasRole('ADMIN')` |
| GET | `/admin/class-instances/{id}` | `hasRole('ADMIN')` |
| POST | `/admin/class-instances` | `hasRole('ADMIN')` |
| PATCH | `/admin/class-instances/{id}` | `hasRole('ADMIN')` |
| DELETE | `/admin/class-instances/{id}` | `hasRole('ADMIN')` |
| POST | `/admin/class-instances/copy-week` | `hasRole('ADMIN')` |
| POST | `/admin/schedule/import` | `hasRole('ADMIN')` |
| GET | `/admin/schedule/export` | `hasRole('ADMIN')` |

### Class schedule — member-facing (`group-classes-schedule-view`)
| Method | Path | Auth |
|---|---|---|
| GET | `/class-schedule` | `hasRole('USER')` |

### Bookings (`class-booking`)
| Method | Path | Auth |
|---|---|---|
| POST | `/bookings` | `hasRole('USER')` |
| GET | `/bookings/me` | `hasRole('USER')` |
| DELETE | `/bookings/{bookingId}` | `hasRole('USER')` |
| POST | `/admin/bookings` | `hasRole('ADMIN')` |
| GET | `/admin/booking-members` | `hasRole('ADMIN')` |
| GET | `/admin/users/{userId}/bookings` | `hasRole('ADMIN')` |
| GET | `/admin/classes/{classId}/attendees` | `hasRole('ADMIN')` |

### Personal training (`personal-training-booking`)
| Method | Path | Auth |
|---|---|---|
| POST | `/pt-bookings` | `hasRole('USER')` |
| GET | `/pt-bookings/me` | `hasRole('USER')` |
| DELETE | `/pt-bookings/{id}` | `hasRole('USER')` |
| GET | `/trainers/pt` | authenticated |
| GET | `/trainers/{trainerId}/pt-availability` | authenticated |
| GET | `/trainers/me/pt-sessions` | `hasRole('TRAINER')` |
| GET | `/admin/pt-sessions` | `hasRole('ADMIN')` |
| GET | `/admin/pt-sessions/stats` | `hasRole('ADMIN')` |
| GET | `/admin/pt-sessions/export` | `hasRole('ADMIN')` |

### Member home / landing (`member-home`, `landing-page`)
| Method | Path | Auth |
|---|---|---|
| GET | `/member-home/classes-preview` | `hasRole('USER')` |
| GET | `/landing/viewer-state` | optional (loggedOut for anonymous) |
| GET | `/landing/stats` | optional (public variant for anonymous) |
| GET | `/landing/activity` | optional |
| GET | `/landing/activity/stream` (SSE) | optional |

### Admin user profile photo (cross-cutting admin)
| Method | Path | Auth |
|---|---|---|
| GET | `/admin/users/{userId}/photo` | `hasRole('ADMIN')` |

### Test support (`testing-reset`)
| Method | Path | Auth |
|---|---|---|
| POST | `/test-support/e2e/cleanup` | `hasRole('ADMIN')` |

---

## 4. Feature map

Cross-reference of routes, Zustand stores, and component directories to owner features.

### Routes → owner feature
| Route | Owner | Notes |
|---|---|---|
| `/` | `landing-page` | Public Pulse landing page; viewer-state-driven hero. |
| `/onboarding` | `onboarding-terms-early` | Wizard; step rail + sticky footer. |
| `/login` | `auth` | |
| `/register` | `auth` | Permanent redirect to `/onboarding` (legacy route preserved for bookmarks). |
| `/plans`, `/plans/:id` | `membership-plans` | Public catalogue + plan detail. |
| `/home` | `member-home` | Authenticated Member home (Pulse). |
| `/membership` | `user-membership-purchase` | My Membership page. |
| `/profile` | `user-profile-management` | Personal Information + Membership Control + Account Actions. |
| `/profile/bookings` | `class-booking` | My Bookings cabinet page. |
| `/trainers`, `/trainers/:id` | `trainer-discovery` | Trainer list + profile. |
| `/trainers/favorites` | `trainer-discovery` | Member-only. |
| `/schedule` | `group-classes-schedule-view` | Week / Day / List views. |
| `/training` | `personal-training-booking` | PT trainer directory + slot picker. |
| `/trainer/sessions` | `personal-training-booking` | TRAINER role only. |
| `/admin/plans` | `membership-plans` | Admin plans table. |
| `/admin/memberships` | `user-membership-purchase` | Admin memberships list. |
| `/admin/trainers` | `scheduler` | Admin trainers CRUD. |
| `/admin/rooms` | `scheduler` | Admin rooms CRUD. |
| `/admin/class-templates` | `scheduler` | Admin class templates CRUD. |
| `/admin/scheduler` | `scheduler` | Weekly drag-and-drop calendar. |
| `/admin/users/:id` | `class-booking` (per-user history view) + cross-feature admin user detail | |
| `/admin/pt-sessions` | `personal-training-booking` | Admin PT view + filters + CSV export. |

### Zustand stores → owner feature (`frontend/src/store/`)
| Store | Owner |
|---|---|
| `authStore.ts` | `auth` (also stores `onboardingCompletedAt` populated by bootstrap) |
| `bookingStore.ts` | `class-booking` |
| `groupClassScheduleStore.ts` | `group-classes-schedule-view` |
| `membershipPlanStore.ts` | `membership-plans` |
| `membershipStore.ts` | `user-membership-purchase` |
| `onboardingStore.ts` | `onboarding-terms-early` |
| `profileStore.ts` | `user-profile-management` |
| `ptBookingStore.ts` | `personal-training-booking` |
| `schedulerStore.ts` | `scheduler` |

### Component directories → owner feature (`frontend/src/components/`)
| Directory | Owner |
|---|---|
| `auth/` | `auth` |
| `admin/` | shared across admin views (primarily `scheduler` + `user-membership-purchase`) |
| `home/` | `member-home` (Pulse rebuild; old `MemberHome*` components deleted) |
| `landing/` | `landing-page` (Pulse primitives reused by `member-home`) |
| `layout/` | cross-cutting (route guards, `MemberNav`) — `MemberNav` owned by `user-access-flow` |
| `media/` | `entity-image-management` (shared upload/preview/avatar primitives) |
| `membership/` | `user-membership-purchase` |
| `onboarding/` | `onboarding-terms-early` |
| `plans/` | `membership-plans` |
| `profile/` | `user-profile-management` |
| `rooms/` | `scheduler` |
| `schedule/` | `group-classes-schedule-view` + `class-booking` (booking CTAs and `MyBookingsDrawer`) |
| `scheduler/` | `scheduler` |
| `trainer/` | `personal-training-booking` (`/trainer/sessions`) |
| `trainers/` | `trainer-discovery` |
| `training/` | `personal-training-booking` (`/training`) |
| `ui/` | cross-cutting design system primitives (no single owner) |

### Page directories → owner feature (`frontend/src/pages/`)
| Directory | Owner |
|---|---|
| `admin/` | mostly `scheduler` + `user-membership-purchase` + `class-booking` (per-user history) + `personal-training-booking` |
| `auth/` | `auth` |
| `home/` | `member-home` |
| `landing/` | `landing-page` |
| `membership/` | `user-membership-purchase` |
| `onboarding/` | `onboarding-terms-early` |
| `plans/` | `membership-plans` |
| `profile/` | `user-profile-management` (`UserProfilePage.tsx`) and `class-booking` (`MyBookingsPage.tsx`) |
| `schedule/` | `group-classes-schedule-view` |
| `trainer/` | `personal-training-booking` |
| `trainers/` | `trainer-discovery` |
| `training/` | `personal-training-booking` |
