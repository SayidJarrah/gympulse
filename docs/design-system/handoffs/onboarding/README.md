# Handoff: GymFlow "Pulse" Onboarding Flow

## Overview

A **multi-step onboarding flow** for newly-registered GymFlow members. Runs once, immediately after account creation (email + password), and populates the richer profile data model, optionally sets up a membership, and optionally books a first class or personal training session.

Applies the **"Pulse"** design DNA established on the landing page, home, profile, and training pages. Companion to `design_handoff_pulse_landing`, `design_handoff_pulse_home`, `design_handoff_pulse_profile`, and `design_handoff_pulse_training`.

**Scope is exactly what the brief defines** — see `design_reference/brief.md`:

1. Welcome (sets expectations)
2. Profile — required fields + optional photo
3. Preferences — fitness goals, preferred classes, frequency (all optional)
4. Membership — pick a plan or skip
5. First booking — shown only if a plan was picked; otherwise skipped entirely
6. Final check — terms, waiver, notification preferences (placeholder)
7. Done screen — summary + "Enter GymFlow" CTA

Payment is out of scope. Terms + notifications step is a UI shell only.

## About the Design Files

Files in `design_reference/` are **HTML/React prototypes** — design references, not production code. Recreate them in the target GymFlow codebase using its existing stack (React/Next.js, component library, forms, auth, data layer). The prototype uses React 18 + Babel + inline-style objects purely for prototyping convenience; real form state should use the codebase's form stack (react-hook-form, Formik, etc.).

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii are final and token-driven — pixel-match intended. Lofi bits:

- **Photo upload** uses a `FileReader`-based local preview. Replace with a real upload pipeline (signed-URL → object storage, EXIF strip, resize).
- **Plan pricing** is visual only — no checkout. The brief is explicit: payment is out of scope. On "Continue" from the membership step, create an intent/placeholder record; do NOT attempt to charge.
- **Trainer calendar** slots are hard-coded in the prototype. Back it with the real trainer-availability endpoint.
- **Terms / notifications** step is a placeholder — the checkboxes render, but the real terms-acceptance versioning + notification-preference backend is deferred per the brief.
- **"Confetti ping"** on the Done screen is suggestive — use your codebase's standard success-feedback (toast, subtle animation).

## Design DNA (inherited from Pulse)

Pull these from the existing handoffs — do **not** reinvent:

- `colors_and_type.css` (or the tokens.css mirror in `design_reference/`) — all CSS custom properties
- `MemberNav` — the authed top chrome. Onboarding uses a **simplified** variant (see "Mini nav" below)
- Barlow Condensed uppercase display headlines with `letter-spacing: -0.01em`
- Inter body copy
- Uppercase section eyebrows, 11px/600, `letter-spacing: .22em`, in `--color-primary-light`
- Dark surfaces: `--color-bg-page` → `--color-bg-surface-1` → `--color-bg-surface-2`
- Primary action: solid `--color-primary` (green) with `#0F0F0F` foreground

## Top-level app shape

Route: `/onboarding` (auth-required). Gate is "user has an account but `onboarding_completed_at IS NULL`".

Redirect rule: until completion, **any** authed route should 302 to `/onboarding`. Optional "Skip for now → go to app" button can exist in product, but the design does not expose one — completion is the intended path.

Persistence: the prototype persists `{step, data}` to `localStorage["gf:onboarding:v1"]` on every edit. In production:
- Persist to the backend on each step advance (idempotent PATCH of the in-progress profile + onboarding checkpoint)
- Also stash a copy in localStorage keyed by user, so refreshes don't lose in-flight typing

---

## Layout

Full-viewport, dark background, three vertical regions:

```
┌────────────────────────────────────────────────────────────────┐
│  MINI NAV (logo lockup + "Step 03 of 06 · Prefs" eyebrow)      │  ~72px
├────────────────────────────────────────────────────────────────┤
│  PROGRESS BAR (optional, tweakable — thin 3px rail)            │  3px
├─────────────┬──────────────────────────────────────────────────┤
│             │                                                  │
│  STEP RAIL  │   STEP CONTENT (scrolls independently)           │
│  (left)     │   max-width 720–820px                            │
│  260px      │                                                  │
│             │                                                  │
├─────────────┴──────────────────────────────────────────────────┤
│  STICKY FOOTER (Back  ·  Skip this step  ·  Continue)          │  ~88px
└────────────────────────────────────────────────────────────────┘
```

Body grid: `grid-template-columns: 260px 1fr; gap: 48px; padding: 40px 48px`. Max content width inside right column: 820px.

### Mini nav (top)
- Left: GymFlow logo lockup (uses the shared `Logo` component from `pulse_shared.jsx` — **mark only**, no full lockup on onboarding to keep it calm)
- Right: eyebrow `STEP 03 · PREFS` + linear fraction `3 of 6` in muted tone
- 1px bottom border in `--color-border-card`
- No primary nav links — the user cannot leave the flow without explicit action

### Step rail (left column)
Numbered vertical stepper. Each row:
- Circle numeral (Barlow Condensed, tabular), 28px, color shifts by state:
  - **current**: filled `--color-primary`, foreground `#0F0F0F`, subtle 0 0 0 4px glow (`rgba(34,197,94,.15)`)
  - **done**: outline `--color-primary-border`, Check icon instead of numeral
  - **todo**: outline `--color-border-card`, numeral in `--color-fg-muted`
- Label right of numeral: 14px/500 — white if current/done, `--color-fg-muted` if todo
- Sub-label below: required / optional / if plan chosen — 10px/600, letter-spacing .18em, uppercase
- Rows are `<button>`s: done rows jump back; current & todo are non-interactive (disabled cursor)
- Rail variant: tweakable — `"rail"` (full stepper, default), `"bar"` (thin top progress only, no rail), `"both"` (top bar + full rail)

### Step content (right column)
Each step follows the same skeleton:
- Eyebrow: `Step 02 · Your profile`
- `<h1>` headline — Barlow Condensed, 48px uppercase with `letter-spacing: -0.01em`, line-height 1
- Inline pill next to the h1: `REQUIRED` or `OPTIONAL` (same treatment as rail sub-labels)
- Lede paragraph — 15px, `--color-fg-label`, max-width 580px, line-height 1.6
- Content grid below (form, plan cards, etc.)

### Sticky footer
- Height ~88px, `--color-bg-surface-1` with top border
- Left: **Back** — ghost button, disabled on step 0
- Center: **Skip this step** — ghost text button, only shown when `!step.required && step.key !== "welcome"`
- Right: **Continue** (label varies — see per-step notes) — primary green pill with right arrow
- On the last step the right button becomes **Finish onboarding →**

---

## Steps in detail

### Step 1 — Welcome

- Eyebrow `Step 01 · Welcome`, headline `Welcome to GymFlow`
- Personalized lede ("Hey there — we'll…") that uses `firstName` if already present (for users who return mid-flow)
- 3 preview cards in a 3-col grid, each ~240px tall:
  1. **Your profile** (icon: user-circle) — "2 minutes · required"
  2. **Your plan** (icon: credit-card) — "optional"
  3. **Your first booking** (icon: calendar) — "optional · if you picked a plan"
- Cards use `--color-bg-surface-1`, 1px `--color-border-card`, `--radius-lg`. Hovering lifts 2px with `--color-primary-border` outline.
- Footer primary label: **Let's go →**

### Step 2 — Your profile (REQUIRED)

Fields (all in one form column, 560px):

| Field | Required | Type | Notes |
|---|---|---|---|
| First name | ✓ | text | autoFocus on mount |
| Last name | ✓ | text | |
| Phone | ✓ | tel | format-as-you-type; `+1 (###) ###-####` US default |
| Date of birth | ✓ | date | native `<input type="date">` is fine; style the control to match |
| Profile photo | — | file | preview shows 96px avatar circle with uploaded image or initial fallback |

Validation: required-field check on Continue. Errors render inline under the field — 12px, `--color-status-danger-text`, small Alert-icon prefix.

