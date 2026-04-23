# SDD — Onboarding Unified Signup

## 0. Context and References

This SDD is a **delta** on `docs/sdd/onboarding-flow.md` (which is otherwise still
authoritative for the existing onboarding wizard's profile/preferences/membership/
booking/terms/done steps, the `/onboarding` route guard, the `useBootstrap` hook,
the auth store's `onboardingCompletedAt`/`bootstrapLoading` fields, the persisted
`gf:onboarding:v1:{userId}` localStorage key, and the post-onboarding `/home`
landing). This SDD modifies only what the unified-signup feature changes:

- Adds a new step **`credentials`** as wizard step 1 (REQUIRED).
- Repurposes `POST /api/v1/auth/register` to a **combined-payload endpoint**
  that creates the user *and* populates the mandatory profile fields in one
  atomic transaction at `terms`-step submission.
- Removes the `/register` standalone surface from the guest entry path; the
  landing-page CTAs route to `/onboarding`. The `/register` route itself is
  kept only as a permanent redirect to `/onboarding` for legacy bookmarks.
- Adds the `credentials` step's snap-back recovery flow when the late server
  uniqueness check fires.

Reference docs:
- PRD: `docs/prd/onboarding-unified-signup.md`
- Brief: `docs/briefs/onboarding-unified-signup.md`
- Handoff: `docs/design-system/handoffs/onboarding-unified-signup/README.md`
- Existing SDD this delta extends: `docs/sdd/onboarding-flow.md`
- Existing PRD context: `docs/prd/onboarding-flow.md`
- Design system: `docs/design-system/README.md`,
  `docs/design-system/colors_and_type.css`
- Date: 2026-04-23

---

## 1. Database Changes

**No new migrations.** The live schema, confirmed via the postgres MCP query
against `public.users` and `public.user_profiles`, already supports every field
this feature needs:

| Table | Column | Type | Notes |
|---|---|---|---|
| `users` | `email` | `varchar(255)` NOT NULL, **unique index `uq_users_email`** | `EMAIL_ALREADY_EXISTS` race protection already enforced at the DB layer |
| `users` | `password_hash` | `varchar(72)` NOT NULL | bcrypt 60-char hash + headroom |
| `users` | `role` | `varchar(10)` NOT NULL DEFAULT `'USER'` | unchanged |
| `user_profiles` | `user_id` | uuid NOT NULL (PK, FK → `users.id`) | created in same TX as `users` |
| `user_profiles` | `first_name` / `last_name` | `varchar(50)` NULL | populated in the combined-payload register call |
| `user_profiles` | `phone` | `varchar(20)` NULL | populated in the combined-payload register call |
| `user_profiles` | `date_of_birth` | `date` NULL | populated in the combined-payload register call |
| `user_profiles` | `onboarding_completed_at` | `timestamptz` NULL | already added by V27 (onboarding-flow); set by `POST /api/v1/onboarding/complete` (unchanged) |

**No `users` row exists for a guest until `POST /api/v1/auth/register` is called
with the combined payload at `terms`-step submission.** This is the reason the
feature does not need a "soft user" / "draft user" table — the deferral is
enforced by simply not calling the endpoint until `terms`. (See §6 Decision 5
for why.)

The `users.email` unique index is the **race-safe enforcement point** for
`EMAIL_ALREADY_EXISTS`. Per kotlin-conventions §"Unique Constraints", the
service uses the two-layer guard (existsBy pre-check + DataIntegrityViolationException
catch) — but no schema change is required because the unique index is already
in place.

---

## 2. API Contracts

### 2.1 Modified: `POST /api/v1/auth/register` — combined registration

The existing endpoint's request body is replaced with a combined-payload shape
that creates the `users` row, the `user_profiles` row, and the bound profile
fields in a single transaction. This is permitted by the brief: *"the
`POST /auth/register` contract is **not fixed** — it should be adjusted to match
the unified wizard's submission shape (e.g. credentials + mandatory profile
fields in one payload) rather than forcing the frontend to match the legacy
contract."*

**Auth:** none (public)

**Request body** (`RegisterRequest` — see §3.1):
```json
{
  "email": "jane@example.com",
  "password": "Hunter2!!",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+15555550100",
  "dateOfBirth": "1992-04-17",
  "agreeTerms": true,
  "agreeWaiver": true
}
```

**Success — 201 Created** (`LoginResponse` — unchanged shape):
```json
{
  "accessToken": "eyJ…",
  "refreshToken": "9f3c…",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "hasActiveMembership": false
}
```

The response does **not** include the populated profile object. The frontend
already calls `GET /api/v1/profile/me` in the `useBootstrap` hook immediately
after `setTokens(...)` runs, so a follow-up profile fetch happens for free.
Returning the profile inline would duplicate that load and require a parallel
DTO change. (See §6 Decision 2.)

**Side-effects on success — all in one `@Transactional` method:**
1. `users` row inserted with bcrypt-hashed password and `role = "USER"`.
2. `user_profiles` row inserted with `user_id`, `first_name`, `last_name`,
   `phone`, `date_of_birth` populated from the request, `onboarding_completed_at = NULL`,
   empty JSON arrays for `fitness_goals` and `preferred_class_types`.
3. `refresh_tokens` row inserted (existing `generateRefreshTokenPair()` flow).
4. Tokens returned so the frontend can authenticate immediately.

The `agreeTerms` and `agreeWaiver` fields are **validated only** — both must be
`true`. They are not persisted (no consent table exists yet; capturing consent
records is out of scope per PRD non-goals). The fields exist in the request to
make the contract honest about what the wizard collects at the same submission
point. (See §6 Decision 3.)

**Errors:**

