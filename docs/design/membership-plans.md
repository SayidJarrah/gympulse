# Design: Membership Plans

## Benchmark

Peloton membership page — pricing cards are presented in a clean equal-height grid near the top of the page, each card shows price, duration, and one differentiating feature. A single prominent CTA per card removes comparison paralysis. Chosen because it lets the user evaluate and commit without needing a separate detail page for straightforward plans.

## User Flows

### Flow 1 — Guest browses and views a plan
1. Guest visits `/plans` — sees a paginated grid of active plan cards (no auth required).
2. Guest clicks a `PlanCard` — navigates to `/plans/:id` showing full plan details.
3. Guest clicks "Get Started" CTA on detail page — redirected to `/register` (purchase flow is out of scope for this feature).
4. If the guest manually visits `/plans/:id` for an inactive or non-existent plan ID, they see the "Plan not found" empty state.

### Flow 2 — Authenticated user browses plans
Identical to Flow 1. The navbar shows the authenticated state (avatar, notification bell) but read access to plans is unchanged.

### Flow 3 — Admin creates a plan
1. Admin navigates to `/admin/plans` via the sidebar ("Plans" nav item).
2. Admin sees the full catalogue table (active and inactive).
3. Admin clicks "New Plan" (primary button, top-right of page header).
4. A modal opens containing `PlanForm` in create mode.
5. Admin fills in Name, Description, Price, Duration. Fields validate inline on blur.
6. Admin clicks "Save Plan" — button enters loading state (spinner, disabled).
7. On success: modal closes, new plan row appears at the top of the table with an ACTIVE badge. A success toast appears.
8. On validation error (400): field-level error messages appear below the relevant inputs. Button returns to enabled state.
9. Admin clicks "Cancel" or presses Escape or clicks the overlay — modal closes with no changes saved.

### Flow 4 — Admin edits a plan
1. Admin is on `/admin/plans`. Locates the target plan row.
2. Admin clicks "Edit" in the row's actions cell.
3. A modal opens containing `PlanForm` in edit mode, pre-populated with the plan's current values.
4. Admin changes one or more fields and clicks "Save Plan".
5. On success: modal closes, row updates in place. A success toast appears.
6. On 409 `PLAN_HAS_ACTIVE_SUBSCRIBERS`: inline banner inside the modal displays "Cannot change the price while members are subscribed to this plan." Price field is highlighted with an error border. Button returns to enabled state.
7. On 409 `PLAN_EDIT_CONFLICT`: inline banner displays "Another admin updated this plan at the same time. Please reload and try again." Modal remains open.
8. All other validation errors (400) behave as in Flow 3, step 8.

### Flow 5 — Admin deactivates a plan
1. Admin is on `/admin/plans`. Locates an ACTIVE plan row.
2. Admin clicks the "Deactivate" action in `PlanActionsMenu`.
3. A confirmation modal (sm size) appears: "Deactivate [Plan Name]?" with a note that existing subscribers are unaffected.
4. Admin clicks "Deactivate" (destructive button).
5. On success: confirmation modal closes, plan row badge updates from ACTIVE to INACTIVE. A success toast appears. The "Deactivate" action in the row changes to "Activate".
6. On 409 `PLAN_ALREADY_INACTIVE`: confirmation modal shows inline error "This plan is already inactive." Dismiss button remains visible.

### Flow 6 — Admin reactivates a plan
1. Admin is on `/admin/plans`. Locates an INACTIVE plan row.
2. Admin clicks "Activate" in `PlanActionsMenu`.
3. A confirmation modal (sm size) appears: "Reactivate [Plan Name]?"
4. Admin clicks "Activate" (primary button).
5. On success: plan row badge updates from INACTIVE to ACTIVE. A success toast appears.
6. On 409 `PLAN_ALREADY_ACTIVE`: inline error "This plan is already active." inside the confirmation modal.

