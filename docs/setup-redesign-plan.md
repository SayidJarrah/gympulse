# Claude Code Setup Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate GymPulse from per-feature PRD/SDD/handoff archipelago to canonical `product.md` + `architecture.md`, replace `business-analyst`/`solution-architect`/`reviewer` with `product-author`/`architect`/`critic`+`challenger`, slim CLAUDE.md, delete `lessons.md`, and validate by running the new pipeline on one real feature.

**Architecture:** Three sequential PRs. PR 1 lays foundation (new docs, archive old, slim CLAUDE.md, settings cleanup) without touching agent/command/skill logic. PR 2 swaps the pipeline (agents, skills, commands). PR 3 calibrates the new pipeline on a real small feature.

**Tech Stack:** bash, git (worktrees), markdown editing. No backend/frontend code changes.

**Reference spec:** `docs/setup-redesign.md`

---

## File Structure (all files affected across migration)

### Created

| Path | PR | Purpose |
|------|----|----|
| `docs/product.md` | 1 | Canonical product spec — section per feature |
| `docs/architecture.md` | 1 | Domain model, schema map, API map, feature map |
| `docs/archive/prd/` | 1 | Cold archive of `docs/prd/*` |
| `docs/archive/sdd/` | 1 | Cold archive of `docs/sdd/*` |
| `docs/archive/reviews/` | 1 | Cold archive of `docs/reviews/*` |
| `docs/archive/gaps/` | 1 | Cold archive of `docs/gaps/*` |
| `.claude/agents/challenger.md` | 2 | Adversarial pre-code review agent |
| `.claude/agents/critic.md` | 2 | Adversarial post-code review agent |
| `.claude/agents/product-author.md` | 2 | Patches product.md sections |
| `.claude/agents/architect.md` | 2 | Patches architecture.md |
| `.claude/skills/audit/SKILL.md` | 2 | `/audit` pipeline logic |
| `.claude/skills/redesign/SKILL.md` | 2 | `/redesign` pipeline logic |
| `.claude/skills/e2e-conventions/SKILL.md` | 2 | E2E rules consolidated |
| `.claude/skills/demo-seeder-conventions/SKILL.md` | 2 | Seeder rules consolidated |
| `.claude/commands/audit.md` | 2 | `/audit` command entry |
| `.claude/commands/redesign.md` | 2 | `/redesign` command entry |

### Modified

| Path | PR | Notes |
|------|----|----|
| `CLAUDE.md` | 1 | Slim from ~290 to ~110 lines |
| `MEMORY.md` (in user memory dir) | 1 | Remove stale content |
| `.claude/settings.json` | 1 | `docker-compose` → `docker compose` |
| `.claude/settings.local.json` | 1 | Drop ad-hoc Bash one-offs |
| `.claude/agents/developer.md` | 2 | New reading list (product.md, architecture.md) |
| `.claude/agents/designer.md` | 2 | Slimmer; lighter handoff |
| `.claude/agents/tester.md` | 2 | New reading list |
| `.claude/skills/deliver/SKILL.md` | 2 | Rewritten under new pipeline |
| `.claude/skills/design-standards/SKILL.md` | 2 | Lighter handoff shape |
| `.claude/commands/deliver.md` | 2 | Auto-detect logic |

### Deleted

| Path | PR | Notes |
|------|----|----|
| `docs/lessons.md` | 1 | Each rule redistributed; not archived |
| `docs/superpowers/` | 1 | Entire folder; user opted out |
| `docs/pivots/` | 1 | Empty folder; concept embedded in challenger |
| `.claude/agents/business-analyst.md` | 2 | Replaced by `product-author` |
| `.claude/agents/solution-architect.md` | 2 | Replaced by `architect` |
| `.claude/agents/reviewer.md` | 2 | Replaced by `critic` |

---

# PR 1 — Foundation

Goal: new canonical docs, archive old, slim CLAUDE.md, settings cleanup.
After PR 1, pipeline still runs the old way. No agent/command/skill changes.

## Task 1: Create worktree for PR 1

**Files:** none (worktree setup).

- [ ] **Step 1: Confirm we are not on main and start clean**

```bash
git -C /Users/d.korniichuk/IdeaProjects/gympulse status --short
git -C /Users/d.korniichuk/IdeaProjects/gympulse branch --show-current
```

Expected: branch is `main`, working tree clean (or only `docs/setup-redesign.md` and `docs/setup-redesign-plan.md` untracked).

- [ ] **Step 2: Create worktree for PR 1 with absolute path**

```bash
git -C /Users/d.korniichuk/IdeaProjects/gympulse worktree add \
  /Users/d.korniichuk/IdeaProjects/gympulse/.worktrees/redesign-foundation \
  -b chore/redesign-foundation
```

Expected: worktree created at `.worktrees/redesign-foundation`, new branch `chore/redesign-foundation`.

- [ ] **Step 3: Move the design + plan docs into the worktree**

The redesign documents currently live in main's working directory. Move them into the new worktree so they ship with PR 1.

```bash
cp /Users/d.korniichuk/IdeaProjects/gympulse/docs/setup-redesign.md \
   /Users/d.korniichuk/IdeaProjects/gympulse/.worktrees/redesign-foundation/docs/setup-redesign.md
cp /Users/d.korniichuk/IdeaProjects/gympulse/docs/setup-redesign-plan.md \
   /Users/d.korniichuk/IdeaProjects/gympulse/.worktrees/redesign-foundation/docs/setup-redesign-plan.md

# Remove originals from main
rm /Users/d.korniichuk/IdeaProjects/gympulse/docs/setup-redesign.md
rm /Users/d.korniichuk/IdeaProjects/gympulse/docs/setup-redesign-plan.md
```

Expected: docs now exist only in the worktree.

- [ ] **Step 4: Commit the design and plan in the worktree**

```bash
cd /Users/d.korniichuk/IdeaProjects/gympulse/.worktrees/redesign-foundation
git add docs/setup-redesign.md docs/setup-redesign-plan.md
git commit -m "$(cat <<'EOF'
chore(redesign): add design and migration plan docs

Capture the agreed redesign of the agent-driven setup and the three-PR
migration plan for execution.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: one new commit on `chore/redesign-foundation`.

---

## Task 2: Run extractor agent → draft `docs/product.md` and `docs/architecture.md`

**Files:**
- Create: `.worktrees/redesign-foundation/docs/product.md`
- Create: `.worktrees/redesign-foundation/docs/architecture.md`

This is the highest-judgement step in the migration. Run an extractor subagent that reads every PRD and SDD and produces the two canonical docs. User reviews before committing.

- [ ] **Step 1: Dispatch extractor subagent**

Use the Agent tool, `subagent_type: "general-purpose"`. Prompt:

> You are the migration extractor for the GymPulse redesign.
>
> **Inputs to read (full content of each):**
> - All files in `docs/prd/`
> - All files in `docs/sdd/`
> - The reference spec at `docs/setup-redesign.md` (sections 3.2 and 3.3 — the
>   shapes for `product.md` and `architecture.md`)
>
> **Outputs to write:**
> 1. `docs/product.md` — one section per feature. Section shape per setup-redesign.md
>    section 3.2. Each section ≤ ~200 lines. Status: "active" unless the SDD
>    notes deprecation. Behavioural rules instead of numbered ACs. History block
>    has one entry: "{date of original PRD} — initial".
> 2. `docs/architecture.md` — four sections:
>    - Domain model — entities + statuses + invariants. Read JPA entities under
>      `backend/src/main/kotlin/com/gymflow/domain/`. Use Postgres MCP to verify
>      current schema where uncertain.
>    - Schema map — table-by-table summary. Cite the latest Flyway migration
>      version applied (read `backend/src/main/resources/db/migration/`).
>    - API map — endpoints, owner feature, auth. Read `@RestController` files.
>    - Feature map — route → owner feature, store → owner feature, component
>      directory → owner feature.
>
> **Rules:**
> - Faithful, not creative. If a PRD/SDD already states a rule, lift it. Do not
>   invent new rules.
> - One feature per slug. Use the existing PRD filenames as slugs.
> - For features that span multiple PRDs (e.g. demo-seeder split into 3 PRDs),
>   merge under one slug if they describe the same surface; otherwise keep
>   separate.
> - Mark sections as `Status: sunset` when an SDD describes a feature that has
>   been replaced by a newer one (cross-reference SDDs by date).
> - Out-of-scope items that leave a placeholder in data model (e.g.
>   `PLAN_PENDING` from unified-signup) MUST be named in the section's "Out of
>   scope" block per setup-redesign Lesson 15 rule.
>
> **Output:** the two markdown files. Do not commit.

- [ ] **Step 2: Wait for extractor agent to finish, then read both outputs**

Read both files in full. They will be long (≈2000–3000 lines each).

- [ ] **Step 3: Manual review against PRD/SDD list**

Compare the section list in `docs/product.md` against `ls docs/prd/`. Every PRD slug must have a corresponding section. If any slug is missing, dispatch the extractor again with a targeted re-read.

```bash
cd /Users/d.korniichuk/IdeaProjects/gympulse/.worktrees/redesign-foundation
ls docs/prd/ | sed 's/\.md$//' | sort > /tmp/prd-slugs.txt
grep -E '^## ' docs/product.md | sed -E 's/^## .* — `([^`]+)`.*/\1/' | sort > /tmp/product-slugs.txt
diff /tmp/prd-slugs.txt /tmp/product-slugs.txt
```

Expected: empty diff. If non-empty, re-extract missing slugs.

- [ ] **Step 4: Verify architecture.md schema map matches Flyway state**

Use Postgres MCP to list tables, compare to schema map.

```bash
# Via Postgres MCP, run:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

Cross-check the table list against the schema map in `architecture.md`. Every table must appear in the map. Add missing entries.

- [ ] **Step 5: Commit `docs/product.md` and `docs/architecture.md`**

