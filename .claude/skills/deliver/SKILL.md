---
name: deliver
description: GymPulse delivery pipeline logic. Loaded by the /deliver command.
  Defines the three modes (standard, audit, redesign), stage gates, parallel
  execution rules, fix loop behaviour, and PR gate.
---

# GymPulse Delivery Pipeline

One command (`/deliver`), three modes — `standard`, `--audit`, `--redesign`. All three
share the same agents, fix loop, and PR gate. The only differences are the entry stage
and which stages are skipped.

```
                                   ┌── standard   → BA → Designer → SA → Dev ──┐
   /deliver {slug}    ─────────────┤                                            ├─→ Reviewer ║ Tester → fix loop → PR
   /deliver --audit {slug} ────────┤── audit      → gap report → resume std ───┤
   /deliver --redesign {slug} ─────┤── redesign   → SA(deltas) → Dev ─────────┴─→ Reviewer (manual QA list, no tester) → PR
```

---

## Mode: Standard

Default. New feature work from a brief.

### Gate Check

Determine the starting stage by checking which artifacts exist:

```bash
ls docs/briefs/{slug}.md   2>/dev/null && echo "Brief exists"        || echo "Brief missing"
ls docs/prd/{slug}.md      2>/dev/null && echo "PRD exists"          || echo "PRD missing"
ls -d docs/design-system/handoffs/{slug} 2>/dev/null && echo "Handoff exists" || echo "Handoff missing"
ls docs/sdd/{slug}.md      2>/dev/null && echo "SDD exists"          || echo "SDD missing"
ls docs/gaps/{slug}.md     2>/dev/null && echo "Gap report exists"   || echo "No gap report"
```

Start from the first missing artifact. If a gap report exists, use it to determine
which stages need to run even when some artifacts already exist.

If neither a brief nor a gap report exists, STOP with:
> "No PRD, brief, or gap report found for `{slug}`. Run `/brief {slug}` first."

### Stage 1 — BA (if PRD missing)

> "Write a PRD for: {slug}. Max 7 acceptance criteria.
> If the feature needs more than 7, decompose and present sub-features to the user
> before writing. Save to docs/prd/{slug}.md."

Confirm `docs/prd/{slug}.md` exists before continuing.

### Stage 2 — Design Handoff Gate

Design is owned by Claude Design (preferred) or the native `designer` agent (fallback,
when Claude Design quota is exhausted — Lesson 10). The handoff at
`docs/design-system/handoffs/{slug}/` must contain:

- `README.md` — spec (overview, screens, states, interactions, data, tokens)
- `design_reference/` — prototype bundle (HTML/JSX entry, `colors_and_type.css`, modules)

If missing, STOP and ask the user which source to use:
> "No design handoff found for `{slug}`. Choose: wait for Claude Design, or invoke the
> native `designer` agent now?"

Never fabricate a handoff inline inside SA, developer, or reviewer (Lesson 10).

### Stage 3 — SA (if SDD missing)

> "Read docs/prd/{slug}.md AND docs/design-system/handoffs/{slug}/README.md before
> writing anything. Also read docs/design-system/README.md for voice and component
> patterns, and docs/design-system/colors_and_type.css for token values.
> Write the SDD at docs/sdd/{slug}.md.
> Use the Postgres MCP to inspect the current schema before defining any DB changes.
> Every DTO must be fully specified. Every error code must map to an AC."

Confirm `docs/sdd/{slug}.md` exists before continuing.

### Stage 4 — Developer