### Flow 7 — Admin filters the plan list by status
1. Admin is on `/admin/plans`. A segmented filter control is displayed above the table.
2. Tabs: "All" (default) | "Active" | "Inactive".
3. Admin clicks "Inactive" — table reloads showing only inactive plans. URL updates with `?status=INACTIVE`.
4. Admin clicks "All" — filter is cleared. URL updates to remove the status param.

---

## Screens & Components

### Screen: Plans Catalogue (/plans)
Who sees it: Guest / USER

Layout: Full-width page. `bg-[#0F0F0F]` page background. Sticky navbar at top. Content centered in `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`. Page heading + description above a responsive plan card grid. Pagination controls below the grid.

The page renders in two header variants depending on user state:
- **Public header** (`PageHeader`) — shown to guests and unauthenticated visitors.
- **Authenticated header** (`PlansContextHeader`) — shown to authenticated users with no active membership.

Active members are never shown this page — they are redirected to `/home?membershipBanner=already-active#membership` before the page body renders.

#### PageHeader (guest variant)
- Shown when: visitor is a guest or unauthenticated.
- Data shown: Static heading "Membership Plans", subheading "Choose the plan that fits your goals."
- User actions: None (read only)
- Tailwind structure:
  ```
  <div className="pt-4 pb-4">
    <h1 className="text-3xl font-bold leading-tight text-white">Membership Plans</h1>
    <p className="mt-2 text-base font-normal leading-normal text-gray-400">
      Choose the plan that fits your goals.
    </p>
  </div>
  ```

#### PlansContextHeader (authenticated no-membership variant)
- Shown when: visitor is authenticated as USER with no active membership.
- Component: `src/components/plans/PlansContextHeader.tsx`
- Purpose: frames the page as a prerequisite purchase step, not a general browsing experience.
- Data shown:
  - "Back to Home" link — navigates to `/home#membership` via `buildHomeMembershipPath()`.
  - Section label: "MEMBERSHIP ACCESS" (uppercase, `tracking-[0.18em]`, `text-gray-400`).
  - Heading: "Choose the plan that unlocks your booking access".
  - Subheading: "Compare all current options, then continue into the existing purchase flow."
  - "No active membership" orange badge (`text-orange-300`, orange border and background).
- User actions: "Back to Home" link only.
- Tailwind surface: `rounded-[28px] border border-gray-800 bg-gray-900 p-6 shadow-xl shadow-black/30`.

#### PlanGrid
- Data shown: Paginated array of `MembershipPlan` objects (`content` from API). `totalElements` shown as a muted count ("5 plans available").
- User actions: Click a card to navigate to `/plans/:id`.
- Tailwind structure:
  ```
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {plans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
  </div>
  ```
- Empty state: centered illustration + text "No plans available" + muted subtext "Check back later for available membership options." (no icon button — this is a read-only page).
- Error state: centered text "Failed to load plans." + secondary button "Try again" that re-triggers the fetch.

#### PlanCard
- Component: `src/components/plans/PlanCard.tsx`
- Data shown: `name`, `description` (truncated to 2 lines with `line-clamp-2`), `priceInCents` (formatted as dollars: `$29.99`), `durationDays` (formatted as "30 days" or "1 year" for 365).
- User actions: Entire card is a link to `/plans/:id` (via absolute-positioned `<Link>`).

**`highlighted` prop** (`boolean`, default `false`):

When `true`, indicates this plan was linked from another surface (e.g. home page) with
`/plans?highlight={planId}`. Visual treatment:
- Card border: `border-green-500/50` (instead of `border-gray-800`).
- Card background: `bg-green-500/10` (instead of `bg-gray-900`).
- A "Highlighted on Home" label badge appears above the plan name (`text-green-300`, green border/bg).
- Cards with `highlighted={false}` are unaffected.

**`ctaMode` prop** (`'register' | 'details'`, default `'register'`):

