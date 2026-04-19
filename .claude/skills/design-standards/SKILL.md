---
name: design-standards
description: GymPulse UI/UX quality bar. Load when reviewing any screen, implementing
  UI against a handoff, or authoring a new handoff (native `designer` agent or via
  Claude Design). Defines what "good" looks like — not functional-minimum but
  production-quality fitness app standard. Defers token and voice details to the
  canonical design system under `docs/design-system/`.
---

# GymPulse Design Standards

## Source of Truth

Design has **two possible authors** — **Claude Design** (external project, preferred)
and the native **`designer` agent** (`.claude/agents/designer.md`, fallback when
Claude Design quota is exhausted). Both produce handoffs in the exact same folder
shape; this skill applies to output from either source.

The canonical DNA lives in this repo:

- `docs/design-system/README.md` — canonical voice, visual rules, component patterns
- `docs/design-system/colors_and_type.css` — CSS custom-property token values
- `docs/design-system/tailwind.gymflow.cjs` — Tailwind theme extension (the namespace
  actually in use by the app)
- `docs/design-system/tokens.ts` — TypeScript mirror
- `docs/design-system/assets/` — logo marks, favicon
- `docs/design-system/handoffs/{feature}/` — per-feature handoff (see shape below)

**Always read `docs/design-system/README.md` before designing, implementing, or
reviewing any UI.** Do not recreate tokens or voice rules here — they live in the
design system.

## The Quality Bar

Every screen must pass this test: **Would a user who uses Peloton or Whoop daily
find this UI embarrassing?** If yes, it is not ready.

GymPulse is a fitness app. The UI must feel energetic, confident, and premium —
not a generic admin panel with a dark background.

## Reference Applications

Benchmark against these when designing or reviewing. A handoff spec should cite at
least one per major screen pattern; if it does not, flag the gap.

| Reference | Best for |
|-----------|----------|
| **Whoop** | Data dashboards, membership status, activity rings |
| **Peloton** | Class cards, schedule views, booking flows |
| **Nike Training Club** | Trainer profiles, class detail pages |
| **Linear** | Admin tables, filter UIs, dense information layouts |
| **Vercel** | Settings pages, empty states, subtle animations |

## Required Per Screen (review checklist)

Every implemented screen must have all of the following. Missing any is a blocker:

1. **Populated state** — the happy path with real-looking data
2. **Loading state** — skeleton screens or spinners; never blank space or layout shift
   - Route guards that read async data must explicitly handle the loading case
     (see Lesson 11 — a missing loading state is a blocker, not polish)
3. **Empty state** — illustrated or typographic, with a CTA where applicable
4. **Error state** — inline message for form errors, banner for page-level errors
5. **One delight detail** — a micro-interaction, gradient accent, bold typography
   moment, or hover animation that makes the screen feel crafted

## Token Namespace (current, as of 2026-04-19)

The Tailwind namespace in use is defined in `docs/design-system/tailwind.gymflow.cjs`
and wired into `frontend/tailwind.config.js` via `createRequire`. Reviewer and
developer must use these names — the pre-2026-04-19 namespace (`brand-*`, `ink-*`,
`line-*`) is **stale** and if spotted in new code it is a blocker (Lesson 14).

Current → what it maps to:

| Tailwind class | Token | Role |
|---|---|---|
| `bg-page` | `#0F0F0F` | Root page background, sidebar |
| `bg-surface-1` | `#111827` | Cards, modals, inputs |
| `bg-surface-2` | `#1F2937` | Elevated cards, dropdowns, hover |
| `bg-surface-3` | `#374151` | Hover on already-elevated rows |
| `bg-primary` / `text-primary` / `border-primary` | `#22C55E` | Brand green |
| `bg-primary-dark` | `#16A34A` | Hover / pressed |
| `text-primary-light` | `#4ADE80` | Text-on-dark, eyebrows |
| `bg-accent` / `text-accent-text` | `#F97316` / `#FB923C` | Orange accent |
| `text-fg` | `#FFFFFF` | Default text |
| `text-fg-label` | `#D1D5DB` | Body copy on cards |
| `text-fg-muted` | `#9CA3AF` | Secondary text |
| `text-fg-metadata` | `#6B7280` | Eyebrow metadata |
| `border-card` / `border-input` | `#1F2937` / `#374151` | Card / input borders |
| `border-focus` | `#22C55E` | Focus ring |
| `shadow-glow-primary` | `green-500/25` | The only colored shadow; hover on primary |
| `font-display` | Barlow Condensed | Hero headlines only |
| `font-sans` | Inter | Everything else |
| `tracking-eyebrow-tight` / `eyebrow` / `eyebrow-wide` | 0.18em / 0.22em / 0.32em | Uppercase section labels |
| `rounded-md` / `lg` / `xl` / `2xl` | 6 / 12 / 16 / 28 px | Buttons / cards / modals / hero cards |
| `duration-fast` / `normal` / `slow` | 100 / 200 / 300 ms | Animation timings |

When reviewing CSS-var code, the custom properties in `colors_and_type.css`
follow the same semantic names (`--color-primary`, `--color-fg-label`, etc.).
Both namespaces must be grep-findable in the canonical files — if a class or
variable in code does not appear in the canonical files, block the PR.

## Depth Checklist (dark theme)

- **Layering:** page (`bg-page`) → surface-1 → surface-2 → surface-3 — four distinct
  levels, not a flat `bg-surface-1` wash
