# SDD: User Profile Management

## Reference
- PRD: `docs/prd/user-profile-management.md`
- Date: 2026-03-29

## Architecture Overview
This feature adds a lightweight self-service profile for authenticated end users with
role `USER`. The profile is intentionally separate from authentication: the existing
`users` table remains the source of login identity (`email`, `role`), while a new
`user_profiles` table stores only optional profile attributes and lightweight fitness
preferences.

Layers affected: **DB** (one new table), **Backend** (two new endpoints, one new
controller, one new service, one new repository, new DTOs, GlobalExceptionHandler
additions), **Frontend** (one new user page, one form component, one chip-list input
component, one API module, one Zustand store slice, one new type file, navbar update,
route addition).

The endpoint pair is deliberately limited to `/api/v1/profile/me`. The client never
sends an arbitrary `userId` for profile access, which keeps ownership enforcement
simple and aligned with the PRD. The backend resolves the caller from the existing JWT
subject, loads the `User` row for identity fields, and loads the optional `UserProfile`
row for editable fields.

Ordered list fields (`fitnessGoals`, `preferredClassTypes`) are stored as JSONB arrays.
This fits the v1 usage pattern well: each row is always fetched by `user_id`, the lists
are short (max 5 items), order must be preserved, and no cross-user reporting or
filtering on individual list values is required.

---

## 1. Database Changes

### New Tables

```sql
-- V14__create_user_profiles_table.sql

CREATE TABLE user_profiles (
  user_id                 UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name              VARCHAR(50),
  last_name               VARCHAR(50),
  phone                   VARCHAR(20),
  date_of_birth           DATE,
  fitness_goals           JSONB       NOT NULL DEFAULT '[]'::jsonb,
  preferred_class_types   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ,
  CONSTRAINT chk_user_profiles_first_name
    CHECK (first_name IS NULL OR char_length(btrim(first_name)) BETWEEN 1 AND 50),
  CONSTRAINT chk_user_profiles_last_name
    CHECK (last_name IS NULL OR char_length(btrim(last_name)) BETWEEN 1 AND 50),
  CONSTRAINT chk_user_profiles_phone
    CHECK (phone IS NULL OR char_length(phone) BETWEEN 1 AND 20),
  CONSTRAINT chk_user_profiles_date_of_birth
    CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE),
  CONSTRAINT chk_user_profiles_fitness_goals_array
    CHECK (jsonb_typeof(fitness_goals) = 'array'),
  CONSTRAINT chk_user_profiles_preferred_class_types_array
    CHECK (jsonb_typeof(preferred_class_types) = 'array'),
  CONSTRAINT chk_user_profiles_fitness_goals_size
    CHECK (jsonb_array_length(fitness_goals) <= 5),
  CONSTRAINT chk_user_profiles_preferred_class_types_size
    CHECK (jsonb_array_length(preferred_class_types) <= 5)
);

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

Notes on design decisions:
- `user_id` is the primary key. There is exactly one profile row per user, and the API
  never exposes or needs a separate profile ID.
- `ON DELETE CASCADE` keeps profile cleanup automatic if a user record is deleted by a
  future admin or data-retention workflow.
- `fitness_goals` and `preferred_class_types` are `JSONB NOT NULL DEFAULT '[]'::jsonb`.
  This guarantees stable empty-array responses and avoids null-vs-empty ambiguity for
  ordered list fields.
- No extra secondary indexes are needed. Every read and write in this feature is scoped
  to one `user_id`, so the primary key lookup is sufficient.
- The DB enforces array shape and max list size as a safety net. The application layer
  still performs trimming, de-duplication, item-length checks, and error-code mapping.
- `deleted_at` is included to stay consistent with the project's broader soft-delete
  convention, but this feature never soft-deletes profile rows.

### Modified Tables

None. The existing `users` table remains the source of `email` and `role`; it is not
expanded with optional profile fields.

### Flyway Migration

Filename: `V14__create_user_profiles_table.sql`

Location: `backend/src/main/resources/db/migration/`

The latest migration currently present is `V13__seed_scheduler_reference_data.sql`, so
this feature takes `V14`.

The file contains, in order:
1. `CREATE TABLE user_profiles` with all columns and constraints.
2. `CREATE TRIGGER trg_user_profiles_updated_at` reusing `set_updated_at()` from `V2b`.

---

## 2. Backend API Contract

### GET /api/v1/profile/me

**Auth:** Required. `USER` role only (`@PreAuthorize("hasRole('USER')")`)

**Request Body:** None.

**Success Response (200):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "alice@example.com",
  "firstName": "Alice",
  "lastName": "Brown",
  "phone": "+48123123123",
  "dateOfBirth": "1994-08-12",
  "fitnessGoals": ["Build strength", "Improve mobility"],
  "preferredClassTypes": ["Yoga", "HIIT"],
  "createdAt": "2026-03-29T10:00:00Z",
  "updatedAt": "2026-03-29T12:30:00Z"
}
```