Controls which call-to-action button appears at the bottom of the card.

| Mode | CTA shown | Navigation target | When used |
|------|-----------|-------------------|-----------|
| `'register'` | "Get Started" button | `/register` | Guests / public visitors |
| `'details'` | "View details" link | `/plans/:id` | Authenticated users with no active membership |

`PlansPage` sets `ctaMode` based on the access gate mode:
- `accessGate.mode === 'authenticated'` → `ctaMode='details'`
- All other modes → `ctaMode='register'` (default)

**`onActivate` handler** (`() => void`, optional):

When provided (only when `accessGate.canPurchase === true`), the card renders an
"Activate" button instead of the `ctaMode` CTA. Clicking it opens `PurchaseConfirmModal`
for the plan. The `onActivate` handler takes precedence over `ctaMode`.
- Tailwind structure:
  ```
  <a
    href={`/plans/${plan.id}`}
    className="group flex flex-col rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-md shadow-black/50 transition-all duration-200 hover:border-gray-600 hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F0F]"
  >
    <div className="flex items-start justify-between">
      <h3 className="text-lg font-semibold leading-tight text-white">{plan.name}</h3>
      <span className="ml-4 flex-shrink-0 text-2xl font-bold text-green-400">
        {formatPrice(plan.priceInCents)}
      </span>
    </div>
    <p className="mt-2 line-clamp-2 text-sm font-normal leading-normal text-gray-400">
      {plan.description}
    </p>
    <p className="mt-3 text-xs font-medium text-gray-500">
      {formatDuration(plan.durationDays)}
    </p>
    <button
      className="mt-6 w-full rounded-md bg-green-500 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
    >
      Get Started
    </button>
  </a>
  ```

#### PlanCard skeleton (loading state)
- Three skeleton cards rendered while API call is in flight.
- Tailwind structure:
  ```
  <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="h-5 w-32 rounded bg-gray-800" />
      <div className="h-7 w-16 rounded bg-gray-800" />
    </div>
    <div className="mt-3 h-4 w-full rounded bg-gray-800" />
    <div className="mt-2 h-4 w-3/4 rounded bg-gray-800" />
    <div className="mt-3 h-3 w-20 rounded bg-gray-800" />
    <div className="mt-6 h-9 w-full rounded-md bg-gray-800" />
  </div>
  ```

#### PaginationControls
- Data shown: Current page number, total pages (derived from `totalPages`). Previous/Next buttons. Disabled when on first/last page respectively.
- User actions: Click Previous / Next to change page, triggering a new API call.
- Tailwind structure:
  ```
  <div className="mt-10 flex items-center justify-between">
    <p className="text-sm text-gray-400">
      Page {currentPage + 1} of {totalPages}
    </p>
    <div className="flex gap-3">
      <button
        disabled={currentPage === 0}
        className="rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-600"
      >
        Previous
      </button>
      <button
        disabled={currentPage >= totalPages - 1}
        className="rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-all duration-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  </div>
  ```

Note: Both `Previous` and `Next` use the same Ghost/bordered style. Do not make `Next` a primary green button — primary green is reserved for form submission and high-emphasis CTAs. Pagination is a navigation control, not a call to action.

---

### Screen: Plan Detail (/plans/:id)
Who sees it: Guest / USER (inactive plans return 404 — guests see the not-found state)

Layout: Full-width page. `bg-[#0F0F0F]`. Sticky navbar. Content centered in `max-w-2xl mx-auto px-4 sm:px-6 lg:px-8`. Back link above the detail card.

