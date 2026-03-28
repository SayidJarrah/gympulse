# GymFlow Backend — Developer Context

See root `/AGENTS.md` for project-wide context, conventions, and implementation status.

## Package Layout
```
src/main/kotlin/com/gymflow/
├── config/       # Spring Security, CORS, JWT config
├── domain/       # JPA entities
├── dto/          # Request/Response data classes
├── repository/   # Spring Data JPA interfaces
├── service/      # Business logic (@Service, @Transactional)
└── controller/   # REST endpoints (@RestController)
```

## Kotlin Conventions

### Entities
- Annotate with `@Entity` and `@Table(name = "snake_case_name")`
- Use `@Id @GeneratedValue` with UUID strategy
- All timestamps are `OffsetDateTime`, never `LocalDateTime`
- Soft-delete pattern: include `deletedAt: OffsetDateTime? = null`

### DTOs
- Kotlin data classes only, never regular classes
- Request DTOs validate with `@field:NotBlank`, `@field:Valid`, etc.
- Response DTOs are immutable — no `var`, only `val`
- Naming: `{Feature}Request`, `{Feature}Response`, `{Feature}Summary` (for list items)

### Services
- Always `@Transactional` on methods that write to the DB
- Throw domain exceptions (e.g. `ClassFullException`) — never return nulls for error states
- Domain exceptions are caught in a global `@ControllerAdvice` and mapped to error codes

### Controllers
- Return `ResponseEntity<T>` — always explicit status codes
- Use `@PreAuthorize("hasRole('ADMIN')")` for admin endpoints
- Validate request bodies with `@Valid`
- No business logic in controllers — delegate everything to services

### Error Codes
All errors return: `{ "error": "Human readable", "code": "SCREAMING_SNAKE_CASE" }`
Defined error codes live in `domain/ErrorCode.kt` as an enum.

## When Adding a Feature (follow this order)
1. Flyway migration → `src/main/resources/db/migration/V{N}__{description}.sql`
2. Entity in `domain/` — annotate with `@Entity`, `@Table`, `@Id`, `@GeneratedValue`
3. Repository in `repository/` — extend `JpaRepository<Entity, UUID>`
4. Request/Response DTOs in `dto/` — Kotlin data classes with Bean Validation annotations
5. Service in `service/` — `@Service`, `@Transactional` where needed, all business logic here
6. Controller in `controller/` — `@RestController`, return `ResponseEntity<T>`
7. Unit tests for the service (JUnit 5 + MockK)

## Migration Naming
`V{next_number}__{snake_case_description}.sql`
Always check existing files in `src/main/resources/db/migration/` for the next number.

## Auth Annotations
- USER-only: `@PreAuthorize("hasRole('USER')")`
- ADMIN-only: `@PreAuthorize("hasRole('ADMIN')")`
- Either role: `@PreAuthorize("hasAnyRole('USER','ADMIN')")`

## Error Responses
Return `{ "error": "message", "code": "ERROR_CODE" }` — never expose stack traces or SQL.

## Bug Report Workflow

E2E failures are reported as **observation reports** in `docs/bugs/`.
These are written by the e2e-tester and contain browser/network evidence — but no root cause analysis.

When you receive a bug brief to investigate:

1. **Assess first — backend bug or spec issue?**
   - Does the API return the wrong status code or wrong response body? → **Backend bug** — fix it.
   - Does the endpoint not exist (404) but the SDD says it should? → **Backend bug**.
   - Does the endpoint exist and respond correctly per the SDD, but the spec expects something different? → **Spec issue**.
   - Is the spec asserting a response format that differs from the SDD contract? → **Spec issue**.
   - Unsure? Read the SDD API contract. Implementation matches SDD → spec issue. Deviates → backend bug.

2. **If backend bug:** fix the relevant service/controller/entity (≤ 3 files). Verify with a curl call.

3. **If spec issue:** do NOT change any backend file. Fill in the `## Spec Fix Required` section
   at the bottom of the bug brief:
   ```
   Spec file: frontend/e2e/{feature}.spec.ts
   Test name: {exact test name}
   Change needed: {what expected value/status/field is wrong and what it should be, quoting the SDD}
   ```
   Then tell the user to run `/fix-spec docs/bugs/{filename}`.

## Updating Implementation Status
After all endpoints are implemented and tests pass, update the **Backend** and **Tests**
columns in the Implementation Status table in `/AGENTS.md` to ✅.