- **Green as a signal:** `bg-primary` only for primary actions and positive status.
  Overuse kills impact.
- **Status tints:** use the `success` / `warning` / `error` / `info` token triplets
  defined in `tailwind.gymflow.cjs` — never ad-hoc `bg-red-500/10`
- **Shadows:** black-based (`shadow-md` through `shadow-2xl` all use `rgba(0,0,0,0.5)`).
  The only colored shadow is `shadow-glow-primary`, applied only on hover of a
  primary button
- **Hero background:** use the single approved radial-green + grid texture pattern
  from `docs/design-system/README.md` § Backgrounds; no other hero treatment

## Handoff Shape (validate before and after a handoff is produced)

Every handoff at `docs/design-system/handoffs/{slug}/` must contain:

```
docs/design-system/handoffs/{slug}/
├── README.md              # the spec
└── design_reference/
    ├── index.html         # React 18 + Babel CDN entry, opens in a browser without a build
    ├── {slug}_app.jsx     # shell + state + navigation
    ├── {slug}_sections.jsx (or per-step files)
    ├── components.jsx     # optional shared primitives
    ├── tokens.css         # mirror of tokens used on this surface
    └── brief.md           # verbatim copy of docs/briefs/{slug}.md
```

If the shape is not this, halt and request a correction — do not implement from a
malformed handoff.

The spec `README.md` must contain these sections (order matches the existing
`handoffs/onboarding/README.md` reference):

1. Overview — one paragraph
2. Scope — in-scope + "Not in scope"
3. Fidelity — plus explicit lofi call-outs
4. Design DNA (inherited) — bulleted list of reused components/tokens
5. Top-level app shape — route, auth gate, redirect, persistence
6. Layout — ASCII diagram with metrics
7. Screens — per-screen detail with per-state rules
8. State schema — full TypeScript type
9. Interactions & motion — durations, easings, reduced-motion handling
10. Accessibility
11. Responsive
12. Files
13. Open questions
14. Benchmarks (at least one reference app per major pattern)

Missing sections → request a correction before implementation.

## Patterns to Reject in Review

- Flat grey cards with only text (add an icon, image, or colour accent)
- Left-aligned single-column forms that span full width (use `max-w-md` centred)
- Generic CRUD data tables without row actions or hover states
- Disabled buttons without visible explanation
- Alert/error messages using only red colour (add an icon + descriptive text)
- Full-page loading spinners where a skeleton would work
- Emoji, Unicode-as-icons — always Heroicons v2 (outline default, solid for active nav only)
- Stale-namespace Tailwind classes: `bg-brand-*`, `text-ink-*`, `border-line-*`
  (see Lesson 14 — pre-2026-04-19 names that silently resolve to nothing)
- Ad-hoc hex literals in JSX (must come from the token files)
- Colored non-green shadows (shadows are black-based; the only colored shadow
  is `shadow-glow-primary` on hover of a primary button)
- "Oops!", "Uh oh", or any hype/slang — voice is operational and calm

## Pre-Merge Gates (reviewer and self-audit)

Before approving a PR **or** before self-merging a feature PR (Lesson 13), run:

### Token import check (silent-breakage killer, Lesson 14)
1. Open `frontend/src/index.css` — confirm the `colors_and_type.css` import is present
2. Open `frontend/tailwind.config.js` — confirm it loads `tailwind.gymflow.cjs`
   via `createRequire` and spreads `gymflow.theme.extend`. An empty `extend: {}`
   is a silent breakage.
3. Grep the diff for any of: `bg-brand-`, `text-ink-`, `border-line-`, or any
   hex literal in JSX. Any hit is a blocker.

### TypeScript build check (hard gate, Lesson 12)
Run `npm run build` (or `tsc --noEmit`) inside `frontend/`. **Zero** TS errors.
Unused-variable errors, missing-required-field errors on test fixtures — all
blockers. A PR that fails `tsc` breaks the Docker image for every developer on
the next `/run`.

### Visual self-audit against the handoff (Lesson 13)
For any feature PR with a handoff:
1. Open the handoff spec alongside the running stack
2. Visually compare each screen against the spec
3. Walk through each primary AC end-to-end in the browser
4. Confirm no CSS tokens are used that do not exist in
   `docs/design-system/colors_and_type.css`
5. If any screen looks wrong or any AC fails → fix **before** merging, not after

### Loading-state check (Lesson 11)
For any route guard or redirect that depends on async data (auth bootstrap,
profile, feature flags), confirm the loading case is explicitly handled in the
same PR — a spinner or skeleton renders until the async data resolves, and the
route guard does not make redirect decisions against undefined data.

## Handoff vs Design Standards — Division of Labour

- The **handoff** specifies what this feature looks like (screens, fields, copy,
  state schema, token names used).
- The **design-standards skill** (this file) specifies what "good" means across
  all features — the quality bar, required states, token namespace, patterns to
  reject, pre-merge gates.
- When in conflict, the canonical design system (`docs/design-system/README.md`
  + `colors_and_type.css` + `tailwind.gymflow.cjs`) wins. Handoffs must conform
  to the canonical DNA, not override it.

## Escalation

If a handoff (from either source) violates the canonical DNA or this quality bar
— ad-hoc tokens, missing states, wrong namespace — do not implement around it.
Halt, cite the specific violation against this skill + `docs/design-system/README.md`,
and request a corrected handoff from the original author (Claude Design or the
native `designer` agent).
