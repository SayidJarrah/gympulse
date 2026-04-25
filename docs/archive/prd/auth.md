# PRD: Auth (Register / Login / JWT)

## Overview
This feature enables new gym members to self-register with an email address and
password, and to authenticate on subsequent visits by exchanging those credentials
for a short-lived JWT access token and a longer-lived refresh token. Logout
invalidates the refresh token so stolen tokens cannot be replayed. Admin accounts
are never self-registered; they are seeded through application configuration only.
Every user record carries a role field (USER or ADMIN) that downstream features use
for access control.

## Goals
- Allow new members to create an account independently, reducing front-desk friction.
- Provide a stateless, token-based auth mechanism that all other API features can
  rely on for identity and role enforcement.
- Prevent privilege escalation: no self-registration path can produce an ADMIN account.
- Enable the frontend to maintain a logged-in session across page reloads via refresh
  token rotation.

## User Roles Involved
- **Guest** — unauthenticated visitor who can register or login.
- **User** — authenticated member who can refresh tokens and logout.
- **Admin** — seeded via config; can login and logout but cannot self-register.

## User Stories

### Happy Path Stories
- As a guest, I want to register with my email and password so that I have an account
  I can use to book classes.
- As a guest, I want to login with my email and password so that I receive an access
  token and a refresh token to authenticate subsequent requests.
- As a user, I want to exchange my refresh token for a new access token so that my
  session continues without me having to log in again.
- As a user, I want to logout so that my refresh token is invalidated and no one else
  can use it.
- As an admin, I want to login with my seeded credentials so that I can access
  admin-only functionality.

### Edge Case Stories
- As a guest, I want to see a clear error when I try to register with an email address
  that is already in use, so that I know I should log in instead.
- As a guest, I want to see a clear validation error when I submit a registration with
  a malformed email or a password that does not meet the minimum length requirement,
  so that I understand exactly what I need to fix.
- As a guest, I want to see a clear error when I provide wrong credentials at login,
  so that I know my email or password is incorrect without being told which one is
  wrong (to prevent user enumeration).
- As a user, I want to see a clear error when I attempt to use an expired or
  already-invalidated refresh token, so that I know I need to log in again.
- As a guest, I want to be prevented from self-registering with a role of ADMIN, even
  if I manipulate the request payload, so that privilege escalation is impossible.

## Acceptance Criteria

1. `POST /api/v1/auth/register` accepts `{ "email": string, "password": string }`.
2. On successful registration the server stores the user with role USER, a bcrypt hash
   of the password (never the plaintext), and returns HTTP 201 with
   `{ "id": uuid, "email": string, "role": "USER", "createdAt": iso8601 }`.
3. Registering with an email that already exists returns HTTP 409 with
   `{ "error": "Email already in use", "code": "EMAIL_ALREADY_EXISTS" }`.
4. Registering with a malformed email (fails RFC 5322 basic format check) returns
   HTTP 400 with `{ "error": "...", "code": "VALIDATION_ERROR" }`.
5. Registering with a password shorter than 8 characters or longer than 15 characters returns HTTP 400 with
   `{ "error": "...", "code": "VALIDATION_ERROR" }`.
6. Any `role` field included in the registration request body is silently ignored;
   the stored role is always USER.
7. `POST /api/v1/auth/login` accepts `{ "email": string, "password": string }`.
8. On successful login the server returns HTTP 200 with
   `{ "accessToken": string, "refreshToken": string, "tokenType": "Bearer",
   "expiresIn": number }` where `expiresIn` is the access token lifetime in seconds.
9. The access token is a signed JWT containing at minimum the claims: `sub` (user id),
   `role`, `iat`, `exp`.
10. The access token lifetime is configurable via `JWT_EXPIRY_MS` and defaults to
    3600000 ms (1 hour).
11. The refresh token lifetime is configurable via `REFRESH_TOKEN_EXPIRY_DAYS` and defaults to 30 days.
12. Login with an email that does not exist returns HTTP 401 with
    `{ "error": "Invalid credentials", "code": "INVALID_CREDENTIALS" }`.
13. Login with a correct email but wrong password returns HTTP 401 with the same
    `{ "error": "Invalid credentials", "code": "INVALID_CREDENTIALS" }` (identical
    response to AC 12 to prevent user enumeration).
14. `POST /api/v1/auth/refresh` accepts `{ "refreshToken": string }`.
15. On successful refresh the server returns HTTP 200 with a new access token and a
    new refresh token; the old refresh token is invalidated immediately (token
    rotation).
16. Submitting an expired refresh token to `/api/v1/auth/refresh` returns HTTP 401
    with `{ "error": "Refresh token expired", "code": "REFRESH_TOKEN_EXPIRED" }`.
17. Submitting an already-used (rotated-out) refresh token returns HTTP 401 with
    `{ "error": "Refresh token invalid", "code": "REFRESH_TOKEN_INVALID" }`.
18. `POST /api/v1/auth/logout` requires a valid `Authorization: Bearer <accessToken>`
    header and accepts `{ "refreshToken": string }` in the body.
19. On successful logout the submitted refresh token is invalidated and the server
    returns HTTP 204 with no body.
20. Calling `/api/v1/auth/logout` with an already-invalidated or unknown refresh token
    still returns HTTP 204 (idempotent logout — the client must not be left in a
    broken state).
21. Admin accounts seeded via application config have role ADMIN; logging in with
    those credentials returns an access token with `role: "ADMIN"`.
22. There is no API endpoint that creates a user with role ADMIN.
23. All passwords are stored as bcrypt hashes; plaintext passwords never appear in
    logs, responses, or the database.
24. Endpoints `/api/v1/auth/register`, `/api/v1/auth/login`, and
    `/api/v1/auth/refresh` are publicly accessible (no auth header required).
25. The `/api/v1/auth/logout` endpoint requires a valid access token.

## Out of Scope (for this version)
- Password reset / forgot-password flow.
- Email verification on registration (account is active immediately on register).
- OAuth2 / social login (Google, Facebook, etc.).
- Multi-factor authentication.
- Account lockout after N failed login attempts.
- Admin self-service management of other admin accounts.
- Session listing or "log out all devices" functionality.
- Frontend pages and components (covered by frontend-dev separately).

## Open Questions

All open questions have been resolved:
1. Refresh token lifetime: **30 days** (configurable via `REFRESH_TOKEN_EXPIRY_DAYS`).
2. Access token denylist on logout: **No** — stateless; only refresh tokens are tracked server-side.
3. Maximum password length: **15 characters** (min 8, max 15).
4. Admin seeding: **SQL migration** — a Flyway migration inserts the admin record with a bcrypt-hashed password.

## Technical Notes for the Architect
- Refresh tokens must be stored server-side (e.g. a `refresh_tokens` table with
  token hash, user id, expiry, and an invalidated flag) to support rotation and
  logout invalidation.
- Store a hash of the refresh token in the DB, not the raw value, so a DB breach
  does not expose live tokens.
- Token rotation on every `/refresh` call means the old token row must be marked
  invalid atomically with inserting the new one — consider a DB transaction or
  optimistic lock to prevent race conditions.
- Admin accounts are seeded via a Flyway SQL migration file (not at runtime). The migration inserts a fixed admin record with a bcrypt-hashed password directly into the `users` table.
- Password hashing should use bcrypt with a cost factor of at least 10.
- The `JWT_SECRET` must be at least 256 bits for HS256; consider documenting a
  minimum length check at startup.
