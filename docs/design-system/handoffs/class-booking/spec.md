# Design: Class Booking

> Authoritative UI/UX specification for the class-booking feature.
> This spec **supersedes** `docs/design/class-booking-cancellation.md` entirely.
> Wherever the two conflict, this document wins.
> Prototype: `docs/design/prototypes/class-booking.html`
> Last updated: 2026-04-18

---

## PRD Coverage

Covers all 7 acceptance criteria from `docs/prd/class-booking.md`.

| AC | Surface |
|----|---------|
| AC-1: Member books a SCHEDULED class with capacity | BookableClassCard + BookingConfirmModal |
| AC-2: Booking creation rejections with distinct reasons | BookableClassCard states + BookingConfirmModal errors |
| AC-3: Race condition — at most one succeeds | BookingConfirmModal CLASS_FULL error |
| AC-4: Cancel 2h before start only | CancelBookingModal + 2h-gated cancel state |
| AC-5: Member booking history — drawer + cabinet page | MyBookingsDrawer + MyBookingsPage |
| AC-6: Admin per-user booking history | AdminUserBookingHistoryPanel |
| AC-7: Admin per-class attendee list | AdminAttendeeListPanel |

---

## Route Decisions

| Surface | Route | Rationale |
|---------|-------|-----------|
| Member "My Bookings" cabinet page | `/profile/bookings` | Sibling to `/profile` under the same authenticated shell; consistent with the existing cabinet area established by `user-profile-management.md`. A tab or sidebar link in the profile nav links to it. |
| Admin per-user booking history | `/admin/users/{id}` member-detail panel | Existing pattern in admin shells; the attendee-list spec (AC-7) notes admin member-detail as the natural home. No new top-level admin route needed. |
| Admin attendee list | Inside `ClassInstanceEditPanel` on `/admin/scheduler` | The slide-over edit panel for a class instance is already the admin's detail surface for that instance. An "Attendees" tab added to the panel keeps context without a new route. |

---

## User Flows

### Flow 1 — Member books a class (happy path)

1. Member opens `/schedule`, sees upcoming group classes.
2. Each class card shows a primary `Book spot` CTA, spot count, and class state.
3. Member clicks `Book spot` — `BookingConfirmModal` opens with class summary.
4. Member clicks `Confirm booking` — API call fires. Button enters loading state.
5. On success: modal closes. Class card updates to the `Booked` state showing a green badge and `Cancel booking` action. A `BookingToast` appears bottom-right confirming `Spot booked.`
6. `MyBookingsDrawer` count increments if open.

### Flow 2 — Member books and sees rejection

2a. **No active plan:** Card renders `Active plan required` state — no `Book spot` button, a `Browse plans` CTA instead.
2b. **Class full:** Card renders `Fully booked` state — button absent; orange badge. Attempting to book via a stale card returns `CLASS_FULL` in the modal.
2c. **Class already started:** Card renders `Class in progress` state — button disabled with inline copy.
2d. **API edge case:** `BookingConfirmModal` receives error response — inline error banner rendered inside the modal.

### Flow 3 — Member cancels a booking (happy path)

1. Member sees a `Booked` class card showing `Cancel booking` secondary button and the cutoff line: `Cancellable until {cutoffTime}`.
2. Member clicks `Cancel booking` — `CancelBookingModal` opens.
3. Member clicks `Confirm cancellation` — API call fires. Button enters loading state.
4. On success: modal closes. Card resets to `Book spot` state (if still SCHEDULED and under capacity). A `BookingToast` appears: `Booking cancelled.`

### Flow 4 — Member tries to cancel inside 2h window

1. The cancel button is visually disabled on the class card.
2. Helper text reads: `Cancellation closed — class starts in less than 2 hours.`
3. Clicking the disabled button does nothing — no modal opens.
4. If a race condition occurs (user opened modal before cutoff, cutoff passes, user submits), the modal returns `CANCELLATION_WINDOW_CLOSED` error inline.

### Flow 5 — Member reviews booking history (cabinet page)

