# Handoff: GymFlow "Pulse" Personal Training Booking

## Overview

New **personal-training booking** functionality — members book one-on-one sessions with a trainer of their choice, trainers see their upcoming sessions, admins see the full picture across the club. Applies the **"Pulse"** design DNA established on the landing page, member home, and profile. Companion to `design_handoff_pulse_landing`, `design_handoff_pulse_home`, and `design_handoff_pulse_profile`.

Scope covers three roles on one feature:

1. **Member** — browse trainers, view a trainer's availability on a 7-day calendar, book a 1-hour slot, manage/cancel bookings
2. **Trainer** — read-only view of their own upcoming sessions (PT sessions and group classes that block PT slots)
3. **Admin** — all PT sessions across all trainers and members, filterable + searchable

## About the Design Files

Files in `design_reference/` are **HTML/React prototypes** — design references, not production code. Recreate them in the target GymFlow codebase using its existing stack (React/Next.js, component library, data layer, auth + role guarding). The prototype uses React 18 + Babel + inline-style objects purely for prototyping convenience and contains a role switcher in the nav for review purposes — **remove the role switcher in production**; the role is determined by auth.

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii final. Pixel-match. Lofi bits:
- Trainer avatars are colored circles with initials — replace with real trainer headshots (fall back to initial on missing)
- All Edit / Message / Export CSV / Open buttons are stubs — wire to real routes/mutations
- Availability is computed client-side from in-file mock data (`data.jsx`) — move to server
- "24h rule" grey-out state is computed against `Date.now()` at page load — in production compute server-side so the slot doesn't flip mid-render

## Relationship to the other Pulse handoffs

**Reuses verbatim:**
- `pulse_shared.jsx` — `<Logo>` (Nav/Footer are inlined in `pt_app.jsx` to host the role switcher; factor back out in production)
- `colors_and_type.css` — design tokens

**New shared primitives** worth extracting into the app-wide component library (in `pt_shared.jsx`):
- `<Eyebrow tone="muted|primary|accent">` — uppercase label used across Pulse
- `<DisplayTitle size>` — Barlow Condensed uppercase page title
- `<Pill tone="primary|accent|danger|info|neutral">` — status / tag chip
- `<Card glow>` — standard card shell with optional green gradient variant
- `<Avatar initial accent size glow>` — initial-in-gradient-circle

---

## Screen Layout — Member view

Route `/training` (or `/personal-training`) for authenticated members.

```
┌─────────────────────────────────────────────────────────────┐
│  Nav (authed · with "Personal training" active)             │
├─────────────────────────────────────────────────────────────┤
│  PERSONAL TRAINING / eyebrow                                │
│  ONE-ON-ONE,                                                │
│  ON YOUR TERMS.   (Barlow 56px uppercase, line 2 green)     │
│  Every active member gets personal training...              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Your upcoming sessions                               │   │
│  │  [avatar] Today · 2:00pm [PT] ···  3h away  Cancel   │   │
│  │  [avatar] Tomorrow · 9:00am ···   23h away  Cancel   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  STEP 1 OF 3 · CHOOSE A TRAINER                             │
│  Pick who you want to train with                            │
│  [All] [Mobility] [Strength] [Powerlifting] [HIIT] [...]    │
│                                                             │
│  ┌──── Trainer card ────┐ ┌──── Trainer card ────┐ ...      │
│  │ avatar + name (Barlow│ │ ...                  │          │
│  │ bio, specialties     │ │                      │          │
│  │ Next open · 8 open   │ │                      │          │
│  └──────────────────────┘ └──────────────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  Footer                                                     │
└─────────────────────────────────────────────────────────────┘
```

After picking a trainer, the page transitions to the **slot picker** (Step 2):