#### PlanDetailCard
- Data shown: `name`, `description` (full text, `leading-relaxed`), `priceInCents` (formatted), `durationDays` (formatted). `createdAt` displayed as "Available since {month year}" in caption size.
- User actions: "Get Started" primary button (lg size) navigates to `/register`. "Back to Plans" ghost link at top navigates to `/plans`.
- Tailwind structure:
  ```
  <div>
    <a href="/plans" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-green-400 hover:text-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:rounded-sm">
      <ChevronLeftIcon className="h-4 w-4" />
      Back to Plans
    </a>
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 shadow-md shadow-black/50">
      <div className="flex items-start justify-between">
        <h1 className="text-3xl font-bold leading-tight text-white">{plan.name}</h1>
        <span className="ml-6 flex-shrink-0 text-4xl font-bold text-green-400">
          {formatPrice(plan.priceInCents)}
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-gray-500">{formatDuration(plan.durationDays)}</p>
      <p className="mt-6 text-base font-normal leading-relaxed text-white">{plan.description}</p>
      <p className="mt-6 text-xs text-gray-600">
        Available since {formatMonthYear(plan.createdAt)}
      </p>
      <button className="mt-8 w-full rounded-md bg-green-500 px-6 py-3 text-base font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900">
        Get Started
      </button>
    </div>
  </div>
  ```

#### PlanDetailNotFound (404 state)
- Shown when the API returns 404 for the plan ID.
- Tailwind structure:
  ```
  <div className="flex flex-col items-center gap-4 py-24 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
      <ExclamationCircleIcon className="h-8 w-8 text-gray-500" />
    </div>
    <h2 className="text-xl font-semibold text-white">Plan not found</h2>
    <p className="text-sm text-gray-400">This plan could not be found or is no longer available.</p>
    <a href="/plans" className="mt-2 inline-flex items-center justify-center rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 hover:bg-green-500/10 transition-all duration-200">
      Browse all plans
    </a>
  </div>
  ```

#### PlanDetailSkeleton (loading state)
- Single card with skeleton elements mirroring the detail card layout.
- `animate-pulse` on wrapper, gray-800 rectangles for heading, price, description lines.

---

### Screen: Admin Plans Management (/admin/plans)
Who sees it: ADMIN only (non-admin users are redirected to `/plans` by the client-side route guard)

Layout: Two-column admin shell. Left: `Sidebar` (from design system 6H). Right: `main` content area with `bg-[#0F0F0F] flex-1 overflow-y-auto`. Content area uses `max-w-7xl mx-auto px-6 py-8`.

#### AdminPageHeader
- Data shown: Page title "Membership Plans". Plan count as muted caption ("12 plans total").
- User actions: "New Plan" primary button (md size) opens the `PlanFormModal` in create mode.
- Tailwind structure:
  ```
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-3xl font-bold leading-tight text-white">Membership Plans</h1>
      <p className="mt-1 text-sm text-gray-400">{totalElements} plans total</p>
    </div>
    <button
      onClick={openCreateModal}
      className="inline-flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
    >
      <PlusIcon className="h-4 w-4" />
      New Plan
    </button>
  </div>
  ```

#### StatusFilterTabs
- Data shown: Tab options "All", "Active", "Inactive". Active tab is visually distinct.
- User actions: Click a tab to filter the plan list. Updates URL query param `?status=ACTIVE|INACTIVE` or removes the param for "All".
- Tailwind structure:
  ```
  <div className="mt-6 flex gap-1 rounded-lg border border-gray-800 bg-gray-900 p-1 w-fit">
    {['All', 'Active', 'Inactive'].map(tab => (
      <button
        key={tab}
        onClick={() => setFilter(tab)}
        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
          activeFilter === tab
            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        {tab}
      </button>
    ))}
  </div>
  ```

