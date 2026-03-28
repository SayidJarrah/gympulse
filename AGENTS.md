# GymFlow — Gym Membership & Class Booking Platform

## Project Overview
A full-stack gym management app where users can buy memberships, browse and book classes,
and admins can manage everything from a dashboard.

## Architecture
- **Backend:** Kotlin + Spring Boot 3.x, Gradle (Kotlin DSL)
- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **Database:** PostgreSQL 15
- **Auth:** JWT tokens (access + refresh)
- **Local dev:** Docker Compose

## Project Structure
````
gymflow/
├── backend/          # Kotlin Spring Boot app
│   ├── src/main/kotlin/com/gymflow/
│   │   ├── config/       # Spring configs (Security, CORS, DB)
│   │   ├── domain/       # Entities (User, Membership, Class, Booking)
│   │   ├── repository/   # Spring Data JPA repos
│   │   ├── service/      # Business logic
│   │   ├── controller/   # REST endpoints
│   │   └── dto/          # Request/Response DTOs
│   └── src/main/resources/
│       ├── application.yml
│       └── db/migration/  # Flyway migrations (V1__, V2__, ...)
├── frontend/         # React app
│   ├── src/
│   │   ├── api/          # Axios API calls
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page-level components
│   │   ├── store/        # Zustand global state
│   │   ├── hooks/        # Custom React hooks
│   │   └── types/        # TypeScript types matching backend DTOs
│   ├── e2e/          # Playwright E2E specs (one file per feature)
│   └── vite.config.ts
└── docker-compose.yml
````

## Coding Conventions
### Backend (Kotlin)
- Use data classes for DTOs
- All entities annotated with `@Entity`, `@Table`
- Services are `@Transactional` where needed
- Always validate inputs with `@Valid` and Bean Validation
- Return `ResponseEntity<T>` from controllers
- Use `@PreAuthorize` for role-based access
- Database migrations go in `backend/src/main/resources/db/migration/`
  naming: `V{number}__{description}.sql` (e.g. `V1__create_users_table.sql`)

### Frontend (React/TypeScript)
- Functional components only, no class components
- State management: Zustand for global, useState for local
- API calls via Axios in `src/api/`, never inline in components
- TypeScript strict mode — no `any` types
- Tailwind for all styling — no inline styles

## Common Commands
````bash
# Start everything locally
docker-compose up -d        # starts postgres
cd backend && ./gradlew bootRun
cd frontend && npm run dev

# Run backend tests
cd backend && ./gradlew test

# Run frontend tests
cd frontend && npm test

# Run E2E tests (requires full stack running on ports 3000 and 8080)
cd frontend && npm run test:e2e

# Apply DB migrations (auto on startup)
./gradlew flywayMigrate

# Build for production
./gradlew build
npm run build
````

## Security Rules — Non-Negotiable
These rules apply to every file, every agent, every session. No exceptions.

- **Never hardcode secrets** — passwords, API keys, JWT secrets, DB credentials.
  All must come from environment variables. Use `@Value("\${...}")` in Spring, `import.meta.env` in Vite.
- **Never commit `.env`** — it is in `.gitignore`. Use `.env.example` with placeholder values only.
- **Never log sensitive data** — no passwords, tokens, full credit card numbers, or personal data in any log statement.
- **Never expose internals in error responses** — stack traces, SQL errors, and field names must not reach the client. Return a generic message + error code only.
- **Passwords use bcrypt** — never MD5, SHA1, plain text, or any reversible encoding.
- **JWT tokens are never stored in localStorage** — use httpOnly cookies or in-memory only.
- **PII in the DB is minimal** — only store what is needed. Never store raw passwords (only hash).


## API Conventions
- Base URL: `/api/v1`
- Auth header: `Authorization: Bearer <token>`
- Error format: `{ "error": "message", "code": "ERROR_CODE" }`
- Pagination: `?page=0&size=20&sort=createdAt,desc`

## Domain Vocabulary & Business Rules