| HTTP | code | When | AC mapping |
|------|------|------|------------|
| 400 | `VALIDATION_ERROR` | any bean-validation failure not mapped to a feature-specific code below | AC-02 (input rules) |
| 400 | `INVALID_FIRST_NAME` | `firstName` blank or > 50 chars | AC-02, onboarding-flow AC-13 |
| 400 | `INVALID_LAST_NAME` | `lastName` blank or > 50 chars | AC-02, onboarding-flow AC-13 |
| 400 | `INVALID_PHONE` | `phone` does not match E.164 or is too long | AC-02, onboarding-flow AC-13 |
| 400 | `INVALID_DATE_OF_BIRTH` | `dateOfBirth` parse failure, future date, or under 16 | AC-02, onboarding-flow AC-13/AC-14 |
| 400 | `VALIDATION_ERROR` | `agreeTerms != true` or `agreeWaiver != true` (bean validation `@AssertTrue`) | onboarding-flow AC-44 |
| 409 | `EMAIL_ALREADY_EXISTS` | another active `users` row with this email | **AC-03** (late uniqueness) |

`INVALID_EMAIL` and `INVALID_PASSWORD` are **not separate codes** — the existing
`@field:Email` and `@field:Size(min=8, max=15)` annotations on `RegisterRequest`
are caught by `MethodArgumentNotValidException` and surfaced as
`VALIDATION_ERROR` with the field name in the human-readable message (existing
behaviour, see `GlobalExceptionHandler.handleValidationException`). The
frontend's per-field error parsing (`parseValidationErrors` already in
`RegisterPage.tsx`) maps `email: …` and `password: …` segments back to the
`CredentialsStep` form. (See §6 Decision 4.)

### 2.2 Removed: separate `POST /auth/check-email` upfront pre-check

**Decision: Option B — late check only.** No new endpoint is added.

Rationale (Lesson 4 — UX intent over majority vote):
- The PRD's "user sees error on the signup step" wording (AC-03) is satisfied
  by the snap-back UX in the handoff: when the late `409 EMAIL_ALREADY_EXISTS`
  fires at `terms` submission, the wizard immediately navigates back to the
  credentials step and shows the persistent error banner above the email
  field. From the user's point of view, the error is "on the signup step".
- An upfront `POST /auth/check-email` pre-check would create a meaningful
  email-enumeration vector (any form on the public landing page becomes a
  membership oracle), would require a new endpoint with rate-limit
  considerations, and would still need the late check as defence-in-depth
  because two guests could pass it concurrently.
- The late-check-only path is also more honest: the only authoritative
  uniqueness signal is the DB unique index, which can only be tested by
  attempting an insert. Any pre-check is a soft hint that can race.

The handoff explicitly endorses this UX (`Late-error recovery` section,
"snap back to the credentials step with a persistent error banner"). See §6
Decision 6.

### 2.3 Deprecation: legacy `POST /auth/register` body shape

The legacy two-field body `{ email, password }` is **removed**. Any client
calling the old shape will receive a 400 `VALIDATION_ERROR` for the now-required
`firstName` / `lastName` / `phone` / `dateOfBirth` / `agreeTerms` / `agreeWaiver`
fields.

**Callers in the codebase:**
- `frontend/src/api/auth.ts` → `register()` — **updated** in §4.3 to send the
  combined payload; only invoked from the wizard's `terms`-step submission
  handler.
- `frontend/src/pages/auth/RegisterPage.tsx` — **deleted** as a routable page
  (see §4.1; the file may stay only if needed to keep `RegisterPage.test.tsx`
  green; the orchestrator may delete both together).

There are no external consumers of the public API at this point. The breaking
change is acceptable.

### 2.4 Unchanged endpoints

Everything else from `docs/sdd/onboarding-flow.md` §2 is unchanged:

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/profile/me` | Bootstrap fetch (`useBootstrap`); returns `onboardingCompletedAt`. |
| `PUT /api/v1/profile/me` | Already-written endpoint used by `StepProfile`. **Note:** with the new combined-payload register, the profile fields are already populated when `StepProfile` mounts; the `StepProfile` handler still calls `PUT /profile/me` to allow the user to **edit** them, which is the existing wizard's documented behaviour. |
| `POST /api/v1/onboarding/plan-pending` | Unchanged. |
| `POST /api/v1/onboarding/complete` | Unchanged. |

---

## 3. Backend

### 3.1 Entities and DTOs

**Entities:** no entity changes. `User` and `UserProfile` already match what
the combined-payload register needs.

**Modified DTO — `backend/src/main/kotlin/com/gymflow/dto/RegisterRequest.kt`:**

```kotlin
package com.gymflow.dto

import jakarta.validation.constraints.AssertTrue
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size

