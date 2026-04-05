@docs/lessons.md

# GymPulse — Gym Membership & Class Booking Platform

## Stack
- **Backend:** Kotlin + Spring Boot 3.x, Gradle (Kotlin DSL)
- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **Database:** PostgreSQL 15
- **Auth:** JWT tokens (access + refresh)
- **Infra:** Docker Compose

## Project Structure
```
gympulse/
├── backend/src/main/kotlin/com/gymflow/
│   ├── config/        # Spring Security, CORS, DB
│   ├── domain/        # JPA entities
│   ├── repository/    # Spring Data JPA repos
│   ├── service/       # Business logic
│   ├── controller/    # REST endpoints
│   └── dto/           # Request/Response DTOs
│   └── src/main/resources/db/migration/  # Flyway (V1__, V2__, ...)
├── frontend/src/
│   ├── api/           # Axios calls
│   ├── components/    # Reusable UI
│   ├── pages/         # Page-level components
│   ├── store/         # Zustand state
│   ├── hooks/         # Custom hooks
│   └── types/         # TypeScript types
│   └── e2e/           # Playwright specs
├── docs/
│   ├── prd/           # Per-feature requirements
│   ├── sdd/           # Per-feature technical design
│   ├── design/        # UI/UX specs + prototypes
│   ├── gaps/          # Audit gap reports
│   ├── reviews/       # Post-deliver review docs
│   ├── backlog/       # Tech debt (auto-populated by /deliver reviewer)
│   ├── qa/            # Test manifest
│   └── lessons.md     # Self-improvement lessons
└── docker-compose.review.yml
```

## Security Rules — Non-Negotiable
- **Never hardcode secrets** — use env vars: `@Value("\${...}")` in Spring, `import.meta.env` in Vite
- **Never commit `.env`** — `.env.example` with placeholders only
- **Never log sensitive data** — no passwords, tokens, or PII in logs
- **Never expose internals in errors** — no stack traces or SQL to the client; return `{ error, code }` only
- **Passwords use bcrypt** — never MD5, SHA1, plain text, or reversible encoding
- **JWT never in localStorage** — httpOnly cookies or in-memory only

## MCP Servers
| MCP | Config name | Use for |
|-----|-------------|---------|
| PostgreSQL | `postgres` | DB queries, schema inspection, EXPLAIN ANALYZE (read-only) |
| GitHub | `github` | PRs, issues, branch state |
| Playwright | `playwright` | Browser-based E2E testing |

## Commands
| Command | When to use |
|---------|-------------|
| `/deliver {feature}` | New feature — full pipeline from current stage |
| `/redesign {page}` | Existing page needs visual/UX upgrade |
| `/audit {feature}` | Feature is "done" but completeness is uncertain |
| `/backlog` | View tech debt items; `/backlog {feature}` to filter; `/backlog close TD-N` to remove |
| `/run` | Start the stack with health diagnostics |
| `/verify` | Run full E2E suite |
| `/status` | Reconstruct what's in flight from git + docs |

## API Conventions
- Base URL: `/api/v1`
- Auth header: `Authorization: Bearer <token>`
- Error format: `{ "error": "message", "code": "ERROR_CODE" }`
- Pagination: `?page=0&size=20&sort=createdAt,desc`

## Environment Variables
```
DB_URL=jdbc:postgresql://localhost:5432/gymflow
DB_USER=gymflow
DB_PASSWORD=secret
JWT_SECRET=your-secret-key
JWT_EXPIRY_MS=3600000
```