Photo uploader:
- 96×96 circle on the left; on the right "Add a photo" button (outline) + 11px caption "JPG or PNG · up to 5 MB"
- On select: instant preview via `URL.createObjectURL` (prototype uses FileReader — use createObjectURL in production)
- Secondary "Remove" button appears when a photo is present

### Step 3 — Preferences (OPTIONAL)

All content in a single scrollable column. Three sub-sections with uppercase eyebrow separators:

1. **Your goals** — multi-select chip grid (3 cols × 2 rows = 6 options): Build strength, Lose weight, Improve mobility, Cardio & endurance, Train for an event, Just move more. Each chip: 48px tall, icon + label, outlined; selected = `--color-primary` fill + `#0F0F0F` text + green glow.
2. **Classes you're curious about** — same chip grid, e.g. Yoga, HIIT, Strength, Spin, Mobility, Pilates, Boxing, Open gym.
3. **How often do you plan to train?** — single-select pill row: 1–2×/week, 3–4×/week, 5+×/week, Still figuring it out.

None of these block Continue. Footer shows **Skip this step** in the center.

### Step 4 — Membership (OPTIONAL)

Three plan cards side-by-side in a 3-col grid (gap 16px), plus one "No plan for now" card below.

Plan card anatomy (matches the pricing table on the landing page):
- 28px padding, `--color-bg-surface-1`, 1px `--color-border-card`, `--radius-lg`
- Eyebrow with plan name (e.g. `MONTHLY`) in `--color-primary-light`
- Big price — Barlow Condensed 48px, `$XX` numeric, `/mo` suffix in `--color-fg-muted`
- 4–5 bullet list with Check icons
- Full-width selector button at bottom — "Select plan" → "Selected" when active
- When selected: border shifts to `--color-primary`, subtle green glow (`box-shadow: 0 0 0 1px var(--color-primary), 0 8px 24px rgba(34,197,94,.12)`)
- Featured plan (Quarterly) has a "Most popular" ribbon — gradient on the top border

The **"No plan for now"** card is full-width, muted: explains that membership is optional and the user can pick one later from their profile. Selecting it clears any `data.plan` and allows Continue.

**Critical behavior**: if `data.plan === null`, the next visible step is **Final check**, not Booking. The step rail should reflect this — the Booking row disappears from the rail when no plan is selected. Implemented in the prototype via:
```js
const visibleSteps = ALL_STEPS.filter(s => s.key !== "booking" || !!data.plan);
```

### Step 5 — First booking (OPTIONAL, conditional)

Only rendered if `data.plan` is truthy.

Top-of-step toggle (pill group): **Group class** / **Personal training**.

#### Group class mode
Vertical list of 4 upcoming class cards. Each row is a `<button>`:
- Left: date tile — 82×auto, `--color-bg-surface-2`, rounded-md. Day abbrev (uppercase, 10px/700, 0.12em) / time (16px bold) / date (10px muted)
- Middle: class name + inline meta (coach · room · duration · spots left) in 12px muted
- Right: radio circle — 22px, fills green on selection
- Selected row: green-tinted background + `--color-primary` border

#### Personal training mode
Expandable trainer cards. Each trainer has:
- Collapsed header: avatar circle (initials, gradient fill), name, focus area, star rating, "N open slots this week"
- Chevron + text "See availability" on the right (toggles "Hide calendar" when open)
- When expanded: bio paragraph + weekly calendar grid

**Calendar grid** (`TrainerCalendar` in the prototype):
- `grid-template-columns: repeat(N, minmax(112px, 1fr))` where N = number of distinct days with openings
- Each column: header (day + date) on `--color-bg-surface-2`, then a vertical list of time-slot buttons
- Slots: 60-minute sessions, shown as `10:00am`, `5:30pm`, etc.
- Selected slot: solid `--color-primary` fill, white text
- Selection stores `"<trainerId>:<slotIndex>"` in `data.bookingId`
- Only one slot total across all trainers — picking in trainer B clears a pick in trainer A
- Selected trainer's header pill shows "✓ Tue 10:00am" in primary-light

