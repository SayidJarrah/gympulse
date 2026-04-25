# PRD: Trainer Discovery

## Overview
Trainer Discovery is the user-facing section of the GymFlow portal that allows Members
and Guests to browse the gym's trainer roster, filter and sort by specialization and
experience, view a full trainer profile, inspect a general availability preview, and save
preferred trainers to a personal favorites list. The feature gives users the context they
need to choose who they want to train with, increasing engagement and driving membership
conversions.

## Goals
- What user problem does this solve? Users currently have no way to learn who the gym's
  trainers are, what they specialize in, or when they are generally available. This forces
  users to call the gym or make uninformed booking choices.
- What business outcome does it enable? Surfacing trainer expertise and availability reduces
  churn by helping members make confident choices, supports upsell of personal-training
  enquiries, and positions the gym as professional and transparent.

## User Roles Involved
- **Guest** — authenticated user without an active membership; can browse the trainer list,
  view profiles, and see availability previews; cannot save favorites.
- **Member** — authenticated user with an active membership; full access including saving
  and managing a personal favorites list.
- **Admin** — can access the same read views as a Member; admin write operations on trainer
  data are handled by the Scheduler (Admin) feature and are out of scope here.
- **Trainer** — not directly involved in this feature; trainer data is read-only from this
  feature's perspective.

## User Stories

### Happy Path Stories

- As a Guest, I want to browse a paginated list of trainer cards so that I can see who
  works at the gym before committing to a membership.
- As a Guest, I want to filter trainers by specialization so that I can narrow the list to
  trainers relevant to my fitness goals.
- As a Guest, I want to sort trainers by name (A-Z / Z-A) and by years of experience
  (high to low / low to high) so that I can find the most experienced specialist quickly.
- As a Guest, I want to click on a trainer card and see their full profile page so that I
  can read their bio, view their specializations, and learn more about them.
- As a Guest, I want to see a general availability preview on a trainer's profile so that I
  know roughly which days of the week and time blocks the trainer is active, without needing
  to book anything.
- As a Member, I want to save a trainer to my favorites list so that I can quickly return
  to their profile later without searching again.
- As a Member, I want to remove a trainer from my favorites list so that I can keep the
  list relevant as my preferences change.
- As a Member, I want to view a dedicated "My Favorites" section that lists only my saved
  trainers so that I can access preferred trainers without repeating a search.
- As a Member, I want the trainer card to display a visual indicator when a trainer is
  already in my favorites list so that I can see at a glance which trainers I have saved.

### Edge Case Stories

- As a Guest, I want to see a clear empty state message when no trainers match my applied
  filters so that I understand why the list is empty and know to adjust my criteria.
- As a Guest, I want to see a clear error message when the trainer list fails to load so
  that I am not left looking at a blank screen.
- As a Member, I want to be prevented from saving the same trainer to my favorites twice
  so that duplicate entries do not appear in my list.
- As a Member, I want to see a clear empty state message when my favorites list has no
  saved trainers so that I understand how to start adding trainers.
- As a Guest, I want to see a prompt to log in or purchase a membership when I try to save
  a trainer to favorites so that I understand why the action is unavailable.
- As a Member, I want the favorites indicator on a trainer card to update immediately when
  I save or remove a trainer so that I do not have to refresh the page to see the change.
- As any authenticated user, I want the trainer profile page to return a clear 404 message
  when the trainer ID does not exist so that I am not shown a broken page.

## Acceptance Criteria

### Trainer List — Browse and Pagination

1. `GET /api/v1/trainers` returns a paginated list of trainers with default page size 12,
   sorted by last name ascending. The response includes: `id`, `firstName`, `lastName`,
   `profilePhotoUrl` (nullable), `specializations` (list of strings), `experienceYears`
   (integer, nullable), and `classCount` (number of currently scheduled active classes
   linked to this trainer).
2. The endpoint is accessible to any authenticated user (Guest or Member); unauthenticated
   requests return 401.
3. Pagination is controlled via `?page=0&size=12`; the response envelope includes
   `totalElements`, `totalPages`, `page`, and `size` fields.
4. When no trainers exist in the system, the endpoint returns HTTP 200 with an empty
   `content` array and `totalElements: 0`.

### Trainer List — Filtering

5. The list can be filtered by one or more specializations via `?specialization=Yoga&specialization=HIIT`;
   the filter is case-insensitive and returns trainers whose `specializations` array contains
   at least one of the requested values.
6. When a `specialization` filter value is provided but no trainer matches, the endpoint
   returns HTTP 200 with an empty `content` array.
7. Filtering by an unrecognised query parameter other than the supported ones does not
   cause an error; unsupported parameters are silently ignored.

### Trainer List — Sorting

8. The list supports sorting via `?sort=lastName,asc`, `?sort=lastName,desc`,
   `?sort=experienceYears,desc`, and `?sort=experienceYears,asc`.
