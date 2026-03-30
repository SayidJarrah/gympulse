@AGENTS.md

---

## Claude Code — Specific Configuration

### Available MCP Servers
Config file: `.mcp.json` at project root. Credentials are in shell environment
variables, never in committed files.

| MCP | Name in config | Scoped to | Use it for |
|-----|---------------|-----------|------------|
| PostgreSQL | `postgres` | `db-architect` agent | Querying the live DB, verifying migrations, running EXPLAIN ANALYZE, checking indexes |
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
| `/write-sdd` | 2 — Technical Design | solution-architect + db-architect | `docs/sdd/{slug}.md` |
| `/write-design` | 2.5 — UI/UX Design | ui-ux-designer | `docs/design/{slug}.md` + prototype |
| `/implement` | 3 — Implementation | backend-dev + frontend-dev + e2e-tester | working feature |
| `/run` | — | devops | stack health check |
| `/review` | — | — | code quality report |
| `/debug` | — | — | bug investigation |

**Pipeline rule:** If PRD = ❌ for a feature, run `/write-prd` first.
If SDD = ❌ but PRD = ✅, run `/write-sdd`. If Design = ❌ but SDD = ✅, run `/write-design`.
Only then run `/implement`.

### Agent Teams (Experimental)

Enable with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in your shell or `.env`.

Agent Teams let multiple Claude Code instances run **in parallel** and coordinate
through a shared task list + mailbox, rather than funnelling everything through
one session.  Use them for genuinely parallel work; for quick focused workers use
the `Agent` tool (subagents) instead.

#### When to use teams vs. subagents

| Situation | Use |
|-----------|-----|
| backend-dev and frontend-dev working the same feature simultaneously | **Team** |
| solution-architect drafting SDD while db-architect reviews schema | **Team** |
| e2e-tester running while you review another PR | **Team** |
| One-shot research, file search, or single-agent task | **Subagent** |

#### GymFlow pipeline team patterns

**Team: docs** — prepares all documentation for a feature before any code is written.
Agents hand off sequentially via SendMessage; the lead only needs to name the feature.

```
Spawn an agent team for feature "{slug}":
  • teammate "analyst"   → agent type business-analyst,   owns docs/prd/
  • teammate "architect" → agent type solution-architect, owns docs/sdd/
  • teammate "designer"  → agent type ui-ux-designer,     owns docs/design/

Handoff chain:
  analyst   finishes PRD  → SendMessage to "architect": "PRD ready at docs/prd/{slug}.md"
  architect finishes SDD  → SendMessage to "designer":  "SDD ready at docs/sdd/{slug}.md"
  designer  finishes spec → SendMessage to lead:         "Docs complete for {slug}"
```

**Team: implement** — backend and frontend build the feature in parallel once docs are done.

```
Spawn an agent team for feature "{slug}":
  • teammate "backend"  → agent type backend-dev,  owns backend/
  • teammate "frontend" → agent type frontend-dev, owns frontend/src/ frontend/e2e/

Handoff:
  backend posts API contract → SendMessage to "frontend": "API contract ready — see {Controller}.kt"
  frontend starts integration only after receiving that message.
```

**Team: verify** — smoke tests and E2E run in parallel once the stack is up.

```
Spawn an agent team:
  • teammate "smoke" → curl /api/v1/health + key endpoints
  • teammate "e2e"   → agent type e2e-tester, runs full Playwright suite
Both report results to lead independently.
```

#### File ownership — never let two teammates edit the same file

| Teammate | Owns |
|----------|------|
| business-analyst | `docs/prd/` |
| solution-architect | `docs/sdd/` |
| ui-ux-designer | `docs/design/` |
| backend-dev | `backend/` |
| frontend-dev | `frontend/src/`, `frontend/e2e/`, `frontend/public/` |
| db-architect | reviews only — no writes outside `docs/` |
| e2e-tester | `frontend/e2e/`, `docs/bugs/` |

#### Communication pattern

```text
# Teammate → teammate (handoff)
SendMessage to: "architect", body: "PRD ready at docs/prd/class-booking.md"

# Lead → teammate (steer mid-task)
"Ask the backend teammate to post the final DTO shapes so frontend can start."
```

#### Quality-gate hooks (add to `.claude/settings.json`)

```jsonc
"hooks": {
  "TeammateIdle": [
    {
      // Reject a teammate's work if it left TODOs or skipped tests
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "grep -rn 'TODO\\|FIXME\\|@Ignore' backend/src frontend/src && exit 2 || exit 0"
      }]
    }
  ]
}
```

> Exit code **2** from a hook sends the feedback back to the teammate and keeps
> it working.  Exit code **0** lets the task complete.


### Agent Memory
Persistent memory is stored in `.claude/memory/MEMORY.md` (auto-loaded each session).
Use it to record stable patterns, key decisions, and recurring fixes — not task state.
