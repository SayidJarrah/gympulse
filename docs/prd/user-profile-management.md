# PRD: User Profile Management

## Overview
The User Profile Management feature gives authenticated end users a self-service
place to view and maintain the personal details that make the GymFlow portal useful
and supportable. In this version, the profile is intentionally lightweight: it
captures identity and contact basics plus optional fitness-context fields that are
common in fitness apps and relevant to future personalization. The feature must keep
PII minimal, so login identity remains separate from the editable profile and fields
such as emergency contacts, medical history, and government identifiers are excluded.

This feature is available to any authenticated account with role `USER`, regardless
of whether that account currently qualifies as a Guest or a Member under membership
status rules. A user without an active membership may still view and edit their own
profile.

### Profile Field Model

**Essential profile fields in scope**
- `email` - read-only, sourced from the auth user record, never editable here
- `firstName` - editable
- `lastName` - editable

**Optional profile fields in scope**
- `phone` - editable
- `dateOfBirth` - editable
- `fitnessGoals` - editable list of short free-text goals
- `preferredClassTypes` - editable list of short free-text preferences
- `emergencyContact` - optional object with `name` and `phone` (added in member-profile-redesign, 2026-04-18)

## Goals
- Allow authenticated users to view and update their own personal profile without
  admin or front-desk intervention.
- Capture the minimum set of profile data that fitness users reasonably expect in a
  gym portal: name, contact details, lightweight goals/preferences, and an emergency contact.
- Keep authentication identity stable by making `email` visible but read-only in this
  feature.
- Avoid collecting unnecessary sensitive data while still creating a foundation for
  later personalization features.
- Surface membership status, booking usage, and renewal information on the profile page
  so members have a single destination for account management (added 2026-04-18).

## User Roles Involved
- **User** (authenticated `USER` role) - can view and edit only their own profile.
- **Guest** (unauthenticated visitor) - no access; must register and log in first.
- **Admin** - no dedicated capability in this feature; admin management of user data
  is out of scope for this version.

## User Stories

### Happy Path Stories
- As an authenticated user, I want to open my profile page and see my current details
  in one place so that I know what information the system has about me.
- As an authenticated user, I want to update my first name, last name, phone number,
  and date of birth so that my profile stays accurate over time.
- As an authenticated user, I want to add my fitness goals so that the app can better
  reflect my intent and support future personalization.
- As an authenticated user, I want to add my preferred class types so that my profile
  better matches the activities I am interested in.
- As an authenticated user, I want to record an emergency contact name and phone so
  that the gym has someone to call if needed.
- As an authenticated user, I want my changes to be saved and visible the next time I
  visit the profile page so that I trust the system.
- As an authenticated user, I want to see my membership plan, booking usage, and renewal
  date on my profile page so that I do not have to navigate to a separate page for that
  information (added 2026-04-18).

### Edge Case Stories
- As an unauthenticated visitor, I want to be prevented from viewing profile data so
  that private information is never exposed publicly.
- As an authenticated user, I want to be prevented from changing my login email in the
  profile form so that account identity changes follow a separate, controlled process.
- As an authenticated user, I want a clear validation error when I enter an invalid
  phone number so that I know how to fix it.
- As an authenticated user, I want a clear validation error when I enter a date of
  birth in the future so that impossible values are not stored.
- As an authenticated user, I want a clear validation error when I submit too many or
  overly long goals/preferences so that data remains usable and consistent.
- As an authenticated user, I want to be prevented from accessing any other user's
  profile, so that profile privacy is enforced by design.

## Acceptance Criteria

1. `GET /api/v1/profile/me` requires a valid Bearer token for a `USER` role account and
   returns HTTP 200 with the caller's profile.
2. The profile response body contains:
   `userId`, `email`, `firstName`, `lastName`, `phone`, `dateOfBirth`,
   `fitnessGoals`, `preferredClassTypes`, `createdAt`, `updatedAt`.
3. `GET /api/v1/profile/me` returns HTTP 200 even when the caller has never completed
   a profile before; in that case all editable fields are returned as `null` or empty
   arrays, while `email` and `userId` are still populated.
4. `GET /api/v1/profile/me` without authentication returns HTTP 401 with error code
   `UNAUTHORIZED`.
5. `GET /api/v1/profile/me` with an authenticated account that does not have role
   `USER` returns HTTP 403 with error code `ACCESS_DENIED`.
6. `PUT /api/v1/profile/me` creates or updates the caller's profile and returns HTTP
   200 with the fully updated profile object.
7. `PUT /api/v1/profile/me` accepts the editable fields:
   `firstName`, `lastName`, `phone`, `dateOfBirth`, `fitnessGoals`,
   `preferredClassTypes`.
8. `email`, `role`, `membershipStatus`, and `userId` are read-only in this feature.
   If any of those fields are submitted to `PUT /api/v1/profile/me`, the server returns
   HTTP 400 with error code `READ_ONLY_FIELD`.
