# Claude Code Setup Redesign — Design

Date: 2026-04-25
Scope: meta-redesign of the agent-driven development setup for GymPulse.
Author: collaborative session, captured by Claude.

This is a one-off meta-document. After the migration completes and lives in code,
this file moves to `docs/archive/` as a read-only trace of the rework.

---

## 1. Motivation

The current setup has been built incrementally from scratch — agents, commands,
skills, hooks. It works, but two structural pains dominate:

- **A. Drift between docs / code / tests when product intent changes.** New ideas
  routinely modify boundaries between features (C-class change) or shift the base
  domain model (D-class change). The current pipeline is optimised for greenfield
  feature delivery; it has no first-class machinery for boundary or model
  evolution. Each PRD/SDD owns a private copy of the same domain understanding,
  so a model change requires manual reconciliation across N documents.
- **B. The reviewer does not exercise enough critical thinking.** It checks
  blockers and suggestions on a finished implementation, but never challenges the
  premise of the spec, never questions whether the design is the right one,
  never pushes back on architectural laziness.

Token efficiency (C) is a secondary concern — it improves naturally once A and B
are addressed, because authoritative single sources of truth shrink the reading
surface dramatically.

Concrete symptoms in the current repo:

- 24 PRDs + 25 SDDs + 9 handoffs — 58 documents that rephrase the same product.
- 17 gap reports in `docs/gaps/`, including 4 `bulk-scan-*` files — proof that
  audits are run frequently because drift is chronic.
- `docs/challenges/` and `docs/pivots/` exist but are empty — the namespace was
  reserved but the mechanism never started.
- `docs/lessons.md` has accumulated 15 entries, several of which duplicate rules
  already encoded in CLAUDE.md and skills.
- CLAUDE.md duplicates skill content (worktree workflow, container rebuild rule,
  test rules, design-system instructions) and is loaded every session.
- `settings.local.json` accumulated a dozen ad-hoc Bash permissions for one-off
  paths — redundant under `Bash(*)`.

## 2. Selected approach

Approach 1 from the brainstorming session — *Living product spec + canonical
domain model + adversarial critics* — combined with a deep pruning of skills,
agents, commands, CLAUDE.md, lessons, settings, and memory.

The core moves:

1. Replace the per-feature PRD/SDD/handoff archipelago with two canonical
   documents: `docs/product.md` and `docs/architecture.md`.
2. Introduce two adversarial agents with different mandates — `challenger`
   (pre-code, premise critique) and `critic` (post-code, architectural critique,
   replaces `reviewer`).
3. Unpack `/deliver`'s hidden modes into discrete commands (`/audit`,
   `/redesign`).
4. Delete `lessons.md` entirely; redistribute every lesson to the correct skill
   or agent prompt.
5. Slim CLAUDE.md to a project map. Each domain rule lives in exactly one
   skill or agent prompt.
6. Delete `docs/superpowers/`. The brainstorming/writing-plans default location
   is overridden by user preference for this project.

## 3. Document architecture

### 3.1 New canonical sources of truth

```
docs/
├── product.md               # one section per feature; behavioural rules
├── architecture.md          # domain model, schema map, API map, feature map
├── design-system/           # canonical DNA + per-feature handoffs (lighter)
├── briefs/                  # 5-question intake before /deliver
├── challenges/              # challenger verdicts (was empty, now active)
├── archive/                 # cold-archived prd/, sdd/, reviews/, gaps/
├── backlog/tech-debt.md     # critic suggestions (kept)
└── setup-redesign.md        # this file, archived after migration
```

### 3.2 `product.md` shape

Monolith. One section per feature, fixed form (≤ ~200 lines per section):

```markdown
## {Feature Name} — `{slug}`

**Status:** active | sunset | planned
**Owner of:** {routes / screens / Zustand stores this feature owns}
**Depends on:** {other features by slug}

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
- 2026-04-23 — initial
- 2026-05-01 — pivoted: removed AC about X (was conflicting with membership-plans)
```

No "User Stories", no "Open Questions" template, no "Acceptance Criteria N=7"
ceremony. Acceptance is captured as **behavioural rules** that map directly to
e2e tests (one test per primary rule, not one per AC).

### 3.3 `architecture.md` shape

Single file, four sections:

1. **Domain model** — entities, statuses, invariants. Single authoritative
   source. Every product.md section that references shared concepts (User,
   Membership, etc.) points here.
2. **Schema map** — table-level overview: table, owner feature, FK relations,
   notes (e.g. "PLAN_PENDING is load-bearing for booking").
3. **API map** — endpoints, owner feature, auth requirement.
4. **Feature map** — which feature owns which routes, screens, stores,
   component directories.

