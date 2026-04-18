# SDD: Member Home — "Pulse" Redesign

## Reference
- PRD: docs/prd/home-page-redesign.md
- Design handoff: docs/design-system/handoffs/home-page-redesign/
- Design system: docs/design-system/README.md
- Date: 2026-04-18

## Architecture Overview

This is a **visual-only redesign** of the member home page. No new DB tables, no new
backend API endpoints, and no new real-time transport mechanism are introduced. All data
required by the redesigned page is already available from existing endpoints.

Layers affected:
- **Frontend only**: full replacement of `MemberHomePage.tsx` and all
  `src/components/home/` components. Four existing `src/components/landing/` components
  are reused directly (no duplication). Two new hooks are added. One new home-specific
  component is added for the no-booked hero variant.

The existing `src/components/landing/` directory already contains the shared Pulse
primitives (`ActivityFeed`, `AmbientWaveform`, `BigCountdown`, `HeroNoBooked`,
`PulseFooter`, `PulseNav`, `StatsStrip`) produced by the landing-page redesign. These
are imported, not copied.

---

## 1. Database Changes

None. No new tables, no new columns, no Flyway migration.

---

## 2. API Contract

No new endpoints. The home page redesign reuses six existing endpoints:

| Endpoint | Used for |
|---|---|
| `GET /api/v1/landing/viewer-state` | `nextBookedClass` for the hero countdown and `onTheFloor` count for the eyebrow |
| `GET /api/v1/bookings/me?status=CONFIRMED&page=0&size=3` | Next three upcoming bookings for `UpcomingSection` |
| `DELETE /api/v1/bookings/{id}` | Cancel booking from the hero ghost button |
| `GET /api/v1/memberships/me` | Membership data for `MembershipSection` and stat cells |
| `GET /api/v1/trainers/favorites?page=0&size=1` | Count of favorited trainers (`totalElements`) for the "Favorite coaches" stat cell |
| `GET /api/v1/landing/activity` + `GET /api/v1/landing/activity/stream` | Club activity feed (SSE stream, authenticated) |

### Data derivation notes

**nextBookedClass** — The `booked` variant of `GET /api/v1/landing/viewer-state` returns
`upcomingClass` with the shape the hero needs (`id`, `name`, `startsAt`, `trainer.name`,
`studio`, `durationMin`). When the response is `nobooked`, the hero renders `HeroNoBooked`
(reused from `src/components/landing/`). When the response is `loggedOut`, the auth guard
redirects before the page mounts.

**onTheFloor** — `viewer-state` returns `onTheFloor: number` in the `booked` and
`nobooked` variants. Poll every 60 s by re-fetching viewer-state; do not open a separate
connection.

**upcomingBookings** — `GET /api/v1/bookings/me` with `status=CONFIRMED&page=0&size=3`.
Sort is server-default (`bookedAt,desc`); the endpoint already returns future-first ordering
when filtered by status. The client must sort the returned array by `scheduledAt ASC` before
display and filter to `scheduledAt > now`.

**membership stats** — `UserMembership` from `GET /api/v1/memberships/me`:
- "Bookings left" = `maxBookingsPerMonth - bookingsUsedThisMonth` / `maxBookingsPerMonth`
- "Plan renews" days = `Math.ceil((new Date(endDate) - Date.now()) / 86_400_000)`; renewal
  date sub-line = `endDate` formatted as "MMM D, YYYY"
- "Bookings this cycle" progress bar uses the same `bookingsUsedThisMonth` /
  `maxBookingsPerMonth` values

**savedCoaches count** — `GET /api/v1/trainers/favorites?page=0&size=1` returns
`{ totalElements, content: [...] }`. Use `totalElements` as the count. Content is not
used (size=1 minimizes payload). Sub-line shows up to two trainer first names from a
separate call to `GET /api/v1/trainers/favorites?page=0&size=2` — only names, not photos.
If `totalElements === 0`, the cell shows `0` with sub-line "No coaches saved yet".

**Activity feed (club mode)** — The home page uses `GET /api/v1/landing/activity`
(authenticated variant) for the initial list, then subscribes to
`GET /api/v1/landing/activity/stream` via the existing `useLandingActivityFeed` hook.
The home page applies a client-side filter: render only events where `kind` is `"booking"`
or `"class"`. Events of `kind = "checkin"` or `"pr"` are skipped silently. The eyebrow
label is changed to "AT THE CLUB" (passed as a prop or via a `mode="club"` prop on the
existing `ActivityFeed` component).

