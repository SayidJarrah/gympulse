# Gap Report: user-profile-management
Date: 2026-04-05

---

## DOCS → CODE Gaps

### Missing Functionality

- **V14 migration missing `profile_photo_data` / `profile_photo_mime_type` columns.**
  The SDD `V14__create_user_profiles_table.sql` spec defines only the seven profile
  fields listed in Section 1. The photo columns were added later in
  `V19__add_entity_image_columns.sql`. The `UserProfile` entity and service already
  use those columns, but the SDD never documents this schema extension. Anyone reading
  the SDD sees an incomplete picture of the table.

- **`UserProfileService` constructor takes a third dependency (`PhotoValidationService`)
  not listed in the SDD.**
  SDD Section 3 states constructor dependencies are `UserProfileRepository` and
  `UserRepository` only. The real constructor is
  `UserProfileService(userProfileRepository, userRepository, photoValidationService)`.
  The SDD task list for `backend-dev` is therefore incomplete.

- **Photo upload/download/delete endpoints not documented in the SDD.**
  Three endpoints are fully implemented but absent from SDD Section 2:
  `POST /api/v1/profile/me/photo`, `GET /api/v1/profile/me/photo`,
  `DELETE /api/v1/profile/me/photo`, and
  `GET /api/v1/admin/users/{userId}/photo` (`AdminUserProfilePhotoController`).
  The PRD explicitly places "Profile photo or avatar upload" out of scope, yet the
  code ships it.

- **`UserProfileResponse` has two undocumented fields: `hasProfilePhoto` and
  `profilePhotoUrl`.**
  SDD Section 3 DTO spec omits these. Both are present in the actual DTO and
  consumed by the frontend `profileStore.ts` to load and display the photo blob.

- **`UserProfile` entity has two undocumented fields: `profilePhotoData` and
  `profilePhotoMimeType`.**
  SDD Section 3 Entity Field Specification does not list these fields.

- **Frontend `UserProfile` type has two undocumented fields: `hasProfilePhoto` and
  `profilePhotoUrl`.**
  SDD Section 4 (New Types) omits these from the `UserProfile` interface. The actual
  `src/types/userProfile.ts` includes them.

- **`profileStore.ts` has multiple undocumented state members and actions.**
  SDD Section 4 (State shape) defines the store without `avatarUrl`, `uploadPhoto`,
  `deletePhoto`, `ensureProfileLoaded`, `resetProfile`, and `setSuccessMessage`. All
  are present and actively used in production code.

- **`UserProfileForm` accepts photo-related props not present in the SDD interface.**
  SDD Section 4 defines `UserProfileFormProps` without `avatarUrl`, `onUploadPhoto`,
  `onDeletePhoto`, or `onSetSuccessMessage`.

- **`ProfileChipInput` interface differs from SDD spec.**
  SDD defines `helperText` as required; the implementation makes it optional
  (`helperText?: string`). SDD also omits the `disabled` and `maxItems` props that
  exist in the implementation.

- **`src/utils/profileErrors.ts` contains four undocumented error codes.**
  SDD Section 4 lists seven codes in `PROFILE_ERROR_MESSAGES`. The implementation
  adds `IMAGE_REQUIRED`, `INVALID_IMAGE_FORMAT`, `IMAGE_TOO_LARGE`, and
  `IMAGE_NOT_FOUND` to support photo operations.

- **AC 8 — test coverage missing for `userId`, `role`, `membershipStatus` shadow fields.**
  `UserProfileServiceTest` has one test for `READ_ONLY_FIELD` that only passes `email`.
  No test asserts that `userId`, `role`, or `membershipStatus` in the request body
  triggers the same exception.

### Broken Flows

- **AC 5 — design spec "access denied" state is not implemented.**
  The design spec (Flow 5 / "Error state: Access denied") defines a distinct full-page
  state with `LockClosedIcon`, heading "Access denied", and a ghost "Back to classes"
  link. `UserProfilePage.tsx` renders the generic error card (`ExclamationTriangleIcon`,
  "Unable to load profile") for all GET failures including 403. The access-denied and
  fetch-failure paths are merged into one state with no role distinction. PROFILE-04
  E2E currently tests for the generic heading and "Retry" button, not the spec's
  access-denied card.

- **AC 4 / AC 17 (401 without auth) — E2E test missing.**
  None of the four E2E specs test the unauthenticated path. The backend enforces it
  correctly; the frontend redirect from `AuthRoute` is not tested.

### Design Divergence

- **Page heading says "My Profile" instead of "Your Profile".**
  Design spec `ProfilePageHeader` specifies `h1` text `"Your Profile"`. The
  implementation renders `"My Profile"` (`UserProfilePage.tsx` line 54).

- **Page background token is `bg-[#0B0F12]` instead of `bg-[#0F0F0F]`.**
  Design spec and design-system token both specify `bg-[#0F0F0F]`. The implementation
  uses `bg-[#0B0F12]` (`UserProfilePage.tsx` line 36).

