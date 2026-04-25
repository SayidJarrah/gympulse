# Gap Report: auth
Date: 2026-04-05

## DOCS → CODE Gaps

### Missing Functionality
- `findByEmail` does not filter `deleted_at IS NULL` — soft-deleted users can still log in and their email cannot be re-registered
- No `domain/ErrorCode.kt` enum exists; error codes are bare strings in `GlobalExceptionHandler.kt` (SDD specifies a typed enum)
- Admin seed password (`Admin@1234`) is committed in plaintext in V5 migration comments and the E2E spec — no production rotation runbook exists (open SDD task)

### Broken Flows
- Login redirects to `/home` (code) but SDD specifies `/classes` and E2E test AUTH-04 asserts `/plans` — three-way contradiction; all three must be reconciled
- `VALIDATION_ERROR` from backend renders in the server error banner instead of inline below the relevant field as the design spec requires

### Design Divergence
- Submit button focus ring uses `ring-offset-[#0F0F0F]` (page bg) instead of spec's `ring-offset-gray-900` (card bg)
- `AuthForm` aria-label is `"Register form"` / `"Login form"` but design spec says `"Create account"` / `"Sign in"`
- `docs/design/auth.md` is missing the Benchmark Citation required by design-standards

### Missing Test Coverage
- AC-2: No spec asserts the `/register` 201 response shape or that `role` is always `USER`
- AC-6: No spec verifies that submitting `"role": "ADMIN"` in the register body is silently ignored
- AC-8/9: No spec decodes or asserts JWT claims (`sub`, `role`, `iat`, `exp`) or response field types after login
- AC-15/17: Token rotation and already-used-token rejection are untested at the API level
- AC-19/20: Logout invalidation and idempotency are untested at the API level (UI flow only)
- AC-21: Admin `role: "ADMIN"` claim is never verified — AUTH-05 only checks the redirect URL
- AC-24/25: Public accessibility of auth endpoints and the auth requirement on `/logout` are untested at the API level
- No unit tests for `JwtService`

## CODE → DOCS Gaps

### Undocumented Endpoints / Logic
- `TestSupportController` has no SDD coverage; its production-disable mechanism is undocumented
- `AuthRoute` / `UserRoute` client-side guards are not documented in the SDD

### Undocumented UI
- Admin post-login redirect to `/admin/plans` is not covered in any spec or design doc

### Undocumented Behaviours
- `authStore` persists `isAuthenticated` to localStorage — not specified in the SDD; causes a brief stale-auth flash on reload
- `useAuth` maps `REFRESH_TOKEN_EXPIRED` / `REFRESH_TOKEN_INVALID` on the login path — unreachable dead code that contradicts the design spec
- Password show/hide toggle in `PasswordInput.tsx` — no design spec or AC covers this

### Untested Code Paths
- Axios interceptor concurrent-request queue logic (request queuing while token refresh is in-flight) — no E2E or unit coverage
- Submit button spinner/disabled state during in-flight requests — no spec
- Empty-form required-field validation (`Email is required.` / `Password is required.` messages) — no spec

## Suggested Fix Order
1. **Login redirect contradiction** — reconcile `/home` vs `/classes` vs `/plans` across code, SDD, and E2E spec (blocker for reliable CI)
2. **Soft-delete login bypass** — `findByEmail` must filter `deleted_at IS NULL` (security gap)
3. **Backend validation errors not inline** — wire `VALIDATION_ERROR` to field-level display as design specifies
4. **Missing AC coverage** — add specs for AC-6, AC-8/9, AC-15/17, AC-19/20, AC-21 (test confidence)
5. **Plaintext admin password** — move seed credential to env var or Vault reference, document rotation runbook
6. **ErrorCode enum** — create `domain/ErrorCode.kt` to match SDD contract
7. **Design token fixes** — focus ring offset, aria-labels (polish)
8. **Document undocumented behaviours** — SDD entries for `AuthRoute`, `UserRoute`, `TestSupportController`, `authStore` localStorage decision
