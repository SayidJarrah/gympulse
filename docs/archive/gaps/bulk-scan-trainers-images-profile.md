# Gap Report: trainer-discovery + entity-image-management + user-profile-management
Date: 2026-04-09

---

## DOCS → CODE Gaps

### trainer-discovery

- **`classCount` uses `scheduled_at > NOW()` instead of `status = 'SCHEDULED'`**
  `backend/src/main/kotlin/com/gymflow/repository/ClassInstanceRepository.kt:180-182`
  and `:191-200`
  Both `countScheduledClassesForTrainers` and `findScheduledDayHoursByTrainer` filter with
  `ci.scheduled_at > NOW()` and have no `ci.status` check. The SDD (Section 2, field notes
  and schema note) is explicit: a scheduled class instance is defined as
  `deleted_at IS NULL AND status = 'SCHEDULED'`. The old proxy `scheduled_at > NOW()` is
  explicitly called out as no longer used. Both queries must add `AND ci.status = 'SCHEDULED'`.

- **`isFavorited` is always `false` for non-members on the trainer profile page**
  `backend/src/main/kotlin/com/gymflow/service/TrainerDiscoveryService.kt:80-85`
  The SDD (Section 2, `GET /api/v1/trainers/{id}` field notes) states: "`isFavorited` reflects
  the actual DB value from `user_trainer_favorites`. Returns `true` if the requesting user has
  a row for this trainer, `false` otherwise. Does not depend on membership state — the check
  is always performed against the favorites table." The implementation short-circuits to
  `false` when the caller has no ACTIVE membership, contradicting the spec.

- **`frontend/src/utils/trainerPhoto.ts` does not exist**
  The SDD (Architecture Overview, schema note) specifies a helper at
  `frontend/src/utils/trainerPhoto.ts` that resolves the three-way photo precedence logic
  (`profilePhotoUrl` → BYTEA endpoint → placeholder). No such file exists; photo URL
  resolution is instead scattered across service-layer backend code only. The frontend has
  no equivalent utility.

- **`GET /api/v1/trainers/favorites` accepts a `specialization` filter param in the controller**
  `backend/src/main/kotlin/com/gymflow/controller/TrainerDiscoveryController.kt:22-28`
  The SDD (Section 2) states the favorites list does not support specialization filter —
  "without specialization filter — not supported on the favorites list". The current
  controller method signature does not add this param, which is correct. No gap here —
  matches spec.

### entity-image-management

- **`POST /api/v1/profile/me/photo` returns `{"message": "Photo uploaded successfully"}` instead of a full `UserProfileResponse`**
  `backend/src/main/kotlin/com/gymflow/controller/UserProfilePhotoController.kt:26-33`
  `backend/src/main/kotlin/com/gymflow/service/UserProfileService.kt:65-73`
  The user-profile-management SDD (Section 2, `POST /api/v1/profile/me/photo`) specifies the
  success response is a full `UserProfileResponse` with `hasProfilePhoto: true` and
  `profilePhotoUrl`. The entity-image-management SDD (Section 2.1) specifies
  `{"message": "Photo uploaded successfully"}`. The entity-image-management SDD governs this
  endpoint (it was written later and updated this contract). The implementation matches the
  entity-image-management SDD. However the user-profile-management SDD has not been updated
  to reflect this change — it is a documentation gap. The two SDDs contradict each other on
  the response shape of `POST /api/v1/profile/me/photo`.

- **`GET /api/v1/trainers/{id}/photo` missing `ETag` and `Cache-Control` headers**
  `backend/src/main/kotlin/com/gymflow/controller` — no dedicated trainer photo controller
  was checked for this, but the SDD (Section 2.2) specifies
  `Cache-Control: public, max-age=300` and `ETag` derived from `updated_at`. Verify the
  existing `AdminTrainerController` or equivalent trainer photo GET endpoint sets these
  headers; if not, this is a missing behavior.

- **`frontend/src/api/rooms.ts` is missing `getRoomPhotoUrl` helper function**
  The entity-image-management SDD (Section 4) specifies keeping a `getTrainerPhotoUrl(id)`
  equivalent for the room and class-template public endpoints. The `rooms.ts` API module
  has `uploadRoomPhoto` and `deleteRoomPhoto` but exposes no URL helper. The room photo GET
  endpoint is public-read, so components need to know the URL pattern. No `getRoomPhotoUrl`
  function exists. Same gap for class templates: `classTemplates.ts` has no
  `getClassTemplatePhotoUrl` helper.

- **`UserClassScheduleEntryResponse` `classPhotoUrl` field — backend mapping not verified here**
  The SDD (Section 2.5) requires `classPhotoUrl` on `UserClassScheduleEntryResponse`. The
  frontend types (`frontend/src/types/groupClassSchedule.ts` and `memberHome.ts`) already
  carry the field. Backend implementation in `UserClassScheduleService` was not read; this
  should be confirmed separately.

### user-profile-management