#### AdminPlansTable
- Data shown: All plans (filtered by status tab). Columns: Plan Name, Price, Duration, Status, Created, Actions.
- User actions: Sort by column headers. Click "Edit" in actions cell. Click "Deactivate" or "Activate" in actions cell.
- Tailwind structure (follows design system 6F Table pattern):
  ```
  <div className="mt-6 overflow-hidden rounded-xl border border-gray-800 bg-[#0F0F0F]">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-900">
          <tr>
            <th scope="col" className="border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Plan Name</th>
            <th scope="col" className="border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Price</th>
            <th scope="col" className="hidden border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 sm:table-cell">Duration</th>
            <th scope="col" className="border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
            <th scope="col" className="hidden border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 lg:table-cell">Created</th>
            <th scope="col" className="border-b border-gray-800 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {plans.map(plan => (
            <tr key={plan.id} className="border-t border-gray-800 transition-colors duration-100 hover:bg-gray-900 last:border-0">
              <td className="px-4 py-3 font-medium text-white">{plan.name}</td>
              <td className="px-4 py-3 text-white">{formatPrice(plan.priceInCents)}</td>
              <td className="hidden px-4 py-3 text-gray-400 sm:table-cell">{formatDuration(plan.durationDays)}</td>
              <td className="px-4 py-3"><PlanStatusBadge status={plan.status} /></td>
              <td className="hidden px-4 py-3 text-gray-400 lg:table-cell">{formatDate(plan.createdAt)}</td>
              <td className="px-4 py-3 text-right"><PlanActionsMenu plan={plan} onEdit={openEditModal} onToggleStatus={openStatusModal} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  ```
- Empty state (no plans match filter): follows the design system 6F empty state pattern with "No plans found" heading and "Adjust the filter or create a new plan." subtext.
- Loading state: 5 skeleton rows with `animate-pulse` gray-800 rectangles in each cell.

#### PlanStatusBadge
- Data shown: `status` value (`ACTIVE` or `INACTIVE`).
- User actions: None (display only).
- Variants:
  - ACTIVE: success badge — `inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-medium leading-tight text-green-400`
  - INACTIVE: neutral badge — `inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-800 px-2 py-0.5 text-xs font-medium leading-tight text-gray-400`
- Accessibility: `aria-label="Status: Active"` / `aria-label="Status: Inactive"` on the `<span>`.

#### PlanActionsMenu
- Data shown: Edit button, and either Deactivate or Activate button depending on plan status.
- User actions: "Edit" — calls `onEdit(plan)`. "Deactivate" / "Activate" — calls `onToggleStatus(plan)`.
- Tailwind structure:
  ```
  <div className="inline-flex items-center gap-1">
    <button
      type="button"
      onClick={() => onEdit(plan)}
      className="rounded-md px-2 py-1 text-xs font-medium text-green-400 transition-colors duration-150 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
    >
      Edit
    </button>
    {plan.status === 'ACTIVE' ? (
      <button
        type="button"
        onClick={() => onToggleStatus(plan)}
        className="rounded-md px-2 py-1 text-xs font-medium text-orange-400 transition-colors duration-150 hover:bg-orange-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      >
        Deactivate
      </button>
    ) : (
      <button
        type="button"
        onClick={() => onToggleStatus(plan)}
        className="rounded-md border border-green-500 px-2 py-1 text-xs font-medium text-green-400 transition-colors duration-150 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        Activate
      </button>
    )}
  </div>
  ```

#### PlanFormModal
- Rendered as a Modal (design system 6E, md size: `max-w-lg`) containing `PlanForm`.
- Title: "New Plan" (create mode) or "Edit Plan" (edit mode).
- Footer: Ghost "Cancel" button + Primary "Save Plan" button (loading state on submit).
- Pre-populates all fields when `initialValues` is provided (edit mode).
- On close: form state is reset.

#### PlanForm
- Data shown: Form fields bound to `MembershipPlanRequest` shape.
- User actions: Fill and blur each field to trigger inline validation. Submit via footer button.
- Fields (in order):
  1. **Plan Name** — text input, required. Placeholder: "e.g. Monthly Basic". Error: "Plan name must not be blank."
  2. **Description** — `<textarea>` (3 rows), required. Placeholder: "Describe what is included in this plan." Error: "Description must not be blank."
  3. **Price** — number input, required, min 1. Label: "Price (in cents)". Helper text: "Enter the price in cents — e.g. 2999 for $29.99." Error: "Price must be greater than zero."
  4. **Duration** — number input, required, min 1. Label: "Duration (days)". Helper text: "Number of days the membership is valid." Error: "Duration must be at least one day."
