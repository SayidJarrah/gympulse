# Design: Group Classes Schedule View

## Reference
- PRD: `docs/prd/group-classes-schedule-view.md`
- SDD: `docs/sdd/group-classes-schedule-view.md`
- Design System: `docs/design/system.md`
- Date: 2026-03-30

## Benchmark

Peloton class schedule view — sticky toolbar with view-switcher tabs (weekly / list), period navigator with Previous / Today / Next controls, and class entry cards that show time, duration, and instructor at a glance without extra clicks. Chosen because the three-view model (week, day, list) directly matches the SDD-defined schedule API contract and the toolbar-pinning pattern keeps navigation accessible while scrolling long schedules.

## User Flows
1. Member opens `/schedule` from the authenticated navbar, lands on Week view for the current week, sees loading skeletons instead of stale content, then sees the Monday-through-Sunday programme once `GET /api/v1/class-schedule?view=week&anchorDate={today}&timeZone={deviceTimeZone}` returns.
2. Member uses the sticky schedule toolbar to switch between `Week`, `Day`, and `List`. The route updates to `/schedule?view={view}&date={anchorDate}` without changing the selected anchor date, then the page refetches with the same `anchorDate` and `timeZone`.
3. Member uses `Previous`, `Today`, or `Next` in the period navigator. The anchor date changes by 7 days in Week view, 1 day in Day view, and 14 days in List view. The toolbar label updates immediately and the schedule reloads.
4. Member clicks a class entry card. A read-only class summary modal opens and shows the class name, local date, local time range, duration, and trainer names from the current payload. Member closes it with `Close`, `Escape`, or overlay click.
5. Member opens a class entry with no assigned trainer. The card and modal both render `Trainer TBA` when `trainerNames` is an empty array.
6. Member lands on a period with no visible `SCHEDULED` group classes. The schedule chrome remains visible, but the content body becomes an empty state with copy that explains there are no classes in the selected period and offers `Go to today`.
7. Authenticated USER without an ACTIVE membership opens `/schedule`. No schedule payload is shown. The page replaces the schedule content with a membership-required state and a primary CTA to `/plans`.
8. Unauthenticated visitor attempts to open `/schedule`. `UserRoute` redirects to `/login` before any schedule UI renders.
9. Authenticated ADMIN attempts to open `/schedule`. `UserRoute` redirects to `/plans` before any schedule UI renders.
10. Schedule fetch fails with `INVALID_SCHEDULE_VIEW`, `INVALID_ANCHOR_DATE`, or `INVALID_TIME_ZONE`. The page shows an invalid-link state with a `Reset to current week` action that rewrites the URL to `/schedule?view=week&date={today}` and retries.
11. Schedule fetch fails with a network or 5xx error. The page shows a non-technical error state with `Retry schedule`. Previous entries are cleared and not shown as current.
12. A class entry is removed from the active payload while its modal is open after a refresh. The modal stays open but swaps to an inline error state: “This class is no longer in the latest schedule. Close and continue browsing.”

## Screens & Components
### Screen: Group Classes Schedule (`/schedule`)
Who sees it: `USER` with ACTIVE membership via `UserRoute`; unauthenticated users are redirected to `/login`; authenticated `ADMIN` users are redirected to `/plans`; authenticated `USER` accounts without ACTIVE membership see the membership-required state on this route.
Purpose: Let Members browse upcoming group Classes in week, day, and rolling list views without any booking or editing actions.
Layout: `min-h-screen bg-[#0F0F0F]`; shared `Navbar` at top; page shell `mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8`; sticky toolbar sits below the navbar with `sticky top-16 z-30`.
Data dependencies: `view`, `anchorDate`, `timeZone`, `week`, `rangeStartDate`, `rangeEndDateExclusive`, and `entries[].{id,name,scheduledAt,localDate,durationMin,trainerNames}` from `GET /api/v1/class-schedule`.
Entry points: Navbar link `Schedule`; direct navigation to `/schedule?view=week&date=2026-03-30`; retry/reset actions inside route states.
Exit points: `/plans` from membership-required CTA; `/login` from unauthenticated redirect; in-page period navigation and view switching; class summary modal close returns to the same route state.