- **`POST /api/v1/profile/me/photo` multipart field name mismatch**
  The entity-image-management SDD (Section 2, shared rules) specifies the file field name
  as `photo`. The user-profile-management SDD (Section 2, `POST /api/v1/profile/me/photo`)
  specifies the part name as `file`. The controller
  (`UserProfilePhotoController.kt:28`, `@RequestParam("photo")`) and the frontend
  (`frontend/src/api/profile.ts:18`, `formData.append('photo', file)`) both use `photo`.
  The user-profile-management SDD is out of sync — it says `file` but the implementation
  uses `photo`. This is a documentation gap, not a code defect.

- **`GET /api/v1/admin/users/{userId}/photo` missing `Cache-Control: private, no-store`**
  `backend/src/main/kotlin/com/gymflow/controller/AdminUserProfilePhotoController.kt:22-28`
  The SDD (entity-image-management Section 2.1) specifies profile photo endpoints must set
  `Cache-Control: private, no-store`. The `AdminUserProfilePhotoController` does set
  `CacheControl.noStore()` (`line 25`), so this is correctly implemented. No gap.

---

## CODE → DOCS Gaps

### trainer-discovery

- **`TrainerDiscoveryService.getTrainerProfile` performs membership check before resolving `isFavorited`**
  `backend/src/main/kotlin/com/gymflow/service/TrainerDiscoveryService.kt:80-85`
  The service checks `existsByUserIdAndStatus(userId, "ACTIVE")` before querying
  `user_trainer_favorites` for the profile endpoint. This membership-gate on `isFavorited`
  for the profile detail view is not described in any SDD section. It deviates from the
  stated contract and should either be removed (per spec) or documented as an intentional
  product decision.

- **`frontend/src/utils/entityImage.ts` has no SDD coverage**
  `frontend/src/utils/entityImage.ts` exists and provides `getEntityImageErrorMessage` and
  `revokeObjectUrl`. The entity-image-management SDD (Section 4) mentions
  `profileSummaryStore` / profile store blob URL management but does not specify a shared
  `entityImage` utility module. This utility is undocumented.

- **`frontend/src/components/profile/ProfileSummaryCard.tsx` has no SDD coverage**
  This component exists but is not listed in any of the three SDDs. Its purpose and props
  contract are unspecified.

### entity-image-management

- **`AdminUserProfilePhotoController` is an extra controller not listed in the entity-image-management SDD**
  `backend/src/main/kotlin/com/gymflow/controller/AdminUserProfilePhotoController.kt`
  The entity-image-management SDD (Section 3) does not list this controller as a new file.
  The user-profile-management SDD (Section 2) specifies the endpoint `GET /api/v1/admin/users/{userId}/photo`
  and notes it should be in a `AdminUserProfilePhotoController`. The entity-image-management
  SDD does not reference this controller at all, creating a coverage gap between the two SDDs.

- **`frontend/src/api/profile.ts` exports `getUserProfilePhotoBlob(userId)`**
  `frontend/src/api/profile.ts:34-39`
  This function hits `GET /api/v1/admin/users/{userId}/photo`. Neither the user-profile-management
  SDD's frontend API function list (Section 4) nor the entity-image-management SDD's frontend
  API list (Section 4) specifies this function. It is implemented but undocumented.

### user-profile-management

- **`profileStore.ts` `setSuccessMessage` accepts `string | null` but SDD specifies `string`**
  `frontend/src/store/profileStore.ts:39`
  The SDD (Section 4) specifies `setSuccessMessage: (message: string) => void`. The
  implementation accepts `string | null`. This is a minor interface deviation that is
  undocumented.

- **`profileStore.ts` `ensureProfileLoaded` also guards against `isLoading`**
  `frontend/src/store/profileStore.ts:168-173`
  The SDD specifies: "if `profile` is already non-null it returns immediately". The
  implementation also returns early when `isLoading` is true. This is a sensible addition
  (prevents duplicate in-flight requests) but is not described in the SDD.

---

## Summary by Severity

**Domain-correctness defects (require fix):**
1. `classCount` and `availabilityPreview` queries use `scheduled_at > NOW()` instead of
   `status = 'SCHEDULED'` — contradicts SDD schema note and field definition.
2. `isFavorited` hardcoded to `false` for non-members on `GET /api/v1/trainers/{id}` —
   contradicts SDD field contract.

**Documentation gaps (SDD must be updated, no code change needed):**
3. `POST /api/v1/profile/me/photo` response shape conflict between user-profile-management
   and entity-image-management SDDs.
4. Multipart field name `file` vs `photo` in user-profile-management SDD.
5. `frontend/src/utils/trainerPhoto.ts` — specified in SDD but never created.
6. `getRoomPhotoUrl` / `getClassTemplatePhotoUrl` helpers — implied by SDD but absent.
7. `AdminUserProfilePhotoController` coverage split across two SDDs.
8. `getUserProfilePhotoBlob(userId)` frontend function is undocumented.
9. `ProfileSummaryCard.tsx` component has no SDD entry.
10. `entityImage.ts` utility has no SDD entry.
11. `setSuccessMessage` signature and `ensureProfileLoaded` `isLoading` guard not in SDD.