Architecture changes are discrete events. The challenger watches this document
closely on every patch.

### 3.4 Lighter handoffs

Current handoff = 200+ lines README + full JSX prototype + tokens.css +
brief.md. This duplicates `docs/design-system/` and now also `docs/product.md`.

New handoff:

```
docs/design-system/handoffs/{slug}/
├── screens.md          # only what is NOT in product.md: layout, motion,
│                       # copy, per-state details
└── prototype/          # OPTIONAL — only if introducing a new pattern
    └── index.html
```

No more `brief.md` copies, no more inline tokens, no full prototype unless a
new pattern requires it. Designer references product.md, does not rewrite it.

### 3.5 Cold archive of existing artifacts

At migration time:

- `docs/prd/*` → `docs/archive/prd/`
- `docs/sdd/*` → `docs/archive/sdd/`
- `docs/reviews/*` → `docs/archive/reviews/`
- `docs/gaps/*` → `docs/archive/gaps/`
- `docs/lessons.md` → DELETED (not archived, per user direction)
- `docs/superpowers/` → DELETED
- `docs/pivots/` → DELETED (empty; pivot mode embedded into challenger verdict)
- `docs/challenges/` → kept (empty, now in active use)
- `docs/briefs/` → kept (no change)
- `docs/backlog/` → kept (no change)

A one-off `extractor` agent reads every archived PRD and SDD and writes the
canonical sections in `product.md` + `architecture.md`. User reviews before
commit.

## 4. Agent roster

Seven agents (was six). Total prompt content shrinks ~45 % because most agents
are de-templated and de-duplicated.

| # | Agent             | Model  | Mandate                                              | Replaces             |
|---|-------------------|--------|------------------------------------------------------|----------------------|
| 1 | `product-author`  | sonnet | Patch a section in `product.md` from a brief         | `business-analyst`   |
| 2 | `challenger` ⭐   | opus   | Adversarial pre-code review of the patch             | NEW                  |
| 3 | `architect`       | opus   | Patch `architecture.md` when contracts change        | `solution-architect` |
| 4 | `designer`        | sonnet | Lighter handoff: textual `screens.md`, optional proto | same role, slimmer  |
| 5 | `developer`       | sonnet | Backend-then-frontend implementation                 | unchanged            |
| 6 | `critic` ⭐       | opus   | Adversarial post-code review with substantive depth  | `reviewer`           |
| 7 | `tester`          | sonnet | One e2e spec per feature, primary user journey       | unchanged            |

### 4.1 `challenger` mandate

Runs after `product-author` drafts a patch but **before** the patch is
committed. Reads `product.md`, `architecture.md`, and the draft. Answers four
questions:

1. Does this patch contradict an invariant in `architecture.md`?
2. Does this patch overlap territory with another feature in `product.md`?
3. Is this an extension, a pivot, or a rewrite?
4. What unstated assumptions and alternative framings did the author miss?

Output: `docs/challenges/{slug}-{date}.md` with `verdict: PROCEED | CONCERNS |
PIVOT` plus numbered concerns and a recommended action. Never edits product.md
itself. User decides what to do.

### 4.2 `critic` mandate

Adversarial post-code review. Replaces structural blocker/suggestion checklist
with substantive depth:

- Is the abstraction earned, or was a simple problem overcomplicated?
- Does the implementation actually solve the user's problem, or just match the
  spec's letter?
- Is this consistent with how X is done elsewhere in the codebase?
- Is there a design choice nobody questioned that I should question?
- What in this code will hurt three features from now?

Output: PR review comments via `gh pr review`. **No `docs/reviews/{slug}-{date}.md`
files** by default — they were archive noise. Exception: pivots and features
with > 5 files of change get an optional `docs/critiques/{slug}.md` summary.

Suggestion → `docs/backlog/tech-debt.md` logging is preserved, with the same
TD-N format and count assertion.

Hard constraint: 3–5 substantive points, not 15 nits.

### 4.3 Pipeline order

Full feature:

```
brief → product-author (draft) → challenger (verdict)
       ↓
   user resolves concerns → product-author commits patch
       ↓
   architect (only if contracts change) →
   designer (only if UI work and screens.md missing) →
   developer →
   critic ║ tester (parallel) →
   fix loop (≤ 2 iterations) →
   pre-PR checks (tsc + frontend build) →
   PR
```

Extension (no contract or UI change):

```
brief → product-author → challenger → developer → critic ║ tester → PR
```

Pivot (challenger verdict = PIVOT):