#### Navbar update
- Purpose: `Schedule` is already defined as the second item in the authenticated primary navigation by `docs/design/user-access-flow.md` (`Home` | `Schedule` | `Trainers` | `My Favorites` | `Profile`). No additional nav insertion is required by this feature. `Plans` is not a top-level nav item for authenticated `USER` accounts.
- Data shown: none beyond current route active state.
- User actions: navigate to `/schedule`.
- Validation: render only when `isAuthenticated === true` and `user.role === 'USER'`.
- Error handling: none.
- Tailwind structure: reuse existing navbar link pattern; active link `border-b-2 border-green-500 text-green-400`.
- Reuse notes: existing `Navbar` component change only; do not create a schedule-specific header.

#### PageHeader
- Purpose: Introduce the schedule page and reinforce that it is included with an active Membership.
- Data shown: static heading and dynamic timezone badge sourced from `timeZone`.
- User actions: none.
- Validation: none.
- Error handling: hide the timezone badge only if the route is in membership-required or fatal error state.
- Tailwind structure: `flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between`; heading block uses `text-3xl font-bold leading-tight text-white`; supporting copy uses `text-base text-gray-400`; timezone badge uses `inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-xs font-medium text-gray-300`.
- Reuse notes: timezone badge can be reused by future booking flows that also depend on device timezone.

- Heading: `Group Classes`
- Subheading: `Browse the live programme included with your membership.`
- Timezone badge copy: `Times shown in {timeZone}`

#### GroupScheduleToolbar
- Purpose: Keep the current view, period navigation, and range context visible while the member scrolls.
- Data shown: `view`, `anchorDate`, `timeZone`, `week`, `rangeStartDate`, `rangeEndDateExclusive`.
- User actions: switch view, go to previous period, return to today, go to next period.
- Validation: only valid views `week`, `day`, `list` are selectable; `anchorDate` written to the URL must stay `YYYY-MM-DD`.
- Error handling: on invalid-query errors the toolbar is hidden and replaced by the invalid-link full-page state; during loading it renders skeleton pills and disabled buttons instead of stale labels.
- Tailwind structure: `sticky top-16 z-30 flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900/95 px-4 py-4 shadow-lg shadow-black/40 backdrop-blur md:px-6 lg:flex-row lg:items-center lg:justify-between`.
- Reuse notes: implement with the design-system `Sticky Segmented Toolbar` pattern added in `docs/design/system.md`.

#### GroupScheduleViewTabs
- Purpose: Toggle between the three supported schedule layouts.
- Data shown: `view`.
- User actions: click `Week`, `Day`, or `List`.
- Validation: tab set is fixed to three options; selected tab sets `aria-current="page"`-like visual emphasis through `aria-pressed="true"`.
- Error handling: disabled while the page is fetching a new payload.
- Tailwind structure: outer wrapper `inline-flex w-full rounded-xl border border-gray-800 bg-[#0F0F0F] p-1 sm:w-auto`; each button `min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors`; active `bg-green-500 text-white`; inactive `text-gray-400 hover:bg-gray-800 hover:text-white`.
- Reuse notes: reusable for other multi-view member pages.

#### GroupSchedulePeriodNavigator
- Purpose: Show the current date range and move backward or forward through schedule periods.
- Data shown:
  - Week view: `rangeStartDate`, `rangeEndDateExclusive`, `week`
  - Day view: `anchorDate`, `week`
  - List view: `rangeStartDate`, `rangeEndDateExclusive`
- User actions: `Previous`, `Today`, `Next`.
- Validation: previous/next increments depend on current view; `Today` resets `anchorDate` to the device-local current date.
- Error handling: buttons are disabled during fetch; label area uses skeleton blocks on first load.
- Tailwind structure: `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`; button row `inline-flex items-center gap-2`; label card `rounded-xl border border-gray-800 bg-[#0F0F0F] px-4 py-3 text-left`.
- Reuse notes: pair with `GroupScheduleViewTabs` inside the same sticky toolbar.

