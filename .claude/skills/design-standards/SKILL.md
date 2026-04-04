---
name: design-standards
description: GymPulse UI/UX quality bar. Load when designing or reviewing any screen.
  Defines what "good" looks like — not functional-minimum but production-quality
  fitness app standard.
---

# GymPulse Design Standards

## The Quality Bar

Every screen must pass this test: **Would a user who uses Peloton or Whoop daily
find this UI embarrassing?** If yes, redesign before shipping.

GymPulse is a fitness app. The UI must feel energetic, confident, and premium —
not a generic admin panel with a dark background.

## Reference Applications

Study these when designing. Cite one per major screen pattern.

| Reference | Best for |
|-----------|----------|
| **Whoop** | Data dashboards, membership status, activity rings |
| **Peloton** | Class cards, schedule views, booking flows |
| **Nike Training Club** | Trainer profiles, class detail pages |
| **Linear** | Admin tables, filter UIs, dense information layouts |
| **Vercel** | Settings pages, empty states, subtle animations |

## Design System Tokens (from docs/design/system.md)

- **Page bg:** `bg-[#0F0F0F]` (near-black)
- **Surfaces:** `bg-gray-900` (cards/inputs), `bg-gray-800` (elevated)
- **Primary:** `bg-green-500` / `#22C55E` (electric green)
- **Accent:** `bg-orange-500` / `#F97316`
- **Text:** `text-white` default, `text-gray-400` muted, `text-green-400` links/highlights
- **Logo mark:** Lightning bolt SVG in `bg-green-500` rounded square
  Path: `M13 2L4.5 13.5H11L9 22L19.5 9.5H13.5L16 2Z` viewBox="0 0 24 24"
- **Focus rings:** `ring-green-500 ring-offset-gray-900`

## Required Per Screen

Every screen design MUST include all of the following. A design missing any of these is incomplete.

1. **Populated state** — the happy path with real-looking data
2. **Loading state** — skeleton screens or spinners (never blank space)
3. **Empty state** — illustrated or typographic, with a CTA where applicable
4. **Error state** — inline message for form errors, banner for page-level errors
5. **One delight detail** — a micro-interaction, gradient accent, bold typography moment, or hover animation that makes the screen feel crafted

## Applying the Dark Theme With Depth

Don't just set `bg-gray-900` and call it done. Dark theme depth means:

- **Layering:** distinguish background (`#0F0F0F`), surface (`gray-900`), elevated (`gray-800`), overlay (`gray-700`) — 4 distinct levels
- **Typography hierarchy:** one large, bold headline per screen; supporting text at `text-sm text-gray-400`; don't make everything the same size
- **Green as a signal:** use `green-500` only for primary actions and positive states — overuse kills impact
- **Borders:** `border-gray-800` for subtle separation, `border-green-500/30` for highlighted cards
- **Shadows:** `shadow-lg shadow-black/50` on elevated elements — visible against dark backgrounds

## Patterns to Avoid

These patterns produce generic, low-quality UIs. Never use them:

- Flat grey cards with only text (add an icon, image, or colour accent)
- Left-aligned single-column forms that span full width (max-w-md, centred)
- Generic CRUD data tables without row actions or hover states
- Disabled buttons without visual explanation of why they're disabled
- Alert/error messages using only red colour (add an icon and descriptive text)
- Full-page loading spinners when a skeleton would work

## Benchmark Requirement

Every screen design must include a **Benchmark Citation**:

```
Benchmark: [App name] — [what pattern is borrowed and why]
Example: "Benchmark: Peloton class card — horizontal layout with trainer
photo on left, class metadata right, spot count as a pill badge.
Chosen because it communicates capacity at a glance without a separate row."
```

No benchmark = incomplete design.

## Redesign Mode (for /redesign)

When redesigning an existing page:
1. Read the current component code — understand what exists before proposing changes
2. Produce a delta spec: what changes, what stays, and why each change is an improvement
3. Every change must cite the pattern it replaces and why the new pattern is better
4. Do not change functionality — only visual treatment, layout, and interaction quality
