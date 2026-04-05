---
name: kotlin-conventions
description: GymPulse Kotlin/Spring Boot coding conventions. Load when writing,
  reviewing, or discussing any Kotlin code in this project.
---

# GymPulse Kotlin Conventions

## Entities
- Annotate with `@Entity` and `@Table(name = "snake_case_name")`
- Use `@Id` with `val id: UUID = UUID.randomUUID()` — no `@GeneratedValue`, UUIDs are app-generated
- All timestamps use `OffsetDateTime`, never `LocalDateTime`
- Soft-delete pattern: `var deletedAt: OffsetDateTime? = null`
- Relationships: always `FetchType.LAZY`, never EAGER
- **Never use `@PreUpdate` or `@PrePersist` on `data class` entities** — JPA lifecycle callbacks are silently ignored on Kotlin `data class` entities. Always assign fields explicitly in the service method before calling `save()` (e.g. `entity.updatedAt = OffsetDateTime.now()`).

## DTOs
- Kotlin data classes only — never regular classes
- Request DTOs: validate with `@field:NotBlank`, `@field:Valid`, `@field:Min`, etc.
- Response DTOs: immutable — only `val`, no `var`
- Naming: `{Feature}Request`, `{Feature}Response`, `{Feature}Summary` (for list items)

## Services
- `@Transactional` on all methods that write to the DB
- Throw typed domain exceptions — never return null for error states
- Domain exceptions are mapped to error codes in a global `@ControllerAdvice`
- Use `@Lock(LockModeType.PESSIMISTIC_WRITE)` when checking capacity before insert

## Controllers
- Return `ResponseEntity<T>` — always explicit status codes, never implicit 200
- Use `@PreAuthorize("hasRole('ADMIN')")` for admin-only endpoints
- Validate request bodies with `@Valid`
- No business logic in controllers — delegate everything to services

## Error Codes
All errors: `{ "error": "Human readable message", "code": "SCREAMING_SNAKE_CASE" }`
Codes live in `domain/ErrorCode.kt` as an enum. Add new codes there, never inline strings.

## Migration Naming
`V{next_number}__{snake_case_description}.sql`
Check `src/main/resources/db/migration/` for the current highest number before naming.
Current highest as of config redesign: V20 — next new migration is V21.

## Image Handling
Binary images stored as `ByteArray` with `@JdbcTypeCode(SqlTypes.BINARY)`.
Always pair with a `{field}MimeType: String?` column.
Serve via a dedicated `GET /{entity}/{id}/photo` endpoint.

## Price Storage
Prices stored as `Int` in cents (e.g. `priceInCents: Int`). Never use floating-point for money.
Frontend must divide by 100 for display.

## Unique Constraints / Concurrent Writes
When a `save()` involves a unique constraint, always use a two-layer guard:
1. Application-level pre-check (`existsBy…`) for the common sequential case.
2. `try { repo.save(entity) } catch (e: DataIntegrityViolationException) { throw YourDomainException() }` for the race-condition case.
An application-level check alone is not race-safe — two concurrent requests can both pass it and then collide at the DB.

## Deletion Order — FK Constraint Safety
Before writing any bulk-delete method that removes rows from a table referenced by foreign keys, scan all Flyway migrations (`V1__` through the latest) for every `REFERENCES {table}(id)` constraint pointing at that table.
- If the constraint has `ON DELETE CASCADE` — no action needed, the DB handles it.
- If the constraint has `ON DELETE RESTRICT` or no explicit clause (defaults to RESTRICT) — you must delete the child rows first, in a separate `@Modifying @Query` call within the same `@Transactional` method.
Never infer that no FK children exist from the entity class alone — the DB constraint is the authoritative source.

## Flyway Migrations
Never edit a migration file (`V{N}__*.sql`) after it has been applied to any environment.
Flyway stores the checksum on apply; editing the file causes a checksum mismatch that prevents the backend from starting.
To fix a mistake: create a new migration `V{N+1}__fix_*.sql` instead.