1. Member clicks `My Bookings` in the profile sidebar or `See all my bookings` in the drawer footer.
2. Lands on `/profile/bookings`.
3. Page loads with skeleton rows, then populates `Upcoming` and `Past / Cancelled` groups.
4. Member uses the status filter (`All | Confirmed | Cancelled`) to narrow the list.
5. Member clicks `Cancel` on an eligible upcoming booking — `CancelBookingModal` opens.
6. Past / Cancelled group is read-only — no cancel action.

### Flow 6 — Admin views per-user booking history

1. Admin navigates to `/admin/users/{id}`.
2. A `BookingHistoryTab` inside the member-detail surface shows all the member's bookings.
3. Admin uses the status filter and sees: class name, scheduled start time, status chip, booking timestamp, and cancellation timestamp where applicable.
4. No booking or cancel actions — read-only.

### Flow 7 — Admin views attendee list for a class instance

1. Admin opens `/admin/scheduler` and clicks a `ClassInstanceCard`.
2. `ClassInstanceEditPanel` opens. An `Attendees` tab is added alongside the edit fields.
3. Admin clicks `Attendees` tab — the panel body switches to the `AdminAttendeeListPanel`.
4. Shows: capacity vs confirmed-count header, then a compact list of members with booking ID, display name, status, and booking timestamp.
5. Read-only — no action buttons.

---

## Screens & Components

### Screen: Group Classes Schedule with Booking (`/schedule`)

Who sees it: `USER` with ACTIVE membership.
Benchmark: Peloton class schedule — booking state embedded directly in each class card as a footer action row. Chosen because it keeps the member oriented to the full schedule while confirming their spot, and removes the need for a separate booking page.
Layout: Extends the existing `GroupClassesSchedulePage` from `group-classes-schedule-view.md`. All layout tokens unchanged. Changes are additive inside each class card, the detail modal, and the `BookingSummaryBar`.

#### BookableClassCard

Purpose: Render a group class entry with booking state and gated CTA embedded in the card footer.

Data shown:
- `name` — `text-base font-semibold text-white`
- local start time and end time — `text-sm font-semibold text-green-400`
- trainer names — `text-sm text-gray-400`
- spots remaining or status badge
- booking action footer

Tailwind base: extends `GroupScheduleEntryCard`. Footer action row appended:

```
mt-4 flex flex-col gap-3 border-t border-gray-800 pt-4
```

Card hover: `hover:border-green-500/40 hover:bg-gray-800` (same as entry card). When `Booked`: `border-green-500/30 bg-green-500/5` to visually accent the confirmed state.

##### State: Available

- Spots line: `{n} spots left` — `text-xs text-gray-400`
- Low spots accent: when `spotsLeft <= 3`, spots line becomes `text-orange-400` with a `FireIcon h-3.5 w-3.5 inline`
- Primary CTA: `Book spot` — green-500 primary button md
- Delight detail: on hover the `Book spot` button shows a brief `shadow-green-500/25` glow pulse (200ms transition)

##### State: Booked (cancellable — more than 2h before start)

- Green confirmation badge: `Booked` — `bg-green-500/10 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5 text-xs font-semibold`
- Cutoff line: `Cancellable until {cutoffTime}` — `text-xs text-gray-400`
- Secondary CTA: `Cancel booking` — ghost button sm, `text-gray-400 hover:text-red-400 hover:bg-red-500/10`
- Note: The `Book spot` CTA is still present above the booked badge. A member may book again — the booked badge reflects the most recent confirmed booking. Layout: `Book spot` primary button on top, then the booked state strip below it.

##### State: Booked (2h window — cancel locked)

- Green confirmation badge: `Booked` (same as above)
- Cutoff line: `Cancellation closed — class starts in less than 2 hours.` — `text-xs text-orange-400`
- `Cancel booking` button: visually disabled — `opacity-40 cursor-not-allowed` — no click handler active
- `Book spot` CTA still active if capacity allows

##### State: Fully booked

- Orange badge: `Fully booked` — `bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-full px-2 py-0.5 text-xs font-semibold`
- Supporting line: `No spots available.` — `text-xs text-gray-400`
- No `Book spot` CTA

