@AGENTS.md

---

## Claude Code — Specific Configuration

### Available MCP Servers
Config file: `.mcp.json` at project root. Credentials are in shell environment
variables, never in committed files.

| MCP | Name in config | Scoped to | Use it for |
|-----|---------------|-----------|------------|
| PostgreSQL | `postgres` | `solution-architect` agent | Querying the live DB, verifying migrations, running EXPLAIN ANALYZE, checking indexes |
| GitHub | `github` | Any agent / `/implement` command | Creating PRs, reading issues, checking branch state |
| Playwright | `playwright` | `e2e-tester` agent | Browser-based testing of the running frontend |

**Agents: prefer MCP tools over bash equivalents when both are available.**
- Use the Postgres MCP instead of `psql` bash commands for any DB query
- Use the GitHub MCP instead of `gh` CLI commands for PR and issue operations
- Use the Playwright MCP (via e2e-tester) instead of curl for frontend verification

The Postgres MCP connects with a **read-only user** — it cannot run INSERT,
UPDATE, DELETE, or DDL. For schema changes use Flyway migrations via `./gradlew`.

### Delivery Pipeline Skills

| Skill | Stage | Agent | Output |
|-------|-------|-------|--------|
| `/write-prd` | 1 — Requirements | business-analyst | `docs/prd/{slug}.md` |
| `/write-sdd` | 2 — Technical Design | solution-architect | `docs/sdd/{slug}.md` |
| `/write-design` | 2.5 — UI/UX Design | ui-ux-designer | `docs/design/{slug}.md` + prototype |
| `/implement` | 3 — Implementation | backend-dev + frontend-dev + e2e-tester | working feature |
| `/run` | — | devops | stack health check |

**Pipeline rule:** If PRD = ❌ for a feature, run `/write-prd` first.
If SDD = ❌ but PRD = ✅, run `/write-sdd`. If Design = ❌ but SDD = ✅, run `/write-design`.
Only then run `/implement`.

### Agent Teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)

Agent teams is enabled. Claude can dispatch multiple sub-agents in parallel using the Task tool.

**When to parallelise:**
- Multiple independent features: e.g., writing PRDs for two unrelated features simultaneously
- Within `/implement` Step 4 (verify): e2e-tester and a fix-agent can overlap when the bug brief already exists
- Any research/read-only tasks with no shared state (grepping, reading docs, DB queries via Postgres MCP)

**Must stay sequential — do not parallelise:**
- `/write-docs` stages: PRD → SDD → Design are strictly ordered (each consumes the previous output)
- `/implement` Steps 1→2: frontend-dev depends on backend DTOs and endpoint contracts being finalised first
- `/implement` Fix Loop: diagnose → fix → verify must complete one iteration before starting the next
  - If a user requests parallel PRD/SDD/Design work, explicitly refuse and run the stages in order.

**Agent assignments are unchanged** — each agent still owns its domain (backend-dev, frontend-dev, e2e-tester, solution-architect, etc.). Parallelism is about running independent agents concurrently, not merging their responsibilities.

### Agent Memory
Persistent memory is stored in `.claude/memory/MEMORY.md` (auto-loaded each session).
Use it to record stable patterns, key decisions, and recurring fixes — not task state.