### Cancel booking interaction

1. User clicks "Cancel booking" in `HomeHero`.
2. A confirmation dialog renders: "Cancel {class name}? This cannot be undone."
3. On confirm: `DELETE /api/v1/bookings/{bookingId}` is called.
4. Optimistic update: remove the first booking from the `upcomingBookings` list. The next
   booking becomes the new "first". Re-derive the hero countdown target from the new first
   booking.
5. Decrement the "Bookings left" stat by 1 locally (do not re-fetch).
6. Show a toast: "Cancelled {class name}".
7. On API error: restore the cancelled booking to position 0 in the list and show an error
   toast: "Could not cancel booking. Try again."

### Add to calendar interaction

1. User clicks "Add to calendar" in `HomeHero`.
2. A `.ics` blob is constructed client-side from the `nextBookedClass` data:
   - `DTSTART` = `startsAt` (UTC)
   - `DTEND` = `startsAt + durationMin * 60_000` (UTC)
   - `SUMMARY` = class name
   - `DESCRIPTION` = "with {trainer.name} · {studio}"
3. The blob is downloaded via a temporary `<a href="blob:...">` click.
4. No Google Calendar OAuth integration in this version.

---

## 3. Kotlin Files

None. No backend changes.

---

## 4. Frontend Components

### Route

The existing `/home` route (already behind `UserRoute` in `App.tsx`) is kept unchanged.
The route component is replaced from the old `MemberHomePage` to the new Pulse home page.
No routing changes are required.

### Deleted components (replaced by Pulse redesign)

The following existing `src/components/home/` files are deleted as part of this redesign.
They served the old flat-grid layout that this redesign replaces entirely.

| File | Reason |
|---|---|
| `MemberHomeHero.tsx` | Replaced by `HomeHero` (Pulse style) |
| `MemberHomeSectionEmptyCard.tsx` | No longer used |
| `MemberHomeSectionErrorCard.tsx` | No longer used |
| `MembershipAccessBanner.tsx` | Banner pattern removed from redesigned home |
| `MembershipPrimaryCard.tsx` | Replaced by `MembershipSection` |
| `QuickActionsPanel.tsx` | Removed from redesign; navigation links are inline |
| `TrainerPreviewCarousel.tsx` | Not in the redesigned layout |
| `ClassPreviewCarousel.tsx` | Not in the redesigned layout |

### Reused components (imported from `src/components/landing/`)

These components are shared between the landing page and the home page. Do not copy or
re-implement them.

| Component | Import path | Usage on home |
|---|---|---|
| `PulseNav` | `../../components/landing/PulseNav` | Top navigation, `mode="booked"` with user name and avatar |
| `PulseFooter` | `../../components/landing/PulseFooter` | Page footer |
| `AmbientWaveform` | `../../components/landing/AmbientWaveform` | SVG waveform behind hero |
| `BigCountdown` | `../../components/landing/BigCountdown` | Countdown digits in `HomeHero` |
| `ActivityFeed` | `../../components/landing/ActivityFeed` | Club activity feed in hero right column |
| `HeroNoBooked` | `../../components/landing/HeroNoBooked` | Shown when `viewer-state` is `nobooked` |

### New components (home-specific, in `src/components/home/`)

#### `HomeHero`

Location: `frontend/src/components/home/HomeHero.tsx`

Props:
```ts
interface HomeHeroProps {
  firstName: string;
  nextBookedClass: {
    id: string;
    name: string;
    startsAt: string; // ISO
    trainer: { id: string | null; name: string; avatarUrl: string | null };
    studio: string;
    durationMin: number;
  };
  onTheFloor: number;
  onCancelBooking: () => void;     // triggers confirmation dialog in parent
  onAddToCalendar: () => void;     // triggers .ics download in parent
}
```

Renders:
1. Pulsing green dot eyebrow: `"Live at the club · {onTheFloor} members in"` — 11px/600,
   tracking 0.24em, uppercase, `--color-primary-light`, `white-space: nowrap`.
2. `<h1>` in Barlow Condensed 64px/700/uppercase/lh 1.0/tracking -0.01em:
   `"Welcome back,\n{firstName}."` — first name in `--color-primary`.