##### State: Class in progress / past

- Muted badge: `In progress` or `Ended` — `bg-gray-700 text-gray-500 rounded-full px-2 py-0.5 text-xs`
- Supporting line: `Booking is closed.` — `text-xs text-gray-500`
- No CTA rendered

##### State: Active plan required

- Orange badge: `Plan required` — orange-500/10 tint
- Supporting line: `Active membership required to book.` — `text-xs text-gray-400`
- Primary CTA: `Browse plans` — secondary button (outlined green) md, links to `/plans`

States: loaded (any of the 5 sub-states above) / loading (existing schedule skeleton + disabled CTA placeholder) / empty (no classes rendered by parent) / error (inline red banner beneath card body if booking action fails)
Delight detail: `Book spot` button hover glow — `transition-shadow duration-200 hover:shadow-lg hover:shadow-green-500/25`

---

#### BookingConfirmModal

Purpose: Confirm a booking action without leaving the schedule.

Trigger: `Book spot` CTA on any available class card.

Tailwind structure:
- Overlay: `fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm`
- Panel: `w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl shadow-black/60`

Data shown:
- Class name — `text-xl font-semibold text-white`
- Date — `text-sm text-gray-400`
- Time range — `text-sm font-semibold text-green-400`
- Trainer names — `text-sm text-gray-400`
- Spots remaining — `text-sm text-gray-400`

Actions:
- `Confirm booking` — primary button, full width. Loading state: spinner + `Confirming…`
- `Keep browsing` — ghost button, full width. Closes modal.

Error states (inline banner inside modal, above the action buttons):
- `MEMBERSHIP_REQUIRED`: `Active membership required to book.` — orange tint banner
- `CLASS_FULL`: `This class is fully booked.` — orange tint banner
- `CLASS_ALREADY_STARTED`: `Booking is closed — this class has already started.` — orange tint banner
- `CLASS_NOT_BOOKABLE`: `This class is no longer open for booking.` — orange tint banner
- Generic: `Something went wrong. Please try again.` — red tint banner

Banner structure: `flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm`

States: loaded (class summary + action) / loading (confirm button spinner, keep browsing enabled) / empty (N/A) / error (inline banner replaces or precedes the action row)
Delight detail: Modal entrance — `scale-95 opacity-0` → `scale-100 opacity-100` with `transition-all duration-200 ease-out`

---

#### CancelBookingModal

Purpose: Warn the member before releasing their spot.

Trigger: `Cancel booking` secondary button on a Booked card (when outside 2h window).

Tailwind structure: same modal shell as `BookingConfirmModal`.

Data shown:
- Class name — `text-xl font-semibold text-white`
- Date and time — `text-sm text-gray-400`
- Policy line: `Your spot will be freed and cannot be re-reserved automatically.` — `text-sm text-gray-400`
- Cutoff reminder: `Cancellation closes 2 hours before class start.` — `text-xs text-gray-500`

Actions:
- `Confirm cancellation` — destructive button, full width. Loading: spinner + `Cancelling…`
- `Keep my booking` — ghost button, full width. Closes modal.

Error states:
- `CANCELLATION_WINDOW_CLOSED`: `You can no longer cancel within 2 hours of class start.` — orange tint banner. Replaces action buttons with `Close`.
- `BOOKING_NOT_ACTIVE`: `This booking can no longer be cancelled.` — orange tint banner
- Generic: `Something went wrong. Please try again.` — red tint banner

States: loaded (class summary + action) / loading (destructive button spinner) / empty (N/A) / error (inline banner replaces or precedes the action row)
Delight detail: Destructive button hover — `bg-red-700 shadow-md shadow-red-500/20` — adds a danger-weight micro-glow on hover

---

#### BookingToast

Purpose: Lightweight confirmation of booking or cancellation result.

Placement: `fixed bottom-6 right-6 z-50` on desktop; `fixed bottom-6 left-4 right-4 z-50` on mobile.

