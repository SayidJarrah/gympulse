# Design: User Membership Purchase

## Benchmark

Peloton membership activation flow — a compact confirmation modal summarises plan name, price, and duration before the user commits. No separate checkout page is needed for a single-step subscription. The modal pattern keeps context (the plan grid) visible behind the overlay. Chosen because the GymPulse plan purchase is similarly low-complexity and does not warrant a multi-step wizard.

## User Flows

### Flow 1 — User activates their first membership

1. User is logged in (USER role), currently has no active membership.
2. User navigates to `/plans` — sees the plan grid with an "Activate" button on each plan card (the button is hidden when the user already has an active membership).
3. User clicks "Activate" on a plan card.
4. `PurchaseConfirmModal` opens, showing the plan name, price, and duration. Two buttons: "Confirm" (primary) and "Cancel" (ghost).
5. User clicks "Confirm". Button enters loading state. API call `POST /api/v1/memberships` is made.
6. On success (201): modal closes, user is navigated to `/home?membershipBanner=activated#membership`. The `MembershipAccessSection` re-renders in the ACTIVE state and a success banner confirms the change. This aligns with `docs/design/user-access-flow.md` Decision 8.

### Flow 2 — User views their active membership

1. Logged-in user clicks "My Membership" in the navbar (or navigates to `/membership`).
2. Page fetches `GET /api/v1/memberships/me`.
3. While fetching: skeleton loader is shown.
4. On success: `MembershipStatusCard` is displayed with all membership details.

### Flow 3 — User cancels their membership

1. On `/membership`, user clicks "Cancel membership" on `MembershipStatusCard`.
2. `CancelMembershipModal` opens with a warning message that access will be lost immediately. Two buttons: "Cancel membership" (destructive) and "Keep membership" (ghost).
3. User clicks "Cancel membership". Button enters loading state. API call `DELETE /api/v1/memberships/me` is made.
4. On success (200): modal closes. The page re-fetches membership state. `MembershipStatusCard` disappears and the empty state ("No active membership") is shown with a "Browse plans" link.

### Flow 4 — User re-purchases after cancellation

1. User lands on `/membership`, sees the empty state (no active membership).
2. Clicks "Browse plans" — navigated to `/plans`.
3. Flow 1 repeats from step 3. `startDate` is always today.

### Flow 5 — User already has an active membership and tries to activate again

1. User navigates to `/plans` while having an active membership.
2. The "Activate" button is not rendered on any plan card (button is only shown when `activeMembership === null`). The user cannot trigger a duplicate purchase from the UI.
3. Edge case: if the user triggers `POST /api/v1/memberships` concurrently (race), the API returns 409 `MEMBERSHIP_ALREADY_ACTIVE`. The modal shows an inline error: "You already have an active membership. Please cancel it before activating a new one."

### Flow 6 — User attempts to activate an inactive plan

1. A plan is deactivated by an admin while the user has the `PurchaseConfirmModal` open.
2. User clicks "Confirm". API returns 422 `PLAN_NOT_AVAILABLE`.
3. Modal shows inline error: "This plan is no longer available for purchase." The modal stays open. The user can dismiss manually.

### Flow 7 — Unauthenticated user attempts to purchase

1. Guest visits `/plans`. No "Activate" button is rendered (buttons only appear for authenticated users with no active membership).
2. If a guest navigates directly to `/membership`, `AuthRoute` redirects them to `/login`.

### Flow 8 — Admin views all memberships

1. Admin navigates to `/admin/memberships` (admin dashboard section).
2. Page fetches `GET /api/v1/admin/memberships?page=0&size=20&sort=createdAt,desc`.
3. While fetching: table skeleton is shown.
4. On success: paginated table of all `UserMembership` records is displayed.
5. Admin can filter by status (ACTIVE / CANCELLED / EXPIRED) using a dropdown.
6. Admin can filter by a specific user ID using a text input.

### Flow 9 — Admin cancels a user's membership