### Core Terms
- **Member** — a registered user with an active membership plan
- **Guest** — a registered user without an active membership
- **Membership** — a UserMembership record linking a user to a plan, with start/end dates
- **Plan** — a MembershipPlan defining price, duration, and booking limits
- **Class** — a scheduled GymClass with a trainer, time, duration, and capacity
- **Spot** — one available booking slot in a class (capacity - confirmed bookings)
- **Booking** — a confirmed or cancelled reservation of a spot in a class
- **Check-in** — marking attendance for a booking on the day of the class

### Key Business Rules
- A user must have an ACTIVE membership (end_date > now) to book classes
- A class is FULL when confirmed bookings >= capacity
- Cancelling a booking immediately frees up one spot
- A trainer can be linked to multiple classes but belongs to one user account
- Admins can book classes on behalf of users (admin bypass membership check)

### Status Values
- Membership: `ACTIVE`, `EXPIRED`, `CANCELLED`
- Booking: `CONFIRMED`, `CANCELLED`, `ATTENDED`
- Class: `SCHEDULED`, `CANCELLED`, `COMPLETED`

### Open Policy Questions (not yet implemented)
- Cancellation window (minimum notice before class start)
- Waitlist behaviour when a spot opens
- Booking limits per membership plan per month

## Domain Model (Core Entities)
- **User** — id, email, passwordHash, role (USER/ADMIN), createdAt
- **MembershipPlan** — id, name, price, durationDays, maxBookingsPerMonth
- **UserMembership** — id, userId, planId, startDate, endDate, status
- **GymClass** — id, name, trainerId, scheduledAt, durationMinutes, capacity
- **Booking** — id, userId, classId, bookedAt, status (CONFIRMED/CANCELLED)
- **Trainer** — id, name, bio, specializations, userId

## Environment Variables (.env, never commit)
````
DB_URL=jdbc:postgresql://localhost:5432/gymflow
DB_USER=gymflow
DB_PASSWORD=secret
JWT_SECRET=your-secret-key
JWT_EXPIRY_MS=3600000
````


## Living Documentation
- Product overview (features, roles, API surface): `docs/product-overview.md`
- Per-feature requirements: `docs/prd/{feature-slug}.md`
- Per-feature technical design: `docs/sdd/{feature-slug}.md`
- Per-feature UI/UX design spec: `docs/design/{feature-slug}.md`
- Design system (colors, typography, components): `docs/design/system.md`
- Changelog: `CHANGELOG.md`
- Interactive API reference: http://localhost:8080/api/docs (Swagger, auto-generated)

## Implementation Status

<!--
  HOW TO READ THIS TABLE:
  ✅ = done  🔄 = in progress  ❌ = not started

  WHO UPDATES EACH COLUMN:
  - PRD column   → business-analyst agent updates when PRD is written
  - SDD column   → solution-architect agent updates when SDD is written
  - Design col   → ui-ux-designer agent updates when design spec is written
  - Backend col  → backend-dev agent updates when endpoints + migrations are implemented
  - Frontend col → frontend-dev agent updates when pages/components are built
  - Tests col    → backend-dev / frontend-dev update when unit tests pass
  - E2E col      → e2e-tester agent updates when e2e/{feature}.spec.ts is written and passing

  WHERE THE DOCS LIVE:
  - PRDs → docs/prd/{feature-slug}.md
  - SDDs → docs/sdd/{feature-slug}.md
  - Designs  → docs/design/{feature-slug}.md
-->

| Feature | PRD | SDD | Design | Backend | Frontend | Tests | E2E |
|---------|-----|-----|--------|---------|----------|-------|-----|
| Project scaffold & Docker | — | — | — | ✅ | ✅ | — | — |
| Auth (register/login/JWT) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Membership plans | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| User membership purchase | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| User access flow | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| User profile | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Class schedule | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Trainer profiles | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Class booking & cancellation | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Attendance check-in | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Admin dashboard | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Notifications | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |



**Reading this table:** Before implementing anything, check this table.
If Backend = ❌ but PRD = ✅ and SDD = ✅, documents exist — read them before starting.
If PRD = ❌, requirements must be written first.
A row with all ✅ means do NOT re-implement — only modify on explicit request.

**Adding new features:** When business-analyst writes a new PRD for a feature not
in this table, add a new row with the feature name and set PRD = 🔄. Each agent
updates their column to ✅ when their work is complete.