Variants:
- Success booking: `Spot booked.` — `bg-green-500/10 border border-green-500/30 text-green-400`
- Success cancellation: `Booking cancelled.` — `bg-gray-800 border border-gray-700 text-gray-300`
- Error: `This class is fully booked.` — `bg-red-500/10 border border-red-500/30 text-red-400`

Structure: `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg shadow-black/50`
Icon: `CheckCircleIcon h-4 w-4` (success), `XCircleIcon h-4 w-4` (error)
Motion: `translate-y-4 opacity-0` → `translate-y-0 opacity-100` (200ms ease-out); auto-dismiss after 3s with fade-out.

States: populated (message shown) / loading (N/A) / empty (toast absent) / error (error variant)
Delight detail: Short slide-up entrance + auto-dismiss after 3s

---

#### BookingSummaryBar

Purpose: Lightweight awareness of booked classes in the current visible period.

Placement: Below the `GroupScheduleToolbar`, above the schedule content area. Rendered only when `myBookingCount > 0` for the visible date range.

Data shown: `You have {n} booked class{es} in this view.`
CTA: `See my bookings` — ghost sm button, opens `MyBookingsDrawer`

Tailwind structure: `flex items-center justify-between rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-400`

States: populated (count + CTA) / loading (hidden during initial schedule load) / empty (hidden when no bookings in range) / error (hidden)
Delight detail: Subtle `border-green-500/20` green tint border distinguishes this from neutral cards

---

#### MyBookingsDrawer

Purpose: Quick-peek of the member's bookings without leaving the schedule context. Updated from the superseded spec to use 2h cutoff and remove the ALREADY_BOOKED state.

Trigger: `See my bookings` CTA in `BookingSummaryBar`.
Placement: Right-side slide-over on desktop (using system.md §6J Slide-over Panel pattern), bottom sheet on mobile.

Data shown per booking row:
- Class name — `text-sm font-semibold text-white`
- Date and time — `text-sm text-gray-400`
- Status badge: `Confirmed` (green) or `Cancelled` (muted)
- `Cancel` ghost sm button — shown only when `status === CONFIRMED` and more than 2h before start
- `Cancellation closed` muted text — shown when inside 2h window

Groups: `Upcoming` and `Past / Cancelled` (separated by a `border-t border-gray-800` divider with section label)

Footer: `text-green-400 text-sm` link — `See all my bookings →` navigates to `/profile/bookings`

States: populated (grouped booking rows) / loading (skeleton rows `h-12 animate-pulse rounded-lg bg-gray-800`) / empty (`No bookings yet.` with a `CalendarIcon h-8 w-8 text-gray-600` illustration and `Book a class from the schedule above.` helper) / error (retry card inside drawer)
Delight detail: Each booking row has a `border-l-2 border-green-500` left accent when status is CONFIRMED and upcoming, drawing the eye to active reservations

---

### Screen: Member "My Bookings" Cabinet Page (`/profile/bookings`)

Who sees it: Authenticated `USER` accounts only.
Benchmark: Linear admin tables — dense, scannable table with status chips, filter controls, and row-level actions. Chosen because the bookings list is a data-heavy view that members need to scan quickly, not discover visually.
Layout: Matches the existing authenticated shell from `user-profile-management.md`. Page background `bg-[#0F0F0F]`, shared `Navbar` at top, `max-w-6xl` content container. A profile sidebar nav (desktop: left 260px column) links between `Profile` and `My Bookings`.

```
[Navbar]
[main: max-w-6xl mx-auto px-4 py-8]
  [ProfilePageHeader: "My Bookings"]
  [lg:grid lg:grid-cols-[260px_minmax(0,1fr)] gap-6]
    [ProfileSideNav] | [BookingsContent]
```

#### ProfileSideNav

Navigation links for the profile area:
- `Profile` → `/profile` — ghost link
- `My Bookings` → `/profile/bookings` — active state: `text-green-400 bg-green-500/10 rounded-lg`

Tailwind: `flex flex-col gap-1`; each link `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200`

#### MyBookingsPage header

- `h1`: `My Bookings` — `text-3xl font-bold leading-tight text-white`
- Sub-label: `Your upcoming reservations and past class history.` — `text-sm text-gray-400`