data class RegisterRequest(
    @field:Email(message = "Invalid email format")
    @field:NotBlank
    @field:Size(max = 255)
    val email: String,

    @field:Size(min = 8, max = 15, message = "Password must be between 8 and 15 characters")
    @field:NotBlank
    val password: String,

    @field:NotBlank(message = "First name is required")
    @field:Size(max = 50, message = "First name must be 50 characters or fewer")
    val firstName: String,

    @field:NotBlank(message = "Last name is required")
    @field:Size(max = 50, message = "Last name must be 50 characters or fewer")
    val lastName: String,

    @field:NotBlank(message = "Phone is required")
    @field:Size(max = 20, message = "Phone must be 20 characters or fewer")
    val phone: String,

    @field:NotBlank(message = "Date of birth is required")
    val dateOfBirth: String,  // ISO-8601 yyyy-MM-dd; parsed and validated in service

    @field:NotNull
    @field:AssertTrue(message = "You must agree to the terms of use")
    val agreeTerms: Boolean,

    @field:NotNull
    @field:AssertTrue(message = "You must acknowledge the health and liability waiver")
    val agreeWaiver: Boolean,
)
```

**Response DTO — unchanged:** `LoginResponse` is reused verbatim
(`accessToken`, `refreshToken`, `tokenType`, `expiresIn`, `hasActiveMembership`).
For a freshly-registered user, `hasActiveMembership = false` always.

### 3.2 Service layer changes

**`AuthService.register()` — replace signature and body:**

```kotlin
@Transactional
fun register(request: RegisterRequest): LoginResponse {
    // Layer 1: app-level pre-check (fast common path, surfaces friendly message)
    if (userRepository.findByEmailAndDeletedAtIsNull(request.email) != null) {
        throw EmailAlreadyExistsException("An account with email '${request.email}' already exists")
    }

    // Validate + normalise mandatory profile fields BEFORE any insert so a bad
    // payload returns 400 without leaving a half-written transaction.
    val firstName = userProfileService.normalizeRequiredFirstName(request.firstName)
    val lastName  = userProfileService.normalizeRequiredLastName(request.lastName)
    val phone     = userProfileService.normalizeRequiredPhone(request.phone)
    val dob       = userProfileService.parseRequiredDateOfBirth(request.dateOfBirth)

    val user = User(
        email = request.email,
        passwordHash = passwordEncoder.encode(request.password),
        role = "USER",
    )

    val saved = try {
        userRepository.save(user)
    } catch (e: DataIntegrityViolationException) {
        // Layer 2: race-safe DB-level guard (kotlin-conventions §"Unique Constraints")
        throw EmailAlreadyExistsException("An account with email '${request.email}' already exists")
    }

    val profile = UserProfile(
        userId = saved.id,
        firstName = firstName,
        lastName = lastName,
        phone = phone,
        dateOfBirth = dob,
        // fitnessGoals / preferredClassTypes default to empty MutableList in the entity
    )
    userProfileRepository.save(profile)

    val accessToken = jwtService.generateToken(saved)
    val (rawRefreshToken, tokenHash) = generateRefreshTokenPair()

    refreshTokenRepository.save(
        RefreshToken(
            userId = saved.id,
            tokenHash = tokenHash,
            expiresAt = OffsetDateTime.now().plusDays(refreshTokenExpiryDays),
        )
    )

    return LoginResponse(
        accessToken = accessToken,
        refreshToken = rawRefreshToken,
        expiresIn = jwtService.getExpiresInSeconds(),
        hasActiveMembership = false,
    )
}
```

The constructor argument list of `AuthService` gains a `userProfileService:
UserProfileService` dependency (already a Spring bean) so the validation and
normalisation logic stays in one place. The existing `userProfileRepository`
dependency is reused.

**`UserProfileService` — extract normalisation helpers as `internal` (or
`public`) so `AuthService` can call them without going through `updateMyProfile`:**

```kotlin
// New public methods on UserProfileService — pure validation + normalisation,
// no repository writes. They throw the same exception types the existing
// updateMyProfile path throws, so GlobalExceptionHandler maps them to the same
// error codes (INVALID_FIRST_NAME, INVALID_LAST_NAME, INVALID_PHONE,
// INVALID_DATE_OF_BIRTH).

fun normalizeRequiredFirstName(value: String): String =
    normalizeOptionalName(value) { InvalidFirstNameException("First name is invalid") }
        ?: throw InvalidFirstNameException("First name is required")

fun normalizeRequiredLastName(value: String): String =
    normalizeOptionalName(value) { InvalidLastNameException("Last name is invalid") }
        ?: throw InvalidLastNameException("Last name is required")

fun normalizeRequiredPhone(value: String): String =
    normalizePhone(value) ?: throw InvalidPhoneException("Phone is required")

fun parseRequiredDateOfBirth(value: String): LocalDate =
    parseDateOfBirth(value) ?: throw InvalidDateOfBirthException("Date of birth is required")