```
challenger → user confirms →
architect retires old schema/code references →
product-author archives old section →
developer (rewrite scope) →
critic ║ tester (old tests flagged for retirement) →
PR
```

Visual-only redesign:

```
designer (audit mode) → developer → critic → PR
```

## 5. Commands and pipeline

Six commands, each with a single intent:

| Command           | Intent                                       | Status      |
|-------------------|----------------------------------------------|-------------|
| `/brief {slug}`   | Capture intent for new work                  | unchanged   |
| `/deliver {slug}` | Ship a feature: spec → impl → PR             | simplified  |
| `/audit [scope?]` | Find drift between docs and code             | extracted from `/deliver --audit` |
| `/redesign {slug}` | UI/UX rework of an existing feature          | extracted from `/deliver --redesign` |
| `/fix-tests [spec?]` | Make failing E2E specs green              | unchanged   |
| `/run [e2e?]`     | Boot the dev or e2e stack                    | unchanged   |

### 5.1 `/deliver` auto-detect logic

```
no docs/briefs/{slug}.md         → STOP, ask user to /brief first
no product.md::{slug} section    → product-author drafts → challenger verdict
verdict CONCERNS                 → STOP, halt for user
verdict PIVOT                    → STOP, ask "confirm pivot?"
verdict PROCEED                  → commit patch
contract change in patch         → architect runs
UI work and no screens.md        → designer runs
ready to code                    → developer
ready to review                  → critic ║ tester
blockers > 0                     → fix loop, ≤ 2 iterations
all green                        → pre-PR checks → open PR
```

No manual mode prompts. Skip stages aggressively when nothing to do.

### 5.2 `/audit`

`/audit` (no arg): full project drift scan. One file in `docs/gaps/{date}.md`
(not 17 per-feature files).

`/audit {feature}`: narrow to one feature.

`/audit --schema`: domain/schema-only fast check; useful before D-class changes.

User decides which drifts to fix via subsequent `/deliver` runs.

### 5.3 `/redesign`

```
/redesign {slug}
  designer (audit mode against running stack) → screens.md
  classify: visual-only | functional
    visual-only  → branch chore/{slug}-redesign, skip architect
    functional   → branch feature/{slug}-redesign, architect runs,
                   product.md::{slug} also patched
  developer
  critic (manual-QA checklist in PR; no tester for visual-only)
  PR
```

No challenger by default — redesign is an explicit decision. Optional
`/redesign --challenge` flag if user wants a pivot check.

### 5.4 Pipeline optimisations

1. **Explicit reading list per stage.** Each agent prompt names the exact files
   to load. No "read everything relevant".
2. **Aggressive stage skipping without prompts.** If `screens.md` exists,
   designer is silent-skipped. If patch does not touch contracts, architect is
   silent-skipped.
3. **Critic and tester run in parallel** (already true; preserved).
4. **Challenger runs before patch commit**, so an unfavourable verdict aborts
   cheaply.
5. **Fix-loop cap reduced from 3 to 2 iterations.** A third iteration almost
   always masks a deeper issue; better to escalate to architect.
6. **Pre-PR checks as inline bash, not an agent.** `tsc --noEmit` and the
   frontend build run as a script step in `/deliver`.
7. **No per-feature review or gap docs created by `/deliver`.** Only canonical
   files grow.

### 5.5 Gates

| Gate               | What blocks                                            |
|--------------------|--------------------------------------------------------|
| Brief gate         | `/deliver` without a brief                             |
| Challenger gate    | unresolved CONCERNS or PIVOT                           |
| Architecture gate  | product.md references entity/status not in architecture.md |
| Pre-PR gate        | TypeScript errors or failing tests                      |
| Container freshness | E2E run on stale containers                            |

## 6. Skills, CLAUDE.md, lessons cleanup

### 6.1 Skills inventory

| Skill                           | Status     | Notes                                  |
|---------------------------------|-----------|----------------------------------------|
| `deliver`                       | rewritten | ~50 % shorter; new pipeline logic      |
| `brief`                         | unchanged |                                        |
| `fix-tests`                     | unchanged |                                        |
| `audit` ⭐                      | new       | ~80 lines                              |
| `redesign` ⭐                   | new       | ~70 lines                              |
| `kotlin-conventions`            | unchanged |                                        |
| `react-conventions`             | unchanged |                                        |
| `design-standards`              | trimmed   | lighter handoff shape                  |
| `e2e-conventions` ⭐            | new       | ~50 lines; rules from CLAUDE.md+lessons |
| `demo-seeder-conventions` ⭐    | new       | ~40 lines; rules from CLAUDE.md         |

### 6.2 Slim CLAUDE.md (~110 lines, was ~290)

Keeps:

- Stack
- Project structure (directory map only)
- Source-of-truth pointers to `product.md`, `architecture.md`, `docs/design-system/`
- Stacks (dev / e2e ports)
- Commands (six-row table)
- API conventions (base URL, error format, pagination)
- Environment variables list
- Universal security baseline (secrets, .env, PII, bcrypt, JWT, never main)
- MCP servers table

Moves out:

- Testing rules → `e2e-conventions` skill
- Container rebuild rule → `e2e-conventions` skill
- Resolve contradictions by UX intent → `challenger` agent prompt
- SDD hygiene → `product-author` agent prompt (as "product.md hygiene")
- Demo seeder rules → `demo-seeder-conventions` skill
- Long design-system block → kept as a pointer; details remain in
  `design-standards` skill and `docs/design-system/README.md`
- Worktree command examples → `deliver` skill workflow; one-line rule kept in
  CLAUDE.md security baseline

### 6.3 lessons.md full deletion plan

| # | Lesson                                          | Destination                                     |
|---|-------------------------------------------------|-------------------------------------------------|
| 1 | Update review doc when blockers fixed           | DEAD — review docs retired                      |
| 2 | Stale stack check                               | already in `/run` skill — DELETE from lessons   |
| 3 | Never commit to main                            | already in CLAUDE.md security baseline — DELETE |
| 4 | Resolve contradictions by UX intent             | → `challenger` agent prompt                     |
| 5 | Verify external tool capabilities               | DELETE — generic engineering wisdom             |
| 6 | Test preconditions vs global seed               | → `e2e-conventions` skill                       |
| 7 | Rebuild containers after fix                    | → `e2e-conventions` skill (single source)       |
| 8 | Worktree edits only                             | → CLAUDE.md security baseline                   |
| 9 | Subagent worktree absolute paths                | → `deliver` skill                               |
| 10 | Designer fallback (Claude Design vs native)    | → `designer` agent prompt + auto-detect in `deliver` skill |
| 11 | Loading states for async gates                 | → `design-standards` skill                      |
| 12 | TypeScript build gate                          | → `deliver` skill pre-PR check                  |
| 13 | Self-audit before merging                      | → `critic` agent prompt                         |
| 14 | Tailwind namespace                             | → `design-standards` skill                      |
| 15 | Deferred features placeholder                  | → `product-author` agent prompt                 |

Result: `docs/lessons.md` deleted. CLAUDE.md `@docs/lessons.md` import removed.
~14 KB saved per session.

### 6.4 Preventing lessons-style accumulation

The post-PR retrospective in `deliver` skill is rewritten with one binding
question per friction point:

> **"Is this a rule for an agent (goes in skill / agent prompt) or a user
> instruction (goes in CLAUDE.md)?"**

No third bucket. If a friction point fits neither, it is a one-time event, not
a rule.

## 7. Settings, memory, hooks, superpowers

### 7.1 `docs/superpowers/`

Deleted. Brainstorming/writing-plans default location is overridden for this
project. One-off design docs (like this one) live as feature-specific paths or
top-level meta files.

### 7.2 `.claude/settings.local.json`

Cleaned to:

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

All accumulated ad-hoc Bash one-offs removed; redundant under `Bash(*)`.

### 7.3 `.claude/settings.json`

`docker-compose` permission updated to `docker compose` (new syntax). No new
deny rules added — physical removal of `lessons.md` and archival of
`prd/`/`sdd/` plus updated agent prompts make protective deny rules
unnecessary.

### 7.4 Hooks

None added in this redesign. The `/deliver` auto-detect logic catches
unresolved challenger verdicts; pre-PR checks run as inline bash. Hooks remain
an option if a real failure mode emerges later.

### 7.5 MEMORY.md

Cleaned to current and active content only:

- Project conventions (worktrees, screenshot path)
- Source-of-truth pointers (product.md, architecture.md, design-system)
- Brainstorming behaviour (skip docs/superpowers — folder removed)

Removed: stale "auth frontend refactor" pending task, implementation status
table (now in `product.md::Status`), concrete design tokens (now sourced from
design-system canonical files), references to deleted paths.

## 8. Migration plan — three sequential PRs

### 8.1 PR 1 — Foundation

Branch: `chore/redesign-foundation`.

1. Run extractor agent over all `docs/prd/*` + `docs/sdd/*` → produce draft
   `docs/product.md` and `docs/architecture.md`. User reviews before commit.
