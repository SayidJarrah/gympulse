# Design: Trainer Discovery

## User Flows

### Flow 1 — Browse Trainer List (Guest or Member)

1. Authenticated user navigates to `/trainers`.
2. Page renders a loading skeleton grid (12 card-shaped placeholders pulsing).
3. API resolves: skeleton is replaced with a 3-column grid of `TrainerCard` components (default sort: Name A–Z).
4. User reads each card: photo/avatar, full name, up to 3 specialization tags, "+N more" if overflow, experience years, class count, heart icon.
5. Member sees an outlined heart on each unfavorited card; Guest sees a dimmed/locked heart.

### Flow 2 — Filter by Specialization

1. User opens the filter panel (sidebar on desktop, collapsible accordion on mobile).
2. `SpecializationFilterPanel` shows a checkbox list of distinct specializations.
3. User selects one or more options — active selections appear as green removable chips above the grid.
4. List re-fetches immediately (no full-page reload). Skeleton replaces grid during fetch.
5. Results update; filter chip count badge reflects active filters.
6. User clicks the "x" on a chip (or unchecks the panel item) to remove that filter.
7. "Clear all filters" button resets all selections and re-fetches the unfiltered list.

### Flow 3 — Sort

1. User opens the sort dropdown (always visible in the toolbar row above the grid).
2. Four options: "Name A–Z" (default), "Name Z–A", "Most Experienced", "Least Experienced".
3. Selecting an option re-fetches the list with the new sort parameter. Active sort label is shown in the dropdown trigger.

### Flow 4 — Pagination

1. User scrolls to the bottom of the grid.
2. Pagination controls show "Page X of Y" plus Previous / Next buttons.
3. Clicking Next fetches the next page and scrolls the grid area back to the top.

### Flow 5 — View Trainer Profile

1. User clicks anywhere on a `TrainerCard` (card is interactive/clickable).
2. Browser navigates to `/trainers/{id}`.
3. Profile page loads: full-size photo or avatar placeholder, name, bio (or "No bio available"), specialization tags, experience years (or "Not specified"), class count badge, `FavoriteButton`, and `AvailabilityGrid`.
4. User reads the availability grid: 7-column (Mon–Sun) × 3-row (Morning / Afternoon / Evening) table. Active blocks are highlighted in green; inactive blocks are dimmed.
5. User clicks "Back to trainers" link to return to `/trainers` (browser back is also supported).

### Flow 6 — Save Favorite (Member)

1. Member clicks the heart icon on a `TrainerCard` or the `FavoriteButton` on the profile page.
2. Heart fills immediately (optimistic update — green filled heart).
3. `POST /api/v1/trainers/{id}/favorites` is issued in the background.
4. On success: no further action. Heart remains filled.
5. On failure: heart reverts to unfilled, error toast appears: "Could not save trainer. Please try again."

### Flow 7 — Remove Favorite (Member)

1. Member clicks the filled heart on a favorited trainer card or profile page.
2. Heart immediately reverts to outline (optimistic update).
3. `DELETE /api/v1/trainers/{id}/favorites` is issued.
4. On success: no further action.
5. On failure: heart reverts to filled, error toast appears: "Could not remove trainer. Please try again."

### Flow 8 — View My Favorites (Member)

1. Member clicks "My Favorites" in the top nav (visible only to Members).
2. Browser navigates to `/trainers/favorites`.
3. Page shows the member's saved trainers in the same card grid layout, with a sort control (no specialization filter on this page).
4. Each card shows a filled green heart. Clicking it removes the trainer from favorites (Flow 7).
5. If no favorites: empty state message with a link back to the trainer list.

### Flow 9 — Guest Attempts to Save Favorite

1. Guest hovers or taps the heart icon on a trainer card.
2. Tooltip appears: "Membership required to save favorites."
3. Heart does not toggle; no API call is made.
4. If the Guest navigates directly to `/trainers/favorites`, they are redirected to `/memberships`.

### Flow 10 — Error States