- Inline error banner (above the footer, inside the modal body): shown for server-side errors that are not field-level (`PLAN_EDIT_CONFLICT`). Uses the error status color pattern from the design system.
- `PLAN_HAS_ACTIVE_SUBSCRIBERS` is treated as a **field-level** error: the error message is displayed below the Price input with a red error border, not in the banner. This makes it immediately clear to the admin which field caused the conflict.
- Tailwind structure for the form body:
  ```
  <form onSubmit={handleSubmit} className="flex flex-col gap-5">
    {/* Name field */}
    <div className="flex flex-col gap-1.5">
      <label htmlFor="plan-name" className="text-sm font-semibold text-gray-300">Plan Name</label>
      <input
        id="plan-name"
        type="text"
        placeholder="e.g. Monthly Basic"
        className={`w-full rounded-md border bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:border-transparent ${
          errors.name ? 'border-red-500/60 focus-visible:ring-red-500' : 'border-gray-700 focus-visible:ring-green-500'
        }`}
        aria-invalid={!!errors.name}
        aria-describedby={errors.name ? 'plan-name-error' : undefined}
      />
      {errors.name && <p id="plan-name-error" className="text-xs text-red-400">{errors.name}</p>}
    </div>

    {/* Description field */}
    <div className="flex flex-col gap-1.5">
      <label htmlFor="plan-description" className="text-sm font-semibold text-gray-300">Description</label>
      <textarea
        id="plan-description"
        rows={3}
        placeholder="Describe what is included in this plan."
        className={`w-full rounded-md border bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:border-transparent resize-none ${
          errors.description ? 'border-red-500/60 focus-visible:ring-red-500' : 'border-gray-700 focus-visible:ring-green-500'
        }`}
        aria-invalid={!!errors.description}
        aria-describedby={errors.description ? 'plan-description-error' : undefined}
      />
      {errors.description && <p id="plan-description-error" className="text-xs text-red-400">{errors.description}</p>}
    </div>

    {/* Price and Duration side by side on sm+ screens */}
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {/* Price field */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="plan-price" className="text-sm font-semibold text-gray-300">Price (in cents)</label>
        <input
          id="plan-price"
          type="number"
          min={1}
          placeholder="2999"
          className={`w-full rounded-md border bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:border-transparent ${
            errors.priceInCents ? 'border-red-500/60 focus-visible:ring-red-500' : 'border-gray-700 focus-visible:ring-green-500'
          }`}
          aria-invalid={!!errors.priceInCents}
          aria-describedby="plan-price-helper plan-price-error"
        />
        <p id="plan-price-helper" className="text-xs text-gray-400">e.g. 2999 for $29.99</p>
        {errors.priceInCents && <p id="plan-price-error" className="text-xs text-red-400">{errors.priceInCents}</p>}
      </div>

      {/* Duration field */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="plan-duration" className="text-sm font-semibold text-gray-300">Duration (days)</label>
        <input
          id="plan-duration"
          type="number"
          min={1}
          placeholder="30"
          className={`w-full rounded-md border bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:border-transparent ${
            errors.durationDays ? 'border-red-500/60 focus-visible:ring-red-500' : 'border-gray-700 focus-visible:ring-green-500'
          }`}
          aria-invalid={!!errors.durationDays}
          aria-describedby="plan-duration-helper plan-duration-error"
        />
        <p id="plan-duration-helper" className="text-xs text-gray-400">Number of days the membership is valid.</p>
        {errors.durationDays && <p id="plan-duration-error" className="text-xs text-red-400">{errors.durationDays}</p>}
      </div>
    </div>

    {/* Server-side inline error banner */}
    {serverError && (
      <div
        role="alert"
        aria-live="polite"
        className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
      >
        {serverError}
      </div>
    )}
  </form>
  ```

