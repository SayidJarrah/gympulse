# GymPulse — Gym Membership & Class Booking Platform

## Stack
- **Backend:** Kotlin + Spring Boot 3.x, Gradle (Kotlin DSL)
- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **Database:** PostgreSQL 15
- **Auth:** JWT tokens (access + refresh)
- **Infra:** Docker Compose

## Source of truth

- **Product:** `docs/product.md` — what each feature does, behavioural rules,
  per-feature owner of routes/screens/stores
- **Architecture:** `docs/architecture.md` — domain model, schema map, API map,
  feature map
- **Design system:** `docs/design-system/` — canonical DNA + per-feature
  handoffs at `docs/design-system/handoffs/{slug}/`

Per-feature PRD/SDD/review/gap files are archived under `docs/archive/`. They
are read-only history; never edit them in place — always patch `product.md` or
`architecture.md`.

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
├── e2e/               # Playwright specs (top-level)
│   ├── package.json
│   ├── playwright.config.ts
│   └── specs/
├── demo-seeder/       # Demo-data seeder for the dev stack
├── docs/
│   ├── product.md
│   ├── architecture.md
│   ├── briefs/
│   ├── challenges/
│   ├── design-system/
│   ├── backlog/
│   └── archive/
├── docker-compose.dev.yml
└── docker-compose.e2e.yml
```

## Stacks

| Mode | Compose file | Ports | DB | Used for |
|---|---|---|---|---|
| dev | `docker-compose.dev.yml` | 5432 / 8080 / 5173 / 3002 | `gymflow` | Manual playground; demo-seeder seeds rich data |
| e2e | `docker-compose.e2e.yml` | 5433 / 8081 / 5174 | `gymflow_e2e` | Playwright target; `--build` mandatory |

## Commands

| Command | Intent |
|---|---|
| `/brief {slug}` | Capture intent for new work |
| `/deliver {slug}` | Ship a feature: spec → impl → PR |
| `/audit [scope?]` | Find drift between docs and code |
| `/redesign {slug}` | UI/UX rework of an existing feature |
| `/fix-tests [spec?]` | Make failing E2E specs green |
| `/run [e2e?]` | Boot the dev or e2e stack |

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

## Security baseline

- Never hardcode secrets — use env vars (`@Value("\${...}")` in Spring,
  `import.meta.env` in Vite)
- Never commit `.env` — `.env.example` with placeholders only
- Never log sensitive data — no passwords, tokens, or PII
- Never expose internals in errors — return `{ error, code }` only
- Passwords use bcrypt — never MD5, SHA1, plain text, or reversible encoding
- JWT lives in httpOnly cookies or in-memory only — never localStorage
- Never commit directly to `main` — feature/fix/chore branches only, via PR
- Always use git worktrees for branch work — under `.worktrees/{slug}`. Never
  edit files in the main checkout. `.worktrees/` is gitignored.

## MCP Servers

| MCP | Use for |
|---|---|
| `postgres` | DB queries, schema inspection, EXPLAIN ANALYZE (read-only) |
| `github` | PRs, issues, branch state |
| `playwright` | Browser-based E2E testing |
| `figma` | Figma design read |