1. API call to load trainer list fails: non-dismissible error banner appears above the grid: "Could not load trainers. Please try again." with a Retry button.
2. Trainer profile `GET` returns 404: profile page renders: "Trainer not found." with a link back to `/trainers`.
3. Saving a favorite fails with a network error: toast notification appears (see Flow 6, step 5).

---

## Screens & Components

---

### Screen: Trainer List (`/trainers`)

**Who sees it:** Guest (authenticated) / Member / Admin
**Layout:** NavBar (sticky top) → toolbar row (filter toggle + sort dropdown + active filter chips + result count) → two-panel layout on desktop (filter sidebar left, card grid right), single-column on mobile.

#### TrainerListToolbar

- Data shown: active filter chip labels, current sort label, total result count
- User actions: open/close filter panel, change sort, remove individual chips, clear all filters
- Tailwind structure:
  ```
  flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900/60 sticky top-16 z-20
  ```
- Sort dropdown sits at the right end of the toolbar row.

#### SpecializationFilterPanel (sidebar on desktop, drawer on mobile)

- Data shown: list of distinct specialization strings with checkboxes; active selections highlighted
- User actions: check/uncheck specializations; each change triggers a list re-fetch
- Desktop: `w-56 shrink-0 flex flex-col gap-2` left panel, `sticky top-32` position
- Mobile: collapsible accordion `w-full border-b border-gray-800 bg-gray-900`
- Each checkbox item: `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer`
- Active item adds `text-green-400 font-medium`
- Panel heading: `text-xs font-semibold uppercase tracking-wider text-gray-500 px-2 pb-2`

#### ActiveFilterChips

- Data shown: one removable chip per selected specialization
- Tailwind structure: `flex flex-wrap gap-2`
- Each chip: Primary badge variant (system.md 6D) with XMark remove button
- "Clear all" ghost button shown when any filter is active

#### SortDropdown

- Data shown: currently selected sort option label
- User actions: select one of four sort options
- Trigger: `inline-flex items-center gap-2 rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white hover:border-gray-600 transition-colors duration-200`
- Dropdown menu: `absolute right-0 z-30 mt-1 w-52 rounded-xl border border-gray-800 bg-gray-900 shadow-xl shadow-black/50 py-1`
- Each option: `flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer`
- Active option: `text-green-400 font-medium`; checkmark icon `h-4 w-4` on the left

#### TrainerGrid