3. Countdown row (margin-top 32px): `<BigCountdown h m s label="...starts in">` on the
   left; right side (`paddingLeft: 22px`, `borderLeft: 1px solid --color-border-card`):
   "with" (13px muted), trainer name (17px/600 white), "Studio · N min" (12px metadata).
4. Countdown target = `new Date(nextBookedClass.startsAt).getTime()`. At T-0 replace the
   `BigCountdown` with a `ClassStartedBanner` (see below).
5. Button row (margin-top 28px): "Add to calendar" (primary green, `homeBtn.primary` style)
   and "Cancel booking" (ghost, `homeBtn.secondary` style).
6. `aria-label` on the countdown region: `"{name} starts in {H} hours {M} minutes"`.
   Update via `aria-live="polite"` on a visually hidden `<span>`.

#### `ClassStartedBanner`

Location: `frontend/src/components/home/ClassStartedBanner.tsx`

Props:
```ts
interface ClassStartedBannerProps {
  className: string;
}
```

Renders a green-tinted banner: solid green dot + "Class started · Check in now" in
Barlow Condensed 26px/700. Shown in place of `BigCountdown` when `h === 0 && m === 0 && s === 0`.

#### `MemberStats`

Location: `frontend/src/components/home/MemberStats.tsx`

Props:
```ts
interface MemberStatsProps {
  bookingsLeft: number;
  bookingsMax: number | null;    // null = unlimited
  renewsInDays: number;
  renewsAt: string;              // ISO date, formatted "MMM D, YYYY" by component
  savedCoachesCount: number;
  savedCoachesNames: string[];   // up to 2 first names; component computes sub-line
}
```

Renders a 3-column grid, gap 14px. Each cell: padding 18/20, `rgba(255,255,255,0.02)` bg,
`--color-border-card` border, `border-radius: 14px`.

Cell structure:
- Eyebrow: 10px/600 uppercase, tracking 0.24em, `--color-fg-metadata`.
- Big number: Barlow Condensed 44px/700, tracking -0.02em, tabular-nums, white.
- Denominator (optional): 13px muted — `/ 12` or `days`.
- Sub-line: 12px muted.

Cell 1 — "BOOKINGS LEFT": number = `bookingsLeft`, denominator = `/ {bookingsMax}` (or
"Unlimited" label replacing the number + denominator when `bookingsMax === null`),
sub-line = "this month".

Cell 2 — "PLAN RENEWS": number = `renewsInDays`, denominator = "days",
sub-line = `renewsAt` formatted as "May 2, 2026".

Cell 3 — "FAVORITE COACHES": number = `savedCoachesCount`, denominator = none,
sub-line = first two names joined ", " + "+N" suffix when count > 2; or "No coaches
saved yet" when count === 0.

#### `UpcomingSection`

Location: `frontend/src/components/home/UpcomingSection.tsx`

Props:
```ts
interface UpcomingBooking {
  id: string;
  name: string;
  startsAt: string; // ISO
  trainer: { name: string };
  studio: string;
  durationMin: number;
}

interface UpcomingSectionProps {
  bookings: UpcomingBooking[];   // max 3, sorted startsAt ASC by caller
  onRowClick: (bookingId: string) => void;
  onOpenSchedule: () => void;
}
```

Renders: container padding 28px, `rgba(255,255,255,0.02)` bg, `--color-border-card`
border, `border-radius: 16px`.

Header: "UPCOMING" eyebrow (11px/600, tracking 0.22em) + "NEXT THREE SESSIONS" title
(Barlow 26px/700 uppercase). Right: "Open schedule →" link in `--color-primary-light`.

Row grid: `auto 1fr auto`, gap 20px, padding-y 18px, 1px hairline separator between rows
(`rgba(255,255,255,0.05)` — not before the first row).

Time column (min-width 120px): Barlow 22px/700. First row: `--color-primary-light`. Other
rows: white. Sub-line: 12px `--color-fg-metadata` tabular-nums. Client formats `startsAt`
into relative-day labels: today = "Today", tomorrow = "Tomorrow", otherwise abbreviated
weekday ("Thu", "Sat"). Time as "7:00am" (12-hour, lowercase suffix, no leading zero).

Class column: 15px/600 white class name; 12px muted "{trainer.name} · {studio} ·
{durationMin} min".