1. Admin locates a membership row in the admin table (status ACTIVE).
2. Admin clicks the "Cancel" action button in the row.
3. A small confirmation modal appears: "Cancel this membership? The user will lose access immediately." Two buttons: "Confirm cancel" (destructive) and "Keep" (ghost).
4. Admin clicks "Confirm cancel". API call `DELETE /api/v1/admin/memberships/{membershipId}`.
5. On success: modal closes, table row status badge updates to CANCELLED.
6. On 409 `MEMBERSHIP_NOT_ACTIVE`: inline error in modal: "This membership is already cancelled or expired."

---

## Screens & Components

### Screen: My Membership (`/membership`)

Who sees it: USER (authenticated). Unauthenticated users are redirected to `/login` by `AuthRoute`.

Layout: Single-column centered content area. Page background `bg-[#0F0F0F]`. Inner content constrained to `max-w-2xl mx-auto px-4 py-12`.

#### PageHeader

- Text: "My Membership"
- Tailwind structure: `mb-8`
- Page heading: `text-3xl font-bold leading-tight text-white`
- Subheading: `mt-1 text-base text-gray-400`; copy: "Manage your active subscription."

#### MembershipStatusCard (populated state)

- Who sees it: USER with an active membership.
- Data shown (from `GET /api/v1/memberships/me`): `planName`, `status`, `startDate`, `endDate`, `bookingsUsedThisMonth`, `maxBookingsPerMonth`.
- User actions: click "Cancel membership" to open `CancelMembershipModal`.
- Tailwind structure:

```
<div class="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-md shadow-black/50">
  <!-- Header row: plan name + status badge -->
  <div class="flex items-start justify-between gap-4">
    <h2 class="text-2xl font-bold leading-tight text-white">{planName}</h2>
    <MembershipStatusBadge status={status} />
  </div>

  <!-- Date range -->
  <div class="mt-4 grid grid-cols-2 gap-4">
    <div>
      <p class="text-xs font-semibold uppercase tracking-wider text-gray-400">Start date</p>
      <p class="mt-1 text-base font-medium text-white">{startDate formatted as "23 Mar 2026"}</p>
    </div>
    <div>
      <p class="text-xs font-semibold uppercase tracking-wider text-gray-400">End date</p>
      <p class="mt-1 text-base font-medium text-white">{endDate formatted as "22 Apr 2026"}</p>
    </div>
  </div>

  <!-- Bookings usage bar -->
  <div class="mt-6">
    <div class="flex items-center justify-between mb-1.5">
      <p class="text-sm font-medium text-gray-300">Bookings this month</p>
      <p class="text-sm font-medium text-white">{bookingsUsedThisMonth} / {maxBookingsPerMonth}</p>
    </div>
    <!-- Progress bar -->
    <div class="h-2 w-full overflow-hidden rounded-full bg-gray-800">
      <div
        class="h-full rounded-full bg-green-500 transition-all duration-300"
        style={{ width: `${(bookingsUsedThisMonth / maxBookingsPerMonth) * 100}%` }}
      />
    </div>
  </div>

  <!-- Footer: cancel action -->
  <div class="mt-6 flex justify-end border-t border-gray-800 pt-4">
    <button class="... destructive ghost variant ...">Cancel membership</button>
  </div>
</div>
```

"Cancel membership" button: ghost variant with red text to signal destructive intent without full destructive button weight. Classes: `inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-red-400 transition-colors duration-200 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900`.

#### MembershipStatusCard (skeleton / loading state)

Shown while `GET /api/v1/memberships/me` is in flight.

```
<div class="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-md shadow-black/50 animate-pulse">
  <div class="flex items-start justify-between gap-4">
    <div class="h-7 w-48 rounded-md bg-gray-800" />
    <div class="h-5 w-16 rounded-full bg-gray-800" />
  </div>
  <div class="mt-4 grid grid-cols-2 gap-4">
    <div class="space-y-2">
      <div class="h-3 w-20 rounded bg-gray-800" />
      <div class="h-5 w-32 rounded bg-gray-800" />
    </div>
    <div class="space-y-2">
      <div class="h-3 w-20 rounded bg-gray-800" />
      <div class="h-5 w-32 rounded bg-gray-800" />
    </div>
  </div>
  <div class="mt-6 space-y-2">
    <div class="h-3 w-40 rounded bg-gray-800" />
    <div class="h-2 w-full rounded-full bg-gray-800" />
  </div>
</div>
```

