# GymFlow Design System

A dark-first fitness brand design system distilled from the **GymPulse** codebase (product name **GymFlow**). The mood is gym-floor energy: near-black surfaces, electric-green primary, orange accents, compressed athletic type for headlines, and Inter for everything else.

---

## Sources

- **Repo:** `SayidJarrah/gympulse` (branch `main`)
- **Canonical tokens:** `docs/design-system/colors_and_type.css` and `docs/design-system/tailwind.gymflow.cjs`
- **Voice + visual rules:** this README (the canonical document)
- **Quality bar:** `.claude/skills/design-standards/SKILL.md` — defines what "good" looks like
- **Per-feature handoffs:** `docs/design-system/handoffs/{feature-slug}/` — each contains `README.md` (the spec) and `design_reference/` (prototype bundle)
- **Stack:** Kotlin/Spring backend + React 18 + TypeScript + Vite + TailwindCSS frontend

## Handoff authors

Handoffs are produced by one of two sources. Both must honour this README verbatim:

1. **Claude Design** (external project, preferred) — canvas-driven iteration, richer exploration. Subject to strict weekly usage limits.
2. **Native `designer` agent** (`.claude/agents/designer.md`, fallback) — used when Claude Design quota is exhausted or the change is a DNA extension of an already-handoff'd surface. Same output shape; no visible difference downstream.

The folder shape is identical across sources:

```
docs/design-system/handoffs/{slug}/
├── README.md              # the spec
└── design_reference/      # prototype bundle
    ├── index.html         # React 18 + Babel CDN entry, openable in a browser
    ├── {slug}_app.jsx     # shell + state + navigation
    ├── {slug}_sections.jsx (or per-step files)
    ├── components.jsx     # shared primitives (optional)
    ├── tokens.css         # mirror of tokens used on this surface
    └── brief.md           # verbatim copy of docs/briefs/{slug}.md
```

See existing examples — `handoffs/onboarding/` is the canonical reference for a multi-step flow; `handoffs/member-profile-redesign/` for a single-page surface.

> The user may not have given you repo access. If needed, browse it with `github_get_tree`/`github_read_file` on `SayidJarrah/gympulse@main`.

---

## Products

GymFlow is one product with **two surfaces**, both living in `frontend/`:

1. **Member Web App** — public landing page, login/register, member home, group class schedule, trainer discovery/favorites, profile, membership purchase. Top `Navbar`.
2. **Admin Console** — plans, memberships, trainers, class templates, rooms, scheduler (week calendar with drag/drop). Left `AdminSidebar`.

There is no native mobile app in this repo — the member app is the mobile experience (responsive web).

---

## CONTENT FUNDAMENTALS

**Voice:** Operational, calm, direct. GymFlow speaks like a well-run studio front desk, not a hype-y influencer brand. It favors clarity over cleverness ("Clear over clever. Every element earns its place on screen").

**Pronoun:** "You" to the member. Never "we" for the brand in UI copy — the brand name appears by itself ("GymFlow keeps the first move simple"). First person ("I") is never used in UI.

**Casing:**
- Headings: **Sentence case** for marketing headlines ("Compare the live offer before you commit", "Activate your access")
- Eyebrow labels / taglines: **UPPERCASE** with wide letter-spacing (`tracking-[0.18em]` to `tracking-[0.32em]`) — e.g. `MEMBERSHIP AND CLASS ACCESS`, `YOUR ACCESS`, `NEXT STEPS`
- Buttons: **Sentence case**, short verb-led ("Join GymFlow", "Get started", "Open schedule", "Compare all plans", "Try again")
- Status chips: Title Case ("Active", "Expiring Soon", "Cancelled")

**Tone examples:**
- Onboarding: *"Start with a membership, keep your account in one place, and move into class booking with a clear next step every time you return."*
- Empty state: *"Membership plans are being updated. Active offerings will return here as soon as they are available again."*
- Error: *"Unable to load plans right now. Try again."* (never "Oops!" or "Uh oh")
- Policy note: *"Booking opens after membership activation."* (plain, declarative, no sales-y softening)

**Vibe words:** focused, disciplined, earned, calm, active, membership-first. Avoids: crush, beast-mode, no-pain-no-gain, hype.

**Emoji:** Never. No emoji in UI copy, no emoji in data. Iconography is Heroicons v2.

**Numbers:** Prices as `$45` (no decimals when whole), durations as `30-day access` / `90 days`, times in 12-hour with lowercase suffix (`6:30am`). Counts always include units (`3 / 12`, `8 bookings`).

**Don't:**
- Don't promise features not in scope (no "expert-curated community of transformation stories")
- Don't use decorative all-caps in body copy
- Don't write copy that depends on color alone (errors must have a visible label + icon)

---

## VISUAL FOUNDATIONS

### Color philosophy
**Dark-first.** Page background is `#0F0F0F` (below Tailwind `gray-950`). Surface layering uses exactly four depth levels so dark theme feels dimensional, not flat:

| Layer | Hex | Role |
|---|---|---|
| Page | `#0F0F0F` | Root bg, sidebar (sidebar blends into page) |
| Surface 1 | `#111827` (`gray-900`) | Cards, modals, inputs |
| Surface 2 | `#1F2937` (`gray-800`) | Elevated cards, dropdowns, hover states |
| Surface 3 | `#374151` (`gray-700`) | Hovered rows on already-elevated surfaces |

**Primary:** `#22C55E` (electric green). Used sparingly — only for primary CTAs, active nav, positive status, and the logo mark square. Overuse kills impact.

**Accent:** `#F97316` (orange). Only for small highlights (e.g. "Expiring Soon" pill, featured plan badge, activation-needed notice). Never a primary CTA color.

**Status tints** always use the pattern `bg-{color}-500/10` + `text-{color}-400` + `border-{color}-500/30` — three parts tuned for dark surfaces so tints don't muddy the background.

### Type
- **Inter** — 400 / 500 / 600 / 700 / 800 — body UI, labels, everything by default
- **Barlow Condensed** — 600 / 700 — hero headlines and large step numerals only. Adds "athletic character without making the rest of the page feel editorial." Applied via `font-['Barlow_Condensed']`, uppercase, bold.
- Fallback: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Both families loaded from Google Fonts; see `fonts/README.md`.

Size ramp: `text-xs` (12) → `text-4xl` (36), matching Tailwind default. Hero headlines push larger inline (`text-5xl sm:text-6xl`) and switch font to Barlow Condensed.

### Spacing
Base 4px. Card padding is `p-6` (24px) default, `p-8` on hero cards. Between page sections: `py-14` to `py-20`. Form field gap: `gap-4` (16px). Inline chip gap: `gap-1.5` or `gap-2`.

### Backgrounds
- **Solid near-black** as the default — no full-bleed photography on core app chrome.
- **Hero gets one subtle treatment:** radial green glow in the top-left + faint 40×40px grid texture at 5% opacity:
  ```
  bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_transparent_40%),linear-gradient(180deg,_rgba(17,24,39,0.92),_rgba(15,15,15,1))]
  [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)]
  [background-size:40px_40px]
  ```
- No repeating textures, no hand-drawn illustrations, no brand wallpapers on the rest of the app.

### Animation
- **Durations:** fast `100ms` (hover color), normal `200ms` (state change, focus ring), slow `300ms` (sidebar collapse, modal enter).
- **Easing:** `ease-out` enter, `ease-in` exit, `ease-in-out` hover.
- **Patterns:** short fade-and-rise on hero text; cards `hover:-translate-y-0.5` to `-translate-y-1`; buttons gain `shadow-lg shadow-green-500/25` glow on hover.
- No bounce, no elastic, no parallax.
- **Respect `prefers-reduced-motion`** — all transitions reduced to `0.01ms`.

### Hover states
- **Primary button:** `bg-green-500` → `bg-green-600` + green glow shadow
- **Secondary button:** transparent → `bg-green-500/10`, text `green-400` → `green-300`
- **Ghost button:** transparent → `bg-gray-800`, text `gray-400` → `white`
- **Interactive card:** `border-gray-800` → `border-gray-600`, `bg-gray-900` → `bg-gray-800`, plus `-translate-y-0.5`
- **Nav link (inactive):** `text-gray-400` → `text-white`

### Press / active states
- Primary button: `bg-green-700`
- Secondary button: `bg-green-500/20`
- No "shrink-on-press" — state is expressed via color, not scale.

