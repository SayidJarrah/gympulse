---
name: deliver
description: GymPulse delivery pipeline logic. Loaded by the /deliver command.
  Defines stage gates, parallel execution rules, fix loop behaviour, and PR gate.
---

# GymPulse Delivery Pipeline

## Pipeline Order

```
BA → Designer → SA → Developer → [Reviewer ∥ Tester] → PR
```

**Why this order:**
- Designer works from user needs (PRD) — no technical context needed yet
- SA reads PRD + design together — the API is shaped to match the actual UI
- Developer has both SDD (technical contract) and design spec (exact screens) before writing a line
- Reviewer and Tester are independent — they read different artifacts and write to different paths

## Stage Gates

Before starting each stage, check for the required input artifact:

| Stage | Required artifact | Output artifact |
|-------|------------------|----------------|
| BA | `docs/briefs/{feature}.md` (or gap report for post-audit path) | `docs/prd/{feature}.md` |
| Designer | `docs/prd/{feature}.md` | `docs/design/{feature}.md` + prototype |
| SA | `docs/prd/{feature}.md` + `docs/design/{feature}.md` | `docs/sdd/{feature}.md` |
| Developer | `docs/sdd/{feature}.md` + `docs/design/{feature}.md` | implementation in git |
| Reviewer | implementation + `docs/design/{feature}.md` | `docs/reviews/{feature}.md` |
| Tester | implementation + `docs/prd/{feature}.md` | passing specs or `docs/bugs/*.md` |

If an artifact is missing, run the stage that produces it — do not skip ahead.

## Gap Report Detection

If `docs/gaps/{feature}.md` exists (created by `/audit`), skip stages whose artifacts
already exist. Start from the first stage where the gap report identifies missing work.

## Infra / Chore Path (no UI, no user-facing feature)

The default pipeline assumes a user-facing feature. When the work is a pure infra
refactor, schema change, or cross-cutting cleanup (e.g. seeding consolidation,
logging rework, error-handling sweep), collapse the pipeline:

- **Brief & PRD:** not needed. A detailed gap report (from `/audit`) or an
  explicit scope-agreement block in a gap/brief doc acts as both.
- **Design stage:** skipped. No UI artifact.
- **SDD:** still required. Produce `docs/sdd/{slug}.md` — this is the authoritative
  technical contract.
- **Developer:** runs backend phase only (skip the frontend phase in the two-phase block
  below) unless the change touches TypeScript.
- **Reviewer:** runs normally against the SDD (no design spec to check).
- **Tester:** skip ONLY IF the scope-agreement explicitly accepts existing test
  breakage (common for test-strategy-precursor work). Otherwise run as normal.
  If tester is skipped, the PR description MUST call out accepted breakage.
- **Branch naming:** `chore/{slug}` instead of `feature/{slug}`.
- **PR title:** `chore({slug}): …` instead of `feat({slug}): …`.

Do not invent a PRD or a design doc to satisfy the default pipeline. A fabricated
artifact is worse than no artifact.

## Brief Detection (New Feature Path)

When `docs/prd/{feature}.md` does not exist and no gap report is present:

1. Check for `docs/briefs/{feature}.md`.
2. If the brief exists — pass it to the BA as input. Proceed with the pipeline.
3. If the brief does not exist — stop immediately with:
   > "No PRD or brief found for `{feature}`. Run `/brief {feature}` first."

Never allow the BA to proceed without either a brief or a gap report. Guessing
requirements produces low-quality PRDs that cascade into design and implementation errors.

## Branch Pre-Flight (run before dispatching the Developer)

Before any developer work begins, verify the feature branch is up to date with `main`:

```
git fetch origin
git log main..feature/{slug} --oneline   # commits ahead — should be 0 for a clean start
git log feature/{slug}..main --oneline   # commits behind — must be 0 before proceeding
```

If the branch is behind `main`, rebase it first:
```
git rebase origin/main feature/{slug}
```
Resolve any conflicts, then continue. Never dispatch the developer onto a stale branch —
the rebase may surface conflicts that invalidate the work, and the PR will be messy.

## Parallelism Rules

**Safe to parallelise (run simultaneously):**
- Reviewer + Tester — they read different sources, write to different paths, share no state

**Agent types to use:**
- Reviewer: `subagent_type: "reviewer"` — NOT `superpowers:code-reviewer`. The project reviewer loads design-standards, produces structured review docs with blockers/suggestions.
- Tester: `subagent_type: "tester"`
- Developer: general-purpose agent

**Never parallelise:**
- Any two sequential pipeline stages — each depends on the previous stage's output
- Fix loop iterations — each must complete before the next starts

## Developer Execution (two phases, one session)