```
← Back to trainers
[avatar 64]  STEP 2 OF 3 · PICK A TIME
             PRIYA MENDES            [← This week →]
             Mobility · Strength · Post-rehab · 1 hour · no cost

Legend: ■ Available  ■ Group class  ▨ Booked  ▨ Too soon · 24h rule

┌───┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│   │ MON │ TUE │ WED │ THU │ FRI │ SAT │ SUN │
│   │ 14  │ 15  │ 16  │ 17  │ 18  │ 19  │ 20  │
├───┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│6am│Book │Book │Book │ .   │Book │ .   │ .   │
│7am│CLASS│CLASS│CLASS│ .   │ .   │ .   │ .   │
│8am│Book │Book │Book │Book │Book │Book │Book │
│...│                                         │
└───┴─────────────────────────────────────────┘
```

Clicking a green "Book" cell opens the **confirm modal** (Step 3) — centered, green-glow header, the four info cells (When / Duration / Where / Cost), cancel-policy copy, two buttons.

---

## Screen Layout — Trainer view

Same shell. Header shows "TRAINER VIEW · {trainer name}" eyebrow and 3 stat tiles (PT sessions / Group classes / Total). Below, sessions are grouped by day with a sticky day label on the left and session rows on the right. Rows are color-coded with a 3px left border: **green = PT session**, **orange = group class**.

## Screen Layout — Admin view

Same shell. Header + 4 stat tiles (Active / Members booking / Trainers in play / Cancellations). Filter bar with search input + Trainer select + Status select + Export CSV. Table rows: When / Trainer / Member / Room / Status pill / Open button. Cancelled rows render strikethrough + muted with a red `Cancelled` pill.

---

## Components

### TrainerDirectory (Member, browse)
- Eyebrow `STEP 1 OF 3 · CHOOSE A TRAINER` (primary-green)
- `h1` "Pick who you want to train with" — Barlow Condensed 40px/700 uppercase
- Specialty filter chips row (7px/14px padding, 999 radius, active = green tint + green-light text + green border; inactive = white/03 bg + white/08 border + label color)
- Grid: `repeat(auto-fill, minmax(320px, 1fr))`, gap 16

### TrainerCard
Container: padding 22, `rgba(255,255,255,0.02)` bg, `--color-border-card` border, 16px radius, `overflow: hidden`, `cursor: pointer`. Hover: border `rgba(255,255,255,0.18)`, `translateY(-2px)`, bg `rgba(255,255,255,0.035)` (all 200ms).

Top-right absolutely-positioned accent glow: `180×180`, `radial-gradient(circle, {trainer.accent}22, transparent 70%)`, blur 20. Each trainer has a unique accent hex (green, orange, blue, purple, pink, yellow) for card identity.

Layout:
- Avatar (52px, glow) + Name (Barlow 24/700 uppercase) + "{yrs} yrs · {n} sessions"
- Bio — 13px label color, 1.5 line-height, `min-height: 60px` for even card heights
- Specialty chips — small pill, white/04 bg
- Bottom row (border-top hairline, pt 14): "Next open" label + date on the left, "This week" label + open-slot count (Barlow 22) on the right

### SlotPicker (Member, calendar)
- Back button (← Back to trainers) — muted, 13px, no background
- Header row: 64px avatar + eyebrow + Barlow 44 name + specialty/duration/cost line
- Week paginator on the right: ←/→ buttons (36×36, 8px radius, white/10 border, disabled state muted), center label "This week" | "Next week"
- Legend row (4 items): small colored block + uppercase label
- Grid card (1px border, 16px radius, overflow hidden):
  - Day header row: `72px + repeat(7, 1fr)` — day short name (today = green eyebrow) + day number (Barlow 22, today = green)
  - Hour rows: 72px time label + 7 slot cells, 52px min height
- Slot cell states:
  - **available** — green-tinted button "Book" (10/600 uppercase, letterspacing 0.04em). Hover: solid green bg + black text
  - **class** — orange-tinted panel "Class" (10/600 uppercase)
  - **booked** — white/03 bg + dashed white/08 border
  - **past** (<24h) — fainter white/015 bg + dashed white/05 border
- Info banner below: blue-tinted 12px copy explaining the 24h rule + live updates from class schedule