- **Two-column desktop layout (`ProfileSummaryCard` + `UserProfileFormCard`) is absent.**
  The design spec defines
  `lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-6` with a
  `ProfileSummaryCard` on the left and `UserProfileFormCard` on the right. The
  implemented page has no `ProfileSummaryCard` component. This is a structural layout
  divergence, not minor styling.

- **`ProfileSummaryCard` is not implemented.**
  The spec defines a detailed aside with: a `h-16 w-16` initials badge
  (`bg-green-500/10 text-green-400 ring-1 ring-green-500/30`), a nested dark box for
  read-only "Account email" with helper note, a completeness-based helper copy line,
  and a "Last updated {timestamp}" caption. None of these exist in the implementation.

- **`UserProfileFormCard` layout does not match the spec.**
  The spec defines one card with a header section, content section, and a right-aligned
  footer save button. The implementation uses three separate `<section>` blocks
  ("Account profile", "Training preferences", and a save footer strip).

- **Read-only email uses `disabled` in addition to `readOnly`.**
  Design spec and Accessibility Note 3 both require `readOnly` + `aria-readonly="true"`
  only — not `disabled` — so the value remains selectable. The implementation adds
  `disabled` (`UserProfileForm.tsx` line 287), which prevents text selection and
  applies the disabled visual style.

- **Success/error banners are above the form, not inside the form card.**
  The design spec places banners at the top of `UserProfileFormCard`'s content area.
  The implementation renders them in the page container above the form.

- **`ProfileChipInput` "maximum reached" copy differs from spec.**
  Design spec rule 4 says: "the text input is replaced with `Maximum reached`."
  The implementation renders `"Maximum of {maxItems} items reached."`
  (`ProfileChipInput.tsx` line 113).

- **`ProfileChipInput` Backspace-removes-last-chip interaction is not implemented.**
  Design spec interaction rule 5: "Pressing Backspace with an empty input removes the
  last chip." No `Backspace` key handler exists in `ProfileChipInput.tsx`.

- **Focus management on failed submit / successful save is not implemented.**
  Design spec Accessibility Note 5: on failed submit, focus moves to the first invalid
  field; on successful save, focus moves to the success banner. Neither
  `UserProfilePage.tsx` nor `UserProfileForm.tsx` implements this.

- **Success banner is missing `aria-live="polite"`.**
  Design spec specifies `aria-live="polite"` on the success banner. The success `<div>`
  in `UserProfilePage.tsx` (lines 104-110) has `role="status"` but no `aria-live`.

- **No benchmark citation in the design spec.**
  Design standards require a `Benchmark:` line in every screen design.
  `docs/design/user-profile-management.md` contains no benchmark citation.

### Missing Test Coverage

The existing E2E spec (`frontend/e2e/user-profile-management.spec.ts`) has four tests
(PROFILE-01 through PROFILE-04). AC coverage status:

| AC | Description | Status |
|----|-------------|--------|
| AC1 | GET 200 with valid token | Partial — no direct API assertion |
| AC2 | Response body shape | Partial — UI fields only, raw shape never asserted |
| AC3 | First-time user 200 with nulls/empty | Covered (UI) |
| AC4 | GET 401 without auth | **Missing** |
| AC5 | GET 403 non-USER role | Partial — HTTP status never asserted; UI state is wrong spec |
| AC6 | PUT 200 with updated profile | Covered |
| AC7 | PUT accepts all editable fields | Covered |
| AC8 | Read-only fields → 400 READ_ONLY_FIELD | **Missing** |
| AC9 | Invalid firstName → 400 INVALID_FIRST_NAME | **Missing** |
| AC10 | Invalid lastName → 400 INVALID_LAST_NAME | **Missing** |
| AC11 | Invalid phone → INVALID_PHONE | Partial — client-side only; backend path untested |
| AC12 | Future dateOfBirth → 400 INVALID_DATE_OF_BIRTH | **Missing** |
| AC13 | fitnessGoals overflow → 400 INVALID_FITNESS_GOALS | **Missing** |
| AC14 | preferredClassTypes overflow → 400 INVALID_PREFERRED_CLASS_TYPES | **Missing** |
| AC15 | fitnessGoals de-duplication | **Missing** |
| AC16 | preferredClassTypes de-duplication | **Missing** |
| AC17 | PUT 401 without auth | **Missing** |
| AC18 | No arbitrary userId endpoint | **Missing** |
| AC19 | updatedAt advances on save | **Missing** |
| AC20 | Clear scalar field → null | **Missing** |
| AC21 | Clear list field → empty array | **Missing** |

**Summary:** 3 ACs covered, 2 partial, 16 missing or structurally wrong.

Additional missing coverage:
- Backspace-removes-last-chip — no unit test in `ProfileChipInput.test.tsx`
- Photo upload, delete, and error flows — no E2E or integration specs
- Two-phase save (profile success + photo upload failure) — no spec

---

## CODE → DOCS Gaps

### Undocumented Endpoints / Logic