9. `firstName` is optional, but if provided it must contain at least 1 non-whitespace
   character and no more than 50 characters; otherwise the server returns HTTP 400 with
   error code `INVALID_FIRST_NAME`.
10. `lastName` is optional, but if provided it must contain at least 1 non-whitespace
    character and no more than 50 characters; otherwise the server returns HTTP 400
    with error code `INVALID_LAST_NAME`.
11. `phone` is optional, but if provided it must be a valid international phone number
    in a normalized format of at most 20 characters; otherwise the server returns
    HTTP 400 with error code `INVALID_PHONE`.
12. `dateOfBirth` is optional, but if provided it must be a valid calendar date that is
    not in the future; otherwise the server returns HTTP 400 with error code
    `INVALID_DATE_OF_BIRTH`.
13. `fitnessGoals` is optional and is stored as an ordered list of free-text values.
    The list may contain at most 5 items, and each item must be between 1 and 50
    characters after trimming; otherwise the server returns HTTP 400 with error code
    `INVALID_FITNESS_GOALS`.
14. `preferredClassTypes` is optional and is stored as an ordered list of free-text
    values. The list may contain at most 5 items, and each item must be between 1 and
    50 characters after trimming; otherwise the server returns HTTP 400 with error code
    `INVALID_PREFERRED_CLASS_TYPES`.
15. Duplicate values within `fitnessGoals` are de-duplicated case-insensitively before
    persistence, preserving the first occurrence order.
16. Duplicate values within `preferredClassTypes` are de-duplicated case-insensitively
    before persistence, preserving the first occurrence order.
17. `PUT /api/v1/profile/me` without authentication returns HTTP 401 with error code
    `UNAUTHORIZED`.
18. A user can only access their own profile through `/me`; there is no endpoint in this
    feature that accepts an arbitrary `userId` from the client.
19. Successful updates modify `updatedAt`; `createdAt` is set the first time a profile
    record is created and remains unchanged on later edits.
20. If a user clears an optional scalar field (`phone`, `dateOfBirth`) by submitting it
    as `null`, the field is stored as `null`.
21. If a user clears an optional list field (`fitnessGoals`, `preferredClassTypes`) by
    submitting an empty array, the field is stored as an empty array.
22. `emergencyContact` is optional. If provided, both `name` and `phone` must be non-blank
    strings (name ≤ 100 chars, phone ≤ 30 chars); otherwise the server returns HTTP 400
    with error code `INVALID_EMERGENCY_CONTACT`. Submitting `null` clears the field.
    (Added 2026-04-18)
23. The profile page at `/profile` displays the member's active membership plan name,
    booking usage bar, renewal date, and price in a Membership Control card alongside
    the Personal Information card. (Added 2026-04-18)
24. The profile page includes Account Actions — sign out, change password, cancel
    membership — in a full-width row below the two-column grid. Cancel membership
    opens a confirmation dialog before firing the mutation. (Added 2026-04-18)

## Out of Scope (for this version)
- Changing login identity fields such as `email` or `password` - that belongs to the
  Auth/account-management space.
- Profile photo or avatar upload — shipped as part of original feature; change photo
  button on profile page is wired.
- Medical history, injury notes, waiver data, or other high-sensitivity PII.
- Membership pause flow — deferred (stub toast only in this iteration).
- Change plan flow — navigates to `/pricing?intent=change` (existing pricing page).
- Update payment method — deferred (stub toast only; Stripe integration out of scope).
- Attendance history, booking history, or activity timeline.
- Favorites, saved trainers, or recommendation logic based on goals/preferences.
- Admin viewing or editing user profiles.
- Audit trail or version history of profile changes.

## Open Questions
All major scope questions resolved by BA assumptions on 2026-03-29:

1. **Email editing** - Not allowed in this feature. The profile page displays email as
   read-only because it is the account login identifier.
2. **Profile photo** - Deferred. It is a common consumer-app feature, but excluding file
   upload keeps the first version smaller and avoids introducing media storage scope.
3. **Goals and preferences modelling** - Use short free-text lists rather than a fixed
   taxonomy in v1, so the product can learn what users actually enter before locking
   into enums.
4. **Membership dependency** - No active membership is required to manage profile data.
   Profile management is available to all authenticated `USER` accounts.

## Technical Notes for the Architect
- Model profile data in a separate `user_profiles` table keyed one-to-one by `user_id`,
  rather than expanding the auth-focused `users` table with optional profile concerns.
- `GET /api/v1/profile/me` should left-join the user and profile records so the endpoint
  can return HTTP 200 for first-time users even before a profile row exists.
- `PUT /api/v1/profile/me` should be implemented as an upsert inside a transaction.
- `fitnessGoals` and `preferredClassTypes` can be stored as JSON/JSONB arrays or in a
  normalized child table; either approach is acceptable as long as order is preserved
  and duplicates are removed consistently.
- `phone` should be normalized before persistence so the frontend and backend do not
  drift on formatting rules.
- Keep PII minimization explicit in the design: do not add sensitive profile fields to
  this first migration unless a later PRD requires them.
