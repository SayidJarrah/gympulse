---
name: kotlin-conventions
description: Load GymFlow Kotlin/Spring Boot coding conventions. Activate automatically
  when writing, reviewing, or discussing any Kotlin code in this project.
---

# GymFlow Kotlin Conventions

## Entities
- Annotate with `@Entity` and `@Table(name = "snake_case_name")`
- Use `@Id @GeneratedValue` with UUID strategy
- All timestamps are `OffsetDateTime`, never `LocalDateTime`
- Soft-delete pattern: include `deletedAt: OffsetDateTime? = null`

## DTOs
- Kotlin data classes only, never regular classes
- Request DTOs validate with `@field:NotBlank`, `@field:Valid`, etc.
- Response DTOs are immutable — no `var`, only `val`
- Naming: `{Feature}Request`, `{Feature}Response`, `{Feature}Summary` (for list items)

## Services
- Always `@Transactional` on methods that write to the DB
- Throw domain exceptions (e.g. `ClassFullException`) — never return nulls for error states
- Domain exceptions are caught in a global `@ControllerAdvice` and mapped to error codes

## Controllers
- Return `ResponseEntity<T>` — always explicit status codes
- Use `@PreAuthorize("hasRole('ADMIN')")` for admin endpoints
- Validate request bodies with `@Valid`
- No business logic in controllers — delegate everything to services

## Error Codes
All errors return: `{ "error": "Human readable", "code": "SCREAMING_SNAKE_CASE" }`
Defined error codes live in `domain/ErrorCode.kt` as an enum.