- Button labels: `Previous`, `Today`, `Next`
- Week label format: `Mon 30 Mar - Sun 5 Apr`
- Day label format: `Tue 31 Mar`
- List label format: `Mon 30 Mar - Sun 12 Apr`
- Secondary meta line:
  - Week/Day: `Week 14`
  - List: `14-day view`

#### MembershipRequiredState
- Purpose: Replace schedule content when the member has no ACTIVE Membership.
- Data shown: static copy and CTA.
- User actions: click `Browse plans`.
- Validation: shown only for `NO_ACTIVE_MEMBERSHIP`.
- Error handling: no extra toast or banner; this is the full route state.
- Tailwind structure: `flex flex-col items-center gap-4 rounded-2xl border border-gray-800 bg-gray-900 px-6 py-16 text-center shadow-md shadow-black/50`.
- Reuse notes: reuse the membership empty-state visual language from `/membership`, but update copy for schedule access.

- Heading: `Membership required`
- Body: `Group classes are available to Members with an active membership. Renew or choose a plan to view the live programme.`
- Primary CTA: `Browse plans`

#### ScheduleInvalidLinkState
- Purpose: Recover from invalid query params without exposing backend terminology.
- Data shown: error title, helper copy, reset CTA.
- User actions: click `Reset to current week`.
- Validation: used for `INVALID_SCHEDULE_VIEW`, `INVALID_ANCHOR_DATE`, and `INVALID_TIME_ZONE`.
- Error handling: resetting rewrites the URL to the default current-week state and triggers a fresh fetch.
- Tailwind structure: `flex flex-col items-center gap-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-6 py-14 text-center`.
- Reuse notes: reusable for other route-driven views with invalid query params.

- Heading: `This schedule link is out of date`
- Body: `Reset to the current week to keep browsing the latest group classes.`
- CTA: `Reset to current week`

#### ScheduleLoadErrorState
- Purpose: Handle transient load failures without showing stale classes as current.
- Data shown: error title, helper copy, retry CTA.
- User actions: click `Retry schedule`.
- Validation: used for generic network errors and unknown 5xx responses.
- Error handling: clear previous schedule payload before rendering this state.
- Tailwind structure: `flex flex-col items-center gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-14 text-center`.
- Reuse notes: same page-level error treatment can be reused by future booking pages.

- Heading: `Schedule unavailable`
- Body: `We couldn’t load the latest group classes. Please try again.`
- CTA: `Retry schedule`

#### ScheduleEmptyState
- Purpose: Keep the page understandable when the selected period has no visible classes.
- Data shown: view-aware heading, helper copy, `Go to today` CTA.
- User actions: click `Go to today`.
- Validation: shown when `entries.length === 0` and the route is not in an error or membership-required state.
- Error handling: none.
- Tailwind structure: `flex flex-col items-center gap-4 rounded-2xl border border-gray-800 bg-gray-900 px-6 py-16 text-center`.
- Reuse notes: empty-state shell can be reused for future booking history/calendar pages.

- Heading:
  - Week/Day: `No group classes in this period`
  - List: `No group classes in this 14-day window`
- Body: `Try another date range or jump back to today’s schedule.`
- CTA: `Go to today`

#### GroupScheduleWeekGrid
- Purpose: Show the selected Monday-through-Sunday week with classes grouped under the correct day.
- Data shown: `entries` filtered to the 7-day range; each item uses `name`, `scheduledAt`, `localDate`, `durationMin`, `trainerNames`.
- User actions: open a class summary modal from any entry card.
- Validation: render only when `view === 'week'`; order entries by `scheduledAt ASC` within each day column.
- Error handling: if a day has no classes, render `No classes` text within that day section instead of leaving it blank.
- Tailwind structure:
  - Desktop wrapper: `hidden lg:grid lg:grid-cols-7 lg:gap-4`
  - Day column: `flex min-h-[18rem] flex-col rounded-2xl border border-gray-800 bg-gray-900`
  - Column header: `border-b border-gray-800 px-4 py-4`
  - Entries stack: `flex flex-1 flex-col gap-3 p-4`