2. Move `docs/prd/` → `docs/archive/prd/`.
3. Move `docs/sdd/` → `docs/archive/sdd/`.
4. Move `docs/reviews/` → `docs/archive/reviews/`.
5. Move `docs/gaps/` → `docs/archive/gaps/`.
6. Delete `docs/lessons.md`.
7. Delete `docs/superpowers/`.
8. Delete `docs/pivots/`.
9. Slim CLAUDE.md to the new shape (~110 lines).
10. Clean `.claude/settings.local.json`; fix `docker-compose` → `docker compose`
    in `.claude/settings.json`.
11. Clean MEMORY.md.

No agent, command, or skill changes in this PR. Pipeline still runs the old
way; foundation is in place.

Rollback: plain `git revert`.

### 8.2 PR 2 — Pipeline

Branch: `chore/redesign-pipeline`. Built on top of merged PR 1.

1. New agents: `challenger.md`, `critic.md`, `product-author.md`,
   `architect.md`.
2. Updated agents: `developer.md` (new reading list),
   `designer.md` (slimmer), `tester.md` (new reading list).
3. Deleted agents: `business-analyst.md`, `solution-architect.md`,
   `reviewer.md`.
4. New skills: `audit`, `redesign`, `e2e-conventions`,
   `demo-seeder-conventions`.
5. Rewritten skills: `deliver` (50 % shorter), `design-standards` (trimmed).
6. New commands: `/audit`, `/redesign`.
7. Updated command: `/deliver` (auto-detect logic).

Rollback: revert PR 2; old agents/skills/commands return.

### 8.3 PR 3 — Smoke test and calibration

Branch: `feature/{trivial-test-feature}`.

1. Pick a small real feature from backlog (e.g. additional profile field, new
   schedule filter).
2. Run new `/brief {slug}`.
3. Run new `/deliver {slug}`.
4. Observe each pipeline stage end-to-end.
5. Patch agents/skills inline as rough edges surface, in additional small
   commits on the same branch.

Goal: calibrate, not deliver. The feature ships as a side effect.

### 8.4 What is explicitly NOT in this migration

- Restructuring existing handoffs to the new lighter form. Old handoffs stay;
  new handoffs use the new form.
- Reorganising `docs/design-system/`.
- Tailwind config or token changes.
- Any change to `backend/` or `frontend/` source. This redesign is process and
  knowledge only; product code is untouched.

### 8.5 Verification criteria

After PR 3:

1. `/deliver` for a new feature reads ~50 % less context at start than before.
2. The challenger surfaces at least one substantive issue the user did not
   spot. If the verdict is always PROCEED with no concerns, the prompt needs
   strengthening.
3. The critic produces 3–5 substantive points, not 15 nits. If still nits,
   adversarial mandate is reinforced.

## 9. Tradeoffs accepted

- **Loss of per-feature trace.** Original PRDs/SDDs become archive, not the
  primary entry point. `git log` of `product.md` plus the `History` block per
  section preserves the trace.
- **Loss of formal numbered acceptance criteria.** Behavioural rules are less
  schematic but map directly to e2e tests. If formality is needed later, an
  optional `### Acceptance` subsection can be added to a feature; not the
  default.
- **Loss of dated lessons.md.** Each rule moves to a skill or agent prompt;
  dates are recoverable via `git blame`. Narrative postmortems are not
  preserved.
- **Discipline tax on rule placement.** Without a `lessons.md` bucket, every
  new rule must be consciously placed in the right skill or in CLAUDE.md.

## 10. Decision log (this session)

- **Approach 1 selected** over Approach 2 (lighter, intermediate) and Approach
  3 (no challenger) because C-class and D-class drift are structural problems
  needing a structural fix.
- **Monolith `product.md`** chosen over `docs/product/{slug}.md` directory
  because boundary changes (C-class) break filenames; monolith is link-resilient.
- **Cold archive** over lazy migration — gradual hybrid would extend the
  mental cost of "old or new?" for months.
- **Lighter handoffs** — prototypes become optional rather than mandatory.
- **Behavioural rules** over numbered acceptance criteria.
- **Challenger before commit**, not after — cheaper to abandon a draft than to
  unwind a committed patch.
- **Review docs retired**; critic writes PR comments. Optional summary file
  only for big features and pivots.
- **Architect optional** — runs only when contracts change.
- **Pivot mode embedded in `/deliver`**, not a separate command. The
  challenger detects it.
- **Fix-loop cap 3 → 2** — escalate sooner.
- **Stages skip silently** without user prompts.
- **lessons.md fully deleted**, not archived.
- **No protective deny rules** for deleted/archived paths — physical removal
  and updated instructions make them redundant.
- **Three sequential PRs** chosen over one big-bang PR — partial revert is
  possible.

## 11. Open items

None blocking. The migration plan is fully specified.