9. Trainers with a null `experienceYears` value sort to the end of the list regardless of
   sort direction for that field.
10. An unsupported `sort` field value returns 400 with error code `INVALID_SORT_FIELD`.

### Trainer Profile

11. `GET /api/v1/trainers/{id}` returns the full trainer profile: `id`, `firstName`,
    `lastName`, `profilePhotoUrl` (nullable), `bio` (nullable), `specializations`,
    `experienceYears` (nullable), `email` (omitted from response — never exposed to
    clients), `classCount`, and `availabilityPreview` (see AC 14).
12. A request for a trainer ID that does not exist returns 404 with error code
    `TRAINER_NOT_FOUND`.
13. The profile endpoint is accessible to any authenticated user (Guest or Member);
    unauthenticated requests return 401.

### Availability Preview

14. The `availabilityPreview` field in the trainer profile response is an object with
    seven keys — one per day of the week (`MONDAY` through `SUNDAY`) — each mapping to a
    list of time block labels. A time block label is one of: `MORNING` (06:00–12:00),
    `AFTERNOON` (12:00–17:00), `EVENING` (17:00–22:00). A day-block pair appears in the
    preview if and only if the trainer is assigned to at least one currently `SCHEDULED`
    class instance starting in that block on that day of the week. Days with no scheduled
    classes are represented as an empty list.
15. The availability preview is derived at query time from the existing scheduled class
    instances; no separate availability data source is introduced in this version.
16. If a trainer has no scheduled classes, all seven day entries in `availabilityPreview`
    return empty lists (not null, not omitted).

### Favorites — Save and Remove

17. `POST /api/v1/trainers/{id}/favorites` saves the specified trainer to the authenticated
    user's favorites list and returns HTTP 201 with the saved trainer's `id` and `firstName`
    and `lastName`. This endpoint requires the Member role (ACTIVE membership); a Guest
    receives 403 with error code `MEMBERSHIP_REQUIRED`.
18. Attempting to save a trainer that is already in the user's favorites list returns 409
    with error code `ALREADY_FAVORITED`.
19. Attempting to save a trainer ID that does not exist returns 404 with error code
    `TRAINER_NOT_FOUND`.
20. `DELETE /api/v1/trainers/{id}/favorites` removes the specified trainer from the
    authenticated user's favorites list and returns HTTP 204. This endpoint requires the
    Member role; a Guest receives 403 with error code `MEMBERSHIP_REQUIRED`.
21. Attempting to remove a trainer that is not in the user's favorites list returns 404
    with error code `FAVORITE_NOT_FOUND`.

### Favorites — List

22. `GET /api/v1/trainers/favorites` returns the authenticated user's saved trainers as a
    paginated list (default size 12) using the same DTO shape as `GET /api/v1/trainers`.
    This endpoint requires the Member role; a Guest receives 403 with error code
    `MEMBERSHIP_REQUIRED`.
23. When the user has no saved favorites, the endpoint returns HTTP 200 with an empty
    `content` array.
24. The favorites list supports the same sort parameters as the main trainer list (AC 8–10).

### Favorites — Membership Expiry

25. When a Member's membership expires (status becomes EXPIRED or CANCELLED), their
    favorites list is retained in the database; however, all favorites endpoints return
    403 with error code `MEMBERSHIP_REQUIRED` until the membership is renewed. The list
    is not deleted.

### Frontend — Trainer List Page

26. The trainer list page renders a grid of trainer cards; each card displays: profile
    photo (or a default avatar placeholder if null), full name, specialization tags (up to
    3 shown, with a "+N more" label if there are additional ones), and experience in years
    (omitted if null).
27. The filter panel is visible on the trainer list page and offers a multi-select list of
    all distinct specializations present in the system, derived from the current trainer
    data. Selecting or deselecting a specialization re-fetches the list without a full
    page reload.
28. The sort control renders as a dropdown with four options: "Name A-Z", "Name Z-A",
    "Most Experienced", "Least Experienced". Changing the selection re-fetches the list.
29. When the list is loading, each card position shows a skeleton placeholder of the same
    dimensions as a real card.
30. When the API returns an error, a non-dismissible error banner is displayed at the top
    of the list area with the message "Could not load trainers. Please try again." and a
    Retry button that re-issues the request.
31. When no trainers match the active filters, the card grid is replaced with an empty
    state message: "No trainers match your filters." and a "Clear filters" button that
    resets all active filters.

### Frontend — Trainer Profile Page

32. The trainer profile page is accessible at `/trainers/{id}` and displays: profile photo
    (full-size, or a default avatar placeholder), full name, bio (or "No bio available"
    if null), specialization tags, experience in years (or "Not specified" if null),
    class count, and the availability preview grid.
33. The availability preview grid displays seven columns (Monday through Sunday) with up to
    three rows (Morning, Afternoon, Evening). A cell is highlighted (filled) if the trainer
    is active in that time block on that day; otherwise it is empty (unfilled).