#### StatusConfirmationModal
- Rendered as a Modal (design system 6E, sm size: `max-w-sm`).
- **Deactivate variant:** Title "Deactivate Plan". Body text: "Are you sure you want to deactivate [plan name]? Existing members on this plan will not be affected." Footer: Ghost "Cancel" + Destructive "Deactivate" button.
- **Activate variant:** Title "Reactivate Plan". Body text: "Reactivate [plan name]? It will immediately appear in the public plan catalogue." Footer: Ghost "Cancel" + Primary "Activate" button.
- Inline error banner inside modal body for `PLAN_ALREADY_INACTIVE` / `PLAN_ALREADY_ACTIVE`.

---

## Component States

| Component | Loading | Empty | Error | Populated |
|-----------|---------|-------|-------|-----------|
| PlanGrid | 3 skeleton PlanCards (`animate-pulse`) | "No plans available" + subtext | "Failed to load plans." + retry button | Grid of PlanCards |
| PlanCard | Skeleton variant (individual) | — | — | name, price, description, duration, CTA |
| PlanDetailCard | Skeleton variant | — | PlanDetailNotFound (404 state) | Full plan detail |
| AdminPlansTable | 5 skeleton rows | "No plans found" (with current filter context) | Inline error banner above table | Rows with PlanStatusBadge and PlanActionsMenu |
| PlanForm | — | Blank fields (create mode) / Pre-filled (edit mode) | Field-level errors + server error banner | Filled fields, submit enabled |
| PlanFormModal | "Save Plan" button in loading/spinner state | — | Inline error banner in modal body | Fields populated, footer actions |
| StatusConfirmationModal | Action button in loading/spinner state | — | Inline error banner in modal body | Confirmation text, cancel + action buttons |
| PlanStatusBadge | — | — | — | Green "Active" or gray "Inactive" pill |
| PaginationControls | — | Hidden when `totalPages <= 1` | — | Previous / Next with page count |

---

## Error Code to UI Message

| Error Code | Message shown to user | Location |
|------------|-----------------------|----------|
| `INVALID_NAME` | "Plan name must not be blank." | Below Name input field |
| `INVALID_DESCRIPTION` | "Description must not be blank." | Below Description textarea |
| `INVALID_PRICE` | "Price must be greater than zero." | Below Price input field |
| `INVALID_DURATION` | "Duration must be at least one day." | Below Duration input field |
| `PLAN_NOT_FOUND` | "This plan could not be found." | PlanDetailNotFound state (public); inline error on admin action if plan was deleted out of band |
| `PLAN_ALREADY_INACTIVE` | "This plan is already inactive." | Inside StatusConfirmationModal body |
| `PLAN_ALREADY_ACTIVE` | "This plan is already active." | Inside StatusConfirmationModal body |
| `PLAN_HAS_ACTIVE_SUBSCRIBERS` | "Cannot change the price while members are subscribed to this plan." | Below Price input field (field-level error, red border on Price input) |
| `PLAN_EDIT_CONFLICT` | "Another admin updated this plan at the same time. Please reload and try again." | Inside PlanFormModal server error banner |
| `ACCESS_DENIED` | "You do not have permission to perform this action." | Inside PlanFormModal server error banner |
| `INVALID_STATUS_FILTER` | "Invalid status filter. Use ACTIVE or INACTIVE." | Should not appear in the UI (tabs generate valid values); log as unexpected error |

---

## Responsive Behaviour

