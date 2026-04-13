# Design: Class Schedule Page — Redesign Delta Spec

Benchmark: Peloton class schedule — sticky control bar, compact day-column headers with
a date-number callout, class cards using a left-accent stripe to signal status at a glance,
and a persistent booking summary inline at the top of the content area rather than buried
behind a separate CTA. Chosen because Peloton handles high information density (many classes,
statuses, counts) without resorting to hero-banner real estate.

---

## What Stays Unchanged

The following are correct and must not be altered:

- Page route `/schedule`
- URL param schema (`?view=week&date=YYYY-MM-DD`)
- `GroupScheduleViewTabs` toggle — layout, active/inactive contrast, and green-filled
  active state are already correct.
- `GroupSchedulePeriodNavigator` — Previous/Today/Next button group and the range label
  box are functional and well-styled.
- `GroupScheduleEntryCard` — the booking-state badge system (Booked/Open/Full/Locked/
  Membership), the `getWrapperClass` border tints, and the action button row are correct.
- Sticky toolbar (`top-16`, `z-30`, `backdrop-blur`, `bg-gray-900/95`) — this pattern
  stays. Only padding refinements noted below.
- `BookingSummaryBar` — the summary section design is correct; only its placement changes.
- `MyBookingsDrawer`, `BookingConfirmModal`, `CancelBookingModal`, `BookingToast` —
  these are modals/overlays and are out of scope for this delta.
- `GroupScheduleWeekGrid` mobile stacked layout (below `lg:` breakpoint) — correct.
- All functionality — state management, hooks, API calls, booking/cancel flows are
  unchanged.

---

## What Changes

### Change 1 — Collapse the page header

**Pattern replaced:** Full hero banner (`SchedulePageHeader`) with 56px headline, two stat
boxes, and a CTA stacked in a `lg:grid-cols-[1fr_320px]` layout. The hero consumes ~340px
of vertical space before the user sees a single class.

**New pattern:** A compact page header strip — one row containing the page title at
`text-2xl font-bold`, the three status chips (schedule label, membership status, timezone),
and the "Open booking hub" button aligned right. Total height: ~72px. Stat counters
(booked count and available count) move to inline text within the `BookingSummaryBar`.

**Why it is better:** The hero communicates three pieces of information (page name,
membership status, view range) that do not require premium visual real estate. Peloton's
class list page uses a single header row — the content grid starts immediately below.
Removing the hero recovers roughly 260px of viewport height on a 1080p screen, meaning
users see the full first day-column without scrolling.

**Benchmark:** Peloton — compact sticky page title + controls row, no hero image for
schedule pages.

---

### Change 2 — Elevate BookingSummaryBar above the toolbar

**Pattern replaced:** `BookingSummaryBar` renders below the sticky toolbar, below all
view content. It is hidden when `entries.length === 0` so users with no bookings never see
it, and users with bookings find it only after scrolling past the grid.

**New pattern:** Move `BookingSummaryBar` to sit immediately below the compact header and
above the sticky toolbar. When `entries.length === 0`, render a single-line "No classes
booked yet in this view" placeholder at `text-sm text-gray-500` — same height, no layout
shift. When entries exist, render the existing card grid inline.

**Why it is better:** A user returning to check their upcoming bookings should not have to
scroll past the week grid to find the confirmation. Placing the summary above the schedule
aligns with how Whoop surfaces current-day stats before showing the detail graph — the
summary always occupies the same slot, reducing hunt time.

**Benchmark:** Whoop — persistent summary strip above the detail view; always rendered,
not conditionally hidden.

---

### Change 3 — Day column header: date number callout + class-count dot

**Pattern replaced:** Desktop week grid column headers use `text-sm font-semibold
text-gray-300` for weekday name and `text-3xl font-bold` (Barlow Condensed) for the
month-day label. Class count is a `rounded-full border border-gray-700` pill with text
"N classes". The TODAY label is a separate `text-xs uppercase tracking-[0.16em]` row below
the date number.

**New pattern:**
- Keep weekday name at `text-xs font-semibold uppercase tracking-[0.14em] text-gray-500`.
- Date number: `text-4xl font-bold` in a `w-12 h-12` circle — `bg-green-500 text-white`
  for today, `bg-transparent text-white` for other days. This is the established iOS
  Calendar / Peloton day-picker pattern for today callout.
