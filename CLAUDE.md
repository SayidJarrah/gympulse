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
│   ├── prd/             # Per-feature requirements
│   ├── sdd/             # Per-feature technical design
│   ├── design-system/   # Tokens, voice, assets + per-feature handoffs from the Claude Design project
│   ├── gaps/            # Audit gap reports
│   ├── reviews/         # Post-deliver review docs
│   ├── backlog/         # Tech debt (auto-populated by /deliver reviewer)
│   ├── qa/              # Test manifest
│   └── lessons.md       # Self-improvement lessons
└── docker-compose.review.yml
```

## SDD Hygiene — Non-Negotiable
Any behavioural decision made during a conversation — redirect targets, response shapes, error messages, routing logic, field additions — must be written into `docs/sdd/{feature}.md` before the conversation ends. If no SDD section exists for the decision, add one. Do not leave decisions only in commit messages, memory, or domain skill updates.

## Demo Seeder — Non-Negotiable

The demo seeder lives at `demo-seeder/src/` and populates realistic data for manual testing and demos. It must stay in sync with the DB schema at all times.

**Seeded tables and their owner files:**

| Table | Owner file | Notes |
|-------|-----------|-------|
| `users` | `referenceSeeder.ts` → `upsertQaUsersAndProfiles()` | QA fixed UUIDs |
| `user_profiles` | `referenceSeeder.ts` + `seeder.ts` → `registerUsers()` | Both paths must match |
| `trainers` | `referenceSeeder.ts` → `upsertTrainers()` | Fixed UUIDs in `data/trainers.ts` |
| `membership_plans` | `referenceSeeder.ts` → `upsertMembershipPlans()` | Fixed in `data/membershipPlans.ts` |
| `rooms` | `referenceSeeder.ts` → `upsertRooms()` | Fixed in `data/rooms.ts` |
| `class_instances` | `seeder.ts` → `createClassInstances()` | Dynamic per preset |
| `bookings` | `seeder.ts` → `createBookings()` | Dynamic per preset |
| `pt_bookings` | `seeder.ts` → `createPtBookings()` | Dynamic per preset |

**Rules:**

1. **Any Flyway migration that adds or renames a column on a seeded table requires a seeder update in the same PR.** Check the table list above to find the owner file. Do not open a PR with a migration that leaves the seeder out of sync.

2. **Any new entity type that needs demo data requires a new seeder function** wired into `runSeeder()`. Add the table to the list above in `CLAUDE.md` at the same time.

3. **Fixed reference data** (trainers, rooms, QA users, plans) lives in `demo-seeder/src/data/*.ts`. Add fields there first, then reference them in the upsert function. Fixed UUIDs must never change — they are referenced by E2E tests and QA docs.

4. **Dynamic demo data** (members, class instances, bookings, PT bookings) is generated in `seeder.ts`. Keep quantity proportional to preset size (`small`/`medium`/`large`).

## Design System — Source of Truth

UI/UX design is owned by the external **Claude Design** project, not this repo. We no longer generate design specs or HTML prototypes locally — `ui-ux-designer` is retired. Work flows in two layers:

**Layer 1 — Design system (slow-moving, living in this repo):**
- `docs/design-system/README.md` — voice, visual rules, component patterns (canonical)
- `docs/design-system/colors_and_type.css` — token values (CSS custom properties); imported directly by `frontend/src/index.css`
- `docs/design-system/tailwind.gymflow.cjs` — Tailwind theme extension; loaded by `frontend/tailwind.config.js` via `createRequire`
- `docs/design-system/tokens.ts` — TypeScript mirror of all tokens (for theme providers / CSS-in-JS)
- `docs/design-system/assets/` — logo marks, favicon; copied to `frontend/public/assets/` for runtime serving
- Update these together when tokens change; commit once and let the rest of the repo pick them up.

**Layer 2 — Per-feature handoffs (fast-moving, dropped in per feature):**
- For each feature or redesign, a handoff package lands at `docs/design-system/handoffs/{feature-slug}/`:
  - `README.md` — the spec (overview, screens, states, interactions, data contracts, tokens, deferred items)
  - `design_reference/` — prototype bundle: HTML/JSX entry, `colors_and_type.css`, supporting modules
- Handoffs are authored in the Claude Design project, not here. They are the input to `/deliver` Stage 2 and `/redesign`.
- Prototypes are reference-only — they use CDN React + inline styles for convenience. Implement against the project stack (Vite, TS, Tailwind, Zustand). Port tokens verbatim.

**Before any UI change (implementation or review):**
1. Read `docs/design-system/README.md` for voice + visual rules.
2. Read the feature handoff at `docs/design-system/handoffs/{slug}/`.
3. Implement against existing React components in `frontend/src/components/`. Do not fabricate a design spec locally when the handoff is missing — halt and ask for it to be produced in the Claude Design project.

**When tokens change in the Claude Design project:** drop the new extraction bundle into `docs/design-system/` — replace `colors_and_type.css`, `tailwind.gymflow.cjs`, `tokens.ts`, and `assets/`. Also copy updated SVGs to `frontend/public/assets/`. Commit as one chore PR. No per-feature follow-up required — `index.css` imports tokens directly and Tailwind picks up the new config on rebuild.

## Git Rules — Non-Negotiable
- **Never commit directly to `main`** — all changes go through a feature branch and PR, no exceptions
- Branch naming: `feature/{slug}`, `fix/{slug}`, `chore/{slug}`
- When work doesn't belong to an open feature branch, create a new `chore/` branch for it
- **Always use git worktrees for branch work** — never check out a branch in the main working directory. Create a worktree under `.worktrees/{branch-slug}` before making any changes. This prevents file bleed between parallel terminals.

### Worktree Workflow
```bash
# Create worktree for a new branch
git worktree add .worktrees/feature-auth -b feature/auth

# Create worktree for an existing branch
git worktree add .worktrees/fix-schedule fix/schedule

# List active worktrees
git worktree list

# Remove when done (after PR merged)
git worktree remove .worktrees/feature-auth
```
The `.worktrees/` directory is already in `.gitignore`.

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
| `/brief {feature}` | Start a new feature — interactive intake, saves brief to `docs/briefs/{feature}.md` |
| `/deliver {feature}` | Run the delivery pipeline from the current stage (requires brief or audit gap report) |
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