Status pill: inline-flex, `border-radius: 999px`, padding 5/10, `white-space: nowrap`.
First row: green-tinted bg `rgba(34,197,94,0.1)`, `--color-primary-border` border,
`--color-primary-light` text, solid green dot 6×6px, label "Next up".
Other rows: `rgba(255,255,255,0.04)` bg, `rgba(255,255,255,0.08)` border,
`--color-fg-label` text, label "Booked".

Entire row is clickable: `cursor: pointer`, calls `onRowClick(booking.id)`.

Empty state: when `bookings.length === 0`, renders a centered message:
"No sessions booked · Open schedule to book your week" with an "Open schedule" link.

#### `MembershipSection`

Location: `frontend/src/components/home/MembershipSection.tsx`

Props:
```ts
interface MembershipSectionProps {
  planName: string;             // e.g. "Quarterly"
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  renewsAt: string;             // ISO date
  renewsInDays: number;
  bookingsUsed: number;
  bookingsMax: number | null;   // null = unlimited
  onManage: () => void;
}
```

Container: padding 28px, `border-radius: 16px`, `--color-border-card` border. Background:
`linear-gradient(180deg, rgba(34,197,94,0.06), rgba(255,255,255,0.02) 70%)`.
Corner glow: absolutely positioned top-right, 200×200px radial, `blur(20px)`,
`rgba(34,197,94,0.2)`.

Content stack (all `position: relative; z-index: 1`):
1. Row: "YOUR ACCESS" eyebrow (11px/600 muted, tracking 0.22em) + status pill.
   Pill variants:
   - `ACTIVE`: `rgba(34,197,94,0.1)` bg, `--color-primary-border` border,
     `--color-primary-light` text, solid green dot 5×5px, text "ACTIVE".
   - `CANCELLED`/`EXPIRED`: `rgba(239,68,68,0.1)` bg, `rgba(239,68,68,0.3)` border,
     `#F87171` text, red dot, text "CANCELLED" or "EXPIRED".
2. Plan title: Barlow Condensed 34px/700 uppercase, lh 1.05, tracking -0.01em —
   `"{planName}\nMembership"` on two lines.
3. Bookings progress (hidden when `bookingsMax === null`):
   - Row: "Bookings this cycle" (12px muted) left / `"{used} / {max}"` (12px/600 white
     tabular-nums) right.
   - Bar: 6px tall, `border-radius: 999px`, `rgba(255,255,255,0.06)` track, fill width
     = `(bookingsUsed / bookingsMax) * 100%` capped at 100%, fill gradient
     `linear-gradient(90deg, --color-primary, --color-primary-light)`, glow
     `0 0 12px rgba(34,197,94,0.5)`.
   - When `bookingsMax === null`: show "Unlimited" (14px/600 white) in place of the bar.
4. Renewal mini-card: padding 14/16, `rgba(0,0,0,0.3)` bg, `rgba(255,255,255,0.06)`
   border, `border-radius: 12px`, flex row space-between.
   Left: "RENEWS" eyebrow (10px/600 muted) + date (14px/600 white).
   Right: Barlow 28px/700 `--color-primary-light` — `renewsInDays` — + "days" (12px muted).
5. "Manage membership" button: full-width, transparent, `rgba(255,255,255,0.15)` border,
   white text, `border-radius: 8px`, 13px/600. Calls `onManage`.

#### `CancelBookingDialog`

Location: `frontend/src/components/home/CancelBookingDialog.tsx`

Props:
```ts
interface CancelBookingDialogProps {
  className: string;
  onConfirm: () => void;
  onDismiss: () => void;
  loading: boolean;
}
```

A modal dialog. Renders: "Cancel {className}? This cannot be undone." with "Confirm
cancel" (red-tinted primary button) and "Keep booking" (ghost button). Uses the existing
modal overlay pattern from the design system.

### Modified components

#### `MemberHomePage.tsx` (full rewrite)

Location: `frontend/src/pages/home/MemberHomePage.tsx`

The page is a full replacement. The new structure:

```tsx
<div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh',
              background: '#0F0F0F', color: '#fff' }}>
  <PulseNav mode={viewerState === 'booked' ? 'booked' : 'authed'} userName={firstName} />

  <main style={{ flex: 1, padding: '40px 40px 48px', position: 'relative', overflow: 'hidden' }}>
    {/* Ambient layers */}
    {/* RadialGlow + AmbientWaveform */}

    <div style={{ position: 'relative', zIndex: 2, maxWidth: 1440, margin: '0 auto' }}>
      {/* Hero row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 40,
                    alignItems: 'stretch', minHeight: 440 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {viewerState.state === 'booked'
            ? <HomeHero ... />
            : <HeroNoBooked ... />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <ActivityFeed events={clubEvents} activeIndex={activeIndex} isLoggedOut={false} />
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ marginTop: 36 }}>
        <MemberStats ... />
      </div>

      {/* Bottom row */}
      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <UpcomingSection ... />
        <MembershipSection ... />
      </div>
    </div>
  </main>

  <PulseFooter />
</div>
```