```

The existing private `normalizeOptionalName`, `normalizePhone`, and
`parseDateOfBirth` helpers are promoted to package-private (`internal`) so the
new public wrappers above can call them. Their behaviour (16-year minimum age
check, E.164 phone regex, length caps) is unchanged.

### 3.3 Controller layer changes

**`AuthController.register()`:**

```kotlin
@PostMapping("/register")
fun register(@Valid @RequestBody request: RegisterRequest): ResponseEntity<LoginResponse> {
    val response = authService.register(request)
    return ResponseEntity.status(HttpStatus.CREATED).body(response)
}
```

The signature changes: the controller now passes the whole `RegisterRequest`
to the service rather than `(email, password)`. No other auth endpoints change.

### 3.4 Validation rules

| Field | Rule | Error code |
|---|---|---|
| `email` | `@Email` + `@NotBlank` + `@Size(max=255)` | `VALIDATION_ERROR` (with field-tagged message) |
| `password` | `@NotBlank` + `@Size(min=8, max=15)` | `VALIDATION_ERROR` (with field-tagged message) |
| `firstName` | `@NotBlank` + `@Size(max=50)` then service normalisation | `VALIDATION_ERROR` (annotation), `INVALID_FIRST_NAME` (service) |
| `lastName` | `@NotBlank` + `@Size(max=50)` then service normalisation | `VALIDATION_ERROR`, `INVALID_LAST_NAME` |
| `phone` | `@NotBlank` + `@Size(max=20)` then E.164 regex `^\+[1-9]\d{7,19}$` | `VALIDATION_ERROR`, `INVALID_PHONE` |
| `dateOfBirth` | `@NotBlank` then ISO parse + future-date check + 16-year minimum | `VALIDATION_ERROR`, `INVALID_DATE_OF_BIRTH` |
| `agreeTerms` | `@NotNull` + `@AssertTrue` | `VALIDATION_ERROR` |
| `agreeWaiver` | `@NotNull` + `@AssertTrue` | `VALIDATION_ERROR` |
| email uniqueness | app-level `existsBy…` + `DataIntegrityViolationException` catch | `EMAIL_ALREADY_EXISTS` (HTTP 409) |

### 3.5 Error mapping

| Code | HTTP | Source | AC |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | `MethodArgumentNotValidException` (existing handler) | AC-02 |
| `INVALID_FIRST_NAME` | 400 | `InvalidFirstNameException` (existing) | AC-02 (mandatory profile) |
| `INVALID_LAST_NAME` | 400 | `InvalidLastNameException` (existing) | AC-02 |
| `INVALID_PHONE` | 400 | `InvalidPhoneException` (existing) | AC-02 |
| `INVALID_DATE_OF_BIRTH` | 400 | `InvalidDateOfBirthException` (existing) | AC-02 |
| `EMAIL_ALREADY_EXISTS` | 409 | `EmailAlreadyExistsException` (existing) | **AC-03**, AC-05 (defence-in-depth at TX commit) |

No new error codes are added to `domain/ErrorCode.kt`. All required codes are
already defined; their handlers in `GlobalExceptionHandler` already exist.

---

## 4. Frontend

### 4.1 Routes

**Routes table after this change (`frontend/src/App.tsx`):**

| Path | Element | Guard | Notes |
|---|---|---|---|
| `/` | `PulseLandingPage` | none | Landing-page CTAs ("Join GymFlow", "Start 7-day trial →") all link to `/onboarding` (see §4.4). |
| `/onboarding` | `OnboardingPage` | `OnboardingRoute` | Now also accepts the **unauthenticated** guest case — see "Guard change" below. |
| `/register` | `<Navigate to="/onboarding" replace />` | none | Permanent redirect for legacy bookmarks and external links. **Resolves handoff Open Question 1.** The standalone `RegisterPage` is no longer rendered for any guest path. |
| `/login` | `LoginPage` | none | Unchanged. |
| All other authed routes (`/home`, `/profile`, etc.) | unchanged | unchanged | unchanged |

**`OnboardingRoute` guard change (Lesson 11 — loading state for async gate):**

The existing guard at `frontend/src/components/layout/OnboardingRoute.tsx`
currently redirects unauthenticated visitors to `/login`. That contradicts AC-01
("Sign up CTA goes straight to the wizard"). Update the guard:

```tsx
// frontend/src/components/layout/OnboardingRoute.tsx
export function OnboardingRoute({ children }: OnboardingRouteProps) {
  const { isAuthenticated, onboardingCompletedAt, bootstrapLoading } = useAuthStore()
  const currentStep = useOnboardingStore(s => s.currentStep)

  // Wait for bootstrap fetch to resolve before deciding (Lesson 11)
  // Only matters when isAuthenticated is true; for guests bootstrap never runs.
  if (isAuthenticated && bootstrapLoading) return <BootstrapSpinner />

  // Guest path: render the wizard. The wizard will start at the credentials
  // step (default for an unauthenticated visitor — see §4.2).
  if (!isAuthenticated) return <>{children}</>

  // Authenticated user with completed onboarding -> /home
  // (existing exception for currentStep === 'done' is preserved)
  if (onboardingCompletedAt !== null && currentStep !== 'done') {
    return <Navigate to="/home" replace />
  }

  return <>{children}</>
}
```

Delete the `if (!isAuthenticated) return <Navigate to="/login" replace />` line.
Keep the bootstrap spinner branch — it must continue to gate authenticated-but-
unbootstrapped state to avoid the flash documented in Lesson 11.

**`AuthRoute` and `UserRoute` guards:** **unchanged.** These guard authenticated
member routes. A guest who has never registered cannot have an auth token, so
they will continue to be redirected from `/home`/`/profile`/etc. to `/login` —
which is correct. The wizard at `/onboarding` is the only public-but-stateful
surface.

**Loading states (Lesson 11 explicit checklist):**
- Authenticated bootstrap → `BootstrapSpinner` (existing).
- The combined `POST /auth/register` request fired from the `terms` step is
  in-flight → `StickyFooter` "Continue" button shows the existing
  `continueLoading` spinner. No additional spinner is added; the wizard layout
  stays mounted so the snap-back navigation can run on error without remounting.
- During the snap-back step transition the existing `animate-fadeSlideIn`
  motion plays (200ms, suppressed under `prefers-reduced-motion`).

### 4.2 State (Zustand store)

**`OnboardingState` extensions** (`frontend/src/store/onboardingStore.ts`):

```ts
export interface OnboardingState {
  // ─── New for unified-signup ─────────────────────────────────
  email: string                         // collected at credentials step
  password: string                      // collected at credentials step; CLEARED on success
  credentialsLateError: string | null   // null when clear; set to a banner-message
                                        // string when terms-submission returned EMAIL_ALREADY_EXISTS

  // ─── Existing fields — unchanged ────────────────────────────
  currentStep: StepKey                  // 'credentials' is now the new default
  firstName: string
  lastName: string
  phone: string
  dob: string
  goals: string[]
  classTypes: string[]
  frequency: string
  selectedPlanId: string | null
  selectedPlanName: string | null
  selectedPlanPriceInCents: number | null
  pendingMembershipId: string | null
  bookingMode: 'class' | 'trainer'
  selectedClassInstanceId: string | null
  selectedTrainerId: string | null
  selectedTrainerSlot: string | null
  completedBookingId: string | null
  agreeTerms: boolean
  agreeWaiver: boolean
  notifBooking: boolean
  notifNews: boolean

  // ─── New actions ────────────────────────────────────────────
  setCredentials: (email: string, password: string) => void
  clearPassword: () => void                            // wipes password from store + persisted localStorage
  setCredentialsLateError: (message: string | null) => void