- `POST /api/v1/profile/me/photo` — upload profile photo; `USER` role only.
- `GET /api/v1/profile/me/photo` — fetch own profile photo bytes; `USER` role only.
- `DELETE /api/v1/profile/me/photo` — remove own profile photo; `USER` role only.
- `GET /api/v1/admin/users/{userId}/photo` — fetch any user's photo; `ADMIN` role only.
- `UserProfileService.uploadMyProfilePhoto`, `getMyProfilePhoto`,
  `getProfilePhotoForAdmin`, `deleteMyProfilePhoto` — none appear in the SDD.
- `PhotoValidationService` — referenced in `UserProfileService` constructor but not
  mentioned anywhere in the SDD.
- `profileStore.ensureProfileLoaded` — lazy-load guard called by `Navbar`; not in SDD.
- `profileStore.resetProfile` — clears state and revokes the avatar blob URL on logout;
  not in SDD.

### Undocumented UI

- `EntityImageField` component (`frontend/src/components/media/EntityImageField.tsx`)
  used inside `UserProfileForm` for photo upload/preview/remove; not mentioned in SDD
  or design spec.
- The photo upload affordance (avatar preview, upload button, remove button,
  status/error message) inside `UserProfileForm` has no design spec coverage.
- `frontend/src/utils/entityImage.ts` — blob URL management utility used by the
  profile store; not referenced in SDD.

### Undocumented Behaviours

- **Two-phase save:** when a photo is queued, the form first PUTs the profile text
  fields, then POSTs the photo only if the text save succeeds. On full success the
  banner reads "Profile updated. Photo updated."; on photo-only failure it reads
  "Profile updated." with a separate photo error. This is not in the SDD or design spec.
- **Navbar eagerly loads profile and avatar** for `USER` accounts on mount via
  `ensureProfileLoaded`, displaying the avatar in the top-right avatar circle across
  all pages. Not in the SDD.
- **Admin users navigating to `/profile`** see the generic "Unable to load profile"
  error card rather than a distinct "Access denied" state, because both 403 and
  network errors share the same `showStandaloneError` branch.
- **`deleteMyProfilePhoto` is a no-op** when `profilePhotoData` and
  `profilePhotoMimeType` are already null (returns without calling `save`). Correct
  behaviour but undocumented.

### Untested Code Paths

- Photo upload error path (wrong format, too large, missing file) — no E2E or
  integration test for `POST /api/v1/profile/me/photo` returning 400.
- Photo delete where no photo exists — the no-op early return is not tested.
- `GET /api/v1/profile/me/photo` returning 404 when no photo exists — not tested.
- `GET /api/v1/admin/users/{userId}/photo` — no test of any kind.
- `ensureProfileLoaded` short-circuit when profile is already loaded — no unit test.
- `profileStore.resetProfile` avatar blob URL revocation — no test.
- Two-phase save where profile text succeeds but photo upload fails — no E2E or
  unit test covers this partial-success path.
- Comma key as chip entry trigger — no spec exercises this path.
- Chip removal via X button and re-save — no spec verifies the chip is excluded from
  the next PUT payload.
- Input hidden when max chips reached — no spec reaches this state via UI interaction.

---

## Suggested Fix Order

1. **Implement the distinct access-denied state** (design spec Flow 5): detect
   `ACCESS_DENIED` error code in `UserProfilePage` and render the `LockClosedIcon`
   card with "Back to classes" link separately from the generic fetch-failure card.
   This is the only item that affects correctness of a documented AC (AC5).

2. **Fix the read-only email field**: remove the `disabled` attribute; keep only
   `readOnly` + `aria-readonly="true"` to match the design spec and Accessibility
   Note 3.

3. **Implement the two-column desktop layout with `ProfileSummaryCard`**: initials
   badge, account-email panel, completeness helper copy, and last-updated timestamp.

4. **Move success/error banners inside the `UserProfileFormCard`** content area.

5. **Add `aria-live="polite"` to the success banner** in `UserProfilePage.tsx`.

6. **Add focus management**: on failed submit focus the first invalid field; on
   successful save focus the success banner.

7. **Implement Backspace-removes-last-chip** in `ProfileChipInput`.

8. **Fix "Maximum reached" copy** in `ProfileChipInput` (currently
   "Maximum of N items reached.").

9. **Fix page heading** from "My Profile" to "Your Profile" and background token
   from `bg-[#0B0F12]` to `bg-[#0F0F0F]`.

10. **Update the SDD** to document the photo sub-feature: add the four photo endpoints
    to Section 2, photo fields to entity and DTO specs in Section 3, photo-related
    store members to Section 4, and `PhotoValidationService` as a service dependency.

11. **Add missing E2E coverage**: unauthenticated redirect (AC4/AC17), clear-to-null
    scalar (AC20), clear-to-empty list (AC21), duplicate chip de-duplication
    (AC15/AC16), and at least one photo upload happy-path spec.

12. **Add a Benchmark Citation** to `docs/design/user-profile-management.md`.
