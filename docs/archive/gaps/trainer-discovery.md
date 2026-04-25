# Gap Report: trainer-discovery
Date: 2026-04-05

## DOCS → CODE Gaps

### Missing Functionality

- **AC 27 / SDD: No dedicated backend endpoint for distinct specializations.** The PRD and SDD
  both treat the specialization filter panel as pulling its data from a distinct-values source.
  No `/api/v1/trainers/specializations` endpoint exists. Instead, `getDistinctSpecializations()`
  in `frontend/src/api/trainerDiscovery.ts` fetches the first 200 trainers sorted A–Z and
  derives distinct values entirely client-side. This means: (a) if there are more than 200
  trainers, specializations from later pages are silently omitted from the filter panel, and
  (b) an extra full-page API call is always made on load purely to populate the filter panel.
  The SDD does not document this approach; the choice is undocumented and fragile.

- **AC 5 / SDD Section 2: Specialization filter JPQL spec diverges from native SQL
  implementation.** The SDD sample JPQL uses a different form than the actual native SQL
  implementation. The code is functionally correct per the PRD, but the SDD snippet is
  misleading and should be updated to reflect the native query approach.

- **AC 33 / Design spec `AvailabilityGrid`: Active cells contain no visible text label.**
  The design spec specifies cells should show text content. The implementation renders active
  cells as empty coloured blocks. The visual label only appears in the left-side row header.
  Users relying on more than colour cannot identify which time block a filled cell represents
  without scanning to the row label.

- **AC 35 / Design `FavoriteButton`: Guest tooltip unreliable on disabled button.** Setting
  `disabled={true}` on a `<button>` prevents the `title` tooltip from firing on touch devices
  and in many browsers. A wrapper `<span>` or `pointer-events-none` child pattern is required
  for reliable tooltip display on Guest-state buttons.

- **Design spec `ActiveFilterChips`: Active filter chip row is not implemented.** The design
  spec describes a row of removable chip badges above the grid, one per selected
  specialization, with a "Clear all" ghost button. No chip row exists in `TrainerListPage`.
  The only way to remove a filter is to uncheck it in the sidebar panel. The "Clear filters"
  button is present only inside the empty state.

- **Design spec `SortDropdown`: Implemented as a native `<select>`, not the custom dropdown.**
  The spec defines a custom floating dropdown with `rounded-xl`, shadow, green checkmark on
  the active option, and styled option rows. The implementation uses a plain `<select>` element
  that renders using the OS native UI. This falls below the Peloton/Whoop quality bar.

- **Design spec `TrainerListToolbar`: Sticky toolbar row is not implemented.** The spec
  describes a sticky toolbar (`sticky top-16 z-20 border-b border-gray-800 bg-gray-900/60`)
  containing the filter toggle, sort dropdown, chips, and result count inline. The
  implementation places these controls in a left sidebar column — a structural layout
  divergence.

- **Design spec `TrainerCard`: Card body is not keyboard-navigable.** The spec and
  accessibility section require `tabIndex={0}` and `onKeyDown` (Enter/Space → navigate to
  profile) on the card's outer `<div>`. The implementation only wraps the trainer name and a
  "View profile" link in `<Link>` elements.

- **Design spec `TrainerProfileBack`: "Back to trainers" breadcrumb is absent on the populated
  profile page.** The spec positions this link above the profile header. The implementation
  only shows a "Back to trainers" button on the 404 state; the happy-path profile page has
  no back link above the header.

- **Design spec `AvailabilityGrid`: "No scheduled classes yet." note is not implemented.**
  When all time blocks are empty, the spec requires a `text-xs text-gray-500 italic mt-2`
  note below the grid. The component renders the empty grid silently.

- **Design spec `TrainerProfileHeader`: Photo is `h-20 w-20 rounded-full`; spec says `h-28 w-28 rounded-2xl`.**
  Smaller size and different border-radius shape.

- **Design spec Accessibility: `AvailabilityGrid` is missing `role="table"`, `scope`
  attributes, and loading skeleton `aria-busy`.** None of the ARIA attributes described in
  the accessibility section of the design spec are implemented.

- **AC 9 / NULLS LAST on native query path may not be enforced.** When a specialization
  filter is active, `parseSortForNative` produces a `Sort.Order.nullsLast()`. Spring Data JPA
  does not guarantee this is translated into SQL `NULLS LAST` for native queries depending on
  the dialect. The JPQL path works correctly. This is a potential correctness gap for AC 9
  when filtering by specialization.

- **Design spec `SpecializationFilterPanel` loading state: no skeleton implemented.** The
  Component States table requires shimmer skeleton pulse items on each checkbox row while
  specializations are loading. The `disabled` prop is passed (greying labels) but no skeleton
  is rendered.

### Broken Flows

- **AC 38 / Navbar: "My Favorites" is visible to Guest users.** `Navbar.tsx` includes "My
  Favorites" in `userNavLinks` for all `user.role === 'USER'` users. Guests (no active
  membership) see the link and get redirected to `/plans` when they click it. AC 38 requires
  the link to be "only visible in the navigation for Members."

