You are running a UI/UX redesign for: $ARGUMENTS

This is a visual/UX upgrade only. No backend changes. No new functionality.
No new E2E specs — only regression check at the end.

## Stage 1 — Designer (redesign mode)

Invoke the ui-ux-designer agent:
> "You are in redesign mode for: $ARGUMENTS
> 1. Read the existing component code for this page first — understand what's there.
> 2. Read docs/design/system.md for design tokens.
> 3. Load the design-standards skill.
> 4. Produce a delta spec at docs/design/$ARGUMENTS-redesign.md:
>    - What changes (with benchmark citation per change)
>    - What stays unchanged
>    - Why each change is a quality improvement over the current design
> 5. Update the prototype at docs/design/prototypes/$ARGUMENTS.html."

Confirm delta spec exists before continuing.

## Stage 2 — Developer (frontend only)

Invoke the developer agent:
> "Read docs/design/$ARGUMENTS-redesign.md.
> Implement the redesign for $ARGUMENTS — frontend files only.
> Do not touch backend files, migrations, routes, or API functions.
> Do not change functionality — only visual treatment, layout, and interaction quality."

Confirm implementation is complete before continuing.

## Stage 3 — Reviewer + Tester (parallel)

**Reviewer:**
> "Review the $ARGUMENTS redesign.
> Load design-standards skill.
> Focus: does the redesign actually improve quality? Does it meet the quality bar?
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