Footer for this step: skippable. Primary label stays **Continue**.

### Step 6 — Final check (REQUIRED — placeholder)

Four stacked toggle rows (checkbox + label + helper):

| Field | Required | Default |
|---|---|---|
| I agree to the GymFlow terms of use | ✓ | off |
| I acknowledge the health and liability waiver | ✓ | off |
| Booking reminders | — | **on** |
| Product updates and events | — | off |

Row style: 16px padding, 1px `--color-border-card`, `--radius-lg`, custom 22×22 square checkbox on the left, label + 12px `--color-fg-muted` helper on the right.

Terms & waiver rows show a small "Read" link on the right — opens a modal (placeholder copy).

Continue is disabled until both required checkboxes are on. Primary label: **Finish onboarding →**.

### Done screen

Full-width centered layout (no rail). Replaces the step content:

- Large green Check glyph in a 96px circle, subtle pulse animation
- Headline: `WELCOME TO THE FLOW, {firstName}`
- Summary cards in a 3-col grid:
  - **Profile** — name, phone, DOB (checkmark if complete)
  - **Plan** — plan name + price (or "No plan yet" with a "browse plans" link)
  - **First booking** — class or PT summary (or "No booking yet")
- Single primary CTA: **Enter GymFlow →** — routes to `/home`
- Below: small link "Review my info" which rewinds to step 2

Fire: `onboarding_completed` analytics event, backend mutation `POST /onboarding/complete`, redirect.

---

## State schema

The `data` object persisted to localStorage + backed by the server looks like:

```ts
type OnboardingData = {
  email: string;             // from account creation, read-only
  firstName: string;         // required
  lastName: string;          // required
  phone: string;             // required, E.164 on submit
  dob: string;               // required, ISO date
  goals: string[];           // optional — ids from GOAL_OPTIONS
  classTypes: string[];      // optional — ids from CLASS_OPTIONS
  frequency: string | "";    // optional — "1-2"|"3-4"|"5+"|"unsure"
  photoName: string | null;  // optional, the filename
  photoPreview: string | null; // dataURL — replace with uploaded photo URL in prod
  emergencyName: string;     // prototype holds these fields but the flow does not collect them
  emergencyPhone: string;    // (they exist for forward-compat with the full profile model)
  emergencyRelation: string;
  plan: "monthly" | "quarterly" | "annual" | null;
  bookingType: "class" | "trainer";
  bookingId: string | null;  // classId, or `${trainerId}:${slotIdx}`
  agreeTerms: boolean;       // required
  agreeWaiver: boolean;      // required
  notifBooking: boolean;
  notifNews: boolean;
};
```

Step visibility:
```ts
const visibleSteps = ALL_STEPS.filter(s => s.key !== "booking" || !!data.plan);
```

Completion check:
```ts
const requiredComplete =
  !!data.firstName && !!data.lastName && !!data.phone && !!data.dob
  && data.agreeTerms && data.agreeWaiver;
```

---

## Design tokens

Consume from the existing GymFlow `colors_and_type.css`. Key tokens this flow relies on:

| Purpose | Token |
|---|---|
| Page background | `--color-bg-page` |
| Raised surface (cards, footer) | `--color-bg-surface-1` |
| Deeper surface (date tiles, calendar headers) | `--color-bg-surface-2` |
| Card border | `--color-border-card` |
| Input border | `--color-border-input` |
| Primary CTA fill | `--color-primary` (on `#0F0F0F` text) |
| Primary-light (accent text, eyebrows) | `--color-primary-light` |
| Primary border (selected states) | `--color-primary-border` |
| Body text | `--color-fg-label` |
| Muted | `--color-fg-muted` |
| Eyebrow metadata | `--color-fg-metadata` |
| Danger (validation errors) | `--color-status-danger-text` |
| Display headlines | `--font-display` (Barlow Condensed) |
| Body | `--font-body` (Inter) |
| Radii | `--radius-md`, `--radius-lg`, `--radius-full` |

