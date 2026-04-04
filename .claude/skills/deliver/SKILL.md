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
| BA | Feature description from user | `docs/prd/{feature}.md` |
| Designer | `docs/prd/{feature}.md` | `docs/design/{feature}.md` + prototype |
| SA | `docs/prd/{feature}.md` + `docs/design/{feature}.md` | `docs/sdd/{feature}.md` |
| Developer | `docs/sdd/{feature}.md` + `docs/design/{feature}.md` | implementation in git |
| Reviewer | implementation + `docs/design/{feature}.md` | `docs/reviews/{feature}.md` |
| Tester | implementation + `docs/prd/{feature}.md` | passing specs or `docs/bugs/*.md` |

If an artifact is missing, run the stage that produces it — do not skip ahead.

## Gap Report Detection

If `docs/gaps/{feature}.md` exists (created by `/audit`), skip stages whose artifacts
already exist. Start from the first stage where the gap report identifies missing work.

## Parallelism Rules

**Safe to parallelise (run simultaneously):**
- Reviewer + Tester — they read different sources, write to different paths, share no state

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

## Suggestions (non-blocking, logged for reference)
- {improvement idea}

## Verdict
{BLOCKED | APPROVED}
```

**Blocker criteria:**
- Broken UX flow (user cannot complete a primary action end-to-end)
- Security issue (any OWASP top 10, auth bypass, data exposure)
- Domain rule violated (contradicts gymflow-domain skill)
- Design structurally off-spec (layout diverges from design spec)
- Missing required UI states (no loading state, no error handling)

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

## PR Gate

PR is created only when ALL are true:
- Reviewer doc shows 0 blockers
- Tester shows 0 critical failures
- Tester shows 0 regressions (previously passing specs still pass)

PR format:
- Title: `feat({feature}): {one-line description from SDD}`
- Branch: `feature/{feature}`
- Base: `main`, Draft: true