The Tailwind `Navbar` is replaced by `PulseNav`. The old section-by-section hook
orchestration (`useMemberHomeMembershipSection`, `useMemberHomeClassesPreview`,
`useMemberHomeTrainerPreview`) is replaced by the new hooks below.

The page retains `data-testid="member-home-root"` for test compatibility.

#### `ActivityFeed.tsx` (minor prop addition)

Location: `frontend/src/components/landing/ActivityFeed.tsx`

Add an optional `eyebrowLabel?: string` prop (default `"Activity"`). The home page passes
`eyebrowLabel="AT THE CLUB"`. No other changes to this component.

### New hooks

#### `useHomePage`

Location: `frontend/src/hooks/useHomePage.ts`

Single hook that orchestrates all data for `MemberHomePage`. Returns:

```ts
interface UseHomePageResult {
  // Viewer state (drives hero)
  viewerState: ViewerStateResponse | null;
  viewerStateLoading: boolean;
  viewerStateError: string | null;

  // Upcoming bookings (drives UpcomingSection)
  upcomingBookings: UpcomingBooking[];
  upcomingLoading: boolean;
  upcomingError: string | null;

  // Membership (drives MembershipSection + MemberStats)
  membership: UserMembership | null;
  membershipLoading: boolean;
  membershipError: string | null;

  // Saved coaches count (drives MemberStats cell 3)
  savedCoachesCount: number;
  savedCoachesNames: string[];   // up to 2
  savedCoachesLoading: boolean;

  // Activity feed
  clubEvents: ActivityEvent[];   // filtered: kind === 'booking' | 'class'
  feedActiveIndex: number;

  // Actions
  cancelBooking: (bookingId: string, className: string) => Promise<void>;
  downloadIcs: (booking: NextBookedClassShape) => void;
  navigateToSchedule: (classId?: string) => void;
  navigateToMembership: () => void;
  retryViewerState: () => void;
}
```

Implementation notes:
- Fetch viewer-state, upcoming bookings, membership, and favorites count in parallel on
  mount.
- Poll viewer-state every 60 s for `onTheFloor` updates. Do not poll the other sources;
  they are re-fetched on user action only.
- Use the existing `useLandingActivityFeed` hook (or its equivalent from the landing-page
  implementation) for the SSE feed subscription. Apply the `booking | class` filter on the
  returned events array.
- `feedActiveIndex` cycles every 2800ms via `setInterval`. Clear the interval in the
  cleanup function.
- `cancelBooking`: calls `DELETE /api/v1/bookings/{id}`, applies optimistic update,
  shows toast. On error restores state and shows error toast.
- `downloadIcs`: generates a `.ics` blob and triggers download; no server call.

#### `useCountdown`

Location: `frontend/src/hooks/useCountdown.ts`

If this hook does not yet exist (the landing page may already have added it), add it here.

```ts
function useCountdown(targetMs: number): { h: number; m: number; s: number; done: boolean }
```

Ticks every 1000ms via `setInterval`. Returns `{ h, m, s, done: true }` when
`targetMs <= Date.now()`. Clears interval when `done`.

### TypeScript types

#### New types in `frontend/src/types/home.ts`

```ts
import type { ActivityEvent } from './landing'

export interface UpcomingBooking {
  id: string;
  name: string;
  startsAt: string;          // ISO
  trainer: { name: string };
  studio: string;
  durationMin: number;
}

export interface NextBookedClassShape {
  id: string;
  name: string;
  startsAt: string;          // ISO
  trainer: { id: string | null; name: string; avatarUrl: string | null };
  studio: string;
  durationMin: number;
}

export interface MemberStatsData {
  bookingsLeft: number;
  bookingsMax: number | null;
  renewsInDays: number;
  renewsAt: string;
  savedCoachesCount: number;
  savedCoachesNames: string[];
}

export type ClubActivityEvent = ActivityEvent & { kind: 'booking' | 'class' };
```