The developer agent runs backend then frontend in a single session — no handoff:

**Phase 1 — Backend:**
1. Flyway migration (Section 1 of SDD)
2. Kotlin entities and DTOs (Section 3)
3. Repository interfaces
4. Service with business logic
5. Controller matching API contract exactly (Section 2)
6. Unit tests for service (happy path + all error cases)

Run `./gradlew test` before starting Phase 2. Do not proceed if tests fail.

**Phase 2 — Frontend:**
1. TypeScript types matching backend DTOs exactly
2. Axios API functions in `src/api/`
3. Zustand store additions
4. Custom hooks in `src/hooks/`
5. Page and component implementation per design spec
6. Route registration in App.tsx
7. Error code mapping in `src/utils/errorMessages.ts`

## Reviewer Output Format

Save to `docs/reviews/{feature}-{YYYYMMDD}.md`:

```markdown
# Review: {Feature} — {date}

## Blockers (must fix before PR)
- [ ] {specific issue — file:line, what's wrong, what it should be}

## Suggestions (non-blocking)
- {improvement idea}

## Verdict
{BLOCKED | APPROVED}
```

After writing the review doc, append each suggestion to `docs/backlog/tech-debt.md` using this format:

```markdown
## TD-{next N} — {short title}
Source: docs/reviews/{feature}-{YYYYMMDD}.md
Feature: {feature}
Added: {YYYY-MM-DD}
Effort: S | M | L
{one paragraph description}
```

Effort guide: **S** = a few lines, **M** = less than half a day, **L** = needs its own planning.
If `docs/backlog/tech-debt.md` does not exist, create it first.

**Blocker criteria:**
- Broken UX flow (user cannot complete a primary action end-to-end)
- Security issue (any OWASP top 10, auth bypass, data exposure)
- Domain rule violated (contradicts the feature's SDD)
- Design structurally off-spec (layout diverges from design spec)
- Missing required UI states (no loading state, no error handling)
- Implementation behaviour not documented in the SDD (redirect targets, response fields, routing logic, error messages) — if the code does something the SDD does not describe, that is a blocker

**Never block on:**
- Minor styling preferences not in the design spec
- Refactoring opportunities unrelated to the feature
- Speculative improvements

## Tester Output

Critical failure → `docs/bugs/YYYYMMDD-HHMMSS-{feature}.md`
Regression → `docs/bugs/YYYYMMDD-HHMMSS-regression-{feature}.md`
Both categories block the PR.

## Fix Loop

Runs after Reviewer + Tester complete. Owned by /deliver — user never invokes agents manually.

```
Reviewer blockers > 0 OR tester critical/regression failures > 0?
        ↓ yes
Developer reads brief/review → fix mode (≤3 files per session)
        ↓
Re-run Reviewer + Tester in parallel
        ↓
Repeat up to 3 total iterations
        ↓ still failing after iteration 3
STOP — report all brief/review paths to user. Do not create PR.
        ↓ all clear
Create PR
```

**Fix mode constraints:**
- Developer reads ONLY the files listed in the brief/review doc
- Touches ≤ 3 files per session
- Does not refactor, rename, or improve unrelated code
- If fix genuinely requires > 3 files: stop and report, do not proceed

**"Already done" verification rule:**
Before reporting any fix as "already present" or "no change needed," the developer MUST
read the specific file and confirm the exact line. Never infer from memory, variable names,
or surrounding code. A false "already done" silently skips the fix and passes the review loop.

## PR Gate

PR is created only when ALL are true:
- Reviewer doc shows 0 blockers
- Tester shows 0 critical failures
- Tester shows 0 regressions (previously passing specs still pass)

PR format:
- Title: `feat({feature}): {one-line description from SDD}`
- Branch: `feature/{feature}`
- Base: `main`, Draft: true

After creating the PR, report how many suggestions were logged:
> "{N} suggestion(s) logged to docs/backlog/tech-debt.md (TD-{first}–TD-{last})"
If N is 0, omit this line.

## Post-PR Retrospective

After the PR is created, briefly review what caused friction during this delivery cycle —
unexpected failures, wasted debugging steps, wrong assumptions, repeated back-and-forth.

For each friction point, ask:

> **"Does a human need to remember this, or should an agent just be told directly?"**

- **Human** (process correction, product judgement, recurring mistake by the operator)
  → candidate for `docs/lessons.md`
- **Agent** (coding rule, tool behaviour, spec-writing guard, infra fact)
  → candidate for the relevant skill (`kotlin-conventions`, `test-manifest`, `react-conventions`, etc.)

Present the candidates to the user with a one-line "human or agent?" verdict for each.
Do not write to `docs/lessons.md` or any skill without the user's explicit confirmation.