#### BookingsFilterBar

- Status filter: segmented tabs — `All | Confirmed | Cancelled`
  - Tailwind: `inline-flex rounded-xl border border-gray-800 bg-[#0F0F0F] p-1`; active tab `bg-green-500 text-white rounded-lg px-4 py-1.5 text-sm font-semibold`; inactive `text-gray-400 hover:text-white px-4 py-1.5 text-sm`
- Group toggle: `Upcoming` / `Past & Cancelled` — same segmented tab pattern

Tailwind: `flex flex-wrap items-center gap-4 mb-6`

#### UpcomingBookingsSection

Label: `Upcoming` — `text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3`

Each booking row in a `rounded-xl border border-gray-800 bg-gray-900` card stack, `divide-y divide-gray-800`:

| Column | Data | Classes |
|--------|------|---------|
| Class name | `classInstanceName` | `text-sm font-semibold text-white` |
| Date & time | `scheduledAt` formatted | `text-sm text-gray-400` |
| Trainer(s) | `trainerNames.join(', ')` or `Trainer TBA` | `text-xs text-gray-500` |
| Status chip | `CONFIRMED` → green; `CANCELLED` → gray | Badge sm |
| Cancel action | `Cancel` ghost sm button | Shown only when CONFIRMED + > 2h before start |
| Locked state | `Cancellation closed` muted text | Shown when inside 2h window |

Cutoff helper below eligible rows: `Cancellable until {cutoffTime}` — `text-xs text-gray-500`

Row Tailwind: `flex items-center justify-between gap-4 px-5 py-4`

#### PastCancelledBookingsSection

Label: `Past & Cancelled` — same section label style

Same row structure minus the cancel action column. Past bookings show `Ended` or `Attended` status badges (muted gray and green-tint respectively). Sorted descending by `scheduledAt`.

Empty state within section: `text-sm text-gray-500 text-center py-8` — `No past bookings yet.`

#### Pagination

Standard controls for each group: `< Prev  Page N of M  Next >` — Ghost buttons, `text-sm text-gray-400`.
Upcoming sorted ascending by `scheduledAt`; Past sorted descending.

States:
- Loaded: section groups with booking rows
- Loading: skeleton rows (`h-14 animate-pulse rounded-xl bg-gray-800`) in place of both sections
- Empty (no bookings at all): centered illustration — `CalendarDaysIcon h-10 w-10 text-gray-600` + `text-lg font-semibold text-gray-400` `No bookings yet.` + `text-sm text-gray-500` `Book your first class from the schedule.` + `Browse classes` green primary button → `/schedule`
- Error: `ScheduleLoadErrorState`-style centered error card with `Try again` action
- Delight detail: status chip animates from neutral to green-tint on fresh confirmation — `transition-colors duration-300` applied to the badge when the status updates in real time

---

### Component: AdminAttendeeListPanel (inside ClassInstanceEditPanel)

Who sees it: ADMIN only.
Benchmark: Linear admin table — compact read-only rows with status chips. Chosen because admins need to scan a list quickly at a glance, not manage it.
Location: New `Attendees` tab added to the existing `ClassInstanceEditPanel` slide-over on `/admin/scheduler`. Tab appears alongside any future tabs in the panel header.

Panel tab bar: `flex border-b border-gray-800 mb-4`; each tab `px-4 py-2 text-sm font-medium border-b-2 cursor-pointer`; active: `border-green-500 text-green-400`; inactive: `border-transparent text-gray-500 hover:text-gray-300`

Tabs: `Details` (existing form) | `Attendees` (new)

#### AttendeeListHeader

Shows capacity summary at the top of the Attendees tab:

```
[UserGroupIcon h-4 w-4 text-gray-400]  Attendees: {confirmedCount} / {capacity}
```

Tailwind: `flex items-center gap-2 text-sm text-gray-300 mb-3`
When full: confirmed count text becomes `text-orange-400`

#### AttendeeListTable

Compact list, not a full table. Each attendee row:

```
[Avatar initials 28px] [Display name / email fallback]        [Status chip]   [Booking timestamp]
```