#### EmptyMembershipState (no active membership)

Shown when `GET /api/v1/memberships/me` returns 404 `NO_ACTIVE_MEMBERSHIP`.

```
<div class="flex flex-col items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 py-16 px-6 text-center">
  <!-- Icon container -->
  <div class="flex h-14 w-14 items-center justify-center rounded-full bg-gray-800">
    <CreditCardIcon class="h-7 w-7 text-gray-500" />
  </div>
  <div>
    <p class="text-lg font-semibold text-white">No active membership</p>
    <p class="mt-1 text-sm text-gray-400">
      You do not have an active membership. Browse our plans to get started.
    </p>
  </div>
  <!-- Link to /plans -->
  <a
    href="/plans"
    class="inline-flex items-center justify-center gap-2 rounded-md bg-green-500 px-6 py-3 text-base font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
  >
    Browse plans
  </a>
</div>
```

#### GeneralErrorState

Shown when `GET /api/v1/memberships/me` fails with any error other than `NO_ACTIVE_MEMBERSHIP`.

```
<div class="flex flex-col items-center gap-4 rounded-xl border border-red-500/30 bg-red-500/10 py-12 px-6 text-center">
  <ExclamationTriangleIcon class="h-8 w-8 text-red-400" />
  <p class="text-base font-semibold text-white">Something went wrong</p>
  <p class="text-sm text-gray-400">Unable to load your membership. Please try again.</p>
  <button class="... secondary variant ...">Retry</button>
</div>
```

---

### Screen: Plans (`/plans`) — modifications only

Who sees it: Guest / USER / ADMIN (already exists; modifications are additive).

This screen already exists. The design change is the conditional "Activate" button on each `PlanCard`.

#### PlanCard — "Activate" button (additive change)

- Shown only when: user is authenticated AND `activeMembership === null`.
- When the user has an active membership, the button is not rendered and the existing "Get Started" CTA that links to `/register` remains unchanged for guests.
- Button: Primary variant, full-width, inside the card footer.
- Label: "Activate"
- On click: opens `PurchaseConfirmModal` for that plan.

```
{/* Conditional footer added to existing PlanCard */}
{onActivate && (
  <button
    type="button"
    onClick={onActivate}
    class="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 active:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
  >
    Activate
  </button>
)}
```

---

### Screen: Admin Memberships (`/admin/memberships`)

Who sees it: ADMIN only. Non-admin access is blocked by `AdminRoute` (403 redirect).

Layout: Admin dashboard layout with sidebar (component 6H from design system). Main content area uses `<main>` with `flex-1 overflow-y-auto bg-[#0F0F0F] p-8`.

#### AdminPageHeader

```
<div class="mb-6 flex items-center justify-between">
  <div>
    <h1 class="text-3xl font-bold leading-tight text-white">Memberships</h1>
    <p class="mt-1 text-base text-gray-400">All user subscriptions across the platform.</p>
  </div>
  <!-- totalElements badge -->
  <span class="inline-flex items-center rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-sm font-medium text-gray-300">
    {totalElements} total
  </span>
</div>
```

#### AdminMembershipsFilterBar

Sits above the table. Filters are applied on change (debounced 300ms for the userId input).

```
<div class="mb-4 flex flex-wrap items-center gap-3">
  <!-- Status filter dropdown -->
  <div class="flex flex-col gap-1">
    <label for="status-filter" class="text-xs font-semibold uppercase tracking-wider text-gray-400">Status</label>
    <select
      id="status-filter"
      class="rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
    >
      <option value="">All</option>
      <option value="ACTIVE">Active</option>
      <option value="CANCELLED">Cancelled</option>
      <option value="EXPIRED">Expired</option>
    </select>
  </div>

  <!-- User ID filter input -->
  <div class="flex flex-col gap-1">
    <label for="user-id-filter" class="text-xs font-semibold uppercase tracking-wider text-gray-400">User ID</label>
    <input
      id="user-id-filter"
      type="text"
      placeholder="Paste user UUID..."
      class="w-72 rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-transparent"
    />
  </div>
</div>
```