### Borders
- **Cards + modals:** `border-gray-800` (#1F2937)
- **Form inputs:** `border-gray-700` (#374151)
- **Active sidebar item:** 2px left border, `border-green-500`
- **Dividers inside cards:** `border-gray-800` on top/bottom of header/footer bands
- No hairline 1px borders; Tailwind default 1px is the convention.

### Shadows
All shadows are **black-based** (not color-tinted) so they remain visible on dark surfaces:
- Default card: `shadow-md shadow-black/50`
- Elevated / modal: `shadow-xl shadow-black/50`
- Hero card: `shadow-2xl shadow-black/30` (softer, wider)
- **Glow on primary:** `hover:shadow-lg hover:shadow-green-500/25` — the only colored shadow, gates on hover

### Transparency & blur
- **Sticky header:** `bg-gray-900/80 backdrop-blur-md` — semi-transparent with blur so content scrolls under it visibly
- **Modal overlay:** `bg-black/70 backdrop-blur-sm` — darker than panel so content retreats
- **Slide-over backdrop:** `bg-black/30` — lighter than modal because slide-over is lighter-weight
- Status tints use `/10` alpha + `/30` border alpha — the foundational alpha pair

### Corner radii
- `rounded-md` (6px) — buttons, inputs, dense UI
- `rounded-xl` (12px) — standard cards
- `rounded-2xl` (16px) — modals, feature cards (e.g. logo-mark square on header)
- `rounded-[28px]` — hero-level member cards (MemberHomeHero, MembershipPrimaryCard)
- `rounded-full` — avatars, pill badges, circular icon buttons

### Card anatomy
```
rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-md shadow-black/50
```
Interactive cards add `cursor-pointer transition-all duration-200 hover:border-gray-600 hover:bg-gray-800`. Hero cards bump radius to `rounded-[28px]` and shadow to `shadow-xl shadow-black/40`.

### Layout rules
- Max content width: `max-w-6xl mx-auto` (marketing) or `max-w-7xl` (app chrome). Always centered with `px-4 sm:px-6 lg:px-8`.
- Sticky top Navbar (`h-16`), left AdminSidebar (`w-60` / `w-16` collapsed).
- Single `<main>` per page. Section vertical padding `py-14` to `py-20`.

### Imagery color vibe
When product photography is used (trainer headshots, class hero images): natural, warm-leaning, authentic gym-floor energy. Not b&w, not heavily graded. Not currently present as assets in this repo — see Iconography below for how we handle that.

---

## ICONOGRAPHY

**Library:** [Heroicons v2](https://heroicons.com) (`@heroicons/react`), the official React package used throughout the codebase. Loaded per-component via `import { BellIcon } from '@heroicons/react/24/outline'`.

**Styles used:**
- **Outline** (default) — nav links, buttons, empty-state illustrations. `h-5 w-5` for nav/sidebar, `h-4 w-4` for button icons.
- **Solid** — only for **active** nav state. Same sizes.

**Logo mark:** A lightning bolt SVG inside a `bg-green-500 rounded-xl` square.
```
<svg viewBox="0 0 24 24">
  <path d="M13 2L4.5 13.5H11L9 22L19.5 9.5H13.5L16 2Z" fill="white" />
</svg>
```
Square is `h-10 w-10 rounded-xl` in Navbar/Sidebar, `h-11 w-11 rounded-2xl` on the marketing header with `shadow-lg shadow-green-500/20` glow.

**Wordmark:** `GymFlow` set in `text-lg font-bold text-white`, adjacent to the logo mark. No stylized wordmark graphic — always live type.

**PNG / raster icons:** None used in-app. All iconography is SVG via Heroicons or inline custom SVG for the logo mark.

**Emoji:** Never.

**Unicode as icons:** Never. A `×` close is always the Heroicon `XMarkIcon`, not the Unicode character.

**Accessibility:** Icon-only buttons always carry `aria-label`. Decorative icons (e.g. the logo bolt paired with the "GymFlow" wordmark) carry `aria-hidden="true"`.

---

## Iconography sources available via CDN

Heroicons v2 is available via CDN (no install needed) for throwaway prototypes:
- **Outline** (24px): `https://unpkg.com/heroicons@2.1.5/24/outline/{name}.svg`
- **Solid** (24px): `https://unpkg.com/heroicons@2.1.5/24/solid/{name}.svg`
- **Mini** (20px): `https://unpkg.com/heroicons@2.1.5/20/solid/{name}.svg`

Common icons used in GymFlow UI:
`bell`, `magnifying-glass`, `eye`, `eye-slash`, `chevron-up`, `chevron-down`, `chevron-up-down`, `chevron-left`, `chevron-right`, `x-mark`, `bars-3`, `table-cells`, `rectangle-stack`, `credit-card`, `user-group`, `rectangle-group`, `building-office`, `calendar-days`, `arrow-right-on-rectangle`, `plus`, `pencil`, `trash`, `check`, `star`, `heart`.

---

## File Index

### Root
- **`README.md`** — this file
- **`SKILL.md`** — agent skill manifest (read this if you're Claude Code / another agent)
- **`colors_and_type.css`** — CSS variables for all color + type tokens; semantic selectors for `h1`–`h4`, `p`, `label`, `code`
- **`fonts/README.md`** — Google Fonts import note and substitution flag
- **`assets/logo-mark.svg`** — standalone lightning bolt, green square version
- **`assets/logo-mark-inverse.svg`** — lightning bolt white on transparent
- **`assets/logo-lockup.svg`** — mark + wordmark horizontal lockup
- **`assets/favicon.svg`** — simplified favicon

### `preview/`
HTML cards that populate the Design System tab — see each file for specimen content. One card per sub-concept (primary vs neutral colors, display vs body type, each component state cluster, etc.).

### `ui_kits/member_app/`
- `README.md` — member web app kit notes
- `index.html` — interactive click-through demo (landing → login → member home → schedule → trainer discovery)
- `tokens.css`, `components.jsx`, `screens.jsx` — factored component set

### `ui_kits/admin_console/`
- `README.md` — admin kit notes
- `index.html` — interactive demo (plans list → create plan → members table → scheduler week view)
- `tokens.css`, `components.jsx`, `screens.jsx`

---

## How to use this system

1. **Pull tokens from `colors_and_type.css`** — every color and type style is a CSS variable
2. **Start from a UI-kit component** — don't rebuild a card/button/modal from scratch
3. **Stay in the 4-layer depth model** — page → surface-1 → surface-2 → surface-3
4. **Green is a signal, not a color** — use it only for primary actions and positive status
5. **Run every design past the quality bar** — "Would a Peloton/Whoop user find this embarrassing?"