### Zustand changes

None. The page does not add or modify any global Zustand store.

---

## 5. Task List

### → developer (frontend phase)

- [ ] Create worktree `chore/home-page-redesign` (already done by SA).
- [ ] Add `useCountdown` hook at `frontend/src/hooks/useCountdown.ts` if it does not yet
  exist from the landing redesign.
- [ ] Add `eyebrowLabel?: string` prop to `ActivityFeed` in
  `frontend/src/components/landing/ActivityFeed.tsx`.
- [ ] Add `frontend/src/types/home.ts` with the types defined in Section 4.
- [ ] Create `frontend/src/components/home/HomeHero.tsx` per Section 4 spec.
- [ ] Create `frontend/src/components/home/ClassStartedBanner.tsx` per Section 4 spec.
- [ ] Create `frontend/src/components/home/MemberStats.tsx` per Section 4 spec.
- [ ] Create `frontend/src/components/home/UpcomingSection.tsx` per Section 4 spec.
- [ ] Create `frontend/src/components/home/MembershipSection.tsx` per Section 4 spec.
- [ ] Create `frontend/src/components/home/CancelBookingDialog.tsx` per Section 4 spec.
- [ ] Create `frontend/src/hooks/useHomePage.ts` per Section 4 spec. Wire:
  - parallel fetch of viewer-state, bookings, membership, favorites.
  - 60s viewer-state poll for `onTheFloor`.
  - SSE feed subscription (reuse the landing hook); filter events by `kind`.
  - 2800ms `feedActiveIndex` rotation.
  - `cancelBooking` optimistic action.
  - `downloadIcs` with `.ics` blob construction.
- [ ] Fully rewrite `frontend/src/pages/home/MemberHomePage.tsx` using the layout
  structure in Section 4. Import `PulseNav`, `PulseFooter`, `AmbientWaveform`,
  `BigCountdown`, `ActivityFeed`, `HeroNoBooked` from `../../components/landing/`.
- [ ] Delete the following files (replaced by the redesign):
  - `frontend/src/components/home/MemberHomeHero.tsx`
  - `frontend/src/components/home/MemberHomeSectionEmptyCard.tsx`
  - `frontend/src/components/home/MemberHomeSectionErrorCard.tsx`
  - `frontend/src/components/home/MembershipAccessBanner.tsx`
  - `frontend/src/components/home/MembershipPrimaryCard.tsx`
  - `frontend/src/components/home/QuickActionsPanel.tsx`
  - `frontend/src/components/home/TrainerPreviewCarousel.tsx`
  - `frontend/src/components/home/ClassPreviewCarousel.tsx`
- [ ] Delete or archive old hooks that are no longer called:
  - `frontend/src/hooks/useMemberHomeMembershipSection.ts`
  - `frontend/src/hooks/useMemberHomeClassesPreview.ts`
  - `frontend/src/hooks/useMemberHomeTrainerPreview.ts`
- [ ] Verify `App.tsx` router: the `/home` route still uses `UserRoute`. No routing
  change is needed but confirm the import now points to the rewritten `MemberHomePage`.
- [ ] Port design tokens verbatim from
  `docs/design-system/handoffs/home-page-redesign/colors_and_type.css` into the project's
  `colors_and_type.css` if any token differs from the current
  `docs/design-system/colors_and_type.css`. At time of writing the tokens are identical;
  confirm before porting.
- [ ] Implement `prefers-reduced-motion` guards:
  - `AmbientWaveform` scroll: already guarded in the landing component — verify.
  - `dot-pulse` animation: disable `animation` class when reduced.
  - `ActivityFeed` crossfade: pass `reduced` flag; already implemented in the landing
    component — verify.
  - `BigCountdown` continues ticking regardless of reduced-motion.
- [ ] Implement `aria-label` update on countdown region (visually hidden `<span>`
  with `aria-live="polite"` that mirrors `"{name} starts in {H} hours {M} minutes"`).
- [ ] Add `role="log"` and `aria-live="polite"` to `ActivityFeed` if not already present
  (check the existing landing component — it is already there, so only verify).
- [ ] Verify no horizontal overflow at 360 px width. The main padding `40px` collapses
  to `16px` on narrow viewports — add a responsive padding rule on `<main>` using a
  CSS media query or Tailwind responsive prefix.
