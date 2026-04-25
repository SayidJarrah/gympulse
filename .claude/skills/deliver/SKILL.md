---
name: deliver
description: GymPulse delivery pipeline logic. Loaded by /deliver command.
  Auto-detects the starting stage from artifact state. Runs:
  product-author → challenger → architect (if needed) → designer (if
  needed) → developer → critic ║ tester → PR.
---

# GymPulse Delivery Pipeline

One command, one mode (standard delivery). `/audit` and `/redesign` are
their own commands now. Auto-detects the starting stage from artifacts; no
manual mode prompts.

## Auto-detect

```bash
ls docs/briefs/{slug}.md         2>/dev/null && echo "Brief OK"
grep -q "^## .* — \`{slug}\`" docs/product.md  2>/dev/null && echo "Section exists"
ls docs/challenges/{slug}-*.md   2>/dev/null && echo "Challenge exists"
ls docs/design-system/handoffs/{slug}/screens.md 2>/dev/null && echo "Handoff OK"
```

| State | Next stage |
|---|---|
| no brief | STOP — "run /brief {slug} first" |
| brief, no section | product-author drafts → challenger |
| section, no challenge | challenger runs |
| challenge with verdict CONCERNS | STOP — halt for user |
| challenge with verdict PIVOT | STOP — confirm pivot |
| challenge with verdict PROCEED | continue |
| section touches contracts, no architect run yet | architect |
| section touches UI, no screens.md | designer |
| ready to code | developer |
| ready to review | critic ║ tester |
| blockers > 0 | fix loop (≤ 2 iterations) |
| all green | pre-PR checks → open PR |

## Stage A — product-author + challenger

Dispatch `product-author`:

> Brief at `docs/briefs/{slug}.md`. Existing section at
> `docs/product.md::{slug}` if any. Read also
> `docs/architecture.md`.
> Draft the new or updated section per product-author rules.
> DO NOT commit. Output the section text.

Then dispatch `challenger`:

> Draft section: {paste from product-author}.
> Read full `docs/product.md`, `docs/architecture.md`.
> Produce verdict at `docs/challenges/{slug}-{today}.md`.

If verdict is PROCEED → commit the section to `docs/product.md`.
If CONCERNS → halt; user resolves with another product-author pass.
If PIVOT → halt; ask user to confirm pivot mode.

## Stage B — Architecture gate

Skip if the patch does NOT introduce:
- a new entity, status, or invariant
- a schema change
- a new endpoint
- a feature ownership change

Otherwise dispatch `architect`:

> Patch `docs/architecture.md` for the {slug} feature change.
> Read product.md::{slug}, current architecture.md, live DB schema via
> Postgres MCP.
> Output: updates to Domain model / Schema map / API map / Feature map
> sections as needed. Commit.

## Stage C — Designer gate

Skip if `docs/design-system/handoffs/{slug}/screens.md` already exists.

**Inline-screens path (extension to existing surface):** if the change is
purely additive to a surface that is already covered by an existing handoff
or product.md screen list — e.g. one new field on a documented profile
card, one new button on an existing dashboard, one filter dropdown above
an existing list — and uses established patterns (inline-edit row,
existing button, existing layout primitives), the controller may write a
30–100 line `screens.md` inline rather than dispatching `designer`. The
inline screens.md must:

- Name the slot in the existing surface (cite the parent handoff).
- Specify per-state rules (populated, loading, empty, error) — one line
  each unless something diverges from sibling fields.
- List the tokens used (token names from `colors_and_type.css` /
  `tailwind.gymflow.cjs`, not ad-hoc values).
- Note any open questions; if there are several, dispatch `designer`
  instead.

If you are unsure whether a change qualifies — dispatch. Designer is
cheap; design drift from skipping isn't.

Otherwise dispatch `designer`:

> New-handoff mode for {slug}.
> Output: `screens.md` (and optionally `prototype/index.html` if a new
> pattern). Commit.

## Stage D — Branch pre-flight

```bash
git fetch origin
git log main..feature/{slug} --oneline   # commits ahead — should be 0
git log feature/{slug}..main --oneline   # commits behind — must be 0
```

If behind main, rebase first. When dispatching a subagent that needs to
create a worktree, ALWAYS pass absolute paths:

```bash
git -C /Users/d.korniichuk/IdeaProjects/gympulse worktree add \
  /Users/d.korniichuk/IdeaProjects/gympulse/.worktrees/{slug} \
  -b feature/{slug}
```

## Stage E — Developer

Dispatch `developer`:

> Read `docs/product.md::{slug}`, relevant `docs/architecture.md` sections,
> `docs/design-system/handoffs/{slug}/screens.md` if UI work, plus
> design-system canonical files.
> Load kotlin-conventions and react-conventions.
> Backend phase first; run `./gradlew test` before frontend phase.
> Frontend phase second.

## Stage F — Critic ║ Tester (parallel)

Dispatch both in a single message.

**Critic:**
> Review {slug}. Load design-standards. Read
> `docs/product.md::{slug}`, `docs/architecture.md`,
> `docs/design-system/handoffs/{slug}/screens.md`.
> Output PR review comments via gh.
> Suggestions → docs/backlog/tech-debt.md (TD-N format).

**Tester:**
> Read `docs/product.md::{slug}`. Load e2e-conventions.
> Write `e2e/specs/{slug}.spec.ts` covering primary user journey.
> Run via /run e2e. Report failures inline.

## Fix loop (≤ 2 iterations)

```
critic blockers > 0  OR  tester failures > 0?
        ↓ yes
developer (Bug Fix Mode, ≤ 3 files) →
   container rebuild (e2e-conventions skill) →
   re-run critic ║ tester
        ↓
repeat up to 2 total iterations
        ↓ still failing
STOP — escalate to architect. Do NOT create PR.
```

## Pre-PR checks

```bash
cd frontend && npm run build   # must succeed (tsc + bundle)
docker compose -f docker-compose.e2e.yml up -d --build
cd ../e2e && E2E_BASE_URL=http://localhost:5174 npx playwright test specs/{slug}.spec.ts
```

All green → open PR.

## PR

```bash
gh pr create --title "feat({feature}): …" --body "…"
```

Body includes:
- Summary (3 bullets)
- Test plan (checklist)
- Tech-debt note: "{N} suggestion(s) logged to docs/backlog/tech-debt.md
  (TD-{first}–TD-{last})" — omit if N is 0

## Post-PR retro

For each friction point during this delivery, ask:

> **"Is this a rule for an agent (skill / agent prompt) or a user
> instruction (CLAUDE.md)?"**

No third bucket. If neither fits, the friction is a one-time event, not a
rule. Do NOT create a `lessons.md` or `docs/postmortems/`.

Present candidates to user with one-line "skill or CLAUDE.md?" verdict
each. Do not write without confirmation.
