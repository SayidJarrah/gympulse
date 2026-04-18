You are running a UI/UX redesign for: $ARGUMENTS

Redesigns are authored in the external Claude Design project, not this repo. The handoff
arrives as a package; this pipeline turns it into shipped code with PRD/SDD updated to match.

**Manual QA only — there is no tester stage.** The user verifies behavior themselves. The
reviewer must produce a manual-test checklist for the user.

## Stage 1 — Handoff Gate

Check for a handoff directory at `docs/design-system/handoffs/$ARGUMENTS-redesign/`. It must
contain at minimum:
- `README.md` — the spec (overview, screens, states, interactions, data contracts, tokens)
- `design_reference/` — prototype bundle, with at least an `index.html` and `colors_and_type.css`

If missing or incomplete, STOP with:
> "No redesign handoff found for `$ARGUMENTS` (or it is incomplete). Produce it in the Claude
> Design project and drop the package into `docs/design-system/handoffs/$ARGUMENTS-redesign/`,
> then re-run."

Do not fabricate a spec locally (Lesson 10).

## Stage 2 — Solution Architect: classify + write deltas

Invoke the solution-architect agent:
> "Read docs/design-system/handoffs/$ARGUMENTS-redesign/ in full (README.md + design_reference/).
> Also read docs/design-system/README.md and docs/design-system/colors_and_type.css.
> Read the existing PRD at docs/prd/$ARGUMENTS.md and SDD at docs/sdd/$ARGUMENTS.md if they exist.
>
> Classify the redesign implicitly by what you find:
>   - **Visual-only**: layout, type, color, spacing, micro-interactions, copy. No new data,
>     no new endpoints, no new routes, no new server behavior.
>   - **Functional extension**: anything that introduces new data contracts, endpoints,
>     real-time transport, viewer-state logic, anonymization rules, or new routes.
>
> Always update PRD if user-facing copy or content changed, even for visual-only redesigns.
>
> If functional extension: update or create the SDD covering API contracts, data shapes,
> transport choices, state derivation, anonymization, route map, and any deferred items
> called out in the handoff. Update the PRD with new requirements.
>
> If visual-only: update PRD only if copy changed. Skip SDD changes.
>
> Commit PRD/SDD updates to the redesign branch FIRST, before any code changes."

Choose the branch based on classification:
- **Visual-only** → `chore/$ARGUMENTS-redesign`
- **Functional extension** → `feature/$ARGUMENTS-redesign`

Create the worktree using absolute paths (Lesson 9):
```
git -C /abs/path/to/repo worktree add /abs/path/to/repo/.worktrees/{branch-slug} -b {branch}
```

Confirm SDD/PRD deltas (if any) are committed before continuing.

## Stage 3 — Developer

Invoke the developer agent:
> "Read docs/design-system/handoffs/$ARGUMENTS-redesign/ (README.md + design_reference/).
> Read the updated PRD at docs/prd/$ARGUMENTS.md and SDD at docs/sdd/$ARGUMENTS.md.
> Read docs/design-system/README.md for voice/patterns and
> docs/design-system/colors_and_type.css for token values.
>
> Implement the redesign for $ARGUMENTS.
>   - Visual-only redesigns: frontend files only. Do not touch backend, migrations, routes,
>     or API functions. Do not change functionality.
>   - Functional-extension redesigns: backend changes are allowed only where the SDD
>     explicitly requires them. Stay within the SDD's scope.
>
> Port design tokens from the handoff faithfully. Replace prototype shortcuts (CDN React,
> inline styles, demo data, dev-only state switchers) with the project's stack
> (Vite, TypeScript, Tailwind, Zustand, Axios)."

Confirm implementation is complete before continuing.

## Stage 4 — Reviewer

Invoke the reviewer agent:
> "Review the $ARGUMENTS redesign.
> Load design-standards skill. Read docs/design-system/handoffs/$ARGUMENTS-redesign/.
> Read the updated PRD and SDD.
>
> Focus:
>   - Does the implementation match the handoff spec (layout, type, color, motion, copy)?
>   - For functional extensions: does the implementation match the SDD? Are data contracts,
>     anonymization, and state derivation handled correctly?
>   - Does the redesign actually improve quality? Would a Peloton/Whoop user find the new
>     version significantly better than the old?
>   - Are PRD and SDD updates coherent with what shipped?
>
> Save review to docs/reviews/$ARGUMENTS-redesign-{today}.md with:
>   - Explicit blockers and suggestions
>   - **Manual-test checklist** for the user — there is no automated tester stage, so the
>     user will verify behavior themselves. List every flow, state, and edge case the user
>     should click through, especially anything risky or non-obvious."

Fix loop applies if blockers exist: max 3 iterations, same rules as /deliver.

## Stage 5 — PR

Open the PR from the redesign worktree branch (never main, Lesson 3). Report:
- What changed (frontend, and backend if functional extension)
- PRD/SDD files updated
- Reviewer verdict and any open suggestions
- The manual-test checklist from the reviewer, copied into the PR description so the user
  can work through it before merging