#### AdminMembershipsTable

Follows the Table component pattern (6F in design system).

Columns:

| Column | Data field | Mobile visibility |
|--------|-----------|-------------------|
| User ID | `userId` (truncated: first 8 chars + "...") | Hidden on mobile (`hidden sm:table-cell`) |
| Plan | `planName` | Always visible |
| Status | `status` (via `MembershipStatusBadge`) | Always visible |
| Start date | `startDate` formatted as "23 Mar 2026" | Hidden on mobile |
| End date | `endDate` formatted as "22 Apr 2026" | Hidden on mobile |
| Bookings | `bookingsUsedThisMonth` / `maxBookingsPerMonth` | Hidden on mobile |
| Actions | Cancel button | Always visible |

"Cancel" action button in each row: visible only when `membership.status === 'ACTIVE'`. For CANCELLED or EXPIRED rows, the actions cell is empty.

```
<td class="px-4 py-3 text-right">
  {membership.status === 'ACTIVE' && (
    <button
      type="button"
      onClick={() => openAdminCancelModal(membership)}
      class="rounded-md px-3 py-1.5 text-xs font-medium text-red-400 transition-colors duration-150 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
    >
      Cancel
    </button>
  )}
</td>
```

Empty state (no rows): use the Table empty state pattern with `CreditCardIcon` and message "No memberships found" / "Try adjusting the filters."

#### AdminMembershipsTable (skeleton / loading)

Show 5 skeleton rows while the fetch is in flight.

```
{/* Skeleton row — repeated 5 times */}
<tr class="border-t border-gray-800 animate-pulse">
  <td class="hidden px-4 py-3 sm:table-cell"><div class="h-4 w-24 rounded bg-gray-800" /></td>
  <td class="px-4 py-3"><div class="h-4 w-32 rounded bg-gray-800" /></td>
  <td class="px-4 py-3"><div class="h-5 w-16 rounded-full bg-gray-800" /></td>
  <td class="hidden px-4 py-3 sm:table-cell"><div class="h-4 w-24 rounded bg-gray-800" /></td>
  <td class="hidden px-4 py-3 sm:table-cell"><div class="h-4 w-24 rounded bg-gray-800" /></td>
  <td class="hidden px-4 py-3 sm:table-cell"><div class="h-4 w-16 rounded bg-gray-800" /></td>
  <td class="px-4 py-3 text-right"><div class="ml-auto h-6 w-14 rounded bg-gray-800" /></td>
</tr>
```

#### PaginationControls

Sits below the table.

```
<div class="mt-4 flex items-center justify-between">
  <p class="text-sm text-gray-400">
    Showing {page * size + 1}–{Math.min((page + 1) * size, totalElements)} of {totalElements}
  </p>
  <div class="flex items-center gap-2">
    <button
      type="button"
      disabled={page === 0}
      class="rounded-md border border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors duration-150 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
    >
      Previous
    </button>
    <span class="text-sm text-gray-400">Page {page + 1} of {totalPages}</span>
    <button
      type="button"
      disabled={page >= totalPages - 1}
      class="rounded-md border border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors duration-150 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
    >
      Next
    </button>
  </div>
</div>
```

---

## Shared Components

### MembershipStatusBadge

Props: `status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED'`

| Status | Classes |
|--------|---------|
| ACTIVE | `inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-medium leading-tight text-green-400` |
| CANCELLED | `inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium leading-tight text-red-400` |
| EXPIRED | `inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-800 px-2 py-0.5 text-xs font-medium leading-tight text-gray-400` |

Add `aria-label` matching the status text so screen readers announce the badge value (e.g. `aria-label="Status: Active"`).

---

### PurchaseConfirmModal

Props: `plan: MembershipPlan, onConfirm: () => Promise<void>, onCancel: () => void, isLoading: boolean`