- Reuse notes: desktop-only 7-column pattern; mobile rendering is handled by the same component as stacked day sections rather than a separate component.

- Day header format: `Mon` on first line, `30 Mar` on second line
- Today indicator: add `text-green-400` to the date label and `ring-1 ring-green-500/40` to the day card
- Empty day copy: `No classes`

#### GroupScheduleDayAgenda
- Purpose: Show one selected date as a chronological agenda.
- Data shown: `entries` for `anchorDate`; each row uses `name`, `scheduledAt`, `durationMin`, `trainerNames`.
- User actions: open class summary modal.
- Validation: render only when `view === 'day'`; agenda remains chronological.
- Error handling: if there are no entries, use the shared empty state instead of an empty list shell.
- Tailwind structure: `rounded-2xl border border-gray-800 bg-gray-900 shadow-md shadow-black/50`; header `border-b border-gray-800 px-6 py-5`; body `flex flex-col divide-y divide-gray-800`.
- Reuse notes: future booking day views can reuse the same agenda shell.

- Section heading: `Day agenda`
- Date label: full weekday + date, for example `Tuesday, 31 March`

#### GroupScheduleRollingList
- Purpose: Show the SDD-defined rolling 14-day window grouped by date.
- Data shown: `rangeStartDate`, `rangeEndDateExclusive`, `entries`.
- User actions: open class summary modal.
- Validation: render only when `view === 'list'`; group entries by `localDate`, preserve chronological order inside each group.
- Error handling: if all groups are empty, use the shared empty state.
- Tailwind structure: `flex flex-col gap-4`; date section `rounded-2xl border border-gray-800 bg-gray-900`; section header `border-b border-gray-800 px-5 py-4`; row list `divide-y divide-gray-800`.
- Reuse notes: reusable for future booking history lists with date-grouped data.

- Section heading: `Upcoming 14 days`
- Date group label format: `Mon 30 Mar`

#### GroupScheduleEntryCard
- Purpose: Render one Class consistently across week, day, and list layouts.
- Data shown:
  - `name`
  - formatted local start time from `scheduledAt`
  - formatted local end time derived from `durationMin`
  - optional formatted `localDate` when `showDate === true`
  - `trainerNames.join(', ')` or `Trainer TBA`
- User actions: click the card to open `GroupScheduleEntryModal`.
- Validation: `trainerNames.length === 0` must render `Trainer TBA`; card is read-only and must not show booking, cancellation, or waitlist controls.
- Error handling: none inside the card; all fetch failures are page-level.
- Tailwind structure:
  - Base button: `group flex w-full flex-col items-start gap-3 rounded-xl border border-gray-800 bg-[#0F0F0F] p-4 text-left transition-colors duration-200 hover:border-green-500/40 hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500`
  - Time row: `flex items-center gap-2 text-sm font-semibold text-green-400`
  - Meta row: `text-sm text-gray-400`
- Reuse notes: reusable for future member booking cards if action slots are added later.

- Primary line: class name
- Time format: `18:00 - 19:00`
- Trainer line label: `Trainer` for one name, `Trainers` for multiple names, `Trainer TBA` with no label prefix when empty

#### GroupScheduleEntryModal
- Purpose: Provide a larger, read-only summary without leaving the schedule route.
- Data shown: `name`, formatted `localDate`, formatted local start and end time from `scheduledAt` + `durationMin`, `durationMin`, `trainerNames`.
- User actions: `Close`.
- Validation: open from current page payload only; do not make a secondary API call.
- Error handling: if the selected `id` no longer exists after a schedule refresh, replace the body with an inline error banner and message instead of stale data.
- Tailwind structure:
  - Overlay: reuse modal pattern from design system
  - Header title: class name
  - Summary list: `grid grid-cols-1 gap-4 md:grid-cols-2`
  - Error banner: `rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300`