- Avatar: `flex-shrink-0 h-7 w-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-300`
- Display name: `text-sm text-white` (fallback to email in `text-gray-400` if no display name)
- Status chip: `CONFIRMED` → success badge sm; `CANCELLED` → neutral badge sm
- Timestamp: `text-xs text-gray-500`

Row Tailwind: `flex items-center gap-3 py-3 border-b border-gray-800 last:border-0`
Wrapper: `overflow-y-auto max-h-[320px]`

States: loaded (attendee rows) / loading (3 skeleton rows `animate-pulse`) / empty (`No confirmed bookings yet.` with `UsersIcon h-6 w-6 text-gray-600`) / error (inline `text-sm text-red-400` — `Failed to load attendees. Try again.`)
Delight detail: Initials avatars use `bg-gray-700` default; for the first 5 confirmed attendees, the avatar background cycles through `bg-green-500/20`, `bg-orange-500/20`, `bg-blue-500/20`, `bg-purple-500/20`, `bg-cyan-500/20` to distinguish members at a glance

---

### Component: AdminUserBookingHistoryPanel (inside `/admin/users/{id}`)

Who sees it: ADMIN only.
Benchmark: Linear admin tables — status filter above a dense table, status chips in rows, no editing affordances. Chosen for admin read-only information density.
Location: A `Bookings` section or tab within the admin member-detail page at `/admin/users/{id}`. If no member-detail page exists yet, this panel is a stand-alone read-only section added when the member-detail route is implemented. The panel design is self-contained.

#### BookingHistoryFilter

Status filter dropdown: `All | Confirmed | Cancelled | Attended`
Tailwind: `rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white`

#### BookingHistoryTable

Extends the system.md Table component (§6F):

| Column | Data | Notes |
|--------|------|-------|
| Class name | `classInstanceName` | `font-medium text-white` |
| Scheduled start | `scheduledAt` formatted | `text-gray-400` |
| Status | status chip | `CONFIRMED` green, `CANCELLED` gray, `ATTENDED` blue |
| Booked at | `createdAt` | `text-xs text-gray-500` |
| Cancelled at | `cancelledAt` | `text-xs text-gray-500`; "—" if null |

Default sort: `scheduledAt desc`

Empty state: `CalendarDaysIcon h-6 w-6 text-gray-500` + `No bookings found for this member.`
Skeleton: 5 rows of `animate-pulse` bars.

Pagination: standard `< Prev  Page N of M  Next >` Ghost buttons.

States: loaded (booking rows) / loading (skeleton) / empty (no bookings) / error (inline red banner + retry button)
Delight detail: Status chips render with a subtle `ring-1` glow matching their status color on row hover — `group-hover:ring-green-500/30` for CONFIRMED — to reinforce interactive feel even on read-only rows

---

## Token Extensions

The following semantic tokens are new to this feature. They are derived from the existing palette and do not introduce new hex values.

| Token | Composition | Usage |
|-------|-------------|-------|
| `status-confirmed` | `bg-green-500/10 text-green-400 border-green-500/30` | CONFIRMED booking status chip |
| `status-cancelled` | `bg-gray-700/40 text-gray-500 border-gray-700` | CANCELLED booking status chip |
| `status-attended` | `bg-blue-500/10 text-blue-400 border-blue-500/30` | ATTENDED booking status chip (admin read surface) |
| `booking-card-booked` | `border-green-500/30 bg-green-500/5` | Class card accent when member holds a confirmed booking |
| `cutoff-locked` | `text-orange-400` | 2h cutoff copy — `Cancellation closed` helper line |

---

## Error Code → User Message