  // ─── Existing actions — unchanged ───────────────────────────
  setStep, setProfileFields, setPreferences, setPlan,
  setPendingMembership, setBookingSelection, setCompletedBooking,
  setTerms, reset
}
```

**`defaultState` change:** `currentStep` defaults to `'credentials'` (was
`'welcome'`). The `welcome` step is removed from `ALL_STEPS` (it never appeared
in the unified-signup handoff; the credentials step is step 1) — see
`frontend/src/types/onboarding.ts` change below.

**Persistence (localStorage) schema:**

Key: `gf:onboarding:v1:{userId}` for authenticated users; `gf:onboarding:v1:anonymous`
for guests during the wizard. The existing lazy storage adapter
(`lazyStorageEngine` in `onboardingStore.ts`) already keys per-user and falls
back to `'anonymous'` when no auth user is present, so this works without
adapter changes.

Persisted fields: same as today **plus** `email` and `password` and
`credentialsLateError`. Note: persisting the password to localStorage during
the wizard is a deliberate trade-off — the alternative (in-memory only) would
mean a guest who refreshes mid-wizard loses their credentials and has to start
from step 1.

**Password lifecycle:**

1. **On credentials-step submit:** `setCredentials(email, password)` writes
   both into the store, persisted to `gf:onboarding:v1:anonymous`.
2. **Across step navigation:** the password remains in the store / localStorage
   so the eventual `terms`-step submission can include it.
3. **On `terms`-step submission success:** the store calls `clearPassword()`
   *before* `setOnboardingCompletedAt(...)` is set and *before*
   `setStep('done')` runs. `clearPassword()` sets `password: ''` in the store
   (which Zustand's `persist` middleware will then write through to
   localStorage with the field empty). It also writes the now-authenticated
   user's UUID through, so the persisted entry rotates from
   `gf:onboarding:v1:anonymous` to `gf:onboarding:v1:{newUserId}` — the
   anonymous entry is then explicitly removed via
   `localStorage.removeItem('gf:onboarding:v1:anonymous')` in the same handler.
4. **On returning visit days later:** when the page boots and there is no auth
   token, the lazy storage adapter reads from `gf:onboarding:v1:anonymous`
   — the password may still be there. To bound the exposure window, on
   `OnboardingPage` mount, when `isAuthenticated === false`, we check the
   persisted timestamp (a new `lastTouchedAt: number | null` field added to
   the persisted shape, set on every `setCredentials` and `clearPassword`
   call). If `Date.now() - lastTouchedAt > 24 * 60 * 60 * 1000` (24h), the
   password (and only the password) is cleared from the store and
   localStorage on bootstrap. The email and any other pre-typed fields
   stay so the user does not feel like the form was wiped. (See §6
   Decision 7.)
5. **On `clearAuth()` (logout):** the auth store already clears tokens; the
   anonymous onboarding entry is independent of the user-keyed entry, so no
   extra wiring is needed. A subsequent guest visit gets a clean
   `gf:onboarding:v1:anonymous` (key is created on first write).

**`credentialsLateError` lifecycle:**

1. Set to a string message inside the `terms`-step submission handler when the
   server returns `409 EMAIL_ALREADY_EXISTS`. The handler also calls
   `setStep('credentials')` immediately afterward (the snap-back).
2. Cleared (`setCredentialsLateError(null)`) on the **first `onChange` of the
   email input** in `CredentialsStep`. This matches the handoff: "the banner
   persists until the user modifies the email field."
3. Excluded from the persisted shape (`partialize`-style filter on the
   `persist` middleware), so it never re-surfaces on a page refresh.

### 4.3 API layer

**`frontend/src/api/auth.ts` — `register()` signature change:**

```ts
import axiosInstance from './axiosInstance'
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  RefreshRequest,
} from '../types/auth'

export async function register(req: RegisterRequest): Promise<RegisterResponse> {
  const response = await axiosInstance.post<RegisterResponse>('/auth/register', req)
  return response.data
}

// login, refreshTokens, logout — unchanged
```

**`frontend/src/types/auth.ts` — `RegisterRequest` change:**

```ts
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;       // E.164 (e.g. '+15555550100')
  dateOfBirth: string; // 'YYYY-MM-DD'
  agreeTerms: boolean;
  agreeWaiver: boolean;
}

