# SDD: Onboarding Flow

## Reference
- PRD: docs/prd/onboarding-flow.md
- Design handoff: docs/design-system/handoffs/onboarding-flow/README.md
- Design system: docs/design-system/README.md
- Date: 2026-04-19

## Architecture Overview

The onboarding flow is a one-time, multi-step wizard that runs immediately after account
creation. It touches four layers:

1. **Database** — two migrations: add `onboarding_completed_at` to `user_profiles`; widen the
   `user_memberships.status` column and its CHECK constraint to accommodate `PLAN_PENDING`.
2. **Backend** — a new `OnboardingController` + `OnboardingService`; changes to `AuthService`
   and `AuthController` to auto-create the `user_profiles` row on registration and return
   tokens in the register response; two new DTOs; two new error codes; `UserProfileResponse`
   gains `onboardingCompletedAt`.
3. **Frontend** — a new `/onboarding` route with its own full-screen layout; an onboarding
   gate wired into `UserRoute` and `AuthRoute`; a Zustand onboarding slice; new API functions
   in `src/api/onboarding.ts`.
4. **Seeder** — `user_profiles` gains `onboarding_completed_at`; `user_memberships` gains
   `PLAN_PENDING` as a valid status. Both owner files must be updated in the same PR as the
   migrations.

The flow does **not** add a separate server-side checkpoint table. Server state is inferred
from the profile fields already stored: the frontend determines the resume step by comparing
the profile response against step-completion criteria at session start (FR-9.3).

---

## 1. Database Changes

### 1.1 Migration V27__add_onboarding_completed_at_to_user_profiles.sql

```sql
-- V27__add_onboarding_completed_at_to_user_profiles.sql
ALTER TABLE user_profiles
  ADD COLUMN onboarding_completed_at TIMESTAMPTZ DEFAULT NULL;
```

Column placement: after `emergency_contact_phone` (the last business column before photo).
Nullable. No default trigger — the value is set explicitly by `OnboardingService.complete()`.

No index needed: the column is read once per authenticated request from the profile cache;
no query filters or orders by it.

### 1.2 Migration V28__widen_user_memberships_status_for_plan_pending.sql

The current `status VARCHAR(10)` column plus its CHECK constraint do not accommodate
`PLAN_PENDING` (12 characters). Two steps are required because PostgreSQL cannot alter a
column type or drop/recreate a named constraint in one statement inside a migration that
also changes data.

```sql
-- V28__widen_user_memberships_status_for_plan_pending.sql

-- 1. Drop the existing status check constraint by name.
ALTER TABLE user_memberships
  DROP CONSTRAINT chk_user_memberships_status;

-- 2. Widen the column to fit PLAN_PENDING (12 chars).
ALTER TABLE user_memberships
  ALTER COLUMN status TYPE VARCHAR(20);

-- 3. Re-add the constraint with the new allowed value.
ALTER TABLE user_memberships
  ADD CONSTRAINT chk_user_memberships_status
    CHECK (status IN ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PLAN_PENDING'));
```

**Note on the unique partial index** — `uidx_user_memberships_one_active_per_user` is
defined `WHERE status = 'ACTIVE'`. A `PLAN_PENDING` row is not covered by that index, so a
user may hold one `ACTIVE` and one `PLAN_PENDING` membership simultaneously. This is the
desired behaviour: the pending selection from onboarding coexists with any future active
membership without violating uniqueness. When the gym activates the pending plan (future
payment feature), they will transition `PLAN_PENDING → ACTIVE`, at which point the uniqueness
index will fire and the service must cancel any prior active membership first.

---

## 2. API Contract

### 2.1 Modified: POST /api/v1/auth/register

**Auth:** none (public)

**Request body** (unchanged):
```json
{ "email": "string", "password": "string" }
```

