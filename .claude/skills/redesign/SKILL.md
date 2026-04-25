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