- **AC 18 / Duplicate favorite returns 201 instead of 409.** `POST /favorites` with a trainer
  already saved should return 409 with `ALREADY_FAVORITED`. Currently returns 201.

- **Flow 4 / Pagination: No scroll-to-top after page change.** The spec (Flow 4, step 3)
  requires scrolling the grid area back to the top after clicking Next/Previous. Neither
  `TrainerListPage` nor `TrainerFavoritesPage` performs any scroll call on page change.

- **SDD Controller spec vs implementation: `sort` parameter shape.** The SDD Controller
  section specifies two separate `sortField` + `sortDir` parameters. The actual implementation
  uses a single combined `sort=field,dir` parameter. The code is correct per the PRD (AC 8),
  but the SDD Controller section is wrong and will mislead future developers.

### Design Divergence

- **Page background: `bg-gray-950` vs design system token `bg-[#0F0F0F]`.** `gray-950` is
  `#030712`, noticeably darker than `#0F0F0F`. Minor token inconsistency.

- **`TrainerCard` photo: `h-12 w-12` vs design spec `h-16 w-16`.** Smaller than specified,
  reducing visual hierarchy on the card.

- **`FavoriteButton` loading state: `"..."` text appended instead of `animate-spin` spinner
  replacing the heart.** The spec requires the spinner to replace the heart icon with
  `pointer-events-none` and a specific `aria-label`.

### Missing Test Coverage

- AC 2: `GET /api/v1/trainers` unauthenticated returns 401 — no spec exists
- AC 3: Pagination envelope includes `totalElements`, `totalPages`, `page`, `size` — no spec exists (note: backend returns `number` not `page`; discrepancy present)
- AC 4: Empty trainer list returns 200 with `totalElements: 0` — no spec exists
- AC 5: Filter by `?specialization=` is case-insensitive and returns matching trainers — no spec exists
- AC 6: Filter returning no matches returns 200 with empty `content` — no spec exists
- AC 7: Unsupported query parameters are silently ignored — no spec exists
- AC 8: Sort by `lastName,asc`, `lastName,desc`, `experienceYears,desc`, `experienceYears,asc` — no spec exists
- AC 9: Trainers with null `experienceYears` sort to the end — no spec exists
- AC 10: Invalid sort field returns 400 with `INVALID_SORT_FIELD` — no spec exists
- AC 11: Trainer profile DTO fields (`id`, `firstName`, `lastName`, `profilePhotoUrl`, `bio`, `specializations`, `experienceYears`, `classCount`, `availabilityPreview`) — no spec exists; `email` must not be exposed — no spec exists
- AC 12: Non-existent trainer ID returns 404 with `TRAINER_NOT_FOUND` — no spec exists
- AC 13: Profile endpoint unauthenticated returns 401 — no spec exists
- AC 14: `availabilityPreview` structure with 7 day keys mapping to time block labels — no spec exists
- AC 15: Availability derived from scheduled classes at query time — no spec exists
- AC 16: Trainer with no classes has all 7 days returning empty lists (not null) — no spec exists
- AC 17: `POST /favorites` returns 201 for Member; Guest gets 403 with `MEMBERSHIP_REQUIRED` — no spec exists
- AC 18: Duplicate favorite returns 409 with `ALREADY_FAVORITED` — no spec exists (endpoint currently broken: duplicate save returns 201 not 409)
- AC 19: Save non-existent trainer returns 404 with `TRAINER_NOT_FOUND` — no spec exists
- AC 20: `DELETE /favorites` returns 204 for Member; Guest gets 403 — no spec exists
- AC 21: Remove trainer not in favorites returns 404 with `FAVORITE_NOT_FOUND` — no spec exists
- AC 22: `GET /favorites` returns paginated list for Member; Guest gets 403 — no spec exists
- AC 23: Empty favorites list returns 200 with empty `content` — no spec exists
- AC 24: Favorites list supports same sort parameters as main list — no spec exists
- AC 25: Expired/cancelled membership retains favorites but blocks access with 403 — no spec exists
- AC 26: Trainer card displays profile photo (or avatar placeholder), full name, specialization tags (up to 3 + "+N more"), experience years (omitted if null) — no spec exists
- AC 27: Filter panel multi-select derived from current trainer data; re-fetches without full page reload — no spec exists
- AC 28: Sort dropdown has four options: "Name A-Z", "Name Z-A", "Most Experienced", "Least Experienced" — no spec exists
- AC 29: Loading state shows skeleton placeholders — no spec exists
- AC 30: API error shows non-dismissible error banner with "Could not load trainers. Please try again." and Retry button — no spec exists
- AC 31: No-match filter shows empty state "No trainers match your filters." with "Clear filters" button — no spec exists
- AC 32: Trainer profile page fields (photo, name, bio/"No bio available", specialization tags, experience/"Not specified", class count, availability grid) — no spec exists
- AC 33: Availability preview grid: 7 columns x 3 rows; filled cell = active time block — no spec exists
- AC 34: Non-existent trainer ID renders 404 message "Trainer not found." with link back to list — no spec exists
- AC 35: Guest sees disabled Save button with tooltip "Membership required to save favorites." — no spec exists
- AC 36: Member save triggers optimistic update to "Saved"; API failure reverts and shows error toast — no spec exists
- AC 37: Member remove triggers optimistic update; API failure reverts and shows error toast — no spec exists
- AC 38: `/trainers/favorites` only visible in nav for Members; Guest navigating to it is redirected to membership purchase page — no spec exists (and currently broken: Guest sees blank page, not a redirect)