Size: `max-w-sm` (confirmation dialog — small).

Structure follows Modal (6E):

- **Header:** "Activate plan?" with close button (X).
- **Body:**
  - Plan name: `text-lg font-semibold text-white`
  - Price: `text-2xl font-bold text-green-400` (e.g. "$49")
  - Duration: `text-sm text-gray-400` (e.g. "30-day membership")
  - Separator `border-t border-gray-800 my-4`
  - Explainer copy (sm, gray-400): "Your membership starts today. You can cancel at any time."
  - Inline error zone (conditionally rendered): `mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400` — shown when the API call fails with a user-facing message.
- **Footer:**
  - Left: Ghost "Cancel" button (calls `onCancel`).
  - Right: Primary "Confirm" button. When `isLoading`: disabled, shows spinner + "Activating..." label.

```
{/* Modal body content */}
<div class="px-6 py-6">
  <div class="flex items-start justify-between">
    <div>
      <p class="text-lg font-semibold text-white">{plan.name}</p>
      <p class="mt-0.5 text-sm text-gray-400">{plan.durationDays}-day membership</p>
    </div>
    <p class="text-2xl font-bold text-green-400">${plan.price}</p>
  </div>
  <div class="my-4 border-t border-gray-800" />
  <p class="text-sm text-gray-400">
    Your membership starts today. You can cancel at any time.
  </p>
  {error && (
    <div
      role="alert"
      aria-live="polite"
      class="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
    >
      {error}
    </div>
  )}
</div>
```

---

### CancelMembershipModal

Props: `membership: UserMembership, onConfirm: () => Promise<void>, onCancel: () => void, isLoading: boolean`

Size: `max-w-sm`.

- **Header:** "Cancel membership?" with close button (X).
- **Body:**
  - Warning copy (sm, gray-400): "You will immediately lose access to class bookings. You can re-activate a new plan at any time."
  - Plan name and end date shown as context: `text-sm text-gray-400`
  - Inline error zone (conditionally rendered, same pattern as `PurchaseConfirmModal`).
- **Footer:**
  - Left: Ghost "Keep membership" button (calls `onCancel`).
  - Right: Destructive "Cancel membership" button. When `isLoading`: disabled, spinner + "Cancelling...".

---

### AdminCancelMembershipModal

Props: `membership: UserMembership, onConfirm: () => Promise<void>, onCancel: () => void, isLoading: boolean`

Size: `max-w-sm`.

- **Header:** "Cancel this membership?"
- **Body:** "The user will lose access immediately. This action cannot be undone." Plan name and user ID (truncated) shown as context.
- **Footer:** Ghost "Keep" button + Destructive "Confirm cancel" button with loading state.

---

## Component States

| Component | Loading | Empty | Error | Populated |
|-----------|---------|-------|-------|-----------|
| MembershipStatusCard | Pulse skeleton with 3 shimmer rows | — | — | Plan name, badge, dates, bookings bar, cancel button |
| EmptyMembershipState | — | "No active membership" + "Browse plans" CTA | — | — |
| GeneralErrorState | — | — | "Something went wrong" + Retry button | — |
| PurchaseConfirmModal | Spinner on Confirm button, disabled state | — | Inline red alert below explainer copy | Plan name, price, duration, explainer |
| CancelMembershipModal | Spinner on Cancel button, disabled state | — | Inline red alert | Warning copy, plan context |
| AdminCancelMembershipModal | Spinner on Confirm button, disabled state | — | Inline red alert | Warning copy, plan + user context |
| AdminMembershipsTable | 5 skeleton rows (pulse) | Empty state with CreditCardIcon | — | Paginated rows with badges and action buttons |
| MembershipStatusBadge | — | — | — | Coloured pill badge per status |
| PaginationControls | — | — | — | Previous / Next buttons + page indicator |

---

## Error Code to UI Message