// RegisterResponse remains an alias for LoginResponse — no shape change
export type RegisterResponse = LoginResponse;
```

**Error handling on the new combined call** is centralised in the
`OnboardingShell` `terms`-step `case` (see §4.4). Error code branches:

| Server response | Frontend reaction |
|---|---|
| 201 (success) | Store tokens + user, set `onboardingCompletedAt = null`, call `clearPassword()`, navigate `setStep('done')`. Then `StepDone`'s existing `useEffect` calls `POST /onboarding/complete` and the existing `useBootstrap` triggers `GET /profile/me`. |
| 409 `EMAIL_ALREADY_EXISTS` | `setCredentialsLateError("This email is already registered. Enter a different email address to continue.")`, then `setStep('credentials')`. The credentials step receives the banner via the store and pre-errors the email field. |
| 400 `INVALID_FIRST_NAME` / `INVALID_LAST_NAME` / `INVALID_PHONE` / `INVALID_DATE_OF_BIRTH` | Should not occur in normal flow — the wizard pre-validates client-side and `StepProfile.submit()` already calls `PUT /profile/me` to surface these BEFORE the user reaches `terms`. Treat as a defensive case: show an inline error on the `terms` step ("`{message}`. Please go back and check your profile.") and **do not snap-back** (would lose the user's place). The existing `setTermsError` mechanism in `OnboardingShell.handleContinue` is reused. |
| 400 `VALIDATION_ERROR` | Show the message in the existing `termsError` slot ("Unable to complete onboarding. Please try again.") with the parsed message. |
| Network / 5xx | Same as today's `try/catch` in `OnboardingShell.handleContinue` for the `terms` case — `setTermsError('Unable to complete onboarding. Please try again.')`. |

### 4.4 Components and pages

**New / changed files:**

| File | Status | Change |
|---|---|---|
| `frontend/src/components/onboarding/steps/StepCredentials.tsx` | **new** | Bespoke credentials step content per the handoff §1. Two fields (email + password) using the existing `PasswordInput` component for show/hide toggle; the email input is built inline (the handoff explicitly says **do not** import `AuthForm` wholesale). Uses `useImperativeHandle` to expose a `submit(): Promise<boolean>` handle following the same pattern as `StepProfile` etc. The submit handler validates email format and password length client-side; if valid, calls `store.setCredentials(email, password)` and returns `true`. The component subscribes to `store.credentialsLateError`; when non-null it renders the persistent error banner above the email field per the handoff snap-back UX, and on the email input's first `onChange` it calls `store.setCredentialsLateError(null)`. |
| `frontend/src/components/onboarding/OnboardingShell.tsx` | **modified** | (1) Import `StepCredentials` and add a `credentialsRef: useRef<StepCredentialsHandle>(null)`. (2) Wire the new ref through `StepContent`. (3) In `handleContinue`'s switch, add the first case `case 'credentials': { const ok = await credentialsRef.current?.submit(); if (ok) advance(); break; }` BEFORE the `welcome` case. (4) Replace the `terms` case body with the new combined-payload submission described below. (5) Remove the `welcome` case (the `welcome` step is gone). |
| `frontend/src/components/onboarding/OnboardingShell.tsx` — `terms` case | **modified** | At `terms`-step submission: build a `RegisterRequest` from `{store.email, store.password, store.firstName, store.lastName, toE164(store.phone), store.dob, store.agreeTerms, store.agreeWaiver}`, `await register(req)`, on success `setTokens`/`setUser`/`setOnboardingCompletedAt(null)`/`clearPassword()`/`setStep('done')`. On `EMAIL_ALREADY_EXISTS` set the late-error and snap back to `credentials`. The existing `completeOnboarding()` call moves into `StepDone`'s mount effect (it is already there per the existing onboarding-flow SDD § 4.3 — keep it; the order is: register at terms → tokens stored → setStep('done') → StepDone mount → POST /onboarding/complete). |
| `frontend/src/types/onboarding.ts` | **modified** | Replace `'welcome'` with `'credentials'` at the head of `StepKey` and `ALL_STEPS`. Add `{ key: 'credentials', label: 'Your account', sublabel: 'REQUIRED', required: true, conditional: false }` as the first element. Do **not** add a separate `welcome` entry — the welcome screen is removed for the unified flow per the handoff (which explicitly numbers `STEP 01` as `YOUR ACCOUNT`). The existing 6 entries shift down by one; the rail thus has 6 visible rows + done (or 5 + done when no plan is selected). |
| `frontend/src/store/onboardingStore.ts` | **modified** | Add `email`/`password`/`credentialsLateError`/`lastTouchedAt` fields and the actions described in §4.2. Default `currentStep` to `'credentials'`. Update `partialize` to exclude `credentialsLateError`. Implement `clearPassword()` to call `set({ password: '' })` then explicitly `localStorage.removeItem('gf:onboarding:v1:anonymous')` when the user is now authenticated. |
| `frontend/src/components/onboarding/MiniNav.tsx` | **modified** | Step labels table updates: `credentials → 'STEP 01 · ACCOUNT'`, `profile → 'STEP 02 · PROFILE'`, `preferences → 'STEP 03 · PREFS'`, `membership → 'STEP 04 · MEMBERSHIP'`, `booking → 'STEP 05 · BOOKING'`, `terms → 'STEP 06 · FINAL CHECK'`. The fraction `N of M` already computes from `visibleSteps`. |
| `frontend/src/components/onboarding/StepRail.tsx` | **modified** | Pulls labels from `ALL_STEPS` already; the change in `types/onboarding.ts` propagates automatically. Verify in implementation that the rail does NOT special-case `welcome`. |
| `frontend/src/pages/onboarding/OnboardingPage.tsx` | **modified** | Update `computeResumeStep`: If `currentStep === 'done'` (the wizard just completed and may have remounted via the bootstrap spinner), early-return `'done'` to prevent the resume logic from overriding it. Then: a brand-new visitor (no `email` in store, no `firstName`) returns `'credentials'`. If `email` is set but `password` is empty (authentication just succeeded but the wizard remounted) AND user is authenticated AND profile says `firstName` is set, jump to wherever the resume logic decides (`profile` / `membership` / `terms`). For unauthenticated visitors the bootstrap profile fetch is skipped (no token); only the localStorage state drives resume. Also: on mount, if guest is unauthenticated and `Date.now() - lastTouchedAt > 24h`, clear the password per §4.2 step 4. |
| `frontend/src/components/landing/PulseNav.tsx` | **modified** | Replace both `to="/register"` with `to="/onboarding"` (lines 53 and 99). |
| `frontend/src/components/landing/HeroLoggedOut.tsx` | **modified** | Replace `to="/register"` with `to="/onboarding"` (line 34). |
| `frontend/src/App.tsx` | **modified** | Replace `<Route path="/register" element={<RegisterPage />} />` with `<Route path="/register" element={<Navigate to="/onboarding" replace />} />`. Remove the `RegisterPage` import. |
| `frontend/src/pages/auth/RegisterPage.tsx` | **deleted** | No longer routable. The standalone register surface is retired (PRD AC-01, AC-06). |
| `frontend/src/pages/auth/__tests__/RegisterPage.test.tsx` | **deleted** | Test file for the deleted page. (The orchestrator may instead retain a minimal placeholder test for the redirect behaviour at `/register`. State of choice: delete; if any unit test infrastructure depends on this file's import path, fall back to a minimal redirect test.) |
| `frontend/src/components/onboarding/steps/StepWelcome.tsx` | **deleted** | The welcome step is removed in the unified flow per the handoff. |

**Removal of "back to login" affordances (PRD AC-06):**

A grep of `frontend/src/components/onboarding/` shows no existing "back to
login" link in the wizard chrome. Reaffirm the prohibition in code review:
neither `OnboardingShell`, `MiniNav`, `StickyFooter`, nor any step component
may add a `Link to="/login"`. The only affordance for an existing user to log
in is to navigate manually to `/login`.

### 4.5 Error mapping

`frontend/src/utils/errorMessages.ts` — add a new exported map and helper:

```ts
export const REGISTER_ERROR_MESSAGES: Record<string, string> = {
  EMAIL_ALREADY_EXISTS: 'This email is already registered. Enter a different email address to continue.',
  INVALID_FIRST_NAME: 'First name is invalid. Go back and check your profile.',
  INVALID_LAST_NAME: 'Last name is invalid. Go back and check your profile.',
  INVALID_PHONE: 'Phone number is invalid. Go back and check your profile.',
  INVALID_DATE_OF_BIRTH: 'Date of birth is invalid. Go back and check your profile.',
  VALIDATION_ERROR: 'Some details are invalid. Please check the form and try again.',
}

