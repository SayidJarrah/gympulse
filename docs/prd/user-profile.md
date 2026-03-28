# PRD: User Profile

## Overview
The User Profile feature allows an authenticated GymFlow member to view and edit their own
personal information. A dedicated profile page surfaces the data GymFlow holds about the
member — first name, last name, email, phone, date of birth, and fitness goals — and
permits updating all fields except email. The page also displays the member's current
membership status (read-only) with a link to the My Membership section for further action.
This gives members control over their personal data and ensures the gym holds accurate
contact and health-context information for every active member.

## Goals
- **User problem:** Members have no way to view or correct personal information they
  provided at registration, and no place to add optional details (phone, fitness goals)
  that were not collected during sign-up.
- **Business outcome:** Accurate member data (especially phone and date of birth) improves
  operational quality — trainers and staff can reach members when needed and are aware of
  age-related considerations. Fitness goals support personalised upsell and engagement
  opportunities in future features.

## User Roles Involved
- **User (Member)** — primary actor; can view and edit their own profile.
- **User (no membership / guest-state)** — can also view and edit their own profile; the
  membership gate does not apply to the profile page.
- **Admin** — not in scope; admins do not use this feature to manage member profiles.
  Admin-side user management belongs to the Admin Dashboard PRD.
- **Guest (unauthenticated)** — cannot access the profile page; redirected to login.

## User Stories

### Happy Path Stories

- As a user, I want to view my profile page showing my first name, last name, email,
  phone, date of birth, fitness goals, and current membership status so that I can confirm
  the information GymFlow holds about me.
- As a user, I want to edit my first name, last name, phone, date of birth, and fitness
  goals and save the changes so that my profile stays accurate.
- As a user, I want to see a success confirmation after saving my profile changes so that
  I know the update was applied.
- As a user, I want to see my current membership plan name and expiry date on my profile
  page (read-only) so that I have a quick summary of my subscription status without
  navigating away.
- As a user, I want to click a "View full membership details" link on the profile page that
  takes me to the My Membership page so that I can access deeper membership information
  when I need it.
- As a user, I want to clear my phone number by submitting the phone field as empty so
  that I can remove it if I no longer want it stored.

### Edge Case Stories

- As a user, I want to see a validation error when I submit a first name or last name that
  is blank (empty string or whitespace only) so that my profile always retains a meaningful
  full name.
- As a user, I want to see a validation error when I submit a date of birth that is in the
  future so that clearly invalid dates are rejected.
- As a user, I want to see a validation error when I submit a date of birth that would make
  me younger than 14 years old so that the platform enforces its minimum age policy.
- As a user, I want to see a validation error when my fitness goals text exceeds 500
  characters so that I know the limit before the server rejects the input.
- As a user, I want my profile edit form to retain the values I entered if the server
  returns an error so that I do not have to retype everything after a failed save.
- As a user, I want to confirm that I cannot change my email address via the profile page
  so that my login credential cannot be accidentally altered.
- As a user with no active membership, I want the membership section of my profile to
  display "No active membership" with a link to the Browse Plans page so that I know my
  status and where to go to purchase one.

## Acceptance Criteria

### Read Profile

1. `GET /api/v1/users/me` with a valid Bearer token returns HTTP 200 with a JSON object
   containing: `id` (UUID), `email` (string, read-only), `firstName` (string, nullable),
   `lastName` (string, nullable), `phone` (string, nullable), `dateOfBirth` (ISO-8601
   date, nullable), `fitnessGoals` (string, nullable), `createdAt` (ISO-8601 datetime).
2. `GET /api/v1/users/me` without a valid Bearer token (absent, malformed, or expired)
   returns HTTP 401 with error code `UNAUTHORIZED`.
3. `GET /api/v1/users/me` with a valid Bearer token for a USER-role account that has not
   yet set optional fields returns those fields as `null` — not omitted from the response.

### Update Profile

4. `PATCH /api/v1/users/me` with a valid Bearer token and a partial request body
   containing any subset of `firstName`, `lastName`, `phone`, `dateOfBirth`,
   `fitnessGoals` returns HTTP 200 with the complete, updated profile object.
5. Fields absent from the `PATCH` request body are not modified; the stored value is
   preserved unchanged.
6. `email` included in a `PATCH /api/v1/users/me` request body is silently ignored — it
   is not updated, and no error is returned for its presence.
7. `PATCH /api/v1/users/me` with `firstName` set to an empty string or a whitespace-only
   string returns HTTP 400 with error code `INVALID_NAME`.
8. `PATCH /api/v1/users/me` with `lastName` set to an empty string or a whitespace-only
   string returns HTTP 400 with error code `INVALID_NAME`.
9. `PATCH /api/v1/users/me` with a `dateOfBirth` value that is a future date (after today)
   returns HTTP 400 with error code `INVALID_DATE_OF_BIRTH`.
10. `PATCH /api/v1/users/me` with a `dateOfBirth` value that results in an age of less than
    14 years (i.e., `today - dateOfBirth < 14 years`) returns HTTP 400 with error code
    `MEMBER_TOO_YOUNG`. Age is calculated based on full calendar years.
