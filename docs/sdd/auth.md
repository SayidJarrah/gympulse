# SDD: Auth (Register / Login / JWT)

## Reference
- PRD: `docs/prd/auth.md`
- Date: 2026-03-20

## Architecture Overview
This feature introduces user identity and token-based authentication into GymFlow.
It is the foundational security layer that every subsequent feature depends on for
identity resolution and role enforcement.

Layers affected: **DB** (two new tables), **Backend** (four new endpoints, JWT
infrastructure, Spring Security config), **Frontend** (register page, login page,
token storage, Axios interceptor for refresh).

The access token is stateless (HS256 JWT). The refresh token is stateful: stored as
a bcrypt hash in a `refresh_tokens` DB table to support rotation and logout
invalidation. No access token denylist is maintained; access tokens expire naturally
within 1 hour.

---

## 1. Database Changes

### New Tables

```sql
-- V1__create_users_table.sql

CREATE TABLE users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(72)  NOT NULL,
  role          VARCHAR(10)  NOT NULL DEFAULT 'USER',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT chk_users_role CHECK (role IN ('USER', 'ADMIN'))
);

-- Note: the UNIQUE constraint on email already creates a B-tree index;
-- no separate CREATE INDEX on email is needed.
```

```sql
-- V2__create_refresh_tokens_table.sql

CREATE TABLE refresh_tokens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   VARCHAR(64) NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  invalidated  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  CONSTRAINT uq_refresh_tokens_token_hash UNIQUE (token_hash)
);

-- token_hash: UNIQUE constraint already creates a B-tree index; no separate index needed.
-- user_id: index supports FK lookups and cascade operations.
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);

-- Partial index for active (non-invalidated) tokens per user; used by cleanup and
-- "list active sessions" queries.
CREATE INDEX idx_refresh_tokens_user_id_active
    ON refresh_tokens (user_id)
    WHERE invalidated = FALSE;

-- Supports background cleanup of expired tokens.
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
```

```sql
-- V2b__add_updated_at_trigger.sql
-- PostgreSQL has no ON UPDATE clause. Without a trigger, updated_at is set
-- only on INSERT and never changed again. This trigger function is shared by
-- all tables that carry an updated_at column.

CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_refresh_tokens_updated_at
  BEFORE UPDATE ON refresh_tokens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

```sql
-- V3__seed_admin_user.sql
-- Password below is the bcrypt hash (cost 10) of the value in ADMIN_SEED_PASSWORD.
-- Replace the hash before deploying if a different seed password is required.
-- The hash shown here corresponds to the placeholder value "Admin@1234".

INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@gymflow.local',
  '$2a$10$7EqJtq98hPqEX7fNZaFWoOa4Z1GpSgaFjxuqFkEqLzYmI2lHvk3yS',
  'ADMIN',
  NOW(),
  NOW()
);
```

### Modified Tables
None. The `users` table is new in this feature.

### Flyway Migrations

| Filename | Description |
|----------|-------------|
| `V1__create_users_table.sql` | Creates `users` table with email unique constraint and role check |
| `V2__create_refresh_tokens_table.sql` | Creates `refresh_tokens` table for server-side token rotation |
| `V2b__add_updated_at_trigger.sql` | Creates shared `set_updated_at()` trigger function; attaches `BEFORE UPDATE` triggers to `users` and `refresh_tokens` so `updated_at` is kept current automatically |
| `V3__seed_admin_user.sql` | Inserts the seeded ADMIN account with a bcrypt-hashed password |

All three files live in `backend/src/main/resources/db/migration/`.

---

## 2. Backend API Contract

### POST /api/v1/auth/register

**Auth:** None (public)

**Request Body:**
```json
{
  "email": "alice@example.com",
  "password": "secret99"
}
```

**Success Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "alice@example.com",
  "role": "USER",
  "createdAt": "2026-03-20T09:00:00Z"
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Email fails RFC 5322 basic format check (AC 4) |
| 400 | `VALIDATION_ERROR` | Password shorter than 8 or longer than 15 characters (AC 5) |
| 409 | `EMAIL_ALREADY_EXISTS` | Email is already registered (AC 3) |

**Business Logic:**
1. Any `role` field in the request body is silently ignored; role is always hardcoded to `USER` (AC 6).
2. Validate `email` with `@Email` (Bean Validation) and `password` with `@Size(min = 8, max = 15)`.
3. Check if a user with the same email already exists; if so return 409 `EMAIL_ALREADY_EXISTS`.
4. Hash the password with BCrypt (cost factor 10).
5. Persist the `User` entity and return 201 with the `RegisterResponse` DTO.

---

### POST /api/v1/auth/login

**Auth:** None (public)

**Request Body:**
```json
{
  "email": "alice@example.com",
  "password": "secret99"
}
```

**Success Response (200):**
```json
{
  "accessToken": "<signed-jwt>",
  "refreshToken": "<opaque-random-token>",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

Notes:
- `expiresIn` is in seconds, derived from `JWT_EXPIRY_MS / 1000`.
- `refreshToken` in the response is the raw (unhashed) token value. Only the bcrypt hash is stored in the DB.

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `INVALID_CREDENTIALS` | Email not found (AC 12) |
| 401 | `INVALID_CREDENTIALS` | Password does not match (AC 13) — identical response to AC 12 to prevent user enumeration |

**Business Logic:**
1. Look up the user by email. If not found, return 401 `INVALID_CREDENTIALS` (do not reveal email existence).
2. Verify the submitted password against the stored bcrypt hash using `BCryptPasswordEncoder.matches`. If it fails, return 401 `INVALID_CREDENTIALS`.
3. Generate a signed JWT with claims: `sub` (user id as string), `role`, `iat`, `exp`. Sign with HS256 using `JWT_SECRET`. Lifetime is `JWT_EXPIRY_MS` milliseconds.
4. Generate a cryptographically random refresh token (32 bytes via `SecureRandom`, hex-encoded = 64-character string).
5. Hash the raw refresh token with BCrypt (cost 10) and insert a `refresh_tokens` row with `expires_at = NOW() + REFRESH_TOKEN_EXPIRY_DAYS days`, `invalidated = false`.
6. Return the raw refresh token and the signed JWT to the caller.

---

### POST /api/v1/auth/refresh

**Auth:** None (public)

**Request Body:**
```json
{
  "refreshToken": "<opaque-random-token>"
}
```

**Success Response (200):**
```json
{
  "accessToken": "<new-signed-jwt>",
  "refreshToken": "<new-opaque-random-token>",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `REFRESH_TOKEN_INVALID` | Token hash not found in DB, or `invalidated = true` (AC 17) |
| 401 | `REFRESH_TOKEN_EXPIRED` | Token found but `expires_at < NOW()` (AC 16) |

**Business Logic (executed in a single `@Transactional` block to prevent race conditions):**
1. Compute the BCrypt hash candidates for the submitted token. Because BCrypt is non-deterministic (different salts), the lookup strategy is: find the token row by matching raw token against all non-invalidated hashes for the user — **however**, storing a secondary deterministic hash (SHA-256) alongside the BCrypt hash is the practical approach so a direct index lookup is possible. See Risks & Notes (Section 6) for the chosen strategy.
2. Look up the `refresh_tokens` row where `token_hash` matches the SHA-256 hex of the submitted token and `invalidated = false`. If not found, return 401 `REFRESH_TOKEN_INVALID`.
3. If `expires_at < NOW()`, return 401 `REFRESH_TOKEN_EXPIRED`.
4. Mark the existing row `invalidated = true`.
5. Generate a new refresh token (same process as login) and insert a new `refresh_tokens` row for the same `user_id`.
6. Generate a new JWT for the user.
7. Return new tokens.

---

### POST /api/v1/auth/logout

**Auth:** Required — valid `Authorization: Bearer <accessToken>` header (AC 25)

**Request Body:**
```json
{
  "refreshToken": "<opaque-random-token>"
}
```

**Success Response (204):** No body.

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Access token missing or invalid / expired |

Note: if the submitted refresh token is already invalidated or unknown, the endpoint still returns 204 (idempotent logout, AC 20).

**Business Logic:**
1. Spring Security validates the access token from the `Authorization` header before the handler is reached. Invalid/expired access tokens result in 401 before business logic runs.
2. Look up the `refresh_tokens` row by SHA-256 hash of the submitted token.
3. If found and `invalidated = false`, set `invalidated = true`.
4. If not found or already invalidated, do nothing (idempotent).
5. Return 204.

---

## 3. Kotlin Classes to Create

### New Files

| File | Package | Type | Purpose |
|------|---------|------|---------|
| `domain/User.kt` | `com.gymflow.domain` | `@Entity` data class | JPA entity for `users` table |
| `domain/RefreshToken.kt` | `com.gymflow.domain` | `@Entity` data class | JPA entity for `refresh_tokens` table |
| `dto/RegisterRequest.kt` | `com.gymflow.dto` | data class | Request body for `/register`; annotated with `@Email`, `@Size` |
| `dto/RegisterResponse.kt` | `com.gymflow.dto` | data class | Response body for `/register`; contains id, email, role, createdAt |
| `dto/LoginRequest.kt` | `com.gymflow.dto` | data class | Request body for `/login`; annotated with `@Email`, `@NotBlank` |
| `dto/LoginResponse.kt` | `com.gymflow.dto` | data class | Response body for `/login` and `/refresh`; contains accessToken, refreshToken, tokenType, expiresIn |
| `dto/RefreshRequest.kt` | `com.gymflow.dto` | data class | Request body for `/refresh`; single `refreshToken: String` field with `@NotBlank` |
| `dto/LogoutRequest.kt` | `com.gymflow.dto` | data class | Request body for `/logout`; single `refreshToken: String` field with `@NotBlank` |
| `repository/UserRepository.kt` | `com.gymflow.repository` | interface | Spring Data JPA; declares `findByEmail(email: String): User?` |
| `repository/RefreshTokenRepository.kt` | `com.gymflow.repository` | interface | Spring Data JPA; declares `findByTokenHashAndInvalidatedFalse(hash: String): RefreshToken?` and `findByTokenHash(hash: String): RefreshToken?` |
| `service/AuthService.kt` | `com.gymflow.service` | `@Service` | All auth business logic: register, login, refresh, logout |
| `service/JwtService.kt` | `com.gymflow.service` | `@Service` | JWT generation (`generateToken(user)`), validation (`validateToken(token): Claims`), and claim extraction |
| `controller/AuthController.kt` | `com.gymflow.controller` | `@RestController` | HTTP layer; four endpoints delegating to `AuthService` |
| `config/SecurityConfig.kt` | `com.gymflow.config` | `@Configuration` | Spring Security 6 config: disables sessions (stateless), permits `/api/v1/auth/**` publicly, requires auth for all other routes, installs `JwtAuthFilter` |
| `config/JwtAuthFilter.kt` | `com.gymflow.config` | `OncePerRequestFilter` | Extracts Bearer token from `Authorization` header, validates via `JwtService`, sets `SecurityContextHolder` |
| `config/PasswordEncoderConfig.kt` | `com.gymflow.config` | `@Configuration` | Declares `BCryptPasswordEncoder` bean (cost = 10) |

### Entity Field Specifications

**`domain/User.kt`**
```kotlin
@Entity
@Table(name = "users")
data class User(
  @Id val id: UUID = UUID.randomUUID(),
  @Column(unique = true, nullable = false) val email: String,
  @Column(name = "password_hash", nullable = false) val passwordHash: String,
  @Column(nullable = false) val role: String = "USER",
  @Column(name = "created_at", nullable = false) val createdAt: OffsetDateTime = OffsetDateTime.now(),
  @Column(name = "updated_at", nullable = false) var updatedAt: OffsetDateTime = OffsetDateTime.now(),
  @Column(name = "deleted_at") var deletedAt: OffsetDateTime? = null
)
```

**`domain/RefreshToken.kt`**
```kotlin
@Entity
@Table(name = "refresh_tokens")
data class RefreshToken(
  @Id val id: UUID = UUID.randomUUID(),
  @Column(name = "user_id", nullable = false) val userId: UUID,
  @Column(name = "token_hash", nullable = false, unique = true, length = 64) val tokenHash: String,
  @Column(name = "expires_at", nullable = false) val expiresAt: OffsetDateTime,
  @Column(nullable = false) var invalidated: Boolean = false,
  @Column(name = "created_at", nullable = false) val createdAt: OffsetDateTime = OffsetDateTime.now(),
  @Column(name = "updated_at", nullable = false) var updatedAt: OffsetDateTime = OffsetDateTime.now(),
  @Column(name = "deleted_at") var deletedAt: OffsetDateTime? = null
)
```

Note: `token_hash` stores the **SHA-256 hex** of the raw refresh token (not BCrypt) to allow deterministic index lookup. SHA-256 hex output is exactly 64 characters, hence `VARCHAR(64)`. See Section 6 for the rationale.

### DTO Field Specifications

**`dto/RegisterRequest.kt`**
```kotlin
data class RegisterRequest(
  @field:Email(message = "Invalid email format")
  @field:NotBlank
  val email: String,

  @field:Size(min = 8, max = 15, message = "Password must be between 8 and 15 characters")
  @field:NotBlank
  val password: String
)
```

**`dto/RegisterResponse.kt`**
```kotlin
data class RegisterResponse(
  val id: UUID,
  val email: String,
  val role: String,
  val createdAt: OffsetDateTime
)
```

**`dto/LoginRequest.kt`**
```kotlin
data class LoginRequest(
  @field:Email @field:NotBlank val email: String,
  @field:NotBlank val password: String
)
```

**`dto/LoginResponse.kt`**
```kotlin
data class LoginResponse(
  val accessToken: String,
  val refreshToken: String,
  val tokenType: String = "Bearer",
  val expiresIn: Long   // seconds
)
```

**`dto/RefreshRequest.kt`**
```kotlin
data class RefreshRequest(
  @field:NotBlank val refreshToken: String
)
```

**`dto/LogoutRequest.kt`**
```kotlin
data class LogoutRequest(
  @field:NotBlank val refreshToken: String
)
```

### Modified Files
None for this feature. `SecurityConfig.kt` is new (not modifying an existing file).

---

## 4. Frontend Components to Create

### Pages

| Route | Component | Location | Purpose |
|-------|-----------|----------|---------|
| `/register` | `RegisterPage.tsx` | `src/pages/auth/` | Self-registration form |
| `/login` | `LoginPage.tsx` | `src/pages/auth/` | Login form; redirects to `/plans` on success (regular users), `/admin/plans` (admins) |

### New Components

| Component | Location | Props |
|-----------|----------|-------|
| `AuthForm.tsx` | `src/components/auth/` | `mode: 'register' \| 'login', onSubmit: fn, isLoading: boolean, error: string \| null` |
| `PasswordInput.tsx` | `src/components/auth/` | `value: string, onChange: fn, error: string \| null` — shows/hides password toggle |

### New Types (`src/types/auth.ts`)

```typescript
export type UserRole = 'USER' | 'ADMIN';

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string; // ISO 8601
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // seconds
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
```

### New API Functions (`src/api/auth.ts`)

```typescript
// All functions use an Axios instance configured with baseURL = /api/v1

export function register(req: RegisterRequest): Promise<RegisterResponse>
export function login(req: LoginRequest): Promise<LoginResponse>
export function refreshTokens(req: RefreshRequest): Promise<LoginResponse>
export function logout(refreshToken: string): Promise<void>
  // POST /api/v1/auth/logout with Authorization: Bearer <accessToken> header
  // and body { refreshToken }
```

### Axios Interceptor (`src/api/axiosInstance.ts`)

A single shared Axios instance must be created with:
- `baseURL`: `/api/v1`
- **Request interceptor:** attaches `Authorization: Bearer <accessToken>` from store if present.
- **Response interceptor:** on 401, attempts one silent token refresh via `refreshTokens()`, updates the store, and retries the original request. If refresh also fails, clears the store and redirects to `/login`.

### State (`src/store/authStore.ts`)

New Zustand store with the following shape:

```typescript
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;            // decoded from JWT claims: sub, role
  isAuthenticated: boolean;

  setTokens(accessToken: string, refreshToken: string): void;
  setUser(user: AuthUser): void;
  clearAuth(): void;
}
```

Persistence: `accessToken` and `refreshToken` should be persisted to `localStorage` via Zustand `persist` middleware so the session survives page reloads.

### Custom Hook (`src/hooks/useAuth.ts`)

```typescript
// Exposes: { user, isAuthenticated, login, register, logout, isLoading, error }
// Calls the api/auth.ts functions and updates authStore on success.
```

---

## 5. Task List per Agent

### db-architect
- [x] Review the SQL in Section 1: verify column types, constraint names, and indexes are correct for PostgreSQL 15. Review complete — see findings below.
- [x] Confirm that `token_hash VARCHAR(72)` is sufficient for a SHA-256 hex string (64 chars). Adjusted to `VARCHAR(64)` — SHA-256 hex is exactly 64 chars; 72 was the BCrypt output length and incorrect for this column.
- [x] Verify that `ON DELETE CASCADE` on `refresh_tokens.user_id` is the correct behaviour (deleting a user removes all their tokens). Confirmed correct.
- [x] Confirm the `UNIQUE` constraint on `refresh_tokens.token_hash` is sufficient to prevent duplicate token insertion under concurrent refresh calls (or advise whether an advisory lock is needed). Confirmed: the UNIQUE constraint combined with the `@Transactional` refresh block is sufficient. The second concurrent caller will see `invalidated = true` and receive 401. No advisory lock is needed.
- [x] Add `BEFORE UPDATE` trigger (migration `V2b__add_updated_at_trigger.sql`) to keep `updated_at` current on both tables. PostgreSQL has no `ON UPDATE` clause; without this trigger the column would remain equal to `created_at` forever.
- [ ] Confirm the bcrypt hash placeholder in `V3__seed_admin_user.sql` is replaced with a real hash before any environment is provisioned. Document the process for generating it.
- [ ] Apply the four Flyway migration files (V1, V2, V2b, V3) and verify they run cleanly on a fresh PostgreSQL 15 database.

### backend-dev
- [ ] Create `V1__create_users_table.sql`, `V2__create_refresh_tokens_table.sql`, `V3__seed_admin_user.sql` exactly as specified in Section 1. Place them in `backend/src/main/resources/db/migration/`.
- [ ] Add dependencies to `build.gradle.kts`: `spring-boot-starter-security`, `jjwt-api`, `jjwt-impl`, `jjwt-jackson` (io.jsonwebtoken 0.12.x), `spring-boot-starter-data-jpa`, `postgresql` JDBC driver.
- [ ] Implement `domain/User.kt` and `domain/RefreshToken.kt` per the field specifications in Section 3.
- [ ] Implement `repository/UserRepository.kt` and `repository/RefreshTokenRepository.kt` per Section 3.
- [ ] Implement `config/PasswordEncoderConfig.kt` — BCrypt bean, cost = 10.
- [ ] Implement `service/JwtService.kt`:
  - `generateToken(user: User): String` — builds JWT with claims `sub`, `role`, `iat`, `exp`. Signs with HS256. Reads secret from `JWT_SECRET` env var. Reads lifetime from `JWT_EXPIRY_MS` (default 3600000).
  - `validateToken(token: String): Claims` — verifies signature and expiry; throws on failure.
  - At startup, assert `JWT_SECRET` is at least 32 characters (256 bits).
- [ ] Implement `service/AuthService.kt` with methods `register`, `login`, `refresh`, `logout` per the business logic in Section 2. The `refresh` method must run in a single `@Transactional` block. Use SHA-256 (not BCrypt) for `token_hash` storage as described in Section 6.
- [ ] Implement `config/JwtAuthFilter.kt` — `OncePerRequestFilter` that reads the `Authorization` header, calls `JwtService.validateToken`, and sets the `SecurityContextHolder`.
- [ ] Implement `config/SecurityConfig.kt` — stateless session, CSRF disabled, permit all on `/api/v1/auth/**`, require authentication on all other routes, register `JwtAuthFilter` before `UsernamePasswordAuthenticationFilter`.
- [ ] Implement `controller/AuthController.kt` — four endpoints, all inputs annotated `@Valid`, all error conditions mapped to the correct HTTP status codes and error codes from Section 2. Handle `MethodArgumentNotValidException` globally (or in a `@ControllerAdvice`) to return `{ "error": "...", "code": "VALIDATION_ERROR" }`.
- [ ] Write unit tests for `AuthService`:
  - Happy path: register, login, refresh (token rotation), logout.
  - Error cases: EMAIL_ALREADY_EXISTS, INVALID_CREDENTIALS (both email-not-found and wrong-password), REFRESH_TOKEN_INVALID, REFRESH_TOKEN_EXPIRED, idempotent logout.
- [ ] Write integration tests for `AuthController` using `@SpringBootTest` + `MockMvc`:
  - Verify 201 on valid register, 400 on invalid inputs, 409 on duplicate email.
  - Verify 200 on valid login, 401 on bad credentials.
  - Verify 200 on valid refresh, 401 on expired/invalid token.
  - Verify 204 on logout (valid and already-invalidated refresh token).

### frontend-dev
- [ ] Create `src/types/auth.ts` with all types from Section 4.
- [ ] Create `src/api/axiosInstance.ts` — shared Axios instance with base URL, request interceptor (attach access token), and response interceptor (silent refresh on 401, fallback to `/login`).
- [ ] Create `src/api/auth.ts` with the four functions from Section 4, using the shared Axios instance.
- [ ] Create `src/store/authStore.ts` — Zustand store with `persist` middleware (localStorage) matching the shape in Section 4.
- [ ] Create `src/hooks/useAuth.ts` — exposes `{ user, isAuthenticated, login, register, logout, isLoading, error }`.
- [ ] Create `src/components/auth/PasswordInput.tsx` — controlled input with show/hide toggle, Tailwind styling only.
- [ ] Create `src/components/auth/AuthForm.tsx` — reusable form used by both pages, accepts `mode` prop.
- [ ] Create `src/pages/auth/RegisterPage.tsx` — renders `AuthForm` in register mode; on success redirects to `/login` (or auto-logs in if preferred — document choice).
- [ ] Create `src/pages/auth/LoginPage.tsx` — renders `AuthForm` in login mode; on success redirects to `/classes`.
- [ ] Map all backend error codes to user-facing messages:
  - `EMAIL_ALREADY_EXISTS` → "An account with this email already exists. Please sign in instead."
  - `VALIDATION_ERROR` → display the specific field error returned by the backend.
  - `INVALID_CREDENTIALS` → "Incorrect email or password. Please try again."
  - `REFRESH_TOKEN_EXPIRED` / `REFRESH_TOKEN_INVALID` → silently redirect to `/login` from the Axios interceptor.
- [ ] Add `/register` and `/login` routes to the React Router configuration.
- [ ] Write component tests for `AuthForm`, `RegisterPage`, and `LoginPage` (render, validation feedback, submit success, submit error).

---

## 6. Risks & Notes

### Refresh Token Hashing Strategy (Design Decision — Assumed, Not Explicitly Stated in PRD)
The PRD Technical Notes say to "store a hash of the refresh token in the DB". BCrypt is
non-deterministic (each call produces a different hash), which prevents a direct
`WHERE token_hash = ?` index lookup. The chosen approach is:

**Store a SHA-256 hex digest** of the raw refresh token in `token_hash`. SHA-256 is
deterministic, enabling a direct indexed lookup. The raw token (64 hex chars from 32
random bytes) has sufficient entropy that SHA-256 provides adequate security for
server-side lookup. BCrypt is not needed here because the token itself is high-entropy
random; BCrypt is reserved for low-entropy secrets like passwords.

This differs from the PRD's mention of "bcrypt hash" for token storage. The PRD's intent
is to avoid storing raw tokens in case of DB breach — SHA-256 fulfils that intent while
remaining practical for indexed lookup. This assumption is documented here so
backend-dev and db-architect can challenge it before implementation.

### Token Rotation Race Condition
The `refresh` endpoint marks the old token invalid and inserts a new one inside a single
`@Transactional` block. The `UNIQUE` constraint on `token_hash` prevents a second
concurrent call from inserting a duplicate. The first call to mark the old token invalid
will cause the second concurrent call to fail the lookup (`invalidated = true`) and
return 401 `REFRESH_TOKEN_INVALID`. This is the correct and safe behaviour.

### JWT Secret Minimum Length
`JWT_SECRET` must be at least 32 characters (256 bits) for HS256. `JwtService` must
assert this at bean initialisation time (`@PostConstruct`) and throw an
`IllegalStateException` if the check fails, preventing the application from starting
with a weak secret.

### Admin Seed Password
The bcrypt hash in `V3__seed_admin_user.sql` is a placeholder. Before any environment
(staging, production) is provisioned, the hash must be regenerated for the intended
seed password using `BCrypt.hashpw(password, BCrypt.gensalt(10))` and committed to the
migration file. The seed password itself must never be committed. Document the
regeneration procedure in the project's runbook.

### Password Max Length and BCrypt
BCrypt silently truncates inputs at 72 bytes. The 15-character maximum specified in the
PRD (AC 5) is well within this limit, so no additional truncation guard is needed.

### Out-of-Scope Items Carried Forward
The following items from the PRD Out of Scope section should be tracked as future
work if needed: password reset flow, email verification, OAuth2, MFA, account lockout
after N failed attempts, "log out all devices".

### Frontend Token Storage
`localStorage` is used for token persistence (Zustand `persist`). This is a known
XSS risk. The alternative (httpOnly cookies) would require backend changes to set
cookies on login/refresh responses. The decision to use `localStorage` is taken for
simplicity in this version; it must be re-evaluated before a production security review.

---

## 7. Implemented Behaviours (Code → Docs)

The following behaviours exist in the implementation but were not originally documented
in the SDD. They are recorded here for completeness.

### Client-Side Route Guards

Two React components guard routes in `src/components/layout/`:

| Component | Location | Behaviour |
|-----------|----------|-----------|
| `AuthRoute` | `src/components/layout/AuthRoute.tsx` | Wraps any authenticated-only route. Reads `isAuthenticated` from `authStore`. Redirects unauthenticated users to `/login`. Admins pass through unchanged. |
| `UserRoute` | `src/components/layout/UserRoute.tsx` | Like `AuthRoute` but also blocks admins: if `user.role !== 'USER'`, redirects to `/admin/plans`. Used for member-only pages (`/home`, `/schedule`). |

Both guards are **UI-only conveniences**. Spring Security enforces the same access rules on the server side. The server is the authoritative access control layer.

### Post-Login Redirect

After a successful login `LoginPage.tsx` branches on role and membership state:

| Condition | Destination |
|-----------|-------------|
| `role === 'ADMIN'` | `/admin/plans` |
| Regular user, `hasActiveMembership: true` | `/home` |
| Regular user, `hasActiveMembership: false` | `/plans` |

`hasActiveMembership` is returned by `POST /api/v1/auth/login` in `LoginResponse`. `AuthService` populates it by calling `UserMembershipRepository.findAccessibleActiveMembership(userId, today)`, which checks `status = ACTIVE`, `end_date ≥ today`, and `deleted_at IS NULL`.

This behaviour is exercised by E2E tests AUTH-04 (member → `/home`) and AUTH-05 (admin → `/admin/plans`).

### `TestSupportController` and Its Production-Disable Mechanism

`TestSupportController` (`src/main/kotlin/com/gymflow/controller/TestSupportController.kt`) exposes a single endpoint:

```
POST /api/v1/test-support/e2e/cleanup
```

This endpoint is used by the E2E test suite (`global-teardown.ts`) to delete test data by email/plan prefix. It is guarded by two mechanisms:

1. **Spring `@ConditionalOnProperty`**: The controller bean is only created when `gymflow.test-support.enabled=true` is set in the application properties. In production this property must be absent or `false`.
2. **`@PreAuthorize("hasRole('ADMIN')")`**: Even if the property is enabled, only authenticated admins can call the endpoint.

In the `test` Spring profile (`application-test.properties`), `gymflow.test-support.enabled=true` is set to allow E2E cleanup. In `application.properties` (production/staging), the property is not set, so the controller does not exist.

### `authStore` localStorage Persistence and Stale-Auth Flash

`authStore` (`src/store/authStore.ts`) uses Zustand's `persist` middleware with `name: 'gymflow-auth'` to write the full auth state (`accessToken`, `refreshToken`, `user`, `isAuthenticated`) to `localStorage`.

**Trade-off recorded here (not in the original SDD):**

- **Benefit**: the session survives full page reloads without requiring a silent refresh on every navigation.
- **Known issue**: on reload, `isAuthenticated` is immediately `true` (from `localStorage`) even if the stored `accessToken` has since expired. The Axios interceptor handles this transparently by attempting a silent refresh on the first protected request that returns 401, but there is a brief window where the UI renders as "authenticated" before the refresh completes. This is the "stale-auth flash".
- **Production re-evaluation**: before a production security review, consider switching to httpOnly cookies (which require backend changes) or short-lived access tokens with immediate silent refresh on load.
