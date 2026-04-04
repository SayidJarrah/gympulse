You are running the GymPulse delivery pipeline for: $ARGUMENTS

Load the deliver skill before doing anything else.

## Gate Check

Determine the starting stage by checking which artifacts exist:

```bash
ls docs/prd/$ARGUMENTS.md 2>/dev/null && echo "PRD exists" || echo "PRD missing"
ls docs/design/$ARGUMENTS.md 2>/dev/null && echo "Design exists" || echo "Design missing"
ls docs/sdd/$ARGUMENTS.md 2>/dev/null && echo "SDD exists" || echo "SDD missing"
ls docs/gaps/$ARGUMENTS.md 2>/dev/null && echo "Gap report exists — use as starting point" || echo "No gap report"
```

Start from the first missing artifact. If a gap report exists, use it to determine
which stages need to run even if some artifacts already exist.

## Stage 1 — BA (if PRD missing)

Invoke the business-analyst agent:
> "Write a PRD for: $ARGUMENTS. Max 7 acceptance criteria.
> If the feature needs more than 7, decompose and present sub-features to the user
> before writing. Save to docs/prd/$ARGUMENTS.md."

Confirm PRD exists before continuing.

## Stage 2 — Designer (if design missing)

Invoke the ui-ux-designer agent:
> "Read docs/prd/$ARGUMENTS.md and docs/design/system.md.
> Design every screen for the $ARGUMENTS feature.
> Load the design-standards skill. Include benchmark citations for every screen.
> All 5 states required per screen (populated, loading, empty, error, delight detail).
> Save spec to docs/design/$ARGUMENTS.md and prototype to docs/design/prototypes/$ARGUMENTS.html."

Confirm design spec exists before continuing.

## Stage 3 — SA (if SDD missing)

Invoke the solution-architect agent:
> "Read docs/prd/$ARGUMENTS.md AND docs/design/$ARGUMENTS.md before writing anything.
> Write the SDD at docs/sdd/$ARGUMENTS.md.
> Use the Postgres MCP to inspect the current schema before defining any DB changes.
> Every DTO must be fully specified. Every error code must map to an AC."

Confirm SDD exists before continuing.

## Stage 4 — Developer

Invoke the developer agent:
> "Read docs/sdd/$ARGUMENTS.md and docs/design/$ARGUMENTS.md fully before starting.
> Load kotlin-conventions and react-conventions skills.
> Execute backend phase first (migration → entities → repos → service → controller → unit tests).
> Run ./gradlew test before starting frontend phase.
> Then execute frontend phase (types → API → store → hooks → pages → routes)."

Confirm implementation is complete before continuing.

## Stage 5 — Reviewer + Tester (parallel)

Spawn both agents simultaneously:

**Reviewer:**
> "Review the $ARGUMENTS implementation.
> Load gymflow-domain and design-standards skills.
> Check: domain correctness, code quality, design fidelity.
> Save review to docs/reviews/$ARGUMENTS-{today}.md with BLOCKED or APPROVED verdict."

**Tester:**
> "Read docs/prd/$ARGUMENTS.md and docs/sdd/$ARGUMENTS.md.
> Load the test-manifest skill. Check regression risk before writing.
> Write frontend/e2e/$ARGUMENTS.spec.ts covering every AC.
> Run the spec. Write bug briefs to docs/bugs/ for any failure.
> Update docs/qa/test-manifest.md after specs pass."

## Fix Loop (max 3 iterations)

After Stage 5 completes, check for blockers:
1. Read docs/reviews/$ARGUMENTS-{today}.md — any blockers?
2. Check docs/bugs/ for new briefs from this session

If blockers or failures exist:
- If any bug brief scope > 3 files: invoke solution-architect for escalation first
- Invoke the developer agent in Bug Fix Mode:
  > "Read the brief/review at {path}. Bug Fix Mode — touch only listed files, max 3 files."
- Re-run Stage 5 (Reviewer + Tester in parallel)
- Repeat up to 3 total iterations

After 3 failed iterations: STOP. Report all brief and review paths to the user.

## PR Creation (when all clear)

```bash
git checkout -b feature/$ARGUMENTS
git add -p
git commit -m "feat($ARGUMENTS): implement feature

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push -u origin feature/$ARGUMENTS
```

Use the GitHub MCP to create a draft PR:
- Title: `feat($ARGUMENTS): {one-line description from SDD}`
- Base: `main`, Draft: true
- Body: summary bullets, files changed, AC checklist, how to test

## Done

Report: PR URL, test results summary, any ACs not covered (flag as risk).