Run [Branch Pre-Flight](#branch-pre-flight) first.

> "Read docs/sdd/{slug}.md and docs/design-system/handoffs/{slug}/ fully before starting.
> Also read docs/design-system/README.md and docs/design-system/colors_and_type.css.
> Load kotlin-conventions and react-conventions skills.
> Execute backend phase first (migration → entities → repos → service → controller → unit tests).
> Run ./gradlew test before starting frontend phase.
> Then execute frontend phase (types → API → store → hooks → pages → routes).
> Implement against existing React components in frontend/src/components/. Do not copy the
> handoff HTML verbatim — translate it into the real component set."

See [Developer Execution](#developer-execution) for the two-phase contract.

### Stage 5 — Reviewer + Tester (parallel)

Spawn both subagents in a single message — `subagent_type: "reviewer"` and
`subagent_type: "tester"`. Never use `superpowers:code-reviewer` here; the project
reviewer loads design-standards and produces the structured review doc this skill
expects.

**Reviewer:**
> "Review the {slug} implementation.
> Load design-standards skill. Read docs/design-system/handoffs/{slug}/ and
> docs/design-system/README.md.
> Check: domain correctness, code quality, design fidelity against the handoff.
> Save review to docs/reviews/{slug}-{today}.md with BLOCKED or APPROVED verdict."

**Tester:**
> "Read docs/prd/{slug}.md and docs/sdd/{slug}.md.
> Write e2e/specs/{slug}.spec.ts covering the primary happy-path user journey for this
> feature — one scenario. Do not mirror every AC.
> Run the spec via `/run e2e`. Report failures inline. No markdown bug briefs."

Then run the [Fix Loop](#fix-loop) and the [PR Gate](#pr-gate).

---

## Mode: Audit

Bi-directional consistency check. Writes a gap report, then resumes the standard pipeline
from the first stage the gap report identifies.

### Phase 1 — Investigation (no code changes)

Pick the audit shape:

- **Feature audit** (default): the slug names a user-facing feature with PRD/SDD/handoff.
  Dispatch reviewer + tester in parallel (single message).
- **Discovery audit**: the slug names an infra/cross-cutting concern with no PRD/SDD/handoff
  (e.g. `seeding`, `error-handling`, `logging`). Skip the tester. Dispatch one reviewer in
  discovery mode — inventory every location in the codebase where the concern is
  implemented and produce a `current state → target state` map.

**Reviewer (`subagent_type: "reviewer"`):**
> "You are in audit mode for: {slug}.
> Load design-standards skill.
> Read all available docs: docs/prd/{slug}.md, docs/sdd/{slug}.md,
> docs/design-system/handoffs/{slug}/, docs/design-system/README.md, colors_and_type.css.
> Then read the actual implementation code.
>
> Check DOCS → CODE: is everything in the SDD implemented? Does the UI match the handoff?
> Are all PRD business rules enforced?
> Check CODE → DOCS: endpoints/services/screens/behaviours with no spec coverage.
> Check CROSS-SDD CONTRADICTIONS: read every other SDD in docs/sdd/ and flag any that
> describe the same behaviour differently. Resolve by UX intent, not majority vote
> (Lesson 4).
>
> Write findings to docs/gaps/{slug}.md."

**Tester (feature audit only):**
> "You are in audit mode for: {slug}.
> Run the existing spec at e2e/specs/{slug}.spec.ts via `/run e2e` if present.
> Walk the primary user journey via Playwright MCP.
> Append test-coverage findings to docs/gaps/{slug}.md."

### Phase 2 — Resume

After the gap report is written, switch to standard mode and re-enter Gate Check. The gap
report tells the pipeline which stages to re-run. Do not auto-fix without the user
confirming the gap report contents first.

---

## Mode: Redesign

UI/UX redesign of an existing feature. Handoff lives under `{slug}-redesign`. Backend may
be touched only when the redesign is functional. **No tester stage** — the reviewer
produces a manual-QA checklist for the user.

### Stage 1 — Handoff Gate

Check `docs/design-system/handoffs/{slug}-redesign/`:
- `README.md` — spec
- `design_reference/` — prototype bundle (`index.html`, `colors_and_type.css`, modules)

If missing, STOP and ask the user (Claude Design vs native `designer` agent — Lesson 10).

### Stage 2 — SA: classify + write deltas

> "Read docs/design-system/handoffs/{slug}-redesign/ in full. Also read
> docs/design-system/README.md and colors_and_type.css. Read the existing
> docs/prd/{slug}.md and docs/sdd/{slug}.md if they exist.
>
> Classify implicitly:
>   - **Visual-only**: layout, type, color, spacing, micro-interactions, copy.
>     No new data, no new endpoints, no new routes.
>   - **Functional extension**: anything introducing new data contracts, endpoints,
>     transports, viewer-state logic, anonymization rules, or routes.
>
> Always update PRD if user-facing copy changed.
> Functional extension: update or create the SDD covering API contracts, data shapes,
> transport, state, anonymization, routes, deferred items.
> Visual-only: update PRD only if copy changed, skip SDD changes.
>
> Commit PRD/SDD updates to the redesign branch FIRST, before any code changes."

Branch by classification:
- Visual-only → `chore/{slug}-redesign`
- Functional → `feature/{slug}-redesign`

Run [Branch Pre-Flight](#branch-pre-flight) using absolute paths (Lesson 9).

### Stage 3 — Developer

> "Read docs/design-system/handoffs/{slug}-redesign/ (README.md + design_reference/).
> Read updated docs/prd/{slug}.md and docs/sdd/{slug}.md.
> Read docs/design-system/README.md and colors_and_type.css.
>
> Visual-only redesigns: frontend files only. Do not touch backend, migrations, or routes.
> Functional redesigns: backend changes are allowed only where the SDD requires them.
>
> Port design tokens faithfully. Replace prototype shortcuts (CDN React, inline styles,
> demo data, dev-only state switchers) with the project stack
> (Vite, TypeScript, Tailwind, Zustand, Axios)."

### Stage 4 — Reviewer (manual-QA checklist required)

> "Review the {slug} redesign.
> Load design-standards skill. Read docs/design-system/handoffs/{slug}-redesign/.
> Read the updated PRD and SDD.
>
> Focus:
>   - Does the implementation match the handoff (layout, type, color, motion, copy)?
>   - For functional extensions: does it match the SDD? Are data contracts, anonymization,
>     and state derivation handled correctly?
>   - Does the redesign actually improve quality?
>   - Are PRD and SDD updates coherent with what shipped?
>
> Save review to docs/reviews/{slug}-redesign-{today}.md with:
>   - Explicit blockers and suggestions
>   - **Manual-test checklist** for the user — there is no automated tester here, so the
>     user verifies behaviour. List every flow, state, and edge case to click through,
>     especially anything risky or non-obvious."

[Fix Loop](#fix-loop) applies. Then [PR Gate](#pr-gate) — copy the manual-test checklist
into the PR body so the user can work through it before merging.

---

## Shared: Branch Pre-Flight

Run before dispatching the developer in any mode.

```bash
git fetch origin
git log main..feature/{slug} --oneline   # commits ahead — should be 0 for a clean start
git log feature/{slug}..main --oneline   # commits behind — must be 0 before proceeding
```

If behind `main`, rebase first:
```bash
git rebase origin/main feature/{slug}
```

**Empty-stale-branch case (commits ahead = 0, commits behind > 0):** the branch has no
unique work but `main` has moved past — typically because a prior PR on this branch name
was merged through a fork. Fast-forward instead of rebasing:
```bash
git branch -f feature/{slug} main
```
Before pushing, verify origin's tip is reachable:
```bash
git merge-base --is-ancestor origin/feature/{slug} feature/{slug}
```
Exit 0 → plain `git push -u origin feature/{slug}` works. Exit 1 → origin has diverged;
stop and confirm with the user before using `--force-with-lease`. Never force-push without
explicit user approval.

When dispatching a subagent that needs to create a worktree, always pass absolute paths
(Lesson 9):
```bash
git -C /abs/path/to/repo worktree add /abs/path/to/repo/.worktrees/{slug} -b {branch}
```

## Shared: Developer Execution

Backend phase then frontend phase, single session, no handoff:

**Phase 1 — Backend**
1. Flyway migration (Section 1 of SDD)
2. Kotlin entities and DTOs (Section 3)
3. Repository interfaces
4. Service with business logic
5. Controller matching the API contract exactly (Section 2)
6. Unit tests for service (happy path + all error cases)

Run `./gradlew test` before starting Phase 2. Do not proceed if tests fail.

**Phase 2 — Frontend**
1. TypeScript types matching backend DTOs exactly
2. Axios API functions in `src/api/`
3. Zustand store additions
4. Custom hooks in `src/hooks/`
5. Page and component implementation per design spec
6. Route registration in `App.tsx`
7. Error code mapping in `src/utils/errorMessages.ts`

## Shared: Fix Loop

Owned by /deliver — the user never invokes agents manually.

```
Reviewer blockers > 0  OR  tester failures > 0?
        ↓ yes
Developer reads review/test failures → Bug Fix Mode (≤3 files per session)
        ↓
Re-run Stage 5 (Reviewer ║ Tester in parallel)
        ↓
Repeat up to 3 total iterations
        ↓ still failing after iteration 3
STOP — report all review/spec paths to the user. Do not create the PR.
        ↓ all clear
[PR Gate](#pr-gate)
```

**Bug Fix Mode constraints:**
- Developer reads ONLY the files listed in the review or failing-spec output
- Touches ≤3 files per session
- Does not refactor, rename, or improve unrelated code
- If a fix genuinely requires >4 files: route to solution-architect first for escalation
  (SA classifies root cause, may patch SDD, then writes the fix plan)

**Container rebuild after a fix (Lesson 7):**
- Frontend changes: `docker compose -f docker-compose.e2e.yml up -d --build frontend`
- Backend changes: `docker compose -f docker-compose.e2e.yml up -d --build --force-recreate backend`

Confirm the container shows `Recreated` (not just `Running`) before re-running the spec.

**"Already done" verification rule:**
Before reporting any fix as "already present" or "no change needed," the developer MUST
read the specific file and confirm the exact line. Never infer from memory, variable
names, or surrounding code. A false "already done" silently skips the fix and passes the
review loop.

## Shared: Reviewer Output Format

Save to `docs/reviews/{feature}-{YYYYMMDD}.md`:

```markdown
# Review: {Feature} — {date}

## Blockers (must fix before PR)
- [ ] {file:line — what's wrong → what it should be}

## Suggestions (non-blocking)
- {improvement idea}

## Verdict
{BLOCKED | APPROVED}
```

After writing the review doc, append each suggestion to `docs/backlog/tech-debt.md`:

```markdown
## TD-{next N} — {short title}
Source: docs/reviews/{feature}-{YYYYMMDD}.md
Feature: {feature}
Added: {YYYY-MM-DD}
Effort: S | M | L
{one paragraph description}
```

Effort guide: **S** = a few lines, **M** = under half a day, **L** = needs its own planning.
If `docs/backlog/tech-debt.md` does not exist, create it.

**Blocker criteria:**
- Broken UX flow (user cannot complete a primary action end-to-end)
- Security issue (any OWASP top 10, auth bypass, data exposure)
- Domain rule violated (contradicts the SDD)
- Design structurally off-spec (layout diverges from the handoff)
- Missing required UI states (loading, error, empty)
- Implementation behaviour not in the SDD (redirect targets, response fields, routing,
  error messages) — undocumented behaviour is a blocker (SDD Hygiene rule)

**Never block on:**
- Minor styling preferences not in the handoff
- Refactoring opportunities unrelated to the feature
- Speculative improvements

## Shared: PR Gate

PR is created only when ALL are true:
- Reviewer doc shows 0 blockers
- Tester reports 0 failing specs (standard mode only)
- `npm run build` passes in `frontend/` (Lesson 12)

PR format:
- Title: `feat({feature}): …` (standard) or `chore({slug}-redesign): …` (visual-only redesign)
- Branch: `feature/{slug}` or `chore/{slug}-redesign`
- Base: `main`, Draft: true

After creating the PR, report:
> "{N} suggestion(s) logged to docs/backlog/tech-debt.md (TD-{first}–TD-{last})"

Omit if N is 0.

## Shared: Post-PR Retrospective

After the PR is created, briefly review what caused friction during this delivery cycle —
unexpected failures, wasted debugging steps, wrong assumptions, repeated back-and-forth.

For each friction point, ask:

> **"Does a human need to remember this, or should an agent just be told directly?"**

- **Human** (process correction, product judgement, recurring operator mistake)
  → candidate for `docs/lessons.md`
- **Agent** (coding rule, tool behaviour, spec-writing guard, infra fact)
  → candidate for the relevant skill (`kotlin-conventions`, `react-conventions`, etc.)

Present candidates with a one-line "human or agent?" verdict each. Do not write to
`docs/lessons.md` or any skill without explicit user confirmation.

## Infra / Chore Path (no UI, no user-facing feature)

When the work is a pure infra refactor, schema change, or cross-cutting cleanup
(seeding, logging, error handling), collapse the standard pipeline:

- **Brief & PRD:** not needed. A detailed gap report (from `/deliver --audit`) acts as both.
- **Handoff Gate:** skipped. No UI artifact.
- **SDD:** still required. `docs/sdd/{slug}.md` is the technical contract.
- **Developer:** backend phase only unless the change touches TypeScript.
- **Reviewer:** runs normally against the SDD (no handoff to check).
- **Branch:** `chore/{slug}` instead of `feature/{slug}`.
- **PR title:** `chore({slug}): …`.

Do not invent a PRD or design doc to satisfy the default pipeline. A fabricated artifact
is worse than no artifact.