### Mobile (default, below `sm` breakpoint — 640px)
- `/plans`: PlanGrid collapses to 1 column (`grid-cols-1`).
- `/plans/:id`: Full-width single column. Price and name stack vertically inside the detail card.
- `/admin/plans`: Admin view is not optimised for mobile — the sidebar collapses to a hamburger overlay. The AdminPlansTable hides the "Duration" and "Created" columns (`hidden sm:table-cell`, `hidden lg:table-cell`). The Actions cell remains visible. The StatusFilterTabs scroll horizontally if needed.
- `PlanForm`: Price and Duration fields stack vertically (single column `grid-cols-1`).

### Tablet (`sm` to `lg`, 640px–1024px)
- `/plans`: PlanGrid renders 2 columns (`sm:grid-cols-2`).
- `AdminPlansTable`: "Duration" column appears (`sm:table-cell`). "Created" column remains hidden.
- Sidebar is in collapsed (icon-only) state by default, toggled by the admin.

### Desktop (`lg` and above, 1024px+)
- `/plans`: PlanGrid renders 3 columns (`lg:grid-cols-3`).
- `AdminPlansTable`: All columns visible including "Created" (`lg:table-cell`).
- Sidebar is expanded by default (`w-60`).

---

## Accessibility

- All form inputs have a visible `<label>` connected via `htmlFor` / `id`. No placeholder-only labeling.
- Error states use both a red border color change AND a text error message beneath the input — color is never the sole indicator.
- Error messages are linked to their input with `aria-describedby` and `aria-invalid="true"` is set on invalid inputs.
- Server-side inline error banners use `role="alert"` and `aria-live="polite"` so screen readers announce them.
- All interactive elements have `focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900` focus rings (keyboard only, not on mouse click).
- `PlanCard` on the public grid: the entire card is an `<a>` element. The "Get Started" button is a child of the anchor — to avoid nested interactive elements, the button stops propagation on click and navigates to `/register` independently, or the card uses a different interactive pattern (see note below).
  - Recommended pattern: make the outer `<div>` a card with `position: relative`, render the "Get Started" `<a href="/register">` with `absolute inset-0` stretch, and keep the "Get Started" button as the visible label. This prevents nested anchor violations.
- `PlanStatusBadge` carries `aria-label="Status: Active"` or `aria-label="Status: Inactive"` since the badge text alone ("Active", "Inactive") is self-describing — the aria-label makes the context explicit for screen readers.
- Modals use `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the modal title `id`. Focus is trapped inside the open modal. Escape key closes the modal.
- Icon-only buttons (e.g. close button in modal header) have `aria-label="Close"`.
- `StatusConfirmationModal` deactivate action: the destructive button receives focus on modal open so keyboard users can immediately proceed or press Escape to cancel.
- Loading skeletons carry `aria-hidden="true"` — they are decorative. A visually hidden `<span>` with `aria-live="polite"` announces "Loading plans..." while the skeleton is shown.
- `PlanActionsMenu` "Deactivate" and "Activate" buttons include the plan name in their accessible label to disambiguate when a screen reader announces multiple action buttons: `aria-label="Deactivate Monthly Basic"`.

---

## Formatting Helpers

These pure utility functions are referenced throughout this spec. They belong in `src/utils/planFormatters.ts`.

| Function | Input | Output example |
|----------|-------|----------------|
| `formatPrice(priceInCents)` | `2999` | `"$29.99"` |
| `formatDuration(durationDays)` | `30` | `"30 days"` |
| `formatDuration(durationDays)` | `365` | `"1 year"` |
| `formatDuration(durationDays)` | `60` | `"60 days"` |
| `formatDate(isoString)` | `"2026-03-21T10:00:00Z"` | `"Mar 21, 2026"` |
| `formatMonthYear(isoString)` | `"2026-03-21T10:00:00Z"` | `"March 2026"` |

`formatPrice`: divide `priceInCents` by 100, format with `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`.

`formatDuration`: if `durationDays === 365` return `"1 year"`, if `durationDays === 730` return `"2 years"`, else return `"${durationDays} days"`.