- Remove the separate "Today" text row — the filled circle communicates today unambiguously.
- Replace the pill class-count badge with a row of up to 7 small `w-1.5 h-1.5 rounded-full`
  dot indicators below the date number: `bg-green-500` for booked classes, `bg-gray-600`
  for available, no dot for empty days. This communicates booking density at a glance
  without text.

**Why it is better:** The current pill badge adds a fourth typographic element to an
already-dense column header. The dot-indicator pattern (used by iOS Calendar and Google
Calendar for event density) conveys the same information in two pixels per class instead
of a full badge. The filled-circle today callout replaces two elements (number + "Today"
text row) with one, reducing column header height by ~8px per column.

**Benchmark:** Peloton day-picker / iOS Calendar — filled circle for current day, dot
indicators for event density.

---

### Change 4 — Class card: left-accent status stripe

**Pattern replaced:** `GroupScheduleEntryCard` uses `getWrapperClass` to apply a border
tint (`border-green-500/40`, `border-orange-500/30`, `border-gray-800`) as the only
status indicator at the card level. In compact (week grid) density, the border tint is
visible but subtle and the status badge (top-right) is the primary indicator.

**New pattern:** Add a `w-1 rounded-l-2xl` left-edge stripe inside the card:
- `bg-green-500` for booked state
- `bg-orange-400` for cancellation-locked or full
- `bg-gray-700` for available/default
- `bg-red-500` for membership-required

Keep the existing border tint as a secondary layer. The stripe provides a scannable,
colour-coded left edge that works even when the badge is truncated in narrow columns.

**Why it is better:** In the 7-column week grid at 1440px, each column is ~170px wide.
Cards at compact density truncate the right side. The left-accent stripe gives booking
status without requiring the right-side badge to be visible. This is the Linear
issue-priority sidebar dot pattern applied vertically.

**Benchmark:** Linear — left-edge coloured stripe on issue rows for priority/status
signal; readable at any row width.

---

### Change 5 — Week navigation: icon-only Previous/Next with keyboard hint

**Pattern replaced:** `GroupSchedulePeriodNavigator` Previous and Next buttons are
text-only (`px-3 py-2 text-sm`). At `lg:` layout they sit to the right of the range label
box, taking ~140px combined. No keyboard shortcut hint is shown.

**New pattern:**
- Previous and Next become icon buttons: `ChevronLeftIcon` and `ChevronRightIcon` from
  `@heroicons/react/24/outline`, `w-9 h-9`, `rounded-md border border-gray-700`.
- Tooltip on hover: "Previous week (← key)" / "Next week (→ key)".
- Add `←` / `→` keyboard handlers at the page level (already safe since no input is
  focused during browsing).
- Today button keeps full text — it is the primary anchor action.

**Why it is better:** Icon buttons recover ~80px of toolbar width at 1440px, allowing the
range label box to expand and show the full month-day range without truncation on smaller
desktop viewports. The keyboard shortcut adds discoverability for power users without
adding UI chrome.

**Benchmark:** Peloton schedule — icon-only prev/next navigation, labelled Today as
central anchor.

---

### Change 6 — Empty day state: richer placeholder

**Pattern replaced:** `GroupScheduleWeekGrid` renders empty day columns as:
```
<div className="rounded-2xl border border-dashed border-gray-800 bg-[#0F0F0F]/60 px-4 py-6 text-sm text-gray-500">
  No classes
</div>
```
This is a plain grey dashed box with two words — a generic, low-energy placeholder.