- [ ] Update page tests:
  - Booked hero renders countdown and trainer details.
  - No-booked hero renders `HeroNoBooked`.
  - `UpcomingSection` renders three rows with correct status pills.
  - `UpcomingSection` empty state renders when `bookings = []`.
  - `MembershipSection` renders ACTIVE pill and progress bar.
  - `MembershipSection` hides progress bar and shows "Unlimited" when `bookingsMax = null`.
  - "Cancel booking" shows dialog, calls DELETE, applies optimistic update on confirm.
  - "Add to calendar" triggers `.ics` download without a network call.
  - Feed renders only `booking` and `class` kind events; `checkin` and `pr` events are
    filtered out.
  - `prefers-reduced-motion` stops waveform scroll, dot pulse, and feed crossfade; counter
    still ticks.

---

## 6. Risks & Notes

### Assumptions

**A1 — No new backend endpoints.** The handoff states "no new features were added" and
"every piece of data already existed." Audit of all six data sources confirms this. The
one potential gap — favorited coaches count — is resolved by `totalElements` from the
existing `GET /api/v1/trainers/favorites` endpoint.

**A2 — `viewer-state` is the source of truth for `nextBookedClass`.** The `booked`
variant already returns the shape the hero needs. The home page does not call
`GET /api/v1/bookings/me` for the hero countdown; it reads `viewer-state.upcomingClass`.
`bookings/me` is called only to populate the upcoming-sessions list.

**A3 — Upcoming bookings sort.** `GET /api/v1/bookings/me` returns bookings in `bookedAt,desc`
order. The home page sorts the returned items by `scheduledAt ASC` client-side after
filtering to `status = CONFIRMED AND scheduledAt > now`. This is safe for 3 items.

**A4 — `PulseNav` in authed mode.** The `PulseNav` component was built for the landing
page. On the home page it receives `mode="booked"` (or `mode="authed"`) and the member's
`firstName`. Confirm that `PulseNav` accepts both a `mode` and a `userName` prop; add if
missing (minor prop addition to the landing component, counted within the landing PR's
scope or added in this PR with a note in the landing SDD's Section 6).

**A5 — SSE hook reuse.** The landing page implemented a `useLandingActivityFeed` hook
(or equivalent). If that hook is named differently or lives in a different path, import it
by its actual name. Do not re-implement the SSE subscription.

**A6 — Mobile layout.** The handoff defers mobile design ("not yet designed"). The
desktop-first layout uses CSS Grid with fixed column ratios. On narrow viewports the two-
column grids collapse to single-column via `@media (max-width: 768px)` — this is standard
and consistent with the landing page. Countdown digit size drops from 88px to 56px on
narrow viewports. No separate mobile handoff is needed for this.

**A7 — No `savedCoaches` name sub-line on zero count.** When `savedCoachesCount === 0`,
show `0` with sub-line "No coaches saved yet" — do not call `GET /api/v1/trainers/favorites`
with `size=2` since the count is already 0.

### Design decisions

- `components/landing/` is the shared-component module (not `components/pulse/` as the
  handoff suggests). The landing redesign already placed shared components there. Using a
  different directory name would require moving files that other routes depend on. Stay
  with `components/landing/`.
- Old `useMemberHomeMembershipSection`, `useMemberHomeClassesPreview`, and
  `useMemberHomeTrainerPreview` hooks are deleted rather than kept dead. They pull in API
  dependencies that are no longer used and will cause confusion for future developers.
- The `MembershipAccessBanner` (post-purchase banner) is removed. The Pulse home no
  longer uses the `membershipBanner` query param round-trip because the home does not
  embed a plan-activation flow. If a member purchases a plan from `/plans`, the redirect
  back to `/home` simply re-fetches `memberships/me` on mount and shows the ACTIVE state
  naturally. The banner param in the URL is silently ignored (no regression — the old
  code only read it in `MemberHomePage`, which is being replaced).

### Open questions (non-blocking)

- **T-0 grace period**: the handoff mentions swapping at T-0 to "Class started · Check in
  now" but does not specify a grace period after which the countdown moves to the next
  booking. Assumed: after T+5 minutes, transition to the next item in `upcomingBookings`.
  Implement as: if `h === 0 && m === 0 && s === 0 && secondsElapsed > 300`, move to next.
- **Real trainer check-in count**: `onTheFloor` is a proxy (confirmed bookings today
  after 05:00 UTC), not a real check-in gate. The handoff accepts this — stated as an
  open question there. No change in this SDD.
