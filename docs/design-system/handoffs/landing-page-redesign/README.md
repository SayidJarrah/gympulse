# Handoff: GymFlow "Pulse" Landing Page

## Overview

This handoff covers a redesign of the GymFlow landing page around a concept called **"The Pulse"** — a live, activity-driven homepage that treats the gym like a heartbeat you can tune into. Instead of the usual static hero-over-features pattern, the page centers on real-time signal from the club: who's checking in, what's booking up, how much time until your next class.

The design adapts to **three viewer states**:

1. **Member with a booked class** — dramatic countdown to their next session, check-in CTA
2. **Member with nothing booked** — next-available class card with open-spots count, one-tap booking
3. **Logged-out visitor** — "Join GymFlow" funnel with public/anonymized activity proof

## About the Design Files

The files in `design_reference/` are **HTML/React prototypes** built to demonstrate look, feel, and behavior. They are **not production code to ship as-is**. Your task is to recreate these designs inside the target GymFlow codebase using its existing stack, component library, routing, auth, and data layer.

If no frontend codebase exists yet, choose a framework appropriate to the product (Next.js App Router is a strong default for a member-facing landing page with SSR + auth state) and implement there.

The prototype uses:
- React 18 via CDN + inline Babel (for convenience only — replace with the codebase's build system)
- Plain inline-style objects (replace with the codebase's CSS/styling solution — Tailwind, CSS Modules, styled-components, whatever is in use)
- Design tokens from `colors_and_type.css` — these **should be ported faithfully**; they are the canonical GymFlow design system

## Fidelity

**High-fidelity.** Colors, typography, spacing, border radii, and micro-interactions are all final. Pixel-match the prototype. The only lofi elements are:

- Member avatars (colored circles with initials) — replace with real photo avatars if available
- Trainer list ("Priya, Jordan, Noah, Ari, Mia") — replace with real trainer data
- Feed items — replace with real backend data (see "State Management")

Everything else — layout, type ramp, countdown treatment, ambient waveform, activity-feed chrome — should be matched exactly.

---

## Screens / Views

There is **one page** (`/`) with three rendered states based on auth + booking status.

### Layout (all states, 1440×900 viewport)

```
┌──────────────────────────────────────────────────────────────┐
│  Nav (h: 64px)                                               │  ← bottom-border 1px
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌────────────────────┐    ┌──────────────────────────┐    │
│   │                    │    │  Activity Feed           │    │
│   │   HERO COLUMN      │    │  (460px max-h, scroll-   │    │
│   │   (1.3fr)          │    │   masked bottom)         │    │
│   │                    │    └──────────────────────────┘    │
│   │   + ambient        │    ┌───────┬───────┬──────────┐    │
│   │   waveform bg      │    │ stat  │ stat  │ stat     │    │
│   │                    │    │ (1fr) │ (1fr) │ (1fr)    │    │
│   └────────────────────┘    └───────┴───────┴──────────┘    │
│   RIGHT COLUMN (1fr)                                         │
│                                                              │
│   main: grid-cols 1.3fr 1fr · gap 40px · padding 48/40/32   │
├──────────────────────────────────────────────────────────────┤
│  Footer (h: ~48px)                                           │  ← top-border 1px
└──────────────────────────────────────────────────────────────┘
```

- Root is a flex column, full viewport height, `overflow: hidden` (single-screen landing — no vertical scroll)
- `<main>` is `position: relative` and contains two absolutely-positioned ambient layers behind the content:
  1. A radial green glow (top-left, ~700×700, blur 40px, opacity via gradient)
  2. The `<AmbientWaveform>` SVG (full-width, 40% height, opacity 0.22, centered vertically)

### Nav (shared chrome)

- Padding `20px 40px`, `border-bottom: 1px solid var(--color-border-card)`
- **Logo** (left): 28×28 square icon (2px stroke, primary color, rounded 7px) with an "I I" / barbell mark inside, followed by wordmark `GYMFLOW` in Barlow Condensed 20px/700 uppercase, letter-spacing 0.02em
- **Right links** (13px/500, color `--color-fg-label`): `Schedule`, `Trainers`, and:
  - **Authed**: `Membership` + user pill (28px avatar circle + name "Dana", in a rounded-999 pill with `rgba(255,255,255,0.04)` bg)
  - **Logged-out**: `Pricing`, `Log in` (in `--color-primary-light`), `Join GymFlow` button (primary-green bg, black text, 8/16px, 8px radius, **`white-space: nowrap`**)

### Footer

- `16px 40px`, `border-top: 1px solid var(--color-border-card)`
- 12px text, `--color-fg-muted`
- Left: `"GymFlow · 214 Wythe Ave, Brooklyn · (718) 555-0144"`
- Right (gap 20px): `Mon–Fri 5am–11pm`, `Sat–Sun 7am–9pm`

---

### State 1 — Member, Booked Class

**Hero column:**

1. **Live eyebrow** (11px/600, letter-spacing 0.24em, uppercase, color `--color-primary-light`)
   - Pulsing 8px dot (primary color, `pulse-dot 1.6s ease-in-out infinite`)
   - Text: `"Live at the club · 47 members in"`

2. **Headline** (Barlow Condensed 72px/700, line-height 1.0, letter-spacing -0.01em, uppercase):
   ```
   Welcome back,
   [Dana.]   ← primary-green color
   ```

3. **Countdown row** (margin-top 40px, flex items-end gap 32px):
   - **BigCountdown** — label "Power Vinyasa starts in" (11px/600, 0.3em tracking, metadata color, margin-bottom 18px), then three digit cells separated by dimmed colons:
     - Each cell: min-width 96px, column-flex
     - Digit: **Barlow Condensed 88px/700**, line-height 0.95, letter-spacing -0.02em, color `--color-primary-light`, `font-variant-numeric: tabular-nums`
     - Unit label: 10px/600, 0.3em tracking, uppercase, metadata color, margin-top 4px — `HOURS`, `MIN`, `SEC`
     - Separators: same 88px Barlow, color `--color-fg-subtle`, opacity 0.4
   - **Right side** (padding-left 24px, left-border 1px `--color-border-card`): trainer name + studio/duration
     - "with" 13px muted
     - `Priya Mendes` 17px/600 white
     - `Studio B · 60 min` 12px metadata

4. **Button row** (margin-top 32px, gap 12px): `Check in now →` (primary) + `View schedule` (secondary ghost)

5. **TrainerRow** (margin-top 48px): overlapping 36px avatar circles (5 coaches, 2px black border, -10px margin-left overlap) + "8 coaches teaching this week · Meet the team"

**Right column:**

- **ActivityFeed** — "ACTIVITY" eyebrow, "● Live" indicator top-right, 8 feed rows (see data below)
- **StatsStrip** — 3 stat cells: `47 / On the floor`, `12 / Classes today`, `3 / Spots left · HIIT`

### State 2 — Member, No Booking

Same nav/layout. Hero column differs:

1. Same live eyebrow
2. **Headline**: `"Hey Dana."` / `"Get on a mat."` (second line in primary-green)
3. **Next-open card** (inline-flex, `rgba(34,197,94,0.05)` bg, `--color-primary-border` border, 16px radius, padding `24px 28px`, gap 28px):
   - Eyebrow: `"Next open · 45 min"` (11px/600, 0.24em, primary-light)
   - Class name: `"HIIT 45"` (Barlow 40px/700 white, uppercase)
   - Detail: `"Mia Taylor · Studio A · "` + `"3 spots left"` (spots in `#FDBA74` / accent-light)
   - CTA: `Grab a spot →` (primary button, 16/28 padding)
4. **Under-card link**: `"Or browse the full schedule — 11 more classes today."` (13px muted, link in primary-light)
5. Same TrainerRow

**Right column:** same ActivityFeed + StatsStrip (authed data).

### State 3 — Logged Out

Same nav (public variant), same layout. Hero differs:

1. **Eyebrow**: `"Brooklyn · Williamsburg"` (same styling as live eyebrow, still with pulsing dot)
2. **Headline** (80px instead of 72px, line-height 0.95):
   ```
   A gym with a
   [pulse.]   ← primary-green
   ```
3. **Subhead** (17px muted, max-width 480px, line-height 1.5):
   `"Strength, flow, and lifting classes six days a week. No crowded floors. No nonsense."`
4. **Button row**: `Start 7-day trial →` (primary) + `See a class` (secondary)
5. Inline trainer social-proof row (same as TrainerRow but phrased `"8 coaches, 1,200+ members · Meet the team"`)

**Right column:**

- ActivityFeed shows **anonymized** items ("A member checked in", "A member booked Power Vinyasa") — real names are member-only
- Feed eyebrow reads `"Live at the club"` instead of `"Activity"`
- StatsStrip shows public metrics: `1,200+ / Members`, `12 / Classes today`, `8 / Coaches`

---

## Interactions & Behavior

### BigCountdown
- Recomputes every 1000ms from a target timestamp
- Format `HH:MM:SS`, zero-padded, tabular-nums for no-jitter
- At zero: collapse/replace with a "Class starting now — check in" CTA (not yet implemented in prototype — add when wiring)

### AmbientWaveform (background behind hero)
- SVG path regenerated every animation frame (`requestAnimationFrame`)
- Base is a near-flat line with ±1.5px sine jitter, punctuated by an ECG-style QRS spike every 220px of x-distance
- The whole path scrolls horizontally at 60px/sec (leftward) via an `offset = (t * 60) % 220` modulo
- Opacity 0.22, stroked with a horizontal linear gradient that fades in at 20% and out at 80% so edges are soft
- **Respect `prefers-reduced-motion`** — freeze the waveform and the pulsing dot when set

### Activity Feed
- 8 items, vertical list, 14px/4 padding per row, 1px hairline between
- Auto-rotation: every 2800ms one row becomes "active" (opacity 1) while others dim to 0.55 — creates a ticker feel without actually scrolling
- Bottom 60px fades to page bg via a gradient overlay (so rows appear to dissolve off)
- Row structure: colored dot (8px + 12px glow, colored by kind) + actor (600 weight) + action (muted) + timestamp (right-aligned, 11px metadata, tabular-nums)
- **Kind colors**: `checkin` = primary-green, `booking` = accent-orange, `pr` = `#FDBA74`, `class` = `#60A5FA` (blue-400)

### Pulsing dot animation
```css
@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.5); opacity: 0.5; }
}
/* 1.6s ease-in-out infinite */
```

### Buttons
- **Primary**: `--color-primary` bg, `#0F0F0F` text, 8px radius, 14px/700, padding `14px 26px`, `box-shadow: 0 8px 24px rgba(34,197,94,0.3)`
- **Secondary**: transparent bg, white text, `1px solid rgba(255,255,255,0.2)` border, same padding/radius
- Hover: `filter: brightness(1.08)` 160ms; links use `brightness(1.15)`

### Navigation flows
- `Check in now` → `/check-in` (or opens QR modal if mobile — not in this scope)
- `View schedule` / `browse the full schedule` / `Grab a spot` → `/schedule` (deep-linked to the specific class where applicable)
- `Join GymFlow` / `Start 7-day trial` → `/signup`
- `Log in` → `/login`
- `Meet the team` → `/trainers`

---

## State Management

The page needs data from three backend sources. Recommend loading server-side on initial request where possible, then hydrating with a live feed on the client.

### `viewerState` (required)
- Determined from auth + bookings:
  - `"booked"` — authed AND `user.upcomingClasses[0]` exists and starts within the next 24h
  - `"nobooked"` — authed AND no upcoming booking in the next 24h
  - `"loggedOut"` — not authed

### `upcomingClass` (state `"booked"` only)
```ts
{
  id: string;
  name: string;          // "Power Vinyasa"
  startsAt: ISODate;     // drives countdown
  trainer: { name: string; avatarUrl?: string };
  studio: string;        // "Studio B"
  durationMin: number;   // 60
}
```

### `nextOpenClass` (state `"nobooked"` only)
Query: first class today with `spotsLeft > 0` starting after `now + 15min`.
```ts
{
  id: string;
  name: string;          // "HIIT 45"
  startsIn: string;      // "45 min" (formatted)
  trainer: { name: string };
  studio: string;
  spotsLeft: number;     // highlight in orange if <= 3
  remainingClassesToday: number;  // for "11 more classes today" copy
}
```

### `liveStats`
- Authed: `{ onTheFloor, classesToday, tightestClass: { name, spotsLeft } }`
- Public: `{ memberCount, classesToday, coachCount }`

### `activityFeed`
- Server returns last ~20 events, client subscribes to a websocket/SSE for new ones
- Event shape:
  ```ts
  { id: string; kind: "checkin" | "booking" | "pr" | "class"; actor: string; text: string; at: ISODate }
  ```
- **Public variant**: server must anonymize `actor` to `"A member"` and strip any PII from `text` before sending
- Client renders first 8 items, rotates "active" highlight every 2800ms

### Countdown
- Pure client computation from `upcomingClass.startsAt`
- Re-tick every 1000ms; clamp negative diffs to 0

---

## Design Tokens

All tokens live in `colors_and_type.css` (included in this bundle — port verbatim). Highlights used by this page:

### Color
- **Page bg**: `#0F0F0F`
- **Primary green**: `#22C55E` (buttons, dots, glow) · text variant `#4ADE80` · border `rgba(34,197,94,0.30)` · tint `rgba(34,197,94,0.05–0.15)` · glow `rgba(34,197,94,0.25)`
- **Accent orange**: `#F97316` (booking dot) · text `#FB923C` · light `#FDBA74` (used for "3 spots left" warning)
- **Surface tints over page bg**: `rgba(255,255,255,0.02)` (cards), `rgba(255,255,255,0.04)` (user pill)
- **Borders**: `--color-border-card` = `#1F2937`, subtle hairlines `rgba(255,255,255,0.04–0.08)`
- **Text**: default `#FFFFFF`, label `#D1D5DB`, muted `#9CA3AF`, metadata `#6B7280`, subtle `#4B5563`
- **Feed-kind dots**: checkin `#22C55E`, booking `#F97316`, pr `#FDBA74`, class `#60A5FA`

### Typography
- **Display**: Barlow Condensed (600, 700) — used for headlines, countdown digits, stat numbers, class names. Always uppercase in this design.
- **Sans (body)**: Inter (400, 500, 600, 700, 800)
- **Mono**: system ui-monospace stack (not used on this page)

**Scale actually used on this page:**
| Size | Weight | Usage |
|------|--------|-------|
| 88px Barlow / 0.95 lh / -0.02em | 700 | Countdown digits |
| 80px Barlow / 0.95 lh / -0.01em | 700 | Logged-out headline |
| 72px Barlow / 1.0 lh / -0.01em | 700 | Authed headlines |
| 40px Barlow / -0.01em | 700 | Next-open class name |
| 32px Barlow | 700 | Stat numbers |
| 20px Barlow | 700 | Logo wordmark |
| 17px Inter | 600 | Trainer name, subhead |
| 14px Inter | 600/700 | Buttons |
| 13px Inter | 500/600 | Nav links, feed rows, helper copy |
| 12px Inter | 400/500 | Footer, captions, metadata |
| 11px Inter / 0.22–0.3em tracking / uppercase | 600 | Eyebrows |
| 10px Inter / 0.2–0.3em tracking / uppercase | 600 | Unit labels |

### Spacing
4px base scale: **4 / 8 / 16 / 24 / 32 / 48 / 64**. Main uses 40px grid gap, hero uses 24–48px vertical rhythm.

### Radius
- 8px — buttons
- 12px — stat cells
- 16px — activity feed card, next-open card
- 999px — nav user pill, state switcher
- 50% — avatars, dots

### Shadows
- Primary button: `0 8px 24px rgba(34,197,94,0.3)`
- State switcher: `0 8px 24px rgba(0,0,0,0.6)` (dev-only UI)

### Motion
- Fast: 100ms · Normal: 200ms · Slow: 300ms
- Easing: `cubic-bezier(0, 0, 0.2, 1)` ease-out for enter, `cubic-bezier(0.4, 0, 0.2, 1)` for swaps
- `prefers-reduced-motion` must zero out transitions, waveform scroll, and dot pulse

---

## Assets

No raster images are used. All visuals are:
- **SVG logo** (inline, ~20 lines — see `<Logo>` in `pulse_shared.jsx`)
- **SVG ambient waveform** (generated in JS, see `<AmbientWaveform>` in `pulse_shared.jsx`)
- **Avatar placeholders** — colored circles with member initials, using `hsl(index*47+140, 60%, 50%)`. Replace with real headshots once available.
- **Favicon** — copy any GymFlow favicon from the existing codebase; the prototype references `../../assets/favicon.svg` which is a placeholder.

**Fonts**: Inter + Barlow Condensed via Google Fonts. Self-host in production.

---

## Files

Prototype source (in `design_reference/`):

| File | Contains |
|------|----------|
| `index.html` | Entry — loads React + Babel + the four JSX modules |
| `colors_and_type.css` | **Canonical design tokens** — port these to the real codebase |
| `pulse_shared.jsx` | `<Logo>`, `<Nav>`, `<Footer>`, `<AmbientWaveform>` |
| `pulse_feed.jsx` | `<ActivityFeed>`, `<StatsStrip>`, `<FeedDot>`, plus `FEED_AUTH` / `FEED_PUBLIC` sample data |
| `pulse_hero.jsx` | `<HeroBooked>`, `<HeroNoBooked>`, `<HeroLoggedOut>`, `<TrainerRow>`, `<BigCountdown>`, `useCountdown` hook |
| `pulse_app.jsx` | Top-level `<PulseLanding>`, state wiring, dev-only `<StateSwitcher>` (remove in production) |

### Dev-only: the state switcher
`<StateSwitcher>` (the pill at the top of the viewport that flips between the three states) is a **development/design tool only** — it persists the chosen state to `localStorage` and exists so designers can demo all three variants from one URL. **Do not ship it.** In production, `viewerState` comes from the server based on auth + bookings.

---

## Open Questions / Deferred

Things intentionally not designed yet — raise with the design lead before implementing:

- **Countdown at T-0**: what happens when the booked class starts? Suggest: swap BigCountdown for a "Class started · Check in now" banner, then after grace period swap to next class.
- **Mobile**: not yet designed. Desktop is the priority. Mobile is a follow-up ticket — the right column likely becomes a vertical stack below the hero, hero type drops ~20%, countdown digits drop to ~56px.
- **Real-time activity feed transport**: WebSocket vs SSE vs polling — pick based on existing infra.
- **Accessibility audit**: the prototype has reasonable contrast and respects reduced motion, but hasn't been screen-reader tested. The live-updating feed needs `aria-live="polite"` and the countdown needs a readable semantic fallback.
- **Logged-out with geo**: the "Brooklyn · Williamsburg" eyebrow assumes a single location. If GymFlow goes multi-location, this needs a selector.