- Reuse notes: reusable for future read-only event detail modals.

- Modal title: entry `name`
- Field labels: `Date`, `Time`, `Duration`, `Trainer` / `Trainers`
- Empty trainer value: `Trainer TBA`
- Error copy when selected entry disappears: `This class is no longer in the latest schedule. Close and continue browsing.`
- Footer button label: `Close`

## Component States
| Component | Loading | Empty | Error | Populated |
|-----------|---------|-------|-------|-----------|
| GroupClassesSchedulePage | Show page header skeleton plus toolbar skeleton; content area uses 3 pulse cards or 7 day-column shells in Week view; stale payload is cleared before loading renders. | N/A at route shell level; empty handled by `ScheduleEmptyState`. | Full-page `ScheduleInvalidLinkState`, `ScheduleLoadErrorState`, or `MembershipRequiredState` replaces schedule body. | Header, sticky toolbar, and active schedule view render from fetched payload. |
| GroupScheduleToolbar | Tabs and navigator buttons render as disabled pulse blocks; no previous labels remain visible. | Hidden only when a full-page access/error state replaces the schedule. | Hidden for invalid-link and generic-error route states. | Active view button highlighted; period label and timezone badge render with fetched metadata. |
| GroupScheduleWeekGrid | Render 7 day shells on desktop and 7 stacked day shells on mobile with `animate-pulse` cards. | Use shared `ScheduleEmptyState`, not an empty grid. | Page-level error state replaces the grid. | Seven day groups show chronological `GroupScheduleEntryCard` stacks; empty days show `No classes`. |
| GroupScheduleDayAgenda | Header and 3 placeholder rows with pulse bars. | Shared `ScheduleEmptyState`. | Page-level error state replaces the agenda. | Single-day agenda rows render in chronological order. |
| GroupScheduleRollingList | Two date-group skeleton cards with 2 pulse rows each. | Shared `ScheduleEmptyState`. | Page-level error state replaces the list. | Date-grouped 14-day agenda renders with group headings and entry rows. |
| GroupScheduleEntryCard | Entry card skeleton uses `h-24 rounded-xl bg-gray-900 animate-pulse`. | N/A. | N/A; card-level fetch errors are not supported. | Button card shows name, time range, optional date, and trainer line or `Trainer TBA`. |
| GroupScheduleEntryModal | No separate loading state; it opens instantly from local payload. | Closed state only. | Inline modal error replaces the detail fields when the selected entry disappears after a refresh. | Modal shows read-only summary fields and `Close` action. |
| MembershipRequiredState | N/A. | N/A. | N/A. | Full-page access gate with CTA to `/plans`. |

## Error Code → UI Message
| Error Code | Message shown to user | Location |
|-----------|----------------------|----------|
| `INVALID_SCHEDULE_VIEW` | `This schedule link is out of date. Reset to the current week to keep browsing the latest group classes.` | Full-page invalid-link state on `/schedule` with `Reset to current week` button |
| `INVALID_ANCHOR_DATE` | `This schedule link is out of date. Reset to the current week to keep browsing the latest group classes.` | Full-page invalid-link state on `/schedule` with `Reset to current week` button |
| `INVALID_TIME_ZONE` | `This schedule link is out of date. Reset to the current week to keep browsing the latest group classes.` | Full-page invalid-link state on `/schedule` with `Reset to current week` button |
| `UNAUTHORIZED` | No inline message; user is redirected to sign in. | Route redirect to `/login` before schedule UI renders |
| `ACCESS_DENIED` | No inline message; schedule stays member-only. | Route redirect to `/plans` before schedule UI renders |
| `NO_ACTIVE_MEMBERSHIP` | `Group classes are available to Members with an active membership. Renew or choose a plan to view the live programme.` | Full-page membership-required state with CTA to `/plans` |