### ConfirmBooking (Member, modal)
Overlay `rgba(0,0,0,0.7)` + `backdrop-filter: blur(8px)`. Panel: max-width 520, `#0F0F0F` bg, 20px radius, `0 25px 50px rgba(0,0,0,0.5)` shadow, overflow hidden. Closes on backdrop click; inner click stops propagation.

Header band (24/28/20 padding): green-gradient bg + corner glow + eyebrow "STEP 3 OF 3 · CONFIRM" + Barlow 32 title "One hour, booked."

Body (24/28 padding):
- Trainer header — 52 avatar + name + specialties
- Info grid — 2 cols × 2 rows of `<InfoCell>` (When / Duration / Where / Cost). Inset panel treatment: `rgba(0,0,0,0.35)` bg, white/06 border, 10px radius, 12/14 padding. Stack of eyebrow (10/0.22em) + value (14/600) + sub (11 muted).
- Cancel-policy footnote — 12px muted
- Buttons — 2-col grid, gap 10: `Not yet` (secondary) + `Confirm booking` (primary green + glow)

### MyUpcomingPT (Member, top card)
Standard card shell. Header: "Your upcoming sessions" eyebrow (primary-green) + "{n} personal training session(s) booked".
Rows (grid `auto 1fr auto auto`, 14/18 padding, 12 radius, black/35 bg, white/06 border):
- 40 avatar (glow) + when + `[1hr · PT]` primary pill + room / trainer / note muted
- Countdown block right-aligned: Barlow 22 green-light number + "m/h/d" unit suffix + "away" caption
- Cancel ghost button

### TrainerSchedule (Trainer view)
Day-grouped list. Left column (140px): day label in Barlow 26, item count eyebrow. Right column: stack of `<SessionRow>`.

`<SessionRow>` — grid `auto 1fr auto`, 16/20 padding, 12 radius, 3px colored left border (green for PT, orange for class). Time (Barlow 22 tabular-nums) + member-or-class name + type pill + room + note + action ghost buttons (Message / Details for PT, Class page for classes).

Three stat tiles at top (`<StatTile>`): Barlow 34 number + eyebrow label + small sub. `minWidth: 150`, `white-space: nowrap` on the tile container to prevent the label wrapping.

### AdminSessions (Admin view)
Header + 4 stat tiles (`<AdminStat>`: Barlow 38 number, tone-colored).