- Data shown: paginated array of `TrainerDiscoveryItem`
- Tailwind structure: `grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Contains `TrainerCard` × n or `TrainerCardSkeleton` × 12 during loading
- Empty state replaces grid (see Component States below)

#### TrainerCard

- Data shown: `profilePhotoUrl` (or avatar placeholder), `firstName + lastName`, `specializations` (up to 3 tags + "+N more" label), `experienceYears` (omitted when null), `classCount`, `isFavorited`
- User actions: click card body → navigate to `/trainers/{id}`; click heart → toggle favorite
- Tailwind structure:
  ```
  group cursor-pointer rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-md shadow-black/50 transition-all duration-200 hover:border-gray-600 hover:bg-gray-800 relative
  ```
- Photo: `h-16 w-16 rounded-full object-cover bg-gray-700 flex-shrink-0` — avatar placeholder shows initials in `text-gray-500` on `bg-gray-700 rounded-full`
- Name: `text-base font-semibold text-white leading-tight mt-3`
- Specialization tags: `flex flex-wrap gap-1.5 mt-2` — each tag is a Neutral badge sm (system.md 6D)
- "+N more" label: `text-xs text-gray-500 italic`
- Experience row (when non-null): `text-xs text-gray-400 mt-2` — "X yrs experience"
- Class count row: `text-xs text-gray-400 mt-1` — "{N} active classes"
- Heart button: `absolute top-4 right-4` — see `FavoriteButton` component below

#### TrainerCardSkeleton

- Same dimensions as `TrainerCard`; all content replaced with pulsing gray blocks
- Tailwind structure: `rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-md shadow-black/50`
- Photo placeholder: `h-16 w-16 rounded-full bg-gray-800 animate-pulse`
- Name placeholder: `h-4 w-32 rounded bg-gray-800 animate-pulse mt-3`
- Tags row: `flex gap-1.5 mt-2` — two blocks `h-5 w-14 rounded-full bg-gray-800 animate-pulse`
- Text lines: `h-3 w-24 rounded bg-gray-800 animate-pulse mt-2`

#### FavoriteButton

- Data shown: `isFavorited`, `isMember`, `loading`
- User actions: click to toggle (Member only)
- Favorited (Member): filled heart SVG, `text-green-500`, `hover:text-green-400`
- Unfavorited (Member): outline heart SVG, `text-gray-500`, `hover:text-green-400 transition-colors duration-200`
- Guest state: outline heart, `text-gray-600 cursor-not-allowed` — tooltip on hover/focus: "Membership required to save favorites" (`title` attribute)
- Loading state: spinner `animate-spin` replaces the heart, `text-gray-500`, `pointer-events-none`
- Button base: `rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-gray-900 transition-colors duration-200`
- Touch target meets 44×44px via `p-2.5`

#### ErrorBanner (list page)

- Tailwind structure: `flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4`
- Message: `text-sm text-red-400`
- Retry button: Secondary button sm variant targeting list re-fetch

#### PaginationControls

- Tailwind structure: `flex items-center justify-center gap-4 pt-8 pb-4`
- Previous / Next: Ghost button sm with chevron icons
- Page indicator: `text-sm text-gray-400` — "Page {n} of {total}"
- Disabled state on Previous at page 0, Next at last page

---

### Screen: Trainer Profile (`/trainers/:id`)

**Who sees it:** Guest (authenticated) / Member / Admin
**Layout:** NavBar → centered content column `max-w-3xl mx-auto px-4 py-10`

#### TrainerProfileHeader

- Data shown: `profilePhotoUrl` or avatar placeholder, `firstName + lastName`, specialization tags, `experienceYears`, `classCount`, `isFavorited`
- Tailwind structure: `flex flex-col sm:flex-row items-start gap-6`
- Photo: `h-28 w-28 rounded-2xl object-cover bg-gray-700 flex-shrink-0` (full-size on profile)
- Name: `text-3xl font-bold text-white leading-tight`
- Tags row: `flex flex-wrap gap-2 mt-2`
- Experience: `text-sm text-gray-400 mt-1` — "X yrs experience" or omit if null
- Class count: `inline-flex items-center gap-1.5 text-sm text-gray-400 mt-1` — calendar icon + "{N} active classes"
- `FavoriteButton` sits inline to the right of the name on desktop; below tags on mobile

#### TrainerBio

- Data shown: `bio`
- Tailwind structure: `mt-8`
- Section heading: `text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3`
- Bio text: `text-base text-gray-300 leading-relaxed`
- No-bio placeholder: `text-sm italic text-gray-600`

#### AvailabilityGrid

- Data shown: `availabilityPreview` — 7 days × 3 time blocks
- Tailwind structure: `mt-8`
- Section heading: `text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4`
- Grid: `grid grid-cols-7 gap-1`
- Column header (day label): `text-center text-xs font-semibold text-gray-400 uppercase pb-2`
- Cell (active — filled): `rounded-md py-2 text-center text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30`
- Cell (inactive — empty): `rounded-md py-2 text-center text-xs text-gray-700 border border-gray-800`
- Block label row order (top to bottom): Morning → Afternoon → Evening
- Row labels on the left (optional): `text-xs text-gray-500 text-right pr-2 leading-none` — hidden on very small screens
- If all blocks empty: a small `text-xs text-gray-500 italic mt-2` note: "No scheduled classes yet."

#### TrainerProfileBack

- `text-sm text-green-400 hover:text-green-300 inline-flex items-center gap-1` link to `/trainers`
- Position: above the profile header, acts as breadcrumb

#### TrainerNotFound (404 state)

- Centered in the main area: `flex flex-col items-center gap-4 py-24 text-center`
- Icon: `h-12 w-12 text-gray-600` (UserIcon outline)
- Heading: `text-xl font-semibold text-white` — "Trainer not found."
- Link: `text-sm text-green-400 hover:text-green-300` — "Back to trainers"

---

### Screen: My Favorites (`/trainers/favorites`)

**Who sees it:** Member / Admin only (Guests redirected to `/memberships`)
**Layout:** Same as Trainer List page but without the `SpecializationFilterPanel`. Sort control remains. Page heading changes to "My Favorites".

#### FavoritesEmptyState

- Tailwind structure: `flex flex-col items-center gap-4 py-24 text-center`
- Icon: `h-12 w-12 text-gray-600` (HeartIcon outline)
- Heading: `text-xl font-semibold text-white` — "No saved trainers yet."
- Body: `text-sm text-gray-400` — "Browse trainers and tap the heart to save your favorites."
- CTA button: Primary button → "Browse Trainers" → `/trainers`

---

## Component States

| Component | Loading | Empty | Error | Populated |
|-----------|---------|-------|-------|-----------|
| TrainerGrid | 12 × `TrainerCardSkeleton` with `animate-pulse` | "No trainers match your filters." + Clear Filters button | Non-dismissible error banner with Retry button | Grid of `TrainerCard` components |
| TrainerCard | — | — | — | Photo/avatar, name, tags (+N more), experience, class count, heart icon |
| FavoriteButton | Spinner replaces heart; `pointer-events-none` | — | Toast error on failure; button reverts to prior state | Filled green heart (favorited) or outline gray heart (unfavorited) |
| SpecializationFilterPanel | Shimmer on each checkbox item (skeleton pulse) | Panel hidden if no specializations available | — | Checkbox list of distinct specializations; active items highlighted green |
| SortDropdown | — | — | — | Four options; active option has green checkmark |
| ActiveFilterChips | — | Hidden (no chips rendered) | — | One chip per selected specialization + "Clear all" button |
| AvailabilityGrid | Skeleton blocks (7×3 rounded-md `animate-pulse`) | "No scheduled classes yet." note below grid | — | Active cells highlighted green; inactive cells dimmed |
| FavoritesEmptyState | — | Shown when `content` array is empty on `/trainers/favorites` | — | — |
| TrainerNotFound | — | — | Shown on `/trainers/{id}` when API returns 404 | — |
| ErrorBanner | — | — | Shown above grid on 5xx / network failures | Hidden |
| PaginationControls | — | Hidden when `totalPages <= 1` | — | Previous / Next buttons + page indicator |

---

## Error Code → UI Message

| Error Code | Message shown to user | Location | Behavior |
|-----------|----------------------|----------|----------|
| `MEMBERSHIP_REQUIRED` (403 on GET /favorites) | Redirect to `/memberships` | Full-page redirect | No error message; navigation handles the gate |
| `MEMBERSHIP_REQUIRED` (403 on POST/DELETE favorite) | "An active membership is required to save favorites." | Toast notification (bottom-center, `aria-live="polite"`) | Appears for 4 s then dismisses |
| `TRAINER_NOT_FOUND` (404 on GET profile) | "Trainer not found." with link back to trainer list | Replaces page content | See `TrainerNotFound` component |
| `TRAINER_NOT_FOUND` (404 on POST favorite) | "Trainer not found." | Toast notification | Appears for 4 s; button reverts |
| `ALREADY_FAVORITED` (409) | Silently ignored — heart stays filled | None | Optimistic update was correct; no action needed |
| `FAVORITE_NOT_FOUND` (404 on DELETE) | Silently ignored — heart stays unfilled | None | Treat as success; optimistic update was correct |
| `INVALID_SORT_FIELD` (400) | "Invalid sort selection. Please refresh the page." | Toast notification | Should not occur in normal use (UI controls only valid values) |
| Network/5xx on list load | "Could not load trainers. Please try again." | Error banner above grid | Non-dismissible; Retry button re-issues the request |
| Network/5xx on profile load | "Could not load this trainer. Please try again." | Replaces page content — centered error state with Retry button | — |
| Network/5xx on POST favorite | "Could not save trainer. Please try again." | Toast notification | Button reverts from filled to outline |
| Network/5xx on DELETE favorite | "Could not remove trainer. Please try again." | Toast notification | Button reverts from outline to filled |

---

## Responsive Behaviour

### Mobile (below `sm` breakpoint, < 640px)

- `TrainerGrid` uses `grid-cols-1` — single column of full-width cards.
- `SpecializationFilterPanel` is hidden by default; revealed by a "Filters" button in the toolbar row. It renders as a full-width collapsible section above the grid (not a sidebar).
- Toolbar row wraps to two rows: top row has Filters toggle button and Sort dropdown; second row shows active filter chips if any are applied.
- `AvailabilityGrid` on the profile page: day column headers abbreviated to 2 letters (Mo, Tu, We, Th, Fr, Sa, Su) to fit; row labels hidden to save space.
- Trainer profile header stacks vertically (`flex-col`) — photo on top, name/tags/buttons below.
- `FavoriteButton` on the profile page sits below the specialization tags (full-width secondary button variant).

### Tablet (`sm` to `lg`, 640px–1024px)

- `TrainerGrid` uses `grid-cols-2`.
- Filter panel collapses to an icon + label toggle button; clicking expands a filter sheet above the grid (not a fixed sidebar).

### Desktop (above `lg`, > 1024px)

- `TrainerGrid` uses `grid-cols-3`.
- `SpecializationFilterPanel` is always visible as a fixed left sidebar (`w-56 shrink-0`) with a thin `border-r border-gray-800` divider.
- Toolbar row stays in a single row.
- `AvailabilityGrid` shows full day names and row labels.

---

## Accessibility

### Keyboard Navigation

- All `TrainerCard` components are keyboard-focusable (the outer `<div>` uses `tabIndex={0}` with `onKeyDown` handling `Enter` and `Space` to navigate to the profile page).
- `FavoriteButton` has a dedicated focus ring: `focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900`.
- Sort dropdown opens on `Enter`/`Space`; options are navigated with arrow keys; `Escape` closes the dropdown.
- Filter panel checkboxes are standard `<input type="checkbox">` elements — fully keyboard-accessible.
- Pagination Previous/Next buttons are `<button>` elements with `disabled` attribute applied at boundaries.

### ARIA Labels and Roles

- `FavoriteButton` aria-label alternates: "Save {firstName} {lastName} to favorites" / "Remove {firstName} {lastName} from favorites" / "Membership required to save favorites" (for Guests).
- `TrainerCard` heart button `aria-pressed={isFavorited}` communicates toggle state to screen readers.
- `AvailabilityGrid` is wrapped in `role="table"` with `aria-label="Availability schedule"`. Column headers use `scope="col"`, row headers use `scope="row"`.
- Active cells have `aria-label="{Day} {Block}"` (e.g., "Monday Morning").
- Error banner has `role="alert"` and `aria-live="assertive"`.
- Toast notifications use `role="status"` and `aria-live="polite"`.
- Loading skeleton grid has `aria-busy="true"` on the containing element and `aria-label="Loading trainers"`.
- Filter checkbox group is wrapped in `<fieldset>` with `<legend>Specializations</legend>`.

### Focus Management

- When the trainer profile modal opens (if implemented as a slide-over rather than page navigation), focus moves to the close button; Escape closes and returns focus to the originating card.
- When a filter is applied and the grid re-fetches, focus remains on the last interacted filter checkbox (not jumped to the grid).
- After clearing all filters, focus moves to the first filter checkbox or the Filters toggle button.
- Toast notifications are announced by `aria-live="polite"` regions — no focus shift occurs.

### Color Contrast

- Filled heart icon uses `text-green-500` (`#22C55E`) on `bg-gray-900` (`#111827`): approximately 5.3:1 — passes AA.
- Active availability cells: `text-green-400` on `bg-green-500/20` tint: contrast is AA-compliant; active cells also include a filled background and border (not color alone).
- Inactive availability cells: `text-gray-700` on `bg-gray-900` — these are decorative empty slots, not conveying information; the active state is the meaningful signal.
- All other text follows system.md Section 9 contrast ratios.

### Error State Indicators

- Error states never rely on color alone: the error banner includes an icon and text label; error toasts include a text description; the 404 page includes icon, heading, and descriptive text.
- `FavoriteButton` loading state uses a spinner with `aria-label="Saving..."` or `aria-label="Removing..."`.