**Summary:** The existing spec `trainer-discovery.spec.ts` contains a single test (TD-01) covering a
happy-path end-to-end flow (list → profile → save → favorites page). All 38 ACs lack dedicated spec coverage.

---

## CODE → DOCS Gaps

### Undocumented Endpoints / Logic

- **`getDistinctSpecializations` client-side aggregation strategy is undocumented.** The
  200-trainer cap, client-side normalization, and the decision not to have a backend
  specializations endpoint appear nowhere in the SDD or PRD.

- **`parseSortForNative` vs `parseSortForEntity` branching is undocumented.** The SDD
  describes only a single sort-validation approach; the two-path implementation detail is
  absent.

- **`TrainerFavoritesPage` redirects to `/plans`; design spec says `/memberships`.** The
  destination is undocumented in the SDD and contradicts the design spec.

### Undocumented UI

- **`TrainerFavoritesPage` renders `null` on intermediate `!isMember` state.** If membership
  check completes without triggering the redirect condition, the page renders a blank screen.
  No design spec covers this fallback.

- **`SpecializationFilterPanel` loading state shows no skeleton** — only a disabled-and-empty
  panel, not the shimmer state described in the spec.

### Undocumented Behaviours

- **Empty-state copy "No trainers match your filters." is shown even when no filters are
  active.** AC 31 scopes this message to the filtered-empty case. An unfiltered gym with no
  trainers will show misleading copy. No AC covers the unfiltered zero-trainer case.

- **Optimistic card-removal from the favorites grid is not documented.** When a Member
  removes a favorite from the Favorites page, the card disappears from the grid immediately
  (client-side filter on `isFavorited === true`). If the API call fails, the card reappears.
  Design spec Flow 7 only documents the heart revert, not the card disappearing from the list.

- **"My Favorites" is shown to Guests in the Navbar.** Documented above as an AC 38
  violation; also an undocumented behaviour since no Navbar behaviour spec exists for this
  feature.

### Untested Code Paths

- Trainer list pagination controls (Next/Previous buttons) — no spec verifies UI pagination works when `totalPages > 1`
- "+N more" label on specialization tags when a trainer has more than 3 specializations — no spec exists
- "My Favorites" link visibility in nav bar for Members vs. non-Members — no spec verifies the link appears/disappears based on membership status
- `isFavorited` field returned in both list and profile DTOs — no spec verifies the frontend uses this flag to show the "Saved" state on initial page load
- Error banner Retry button actually re-issues the API request — no spec covers the retry interaction
- Profile page "Back to trainers" link from the 404 state navigates to `/trainers` — no spec verifies the navigation
- Availability preview grid cell highlighting (filled vs. unfilled) for a trainer with scheduled classes — no spec verifies a highlighted cell appears when the trainer has a scheduled class in a specific time block
- Admin role accessing `/trainers` and `/trainers/{id}` — spec seeds a Member user; Admin-only read path is not independently tested

---

## Suggested Fix Order

1. **Navbar: hide "My Favorites" from Guests** — AC 38 violation; Guests see a nav item that
   immediately redirects them. Fix requires checking `activeMembership` from
   `useMembershipStore` in `Navbar.tsx`. Highest priority: broken UX flow for a defined user role.

2. **AC 18: Fix duplicate favorite returning 201 instead of 409** — backend bug; should return
   `ALREADY_FAVORITED` on duplicate `POST /favorites`.

3. **Redirect on `/trainers/favorites`: change `/plans` to `/memberships`** — one-line fix in
   `TrainerFavoritesPage.tsx`, contradicts the design spec.

4. **Add "Back to trainers" breadcrumb to the populated profile page** — currently the only
   way back is the browser back button.

5. **Active filter chips row** — the `ActiveFilterChips` component is fully absent; users
   cannot see what filters are active without opening the panel.

6. **`SortDropdown`: replace native `<select>` with the custom dropdown** described in the
   design spec to meet the Peloton/Whoop quality bar.

7. **`AvailabilityGrid`: add "No scheduled classes yet." note** when all blocks are empty.

8. **`FavoriteButton`: replace `"..."` text with an `animate-spin` spinner** that takes over
   from the heart icon during loading.

9. **`AvailabilityGrid`: add ARIA `role="table"` and `scope` attributes** per accessibility spec.

10. **Pagination: `window.scrollTo(0, 0)`** after page change in both list and favorites pages.

11. **Document `getDistinctSpecializations` strategy in SDD**, or replace with a backend
    `/api/v1/trainers/specializations` endpoint to remove the 200-trainer cap.

12. **Add E2E specs for the 37 uncovered ACs** — prioritise AC 17–25 (favorites flows) and
    AC 34–38 (error states, guest guards) as highest regression risk.