Filter bar (joined to table — shares bottom-border-none with table top-border):
- Search input (10/14 padding, black/30 bg, white/08 border, 8 radius, 13px, flex `1 1 260px`)
- Trainer `<SelectPill>` + Status `<SelectPill>` (custom dropdowns: 0/4/4/12 padding, 999 radius, label + chevron-bg'd native `<select>`)
- Export CSV ghost button (right-aligned via `flex: 1` spacer)

Table:
- Header strip (white/03 bg): 10/0.22em eyebrows — When / Trainer / Member / Room / Status + empty
- Row grid: `180px 1.3fr 1.3fr 120px 140px 100px`, 14/18 padding, top hairline, hover bg white/02
- Cancelled rows: muted color + strikethrough + red "Cancelled" pill
- TinyAvatar (22×22) prefixes trainer name — uses trainer's accent hex from `TRAINERS`

---

## State Management

### `trainers`
```ts
{
  id: string;
  name: string;
  photoUrl?: string;       // fall back to initial
  initial: string;
  specialties: string[];
  bio: string;
  yearsExperience: number;
  sessionsCompleted: number;
  defaultRoom: string;     // "Studio B" / "Main Floor" / "Ring" / ...
  accentColor?: string;    // optional per-trainer accent; default brand green
}[]
```

### `availability` (computed server-side, per trainer, per window)
```ts
{
  trainerId: string;
  days: {
    date: ISODate;           // midnight, local
    open: number;            // 0–23
    close: number;
    slots: Record<hour, "available" | "class" | "booked" | "past">;
  }[];
}
```

Prototype computes this client-side in `buildAvailability(trainerId)` — in production:
- Server loads trainer's group-class assignments + PT bookings for the window
- Subtracts them from `gymHours(date)`
- Computes `past` vs `now + 24h`
- Returns the same shape keyed by hour

### `bookings` (per member)
```ts
{
  id: string;
  trainerId: string;
  trainer: string;         // denormalized for list UI
  startAt: ISODateTime;
  endAt: ISODateTime;       // always startAt + 1h
  room: string;
  note?: string;
  status: "confirmed" | "cancelled";
}[]
```

### Mutations
- `POST /pt-bookings` — `{ trainerId, startAt }` — server enforces: 24h lead, 1h duration, trainer free, gym open. Returns new booking or 409 with reason.
- `DELETE /pt-bookings/:id` — cancel (subject to cancel policy; see Open Questions)
- `GET /trainers` — list with computed `nextOpenAt` + `weekOpenCount` for the directory
- `GET /trainers/:id/availability?start=…&end=…` — days × slots
- `GET /trainers/me/sessions?start=…&end=…` — trainer view (PT + group classes, unified shape)
- `GET /admin/pt-sessions?start=…&end=…&trainerId=&status=&q=` — admin table

### Realtime
When a group class is scheduled that overlaps a pending PT slot, the PT availability must invalidate. Use websocket push or SWR-style revalidation on the slot picker.

---

## Interactions & Behavior

- **Trainer card click** — transitions to slot picker (same route, segment swap; the prototype uses a `stage` state, in production use `/training/{trainerId}`).
- **Week paginator** — limited to 2 weeks in the prototype (today + next 7 days). Spec is 14 days forward window; pagination disables at the boundary.
- **Slot click** — opens `ConfirmBooking` modal without changing route. Escape or backdrop click closes.
- **Confirm** — fire mutation, optimistic insert into `MyUpcomingPT`, toast `"Booked with {trainer} — {when}"`, return to browse stage.
- **Cancel (member)** — in prototype it's a one-click ghost button; in production open a confirm dialog that shows the cancel policy. Cancellation within 6h still counts against the booking cycle (see Business Rules).
- **Specialty filter** — pure client-side filter; no URL param in the prototype but should sync to `?specialty=Strength` in production for deeplinking.
- **Trainer view** — read-only. Message/Details buttons route to member DM / session detail (out of scope).
- **Admin filters** — Trainer + Status + full-text search across trainer, member, room, time. Debounce search input by 150ms in production.
- **Admin row Open** — routes to session detail (out of scope).
- **Role switcher** — **prototype-only**; remove in production. Real role is `useAuth().role`.

---

## Business Rules (from the brief)

Enforce **server-side**; the design merely reflects them:

1. **Duration fixed** — 1 hour. Client never sends duration.
2. **24h lead time** — reject `startAt < now + 24h`. Client hides such slots as "past" (dashed); server must still reject.
3. **No trainer overlap** — a trainer cannot have overlapping PT or group-class assignments.
4. **Availability = gym hours − group classes − existing PT** — derived, not user-editable.
5. **Trainers cannot set custom availability** — out of scope. No "availability editor" screen.

**Out of scope explicitly:** payments, trainer-set availability, ratings/reviews.

---

## Design Tokens

Ported from `colors_and_type.css` — use these, don't invent:

### Key values used on this feature
- Page bg `#0F0F0F`
- Card bg `rgba(255,255,255,0.02)`; inset panel bg `rgba(0,0,0,0.30–0.35)`
- Borders: `--color-border-card` (#1F2937), hairlines `rgba(255,255,255,0.04–0.06)`, ghost `rgba(255,255,255,0.08–0.20)`
- Primary green `#22C55E`, text variant `#4ADE80`, tint `0.08–0.12`, border `rgba(34,197,94,0.25–0.30)`
- Accent orange `#F97316`, text `#FB923C`, tint `0.08–0.10`, border `rgba(249,115,22,0.25–0.30)` — used for group-class blocks and `StatTile` accent
- Info blue `rgba(59,130,246,0.05)` bg + 0.15 border — used for the calendar rule banner
- Destructive red `#F87171` + `rgba(239,68,68,0.30)` border — used only for cancelled pills
- Trainer accent palette (per-card glow + tiny avatar): `#4ADE80`, `#FB923C`, `#60A5FA`, `#C084FC`, `#F472B6`, `#FACC15`

### Typography
| Size / line-height / tracking | Weight | Usage |
|------|--------|-------|
| 56px Barlow / 1.0 / -0.01em uppercase | 700 | Page h1 "One-on-one, on your terms." |
| 48px Barlow / 1.0 / -0.01em uppercase | 700 | Trainer-view + Admin-view h1 |
| 44px Barlow | 700 | Slot picker trainer name |
| 40px Barlow | 700 | "Pick who you want to train with" |
| 38px Barlow | 700 | Admin stat number |
| 34px Barlow | 700 | Trainer stat number |
| 32px Barlow | 700 | Confirm modal title |
| 26px Barlow | 700 | Trainer-view day label |
| 24px Barlow | 700 | Trainer card name |
| 22px Barlow tabular-nums | 700 | Trainer-schedule time, calendar day-number, admin table countdowns |
| 18px Inter | 600 | "N sessions booked" summary |
| 15px Inter | 500/600 | Row titles, session member name |
| 14px Inter | 500/600 | Info cell value, subtitle copy |
| 13px Inter | 500/600/700 | Buttons, admin table rows |
| 12px Inter | 400/500/600 | Helper copy, ghost buttons, filter chips |
| 11px Inter / 0.22em uppercase | 600 | Row eyebrows, day short name |
| 10px Inter / 0.22em uppercase | 600/700 | Inset eyebrows, status pills, slot cell labels |

### Spacing
Page padding 40/40/56. Max content width 1320. Card internal padding 22–28. Calendar row min-height 52. Grid gap between sections 24.

### Radius
- 6px — calendar slot cells
- 8px — buttons, inputs, week-paginator arrows
- 10px — inset info panels (booking info, calendar rule banner)
- 12px — inset cards (upcoming row), filter bar, admin table
- 16px — main cards, calendar card
- 20px — confirm modal
- 999 — pills, filter chips, role switcher, select pills
- 50% — avatars

### Shadows
- Primary button glow `0 8px 24px rgba(34,197,94,0.3)`
- Avatar glow `0 8px 24px rgba({accent},0.25)` (per-trainer tint)
- Confirm modal `0 25px 50px rgba(0,0,0,0.5)`
- Toast `0 12px 32px rgba(0,0,0,0.5)` + `backdrop-filter: blur(12px)`
- Ambient page glows: top-right green `blur(40px) opacity 0.10`, bottom-left orange `blur(40px) opacity 0.06`

### Motion
- Card hover: `translateY(-2px)` + border/bg swap — 200ms `ease-out`
- Slot hover: bg + text + border swap — 160ms
- Button hover: `filter: brightness(1.08)` 160ms
- Toast auto-dismiss 2.6s
- Respect `prefers-reduced-motion` — already covered in tokens CSS

---

## Accessibility

- **Role switcher is prototype-only** — in production the role is determined by auth, no UI toggle.
- **Calendar**:
  - Each available slot is a real `<button>` (not a div) — keyboard focusable, Enter activates.
  - Disabled states (`class`, `booked`, `past`) render as non-interactive divs (no focus stop). Add `aria-hidden="true"` or ensure they are skipped.
  - The grid should expose an `aria-label` per cell like `"Mon Nov 14 at 8:00am — available"` or `"... — group class, not available"`.
  - Consider a parallel list view (announced to screen readers) with grouped available slots, since a 2D grid is hard to navigate with a screen reader.
- **Confirm modal**: trap focus inside; return focus to the slot button on close; `Esc` closes; role `dialog` + `aria-labelledby`.
- **Icons/pills**: status is never color-only — pill text always names the state (`Confirmed`, `Cancelled`, `Class`, `PT`).
- **Filter select pills**: use a real `<select>` under the hood (prototype already does) so native mobile pickers work.
- **Admin search**: debounce and announce result count in an `aria-live="polite"` region.
- **Cancel button**: destructive action in production should open a confirm dialog — don't fire mutation from a single click.

---

## Files

In `design_reference/`:

| File | Contains |
|------|----------|
| `index.html` | Entry — loads React + Babel + JSX modules |
| `colors_and_type.css` | **Canonical design tokens** — port verbatim |
| `pulse_shared.jsx` | `<Logo>` (Nav/Footer are inlined in `pt_app.jsx`) |
| `data.jsx` | Mock trainers, group-class conflicts, existing PT bookings, admin rows |
| `pt_shared.jsx` | Time utilities (`buildAvailability`, `formatHour`, `formatDay`, …) + primitives (`<Eyebrow>`, `<DisplayTitle>`, `<Pill>`, `<Card>`, `<Avatar>`, `<RoleSwitcher>`, `<Toast>`) + button styles (`ptBtn.primary/secondary/ghost/danger`) |
| `pt_member.jsx` | `<MyUpcomingPT>`, `<TrainerDirectory>`, `<TrainerCard>`, `<SlotPicker>`, `<SlotCell>`, `<ConfirmBooking>`, `<InfoCell>`, `<LegendItem>` |
| `pt_trainer.jsx` | `<TrainerSchedule>`, `<StatTile>`, `<SessionRow>` |
| `pt_admin.jsx` | `<AdminSessions>`, `<AdminStat>`, `<AdminRow>`, `<SelectPill>`, `<TinyAvatar>` |
| `pt_app.jsx` | `<PersonalTrainingApp>` shell + nav + role-gated routing + `<MemberView>` wrapper |

### Reuse strategy
- Extract `<DisplayTitle>`, `<Eyebrow>`, `<Pill>`, `<Card>`, `<Avatar>` into the shared Pulse component library — they're reused by landing, home, profile, and now training.
- `buildAvailability` is a demo — the real implementation is server-side. The shape it returns is stable and the UI code above depends on it; keep the shape.
- `ptBtn` inline styles are convenience — in production, fold these into a single `<Button variant="primary|secondary|ghost|danger">` component.

---

## Open Questions / Deferred

- **Cancel window / penalty** — the confirm modal footnote says "cancel up to 6 hours before to get the booking slot back". This is design copy, not spec — confirm with product. Prototype cancels unconditionally; production needs the policy wired in.
- **Booking counts** — does a PT session count against the member's monthly booking quota? Prototype assumes **yes** (confirm modal says "Counts as 1 booking"). Confirm + wire into the existing quota system.
- **Notifications** — email/push on book, reminder (24h / 1h), trainer-side new-booking alert — not designed.
- **Recurring bookings** — "every Monday 9am for 8 weeks" — out of scope of the brief; flag if retention wants it.
- **Waitlist** — if a trainer is fully booked, can the member join a waitlist? Not in brief.
- **Trainer profile page** — the card has bio + stats but there's no dedicated `/trainers/:id` page. Reuse the existing Trainer Discovery page if present; link from the card.
- **Intake form / session notes** — the trainer-view `SessionRow` has a `note` ("Focus: shoulder mobility") — where does that come from? Member-entered during booking? Trainer-only notes? Needs spec.
- **Mobile** — not designed. Calendar grid doesn't fit 7 columns comfortably <640px. Recommendation: day selector chips (horizontal scroll) + vertical list of available hours for the selected day. Trainer + admin views stack; admin table becomes cards.
- **Empty / error states** — "No sessions match these filters" (admin) is covered. Not designed: trainer with zero availability this week ("Fully booked"), network error on booking, conflict (slot grabbed between page load and confirm).
- **Trainer cancelling on a member** — trainer-initiated cancellations (sickness, etc.) not designed.
- **Time zones** — prototype uses the browser's local time. Clubs in multiple zones will need server-side time zones.
- **Trainer accent colors** — per-trainer hex is currently a design convenience. Could be a real stored field (brand per trainer) or derived (hash of trainerId). Confirm with the team.
