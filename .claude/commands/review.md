Run a code quality review for GymFlow.

Scope: $ARGUMENTS
If no argument given, review all uncommitted changes via `git diff --name-only`.

## Backend checks (Kotlin files)
- Every service method that writes to DB has `@Transactional`
- No business logic in controllers — services only
- All controller inputs validated with `@Valid`
- No unchecked null returns from repositories — use `findByIdOrNull` + throw domain exception
- No N+1 queries — check for missing `@EntityGraph` or JOIN FETCH
- Error responses match the standard format in CLAUDE.md

## Frontend checks (TypeScript files)
- No `any` types — must be properly typed or `unknown`
- Every API call has loading state, error state, and success state handled
- No direct Axios usage inside components or hooks — must go through `src/api/`
- All backend error codes have a mapped user message in `errorMessages.ts`
- No console.log left in production code

## Security checks (every file)
- No hardcoded secrets, API keys, passwords, or tokens anywhere in code
- No sensitive data in log statements (passwords, tokens, PII)
- Error responses return only `{ error, code }` — no stack traces or SQL errors exposed
- Auth endpoints (`/auth/*`) excluded from JWT filter in SecurityConfig
- Passwords hashed with BCrypt — never compared as plain strings
- No `localStorage` / `sessionStorage` for JWT tokens in frontend code
- No `dangerouslySetInnerHTML` in React components
- No raw SQL string concatenation — JPA/JPQL only

## Cross-cutting checks
- No hardcoded URLs, IDs, or magic strings — use constants or config
- `.env` not committed — `.env.example` has placeholders only

For each issue:
1. State the file and line number
2. Describe the problem in one sentence
3. Show the fix

Apply all fixes directly.

## Sync Implementation Status table in CLAUDE.md

After code checks are done, verify every row in the Implementation Status table
reflects reality. Do not trust the current values — check the codebase directly.

For each feature row, verify each column against actual files:

**PRD column** — check `docs/prd/{feature-slug}.md` exists
**SDD column** — check `docs/sdd/{feature-slug}.md` exists
**Design column** — check `docs/design/{feature-slug}.md` exists (mark — if the
feature is infrastructure-only, e.g. scaffold, docker)
**Backend column** — check that a service, controller, and Flyway migration for
this feature exist in `backend/src/main/kotlin/com/gymflow/` and
`backend/src/main/resources/db/migration/`
**Frontend column** — check that a page or component for this feature exists
in `frontend/src/pages/` or `frontend/src/components/`
**Tests column** — check that a test file for the service exists in
`backend/src/test/kotlin/com/gymflow/`

Update any cell that does not match reality:
- File exists and looks complete → ✅
- File exists but is empty or clearly incomplete → 🔄
- File does not exist → ❌

Report a summary of any cells that were corrected and why.