# Handoff: GymFlow "Pulse" Member Home

## Overview

This handoff covers a redesign of the **logged-in member home page** (the page a member lands on after sign-in). It applies the same **"Pulse"** design DNA used in the landing page redesign — a live, activity-driven aesthetic that treats the gym like a heartbeat you can tune into.

**No new features were added.** Every piece of data already existed on the prior home page (`ui_kits/member_app` HomeScreen). This is a pure visual + compositional rethink of:

- Welcome greeting
- Next booked class
- Upcoming bookings list (3 next sessions)
- Membership status & renewal info
- Member stats (bookings left, plan countdown, favorite coaches)

Where the old home was a flat card-grid ("welcome + two side-by-side cards"), the new home foregrounds the **live state of the club** — a dramatic countdown to the next class, an ambient ECG waveform, and a ticker of what's happening on the floor right now.

## About the Design Files

The files in `design_reference/` are **HTML/React prototypes** built to demonstrate look, feel, and behavior. They are **not production code to ship as-is**. Your task is to recreate these designs inside the target GymFlow codebase using its existing stack, component library, routing, auth, and data layer.

The prototype uses:
- React 18 via CDN + inline Babel (for convenience only — replace with the codebase's build system)
- Plain inline-style objects (replace with the codebase's CSS/styling solution — Tailwind, CSS Modules, styled-components, whatever is in use)
- Design tokens from `colors_and_type.css` — these **should be ported faithfully**; they are the canonical GymFlow design system

## Fidelity

**High-fidelity.** Colors, typography, spacing, border radii, and micro-interactions are all final. Pixel-match the prototype. The only lofi elements are:

- Member avatars (colored circles with initials, in nav user pill) — replace with real photo avatars
- Sample data (upcoming classes, coach names) — wire to real backend

Everything else — layout, type ramp, countdown treatment, ambient waveform, membership card visuals, bookings list — should be matched exactly.

## Relationship to the landing-page handoff

This design **reuses four files verbatim** from the landing-page handoff:
- `pulse_shared.jsx` — `<Logo>`, `<Nav>`, `<Footer>`, `<AmbientWaveform>`
- `pulse_feed.jsx` — `<ActivityFeed>`, `<StatsStrip>`, `<FeedDot>`
- `pulse_hero.jsx` — `<BigCountdown>`, `useCountdown` hook (we reuse the countdown primitive, but NOT the three landing hero variants)
- `colors_and_type.css` — design tokens

When building both pages in your real codebase, these should be **shared components**, not duplicated. Extract them into a `components/pulse/` (or similar) module used by both the landing route and the home route.

---

## Screen Layout

Single page at route `/` for authenticated members. Vertically scrollable (the home is taller than a single viewport).

```
┌──────────────────────────────────────────────────────────────┐
│  Nav (authed: Schedule · Trainers · Membership · [User])     │  ← bottom-border 1px
├──────────────────────────────────────────────────────────────┤
│  HERO ROW                                                    │
│  ┌────────────────────┐    ┌──────────────────────────┐      │
│  │ Welcome back,      │    │  At the club (feed)      │      │
│  │ DANA.              │    │  8 class-level events    │      │
│  │ [countdown]        │    │                          │      │
│  │ [add-to-cal btns]  │    └──────────────────────────┘      │
│  └────────────────────┘                                      │
│  grid: 1.3fr 1fr · gap 40px · min-height 440px              │
├──────────────────────────────────────────────────────────────┤
│  STATS STRIP                                                 │
│  ┌─────────┬─────────┬──────────────┐                        │
│  │ 8 / 12  │ 12 days │ 3            │                        │
│  │ left    │ renews  │ coaches saved│                        │
│  └─────────┴─────────┴──────────────┘                        │
│  3-col grid · gap 14px                                       │
├──────────────────────────────────────────────────────────────┤
│  BOTTOM ROW                                                  │
│  ┌─────────────────────┐  ┌────────────────────────────┐     │
│  │ Upcoming            │  │ Your Access                │     │
│  │  · Morning Flow Yoga│  │  QUARTERLY MEMBERSHIP      │     │
│  │  · Strength Foundns │  │  [bookings bar]            │     │
│  │  · HIIT Intervals   │  │  [renewal countdown card]  │     │
│  │                     │  │  [Manage]                  │     │
│  └─────────────────────┘  └────────────────────────────┘     │
│  grid: 1.4fr 1fr · gap 20px                                  │
├──────────────────────────────────────────────────────────────┤
│  Footer                                                      │
└──────────────────────────────────────────────────────────────┘

<main> is `position: relative`, `overflow: hidden`, padding 40/40/48.
Max content width 1440px, centered.
```

### Ambient layers (inside `<main>`, behind everything)
1. **Radial green glow** — top-left, ~800×600, `blur(40px)`, `radial-gradient(rgba(34,197,94,0.13), transparent 60%)`
2. **AmbientWaveform SVG** — positioned `top: 60px`, height 400px, full-width, opacity 0.22; identical to landing

---

## Components

### Nav (authed)
Same `<Nav mode="booked">` as the landing authed variant. Links: `Schedule`, `Trainers`, `Membership`, user pill (avatar initial + "Dana") in a rounded-999 chip.

### HomeHero (replaces the old "welcome card")

- **Live eyebrow** — pulsing green dot + `"Live at the club · 47 members in"` (11px/600, 0.24em tracking, uppercase, primary-light color, `white-space: nowrap`)
- **Headline** — Barlow Condensed 64px/700, line-height 1.0, letter-spacing -0.01em, uppercase:
  ```
  Welcome back,
  Dana.   ← primary-green color
  ```
- **Countdown row** (margin-top 32px) — `<BigCountdown label="Morning Flow Yoga starts in">` with 88px Barlow digits tabular-nums, HOURS/MIN/SEC units, muted colon separators. Right side: 1px left-border separator, then:
  - "with" (13px muted)
  - `Priya Mendes` (17px/600 white)
  - `Studio B · 60 min` (12px metadata)
- **Buttons** — `Add to calendar` (primary green) + `Cancel booking` (ghost border)

**Countdown target** is computed from the member's next booked class (here, tomorrow 7am). Recomputes every 1000ms. Collapse gracefully at T-0 → swap for a "Class starting · check in" banner.

### MemberStats (3-column stat strip)
Each cell: padding `18/20`, `rgba(255,255,255,0.02)` bg, `--color-border-card` border, 14px radius. Inside:
- 10px/600 uppercase eyebrow (0.24em tracking) — `BOOKINGS LEFT`, `PLAN RENEWS`, `FAVORITE COACHES`
- Big number: Barlow 44px/700, letter-spacing -0.02em, tabular-nums, white
- Denominator (optional, 13px muted) — `/ 12` or `days`
- Sub-line: 12px muted — `this month`, the actual renewal date, `Priya, Jordan, +1`

### UpcomingSection (replaces old "Next three sessions" card)
Container: padding 28, `rgba(255,255,255,0.02)` bg, `--color-border-card` border, 16px radius.

Header row:
- Eyebrow `UPCOMING` (11px/600, 0.22em tracking) + display title `NEXT THREE SESSIONS` (Barlow 26px/700 uppercase)
- Right: `Open schedule →` link in primary-light

List rows: grid `auto 1fr auto`, gap 20px, padding-y 18px, 1px hairline separator between (not before the first).
- **Time column** (min-width 120px): Barlow 22px/700 day ("Tomorrow", "Thu", "Sat") — **primary-light for the first (next-up) row, white otherwise** — plus 12px metadata time below
- **Class column**: 15px/600 white class name, 12px muted `"Coach · Room · Duration"` line
- **Status pill** (inline-flex, rounded-999, padding 5/10, `white-space: nowrap`):
  - First row: `● Next up` — green tinted bg, primary-border border, primary-light text, solid green dot
  - Others: `Booked` — `rgba(255,255,255,0.04)` bg, subtle border, label-color text

### MembershipSection (replaces old "Quarterly membership" card)
Container: padding 28, radius 16, `--color-border-card` border. Background is a **vertical gradient** from `rgba(34,197,94,0.06)` at top to `rgba(255,255,255,0.02)` at 70%. Absolute-positioned **corner glow** top-right: 200×200 radial, blur 20px, primary-green 0.2 opacity.

Content stack:
1. Row: `YOUR ACCESS` eyebrow + green **ACTIVE** pill (primary-tint bg, primary-border, 10px/700 letter-spaced, with solid dot)
2. Display title — Barlow 34px/700 uppercase, two lines: `QUARTERLY / MEMBERSHIP`
3. **Bookings progress**
   - Row: `Bookings this cycle` (12px muted) on left, `4 / 12` (12px/600 white tabular-nums) on right
   - Bar: 6px tall, 999 radius, `rgba(255,255,255,0.06)` track, fill is `linear-gradient(90deg, --color-primary, --color-primary-light)` with `0 0 12px rgba(34,197,94,0.5)` glow, width = `(used / max) * 100%`
4. **Renewal mini-card**: padding 14/16, `rgba(0,0,0,0.3)` bg, subtle white border, 12px radius, flex row:
   - Left: `RENEWS` eyebrow + `May 2, 2026` (14px/600 white)
   - Right: Barlow 28px/700 in primary-light — `"12"` — + `"days"` suffix (12px muted)
5. **Manage membership** button (full-width, transparent, subtle border, 8px radius)

### ActivityFeed — `mode="club"` (key difference from landing)

The home feed is **club-level only** — no personal names, no individual check-ins, no personal PRs. The member doesn't want to see who checked in; they want to see class-level signal.

Eyebrow: `AT THE CLUB` (instead of `ACTIVITY`).

**Sample items (all in `FEED_CLUB` in `pulse_feed.jsx`):**
```
● HIIT 45            starts in 20 min · 3 spots left    now
● Power Vinyasa      11 / 16 spots filled               2m
● Strength Foundns   2 new bookings                     4m
● Mobility           sold out · waitlist open           6m
● Open gym floor     23 members in                      9m
● Oly Lifting        Fri 6pm filling fast              12m
● Yoga Sculpt        added · Sat 9am                   18m
● Sunrise Run        5 / 12 spots                      24m
```

Same visual treatment as landing: colored dot + 8px glow, actor (600 weight), action (muted), right-aligned timestamp. Auto-rotating "active" highlight every 2800ms (one row opacity 1, others 0.55). Bottom 60px fades to page bg.

**Kind colors**: `checkin` = primary-green (unused on Home), `booking` = accent-orange, `class` = `#60A5FA` (blue-400), `pr` = `#FDBA74` (unused on Home).

---

## State Management

The page needs these data sources. Server-side render the initial state; hydrate the feed with a live connection after mount.

### `user` (required — else redirect to /login)
```ts
{ id, name, avatarUrl }
```

### `nextBookedClass` (drives the hero countdown)
```ts
{
  id: string;
  name: string;        // "Morning Flow Yoga"
  startsAt: ISODate;   // drives BigCountdown
  trainer: { name: string };
  studio: string;      // "Studio B"
  durationMin: number; // 60
}
```
If null (no upcoming booking), the hero should swap to a **no-booked** variant — show the next-open class with a "Grab a spot" CTA. This is exactly the `HeroNoBooked` component from the landing handoff — reuse it.

### `upcomingBookings` (drives `<UpcomingSection>`)
Array of 3 items:
```ts
{
  id, name, startsAt,
  trainer: { name },
  studio: string,
  durationMin: number,
}
```
Client formats `startsAt` into "Tomorrow · 7:00am", "Thu · 6:30pm", "Sat · 9:00am" relative-day strings.

### `membership` (drives `<MembershipSection>` + stats)
```ts
{
  plan: "Monthly" | "Quarterly" | "Annual";
  status: "active" | "expired" | "paused";
  renewsAt: ISODate;
  bookingsUsed: number;
  bookingsMax: number;   // treat Infinity/null as unlimited — hide progress, show "Unlimited"
  renewsInDays: number;  // derived; compute on server to avoid TZ drift
  savedCoaches: Array<{ name }>;  // for "Favorite coaches" stat
}
```

### `liveFeed` (drives `<ActivityFeed mode="club">`)
- Server returns last ~20 **class-level events only** (no personal check-ins/PRs/named bookings)
- Client subscribes to a websocket/SSE for updates; renders the first 8, rotates the active highlight
- Event shape identical to landing: `{ id, kind, actor, text, at }` where `kind ∈ ["booking", "class"]` for this feed; `actor` is a class name not a person

### `clubStats` (for hero eyebrow)
`{ membersOnFloor: number }` drives "Live at the club · 47 members in". Poll every ~60s or push via the same feed.

---

## Interactions & Behavior

### Hero
- `Add to calendar` — generates .ics from `nextBookedClass.startsAt` and downloads (or adds to Google Cal if OAuth connected)
- `Cancel booking` — confirm dialog → API call → optimistic removal from upcoming + stat decrement + toast `"Cancelled {class name}"`

### Upcoming section
- Entire row clickable → `/schedule?classId={id}`
- `Open schedule →` → `/schedule`

### Membership section
- `Manage membership` → `/membership` (existing route)
- Progress bar is display-only (no interaction)

### Motion
- `prefers-reduced-motion: reduce` must zero out:
  - BigCountdown **still ticks** (it's information, not decoration) but suppress the sub-second easing on unit changes
  - AmbientWaveform scroll
  - Dot pulse
  - ActivityFeed opacity crossfade

### Accessibility
- Hero countdown needs `aria-label="Morning Flow Yoga starts in 2 hours 14 minutes"` that updates on each tick (or use `aria-live="polite"` on a hidden mirror)
- Activity feed should be `role="log"` with `aria-live="polite"`
- Color-alone distinctions (first upcoming vs others) must be backed by text — the "Next up" label does this correctly; keep it

---

## Design Tokens

All tokens live in `colors_and_type.css` (included — port verbatim). Specific values used on this page:

### Color
- **Page bg**: `#0F0F0F`
- **Primary green**: `#22C55E` (CTAs, progress fill, active dots) · text `#4ADE80` · border `rgba(34,197,94,0.30)` · glow `rgba(34,197,94,0.25–0.5)` · tints `rgba(34,197,94,0.05–0.10)`
- **Accent orange**: `#F97316` (booking dot) · light `#FDBA74`
- **Surface tints over page bg**: `rgba(255,255,255,0.02)` for card bgs, `rgba(0,0,0,0.3)` for inset panels
- **Borders**: `--color-border-card` = `#1F2937`, subtle hairlines `rgba(255,255,255,0.04–0.08)`, `rgba(255,255,255,0.15)` for ghost buttons
- **Text**: default `#FFFFFF`, label `#D1D5DB`, muted `#9CA3AF`, metadata `#6B7280`, subtle `#4B5563`
- **Feed-kind dots**: class `#60A5FA`, booking `#F97316`

### Typography

Font families: **Barlow Condensed** (600, 700) for display/numbers, **Inter** (400, 500, 600, 700) for body.

Scale used on this page:

| Size / lh / tracking | Weight | Usage |
|------|--------|-------|
| 88px Barlow / 0.95 / -0.02em | 700 | Countdown digits |
| 64px Barlow / 1.0 / -0.01em uppercase | 700 | Hero headline |
| 44px Barlow / -0.02em | 700 | Stat numbers |
| 34px Barlow / 1.05 / -0.01em uppercase | 700 | Membership title |
| 28px Barlow / -0.01em | 700 | Renewal countdown number |
| 26px Barlow / -0.01em uppercase | 700 | "Next three sessions" |
| 22px Barlow / 1.1 / -0.01em | 700 | Upcoming row day label |
| 17px Inter | 600 | Trainer name |
| 15px Inter | 600 | Class name in upcoming row |
| 14px Inter | 600 | Renewal date, manage button |
| 13px Inter | 500/600/700 | Nav, buttons, links, helper copy |
| 12px Inter | 400/500/600 | Metadata, footer, progress copy |
| 11px Inter / 0.22–0.24em tracking uppercase | 600 | Eyebrows |
| 10px Inter / 0.22–0.24em tracking uppercase | 600/700 | Stat labels, ACTIVE pill |

### Spacing
4px base scale: 4 / 8 / 16 / 24 / 32 / 48 / 64. Main uses padding `40/40/48`. Hero row gap 40px, stats gap 14px, bottom grid gap 20px. Cards internal padding 24–28.

### Radius
- 8px — buttons
- 12px — inset renewal panel
- 14px — stat cells
- 16px — upcoming & membership containers, activity feed
- 999px — pills, progress bar
- 50% — avatars, dots

### Shadows
- Primary button: `0 8px 24px rgba(34,197,94,0.3)`
- Progress bar fill glow: `0 0 12px rgba(34,197,94,0.5)`

### Motion
- Fast 100ms · Normal 200ms · Slow 300ms
- Button hover: `filter: brightness(1.08)` over 160ms
- Feed row crossfade: 400ms ease
- Dot pulse: `pulse-dot 1.6s ease-in-out infinite`
- Waveform scroll: `60px/sec` continuous

---

## Assets

No raster images. All visuals are:
- Inline SVG logo (see `<Logo>` in `pulse_shared.jsx`)
- JS-generated SVG ambient waveform (see `<AmbientWaveform>` in `pulse_shared.jsx`)
- Avatar placeholders (colored circles with initials). Replace with real member/trainer photos.

Fonts: Inter + Barlow Condensed via Google Fonts. Self-host in production.

---

## Files

Prototype source (in `design_reference/`):

| File | Contains |
|------|----------|
| `index.html` | Entry — loads React + Babel + five JSX modules |
| `colors_and_type.css` | **Canonical design tokens** — port these to the real codebase |
| `pulse_shared.jsx` | `<Logo>`, `<Nav>`, `<Footer>`, `<AmbientWaveform>` — **shared with landing** |
| `pulse_feed.jsx` | `<ActivityFeed>`, `<StatsStrip>`, `<FeedDot>`, `FEED_CLUB` sample data — **shared with landing** |
| `pulse_hero.jsx` | `<BigCountdown>`, `useCountdown` — **shared with landing** (only these two are used here; the three landing hero variants are not used on home) |
| `home_sections.jsx` | `<HomeHero>`, `<MemberStats>`, `<UpcomingSection>`, `<MembershipSection>` — **home-specific** |
| `home_app.jsx` | Top-level `<HomePage>` — composes the layout |

### Reuse strategy
In the real codebase, `pulse_shared.jsx`, `pulse_feed.jsx`, and `pulse_hero.jsx` should live in a shared module (e.g. `src/components/pulse/`) imported by **both** the landing route and the home route. Do not duplicate.

---

## Open Questions / Deferred

- **No-booking variant of Home**: when `nextBookedClass` is null, hero should switch to a `HeroNoBooked` style — reuse the landing-page variant with a "Grab a spot in {next open class}" CTA.
- **Countdown at T-0**: what happens when the booked class starts? Suggest: swap BigCountdown for a "Class started · Check in now" banner, then after grace period swap to the next upcoming class.
- **Empty states**: what if the member has zero upcoming bookings? Suggest: replace `<UpcomingSection>` with an empty-state card — "No sessions booked · Open schedule to book your week".
- **Mobile**: not yet designed. Desktop-first. Right column will stack below hero on narrow viewports, hero type drops ~25%, countdown digits drop to 56px, stats stack vertically.
- **Real-time activity feed transport**: WebSocket vs SSE vs polling — pick based on existing infra.
- **Club stats accuracy**: "47 members in" — is there a real data source? If not, either wire it or replace with a softer signal like "Open gym floor is active".
- **Saved coaches data**: the "Favorite coaches" stat pulls from `user.savedCoaches` — verify that field exists or add it.
