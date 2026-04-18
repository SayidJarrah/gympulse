You are running a UI/UX redesign for: $ARGUMENTS

This is a visual/UX upgrade only. No backend changes. No new functionality.
No new E2E specs — only regression check at the end.

## Stage 1 — Design Handoff Gate

**Redesign is authored in the external Claude Design project, not this repo.** We no longer
generate delta specs locally.

Check for a handoff directory at `docs/design-system/handoffs/$ARGUMENTS-redesign/`. It must
contain:
- `$ARGUMENTS-redesign.html` — interactive mock of the redesigned page
- `spec.md` — delta spec listing what changes, what stays, and why each change improves quality

If missing, STOP immediately with:
> "No redesign handoff found for `$ARGUMENTS`. Produce it in the Claude Design project and drop
> the package into `docs/design-system/handoffs/$ARGUMENTS-redesign/`, then re-run."

Do not fabricate a delta spec locally.

## Stage 2 — Developer (frontend only)

Invoke the developer agent:
> "Read docs/design-system/handoffs/$ARGUMENTS-redesign/ (HTML mock + spec).
> Also read docs/design-system/README.md for voice/patterns and
> docs/design-system/colors_and_type.css for token values.
> Implement the redesign for $ARGUMENTS — frontend files only.
> Do not touch backend files, migrations, routes, or API functions.
> Do not change functionality — only visual treatment, layout, and interaction quality."

Confirm implementation is complete before continuing.

## Stage 3 — Reviewer + Tester (parallel)

**Reviewer:**
> "Review the $ARGUMENTS redesign.
> Load design-standards skill. Read docs/design-system/handoffs/$ARGUMENTS-redesign/.
> Focus: does the redesign actually improve quality? Does it match the handoff spec?
> Would a Peloton/Whoop user find the new version significantly better than the old?
> Save review to docs/reviews/$ARGUMENTS-redesign-{today}.md."

**Tester (regression only):**
> "Load test-manifest skill. Check regression risk map for $ARGUMENTS.
> Run the existing E2E spec for $ARGUMENTS if it exists.
> Run any specs identified as at-risk in docs/qa/test-manifest.md.
> Write bug briefs for any regressions. Do not write new specs."

Fix loop applies if needed: max 3 iterations, same rules as /deliver.

## Done

Report: what changed, reviewer verdict, regression test results.