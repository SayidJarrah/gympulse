# GymFlow — Gemini CLI Configuration

## Project Overview
GymFlow is a gym management platform (Kotlin/Spring Boot + React/TypeScript).
This file contains project-specific instructions that take absolute precedence.

## Strategic Delegation
- **Parallelism:** Execute multiple independent tool calls in parallel when possible.
- **Sub-agents:** Use `codebase_investigator` for deep analysis and `generalist` for batch refactoring or complex tasks.
- **Teams:** Mimic "agent teams" by delegating specialized work to `generalist` sub-agents while adopting the personas in `.gemini/agents/`.

## Delivery Pipeline
Follow these stages for any new feature. Do not skip stages.

| Stage | Goal | Action |
|-------|------|--------|
| 1. Requirements | PRD | Read/Write `docs/prd/{slug}.md` |
| 2. Technical Design | SDD | Read/Write `docs/sdd/{slug}.md` |
| 3. UI/UX Design | Design Spec | Read/Write `docs/design/{slug}.md` + Prototype |
| 4. Implementation | Working Code | Build backend → frontend → E2E tests |
| 5. Verification | PR | Run `/verify`, then create GitHub PR |

## Coding Conventions
### Backend (Kotlin)
- Activate skill: `kotlin-conventions`
- Use data classes for DTOs; services are `@Transactional`.
- Database migrations: `backend/src/main/resources/db/migration/V{N}__name.sql`.
- Return `ResponseEntity<T>` from controllers.

### Frontend (React/TypeScript)
- Activate skill: `react-conventions`
- Functional components, Zustand for state, Axios in `src/api/`.
- No `any` types. Tailwind for styling.

### Domain Logic
- Activate skill: `gymflow-domain`

## Common Commands
- **Run Stack:** `docker-compose -f docker-compose.review.yml up -d`
- **Backend Tests:** `cd backend && ./gradlew test`
- **Frontend Tests:** `cd frontend && npm test`
- **E2E Tests:** `docker-compose -f docker-compose.e2e.yml run --rm playwright`
- **Full Verify:** `run_shell_command("./verify.sh")` (if available, else follow manual steps)

## Security & Safety
- **NEVER** hardcode secrets (use `.env` and `@Value` or `import.meta.env`).
- **NEVER** commit `.env` files.
- **NEVER** log PII or sensitive tokens.

## Agent Memory
Persistent memory is stored in `.gemini/memory/MEMORY.md` (read it each session).
Use it to record stable patterns, key decisions, and recurring fixes — not task state.

## Implementation Status
Refer to the status table in `AGENTS.md`. Always update it after completing a task.

## Agent Personas
When performing specialized tasks, adopt these personas by reading their definitions:
- **Backend:** `.claude/agents/backend-dev.md`
- **Frontend:** `.claude/agents/frontend-dev.md`
- **Architect:** `.claude/agents/solution-architect.md`
- **Analyst:** `.claude/agents/business-analyst.md`
- **QA:** `.claude/agents/e2e-tester.md`

## Task-Specific Workflows
### /implement {feature-slug}
1. Research: Read PRD, SDD, and Design docs.
2. Backend: Implement API, migrations, and unit tests.
3. Frontend: Implement components, hooks, and API calls.
4. E2E: Write and run Playwright tests.
5. Verify: Ensure all tests pass.
6. PR: Create a draft PR using `github` MCP or manual git commands.

### Bug Fix Mode
1. Reproduce with a test case first.
2. Stay within the scope of the bug brief (max 3 files).
3. Do not refactor unrelated code.