| Error Code | Message shown to user | Location |
|-----------|----------------------|----------|
| `MEMBERSHIP_ALREADY_ACTIVE` | "You already have an active membership. Please cancel it before activating a new one." | Inline alert in `PurchaseConfirmModal` |
| `NO_ACTIVE_MEMBERSHIP` | "You do not have an active membership." | Renders `EmptyMembershipState` on `/membership`; inline alert in `CancelMembershipModal` if triggered |
| `PLAN_NOT_FOUND` | "This plan could not be found." | Inline alert in `PurchaseConfirmModal` |
| `PLAN_NOT_AVAILABLE` | "This plan is no longer available for purchase." | Inline alert in `PurchaseConfirmModal` |
| `INVALID_PLAN_ID` | "A valid plan must be selected." | Inline alert in `PurchaseConfirmModal` |
| `MEMBERSHIP_NOT_FOUND` | "This membership record could not be found." | Inline alert in `AdminCancelMembershipModal` |
| `MEMBERSHIP_NOT_ACTIVE` | "This membership is already cancelled or expired." | Inline alert in `AdminCancelMembershipModal` |
| `INVALID_STATUS_FILTER` | "Invalid status filter. Use ACTIVE, CANCELLED, or EXPIRED." | Inline alert below `AdminMembershipsFilterBar` |
| `ACCESS_DENIED` | "You do not have permission to perform this action." | Page-level error on `/admin/memberships` (non-admin user somehow bypasses `AdminRoute`) |
| Generic / network error | "Something went wrong. Please try again." | Modal inline alert or `GeneralErrorState` on page |

All inline alerts use `role="alert"` and `aria-live="polite"` so screen readers announce the message without requiring focus.

---

## Responsive Behaviour

### `/membership` (My Membership)

- Mobile: Single-column layout, full-width card, `px-4 py-8`. Date grid collapses to 2 columns (already the minimum — no change needed). Cancel button is full-width on mobile: add `sm:w-auto w-full justify-center`.
- Desktop: Content constrained to `max-w-2xl mx-auto`, centered on page.

### `/plans` (Plan grid — existing screen)

- Mobile: Existing responsive grid. "Activate" button is full-width within the card, same as any other card CTA.
- Desktop: Existing grid layout unchanged.

### `/admin/memberships`

- Mobile (below `sm`): Table hides User ID, Start date, End date, Bookings columns via `hidden sm:table-cell`. Plan, Status, and Actions columns remain visible. Filter bar wraps to two rows (`flex-wrap`). Pagination controls stack: "Previous / Next" buttons remain side by side.
- Desktop (`sm` and above): Full table with all columns. Filter bar in a single row.

### Modals

- All modals use `px-4` on the overlay, ensuring side margins on small screens. Modal box is `w-full max-w-sm`, so it never exceeds the viewport width minus 32px of padding.

---

## Accessibility

- All form controls in `AdminMembershipsFilterBar` have visible `<label>` elements.
- `MembershipStatusBadge` carries `aria-label="Status: {status}"` so status is announced by screen readers without relying on color alone.
- Modals use `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the modal heading id.
- Focus is trapped inside modals while open; on close, focus returns to the trigger element.
- Modals close on Escape key press and on overlay click.
- Inline error messages in modals use `role="alert"` and `aria-live="polite"`.
- Loading buttons set `disabled` and the spinner SVG carries `aria-hidden="true"` — the button text ("Activating...", "Cancelling...") provides the accessible label.
- Bookings progress bar: add `role="progressbar"`, `aria-valuenow={bookingsUsedThisMonth}`, `aria-valuemin={0}`, `aria-valuemax={maxBookingsPerMonth}`, `aria-label="Bookings used this month"`.
- All interactive elements have `focus-visible:ring-2 focus-visible:ring-green-500` focus rings. The admin "Cancel" row button uses `focus-visible:ring-red-500` to match its destructive intent.
- Error states do not rely on color alone: each error message includes descriptive text in addition to red coloring.
- Touch targets: all buttons meet the 44x44px minimum. Row action buttons use `px-3 py-1.5` at `text-xs`, which at 12px line height gives approximately 36px height — pad to `py-2` if needed to reach 40px minimum or ensure the row height compensates.
- The `CreditCardIcon` in empty states is `aria-hidden="true"`; the accompanying text communicates the empty state message.
