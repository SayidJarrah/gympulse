---
name: design-standards
description: GymPulse UI/UX quality bar. Load when reviewing any screen or implementing
  UI against a design handoff. Defines what "good" looks like — not functional-minimum
  but production-quality fitness app standard. Defers token and voice details to the
  canonical design system under docs/design-system/.
---

# GymPulse Design Standards

## Source of Truth

Design is owned by the external **Claude Design** project. This repo holds:

- `docs/design-system/README.md` — canonical voice, visual rules, component patterns
- `docs/design-system/colors_and_type.css` — token values (CSS custom properties)
- `docs/design-system/tailwind.gymflow.cjs` — Tailwind config extract
- `docs/design-system/assets/` — logo marks, favicon
- `docs/design-system/handoffs/{feature}/` — per-feature mock + spec

**Always read `docs/design-system/README.md` before designing, implementing, or reviewing
any UI.** Do not recreate tokens or voice rules here — they live in the design system.

## The Quality Bar

Every screen must pass this test: **Would a user who uses Peloton or Whoop daily
find this UI embarrassing?** If yes, it's not ready.

GymPulse is a fitness app. The UI must feel energetic, confident, and premium —
not a generic admin panel with a dark background.

## Reference Applications

Benchmark against these when reviewing. A handoff spec should already cite one per
major screen pattern; if it doesn't, flag the gap.

| Reference | Best for |
|-----------|----------|
| **Whoop** | Data dashboards, membership status, activity rings |
| **Peloton** | Class cards, schedule views, booking flows |
| **Nike Training Club** | Trainer profiles, class detail pages |
| **Linear** | Admin tables, filter UIs, dense information layouts |
| **Vercel** | Settings pages, empty states, subtle animations |

## Required Per Screen (review checklist)

Every implemented screen must have all of the following. Missing any of these is a blocker:

1. **Populated state** — the happy path with real-looking data
2. **Loading state** — skeleton screens or spinners (never blank space)
3. **Empty state** — illustrated or typographic, with a CTA where applicable
4. **Error state** — inline message for form errors, banner for page-level errors
5. **One delight detail** — a micro-interaction, gradient accent, bold typography moment,
   or hover animation that makes the screen feel crafted

## Depth Checklist (dark theme specifics)

Verify against `docs/design-system/README.md` "Visual Foundations":

- **Layering:** page (`#0F0F0F`) → surface-1 (`gray-900`) → surface-2 (`gray-800`) →
  surface-3 (`gray-700`) — four distinct levels, not a flat `bg-gray-900` wash
- **Green as a signal:** `green-500` only for primary actions and positive status. Overuse
  kills impact.
- **Status tints:** use the pattern `bg-{color}-500/10` + `text-{color}-400` +
  `border-{color}-500/30`.
- **Shadows:** black-based (`shadow-black/50`), not color-tinted — the only colored shadow is
  `hover:shadow-green-500/25` on primary buttons.

## Patterns to Reject in Review

- Flat grey cards with only text (add an icon, image, or colour accent)
- Left-aligned single-column forms that span full width (max-w-md, centred)
- Generic CRUD data tables without row actions or hover states
- Disabled buttons without visual explanation of why they're disabled
- Alert/error messages using only red colour (add an icon and descriptive text)
- Full-page loading spinners when a skeleton would work
- Emoji, Unicode-as-icons — always Heroicons v2

## Handoff Expectations

A handoff at `docs/design-system/handoffs/{feature}/` should contain:
- `{feature}.html` — interactive mock (self-contained, Tailwind CDN)
- `spec.md` — screens, states, components, copy, error messages, benchmark citation

If the handoff is missing any of these, halt and request an updated package from the
Claude Design project rather than inferring intent from the HTML alone.