| Error Code | Message | Where shown |
|------------|---------|-------------|
| `MEMBERSHIP_REQUIRED` | `Active membership required to book.` | BookableClassCard inline, BookingConfirmModal banner |
| `CLASS_FULL` | `This class is fully booked.` | BookableClassCard, BookingConfirmModal banner, BookingToast |
| `CLASS_ALREADY_STARTED` | `Booking is closed — this class has already started.` | BookableClassCard, BookingConfirmModal banner |
| `CLASS_NOT_BOOKABLE` | `This class is no longer open for booking.` | BookingConfirmModal banner |
| `CANCELLATION_WINDOW_CLOSED` | `You can no longer cancel within 2 hours of class start.` | CancelBookingModal banner, BookableClassCard cancel-locked helper |
| `BOOKING_NOT_ACTIVE` | `This booking can no longer be cancelled.` | CancelBookingModal banner |
| `NOT_FOUND` (booking) | `Booking not found. Please refresh.` | CancelBookingModal banner |
| `ACCESS_DENIED` | No inline message; request rejected silently on the backend. | Never shown to the user — API rejects; role guard prevents UI render |
| Generic / 5xx | `Something went wrong. Please try again.` | Any modal or page error banner |

Note: `ALREADY_BOOKED` is removed entirely. No UI state or copy references this code. The `Book spot` CTA never disables because of an existing booking by the same member.

---

## Responsive

### Mobile (< 640px)

- `BookableClassCard`: CTA spans full width; booked badge and cancel button stack vertically.
- `BookingConfirmModal` and `CancelBookingModal`: bottom-sheet presentation (`fixed bottom-0 inset-x-0 rounded-t-2xl`); handle bar at top.
- `MyBookingsDrawer`: bottom sheet; booking rows are full-width stacked cards.
- `/profile/bookings`: single-column layout; `ProfileSideNav` becomes a horizontal pill nav at the top.
- Admin panels: `AdminAttendeeListPanel` inside slide-over stays 400px wide; on screens < 640px the panel goes full-width.

### Desktop (1024px+)

- `BookingConfirmModal` and `CancelBookingModal`: centered overlay, `max-w-md`.
- `MyBookingsDrawer`: right-side slide-over 400px wide; remainder of schedule visible.
- `/profile/bookings`: two-column layout — sidebar 260px + main content.
- `AdminAttendeeListPanel`: inside the existing 400px slide-over, tab switcher at top.

---

## Accessibility

- All booking/cancel buttons use explicit `aria-label` including class name: `aria-label="Book spot for Yoga Flow on Mon 21 Apr at 09:00"`.
- Disabled cancel button sets `aria-disabled="true"` and `title="Cancellation closes 2 hours before class start"` — not `disabled` attribute, so tooltip is accessible to keyboard users.
- Modals: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → modal title id, focus trap, `Escape` to close.
- Status chips: never rely on color alone — chip text (`Confirmed`, `Cancelled`) is always visible.
- `BookingToast`: `role="status"` (success), `role="alert"` (error); `aria-live="polite"` (success), `aria-live="assertive"` (error).
- `/profile/bookings`: `h1` for page heading, `h2` for Upcoming / Past section labels.
- Admin attendee list: `aria-label="Attendee list for {className} on {date}"` on the list container.
- Focus rings: `focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900` on all interactive elements.
- Touch targets: minimum 44x44px on all CTAs.

---

## Supersession Notes (from class-booking-cancellation.md)

The following changes from the superseded spec are intentional and must be applied in implementation:

| Old (superseded) | New (this spec) |
|-----------------|-----------------|
| 3-hour cancellation cutoff everywhere | 2-hour cutoff everywhere |
| `ALREADY_BOOKED` error state and UI block | Removed — duplicates allowed, no such state |
| `AdminBookForMemberPanel` admin on-behalf booking | Out of scope per PRD; removed from this design |
| Cancel-locked helper: "Cancellation closes 3 hours before class start." | "Cancellation closed — class starts in less than 2 hours." |
| `CancelBookingModal` policy line "three-hour cutoff" | "Cancellation closes 2 hours before class start." |
| `BookingSummaryBar` quick-peek only | Updated: footer link to `/profile/bookings` added |
| No `/profile/bookings` page | New page designed — sibling route under profile cabinet |
| No admin per-user history surface | New `AdminUserBookingHistoryPanel` designed |
| No admin attendee list surface | New `AdminAttendeeListPanel` tab in `ClassInstanceEditPanel` |