All colors, fonts, and radii used in the prototype are drawn from these tokens — no ad-hoc values.

---

## Interactions & motion

- **Step transitions**: content area fades in with a 12px upward slide (200ms ease-out). Old content fades out (150ms). Keep transitions tasteful — the form is the point.
- **Rail update**: when the current step changes, numeral fill animates in 200ms. Done→Check swap is instant, no animation.
- **Card hover**: plan cards and class cards lift 2px with 150ms transition on `transform` and `border-color`.
- **Trainer expand**: height auto-transition (180ms ease); chevron rotates 180° (200ms).
- **Focus rings**: inputs and buttons show `box-shadow: 0 0 0 3px rgba(34,197,94,.25)` on `:focus-visible`.
- **Reduced motion**: respect `prefers-reduced-motion` — disable transforms/slides, keep opacity only.

---

## Accessibility

- Every form field has an associated `<label for>` (the prototype uses `React.useId()`; keep that pattern)
- Required fields marked with `aria-required="true"` and a visible `*` in the label
- The step rail should be a `<nav aria-label="Onboarding progress">` with `<ol>` inside; each item is an `<a>` or `<button>` with `aria-current="step"` on the current row
- The sticky footer's primary action should have `aria-describedby` pointing to an error summary when the step has validation errors
- Chips/pills (goals, classes, frequency) should be `role="group"` with each chip as a toggle `<button aria-pressed>`; `<fieldset>+<legend>` works too
- `data-screen-label` attributes on the main container are used for comment anchoring in the prototype — the host app doesn't need them
- Full keyboard flow: Tab cycles form controls → skip → back → continue; Enter submits; Esc does **not** close onboarding (intentional — user must complete or explicitly leave)

---

## Responsive

The prototype is designed at 1280+ width. Narrower:

- **< 1024px**: drop the left rail entirely; keep only the top progress bar. Right column becomes full-width, padding 24px.
- **< 720px**: plan cards stack (1 col). Class/trainer rows collapse meta to two lines. Footer buttons stack to 2 rows: Back + Skip on top, Continue full-width below.
- **< 560px**: headlines drop from 48px → 36px. Reduce grid gaps 48 → 24.

---

## Files

All design references live under `design_reference/`:

- `index.html` — entry shell, loads React + Babel and the three scripts below
- `onboarding_app.jsx` — shell: `ALL_STEPS` table, localStorage state, `StepRail`, `ProgressBar`, sticky footer, mini nav, and the `OnboardingApp` orchestrator
- `onboarding_steps.jsx` — one component per step (`StepWelcome`, `StepProfile`, `StepPreferences`, `StepMembership`, `StepBooking`, `StepTerms`, `StepDone`) plus the `TrainerCalendar` slot picker
- `components.jsx` — small shared primitives (`Icon` set used across the flow)
- `tokens.css` — mirror of the relevant design tokens from `colors_and_type.css`
- `brief.md` — the original product brief that scopes this feature

## Open questions / flags for product & backend

1. **Who provides the trainer availability?** The prototype hard-codes 3 trainers × ~5 slots each. Back this with a real endpoint (`GET /trainers?onboarding=true&limit=3` ordered by earliest availability) so the list is always fresh.
2. **Plan selection without payment** — the brief says payment is out of scope. Decide whether finishing onboarding *with a plan but no payment* creates a `plan_pending` record (the assumption here), or whether the UI should route to a payment page after the Done screen.
3. **Waiver versioning** — the Final check is a placeholder. When the real waiver ships, ensure each acceptance stores `{user_id, waiver_version, accepted_at, ip}`.
4. **Photo storage** — confirm bucket + max size (prototype suggests 5 MB). Add EXIF strip + server-side resize.
5. **Returning mid-flow** — is the in-progress state stored server-side? The prototype localStorages it. Recommend PATCHing a `/onboarding_progress` record on each step so it survives device changes.
6. **Skipping booking when a plan was picked** — the prototype still shows the Booking step when a plan exists (user can skip it explicitly). Confirm this matches intent vs. "only show booking if user says yes they want to book".
