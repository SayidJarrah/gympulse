You are running the GymPulse delivery pipeline for: $ARGUMENTS

Load the deliver skill before doing anything else.

## Gate Check

Determine the starting stage by checking which artifacts exist:

```bash
ls docs/prd/$ARGUMENTS.md 2>/dev/null && echo "PRD exists" || echo "PRD missing"
ls -d docs/design-system/handoffs/$ARGUMENTS 2>/dev/null && echo "Design handoff exists" || echo "Design handoff missing"
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

## Stage 2 — Design Handoff Gate (if handoff missing)

**Design is owned by the external Claude Design project, not this repo.** We do not
generate design specs or HTML prototypes locally.

Check for a handoff directory at `docs/design-system/handoffs/$ARGUMENTS/`. It must contain at
minimum:
- `$ARGUMENTS.html` — interactive mock (self-contained HTML, Tailwind CDN)
- `spec.md` — screens, states, components, copy, error messages

If missing, STOP immediately with:
> "No design handoff found for `$ARGUMENTS`. Produce it in the Claude Design project, then drop
> the package into `docs/design-system/handoffs/$ARGUMENTS/` and re-run `/deliver $ARGUMENTS`."

Do not fabricate a design spec locally to unblock the pipeline. A fabricated spec is worse than
no spec.

If present, verify it aligns with the PRD scope (all user-facing screens covered). If there is
a gap, stop and ask for an updated handoff rather than filling it in.

## Stage 3 — SA (if SDD missing)

Invoke the solution-architect agent:
> "Read docs/prd/$ARGUMENTS.md AND docs/design-system/handoffs/$ARGUMENTS/spec.md before writing anything.
> Also read docs/design-system/README.md for voice and component patterns, and
> docs/design-system/colors_and_type.css for token values.
> Write the SDD at docs/sdd/$ARGUMENTS.md.
> Use the Postgres MCP to inspect the current schema before defining any DB changes.
> Every DTO must be fully specified. Every error code must map to an AC."

Confirm SDD exists before continuing.

## Stage 4 — Developer

Invoke the developer agent:
> "Read docs/sdd/$ARGUMENTS.md and docs/design-system/handoffs/$ARGUMENTS/ fully before starting.
> Also read docs/design-system/README.md for voice and component patterns, and
> docs/design-system/colors_and_type.css for token values.
> Load kotlin-conventions and react-conventions skills.
> Execute backend phase first (migration → entities → repos → service → controller → unit tests).
> Run ./gradlew test before starting frontend phase.
> Then execute frontend phase (types → API → store → hooks → pages → routes).
> Implement against existing React components in frontend/src/components/. Do not copy the
> handoff HTML verbatim — translate it into the real component set."

Confirm implementation is complete before continuing.

## Stage 5 — Reviewer + Tester (parallel)

Spawn both agents simultaneously:

**Reviewer:**
> "Review the $ARGUMENTS implementation.
> Load design-standards skill.
> Read docs/design-system/handoffs/$ARGUMENTS/ (HTML mock + spec) and docs/design-system/README.md.
> Check: domain correctness, code quality, design fidelity against the handoff.
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