**Success Response When No Profile Row Exists Yet (200):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "alice@example.com",
  "firstName": null,
  "lastName": null,
  "phone": null,
  "dateOfBirth": null,
  "fitnessGoals": [],
  "preferredClassTypes": [],
  "createdAt": "2026-03-29T09:00:00Z",
  "updatedAt": "2026-03-29T09:00:00Z"
}
```

For first-time users, `createdAt` and `updatedAt` come from the `users.created_at` /
`users.updated_at` timestamps until a real profile row exists. This keeps the response
fully populated without introducing synthetic timestamps.

**Error Responses:**

| Status | Error Code | Condition |
|--------|------------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid Bearer token |
| 403 | `ACCESS_DENIED` | Authenticated caller does not have role `USER` |

**Business Logic (executed in `UserProfileService.getMyProfile`):**
1. Extract `userId` from `Authentication.name`.
2. Load the `User` row by `id`. This is the source of `email`.
3. Load `UserProfile` by `userId` from `user_profiles`.
4. If the profile row exists, map it to `UserProfileResponse`.
5. If no profile row exists, synthesize a response with editable scalar fields as `null`,
   editable list fields as empty arrays, `email` from the `User` row, and
   `createdAt` / `updatedAt` copied from the `User` row.
6. Return 200.

This two-query approach replaces the PRD's suggested left join with a simpler,
repo-aligned service composition. Because the caller's `userId` is already known from
JWT auth, there is no list endpoint or arbitrary lookup to optimize.

---

### PUT /api/v1/profile/me

**Auth:** Required. `USER` role only

**Request Body:**
```json
{
  "firstName": "Alice",
  "lastName": "Brown",
  "phone": "+48 123 123 123",
  "dateOfBirth": "1994-08-12",
  "fitnessGoals": ["Build strength", "Improve mobility"],
  "preferredClassTypes": ["Yoga", "HIIT"]
}
```

**Request Body Notes:**
- This endpoint is a full replacement of editable profile fields, not a partial patch.
- Omitted or `null` scalar fields are persisted as `null`.
- Omitted list fields are normalised to empty arrays before persistence.
- The request DTO intentionally includes nullable shadow fields for `email`, `userId`,
  `role`, and `membershipStatus` so the backend can detect and reject read-only fields
  with a deterministic `READ_ONLY_FIELD` error instead of silently ignoring them.

**Success Response (200):**
Same shape as `GET /api/v1/profile/me`, with the updated values.

**Error Responses:**

| Status | Error Code | Condition |
|--------|------------|-----------|
| 400 | `READ_ONLY_FIELD` | Request includes `email`, `userId`, `role`, or `membershipStatus` |
| 400 | `INVALID_FIRST_NAME` | `firstName` is blank after trimming or longer than 50 chars |
| 400 | `INVALID_LAST_NAME` | `lastName` is blank after trimming or longer than 50 chars |
| 400 | `INVALID_PHONE` | `phone` cannot be normalised to `+` plus digits only, or exceeds 20 chars |
| 400 | `INVALID_DATE_OF_BIRTH` | `dateOfBirth` is malformed or in the future |
| 400 | `INVALID_FITNESS_GOALS` | Goals list has more than 5 items or an item trims outside 1..50 chars |
| 400 | `INVALID_PREFERRED_CLASS_TYPES` | Preferences list has more than 5 items or an item trims outside 1..50 chars |
| 401 | `UNAUTHORIZED` | Missing or invalid Bearer token |
| 403 | `ACCESS_DENIED` | Authenticated caller does not have role `USER` |

**Business Logic (executed in `UserProfileService.updateMyProfile` inside one transaction):**
1. Extract `userId` from `Authentication.name`.
2. Load the `User` row by `id`. This guarantees the response always uses authoritative
   identity data from the auth table.
3. Reject the request if any shadow read-only field is non-null:
   `email`, `userId`, `role`, `membershipStatus`.
4. Validate and normalise editable fields:
   - `firstName`, `lastName`: trim; if non-null they must remain 1..50 chars.
   - `phone`: trim, remove spaces, hyphens, and parentheses, require the result to match
     `^\+[1-9]\d{7,19}$`, then persist that normalised value.
   - `dateOfBirth`: parse ISO date string to `LocalDate`; reject malformed values or
     future dates.
   - `fitnessGoals`, `preferredClassTypes`: trim every item, reject blanks or items over
     50 chars, reject more than 5 items, then de-duplicate case-insensitively while
     preserving the first occurrence order.
5. Load existing `UserProfile` by `userId`.
6. If it exists, mutate the entity in place. If not, create a new `UserProfile` with
   `userId` as the primary key.
7. Persist via `userProfileRepository.save(profile)`.
8. Return 200 with `UserProfileResponse`, combining `email` from `User` and profile
   fields from `UserProfile`.

No client-controlled timestamp or ownership field is accepted. `updated_at` is managed
by the existing DB trigger, and `created_at` is set only on first row creation.

---

## 3. Kotlin Classes to Create

### New Files

- `backend/src/main/kotlin/com/gymflow/domain/UserProfile.kt`
- `backend/src/main/kotlin/com/gymflow/dto/UserProfileResponse.kt`
- `backend/src/main/kotlin/com/gymflow/dto/UpdateUserProfileRequest.kt`
- `backend/src/main/kotlin/com/gymflow/repository/UserProfileRepository.kt`
- `backend/src/main/kotlin/com/gymflow/service/UserProfileService.kt`
- `backend/src/main/kotlin/com/gymflow/controller/UserProfileController.kt`

### Entity Field Specification

**`UserProfile`**

| Field | Type | Notes |
|------|------|------|
| `userId` | `UUID` | `@Id`, maps to `user_profiles.user_id` |
| `firstName` | `String?` | Nullable, persisted trimmed |
| `lastName` | `String?` | Nullable, persisted trimmed |
| `phone` | `String?` | Nullable, persisted in normalised `+digits` format |
| `dateOfBirth` | `LocalDate?` | Nullable |
| `fitnessGoals` | `MutableList<String>` | `@JdbcTypeCode(SqlTypes.JSON)` backed by JSONB |
| `preferredClassTypes` | `MutableList<String>` | `@JdbcTypeCode(SqlTypes.JSON)` backed by JSONB |
| `createdAt` | `OffsetDateTime` | DB default `NOW()` |
| `updatedAt` | `OffsetDateTime` | DB default `NOW()`, auto-updated by trigger |
| `deletedAt` | `OffsetDateTime?` | Always null in this feature |

Implementation notes:
- Use Hibernate 6 JSON support (`@JdbcTypeCode(SqlTypes.JSON)`) rather than adding a
  new custom JSONB library. Spring Boot 3 already ships the necessary Hibernate version.
- Keep the entity scalar-only. A JPA `@OneToOne` to `User` is not required because this
  feature never navigates from profile to user lazily; the service loads `User`
  separately for `email`.

### DTO Field Specifications

**`UpdateUserProfileRequest`**

The request DTO should keep values as raw transport types so validation and error-code
mapping stay deterministic.

| Field | Type | Notes |
|------|------|------|
| `firstName` | `String?` | Editable |
| `lastName` | `String?` | Editable |
| `phone` | `String?` | Editable raw input; service normalises |
| `dateOfBirth` | `String?` | Raw ISO date string; service parses |
| `fitnessGoals` | `List<String>?` | Editable ordered list |
| `preferredClassTypes` | `List<String>?` | Editable ordered list |
| `email` | `String?` | Read-only shadow field for `READ_ONLY_FIELD` detection |
| `userId` | `String?` | Read-only shadow field for `READ_ONLY_FIELD` detection |
| `role` | `String?` | Read-only shadow field for `READ_ONLY_FIELD` detection |
| `membershipStatus` | `String?` | Read-only shadow field for `READ_ONLY_FIELD` detection |

**`UserProfileResponse`**

| Field | Type |
|------|------|
| `userId` | `UUID` |
| `email` | `String` |
| `firstName` | `String?` |
| `lastName` | `String?` |
| `phone` | `String?` |
| `dateOfBirth` | `LocalDate?` |
| `fitnessGoals` | `List<String>` |
| `preferredClassTypes` | `List<String>` |
| `createdAt` | `OffsetDateTime` |
| `updatedAt` | `OffsetDateTime` |

### Repository Specification

**`UserProfileRepository`**

Interface:

```kotlin
interface UserProfileRepository : JpaRepository<UserProfile, UUID>
```

Required methods:
- Inherited `findById(userId: UUID)`
- Inherited `save(entity: UserProfile)`

No custom JPQL is required for v1. All access patterns are point lookups by primary key.

### Service Specification

**`UserProfileService`**

Constructor dependencies:
- `UserProfileRepository`
- `UserRepository`

Public methods:
- `@Transactional(readOnly = true) fun getMyProfile(userId: UUID): UserProfileResponse`
- `@Transactional fun updateMyProfile(userId: UUID, request: UpdateUserProfileRequest): UserProfileResponse`

Private helpers:
- `validateReadOnlyFields(request)`
- `normalizeOptionalName(value, fieldName)`
- `normalizePhone(value)`
- `parseDateOfBirth(value)`
- `normalizeOrderedList(items, errorFactory)`
- `toResponse(user: User, profile: UserProfile?)`

Custom exceptions to add in the same file or a sibling file:
- `ReadOnlyFieldException`
- `InvalidFirstNameException`
- `InvalidLastNameException`
- `InvalidPhoneException`
- `InvalidDateOfBirthException`
- `InvalidFitnessGoalsException`
- `InvalidPreferredClassTypesException`

Validation is deliberately service-owned instead of Bean-Validation-only. The PRD
requires very specific error codes, trimming rules, and de-duplication semantics that
are awkward to express cleanly with annotations alone.

### GlobalExceptionHandler Changes

Add handlers mapping new exceptions to HTTP 400:

| Exception | Status | Code |
|----------|--------|------|
| `ReadOnlyFieldException` | 400 | `READ_ONLY_FIELD` |
| `InvalidFirstNameException` | 400 | `INVALID_FIRST_NAME` |
| `InvalidLastNameException` | 400 | `INVALID_LAST_NAME` |
| `InvalidPhoneException` | 400 | `INVALID_PHONE` |
| `InvalidDateOfBirthException` | 400 | `INVALID_DATE_OF_BIRTH` |
| `InvalidFitnessGoalsException` | 400 | `INVALID_FITNESS_GOALS` |
| `InvalidPreferredClassTypesException` | 400 | `INVALID_PREFERRED_CLASS_TYPES` |

No change is needed for:
- `UNAUTHORIZED` handling in Spring Security
- `ACCESS_DENIED` handler already present in `GlobalExceptionHandler`

### SecurityConfig Changes

No new `permitAll` matcher is needed. `/api/v1/profile/me` remains protected by default
because `.anyRequest().authenticated()` already applies.

The controller methods still require:

```kotlin
@PreAuthorize("hasRole('USER')")
```

This ensures authenticated `ADMIN` callers get 403 `ACCESS_DENIED` rather than being
treated as valid profile users.

### Modified Files

- `backend/src/main/kotlin/com/gymflow/controller/GlobalExceptionHandler.kt`
- `backend/src/main/kotlin/com/gymflow/repository/UserRepository.kt`
  No signature change required, but this existing repository becomes a dependency of
  `UserProfileService`.

No `SecurityConfig.kt` change is required for this feature.

---

## 4. Frontend Components to Create

### Pages

- `frontend/src/pages/profile/UserProfilePage.tsx`

Responsibilities:
- Fetch the current user's profile on mount.
- Render loading, error, and success states.
- Render the profile form prefilled with fetched data.
- Save updates through the store and show success feedback.

### New Components

- `frontend/src/components/profile/UserProfileForm.tsx`
- `frontend/src/components/profile/ProfileChipInput.tsx`

**`UserProfileForm` responsibilities**
- Use `react-hook-form` + `zod` to validate basic client-side constraints before submit.
- Render read-only `email`.
- Render editable `firstName`, `lastName`, `phone`, `dateOfBirth`.
- Render two chip-list inputs for goals and preferred class types.
- Surface field-level backend validation errors through `setError`.

**`ProfileChipInput` responsibilities**
- Manage add/remove behaviour for ordered string lists.
- Enforce max 5 chips in the UI for immediate feedback.
- Preserve insertion order.
- Prevent empty chip submission on blur or enter.

### New Types (`src/types/userProfile.ts`)

```ts
export interface UserProfile {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  fitnessGoals: string[];
  preferredClassTypes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfileRequest {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  fitnessGoals: string[];
  preferredClassTypes: string[];
}
```

Note:
- Frontend request types should not include the read-only shadow fields. Only the
  backend DTO needs those to reject hostile or hand-crafted requests.

### New API Functions (`src/api/profile.ts`)

```ts
export async function getMyProfile(): Promise<UserProfile>
export async function updateMyProfile(
  req: UpdateUserProfileRequest
): Promise<UserProfile>
```

Implementation:
- Use the existing authenticated `axiosInstance`.
- `GET` calls `/profile/me`
- `PUT` calls `/profile/me`

### State (Zustand) — new file `src/store/profileStore.ts`

State shape:

```ts
interface ProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fieldErrors: Partial<Record<
    'firstName' | 'lastName' | 'phone' | 'dateOfBirth' | 'fitnessGoals' | 'preferredClassTypes',
    string
  >>;
  successMessage: string | null;
  fetchMyProfile: () => Promise<void>;
  saveMyProfile: (req: UpdateUserProfileRequest) => Promise<void>;
  clearMessages: () => void;
}
```

Store behaviour:
- `fetchMyProfile` populates `profile` or `error`.
- `saveMyProfile` clears prior messages, submits the request, updates `profile` with the
  server response, and sets a short success message such as "Profile updated."
- Field-specific backend error codes map into `fieldErrors`.
- Non-field errors (`READ_ONLY_FIELD`, `ACCESS_DENIED`, generic failures) map into the
  top-level `error` banner.

### Error Code to User Message Mapping (`src/utils/profileErrors.ts`)

Recommended map:

```ts
export const PROFILE_ERROR_MESSAGES: Record<string, string> = {
  READ_ONLY_FIELD: 'Email and account ownership fields cannot be changed here.',
  INVALID_FIRST_NAME: 'First name must be between 1 and 50 characters.',
  INVALID_LAST_NAME: 'Last name must be between 1 and 50 characters.',
  INVALID_PHONE: 'Enter a valid international phone number.',
  INVALID_DATE_OF_BIRTH: 'Enter a valid date of birth that is not in the future.',
  INVALID_FITNESS_GOALS: 'Fitness goals must contain up to 5 items, each 1 to 50 characters long.',
  INVALID_PREFERRED_CLASS_TYPES: 'Preferred class types must contain up to 5 items, each 1 to 50 characters long.',
  ACCESS_DENIED: 'You do not have permission to view this profile.',
}
```

### Route Additions (`src/App.tsx`)

Add:

```tsx
<Route
  path="/profile"
  element={
    <AuthRoute>
      <UserProfilePage />
    </AuthRoute>
  }