## Responsive Behaviour
- Mobile:
  - Page shell uses `px-4 py-6`.
  - Sticky toolbar stacks into three rows: tabs, period label, action buttons.
  - View tabs are full-width equal buttons with `min-h-11`.
  - Week view does not use a 7-column grid; it becomes stacked day sections with day headers and card lists.
  - Day and List views render full-width cards with date/time metadata stacked vertically.
  - Modal uses full-width layout within `px-4`; footer buttons stack with `Close` full width when needed.
  - No page-level horizontal scrolling at `360px`; long trainer lists wrap.
- Tablet:
  - Page shell widens to `sm:px-6`.
  - Sticky toolbar keeps tabs and period navigator on separate wrapped rows.
  - Week view stays stacked until `lg` to avoid compressed 7-column cards.
  - Day and List card internals can switch to two-column metadata rows from `md`.
  - Modal keeps `max-w-lg` and preserves overlay close behavior.
- Desktop:
  - Sticky toolbar uses a single wrapped row with tabs on the left and navigator/meta on the right.
  - Week view switches to a 7-column day grid at `lg`.
  - Day agenda and rolling list remain centered inside `max-w-5xl` content width for scanability.
  - Modal keeps `max-w-lg` and centers in the viewport.

## Accessibility
- Use visible text labels for all toolbar buttons: `Week`, `Day`, `List`, `Previous`, `Today`, `Next`, `Retry schedule`, `Reset to current week`, `Browse plans`, `Close`.
- Entire schedule entry cards are `<button>` elements so keyboard users can open the modal with `Enter` or `Space`.
- Focus styles follow the design system ring pattern: `focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900`.
- The page keeps a semantic heading hierarchy: one `h1` for the page, `h2` for active view sections, `h3` for date groups when needed.
- Toolbar updates announce range changes through a polite live region tied to the period label.
- Error and empty states use icon + heading + body copy; meaning never depends on color alone.
- Today state in Week view uses both color and text label, for example `Today`.
- The modal uses `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap, overlay click close, and `Escape` close; focus returns to the triggering entry card.
- Touch targets for tabs, nav buttons, cards, and modal controls stay at or above 44x44 px.
- Week view day sections use semantic section headings instead of a complex ARIA grid, since the content is read-only and primarily scannable.

## Interaction Notes
- URL is the navigable state source of truth: `/schedule?view={week|day|list}&date={anchorDate}`.
- First load defaults to `view=week` and `date=today in device timezone`.
- Timezone is resolved from `Intl.DateTimeFormat().resolvedOptions().timeZone`; if resolution fails client-side, frontend falls back to `UTC` before calling the API.
- Switching view preserves `anchorDate`; previous/next increments are view-specific: 7 days for Week, 1 day for Day, 14 days for List.
- Initial load and every refetch clear the previous schedule payload before skeletons render. Do not blur, dim, or relabel old entries as current data.
- Retry behaviour:
  - `INVALID_SCHEDULE_VIEW`, `INVALID_ANCHOR_DATE`, `INVALID_TIME_ZONE` reset to default current-week URL and refetch.
  - generic fetch errors retry the current URL state unchanged.
  - `NO_ACTIVE_MEMBERSHIP` does not auto-retry; the user must obtain an active Membership first.
- No optimistic updates are needed because the feature is read-only.
- Modal opens from local payload only, so open/close is immediate. If the selected class disappears after a refetch, keep the modal open in its error state instead of silently closing it.
- Keep transitions brief: 150-200 ms color/opacity transitions on tabs, buttons, and entry cards; avoid animated calendar movement that could imply drag/drop or booking.

## Open Design Notes
- Blocking documentation mismatch noted: the PRD says List view should cover the selected week, but the SDD contract defines List as a rolling 14-day window from `anchorDate`. This design follows the SDD so frontend implementation matches the backend contract; PRD should be reconciled separately.
- This feature intentionally exposes no booking, cancellation, waitlist, contact-trainer, spot-count, or capacity UI.
- `trainerNames: []` must always render `Trainer TBA`; do not hide the trainer row.
- The class summary modal is powered only by the schedule payload already on the page. No extra endpoint or hidden fields are assumed.
- The sticky toolbar pattern introduced here is reusable and has been added to `docs/design/system.md`.
