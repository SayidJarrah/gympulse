# Review: Class Schedule Redesign — 2026-04-11

Benchmark applied: Peloton class schedule (compact header, icon nav, left-accent cards),
Whoop (summary strip above detail), iOS Calendar / Peloton day-picker (filled-circle today),
Linear (left-edge stripe), Vercel + Whoop (empty state icon + contextual label).

---

## Blockers (must fix before PR)

- [ ] `GroupScheduleWeekGrid.tsx:170` — Desktop grid calls `renderEntries(dayEntries, false)` which passes
  `compact={false}` but then maps to `<GroupScheduleEntryCard density="compact" ...>`. The `compact`
  flag passed to `renderEntries` is ignored — density is hardcoded to `"compact"` inside the function
  (line 69). Cards in the comfortable/day view would also be rendered at compact density because
  `renderEntries` never passes `density` from its argument through to `GroupScheduleEntryCard`.
  Fix: either make `renderEntries` accept and forward a `density` prop, or delete the `compact`
  parameter entirely since it does nothing. As-is the `compact` argument on the desktop call silently
  has no effect and the card layout is always compact — which is correct for the week grid, but the
  dead parameter will mislead the next developer and the `EmptyDayPlaceholder` route that does
  use it is fine, so the issue is only in the `GroupScheduleEntryCard` branch.
  Verdict: this is a UX regression for any future day/list view reuse of this function, and a
  code-correctness issue now. Must be resolved.

- [ ] `BookingSummaryBar.tsx:74` — "More bookings" overflow card uses
  `text-sm font-semibold uppercase tracking-[0.18em] text-gray-500` for the "More bookings" label
  and `font-['Barlow_Condensed'] text-4xl font-bold uppercase` for the +N count. This directly
  contradicts Change 7 (typography normalisation) which explicitly removes Barlow Condensed display
  text and ALL CAPS from card bodies. The spec says ALL CAPS is reserved for section-level overlines
  only. The "More bookings" label is not a section overline — it is a card label inside the
  BookingSummaryBar. This is an internal design regression: the redesign introduced the rule but
  violates it within the same file. Fix: change "More bookings" label to sentence case
  `font-medium text-xs text-gray-500`, and change the +N count to Inter bold (remove
  `font-['Barlow_Condensed']` and `uppercase`). Suggested: `text-3xl font-bold text-white`.

- [ ] `GroupScheduleEntryCard.tsx:156` — `showDate` block inside the card still uses
  `text-xs font-semibold uppercase tracking-[0.16em] text-gray-500` for the date label. Change 7
  explicitly says to remove `uppercase` from chip/metadata text inside cards. The date label is
  card-level metadata, not a section overline. This is a direct contradiction with the stated
  spec rule. Fix: remove `uppercase tracking-[0.16em]` from this element; use
  `text-xs font-semibold text-gray-500`.

- [ ] `GroupClassesSchedulePage.tsx:807–823` — `ScheduleLoadErrorState` renders with no icon.
  Design spec (All 5 States / Error state) specifies `ExclamationTriangleIcon` next to the error
  message. The design-standards quality bar also explicitly prohibits "Alert/error messages using
  only red colour (add an icon and descriptive text)". The component has `ExclamationTriangleIcon`
  called out in the SDD but it is absent from the implementation. Without the icon the error state
  fails the design-standards no-color-only-alerts rule. Fix: import `ExclamationTriangleIcon` from
  `@heroicons/react/24/outline` and render it above the heading inside `ScheduleLoadErrorState`.
  Same applies to `ScheduleInvalidLinkState` (line 786) which uses orange-tinted error styling but
  also has no icon.

---

## Suggestions (non-blocking)

- `GroupSchedulePeriodNavigator.tsx:73` — the range-label `meta` row (`text-xs font-semibold
  uppercase tracking-[0.18em]`) is a section-level overline, which is correct per Change 7. However
  when `view === 'list'` this renders "14-day view" in ALL CAPS which looks mechanical. Consider
  keeping it as "14-day view" in sentence case since it is a descriptor, not a category label.
  Not a blocker — the spec allows this since it is below the range label box.

