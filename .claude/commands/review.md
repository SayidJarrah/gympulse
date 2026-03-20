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

## Cross-cutting checks
- No hardcoded URLs, IDs, or magic strings — use constants or config
- No secrets or credentials in any file

For each issue:
1. State the file and line number
2. Describe the problem in one sentence
3. Show the fix

Apply all fixes directly. Report a summary of what was changed.