export function getRegisterErrorMessage(code?: string, fallback?: string): string {
  if (!code) return fallback ?? 'Something went wrong. Please try again.'
  return REGISTER_ERROR_MESSAGES[code] ?? fallback ?? 'Something went wrong. Please try again.'
}
```

The `OnboardingShell.handleContinue` `terms` case uses `getRegisterErrorMessage`.
Only the `EMAIL_ALREADY_EXISTS` message is shown via the snap-back banner; the
others are surfaced through the existing `termsError` slot at the bottom of
`StepTerms` (`externalError` prop).

---

## 5. Testing

### 5.1 Backend unit tests

Add new tests under `backend/src/test/kotlin/com/gymflow/service/AuthServiceTest.kt`
(or a new `AuthServiceRegisterTest.kt`) — keep tests focused on
`register(RegisterRequest)`:

- `register_persistsUserAndProfile_whenAllFieldsValid` — assert one `users`
  row, one `user_profiles` row with `firstName`/`lastName`/`phone`/`dateOfBirth`
  populated, one `refresh_tokens` row, and a `LoginResponse` with both tokens.
- `register_throwsEmailAlreadyExistsException_whenAppLevelPreCheckHits` — seed
  a user, attempt a second register with the same email, expect 409.
- `register_throwsEmailAlreadyExistsException_whenDataIntegrityViolationCaught`
  — mock `userRepository.save` to throw `DataIntegrityViolationException`
  (simulating a race between pre-check and insert), expect 409. Defence-in-depth.
- `register_throwsInvalidDateOfBirthException_whenUserUnder16` — assert 400.
- `register_throwsInvalidPhoneException_whenPhoneMalformed` — assert 400 with
  a non-E.164 phone.
- `register_validationErrorWhenAgreeTermsFalse` — verified at controller level
  via `@AssertTrue`; assert via a `WebMvcTest`-style controller test.
- Existing `register` tests that call `register(email, password)` — **update or
  delete** to call the new signature. Where a test exists only to assert the
  old two-field path, delete it.

### 5.2 E2E happy path scenario

Replace the existing `e2e/specs/onboarding-happy-path.spec.ts` with a new
single-scenario spec that drives the unified flow. (Or fold the change into a
new file `e2e/specs/onboarding-unified-signup-happy-path.spec.ts` and delete
the old one — the orchestrator decides.)

Scope (one happy path, per CLAUDE.md testing rules):

```
1. Visit /
2. Click "Join GymFlow" CTA in nav (or "Start 7-day trial →" hero CTA)
3. Expect URL /onboarding
4. Step 1 — Credentials:
   - Fill email = `u-${randomUUID().slice(0,8)}@test.gympulse.local`
   - Fill password = 'Test1234!'
   - Click Continue
5. Step 2 — Profile:
   - Fill firstName, lastName, phone, dob (dob >= today - 16y)
   - Click Continue
6. Step 3 — Preferences: click Skip
7. Step 4 — Membership: click "No plan for now" or Skip
8. Step 5 — Booking: skipped (no plan selected → step is hidden)
9. Step 6 — Terms:
   - Toggle the two required checkboxes
   - Click "Finish onboarding →"
   - Wait for the network response on POST /api/v1/auth/register (201)