**New pattern:** Replace with a vertically centred column that shows a `CalendarDaysIcon`
at `w-8 h-8 text-gray-700` and below it "Rest day" in `text-xs text-gray-600`. At compact
density (week grid) the icon is `w-5 h-5` with no text. This communicates intent ("this is
a rest day") not just absence ("no data").

**Why it is better:** "No classes" reads as an error or data gap. "Rest day" with a subtle
icon reads as intentional programme design, which matches how fitness apps (Whoop, NTC)
communicate planned rest. The icon also gives visual weight to the empty column so the
grid stays geometrically balanced.

**Benchmark:** Vercel empty states — icon + short contextual label, never bare text
alone; Whoop — "Rest day" recovery state card.

---

### Change 7 — Typography normalisation

**Pattern replaced:** The page mixes ALL CAPS tracking labels (`uppercase tracking-[0.18em]`)
with mixed-case body text, Barlow Condensed display headings, and Inter labels — four
typographic registers used in close proximity across the header, status chips, and card
bodies.

**New pattern:**
- Reserve `uppercase tracking-[0.14em–0.18em]` for section-level labels only (the "LIVE
  PROGRAMME" overline in the compact header and the "BOOKING SUMMARY" overline).
- Status chips, time badges, and capacity pills: sentence case (`font-medium text-xs`).
  They do not need ALL CAPS to be identifiable — the background tint provides enough
  differentiation.
- Card class names: keep `font-semibold text-lg` (compact) / `text-xl` (comfortable).
- Remove `uppercase` from the time range chip inside `GroupScheduleEntryCard` (the
  `inline-flex … text-xs font-semibold uppercase tracking-[0.16em] text-green-300`
  element) — time ranges in ALL CAPS read as shouting and are harder to parse than
  "6:30 – 7:30 AM".

**Why it is better:** Reducing ALL CAPS usage to section labels only restores the typographic
hierarchy that ALL CAPS is supposed to provide. When everything is ALL CAPS the contrast
disappears. This aligns with the design system's own principle: "one large bold headline
per screen; supporting text at text-sm text-gray-400".

**Benchmark:** Nike Training Club — uses ALL CAPS sparingly for category labels only;
class metadata (time, trainer, duration) is always sentence case.

---

## Error Code → User Message

These are unchanged from the existing implementation. No new error states are introduced.

| Code | Message | Where shown |
|------|---------|-------------|
| `INVALID_SCHEDULE_VIEW` | "This link contains an invalid view. We've reset you to the default." | `ScheduleInvalidLinkState` inline |
| `INVALID_ANCHOR_DATE` | "This link contains an invalid date. We've reset to today." | `ScheduleInvalidLinkState` inline |
| `INVALID_TIME_ZONE` | "Unrecognised timezone in the link." | `ScheduleInvalidLinkState` inline |
| Network / 5xx | "Could not load the schedule. Check your connection and try again." | `ScheduleLoadErrorState` inline |

---

## All 5 States

### Populated state
Week grid with 4 class cards per visible day, two days showing "booked" green stripe and
green-tinted wrapper, one day showing "full" orange stripe. Compact header strip with
membership-active chip. BookingSummaryBar with two booked-class mini-cards above the grid.

### Loading state
`ScheduleHeaderSkeleton` (existing, kept) + `ScheduleToolbarSkeleton` (existing, kept) +
`ScheduleViewSkeleton` (existing, kept). Compact header skeleton: single row of three
`h-5 w-24 rounded-full bg-gray-800 animate-pulse` pills + `h-9 w-36 rounded-md bg-gray-800
animate-pulse` for the CTA.

### Empty state
`ScheduleEmptyState` (existing component): full week of "Rest day" placeholders with
`CalendarDaysIcon` in each column. Toolbar and header are visible. Message: "No classes
are scheduled for this period. Try a different week or check back closer to the date."
with a "Go to today" ghost button.

### Error state
`ScheduleLoadErrorState` (existing component): inline error banner below the toolbar with
`ExclamationTriangleIcon`, the error message, and a "Retry" button. The compact header and
toolbar remain visible so the user retains navigation context.

### Delight detail
When a user books a class successfully: the class card's left-accent stripe animates from
`bg-gray-700` to `bg-green-500` over 400ms using a CSS transition
(`transition-colors duration-[400ms]`), and the card border tint fades in via
`transition-all duration-300`. This makes the state change visible at the card level
without a separate toast being the only feedback signal.

---

## Responsive

### Mobile (below `lg:`)
- Compact header: two rows — title + chips on row 1, "Open booking hub" button full-width
  on row 2.
- Week grid: mobile stacked layout unchanged (single-column day sections with full-width
  cards).
- Day column dot indicators: not shown on mobile (dots are desktop-grid only).
- Icon-only Previous/Next buttons: rendered on all breakpoints (already small enough).

### Desktop (≥ `lg:`)
- Compact header: single row, title left, chips centre, CTA button right.
- Week grid: 7-column layout with dot indicators and circle date callout in column headers.
- Sticky toolbar: `lg:flex-row lg:items-center lg:justify-between` unchanged.