34. When the trainer ID does not exist, the page renders a 404 message: "Trainer not found."
    with a link back to the trainer list.

### Frontend — Favorites Interaction

35. Each trainer card and the trainer profile page display a "Save to Favorites" button
    (or heart icon) for Members. For Guests, the button is visible but disabled; hovering
    or tapping it shows a tooltip: "Membership required to save favorites."
36. When a Member clicks "Save to Favorites", the button state changes immediately to
    "Saved" (optimistic update); if the API call fails, the button reverts to its previous
    state and an error toast is shown.
37. When a Member clicks "Remove from Favorites" (or clicks the filled heart icon), the
    button state changes immediately (optimistic update); if the API call fails, the state
    reverts and an error toast is shown.
38. The "My Favorites" page is accessible at `/trainers/favorites` and is only visible in
    the navigation for Members. Navigating to it as a Guest redirects to the membership
    purchase page.

## Out of Scope (for this version)

- Booking or reserving a personal training session with a specific trainer.
- Contacting a trainer directly through the platform (no messaging or email send).
- Trainer self-service: trainers cannot log in and manage their own profiles in this
  feature; that is the Admin's responsibility via the Scheduler.
- Ratings or reviews of trainers by members.
- Trainer search by free-text name query (filtering by specialization only in this version).
- Admin-facing management of trainer profiles (covered by the Scheduler PRD).
- Notifications when a favorited trainer's availability changes.
- Public (unauthenticated) access to the trainer list or profiles; authentication is
  required.
- Waitlist or interest registration for a trainer's future classes.
- Sharing a trainer profile externally (no public shareable link).

## Open Questions

1. **Experience years field:** The existing `Trainer` domain model does not include an
   `experienceYears` field. AC 1, 8, and 26 assume this field will be added. Confirm that
   the schema should be extended, and whether "experience" means years as a professional
   trainer or years at this specific gym.
2. **Specialization taxonomy:** The feature brief uses "specializations" as free-text tags
   (matching the existing domain model). The filter UI (AC 27) derives distinct values from
   the data. Should specializations be a controlled vocabulary (enum or lookup table) to
   ensure filter consistency, or remain free-text tags? If free-text, "yoga" and "Yoga"
   are treated as the same by the filter (AC 5), but they will appear as two separate
   options in the filter panel unless normalised.
3. **Favorites access for Guests:** AC 17 restricts saving favorites to Members only. Should
   Guests be able to maintain a temporary (session-scoped or localStorage-based) favorites
   list that is promoted to a real list upon membership activation, or is a hard gate
   (403 + upsell prompt) the intended UX?
4. **Availability preview data freshness:** AC 14 derives the preview from currently
   scheduled classes. If no classes are scheduled yet (e.g., a new gym), all trainers will
   show an empty preview, which may mislead users. Should there be an option for admins to
   manually set general availability hours per trainer, independent of the class schedule?
5. **Profile photo hosting:** The Scheduler PRD assumes photos are stored in object storage
   (e.g., S3-compatible) with a URL persisted in the DB. This PRD assumes the same
   `profilePhotoUrl` field exists on the `Trainer` entity. Confirm the storage strategy
   and whether a CDN URL or signed URL should be returned for photo fields.

## Technical Notes for the Architect

- The `Trainer` entity will need new fields: `experienceYears` (nullable integer) and
  confirmation that `profilePhotoUrl` (nullable string) was added by the Scheduler
  implementation; a Flyway migration will be required if either field is absent.
- The `availabilityPreview` computation joins `trainers` to scheduled `GymClass` instances
  (via the many-to-many trainer-class join table introduced in the Scheduler SDD) filtered
  to `status = SCHEDULED`; this should be computed in the service layer using a single
  aggregating query rather than N+1 calls.
- The favorites relationship is a simple many-to-many between `users` and `trainers`; a
  `user_trainer_favorites` join table with a composite PK `(user_id, trainer_id)` and a
  unique constraint is sufficient. No additional columns are needed in this version.
- The favorites endpoints must enforce that the user's membership is ACTIVE at the time of
  the request; this check should reuse the same membership-status service used by the class
  booking feature to avoid diverging logic.
- Specialization filtering with case-insensitive matching (AC 5) should use a
  `LOWER(specialization) = LOWER(:value)` predicate or a case-insensitive collation on the
  specializations column; do not rely on application-layer filtering for this.
- The trainer list and profile endpoints are read-heavy and low-mutation; consider adding a
  short-lived cache (e.g., 60 seconds) at the service layer or via Spring Cache to reduce
  DB load on the specializations aggregation for the filter panel.
- Trainer profile and list endpoints should never expose the trainer's email address in the
  response DTO, even though it is stored on the entity (per the security rules in AGENTS.md).