/>
```

The existing `AuthRoute` is sufficient for client-side protection. Server-side role
enforcement remains authoritative.

### Navbar Changes (`src/components/layout/Navbar.tsx`)

Add a visible navigation path to the new page for authenticated users:
- Desktop: add a `Profile` nav link when `isAuthenticated` is true and `user?.role === 'USER'`
- Mobile drawer: add the same `Profile` link under authenticated user actions

Do not replace the existing logout affordance with a hidden avatar-only menu. The
current navbar pattern is simple and already shipped.

---

## 5. Task List per Agent

### db-architect

1. Create `V14__create_user_profiles_table.sql` with the table, JSONB constraints, and
   `updated_at` trigger.
2. Verify the migration runs cleanly after `V13`.
3. Confirm `jsonb_array_length()` constraints behave correctly with the default `[]`.

### backend-dev

1. Add `UserProfile` entity using `@JdbcTypeCode(SqlTypes.JSON)` for the two list fields.
2. Add `UpdateUserProfileRequest` and `UserProfileResponse` DTOs.
3. Add `UserProfileRepository`.
4. Implement `UserProfileService` with:
   - first-time synthetic GET response
   - transactional PUT upsert
   - trimming, normalisation, and de-duplication helpers
   - explicit read-only field rejection
5. Add `UserProfileController` with `GET /api/v1/profile/me` and `PUT /api/v1/profile/me`.
6. Add exception classes and `GlobalExceptionHandler` mappings for the seven new 400 codes.
7. Add backend tests covering:
   - first-time GET with no profile row
   - successful create via PUT
   - successful update of an existing row
   - `READ_ONLY_FIELD`
   - each validation error code
   - case-insensitive de-duplication preserving first occurrence order
   - `ADMIN` caller receives 403

### frontend-dev

1. Add `src/types/userProfile.ts`, `src/api/profile.ts`, `src/store/profileStore.ts`,
   and `src/utils/profileErrors.ts`.
2. Build `UserProfilePage` plus `UserProfileForm` and `ProfileChipInput`.
3. Use `react-hook-form` + `zod` to mirror the backend's basic constraints.
4. Render `email` as read-only and ensure form submit always sends the full editable
   payload, not a partial patch.
5. Surface backend field-level errors inline and generic errors in a banner.
6. Add `/profile` to `App.tsx` and surface navigation in `Navbar.tsx`.
7. Add frontend tests covering:
   - initial load and prefilled values
   - add/remove chip interactions
   - empty state for first-time users
   - inline rendering of backend field errors
   - successful save message

---

## 6. Risks & Notes

### Full-Replacement PUT Semantics

The PRD uses `PUT`, not `PATCH`. To keep semantics predictable, the frontend must submit
the full editable profile document every time. If a future mobile client wants partial
updates, that should be a separate `PATCH /api/v1/profile/me` addition, not hidden
behaviour inside this endpoint.

### JSONB Arrays vs Child Tables

JSONB is the right tradeoff for v1 because access is always one row by `user_id`, list
size is tiny, and order preservation matters. If a future recommendation engine needs
analytics across profile preferences, that later feature can migrate to child tables or
materialized projections.

### Pragmatic Phone Validation

This design intentionally avoids a telecom-grade dependency. The normalisation rule
(`+` followed by 8 to 20 digits after removing separators) is strict enough for the
product requirement and produces a stable persisted format. If country-specific phone
formatting becomes important later, the implementation can adopt `libphonenumber`
without changing the public API.

### Read-Only Field Rejection Needs Explicit DTO Design

Default Jackson mapping would otherwise ignore some hostile inputs or fail with generic
deserialisation errors. The shadow-field approach in `UpdateUserProfileRequest` keeps
the `READ_ONLY_FIELD` contract explicit and testable.

### No Profile Row on First Login

The GET endpoint must not 404 when no row exists yet. The service should always be able
to return a response derived from `users`, with profile fields empty. This is a real
product behaviour, not a temporary workaround.

### Client-Side Role Guard Is Optional, Server-Side Role Guard Is Mandatory

The route can continue to use `AuthRoute` for simplicity. Even if an authenticated
`ADMIN` navigates to `/profile`, the backend still returns the correct 403. If the UX
team later wants cleaner role-based redirects, that can be handled in a shared
`UserRoute` component without changing this backend design.