11. `PATCH /api/v1/users/me` with `fitnessGoals` containing more than 500 characters
    returns HTTP 400 with error code `FITNESS_GOALS_TOO_LONG`.
12. `PATCH /api/v1/users/me` with `phone` explicitly set to `null` or an empty string
    clears the stored phone value; `GET /api/v1/users/me` subsequently returns `phone: null`.
13. `PATCH /api/v1/users/me` without a valid Bearer token returns HTTP 401 with error code
    `UNAUTHORIZED`.
14. A USER-role account cannot update another user's profile via `PATCH /api/v1/users/me`;
    the endpoint always operates on the account identified by the Bearer token.

### Profile Page — UI

15. The profile page at `/portal/profile` is accessible to any authenticated user
    (regardless of membership status) and is not blocked by the membership gate.
16. The profile page displays all fields returned by `GET /api/v1/users/me`: email (as a
    read-only, non-editable text element), firstName, lastName, phone, dateOfBirth, and
    fitnessGoals.
17. The email field is clearly labelled as read-only; there is no edit control for it on
    the profile page.
18. The profile form pre-populates all editable fields with the values returned by
    `GET /api/v1/users/me` on page load.
19. After a successful `PATCH /api/v1/users/me`, the profile page displays a visible
    success message (e.g., a green notification banner) confirming the update.
20. After a failed `PATCH /api/v1/users/me` (any 4xx response), the profile form retains
    the values the user entered and displays the specific error message associated with the
    returned error code.
21. Inline or near-field validation error messages are shown for `INVALID_NAME`,
    `INVALID_DATE_OF_BIRTH`, `MEMBER_TOO_YOUNG`, and `FITNESS_GOALS_TOO_LONG` errors;
    the message must be adjacent to the field that caused the error, not only at the top of
    the form.
22. The `fitnessGoals` input displays a character counter showing `current / 500`; it
    updates in real time as the user types.

### Membership Status Display on Profile Page

23. The profile page displays a read-only membership status section. When the user has an
    active membership, it shows the plan name and expiry date. When the user has no active
    membership, it shows the text "No active membership."
24. The membership status section contains a labelled link ("View full membership details")
    that navigates to `/portal/memberships`.
25. The membership status section reads from the Zustand store (loaded on portal entry);
    it does not make an independent API call for membership data.

## Out of Scope (for this version)

- Email address change — changing the login email is not supported via this feature.
- Password change — changing the account password is not supported via this feature.
- Profile photo / avatar upload.
- Email verification after a profile field change.
- Admin-initiated profile edits — admins editing member profiles belongs to the Admin
  Dashboard PRD.
- Activity history — a log of attended classes or gym visits is a separate future feature.
- Favourites / saved trainers.
- Account deletion or data export (GDPR right-to-erasure flow) — deferred.
- Push or email notification when profile data changes.
- Multi-language / internationalisation.

## Open Questions

1. Should `firstName` and `lastName` be separate new columns added to the `users` table,
   or stored as a single `displayName` column? The domain model in AGENTS.md currently
   only has `email` and `role` on User. The PRD assumes separate columns — confirm this is
   the intended DB schema before building the migration.
2. Is `dateOfBirth` required at the time of first profile edit, or permanently optional?
   The current scope treats it as optional (nullable). If it becomes required, the profile
   form must enforce it before allowing a save, which changes the form logic.
3. Is there a format restriction on `phone`? For example, should the API accept any string
   (and leave formatting to the frontend) or enforce E.164 international format server-side?
   Assumption: any non-empty string up to a reasonable length (e.g., 20 characters) is
   accepted — confirm.
4. Should the profile page be accessible via the navigation shell on every portal page
   (e.g., user name in the nav is a clickable link to the profile)? Assumption: yes, the
   user's displayed name in the nav shell links to `/portal/profile` — confirm with
   the UI/UX designer during the design phase.

## Technical Notes for the Architect

- `firstName`, `lastName`, `phone`, `dateOfBirth`, and `fitnessGoals` are new nullable
  columns on the `users` table not present in the current domain model. A Flyway migration
  is required before this feature can be built.
- `PATCH /api/v1/users/me` must use partial-update semantics: only fields present in the
  JSON request body are written; absent fields leave the stored value unchanged. A `null`
  value for `phone` explicitly clears the column. Implement this with a merge/patch
  approach rather than a full-replace PUT.
- The minimum-age check (criterion 10) must be calculated at the moment the request is
  processed using the server's current date; do not rely on the client's local date.
- `fitnessGoals` length validation should be enforced both at the API level (Bean
  Validation `@Size(max = 500)`) and in the frontend character counter to give early
  feedback.
- No concurrency concern: users can only edit their own record and concurrent self-edits
  from multiple sessions are an acceptable last-write-wins scenario; optimistic locking is
  not required.
- The membership status section on the profile page reads from the Zustand store populated
  on portal entry (as defined in the User Access Flow PRD). The profile page must not
  independently call `GET /api/v1/memberships/me`.