10. Expect Done screen visible
11. Click "Enter GymFlow →"
12. Expect URL /home
```

The spec uses `await page.waitForResponse(r => r.url().endsWith('/auth/register') && r.status() === 201)`
on step 9 to confirm the late account creation actually happened (proving AC-05).

No additional error-permutation tests are added (testing rules: one happy path
per feature). The snap-back UX, while important, is exercised by manual QA and
backend unit tests for the 409 path — not by E2E.

---

## 6. Decisions and Trade-offs

1. **Endpoint shape — combined vs split.** **Decision: replace
   `POST /auth/register` body with a combined payload (credentials + mandatory
   profile + terms acks) returning `LoginResponse`.** Rationale: the brief
   permits replacing the contract; the combined path is atomic (one TX,
   `users` + `user_profiles` populated together — satisfies AC-05 with no
   half-state); a separate `register-with-profile` endpoint would leave the
   legacy `register` as orphaned dead code. Two-call alternatives (create
   user, then PATCH profile) would require partial-failure handling on the
   client and could leave the user in a state where `users` exists but
   `user_profiles` is empty — the very state AC-05 forbids being created.

2. **DTOs fully specified.** Defined in §3.1: a single `RegisterRequest` data
   class with `@field` validation annotations; `LoginResponse` returned as-is
   (no profile object inline). Rationale for not returning the profile inline:
   the existing `useBootstrap` hook fetches the profile on the next React
   render anyway, and adding the profile to the auth response would force a
   schema fork between `register` and `login` responses. Keeping
   `LoginResponse` shared keeps the frontend's `setTokens` / `setUser` flow
   identical for both paths.

3. **`agreeTerms` and `agreeWaiver` go in the request body but are not
   persisted.** They are validated (`@AssertTrue`) only. Persisting them
   would require a new `consent_records` table, which is out of scope for
   this PRD. Including them in the request body documents the contract
   honestly (the wizard does collect them at the same submission point) and
   prevents a downstream feature from quietly relaxing the requirement.

4. **No new `INVALID_EMAIL` / `INVALID_PASSWORD` codes.** The existing
   `@field:Email` / `@field:Size` annotations are caught by the global
   validation handler and surfaced as `VALIDATION_ERROR` with the field name
   prefixed in the message ("email: …", "password: …"). The frontend's
   existing `parseValidationErrors` helper splits these into per-field
   messages on the credentials step. Adding feature-specific codes would
   require new handler branches and yield no UX improvement.

5. **Migration scope.** **No new migrations.** Verified via postgres MCP
   query: `users.email` already has unique index `uq_users_email`,
   `password_hash` is `varchar(72)` (sufficient for bcrypt), `user_profiles`
   already has all columns the combined-payload register needs to populate.
   The two-layer uniqueness guard in §3.2 satisfies kotlin-conventions
   §"Unique Constraints" without schema work.

6. **Email uniqueness check timing — Option B (late-only).** Discussed in
   §2.2. The handoff's snap-back UX is the contract; an upfront check would
   add an enumeration vector and still need the late check. The PRD's
   "user sees error on the signup step" (AC-03) is satisfied by the
   snap-back: from the user's point of view the error appears on the
   credentials step.

7. **Returning-guest password lifecycle.** A guest who closes the tab after
   the credentials step and returns days later: if `Date.now() - lastTouchedAt
   > 24h`, the password is wiped from the store and localStorage on
   bootstrap. Email and other typed fields are kept (so the user does not
   feel the form was reset). 24h was chosen as the smallest interval that
   handles "I came back the next morning" without leaving credentials in
   `localStorage` indefinitely. This is a deliberate choice; the alternative
   (clearing immediately on tab close) is impossible without a service
   worker, and the alternative (never clearing) leaves a plaintext password
   in `localStorage` forever. The cleanup runs on `OnboardingPage` mount
   while `isAuthenticated === false` — once authenticated, the cleanup is
   handled by the explicit `clearPassword()` on terms-success.

8. **Routing changes.** Landing CTAs route to `/onboarding`. `/register` is
   kept as a permanent `Navigate to="/onboarding"` redirect for legacy
   bookmarks (resolves handoff Open Question 1). Route guards: `OnboardingRoute`
   updated to allow unauthenticated visitors (the wizard *is* the public
   surface); `AuthRoute` and `UserRoute` unchanged (member routes still
   require auth). Loading states: `OnboardingRoute` keeps the
   `BootstrapSpinner` branch for the authenticated-but-bootstrap-loading
   case (Lesson 11).

9. **Snap-back implementation specifics.** When the combined `register` call
   returns 409 `EMAIL_ALREADY_EXISTS`:
   - `OnboardingShell.handleContinue` catches the 409 (axios error → check
     `error.response.data.code`).
   - Calls `store.setCredentialsLateError("This email is already registered. Enter a different email address to continue.")`.
   - Calls `store.setStep('credentials')`.
   - The in-flight `setLoading(false)` runs in the same `finally` block as
     today, releasing the footer.
   - `StepCredentials` subscribes to `store.credentialsLateError`. When
     non-null, it renders the persistent banner above the email field and
     adds the error border styling to the email input. On mount (post-snap-
     back) it programmatically calls `emailInputRef.current?.focus()` and
     scrolls into view if needed.
   - The email input's `onChange` handler calls
     `store.setCredentialsLateError(null)` on the first character typed —
     this is what "the banner persists until the user modifies the email
     field" means.

10. **Backwards compatibility / migration of existing users.** Out of scope per
    PRD non-goals. Any pre-existing `users` row (whether onboarded or
    half-onboarded) continues to log in via `POST /auth/login` and complete
    onboarding via the existing wizard logic in `OnboardingShell`. The
    combined-payload `register` is only invoked from the unified wizard's
    `terms` step for users who entered via the credentials step — the
    `OnboardingPage`'s `computeResumeStep` ensures an existing authenticated
    user resuming onboarding lands on `profile`/`membership`/etc., not
    `credentials`.

11. **Loading state for the async gate (Lesson 11 explicit).** The
    `OnboardingRoute` guard's `bootstrapLoading` branch is preserved exactly
    as today and continues to render `BootstrapSpinner` when an
    authenticated user has not yet bootstrapped. No additional async gate is
    introduced by this feature — the credentials and terms steps both use
    the existing `StickyFooter.continueLoading` indicator, which is
    component-local and does not gate routing.

---

## 7. Out of Scope

Mirroring PRD non-goals:

- Social auth (Google / Apple sign-in)
- Email verification / confirmation link
- Password reset flow changes
- Admin-created accounts (trainers/admins invited via backoffice) — unchanged
- Redesigning the login page — the standalone `/login` route and its
  `LoginPage.tsx` remain visually unchanged
- Migrating existing half-onboarded users — they continue under the existing
  onboarding-flow SDD's resume logic
- A `consent_records` table or any persistence of `agreeTerms` / `agreeWaiver`
  beyond inline validation
- Email-enumeration mitigation beyond not adding an upfront check endpoint
- Password strength meter (handoff explicitly defers)
- A full bespoke `/auth/check-email` endpoint
- Server-side draft/pending users (PRD explicitly says no `users` row exists
  until terms submission)
- Removing the standalone `RegisterPage.tsx` from the build is **in** scope;
  redesigning `LoginPage.tsx` is **not**

---

## 8. Open Questions

None remaining. All open questions raised in the handoff are resolved here:

1. **Handoff OQ-1 — what does `/register` redirect to after retirement?** →
   `/onboarding` (§4.1).
2. **Handoff OQ-2 — when is the password cleared from localStorage?** →
   immediately on terms-submission success (`clearPassword()` in §4.2 step 3),
   plus a 24-hour bootstrap cleanup for stale anonymous entries (§4.2 step 4).
3. **Handoff OQ-3 — combined endpoint vs two-step?** → combined endpoint
   (§2.1, §6 Decision 1).