- `BookingSummaryBar.tsx:16–21` — the empty-state placeholder (`No classes booked yet in this
  view.`) is a plain text line in a gray-900 rounded container. The spec says the bar should always
  occupy the same height to avoid layout shift, but at `py-3` this is noticeably shorter than the
  populated state (`p-5` with stacked content). This may cause a visible reflow when the first
  booking is made. Consider giving the empty state a fixed `min-h` matching the populated single-row
  height (~52px), or adding a subtle icon (e.g. `CalendarDaysIcon w-4 h-4 text-gray-700`) inline
  with the text for visual consistency with the "Rest day" empty-day pattern.

- `GroupScheduleWeekGrid.tsx:146` — the today date-number circle is `h-11 w-11` (44px) rather than
  the `w-12 h-12` (48px) specified in the delta spec (Change 3). This is a minor discrepancy but
  the spec is explicit. The difference is one Tailwind step. No visual regression, but it diverges
  from the spec.

- `GroupSchedulePeriodNavigator.tsx:82,100` — `title` tooltip text says "Previous week (← key)" /
  "Next week (→ key)" even when `view === 'day'` or `view === 'list'`. The keyboard handler in
  `GroupClassesSchedulePage.tsx:378` correctly navigates by 1 day or 14 days depending on view.
  The tooltip should reflect the current view: "Previous day", "Previous 2 weeks", etc. Low impact
  but creates a small discrepancy between what the tooltip says and what the key actually does in
  day view.

- `GroupClassesSchedulePage.tsx:378–388` — keyboard handler for arrow keys is correct in
  principle but the `// eslint-disable-next-line react-hooks/exhaustive-deps` comment suppresses
  a legitimate stale-closure risk. `handlePrevious` and `handleNext` are defined as plain functions
  that close over `activeView`, `activeAnchorDate`, and `timeZone`, and are recreated each render,
  but the `useEffect` dependency array lists those state values directly — meaning re-registration
  happens on every anchor date change, which is correct. The lint suppression is unnecessary and
  should be removed; add `handlePrevious` and `handleNext` to the dependency array or wrap them
  in `useCallback`.

- `GroupScheduleWeekGrid.tsx:58–76` — `renderEntries` is a local function defined inside the
  component body on every render. Since it receives `dayEntries` and `compact` as parameters and
  does not close over mutable state beyond the outer props, it is safe but wasteful. Extract it
  to a named component (`DayColumnEntries`) for clarity and to prevent accidental stale-closure
  issues if the function is extended later.

- Design quality note — the `ScheduleEmptyState` (page-level, all views empty) does not use
  a `CalendarDaysIcon` or any visual element. The spec states "full week of 'Rest day'
  placeholders with `CalendarDaysIcon`" for the empty state in week view. The current
  `ScheduleEmptyState` component renders a text-only card with a green CTA button.
  This contradicts the spec's empty-state description. In week view specifically, the
  grid is not rendered when `isEmpty === true` (line 461 in the page), so the
  `GroupScheduleWeekGrid` "Rest day" columns are never shown — the user sees a blank rounded
  card instead. The spec says the toolbar and column headers remain visible with rest-day
  placeholders in each column; the implementation hides the grid entirely. This is a UX
  divergence but not a primary flow blocker since the empty state includes a CTA.
  Recommend making week-view empty state render the grid skeleton with rest-day placeholders
  rather than collapsing to the generic message card.

---

## Verdict

NEEDS WORK — 4 blockers.

Changes 1 (compact header), 2 (BookingSummaryBar placement), 3 (dot indicators + today
circle), 5 (icon-only nav + keyboard support), 6 (Rest day placeholder), and the core
of Change 7 (typography normalisation) are all correctly implemented and represent a
genuine, measurable quality improvement. A Peloton-calibre user would find the redesigned
page significantly more usable than the original: the hero is gone, the schedule is
immediately visible, booking state is scannable via the left stripe, and the nav is
tighter. The improvement is real.

However four issues block the PR: a dead `compact` parameter that masks a logic error in
the render function, a typography regression inside the BookingSummaryBar's overflow card
that contradicts the redesign's own rule, an uppercase date label inside cards that
contradicts Change 7, and missing icons on both error states in violation of the
design-standards quality bar.

Fix the four blockers and the PR is approvable without re-review.