**Success — 201 Created** (shape changes from current):
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "hasActiveMembership": false
}
```

The response shape is now identical to `POST /api/v1/auth/login`. The existing
`RegisterResponse` DTO is replaced by `LoginResponse` (which already has all five fields).

**Side-effects on success:**
1. A `users` row is created (existing behaviour).
2. A `user_profiles` row is created with `user_id` set and all other fields null, including
   `onboarding_completed_at = NULL` (new behaviour — FR-10.1, AC-06).
3. A `refresh_tokens` row is created.
4. Tokens are returned so the frontend can authenticate immediately (FR-10.2).

**Errors** (unchanged):

| HTTP | code | AC |
|------|------|----|
| 400 | `VALIDATION_ERROR` | implicit — empty email/password |
| 409 | `EMAIL_ALREADY_EXISTS` | existing behaviour |

---

### 2.2 Modified: GET /api/v1/profile/me

**Auth:** Bearer token, role USER

**No request body.**

**Success — 200 OK** (`UserProfileResponse` gains one field):
```json
{
  "userId": "uuid",
  "email": "string",
  "firstName": "string | null",
  "lastName": "string | null",
  "phone": "string | null",
  "dateOfBirth": "YYYY-MM-DD | null",
  "fitnessGoals": ["string"],
  "preferredClassTypes": ["string"],
  "emergencyContact": { "name": "string", "phone": "string" } | null,
  "hasProfilePhoto": true,
  "profilePhotoUrl": "/api/v1/profile/me/photo | null",
  "onboardingCompletedAt": "ISO 8601 | null",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

`onboardingCompletedAt` is null until `POST /api/v1/onboarding/complete` is called. The
frontend gate reads this field from the profile response to determine whether to redirect to
`/onboarding` (AC-50, FR-1.6).

**Errors:** unchanged from current.

---

### 2.3 Modified: PUT /api/v1/profile/me

The existing endpoint accepts a full profile replace. The onboarding Profile step (Step 2)
calls this endpoint with only the four required fields plus optional photo. The existing
`PUT` semantics are used — fields absent from the request body are set to null (matching
existing `UserProfileService.updateMyProfile` logic which already treats each field
independently).

The PRD references `PATCH /api/v1/users/me/profile` (AC-11). The live endpoint is
`PUT /api/v1/profile/me`. **Decision:** the frontend calls the live endpoint path
`PUT /api/v1/profile/me`. No new endpoint is added. AC-11 is satisfied by this existing
endpoint. (See Section 6 — Assumption A1.)

Also: the backend must enforce the minimum age (16 years) constraint that is currently
missing from `UserProfileService.parseDateOfBirth`. A 400 with `INVALID_DATE_OF_BIRTH` is
returned when `dob > today - 16 years` (AC-13, AC-14).

**Age validation addition to UserProfileService.parseDateOfBirth:**
- Existing check: `parsed.isAfter(LocalDate.now())` → throws `INVALID_DATE_OF_BIRTH`
- New additional check: `parsed.isAfter(LocalDate.now().minusYears(16))` → throws
  `InvalidDateOfBirthException("Member must be at least 16 years old")`

**Errors:**

| HTTP | code | AC |
|------|------|----|
| 400 | `VALIDATION_ERROR` | validation annotations |
| 400 | `INVALID_DATE_OF_BIRTH` | AC-13, AC-14 |
| 400 | `INVALID_PHONE` | existing |
| 401 | `UNAUTHORIZED` | existing |

---

### 2.4 POST /api/v1/onboarding/plan-pending

Creates a `PLAN_PENDING` user membership record linking the authenticated user to the
selected plan. This is the only onboarding-specific write endpoint beyond completion.

**Auth:** Bearer token, role USER

**Request body:**
```json
{ "planId": "uuid" }
```

**Success — 201 Created:**
```json
{
  "membershipId": "uuid",
  "planId": "uuid",
  "planName": "string",
  "status": "PLAN_PENDING"
}
```

**Business logic:**
1. Verify the plan exists and is active; return `PLAN_NOT_FOUND` (404) if not.
2. Delete any existing `PLAN_PENDING` membership for this user before creating the new one.
   (A member who goes back to Step 4 and picks a different plan replaces their prior pending
   selection.) Uses `userMembershipRepository.deleteByUserIdAndStatus(userId, "PLAN_PENDING")`.
3. Do not check for an existing `ACTIVE` membership — a member with an active membership
   can still select a plan during onboarding (though that scenario is edge-case given onboarding
   runs immediately after registration).
4. Create the `UserMembership` with:
   - `status = "PLAN_PENDING"`
   - `startDate = LocalDate.now()`
   - `endDate = LocalDate.now()` (placeholder; real dates are set when payment activates the plan)
   - `bookingsUsedThisMonth = 0`
5. Return 201 with the record summary.

**Errors:**

| HTTP | code | AC |
|------|------|----|
| 404 | `PLAN_NOT_FOUND` | AC-28 |
| 400 | `PLAN_NOT_AVAILABLE` | plan is inactive — AC-28 |
| 401 | `UNAUTHORIZED` | not authenticated |

---

### 2.5 POST /api/v1/onboarding/complete

Marks onboarding as completed. Idempotent.

**Auth:** Bearer token, role USER

**Request body:** none

**Success — 200 OK:**
```json
{
  "onboardingCompletedAt": "ISO 8601"
}
```

**Business logic:**
1. Load the `user_profiles` row for the authenticated user.
2. If `onboarding_completed_at` is already set: return 200 with the existing timestamp
   (idempotent, AC-54).
3. If null: set `onboardingCompletedAt = OffsetDateTime.now()`, set `updatedAt =
   OffsetDateTime.now()`, save.
4. Return 200.

**Errors:**

| HTTP | code | AC |
|------|------|----|
| 401 | `UNAUTHORIZED` | not authenticated |
| 404 | `USER_NOT_FOUND` | profile row missing (should not happen after FR-10.1) |

---

### 2.6 GET /api/v1/class-schedule (reused, no changes)

Used by Step 5 (First Booking) Group class mode. The existing endpoint at
`GET /api/v1/class-schedule` with `view=week&anchorDate=TODAY&timeZone=UTC` returns the
upcoming class instances. The frontend uses this as-is, filtering to future instances only.

**No changes to this endpoint.**

---

### 2.7 Reused APIs (no changes)

| Purpose | Endpoint |
|---------|----------|
| Fetch active plans (Step 4) | `GET /api/v1/membership-plans` |
| Create group class booking (Step 5) | `POST /api/v1/bookings` |
| Create PT booking (Step 5) | `POST /api/v1/pt-bookings` |
| List PT trainers (Step 5 PT mode) | `GET /api/v1/trainers/pt` |
| Trainer availability (Step 5 PT mode) | `GET /api/v1/trainers/{trainerId}/pt-availability` |
| Upload profile photo (Step 2) | `POST /api/v1/profile/me/photo` (existing multipart) |
| Get profile (gate check) | `GET /api/v1/profile/me` |

---

## 3. Kotlin Files

### New files

| File path | Type | Purpose |
|-----------|------|---------|
| `backend/src/main/kotlin/com/gymflow/controller/OnboardingController.kt` | `@RestController` | Exposes `POST /api/v1/onboarding/plan-pending` and `POST /api/v1/onboarding/complete` |
| `backend/src/main/kotlin/com/gymflow/service/OnboardingService.kt` | `@Service` | Business logic for plan-pending creation and completion; calls `UserMembershipRepository` and `UserProfileRepository` |
| `backend/src/main/kotlin/com/gymflow/dto/OnboardingPlanPendingRequest.kt` | DTO | `data class OnboardingPlanPendingRequest(@field:NotNull val planId: UUID)` |
| `backend/src/main/kotlin/com/gymflow/dto/OnboardingPlanPendingResponse.kt` | DTO | `data class OnboardingPlanPendingResponse(val membershipId: UUID, val planId: UUID, val planName: String, val status: String)` |
| `backend/src/main/kotlin/com/gymflow/dto/OnboardingCompleteResponse.kt` | DTO | `data class OnboardingCompleteResponse(val onboardingCompletedAt: OffsetDateTime)` |
| `backend/src/main/resources/db/migration/V27__add_onboarding_completed_at_to_user_profiles.sql` | Migration | Adds `onboarding_completed_at TIMESTAMPTZ` column |
| `backend/src/main/resources/db/migration/V28__widen_user_memberships_status_for_plan_pending.sql` | Migration | Widens `status VARCHAR(20)` and extends CHECK to include `PLAN_PENDING` |

### Modified files

| File path | Type | Change |
|-----------|------|--------|
| `backend/src/main/kotlin/com/gymflow/service/AuthService.kt` | Service | `register()`: after saving `User`, create and save an empty `UserProfile(userId = saved.id)` via `userProfileRepository`; change return type from `RegisterResponse` to `LoginResponse`; generate tokens and refresh token identically to `login()` |
| `backend/src/main/kotlin/com/gymflow/controller/AuthController.kt` | Controller | `register()` return type changes from `RegisterResponse` to `LoginResponse` |
| `backend/src/main/kotlin/com/gymflow/dto/RegisterResponse.kt` | DTO | Delete this file — `LoginResponse` is returned instead |
| `backend/src/main/kotlin/com/gymflow/dto/UserProfileResponse.kt` | DTO | Add `val onboardingCompletedAt: OffsetDateTime?` field |
| `backend/src/main/kotlin/com/gymflow/service/UserProfileService.kt` | Service | `parseDateOfBirth()`: add 16-year minimum-age check; `toResponse()`: populate `onboardingCompletedAt` from `profile.onboardingCompletedAt` |
| `backend/src/main/kotlin/com/gymflow/domain/UserProfile.kt` | Entity | Add `@Column(name = "onboarding_completed_at") var onboardingCompletedAt: OffsetDateTime? = null` |
| `backend/src/main/kotlin/com/gymflow/domain/ErrorCode.kt` | Enum | Add `ONBOARDING_NOT_COMPLETE` (reserved for future enforcement gate); no new codes needed for the current AC set |
| `backend/src/main/kotlin/com/gymflow/repository/UserMembershipRepository.kt` | Repository | Add `fun deleteByUserIdAndStatus(userId: UUID, status: String)` with `@Modifying @Transactional @Query` to remove existing `PLAN_PENDING` rows before creating a new one |

**Note on `RegisterResponse.kt` deletion:** the file is deleted and its import in
`AuthController.kt` is replaced with `LoginResponse`. The `AuthService.register()` method
now injects `UserProfileRepository` in addition to its existing dependencies.

---

## 4. Frontend Architecture

### 4.1 Route structure

`/onboarding` is a new route in `App.tsx`. It uses a new `OnboardingRoute` guard (see 4.2).

```tsx
// App.tsx additions
import { OnboardingPage } from './pages/onboarding/OnboardingPage'
import { OnboardingRoute } from './components/layout/OnboardingRoute'

// Inside <Routes>:
<Route
  path="/onboarding"
  element={
    <OnboardingRoute>
      <OnboardingPage />
    </OnboardingRoute>
  }
/>
```

All existing route guards (`UserRoute`, `AuthRoute`) gain an onboarding redirect check
(see 4.2).

### 4.2 Onboarding gate — redirect logic

**Three guard behaviours:**

1. **OnboardingRoute** (`frontend/src/components/layout/OnboardingRoute.tsx`)
   - If not authenticated → redirect to `/login` (AC-04).
   - If authenticated and `onboardingCompletedAt` is set → redirect to `/home` (AC-03).
   - Otherwise → render children.

2. **UserRoute** and **AuthRoute** — both gain the same early check:
   - If authenticated and `onboardingCompletedAt` is null → redirect to `/onboarding`
     (AC-01, AC-02).
   - Applied before the existing role checks so the onboarding gate fires first.

**Where `onboardingCompletedAt` comes from:**

The auth store is extended with a `onboardingCompletedAt: string | null` field (see 4.4).
It is populated from `GET /api/v1/profile/me` which the app fetches on boot. The route
guards read from this store field — not from localStorage alone (AC-50, FR-1.6).

**Boot-time profile fetch:**

A new hook `useBootstrap` (or an effect in `App.tsx`) runs once after the auth store
confirms `isAuthenticated === true`. It calls `GET /api/v1/profile/me` and stores
`onboardingCompletedAt` in the auth store. Until that fetch resolves, authenticated routes
show a loading spinner. On fetch failure, the app treats the user as if
`onboardingCompletedAt` is null (safest fallback — sends them to onboarding).

### 4.3 Component tree

```
OnboardingPage                         pages/onboarding/OnboardingPage.tsx
  OnboardingShell                      components/onboarding/OnboardingShell.tsx
    MiniNav                            components/onboarding/MiniNav.tsx
    ProgressBar                        components/onboarding/ProgressBar.tsx
    StepRail                           components/onboarding/StepRail.tsx
    [step content outlet]
      StepWelcome                      components/onboarding/steps/StepWelcome.tsx
      StepProfile                      components/onboarding/steps/StepProfile.tsx
      StepPreferences                  components/onboarding/steps/StepPreferences.tsx
      StepMembership                   components/onboarding/steps/StepMembership.tsx
      StepBooking                      components/onboarding/steps/StepBooking.tsx
        GroupClassList                 components/onboarding/booking/GroupClassList.tsx
        TrainerList                    components/onboarding/booking/TrainerList.tsx
          TrainerCalendar              components/onboarding/booking/TrainerCalendar.tsx
      StepTerms                        components/onboarding/steps/StepTerms.tsx
      StepDone                         components/onboarding/steps/StepDone.tsx
    StickyFooter                       components/onboarding/StickyFooter.tsx
    TermsModal                         components/onboarding/TermsModal.tsx
```

`StepDone` is rendered directly inside `OnboardingShell` replacing the step content area;
the step rail and progress bar are hidden when `currentStep === 'done'` (FR-8.3).

### 4.4 State management — Zustand onboarding slice

New store: `frontend/src/store/onboardingStore.ts`

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Step keys in display order (booking is conditionally visible)
export type StepKey = 'welcome' | 'profile' | 'preferences' | 'membership' | 'booking' | 'terms' | 'done'

export interface OnboardingState {
  // Current navigation position
  currentStep: StepKey

  // Form data (mirrors OnboardingData from handoff)
  firstName: string
  lastName: string
  phone: string          // raw US-formatted input, E.164 on submit
  dob: string            // YYYY-MM-DD
  goals: string[]        // from GOAL_OPTIONS ids
  classTypes: string[]   // from CLASS_OPTIONS ids
  frequency: string      // '1-2' | '3-4' | '5+' | 'unsure' | ''

  // Plan selection
  selectedPlanId: string | null
  selectedPlanName: string | null
  selectedPlanPriceInCents: number | null
  pendingMembershipId: string | null  // set after POST /onboarding/plan-pending succeeds

  // Booking selection
  bookingMode: 'class' | 'trainer'
  selectedClassInstanceId: string | null
  selectedTrainerId: string | null
  selectedTrainerSlot: string | null  // ISO 8601 datetime string of the slot start
  completedBookingId: string | null   // set after POST /bookings or POST /pt-bookings succeeds

  // Terms
  agreeTerms: boolean
  agreeWaiver: boolean
  notifBooking: boolean
  notifNews: boolean

  // Actions
  setStep: (step: StepKey) => void
  setProfileFields: (fields: Partial<Pick<OnboardingState, 'firstName' | 'lastName' | 'phone' | 'dob'>>) => void
  setPreferences: (fields: Partial<Pick<OnboardingState, 'goals' | 'classTypes' | 'frequency'>>) => void
  setPlan: (planId: string | null, planName: string | null, priceInCents: number | null) => void
  setPendingMembership: (membershipId: string | null) => void
  setBookingSelection: (mode: 'class' | 'trainer', classInstanceId: string | null, trainerId: string | null, slot: string | null) => void
  setCompletedBooking: (bookingId: string | null) => void
  setTerms: (fields: Partial<Pick<OnboardingState, 'agreeTerms' | 'agreeWaiver' | 'notifBooking' | 'notifNews'>>) => void
  reset: () => void
}
```

**Persistence key:** `gf:onboarding:v1:{userId}` — the store is re-keyed when the user ID
changes. The `persist` middleware is used with a dynamic `name` derived from the auth store's
`user.id`. Fields excluded from persistence: `currentStep` is persisted; the resume step is
computed server-side on mount and the stored step is used as a fallback only when the profile
fetch is pending.

**Resume step computation** (run in `OnboardingPage` on mount):
```ts
function computeResumeStep(profile: UserProfile): StepKey {
  if (!profile.firstName || !profile.lastName || !profile.phone || !profile.dateOfBirth) {
    return 'profile'
  }
  // preferences always skippable — treat as complete once profile is done
  return 'membership'
}
```
If `currentStep` in localStorage is ahead of the server-computed step, the server step wins.
If localStorage is at a later step and server data confirms profile is complete, localStorage
step is used (allows resuming at membership/booking/terms).

### 4.5 Auth store additions

`frontend/src/store/authStore.ts` gains:

```ts
// Added to AuthState interface:
onboardingCompletedAt: string | null  // ISO 8601 or null

// Added action:
setOnboardingCompletedAt: (ts: string | null) => void
```

The `partialize` array includes `onboardingCompletedAt` so it survives page refresh.

### 4.6 API functions — src/api/onboarding.ts (new file)

```ts
import axiosInstance from './axiosInstance'

export interface OnboardingPlanPendingRequest {
  planId: string
}

export interface OnboardingPlanPendingResponse {
  membershipId: string
  planId: string
  planName: string
  status: 'PLAN_PENDING'
}

export interface OnboardingCompleteResponse {
  onboardingCompletedAt: string  // ISO 8601
}

export async function submitPlanPending(
  req: OnboardingPlanPendingRequest
): Promise<OnboardingPlanPendingResponse> {
  const response = await axiosInstance.post<OnboardingPlanPendingResponse>(
    '/onboarding/plan-pending',
    req
  )
  return response.data
}

export async function completeOnboarding(): Promise<OnboardingCompleteResponse> {
  const response = await axiosInstance.post<OnboardingCompleteResponse>(
    '/onboarding/complete'
  )
  return response.data
}
```

### 4.7 TypeScript types — src/types/onboarding.ts (new file)

```ts
export type StepKey = 'welcome' | 'profile' | 'preferences' | 'membership' | 'booking' | 'terms' | 'done'

export interface StepDefinition {
  key: StepKey
  label: string
  sublabel: string      // 'REQUIRED' | 'OPTIONAL' | 'IF PLAN CHOSEN'
  required: boolean
  conditional: boolean  // true for 'booking' — hidden when no plan selected
}

export const ALL_STEPS: StepDefinition[] = [
  { key: 'welcome',     label: 'Welcome',        sublabel: '',              required: false, conditional: false },
  { key: 'profile',     label: 'Your profile',   sublabel: 'REQUIRED',      required: true,  conditional: false },
  { key: 'preferences', label: 'Preferences',    sublabel: 'OPTIONAL',      required: false, conditional: false },
  { key: 'membership',  label: 'Membership',     sublabel: 'OPTIONAL',      required: false, conditional: false },
  { key: 'booking',     label: 'First booking',  sublabel: 'IF PLAN CHOSEN',required: false, conditional: true  },
  { key: 'terms',       label: 'Final check',    sublabel: 'REQUIRED',      required: true,  conditional: false },
]
// 'done' is not in ALL_STEPS — it replaces the layout, not a step in the rail.
```

### 4.8 Post-registration redirect

`frontend/src/pages/auth/RegisterPage.tsx` currently redirects to `/login`. Change:

1. The `register` API call response shape changes to match `LoginResponse` (tokens + expiry).
2. On success: call `authStore.setTokens(accessToken, refreshToken)`, decode the JWT to get
   `{ id, email, role }` and call `authStore.setUser(user)`, set
   `authStore.setOnboardingCompletedAt(null)`, then navigate to `/onboarding`.
3. Remove the existing redirect to `/login`.

The frontend `RegisterResponse` type in `src/types/auth.ts` is updated to equal
`LoginResponse` (same five fields).

### 4.9 Local storage schema

Key: `gf:onboarding:v1:{userId}` (string interpolated with the authenticated user UUID).

Shape: the serialized subset of `OnboardingState` produced by Zustand's `persist` middleware
`partialize`. All fields in `OnboardingState` are persisted except for transient API-loading
flags (which live in React component state, not the store).

Schema version is embedded in the key (`v1`). If the schema changes in a future iteration,
increment to `v2` and migrate or discard `v1` data on first read.

---

## 5. Task List

### Backend phase

- [ ] Write V27 migration: add `onboarding_completed_at TIMESTAMPTZ` to `user_profiles`
- [ ] Write V28 migration: widen `user_memberships.status` to `VARCHAR(20)`, extend CHECK constraint to include `PLAN_PENDING`
- [ ] Add `onboardingCompletedAt: OffsetDateTime?` field to `UserProfile` entity
- [ ] Add `onboardingCompletedAt: OffsetDateTime?` field to `UserProfileResponse` DTO; populate from profile in `UserProfileService.toResponse()`
- [ ] Add `deleteByUserIdAndStatus(userId, status)` to `UserMembershipRepository` (annotated `@Modifying @Transactional @Query`)
- [ ] Add 16-year minimum-age check to `UserProfileService.parseDateOfBirth()` (throws `InvalidDateOfBirthException`)
- [ ] Modify `AuthService.register()`: inject `UserProfileRepository`; after saving `User`, create and save `UserProfile(userId = saved.id)`; change return type to `LoginResponse`; generate access + refresh tokens
- [ ] Update `AuthController.register()` return type from `RegisterResponse` to `LoginResponse`; update HTTP status to 201
- [ ] Delete `backend/src/main/kotlin/com/gymflow/dto/RegisterResponse.kt`
- [ ] Create `OnboardingPlanPendingRequest.kt` DTO
- [ ] Create `OnboardingPlanPendingResponse.kt` DTO
- [ ] Create `OnboardingCompleteResponse.kt` DTO
- [ ] Create `OnboardingService.kt`: `createPlanPending(userId, planId)` and `completeOnboarding(userId)` methods
- [ ] Create `OnboardingController.kt`: `POST /api/v1/onboarding/plan-pending` (201) and `POST /api/v1/onboarding/complete` (200); both `@PreAuthorize("hasRole('USER')")`
- [ ] Add `ONBOARDING_NOT_COMPLETE` to `ErrorCode` enum (reserved — not surfaced in this iteration)
- [ ] Update demo seeder: `user_profiles` upsert adds `onboarding_completed_at` (set to a non-null value for all existing QA users so they bypass the gate); `user_memberships` data files handle `PLAN_PENDING` status where applicable

### Frontend phase

- [ ] Add `onboardingCompletedAt: string | null` and `setOnboardingCompletedAt` to `authStore.ts`
- [ ] Create `useBootstrap` hook: on mount when `isAuthenticated`, fetch `GET /api/v1/profile/me`, store `onboardingCompletedAt` in auth store
- [ ] Wire `useBootstrap` into `App.tsx` (or a top-level `AppBootstrap` wrapper)
- [ ] Create `OnboardingRoute.tsx` guard with unauthenticated → `/login` and completed → `/home` redirects
- [ ] Add onboarding gate check to `UserRoute.tsx` and `AuthRoute.tsx`: if `onboardingCompletedAt === null` → redirect to `/onboarding`
- [ ] Add `/onboarding` route in `App.tsx` using `OnboardingRoute`
- [ ] Update `src/types/auth.ts`: `RegisterResponse` becomes an alias for `LoginResponse` (five-field shape)
- [ ] Update `RegisterPage.tsx`: on success store tokens + user, set `onboardingCompletedAt = null`, navigate to `/onboarding`
- [ ] Create `src/types/onboarding.ts` with `StepKey`, `StepDefinition`, `ALL_STEPS`
- [ ] Create `src/api/onboarding.ts` with `submitPlanPending` and `completeOnboarding`
- [ ] Create `src/store/onboardingStore.ts` with full `OnboardingState` shape and persistence
- [ ] Implement `OnboardingPage.tsx` with mount logic: fetch profile, compute resume step, hydrate store
- [ ] Implement `OnboardingShell.tsx`: layout grid (mini nav, progress bar, step rail, content, sticky footer)
- [ ] Implement `MiniNav.tsx`: logo mark only, step eyebrow (e.g. `STEP 02 · YOUR PROFILE · 2 of 6`)
- [ ] Implement `ProgressBar.tsx`: thin 3px green rail, width = (currentStepIndex / totalSteps) * 100%
- [ ] Implement `StepRail.tsx`: numbered `<nav aria-label="Onboarding progress">` with `<ol>`; done steps are clickable buttons; current and future steps are non-interactive; booking row hidden when no plan selected
- [ ] Implement `StickyFooter.tsx`: Back (disabled on welcome), Skip (conditional), Continue/Finish primary button; primary disabled on terms step when required checkboxes not checked
- [ ] Implement `StepWelcome.tsx`: three preview cards, personalised lede
- [ ] Implement `StepProfile.tsx`: four required fields + optional photo upload; inline validation; on Continue call `PUT /api/v1/profile/me` then advance; phone format-as-you-type; client-side 5 MB file size guard; 96×96 circular preview via `URL.createObjectURL`
- [ ] Implement `StepPreferences.tsx`: three chip/pill groups; Skip advances without API call; Continue with selection calls `PUT /api/v1/profile/me` then advances; Continue with no selection acts as Skip
- [ ] Implement `StepMembership.tsx`: fetch plans from `GET /api/v1/membership-plans`; plan cards + "No plan for now"; on Continue with plan selected call `POST /api/v1/onboarding/plan-pending` then advance to booking; on Skip/no-plan advance to terms (skip booking)
- [ ] Implement `StepBooking.tsx` + sub-components `GroupClassList`, `TrainerList`, `TrainerCalendar`: group class from `GET /api/v1/class-schedule`; PT trainers from `GET /api/v1/trainers/pt`; slots from `GET /api/v1/trainers/{id}/pt-availability`; on Continue with selection call appropriate booking API; on Skip/no-selection advance to terms
- [ ] Implement `StepTerms.tsx`: four toggle rows; primary button disabled until both required toggles on; `TermsModal.tsx` for Read links (placeholder copy)
- [ ] Implement `StepDone.tsx`: full-width centered layout; success pulse indicator; summary cards; "Enter GymFlow →" navigates to `/home`; "Review my info" navigates back to profile step (does not re-gate); fire `onboarding_completed` analytics event; on mount call `POST /api/v1/onboarding/complete` and store result
- [ ] Apply design tokens from `colors_and_type.css` throughout: dark surfaces, green primary, Barlow Condensed headlines, Inter body, correct radii
- [ ] Apply responsive breakpoints: < 1024px drop rail; < 720px stack plan cards and footer buttons; < 560px reduce headline size
- [ ] Apply `prefers-reduced-motion` to step transitions and pulse animation

---

## 6. Risks & Notes

### Assumption A1 — Profile PATCH vs PUT

The PRD and ACs reference `PATCH /api/v1/users/me/profile` as the endpoint for step-by-step
profile updates (AC-11, AC-53). The live codebase exposes `PUT /api/v1/profile/me`.

**Decision:** the frontend calls `PUT /api/v1/profile/me`. No new endpoint is added. The
existing `updateMyProfile` in `UserProfileService` already treats each field independently —
passing a subset of fields with the rest as null is semantically equivalent to a PATCH for
this use case. AC-53 is satisfied.

**Implication:** the Profile step must submit all profile fields on Continue, even if some
were not changed in this session. If the user is resuming, the form pre-populates from the
profile response; those pre-populated values are included in the PUT body.

### Assumption A2 — `onboarding_completed_at` column placement

AC-52 specifies the column on `user_profiles`, not `users`. The `user_profiles` table is the
correct location (profile data, not identity data). The `users` entity is not modified.

### Assumption A3 — Age validation currently missing

`UserProfileService.parseDateOfBirth()` validates future dates but not minimum age. The 16-year
check (AC-14) is a new server-side enforcement added in this feature. If existing profiles
contain DOBs younger than 16, they are not retroactively invalidated — only new writes are
checked.

### Assumption A4 — `PLAN_PENDING` status column width

The current `status VARCHAR(10)` and CHECK constraint do not accommodate `PLAN_PENDING`.
V28 migration widens the column to `VARCHAR(20)` and extends the CHECK constraint. The
unique partial index (`WHERE status = 'ACTIVE'`) is unaffected — no migration change
required for the index.

### Assumption A5 — Onboarding gate for TRAINER and ADMIN roles

The gate (redirect to `/onboarding`) applies only to `USER` role routes (wrapped in
`UserRoute`/`AuthRoute`). `TRAINER` and `ADMIN` routes (`TrainerRoute`, `AdminRoute`) are
not gated — those role types bypass onboarding entirely. A newly registered TRAINER or ADMIN
account would not be redirected (PRD Non-Goal: admin or trainer onboarding).

### Assumption A6 — Boot-time profile fetch and loading state

The `useBootstrap` hook introduces a loading phase before the route guards can make gate
decisions. During this phase all authenticated routes render a loading spinner. If the fetch
fails (network error), the app redirects to `/onboarding` as the safe fallback. This means
a transient network failure during boot would incorrectly force a completed user to
`/onboarding`, but `OnboardingRoute` will immediately redirect them to `/home` once they
navigate there (idempotent completion check on the server).

### Assumption A7 — "No plan for now" does not call POST /onboarding/plan-pending

Skipping or selecting "No plan for now" on the Membership step advances without a server
call. Any previously created `PLAN_PENDING` membership is deleted on the server only when
the user selects a new plan (V2 of onboarding flow). In this version, if a user selects a
plan, then goes back and selects "No plan for now", the `PLAN_PENDING` row remains in the
database but `data.selectedPlanId` is null in the store, and `POST /api/v1/onboarding/complete`
is called without a plan. The `PLAN_PENDING` orphan is acceptable as a known limitation —
cleaning it up is deferred to when the payment feature activates pending memberships.

**Mitigation:** `OnboardingService.createPlanPending()` always deletes the previous `PLAN_PENDING`
row before creating a new one, so a user who oscillates between plans never accumulates
multiple pending rows. The orphan case only occurs when they end up at completion with no
plan after having selected one.

### Assumption A8 — Seeder update scope

All existing QA users in `referenceSeeder.ts` must have `onboarding_completed_at` set to a
non-null timestamp so they bypass the gate in E2E tests and demos. This is done in the
seeder's `upsertQaUsersAndProfiles()` function, which already upserts `user_profiles` rows.

### Open question resolved — Trainer availability endpoint

Handoff flag #1 asks whether a specialised onboarding trainer endpoint (`?onboarding=true&limit=3`)
should be used. The PRD Out of Scope section explicitly states: "The PT trainer list in the
Booking step uses the standard `GET /api/v1/trainers/pt` endpoint. A specialised
onboarding-scoped trainer endpoint... is not implemented in this version." The standard
endpoint is used with no additional parameters.

### Open question resolved — Plan pending vs payment routing

Handoff flag #2 is resolved by the PRD: plan selection creates a `PLAN_PENDING` record only.
No routing to a payment page occurs in this feature.