```bash
cd /Users/d.korniichuk/IdeaProjects/gympulse/.worktrees/redesign-foundation
git add docs/product.md docs/architecture.md
git commit -m "$(cat <<'EOF'
chore(redesign): extract product.md and architecture.md from prd+sdd

Single canonical sources of truth replacing the per-feature PRD/SDD
archipelago. Sections faithfully lifted from existing prd/ and sdd/
without invention.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: two new files committed.

---

## Task 3: Cold-archive `docs/prd/`

**Files:**
- Move: `docs/prd/*` → `docs/archive/prd/*`

- [ ] **Step 1: Create archive directory and move files**

```bash
cd /Users/d.korniichuk/IdeaProjects/gympulse/.worktrees/redesign-foundation
mkdir -p docs/archive/prd
git mv docs/prd/* docs/archive/prd/
rmdir docs/prd
```

Expected: `docs/prd/` no longer exists; `docs/archive/prd/` contains 20 files (per current `ls docs/prd/`).

- [ ] **Step 2: Verify**

```bash
ls docs/archive/prd/ | wc -l
ls docs/prd 2>/dev/null && echo "STILL EXISTS" || echo "removed"
```

Expected: count > 0; second line prints "removed".

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore(redesign): cold-archive docs/prd/ to docs/archive/prd/

Per-feature PRDs are no longer the canonical source. Archived for trace.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Cold-archive `docs/sdd/`

**Files:**
- Move: `docs/sdd/*` → `docs/archive/sdd/*`

- [ ] **Step 1: Create archive directory and move files**

```bash
cd /Users/d.korniichuk/IdeaProjects/gympulse/.worktrees/redesign-foundation
mkdir -p docs/archive/sdd
git mv docs/sdd/* docs/archive/sdd/
rmdir docs/sdd
```

- [ ] **Step 2: Verify**

```bash
ls docs/archive/sdd/ | wc -l
ls docs/sdd 2>/dev/null && echo "STILL EXISTS" || echo "removed"
```

Expected: count is 25 (per current state); second line "removed".

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore(redesign): cold-archive docs/sdd/ to docs/archive/sdd/

Per-feature SDDs replaced by docs/architecture.md. Archived for trace.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Cold-archive `docs/reviews/` and `docs/gaps/`

**Files:**
- Move: `docs/reviews/*` → `docs/archive/reviews/*`
- Move: `docs/gaps/*` → `docs/archive/gaps/*`

- [ ] **Step 1: Move both directories**

```bash
cd /Users/d.korniichuk/IdeaProjects/gympulse/.worktrees/redesign-foundation
mkdir -p docs/archive/reviews docs/archive/gaps
git mv docs/reviews/* docs/archive/reviews/
git mv docs/gaps/* docs/archive/gaps/
rmdir docs/reviews docs/gaps
```

- [ ] **Step 2: Verify**

```bash
ls docs/archive/reviews/ | wc -l
ls docs/archive/gaps/ | wc -l
[ -d docs/reviews ] && echo "REVIEWS STILL EXISTS" || echo "reviews removed"
[ -d docs/gaps ] && echo "GAPS STILL EXISTS" || echo "gaps removed"
```

Expected: counts > 0; both "removed".

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore(redesign): cold-archive docs/reviews/ and docs/gaps/

Per-feature review and gap reports become archive noise under the new
pipeline. Critic now writes PR comments; audit produces a single dated
gap file when run.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Delete `docs/lessons.md`, `docs/superpowers/`, `docs/pivots/`

**Files:**
- Delete: `docs/lessons.md`
- Delete: `docs/superpowers/` (recursive)
- Delete: `docs/pivots/` (empty)

- [ ] **Step 1: Delete the three paths**

```bash
cd /Users/d.korniichuk/IdeaProjects/gympulse/.worktrees/redesign-foundation
git rm docs/lessons.md
git rm -r docs/superpowers/
rmdir docs/pivots 2>/dev/null || true
# pivots is empty and untracked; rmdir is enough
```

- [ ] **Step 2: Verify**

```bash
[ -f docs/lessons.md ] && echo "LESSONS STILL EXISTS" || echo "lessons removed"
[ -d docs/superpowers ] && echo "SUPERPOWERS STILL EXISTS" || echo "superpowers removed"
[ -d docs/pivots ] && echo "PIVOTS STILL EXISTS" || echo "pivots removed"
```

Expected: all three "removed".

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore(redesign): delete lessons.md, docs/superpowers/, docs/pivots/

Each lesson is redistributed to the appropriate skill or agent prompt
(see docs/setup-redesign.md section 6.3). docs/superpowers/ is removed
per user direction; one-off design docs go to top-level paths instead.
docs/pivots/ was reserved but unused; pivot mode is now a challenger
verdict.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Slim CLAUDE.md to ~110 lines

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Read current `CLAUDE.md`**

Read the full file in the worktree.

- [ ] **Step 2: Replace contents with the slim version**

Use the Write tool to overwrite. Final shape (literal):

```markdown
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
```

- [ ] **Step 3: Verify line count**

```bash
wc -l CLAUDE.md
```

Expected: ~110 ± 10 lines.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
chore(redesign): slim CLAUDE.md to ~110 lines

Move testing rules, container rebuild rule, demo-seeder rules, design
system block, contradiction policy, SDD hygiene, and worktree examples
out of the always-loaded session context. Domain rules now live in their
respective skills (e2e-conventions, demo-seeder-conventions,
design-standards) and agent prompts (challenger, product-author).

CLAUDE.md keeps only what every session needs: stack, project map,
source-of-truth pointers, command list, env vars, MCP table, and a short
universal security baseline.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Clean `.claude/settings.local.json` and fix `settings.json`

**Files:**
- Modify: `.claude/settings.local.json`
- Modify: `.claude/settings.json`

- [ ] **Step 1: Replace `settings.local.json` with the clean version**

Use Write tool to overwrite `.claude/settings.local.json` with:

```json
{
  "permissions": {
    "allow": [
      "Bash(*)",
      "mcp__playwright__*",
      "mcp__github__*",
      "mcp__postgres__*",
      "mcp__ide__*",
      "mcp__figma__*",
      "Skill(*)"
    ]
  },
  "enabledMcpjsonServers": ["postgres", "github", "playwright", "figma"]
}
```

- [ ] **Step 2: Fix the docker-compose entry in `settings.json`**

Use Edit tool. In `.claude/settings.json`:

- old: `"Bash(docker-compose *)"`
- new: `"Bash(docker compose *)"`

- [ ] **Step 3: Verify**

```bash
cat .claude/settings.local.json | python3 -m json.tool | head -10
grep 'docker compose' .claude/settings.json
```

Expected: JSON parses; grep matches `Bash(docker compose *)`.

- [ ] **Step 4: Commit**

```bash
git add .claude/settings.json .claude/settings.local.json
git commit -m "$(cat <<'EOF'
chore(redesign): clean settings; align docker-compose syntax

Drop accumulated ad-hoc Bash one-offs from settings.local.json; they were
redundant under Bash(*). Add Skill(*) so new skills don't prompt. Switch
the project allow rule from `docker-compose *` to `docker compose *` to
match the v2 syntax used in scripts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Clean MEMORY.md

**Files:**
- Modify: `/Users/d.korniichuk/.claude/projects/-Users-d-korniichuk-IdeaProjects-gympulse/memory/MEMORY.md`

This file lives outside the repo (in user's auto-memory). It is not committed but it ships with each session.

- [ ] **Step 1: Read current MEMORY.md**

```bash
cat /Users/d.korniichuk/.claude/projects/-Users-d-korniichuk-IdeaProjects-gympulse/memory/MEMORY.md
```

- [ ] **Step 2: Replace with cleaned version**

Use Write tool to overwrite with:

```markdown
# GymFlow Project Memory

## Source of truth pointers
- Product: `docs/product.md`
- Architecture: `docs/architecture.md`
- Design system: `docs/design-system/`

## Project Conventions
- Screenshots → `screenshots/YYYYMMDD-HHMMSS/{step}-{desc}.png` (git-ignored)
- e2e-tester agent saves to `screenshots/` subfolder with timestamp

## Git Workflow
- [Always use git worktrees](feedback_worktree_always.md) — create
  `.worktrees/{slug}` before any branch work, in every context (not just
  /deliver)

## Process: Brainstorming skill
- [Skip docs/superpowers](feedback_superpowers_spec_location.md) — folder
  removed; brainstorming/specs go to feature-specific paths or top-level
  one-off `docs/{topic}.md` files
```

Removed: stale "auth frontend refactor" pending task, implementation status
table, hardcoded design tokens, references to deleted paths.

- [ ] **Step 3: No commit needed**

MEMORY.md is outside the repo; no git step.

---

## Task 10: PR 1 verification and push

- [ ] **Step 1: Run `git log` to confirm commits in order**

```bash
cd /Users/d.korniichuk/IdeaProjects/gympulse/.worktrees/redesign-foundation
git log main..HEAD --oneline
```

Expected: 8 commits (Tasks 1, 2, 3, 4, 5, 6, 7, 8).

- [ ] **Step 2: Run `git status` to confirm clean**

```bash
git status --short
```

Expected: empty.

- [ ] **Step 3: Verify the new structure exists**

```bash
ls docs/product.md docs/architecture.md
ls docs/archive/prd/ | head -3
ls docs/archive/sdd/ | head -3
[ -f docs/lessons.md ] && echo "LESSONS LEAKED" || echo "lessons gone"
[ -d docs/superpowers ] && echo "SUPERPOWERS LEAKED" || echo "superpowers gone"
wc -l CLAUDE.md
```

Expected: both new files present, archive populated, lessons/superpowers gone, CLAUDE.md ~110 lines.

- [ ] **Step 4: Push and open PR 1**

```bash
git push -u origin chore/redesign-foundation
gh pr create --title "chore: redesign foundation — canonical product/architecture docs and cleanup" --body "$(cat <<'EOF'
## Summary

PR 1 of 3 in the Claude Code setup redesign (see `docs/setup-redesign.md`).

- Extract `docs/product.md` and `docs/architecture.md` from per-feature PRD/SDD
- Cold-archive `docs/prd/`, `docs/sdd/`, `docs/reviews/`, `docs/gaps/` under `docs/archive/`
- Delete `docs/lessons.md`, `docs/superpowers/`, `docs/pivots/`
- Slim CLAUDE.md from ~290 to ~110 lines
- Clean `.claude/settings.local.json`; fix `docker-compose` → `docker compose`

No agent, command, or skill changes. The pipeline still runs the old way.
PR 2 swaps the pipeline.

## Test plan

- [ ] Spot-check 3 features in `docs/product.md` against their archived PRD
- [ ] Verify schema map in `docs/architecture.md` matches Postgres MCP output
- [ ] Confirm CLAUDE.md is readable end-to-end and self-contained
- [ ] `/run` and `/run e2e` still work with no behavior change

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR opened, link returned.

---

# PR 2 — Pipeline

Goal: replace agents, skills, and commands with the new pipeline. Built on top of merged PR 1.

## Task 11: Create worktree for PR 2

**Files:** none.

- [ ] **Step 1: Verify PR 1 is merged**

```bash
git -C /Users/d.korniichuk/IdeaProjects/gympulse fetch origin
git -C /Users/d.korniichuk/IdeaProjects/gympulse log origin/main --oneline | head -3
```

Expected: PR 1's merge commit is on `origin/main`.

- [ ] **Step 2: Create worktree**

```bash
git -C /Users/d.korniichuk/IdeaProjects/gympulse worktree add \
  /Users/d.korniichuk/IdeaProjects/gympulse/.worktrees/redesign-pipeline \
  -b chore/redesign-pipeline origin/main
```

Expected: new worktree at `.worktrees/redesign-pipeline`, branch from latest main.

---

## Task 12: Write `challenger` agent

**Files:**
- Create: `.claude/agents/challenger.md`

- [ ] **Step 1: Write the agent prompt**

Use Write tool. File content:

```markdown
---
name: challenger
model: opus
description: Use this agent immediately after `product-author` produces a draft
  patch to `docs/product.md`, before the patch is committed. Reads the entire
  product.md, architecture.md, and the draft. Outputs an adversarial verdict
  (PROCEED / CONCERNS / PIVOT) at `docs/challenges/{slug}-{date}.md`. Never
  edits product.md.
---

You are the Challenger for GymPulse. Your job is to find what's wrong with a
proposed product.md patch BEFORE code is written. You read three things and
produce a verdict.

## What you read

1. `docs/product.md` — the entire current product spec (every section).
2. `docs/architecture.md` — domain model, schema map, API map, feature map.
3. The draft patch the user gives you (either as a diff or as the proposed new
   section text).

That is all. Do not read SDDs. Do not read code unless an architectural claim
is in dispute. Stay at the spec level.

## Four questions you must answer

For every patch:

1. **Contradiction with architecture.md?** Does the patch propose a behaviour
   that violates an invariant in the domain model? (Example: AC implies a
   user can have two active memberships, but the invariant says one ACTIVE
   per user.)
2. **Overlap with another feature?** Does the patch claim ownership of a
   route, store, screen, or capability already owned by another section in
   product.md?
3. **Extension, pivot, or rewrite?** Classify explicitly:
   - **Extension** — adds new behaviour to an existing feature without
     contradicting current behaviour.
   - **Pivot** — replaces existing behaviour. Old code/tests partially or
     wholly retired.
   - **Rewrite** — keeps the same surface but restructures internals.
4. **Unstated assumptions and alternative framings?** What did the author
   silently assume? What alternative framing was not considered? Name 1–3
   specifics; do not list every possible nit.

## Verdict

Pick one:

- **PROCEED** — patch is clean. No concerns of consequence.
- **CONCERNS** — there are issues that should be resolved before commit. List
  them numbered with a recommended action per item.
- **PIVOT** — this is not an extension; it replaces existing behaviour. The
  user must explicitly confirm the pivot path before /deliver continues. Old
  code/tests must be identified for retirement.

Resolve contradictions by UX intent, not majority vote. If two existing
sections contradict the patch and the patch's framing is more user-aligned,
flag the existing contradiction rather than rejecting the patch.

## Output

Save to `docs/challenges/{slug}-{YYYYMMDD}.md`:

```markdown
# Challenge: {slug} — {date}

## Verdict
PROCEED | CONCERNS | PIVOT

## 1. Contradiction with architecture.md
{finding or "None"}

## 2. Overlap with another feature
{finding or "None"}

## 3. Classification
EXTENSION | PIVOT | REWRITE — {one-line rationale}

## 4. Unstated assumptions / alternative framings
- {item}
- {item}

## Recommended action
{single paragraph: what user should do next}
```

## Hard rules

- Never edit `product.md` or `architecture.md` yourself. You only write the
  challenge file.
- Never approve a patch that contradicts an architecture invariant without
  flagging it. The user may still proceed — but with eyes open.
- Three to five substantive findings, not fifteen nits. If you write more than
  five points under any one of the four questions, you are nit-picking.
- Be terse. The whole challenge file should fit on one screen.
```

- [ ] **Step 2: Verify file exists**

```bash
ls -la .claude/agents/challenger.md
wc -l .claude/agents/challenger.md
```

Expected: ~70 lines.

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/challenger.md
git commit -m "$(cat <<'EOF'
feat(redesign): add challenger agent

Adversarial pre-code review. Runs between product-author draft and
patch commit. Outputs PROCEED / CONCERNS / PIVOT verdict to
docs/challenges/{slug}-{date}.md.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Write `critic` agent (replaces `reviewer`)

**Files:**
- Create: `.claude/agents/critic.md`
- Delete: `.claude/agents/reviewer.md`

- [ ] **Step 1: Write the agent prompt**

```markdown
---
name: critic
model: opus
description: Use after implementation to perform an adversarial code review
  with substantive depth. Reads the implementation diff, the relevant
  product.md and architecture.md sections, and the design system. Output
  is PR review comments via gh, plus suggestions appended to
  docs/backlog/tech-debt.md. Optional summary file only for big features.
---

You are the Critic for GymPulse. You are a senior engineer with strong
opinions about abstraction, simplicity, and product judgement. Your job is
NOT to run a checklist. Your job is to find the 3–5 things that are
substantively wrong with this implementation — and skip the nits.

Load the design-standards skill before any review that touches UI.

## What you read

1. The PR diff (`gh pr diff` or `git diff main..HEAD`).
2. The relevant section in `docs/product.md` for the feature.
3. The relevant sections in `docs/architecture.md` (domain, schema, API,
   feature map).
4. `docs/design-system/handoffs/{slug}/screens.md` if UI work.
5. `docs/design-system/README.md` and `colors_and_type.css` for token names.

Do not read other features' product.md sections unless cross-feature impact
is suspected.

## Five questions you must answer

For every review:

1. **Is the abstraction earned?** Was a simple problem made complicated, or a
   simple thing forced into the wrong abstraction? Name a specific file:line
   if so.
2. **Does the implementation actually solve the user's problem?** Or does it
   match the spec's letter while missing the user's actual goal? Walk through
   the primary flow and ask whether it feels right end-to-end.
3. **Is this consistent with how X is done elsewhere?** Find one or two
   precedents in the codebase. Flag deviations — and ask whether the
   deviation is justified.
4. **Is there a design choice nobody questioned?** Surface one decision the
   developer made implicitly that deserves explicit consideration. Often this
   is a data shape, an event model, or a state-management pattern.
5. **What in this code will hurt three features from now?** Predict one
   future pain point. If you can't, say so plainly.

## Output

**Primary output: PR review comments via `gh pr review`.**
- 3–5 substantive comments. Not 15 nits.
- Each comment: file:line — what's wrong → what it should be → why it matters.
- Mark any comment as a blocker only if it satisfies the blocker criteria
  below. All other comments are suggestions.

**Suggestion → tech-debt logging (preserved from old reviewer):**
For every suggestion (non-blocker) comment, append a TD-N entry to
`docs/backlog/tech-debt.md`:

```markdown
## TD-{next N} — {short title}
Source: PR #{number}
Feature: {slug}
Added: {YYYY-MM-DD}
Effort: S | M | L
{one paragraph description}
```

Effort: **S** = a few lines, **M** = under half a day, **L** = needs its own
planning.

Before returning, count: number of suggestion comments must equal number of
new TD entries appended. If they do not match, append the missing TD entries.

**Optional summary doc** at `docs/critiques/{slug}-{date}.md` only when:
- This is a pivot (challenger verdict was PIVOT), OR
- The PR touches > 5 files, OR
- The user explicitly asked for a written critique.

## Blocker criteria

A comment is a blocker only if it satisfies one of:

- Broken UX flow — user cannot complete a primary action end-to-end.
- Security issue — any OWASP top 10, missing auth check, sensitive data
  exposure.
- Domain rule violated — contradicts an invariant in `architecture.md`.
- Design structurally off-spec — layout diverges from the handoff (not minor
  styling).
- Missing required UI states — no loading, error, or empty state where the
  design demands one.
- Behaviour not in `product.md` — undocumented redirect target, response
  field, error message, or routing rule. Undocumented behaviour is a blocker
  per product.md hygiene.

Do NOT block on:
- Minor styling preferences not in the handoff.
- Refactoring opportunities unrelated to the feature.
- Speculative future improvements.
- Anything you would describe as a nit.

## Self-audit before merging (Lesson 13 carryover)

For any feature PR with a handoff, you MUST:
1. Open the handoff `screens.md` alongside the running stack.
2. Visually compare each screen against the spec.
3. Walk each primary behavioural rule end-to-end in the browser.
4. Confirm no CSS tokens are used that do not exist in
   `docs/design-system/colors_and_type.css`.
5. If any screen looks wrong or any rule fails, raise a blocker.

## Escalation

If a finding requires understanding > 3 files to diagnose, or suggests
`product.md` itself is wrong, raise a blocker comment with `**Requires
architect review**` prefix and list the files involved. The /deliver
pipeline will route to the architect agent before any developer fix.
```

- [ ] **Step 2: Delete `reviewer.md`**

```bash
git rm .claude/agents/reviewer.md
```

- [ ] **Step 3: Verify**

```bash
ls -la .claude/agents/critic.md
[ -f .claude/agents/reviewer.md ] && echo "REVIEWER LEAKED" || echo "reviewer gone"
wc -l .claude/agents/critic.md
```

Expected: critic ~95 lines, reviewer gone.

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/critic.md .claude/agents/reviewer.md
git commit -m "$(cat <<'EOF'
feat(redesign): replace reviewer with critic agent

Adversarial post-code review. Reads diff + product.md + architecture.md +
design system. Produces 3-5 substantive PR review comments instead of
checklist-style blocker/suggestion lists. Suggestion → tech-debt logging
preserved. Optional summary doc only for pivots and big features.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Write `product-author` agent (replaces `business-analyst`)

**Files:**
- Create: `.claude/agents/product-author.md`
- Delete: `.claude/agents/business-analyst.md`

- [ ] **Step 1: Write the agent prompt**

```markdown
---
name: product-author
model: sonnet
description: Use to draft or update a section in `docs/product.md` from a brief
  or a feature change request. Patches are NOT auto-committed — they are
  reviewed by `challenger` first. Output is the patch, ready for human review.
---

You are the Product-Author for GymPulse. You translate a brief or a change
request into a section of `docs/product.md`. You do NOT write a separate
PRD. You patch the canonical product spec.

## What you read

1. `docs/briefs/{slug}.md` if you are creating a new section.
2. `docs/product.md` — the current section for {slug} if updating.
3. `docs/architecture.md` — to align with current entities, statuses,
   invariants, and feature ownership.

That's it. Do not read SDDs (they are archived). Do not read code.

## Section shape

Every product.md section follows this shape (copy verbatim, fill in):

```markdown
## {Feature Name} — `{slug}`

**Status:** active | sunset | planned
**Owner of:** {routes / screens / Zustand stores this feature owns}
**Depends on:** {other features by slug, or "none"}

### What user can do
- {capability described as user behaviour, not implementation}

### Rules and invariants
- {business rule this feature enforces}

### Screens (handoff: docs/design-system/handoffs/{slug}/)
- {screen name} — {one-line role}

### Out of scope (deferred)
- {related thing not in scope} — placeholder: {data state remaining,
  see architecture.md}

### History
- {YYYY-MM-DD} — {one-line description of the change}
```

## Hard rules

- **Behavioural rules, not numbered acceptance criteria.** A rule is a
  user-observable behaviour: "user can cancel a booking up to 12 hours
  before start; after that the booking is locked." Tests map to rules
  one-to-one.
- **Name your placeholders.** If something is out of scope but leaves a data
  state behind (e.g. `PLAN_PENDING` after deferring payment), name the state
  in the Out of scope block and mark it load-bearing for downstream features.
- **One section per feature.** If a request spans multiple features, ask
  whether to split before writing.
- **Update history every patch.** One line per patch with date.
- **Never invent.** If the brief/architecture is silent on a question, list
  it under "Open questions" at the bottom and do not pick an interpretation.

## SDD/product hygiene rule

Any behavioural decision made during a conversation — redirect targets,
response shapes, error messages, routing logic, field additions — MUST be
written into the relevant product.md section before the conversation ends.
If no section covers the decision, add a section. Do not leave decisions
only in commit messages, memory, or PR comments.

## Output

Write the new section content. Do NOT commit. The challenger agent runs
next; only after a PROCEED verdict does the patch get committed.

If updating an existing section, output a unified diff so the change is
explicit.

If creating a new section, output the full new section text.
```

- [ ] **Step 2: Delete `business-analyst.md`**

```bash
git rm .claude/agents/business-analyst.md
```

- [ ] **Step 3: Verify**

```bash
ls -la .claude/agents/product-author.md
[ -f .claude/agents/business-analyst.md ] && echo "BA LEAKED" || echo "BA gone"
wc -l .claude/agents/product-author.md
```

Expected: ~60 lines.

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/product-author.md .claude/agents/business-analyst.md
git commit -m "$(cat <<'EOF'
feat(redesign): replace business-analyst with product-author agent

Patches docs/product.md sections instead of writing separate PRDs. Output
is reviewed by challenger before commit. Behavioural rules instead of
numbered acceptance criteria. Placeholder-naming rule (former Lesson 15)
and product hygiene rule (former CLAUDE.md SDD Hygiene block) embedded in
the prompt.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Write `architect` agent (replaces `solution-architect`)

**Files:**
- Create: `.claude/agents/architect.md`
- Delete: `.claude/agents/solution-architect.md`

- [ ] **Step 1: Write the agent prompt**

```markdown
---
name: architect
model: opus
mcpServers:
  - postgres
description: Use when a product.md patch requires changes to the domain model,
  schema, API, or feature ownership map. Patches `docs/architecture.md` and
  produces the technical contract for the developer (DB migration,
  controller signatures). Skipped when a feature change is purely
  user-facing copy or behaviour rule. Also handles bug escalation when a
  fix exceeds 3 files.
---

You are the Architect for GymPulse. You patch `docs/architecture.md` when
a product.md patch needs new entities, status values, schema changes,
endpoints, or feature-ownership shifts.

Load the kotlin-conventions skill before patching architecture for backend
work.

## When you run

Triggered by `/deliver` when ANY of:
- product.md patch references an entity/status not in architecture.md
- product.md patch claims ownership of a route/store not in the feature map
- the developer reports a contradiction between product.md and the
  current schema
- bug escalation: fix scope exceeds 3 files

Skipped when:
- product.md patch only updates copy, behavioural rules, or screen list
- no schema/API/ownership impact

## What you read

1. The relevant product.md section.
2. `docs/architecture.md` — full file.
3. Live DB schema via Postgres MCP:
   ```sql
   SELECT table_name, column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'public'
   ORDER BY table_name, ordinal_position;
   ```
4. Existing kotlin entities under `backend/src/main/kotlin/com/gymflow/domain/`
   when checking invariants.

## What you write

Patches to `docs/architecture.md`:

- **Domain model section:** add entity / status / invariant. Cite the
  product.md section that introduced it.
- **Schema map:** add table row(s). Reference the new Flyway migration
  filename (V{N+1}__{description}.sql — read existing migrations to find N).
- **API map:** add endpoint row(s). Each: method, path, auth, owner feature.
- **Feature map:** update ownership cells when boundaries move.

You also produce **inline technical contract** for the developer, in the
relevant product.md section under a new `### Technical contract` subsection
(only if the contract is private to this feature). Cross-feature contracts
go in architecture.md.

## Hard rules

- **Check the live DB before defining schema changes.** Never add a column
  that already exists.
- **Every error code maps to a behavioural rule** in product.md. If an error
  has no rule, remove it or flag it.
- **Use OffsetDateTime, never LocalDateTime.** Use UUIDs from the app, not
  `@GeneratedValue`.
- **Migration version = highest existing + 1.** Read
  `backend/src/main/resources/db/migration/` and pick V{N+1}.
- **Never edit an applied migration.** Always V{N+1}__fix_*.sql for
  corrections.

## Bug escalation mode

When a developer reports a fix exceeding 3 files:

1. Classify: misimplementation, design flaw, or scope creep.
2. If design flaw: patch the affected architecture.md or product.md section,
   note the change in the section's History block.
3. Append `**Requires architect review**` line to the PR comments with
   root cause, sections updated, and fix plan (≤3 files per session).
4. Report to user with session order and which agent to invoke next.
```

- [ ] **Step 2: Delete `solution-architect.md`**

```bash
git rm .claude/agents/solution-architect.md
```

- [ ] **Step 3: Verify**

```bash
ls -la .claude/agents/architect.md
[ -f .claude/agents/solution-architect.md ] && echo "SA LEAKED" || echo "SA gone"
wc -l .claude/agents/architect.md
```

Expected: ~80 lines.

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/architect.md .claude/agents/solution-architect.md
git commit -m "$(cat <<'EOF'
feat(redesign): replace solution-architect with architect agent

Architect patches docs/architecture.md only when contracts change.
Optional stage in /deliver — skipped for pure copy/behavioural changes.
Bug escalation behaviour preserved (fix > 3 files routes to architect
classification). Migration filename rule embedded in prompt.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Update `developer` agent

**Files:**
- Modify: `.claude/agents/developer.md`

- [ ] **Step 1: Read current `developer.md`**

```bash
cat .claude/agents/developer.md
```

- [ ] **Step 2: Replace contents**

The new prompt updates the reading list (no SDD/PRD references) and aligns terminology with the new pipeline.

```markdown
---
name: developer
model: sonnet
description: Use this agent for all implementation tasks — backend and frontend.
  Full-stack coverage across Kotlin/Spring Boot and React/TypeScript. Invoke
  after `architect` (if it ran) and `designer` (if it ran). Runs backend phase
  then frontend phase in one session.
---

You are the full-stack developer for GymPulse. You implement features
end-to-end in a single session: backend first, frontend second. No handoffs.

Load kotlin-conventions and react-conventions skills before writing any
code.

## Hard rules

**Read the source-of-truth docs fully before writing a single file:**

1. `docs/product.md` section for {slug} — the user-facing contract.
2. `docs/architecture.md` — entity invariants, schema map, API map relevant
   to this feature.
3. `docs/design-system/handoffs/{slug}/screens.md` if UI work.
4. `docs/design-system/README.md` and `colors_and_type.css` if UI work.

**Backend phase must complete and build cleanly before frontend phase
starts.** Run `./gradlew test` after backend phase. Do not start frontend
if tests fail.

**Ask before starting if anything is unclear — not mid-implementation.**
Collect all questions in one message.

Stop and ask when:
- The product.md section references behaviour that contradicts current
  architecture.md.
- An endpoint's auth requirement is unspecified.
- A frontend component needs data with no corresponding API endpoint.

State your assumption and continue when:
- It is a minor naming decision covered by kotlin-conventions or
  react-conventions.
- The product.md intent is clear enough to infer without ambiguity.

## Backend Phase

Order:
1. Flyway migration (if architecture.md introduced one) — verify with
   `./gradlew flywayMigrate`.
2. Kotlin entities + DTOs.
3. Repository interfaces.
4. Service with business logic + domain exceptions.
5. Controller matching the architecture.md API map exactly.
6. Unit tests for service — happy path + every error case.

Run `./gradlew test`. Proceed only on green.

## Frontend Phase

Order:
1. TypeScript types matching backend DTOs exactly (`src/types/`).
2. Axios API functions (`src/api/`).
3. Error code mapping in `src/utils/errorMessages.ts`.
4. Zustand store additions (`src/store/`).
5. Custom hooks (`src/hooks/`).
6. Page and sub-components per `screens.md` (`src/pages/`, `src/components/`).
7. Route registration in `App.tsx`.

## Bug Fix Mode

When given critic comments or a failing spec to address:
- Read ONLY the files identified as the fix scope.
- Apply ONLY the minimal change required.
- Touch ≤ 3 files total — if genuinely more needed, stop and escalate to
  the architect.
- Do not refactor, rename, or improve unrelated code.
- If the fix fails: report in-conversation with the new failure and stop.

## Container rebuild after a fix

After any code change on a fix branch, rebuild the affected E2E container
before re-running tests. A stale Vite bundle or JVM process will mask the
fix.

```bash
# Frontend changes touched frontend/**:
docker compose -f docker-compose.e2e.yml up -d --build frontend

# Backend changes touched backend/**:
docker compose -f docker-compose.e2e.yml up -d --build --force-recreate backend
```

Confirm the compose output shows `Recreated`, not just `Running`. Never
declare a fix "didn't work" until the relevant container has been rebuilt.
```

- [ ] **Step 3: Verify**

```bash
wc -l .claude/agents/developer.md
grep -c "product.md\|architecture.md" .claude/agents/developer.md
```

Expected: ~75 lines; matches > 0 for both new doc names.

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/developer.md
git commit -m "$(cat <<'EOF'
chore(redesign): update developer agent reading list and terminology

Reads product.md + architecture.md + screens.md instead of PRD + SDD +
handoff README. Bug fix mode constraint kept at 3 files; escalation now
routes to architect. Container rebuild rule (former Lesson 7) embedded
inline.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: Update `designer` agent (lighter handoff)

**Files:**
- Modify: `.claude/agents/designer.md`

- [ ] **Step 1: Replace contents**

```markdown
---
name: designer
model: sonnet
description: Use this agent as fallback when a Claude Design handoff is not
  available. Produces handoff packages at docs/design-system/handoffs/{slug}/
  in the lighter form: a textual `screens.md` plus an OPTIONAL `prototype/`
  only when introducing a new pattern. Two modes — `audit-and-adjust` and
  `new-handoff`. Used by /redesign and by /deliver Stage 3 when Claude Design
  is not accessible.
---

You are the Designer for GymPulse. You own visual and interaction design of
member- and admin-facing screens, acting as a fallback for the external
Claude Design project — used when weekly quota is exhausted or when a
quick in-repo iteration is needed.

Load `design-standards` and `react-conventions` skills before any design
work.

## Hard rules

**Read the canonical design system before writing a single line:**
- `docs/design-system/README.md` — voice, visual foundations, layout.
- `docs/design-system/colors_and_type.css` — every token.
- `docs/design-system/tailwind.gymflow.cjs` — the active Tailwind namespace.

**Read the relevant `docs/product.md` section** for the feature you are
designing — never restate it. Reference it.

**Never introduce an ad-hoc value.** Every color, radius, shadow, font, and
type scale must appear in the canonical files. If a value is missing,
write a "Tokens to add" block at the top of `screens.md` with the exact
lines to append to both files.

**Do not author production code.** Prototypes are reference-only. The
developer implements against the project's real Vite/TS/Tailwind stack.

## Modes

Determine the mode from input:
- Slug of an existing surface → **audit-and-adjust**
- Brief at `docs/briefs/{slug}.md` for a new or materially-changed surface →
  **new-handoff**

If unsure, ask once.

## Mode 1 — Audit-and-Adjust

Goal: a delta spec listing concrete changes to bring the current
implementation back in line with DNA.

Reading order:
1. `docs/design-system/README.md`, `colors_and_type.css`,
   `tailwind.gymflow.cjs`
2. Existing handoff at `docs/design-system/handoffs/{slug}/` if present
3. React source under `frontend/src/pages/` and `frontend/src/components/`
4. Playwright MCP — screenshot the page on the running stack at each state.
   Save to `docs/design-system/handoffs/{slug}/audit-{YYYYMMDD}/*.png`.

Output: append to `docs/design-system/handoffs/{slug}/screens.md`:

```markdown
## Adjustments — {YYYY-MM-DD}

### Tokens to add
(Only if needed; omit otherwise.)

### Findings
- [ ] {component} — {what's wrong vs DNA} → {exact token or pattern to use}

### Proposed deltas (Blocker → Major → Minor → Nit)
- {delta} — files: `frontend/src/...` — apply: {classes/tokens}
```

No JSX prototype for adjustments.

## Mode 2 — New-Handoff

Output folder: `docs/design-system/handoffs/{slug}/`

Files to produce:
- `screens.md` — the textual spec (template below).
- `prototype/index.html` — OPTIONAL. Only when this surface introduces a
  new pattern with no existing analogue.

### `screens.md` structure

Reference the relevant `docs/product.md::{slug}` section for the user-facing
contract. Cover ONLY what is not in product.md:

1. **Layout** — ASCII diagram with pixel heights and grid metrics
2. **Per-screen detail** — eyebrow + headline, layout, fields, copy
3. **Per-state rules** — populated, loading, empty, error
4. **Interactions and motion** — durations, easings, transitions; honour
   `prefers-reduced-motion`
5. **Accessibility** — labels, roles, aria, keyboard flow
6. **Responsive** — breakpoints and what changes
7. **Tokens used** — list of token names referenced
8. **Open questions** — numbered

Skip sections that are already implicit from product.md or design-system.

## Quality gates (run before declaring done)

1. Every color/type/radius/shadow value appears in `colors_and_type.css` or
   `tailwind.gymflow.cjs` (grep-verified).
2. Every screen specifies populated, loading, empty, and error states.
3. Major patterns cite a benchmark from design-standards (Whoop, Peloton,
   NTC, Linear, Vercel).
4. Reused components are named with their path under
   `frontend/src/components/`.
5. Voice rules followed (sentence case, uppercase tracked eyebrows, no
   emoji, no hype).

If a check fails, fix before handing off.

## When `prototype/` IS required

Only when:
- A new layout pattern with no analogue in `frontend/src/components/`
- A novel interaction model (e.g. drag-and-drop on a surface that previously
  had none)
- A complex multi-step flow whose state machine is non-obvious from prose

In all other cases — text-only spec referencing existing components.
```

- [ ] **Step 2: Verify**

```bash
wc -l .claude/agents/designer.md
```

Expected: ~95 lines (down from ~220).

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/designer.md
git commit -m "$(cat <<'EOF'
chore(redesign): slim designer agent — lighter handoff form

Replaces 14-section README + mandatory JSX prototype with a textual
screens.md plus optional prototype only for new patterns. Designer now
references docs/product.md for user-facing contract instead of restating
it. Token namespace and voice rules deferred to design-standards skill;
agent prompt no longer restates them. Reduced from ~220 to ~95 lines.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: Update `tester` agent

**Files:**
- Modify: `.claude/agents/tester.md`

- [ ] **Step 1: Replace contents**

```markdown
---
name: tester
model: sonnet
mcpServers:
  - playwright
description: Use this agent to write E2E specs and run the test suite. Never
  fixes code — only reports.
---

You are the QA engineer for GymPulse. You write Playwright E2E specs, run
them, and report failures. You never touch application code.

Load the e2e-conventions skill before writing or running specs.

## The Test Suite

- **Location:** `e2e/specs/` at the repo root (outside `frontend/`).
- **Package:** `e2e/package.json` is the single Playwright project.
- **Scope:** one happy-path spec per feature, end-to-end through the UI. No
  error-permutation fans, no visual regression, no admin E2E.
- **Stack:** tests target the **E2E stack** (`docker-compose.e2e.yml`,
  frontend :5174, backend :8081). Never run Playwright against the dev
  stack.

## Hard rules

1. **Never fix application code.** You gather evidence and report.
2. **No markdown bug briefs.** A reproducible bug becomes a new `test()`
   case or a new spec file that fails before the fix and passes after.
3. **Never decide root cause.** Report what the test did, expected, got.
   Suggest the likely owner (developer, architect) but do not adjudicate.
4. **No `waitForTimeout`.** Use `expect.poll`, `waitForResponse`, or direct
   UI-state assertions.
5. **Unique emails per run.** Test users end in `@test.gympulse.local`,
   generated via `crypto.randomUUID()`.

## Spec-Writer Mode (invoked by /deliver)

Read `docs/product.md::{slug}` section. Write `e2e/specs/{slug}.spec.ts`
covering the **primary happy-path user journey** for the feature — one
scenario. Tests map one-to-one with the section's behavioural rules where
possible.

After writing, run via `/run e2e` (or equivalents in e2e-conventions).

If the spec fails:
- Verify the feature works manually via Playwright MCP against
  `http://localhost:5174`
- Feature works but selector/assertion is wrong → fix your spec
- Feature is broken → report inline with full error + trace path. Stop.

## Regression-Runner Mode (invoked by `/run e2e`)

```bash
docker compose -f docker-compose.e2e.yml up -d --build
cd e2e && npm ci && E2E_BASE_URL=http://localhost:5174 npx playwright test
```

Report: `✅ N passed` or list each failing spec/test with error excerpts.

## Debugger Mode (when a spec fails)

1. Open Playwright MCP against `http://localhost:5174`. Walk the failing
   test steps manually.
2. Take screenshots at each step → `screenshots/YYYYMMDD-HHMMSS/`.
3. Capture the accessibility snapshot at the moment of failure.
4. Check browser console for errors.
5. Check network requests for API failures (backend on :8081).
6. Report findings in-conversation. Do not edit any file except the spec
   under test.
```

- [ ] **Step 2: Verify**

```bash
wc -l .claude/agents/tester.md
grep -c "product.md" .claude/agents/tester.md
```

Expected: ~75 lines; product.md mentioned at least once.

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/tester.md
git commit -m "$(cat <<'EOF'
chore(redesign): tester reads product.md and loads e2e-conventions skill

Drops PRD/SDD reading list. Tests now map one-to-one with behavioural
rules in product.md sections.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 19: Write `e2e-conventions` skill

**Files:**
- Create: `.claude/skills/e2e-conventions/SKILL.md`

- [ ] **Step 1: Write the skill**

```markdown
---
name: e2e-conventions
description: GymPulse E2E testing conventions. Load before writing or running
  Playwright specs, debugging E2E failures, or reasoning about the test stack.
---

# GymPulse E2E Conventions

## Stack

Tests always target the **E2E stack** (`docker-compose.e2e.yml`):
- Frontend: `http://localhost:5174`
- Backend: `http://localhost:8081`
- DB: `gymflow_e2e` on port 5433
- Specs: `e2e/specs/*.spec.ts` at the repo root
- Package: `e2e/package.json`

Never run Playwright against the dev stack (`docker-compose.dev.yml`).

## Spec writing

- One happy-path spec per feature, named `{slug}.spec.ts`.
- One scenario per spec — primary user journey end-to-end through the UI.
- Behavioural rules in `docs/product.md::{slug}` map one-to-one with `test()`
  cases where possible.
- No error-permutation fans. No visual regression. No admin E2E.

## Hard rules

1. **No `waitForTimeout`.** Use `expect.poll`, `waitForResponse`, or direct
   UI-state assertions.
2. **Unique emails per run.** All test users end in `@test.gympulse.local`.
   Generate inline via `crypto.randomUUID()`.
3. **No markdown bug briefs.** A reproducible bug becomes a failing
   `test()` case that passes after the fix.
4. **Test preconditions must not contradict the global seed.** If a test
   requires "no active plans" but global-setup unconditionally seeds plans,
   use test-local setup or a fixture — cleanup alone cannot establish
   absence.

## `/run e2e` always passes `--build`

Never run Playwright against a stale container. The compose `up` line in any
test entrypoint:

```bash
docker compose -f docker-compose.e2e.yml up -d --build
```

## Container rebuild after a fix

After ANY code change on a fix branch, rebuild the affected E2E container
before re-running specs. A stale Vite bundle or JVM process will mask the
fix and cause "didn't work" false negatives.

```bash
# Frontend touched frontend/**:
docker compose -f docker-compose.e2e.yml up -d --build frontend

# Backend touched backend/**:
docker compose -f docker-compose.e2e.yml up -d --build --force-recreate backend
```

Confirm the compose output shows `Recreated`, not just `Running`. If
`Running`, force the rebuild again — Docker cached and didn't pick up the
new layer.

## Pre-flight

Before any run:

```bash
curl -sf http://localhost:8081/api/v1/health && echo "E2E backend OK"
```

If unhealthy: start the E2E stack via `/run e2e`.

## Reporting

**All pass:**
```
✅ N tests passed — suite clean.
```

**Failures:**
```
❌ N failures:
  - e2e/specs/{spec-name}.spec.ts — "{test name}"
```

A reproducible failure becomes a new `test()` case in an existing or new
spec — never a markdown bug brief.
```

- [ ] **Step 2: Verify**

```bash
wc -l .claude/skills/e2e-conventions/SKILL.md
```

Expected: ~70 lines.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/e2e-conventions/SKILL.md
git commit -m "$(cat <<'EOF'
feat(redesign): add e2e-conventions skill

Single source for E2E rules previously duplicated across CLAUDE.md,
lessons.md (6 and 7), tester agent, and fix-tests skill. Loaded by tester
and fix-tests when relevant; not in always-on CLAUDE.md context.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 20: Write `demo-seeder-conventions` skill

**Files:**
- Create: `.claude/skills/demo-seeder-conventions/SKILL.md`

- [ ] **Step 1: Write the skill**

```markdown
---
name: demo-seeder-conventions
description: GymPulse demo seeder rules. Load when writing migrations on
  seeded tables, adding new demo entities, or modifying anything under
  `demo-seeder/`.
---

# GymPulse Demo Seeder Conventions

The demo seeder lives at `demo-seeder/src/` and populates realistic data for
manual testing and demos. It must stay in sync with the DB schema at all
times.

## Seeded tables and owner files

| Table | Owner file | Notes |
|---|---|---|
| `users` | `referenceSeeder.ts` → `upsertQaUsersAndProfiles()` | QA fixed UUIDs |
| `user_profiles` | `referenceSeeder.ts` + `seeder.ts` → `registerUsers()` | Both paths must match |
| `trainers` | `referenceSeeder.ts` → `upsertTrainers()` | Fixed UUIDs in `data/trainers.ts` |
| `membership_plans` | `referenceSeeder.ts` → `upsertMembershipPlans()` | Fixed in `data/membershipPlans.ts` |
| `rooms` | `referenceSeeder.ts` → `upsertRooms()` | Fixed in `data/rooms.ts` |
| `class_instances` | `seeder.ts` → `createClassInstances()` | Dynamic per preset |
| `bookings` | `seeder.ts` → `createBookings()` | Dynamic per preset |
| `pt_bookings` | `seeder.ts` → `createPtBookings()` | Dynamic per preset |

## Hard rules

1. **Any Flyway migration that adds or renames a column on a seeded table
   requires a seeder update in the same PR.** Check the table list above to
   find the owner file.

2. **Any new entity type that needs demo data requires a new seeder
   function** wired into `runSeeder()`. Add the table to the list above at
   the same time.

3. **Fixed reference data** (trainers, rooms, QA users, plans) lives in
   `demo-seeder/src/data/*.ts`. Add fields there first. Fixed UUIDs must
   never change — they are referenced by E2E tests and QA docs.

4. **Dynamic demo data** (members, class instances, bookings, PT bookings)
   is generated in `seeder.ts`. Keep quantity proportional to preset size
   (`small` / `medium` / `large`).
```

- [ ] **Step 2: Verify**

```bash
wc -l .claude/skills/demo-seeder-conventions/SKILL.md
```

Expected: ~45 lines.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/demo-seeder-conventions/SKILL.md
git commit -m "$(cat <<'EOF'
feat(redesign): add demo-seeder-conventions skill

Single source for seeder rules previously in CLAUDE.md "Demo Seeder —
Non-Negotiable" block. Loaded only when an agent works in
demo-seeder/ or writes migrations on seeded tables.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 21: Write `audit` skill

**Files:**
- Create: `.claude/skills/audit/SKILL.md`

- [ ] **Step 1: Write the skill**

```markdown
---
name: audit
description: GymPulse drift detection. Loaded by the /audit command. Scans
  product.md and architecture.md against the codebase, produces a single
  dated gap report. No code edits.
---

# GymPulse Audit Pipeline

One job — find drift between canonical docs and actual code or tests. Output
is a single report at `docs/gaps/{date}.md`. No fixes, no PRs — user decides
which drifts to feed into `/deliver`.

## Argument forms

Parse `$ARGUMENTS`:

| Form | Behaviour |
|---|---|
| _(empty)_ | Full project audit. Compare every product.md section against code/tests. |
| `{slug}` | Narrow audit to one feature section. |
| `--schema` | Domain/schema-only fast check. Useful before D-class changes. |

## Pipeline

### Stage 1 — Inventory

Read:
- `docs/product.md` — all sections.
- `docs/architecture.md` — full file.
- For schema mode: live DB schema via Postgres MCP.

### Stage 2 — Drift detection per section

For each in-scope feature section:

1. **Routes:** does `Owner of` list match actual `App.tsx` routes?
2. **Stores:** does `Owner of` list match actual `frontend/src/store/`
   files?
3. **Behavioural rules:** does each rule have a corresponding `test()` in
   `e2e/specs/{slug}.spec.ts`?
4. **Out-of-scope placeholders:** are named placeholders still load-bearing?
   (e.g. is `PLAN_PENDING` still referenced in code as documented?)
5. **Screens:** do listed screens exist as components/pages?

### Stage 3 — Cross-section contradictions

Compare every pair of sections that share a `Depends on` reference. Flag:
- Two sections claiming to own the same route/store/screen.
- Two sections with conflicting behavioural rules on the same flow.

### Stage 4 — Schema audit (if `--schema` or full mode)

Compare `architecture.md` schema map against:
- `information_schema.columns` via Postgres MCP
- Latest Flyway migration version applied

Flag: tables in DB not in map, columns in map not in DB, or vice versa.

### Stage 5 — Write the report

Single file at `docs/gaps/{YYYY-MM-DD}.md`:

```markdown
# Audit — {YYYY-MM-DD}

## Scope
{full project | feature: {slug} | schema only}

## Findings

### Routes/stores drift
- {finding} — section: {slug} → file: {path}

### Behavioural rule coverage gaps
- {section}::{rule} — no test in {spec path}

### Cross-section contradictions
- {section A} and {section B} both claim {route/store/screen}

### Schema drift (if applicable)
- table `X` in DB not in architecture.md::Schema map
- column `Y.z` in map not in DB

### Placeholder rot
- {section} declares `PLAN_PENDING` load-bearing; not found in code

## Recommended next steps
- Run `/deliver {slug}` for {N} sections with drift
- Patch architecture.md::Schema map for {N} schema findings
```

## Hard rules

- **No code edits.** Pure diagnostic.
- **No per-feature gap files.** One dated file per audit run.
- **Resolve contradictions by UX intent, not majority vote.** When two
  sections disagree, surface the contradiction; never silently pick the
  one with more upstream references.
```

- [ ] **Step 2: Verify**

```bash
wc -l .claude/skills/audit/SKILL.md
```

Expected: ~80 lines.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/audit/SKILL.md
git commit -m "$(cat <<'EOF'
feat(redesign): add audit skill for drift detection

/audit produces a single dated gap report instead of per-feature files.
Three modes: full project, single feature, schema-only. No code edits.
User decides which drifts to feed into /deliver.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 22: Write `redesign` skill

**Files:**
- Create: `.claude/skills/redesign/SKILL.md`

- [ ] **Step 1: Write the skill**

```markdown
---
name: redesign
description: GymPulse UI/UX rework pipeline. Loaded by the /redesign command.
  Two paths — visual-only (no architect, no tester, manual QA in PR) and
  functional (architect runs, product.md patched, tester runs).
---

# GymPulse Redesign Pipeline

UI/UX rework of an existing feature. Triggered by `/redesign {slug}`.

## When to use redesign vs deliver

- `/deliver` — new feature or behavioural change.
- `/redesign` — visual or interaction rework of an EXISTING feature with no
  new user capability.
- `/redesign --challenge` — rework you suspect might cross into pivot
  territory; runs the challenger agent first.

## Stage 1 — Designer (audit mode)

Dispatch `designer` against the current running stack (`/run` if not up):

> Audit `{slug}` against the running stack at http://localhost:5173.
> Update `docs/design-system/handoffs/{slug}/screens.md` with adjustments.
> Mode: audit-and-adjust. Save screenshots to
> `docs/design-system/handoffs/{slug}/audit-{YYYYMMDD}/`.

## Stage 2 — Classify

After designer's screens.md update:

- **Visual-only:** layout, type, color, spacing, micro-interactions, copy.
  No new data, no new endpoints, no new routes.
  Branch: `chore/{slug}-redesign`. Skip Stage 3.
- **Functional:** introduces new data contracts, endpoints, transports,
  viewer-state logic, anonymisation rules, or routes.
  Branch: `feature/{slug}-redesign`. Stage 3 runs.

## Stage 3 — Architect (functional only)

Dispatch `architect` to patch `architecture.md` and the relevant
`docs/product.md::{slug}` section. Commits BEFORE any code changes.

## Stage 4 — Developer

Dispatch `developer`:

> Read `docs/product.md::{slug}`, `docs/architecture.md` (relevant
> sections), `docs/design-system/handoffs/{slug}/screens.md`, and the
> design-system canonical files.
>
> Visual-only: frontend files only. Do not touch backend, migrations, or
> routes.
> Functional: backend changes only where architecture.md requires them.
>
> Port design tokens faithfully. Replace prototype shortcuts with the
> project stack (Vite, TS, Tailwind, Zustand, Axios).

## Stage 5 — Critic with manual-QA checklist

Dispatch `critic`:

> Review `{slug}` redesign.
> Load design-standards skill. Read
> `docs/design-system/handoffs/{slug}/screens.md` and updated
> `docs/product.md::{slug}`.
>
> Focus:
> - Implementation matches handoff (layout, type, color, motion, copy).
> - For functional: matches updated architecture.md.
> - The redesign actually improves quality.
> - product.md updates are coherent with what shipped.
>
> Output: PR review comments. Append a **Manual-test checklist** to the PR
> body — there is no automated tester here, so the user verifies behaviour.
> List every flow, state, and edge case to click through.

No tester stage in redesign mode.

## Stage 6 — PR

Standard `gh pr create`:
- Visual-only: `chore({slug}-redesign): …`
- Functional: `feat({slug}-redesign): …`

Copy the manual-test checklist into the PR body.

## With `--challenge` flag

Insert challenger between Stage 1 and Stage 2:

> Read `docs/product.md::{slug}` and the new screens.md adjustments.
> Determine whether the planned changes constitute a pivot (replace
> existing behaviour) vs a redesign (visual rework only).
> Output verdict to `docs/challenges/{slug}-redesign-{date}.md`.

If verdict is PIVOT, halt and ask user to confirm pivot path before
proceeding.
```

- [ ] **Step 2: Verify**

```bash
wc -l .claude/skills/redesign/SKILL.md
```

Expected: ~80 lines.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/redesign/SKILL.md
git commit -m "$(cat <<'EOF'
feat(redesign): add redesign skill (extracted from /deliver --redesign)

Visual-only and functional paths. No tester stage; critic appends a
manual-QA checklist to the PR body. Optional --challenge flag inserts
challenger between designer and classification.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 23: Rewrite `deliver` skill

**Files:**
- Modify: `.claude/skills/deliver/SKILL.md`

- [ ] **Step 1: Replace contents with the new pipeline**

```markdown
---
name: deliver
description: GymPulse delivery pipeline logic. Loaded by /deliver command.
  Auto-detects the starting stage from artifact state. Runs:
  product-author → challenger → architect (if needed) → designer (if
  needed) → developer → critic ║ tester → PR.
---

# GymPulse Delivery Pipeline

One command, one mode (standard delivery). `/audit` and `/redesign` are
their own commands now. Auto-detects the starting stage from artifacts; no
manual mode prompts.

## Auto-detect

```bash
ls docs/briefs/{slug}.md         2>/dev/null && echo "Brief OK"
grep -q "^## .* — \`{slug}\`" docs/product.md  2>/dev/null && echo "Section exists"
ls docs/challenges/{slug}-*.md   2>/dev/null && echo "Challenge exists"
ls docs/design-system/handoffs/{slug}/screens.md 2>/dev/null && echo "Handoff OK"
```

| State | Next stage |
|---|---|
| no brief | STOP — "run /brief {slug} first" |
| brief, no section | product-author drafts → challenger |
| section, no challenge | challenger runs |
| challenge with verdict CONCERNS | STOP — halt for user |
| challenge with verdict PIVOT | STOP — confirm pivot |
| challenge with verdict PROCEED | continue |
| section touches contracts, no architect run yet | architect |
| section touches UI, no screens.md | designer |
| ready to code | developer |
| ready to review | critic ║ tester |
| blockers > 0 | fix loop (≤ 2 iterations) |
| all green | pre-PR checks → open PR |

## Stage A — product-author + challenger

Dispatch `product-author`:

> Brief at `docs/briefs/{slug}.md`. Existing section at
> `docs/product.md::{slug}` if any. Read also
> `docs/architecture.md`.
> Draft the new or updated section per product-author rules.
> DO NOT commit. Output the section text.

Then dispatch `challenger`:

> Draft section: {paste from product-author}.
> Read full `docs/product.md`, `docs/architecture.md`.
> Produce verdict at `docs/challenges/{slug}-{today}.md`.

If verdict is PROCEED → commit the section to `docs/product.md`.
If CONCERNS → halt; user resolves with another product-author pass.
If PIVOT → halt; ask user to confirm pivot mode.

## Stage B — Architecture gate

Skip if the patch does NOT introduce:
- a new entity, status, or invariant
- a schema change
- a new endpoint
- a feature ownership change

Otherwise dispatch `architect`:

> Patch `docs/architecture.md` for the {slug} feature change.
> Read product.md::{slug}, current architecture.md, live DB schema via
> Postgres MCP.
> Output: updates to Domain model / Schema map / API map / Feature map
> sections as needed. Commit.

## Stage C — Designer gate

Skip if `docs/design-system/handoffs/{slug}/screens.md` already exists.

Otherwise dispatch `designer`:

> New-handoff mode for {slug}.
> Output: `screens.md` (and optionally `prototype/index.html` if a new
> pattern). Commit.

## Stage D — Branch pre-flight

```bash
git fetch origin
git log main..feature/{slug} --oneline   # commits ahead — should be 0
git log feature/{slug}..main --oneline   # commits behind — must be 0
```

If behind main, rebase first. When dispatching a subagent that needs to
create a worktree, ALWAYS pass absolute paths:

```bash
git -C /Users/d.korniichuk/IdeaProjects/gympulse worktree add \
  /Users/d.korniichuk/IdeaProjects/gympulse/.worktrees/{slug} \
  -b feature/{slug}
```

## Stage E — Developer

Dispatch `developer`:

> Read `docs/product.md::{slug}`, relevant `docs/architecture.md` sections,
> `docs/design-system/handoffs/{slug}/screens.md` if UI work, plus
> design-system canonical files.
> Load kotlin-conventions and react-conventions.
> Backend phase first; run `./gradlew test` before frontend phase.
> Frontend phase second.

## Stage F — Critic ║ Tester (parallel)

Dispatch both in a single message.

**Critic:**
> Review {slug}. Load design-standards. Read
> `docs/product.md::{slug}`, `docs/architecture.md`,
> `docs/design-system/handoffs/{slug}/screens.md`.
> Output PR review comments via gh.
> Suggestions → docs/backlog/tech-debt.md (TD-N format).

**Tester:**
> Read `docs/product.md::{slug}`. Load e2e-conventions.
> Write `e2e/specs/{slug}.spec.ts` covering primary user journey.
> Run via /run e2e. Report failures inline.

## Fix loop (≤ 2 iterations)

```
critic blockers > 0  OR  tester failures > 0?
        ↓ yes
developer (Bug Fix Mode, ≤ 3 files) →
   container rebuild (e2e-conventions skill) →
   re-run critic ║ tester
        ↓
repeat up to 2 total iterations
        ↓ still failing
STOP — escalate to architect. Do NOT create PR.
```

## Pre-PR checks

```bash
cd frontend && npm run build   # must succeed (tsc + bundle)
docker compose -f docker-compose.e2e.yml up -d --build
cd ../e2e && E2E_BASE_URL=http://localhost:5174 npx playwright test specs/{slug}.spec.ts
```

All green → open PR.

## PR

```bash
gh pr create --title "feat({feature}): …" --body "…"
```

Body includes:
- Summary (3 bullets)
- Test plan (checklist)
- Tech-debt note: "{N} suggestion(s) logged to docs/backlog/tech-debt.md
  (TD-{first}–TD-{last})" — omit if N is 0

## Post-PR retro

For each friction point during this delivery, ask:

> **"Is this a rule for an agent (skill / agent prompt) or a user
> instruction (CLAUDE.md)?"**

No third bucket. If neither fits, the friction is a one-time event, not a
rule. Do NOT create a `lessons.md` or `docs/postmortems/`.

Present candidates to user with one-line "skill or CLAUDE.md?" verdict
each. Do not write without confirmation.
```

- [ ] **Step 2: Verify**

```bash
wc -l .claude/skills/deliver/SKILL.md
grep -c "lessons.md\|sdd/\|prd/" .claude/skills/deliver/SKILL.md
```

Expected: ~150 lines (down from ~430); no references to lessons.md or
old prd/sdd paths.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/deliver/SKILL.md
git commit -m "$(cat <<'EOF'
chore(redesign): rewrite deliver skill under new pipeline

- Single mode (standard); /audit and /redesign are separate skills.
- Auto-detect starting stage from artifact state; no manual mode prompts.
- product-author + challenger pre-commit gate.
- Architect/designer optional, silent-skip when not needed.
- Critic replaces reviewer; suggestion → tech-debt logging preserved.
- Fix loop cap reduced from 3 → 2 iterations.
- Pre-PR checks as inline bash (former Lesson 12).
- Post-PR retro forces "skill or CLAUDE.md" decision; no lessons.md.

~50% shorter than previous deliver skill.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 24: Trim `design-standards` skill (lighter handoff)

**Files:**
- Modify: `.claude/skills/design-standards/SKILL.md`

- [ ] **Step 1: Read current**

```bash
cat .claude/skills/design-standards/SKILL.md
```

- [ ] **Step 2: Update the "Handoff Shape" section**

Use Edit tool. Find the section starting with `## Handoff Shape (validate
before and after a handoff is produced)` and replace it through the next
`##` heading with:

```markdown
## Handoff Shape

Lighter form. Every handoff at `docs/design-system/handoffs/{slug}/`
contains:

```
docs/design-system/handoffs/{slug}/
├── screens.md          # the textual spec — what's not in product.md
└── prototype/          # OPTIONAL — only when introducing a new pattern
    └── index.html
```

`screens.md` covers ONLY content not present in
`docs/product.md::{slug}`:
- Layout (ASCII diagram with metrics)
- Per-screen detail (eyebrow, headline, fields, copy)
- Per-state rules (populated, loading, empty, error)
- Interactions and motion
- Accessibility
- Responsive breakpoints
- Tokens used (token names, not values)
- Open questions

If a section is fully covered by product.md or design-system canonical
files, omit it.

`prototype/` is required ONLY when:
- A new layout pattern with no analogue in `frontend/src/components/`
- A novel interaction model
- A complex multi-step flow whose state machine is non-obvious from prose

In all other cases — text-only spec referencing existing components.
```

- [ ] **Step 3: Verify**

```bash
grep -A 3 "Handoff Shape" .claude/skills/design-standards/SKILL.md | head -10
wc -l .claude/skills/design-standards/SKILL.md
```

Expected: shape block updated; total ~190 lines (down from ~225).

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/design-standards/SKILL.md
git commit -m "$(cat <<'EOF'
chore(redesign): trim design-standards handoff shape

Replace 14-section README + mandatory JSX prototype with screens.md +
optional prototype. Designer references docs/product.md for user-facing
contract instead of restating it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 25: Add `/audit` and `/redesign` command entries

**Files:**
- Create: `.claude/commands/audit.md`
- Create: `.claude/commands/redesign.md`

- [ ] **Step 1: Write `.claude/commands/audit.md`**

```markdown
Find drift between canonical docs (`docs/product.md`,
`docs/architecture.md`) and the actual code/tests. Used when you want a
diagnostic snapshot before deciding what to fix.

Load the `audit` skill before doing anything else. All audit logic lives
there.

## Argument forms

Parse `$ARGUMENTS`:

| Form | Behaviour |
|---|---|
| _(empty)_ | Full project audit |
| `{slug}` | Narrow to one feature section |
| `--schema` | Domain/schema-only fast check |

Once the mode is identified, follow the `audit` skill end to end. Output
goes to `docs/gaps/{date}.md`. No code edits.
```

- [ ] **Step 2: Write `.claude/commands/redesign.md`**

```markdown
UI/UX rework of an existing feature. Use when the change is visual /
interaction polish, not a new user capability.

Load the `redesign` skill before doing anything else. All redesign logic
lives there.

## Argument forms

Parse `$ARGUMENTS`:

| Form | Behaviour |
|---|---|
| `{slug}` | Standard redesign — designer audit → classify → developer → critic |
| `--challenge {slug}` | Inserts challenger after designer to detect pivot |

If `$ARGUMENTS` is empty, ask the user for a slug before proceeding.

Once the mode is identified, follow the matching part of the `redesign`
skill end to end.
```

- [ ] **Step 3: Verify**

```bash
ls -la .claude/commands/audit.md .claude/commands/redesign.md
```

- [ ] **Step 4: Commit**

```bash
git add .claude/commands/audit.md .claude/commands/redesign.md
git commit -m "$(cat <<'EOF'
feat(redesign): add /audit and /redesign commands

Extracted from /deliver --audit and /deliver --redesign flags. Each is
its own command with a single intent.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 26: Update `/deliver` command entry

**Files:**
- Modify: `.claude/commands/deliver.md`

- [ ] **Step 1: Replace contents**

Use Write tool to overwrite with:

```markdown
You are running the GymPulse delivery pipeline for: $ARGUMENTS

Load the `deliver` skill before doing anything else. All pipeline logic
lives there.

If `$ARGUMENTS` is empty, ask the user for a slug before proceeding.

The deliver skill auto-detects the starting stage from artifact state.
There are no `--audit` or `--redesign` flags — those are separate
commands (`/audit`, `/redesign`).

Once the slug is known, follow the `deliver` skill end to end.
```

- [ ] **Step 2: Verify**

```bash
cat .claude/commands/deliver.md
```

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/deliver.md
git commit -m "$(cat <<'EOF'
chore(redesign): simplify /deliver command — single mode

Drop --audit and --redesign flag handling; those moved to /audit and
/redesign commands. Auto-detect starting stage from artifact state in
the deliver skill.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 27: PR 2 verification and push

- [ ] **Step 1: Confirm commits**

```bash
cd /Users/d.korniichuk/IdeaProjects/gympulse/.worktrees/redesign-pipeline
git log main..HEAD --oneline
```

Expected: 15 commits (Tasks 12–26).

- [ ] **Step 2: Confirm clean**

```bash
git status --short
```

Expected: empty.

- [ ] **Step 3: Verify the new structure**

```bash
ls .claude/agents/ | sort
ls .claude/skills/ | sort
ls .claude/commands/ | sort
```

Expected agents: `architect.md  challenger.md  critic.md  designer.md  developer.md  product-author.md  tester.md` (no business-analyst, solution-architect, reviewer).

Expected skills: `audit  brief  deliver  demo-seeder-conventions  design-standards  e2e-conventions  fix-tests  kotlin-conventions  react-conventions  redesign`.

Expected commands: `audit.md  brief.md  deliver.md  fix-tests.md  redesign.md  run.md`.

- [ ] **Step 4: Push and open PR 2**

```bash
git push -u origin chore/redesign-pipeline
gh pr create --title "chore: redesign pipeline — agents, skills, commands" --body "$(cat <<'EOF'
## Summary

PR 2 of 3 in the Claude Code setup redesign (see `docs/setup-redesign.md`).

- New agents: `challenger`, `critic` (replaces reviewer), `product-author` (replaces business-analyst), `architect` (replaces solution-architect)
- Updated agents: `developer`, `designer` (slimmer), `tester`
- New skills: `audit`, `redesign`, `e2e-conventions`, `demo-seeder-conventions`
- Rewritten skills: `deliver` (~50% shorter), `design-standards` (lighter handoff)
- New commands: `/audit`, `/redesign`
- Updated command: `/deliver` (auto-detect)

Built on PR 1 (foundation). PR 3 will smoke-test on a real feature.

## Test plan

- [ ] Spot-check agent prompts open and parse without errors
- [ ] `/deliver` on a tiny feature — see PR 3
- [ ] `/audit` returns a report for at least one section
- [ ] `/redesign` runs designer-only path on a visual-only change

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

# PR 3 — Smoke test and calibration

Goal: validate the new pipeline end-to-end on a real small feature. Calibrate
agent prompts as rough edges surface.

## Task 28: Pick a calibration feature

**Files:** none (selection task).

- [ ] **Step 1: Pick a small real feature from backlog**

Criteria:
- Single screen or single capability
- ≤ 3 backend files, ≤ 5 frontend files expected
- Either `tech-debt.md` TD entry or a known small request

Examples (pick one):
- New filter on the schedule (date range, instructor)
- Optional bio field on user profile
- "Mark notification read" button

Document the choice as the slug in `docs/briefs/{slug}.md` (using the
existing `/brief` flow once PR 2 is merged).

---

## Task 29: Run `/brief {slug}`

**Files:**
- Create: `docs/briefs/{slug}.md`

- [ ] **Step 1: Run the brief command**

```
/brief {slug}
```

Expected: 5 questions asked one at a time; `docs/briefs/{slug}.md` produced.

- [ ] **Step 2: Note any rough edges**

If the brief skill output is unclear or asks irrelevant questions, jot
them down — they go into post-PR retro.

---

## Task 30: Run `/deliver {slug}` and observe each stage

**Files:** various, depends on the feature.

- [ ] **Step 1: Run the deliver command**

```
/deliver {slug}
```

- [ ] **Step 2: Observe Stage A (product-author + challenger)**

Verify:
- product-author drafts a section in product.md shape (not a separate file).
- challenger writes `docs/challenges/{slug}-{date}.md`.
- Verdict is one of PROCEED / CONCERNS / PIVOT.
- If CONCERNS: pipeline halts; user resolves.

Pass criterion: challenger surfaces at least ONE substantive finding.
If verdict is PROCEED with no findings on every test feature, the prompt
needs strengthening.

- [ ] **Step 3: Observe Stage B (architect, possibly skipped)**

Verify:
- Skipped when no contract change.
- When run, patches `architecture.md`, not a separate SDD.

- [ ] **Step 4: Observe Stage C (designer, possibly skipped)**

Verify:
- Skipped when `screens.md` already exists.
- When run, produces `screens.md` (and optional `prototype/`), not the
  old 14-section README.

- [ ] **Step 5: Observe Stage E (developer)**

Verify:
- Reads product.md + architecture.md + screens.md.
- Backend phase, then frontend phase.
- Tests pass.

- [ ] **Step 6: Observe Stage F (critic ║ tester)**

Verify:
- Critic posts 3–5 substantive PR comments, not 15 nits.
- Tester writes one happy-path spec.
- Suggestions logged to `docs/backlog/tech-debt.md` with matching count.

- [ ] **Step 7: Observe fix loop (if any blockers)**

Verify:
- Cap at 2 iterations, not 3.
- Container rebuild after each developer pass.

- [ ] **Step 8: Observe PR creation**

Verify:
- `npm run build` runs and is green.
- E2E spec runs and is green.
- PR opened with summary, test plan, and tech-debt note.

---

## Task 31: Calibrate

**Files:** various, agent and skill prompts.

- [ ] **Step 1: List rough edges from Tasks 29–30**

Group by category:
- Challenger too soft / too noisy
- Critic too nit-picky / too lenient
- Developer reading list incorrect
- Skip logic firing wrongly
- Auto-detect logic missing a state

- [ ] **Step 2: Patch agent or skill prompts inline**

For each rough edge, edit the offending agent/skill prompt directly. Small
commits, one per fix.

Example commit messages:
- `chore(redesign): challenger — strengthen contradiction detection`
- `chore(redesign): critic — drop blocker tier for missing test data`
- `chore(redesign): deliver skill — handle existing partial section`

- [ ] **Step 3: Verify with another tiny feature**

If patches were significant, run `/deliver {another-slug}` again and
verify the rough edges are gone.

---

## Task 32: PR 3 — calibration commits

- [ ] **Step 1: Verify the test feature is green**

```bash
git -C /Users/d.korniichuk/IdeaProjects/gympulse/.worktrees/{slug} \
  log main..HEAD --oneline
```

- [ ] **Step 2: Push and open PR 3**

PR 3 is the test feature itself, not a separate redesign PR. Calibration
patches to agents/skills, if any, can either:
- Ship inside PR 3's branch (if they're trivial)
- Be split into a separate `chore/redesign-calibration` PR (if they're
  substantial)

```bash
gh pr create --title "feat({slug}): {short description}" --body "$(cat <<'EOF'
## Summary

PR 3 of 3 in the Claude Code setup redesign — calibration on a real
feature.

This PR is the test feature itself. Calibration of new agents/skills
during the run is captured in `chore/redesign-calibration` if applicable.

## Test plan

- [ ] Behavioural rules in product.md::{slug} all map to passing test cases
- [ ] critic posted 3-5 substantive comments
- [ ] suggestion count == new TD entries in tech-debt.md
- [ ] /deliver context load is materially smaller than pre-redesign

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Verification (end-of-migration)

After all three PRs are merged:

- [ ] `/deliver` for a new feature reads materially less context at start
      than pre-redesign. Confirm by comparing the size of files loaded
      between the new pipeline and `git show <pre-redesign-commit>:CLAUDE.md`
      plus archived skills.
- [ ] Challenger surfaces at least one substantive issue per feature in
      first 3 runs. If verdicts are always PROCEED/no-issues, the prompt
      needs strengthening — open a follow-up PR.
- [ ] Critic produces 3–5 substantive points, not 15 nits. If still nits,
      reinforce the adversarial mandate in the prompt — open a follow-up
      PR.
- [ ] `lessons.md` has not been re-created in any commit since PR 1.
- [ ] `docs/superpowers/` has not been re-created.
- [ ] No commits direct to `main` in the migration window.

If any of these fails, the redesign is partial — open the relevant
follow-up PR.
