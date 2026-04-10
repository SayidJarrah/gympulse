# SDD: Entity Image Management

## Reference
- PRD: `docs/prd/entity-image-management.md`
- Related docs:
  - `docs/prd/user-profile-management.md`
  - `docs/sdd/user-profile-management.md`
  - `docs/prd/scheduler.md`
  - `docs/sdd/scheduler.md`
  - `docs/prd/trainer-discovery.md`
  - `docs/sdd/trainer-discovery.md`
  - `docs/prd/group-classes-schedule-view.md`
  - `docs/sdd/group-classes-schedule-view.md`
- Date: 2026-04-03

## Architecture Overview
This feature adds first-party image upload and display for four entity families that
already exist in GymFlow:
- `UserProfile` for a member's own profile photo
- `Trainer` for admin-managed trainer photos
- `Room` for admin-managed room photos
- `ClassTemplate` for admin-managed class photos

The design deliberately extends the current implementation style instead of
introducing a separate media platform. Trainer photos already use `BYTEA` storage in
PostgreSQL plus a dedicated HTTP endpoint. The same pattern is applied to user
profiles, rooms, and class templates so the feature can be implemented against the
current codebase, Docker setup, and DTO conventions without adding object storage,
background image processing, or signed-URL infrastructure.

Core decisions (this SDD resolves the PRD storage strategy question by standardizing on
DB-backed binary storage in v1):
- binary image bytes are stored in the owning row as `BYTEA`
- MIME type is stored beside the bytes and must always be present when bytes exist
- accepted formats are `image/jpeg`, `image/png`, and `image/webp`
- max upload size is `5 MB` for every entity
- frontend upload flow is create/update entity first, then upload photo in the same UI
  flow once the entity ID exists
- trainer `profile_photo_url` remains readable for backward compatibility, but any new
  trainer photo upload clears that legacy field so the uploaded binary becomes the
  canonical image

Scope clarification for "class photo":
- the current backend does not have one monolithic `GymClass` entity; it has reusable
  `ClassTemplate` rows and scheduled `ClassInstance` rows
- in this version, the uploaded class photo belongs to `ClassTemplate`
- member-facing scheduled classes resolve their `classPhotoUrl` from the linked
  template when one exists; standalone instances without a template continue to render
  a visual fallback

Privacy model:
- user profile photos are private and remain auth-protected
- trainer, room, and class-template photos are public-read assets served from
  dedicated GET endpoints so the current React app can render them directly in
  `<img src>` without adding token-aware blob loaders everywhere

---

## 1. Database Changes

### New Tables
None.

### Modified Tables

```sql
-- V19__add_entity_image_columns.sql

ALTER TABLE user_profiles
  ADD COLUMN profile_photo_data      BYTEA,
  ADD COLUMN profile_photo_mime_type VARCHAR(50);

ALTER TABLE user_profiles
  ADD CONSTRAINT chk_user_profiles_profile_photo_consistency
    CHECK (
      (profile_photo_data IS NULL AND profile_photo_mime_type IS NULL) OR
      (profile_photo_data IS NOT NULL AND profile_photo_mime_type IS NOT NULL)
    );

ALTER TABLE rooms
  ADD COLUMN photo_data      BYTEA,
  ADD COLUMN photo_mime_type VARCHAR(50);

ALTER TABLE rooms
  ADD CONSTRAINT chk_rooms_photo_consistency
    CHECK (
      (photo_data IS NULL AND photo_mime_type IS NULL) OR
      (photo_data IS NOT NULL AND photo_mime_type IS NOT NULL)
    );

ALTER TABLE class_templates
  ADD COLUMN photo_data      BYTEA,
  ADD COLUMN photo_mime_type VARCHAR(50);

ALTER TABLE class_templates
  ADD CONSTRAINT chk_class_templates_photo_consistency
    CHECK (
      (photo_data IS NULL AND photo_mime_type IS NULL) OR
      (photo_data IS NOT NULL AND photo_mime_type IS NOT NULL)
    );
```

Notes:
- `trainers.photo_data` and `trainers.photo_mime_type` already exist in `V8`; no new
  trainer columns are required.
- No new indexes are needed. Image reads are always primary-key lookups by entity ID or
  by `user_id`.
- The existing row-level `updated_at` triggers remain valid; uploading or deleting an
  image updates the owning row and therefore bumps `updated_at`.
- No automatic backfill is required. Existing rows start with `NULL` image fields and
  continue to render existing initials / fallback imagery.

### Flyway Migration
`backend/src/main/resources/db/migration/V19__add_entity_image_columns.sql`

The current latest migration is `V18__add_class_instance_status_for_member_schedule.sql`,
so this feature takes `V19`.

---

## 2. Backend API Contract

### Shared Image Rules

All upload endpoints share the same validation rules:
- request type: `multipart/form-data`
- file field name: `photo`
- accepted MIME types: `image/jpeg`, `image/png`, `image/webp`
- max file size: `5 MB`
- unsupported type: `400 INVALID_IMAGE_FORMAT`
- oversized file: `400 IMAGE_TOO_LARGE`
- missing owning entity: `404 ..._NOT_FOUND`

Server-side behavior:
- the service validates `contentType` before reading bytes
- the service rejects empty payloads with `400 IMAGE_REQUIRED`
- the service stores raw bytes and MIME type exactly as uploaded; no resize,
  recompression, or crop is introduced in this version
- delete endpoints clear both byte and MIME columns together

### 2.1 User Profile

#### GET /api/v1/profile/me

Existing endpoint remains. Response is extended with:

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "alice@example.com",
  "firstName": "Alice",
  "lastName": "Brown",
  "phone": "+48123123123",
  "dateOfBirth": "1994-08-12",
  "fitnessGoals": ["Build strength"],
  "preferredClassTypes": ["Yoga"],
  "hasProfilePhoto": true,
  "profilePhotoUrl": "/api/v1/profile/me/photo",
  "createdAt": "2026-03-29T10:00:00Z",
  "updatedAt": "2026-04-03T09:30:00Z"
}
```

Rules:
- `hasProfilePhoto` is `true` when `profile_photo_data IS NOT NULL`
- `profilePhotoUrl` is `"/api/v1/profile/me/photo"` when a photo exists, else `null`
- because this endpoint requires Bearer auth, the frontend must load the actual image
  through an authenticated request and convert it to an object URL before assigning it
  to `<img src>`

#### POST /api/v1/profile/me/photo

**Auth:** Required. `USER` role only

**Success Response (200):**
```json
{
  "message": "Photo uploaded successfully"
}
```

**Error Responses:**

| Status | Error Code | Condition |
|--------|------------|-----------|
| 400 | `IMAGE_REQUIRED` | Multipart field `photo` missing or empty |
| 401 | `UNAUTHORIZED` | Missing or invalid Bearer token |
| 403 | `ACCESS_DENIED` | Authenticated caller is not `USER` |
| 400 | `IMAGE_TOO_LARGE` | File exceeds 5 MB |
| 400 | `INVALID_IMAGE_FORMAT` | File MIME type is not JPEG, PNG, or WEBP |

#### GET /api/v1/profile/me/photo

**Auth:** Required. `USER` role only

**Success Response (200):**
Raw image bytes with stored `Content-Type`

**Error Responses:**

| Status | Error Code | Condition |
|--------|------------|-----------|
| 401 | `UNAUTHORIZED` | Missing or invalid Bearer token |
| 403 | `ACCESS_DENIED` | Authenticated caller is not `USER` |
| 404 | `IMAGE_NOT_FOUND` | Caller has no stored profile photo |

#### DELETE /api/v1/profile/me/photo

**Auth:** Required. `USER` role only

**Success Response (204):** empty body

Delete behavior:
- if no photo exists, return `204` to keep removal idempotent
- only the authenticated user can delete their own profile photo

### 2.2 Trainer

Existing trainer read contracts remain, with one behavioral correction:
- when an admin uploads a binary trainer photo through `POST /api/v1/admin/trainers/{id}/photo`,
  the service must set `profile_photo_url = NULL`
- trainer response and discovery response continue to expose one resolved URL field
  `profilePhotoUrl` (canonical name per trainer-discovery.md — do not use `photoUrl` for trainers)

#### POST /api/v1/admin/trainers/{id}/photo

Existing endpoint remains. Behavior changes:
1. validate MIME type and size
2. store bytes in `photo_data`
3. store MIME in `photo_mime_type`
4. clear `profile_photo_url`

#### DELETE /api/v1/admin/trainers/{id}/photo

**Auth:** Required. `ADMIN` role only

**Success Response (204):** empty body

Delete behavior:
- clear `photo_data` and `photo_mime_type`
- do not restore `profile_photo_url`; if an admin wants an external URL again, that is a
  separate update action

#### GET /api/v1/trainers/{id}/photo

Existing endpoint remains public-read.

Cache behavior:
- send `Cache-Control: public, max-age=300`
- send `ETag` derived from `updated_at` to reduce repeated avatar downloads in trainer
  grids and profile pages

### 2.3 Rooms

`RoomResponse` is extended to:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "name": "Studio A",
  "capacity": 20,
  "description": "Yoga and mobility room",
  "hasPhoto": true,
  "photoUrl": "/api/v1/rooms/550e8400-e29b-41d4-a716-446655440010/photo",
  "createdAt": "2026-04-03T08:00:00Z"
}
```

`RoomSummaryResponse` is also extended with `photoUrl: String?` so room pickers and
compact room badges can show a thumbnail without fetching a second room payload.

#### POST /api/v1/admin/rooms/{id}/photo

**Auth:** Required. `ADMIN`

**Success Response (200):**
```json
{
  "message": "Photo uploaded successfully"
}
```

#### GET /api/v1/rooms/{id}/photo

Public-read raw image endpoint for room thumbnails.

#### DELETE /api/v1/admin/rooms/{id}/photo

**Auth:** Required. `ADMIN`

**Success Response (204):** empty body

### 2.4 Class Templates

`ClassTemplateResponse` is extended to:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440020",
  "name": "HIIT Bootcamp",
  "description": "High-energy interval training",
  "category": "Cardio",
  "defaultDurationMin": 60,
  "defaultCapacity": 20,
  "difficulty": "Intermediate",
  "room": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "name": "Studio A",
    "photoUrl": "/api/v1/rooms/550e8400-e29b-41d4-a716-446655440010/photo"
  },
  "hasPhoto": true,
  "photoUrl": "/api/v1/class-templates/550e8400-e29b-41d4-a716-446655440020/photo",
  "isSeeded": false,
  "createdAt": "2026-04-03T08:00:00Z",
  "updatedAt": "2026-04-03T09:00:00Z"
}
```

#### POST /api/v1/admin/class-templates/{id}/photo

**Auth:** Required. `ADMIN`

**Success Response (200):**
```json
{
  "message": "Photo uploaded successfully"
}
```

#### GET /api/v1/class-templates/{id}/photo

Public-read raw image endpoint for template cards and member schedule cards.

#### DELETE /api/v1/admin/class-templates/{id}/photo

**Auth:** Required. `ADMIN`

**Success Response (204):** empty body

### 2.5 Group Class Schedule Read Model

To make class photos appear in user-facing schedule surfaces, extend
`UserClassScheduleEntryResponse` with:

```json
{
  "id": "2bc2d77a-3725-4a1b-89c6-4b01fdbf7ec4",
  "name": "Pilates Core",
  "scheduledAt": "2026-03-31T08:30:00Z",
  "localDate": "2026-03-31",
  "durationMin": 45,
  "trainerNames": ["Jane Doe"],
  "classPhotoUrl": "/api/v1/class-templates/550e8400-e29b-41d4-a716-446655440020/photo"
}
```

Resolution logic:
1. if `ClassInstance.template` exists and linked `ClassTemplate.photo_data` is present,
   return `/api/v1/class-templates/{templateId}/photo`
2. otherwise return `null`

No photo column is added to `class_instances` in this version.

---

## 3. Backend Files / Classes to Create or Modify

### New Files

| File | Type | Purpose |
|------|------|---------|
| `backend/src/main/resources/db/migration/V19__add_entity_image_columns.sql` | Flyway migration | Adds profile / room / class-template image columns and consistency constraints |
| `backend/src/main/kotlin/com/gymflow/controller/UserProfilePhotoController.kt` | Controller | Exposes upload, fetch, and delete endpoints for `/api/v1/profile/me/photo` |
| `backend/src/main/kotlin/com/gymflow/controller/RoomPhotoController.kt` | Controller | Exposes room photo GET plus admin upload/delete |
| `backend/src/main/kotlin/com/gymflow/controller/ClassTemplatePhotoController.kt` | Controller | Exposes class-template photo GET plus admin upload/delete |
| `backend/src/main/kotlin/com/gymflow/service/PhotoValidationService.kt` | Service / utility | Centralizes MIME, size, and empty-file validation |

### Modified Files

| File | Change |
|------|--------|
| `backend/src/main/kotlin/com/gymflow/domain/UserProfile.kt` | Add `profilePhotoData` and `profilePhotoMimeType` |
| `backend/src/main/kotlin/com/gymflow/domain/Room.kt` | Add `photoData` and `photoMimeType` |
| `backend/src/main/kotlin/com/gymflow/domain/ClassTemplate.kt` | Add `photoData` and `photoMimeType` |
| `backend/src/main/kotlin/com/gymflow/dto/UserProfileResponse.kt` | Add `hasProfilePhoto` and `profilePhotoUrl` |
| `backend/src/main/kotlin/com/gymflow/dto/RoomResponse.kt` | Add `hasPhoto` and `photoUrl` |
| `backend/src/main/kotlin/com/gymflow/dto/RoomSummaryResponse.kt` | Add `photoUrl` |
| `backend/src/main/kotlin/com/gymflow/dto/ClassTemplateResponse.kt` | Add `hasPhoto` and `photoUrl` |
| `backend/src/main/kotlin/com/gymflow/dto/UserClassScheduleResponse.kt` | Add `classPhotoUrl` on entry DTO |
| `backend/src/main/kotlin/com/gymflow/service/UserProfileService.kt` | Resolve new profile photo fields and add upload/delete/fetch helpers |
| `backend/src/main/kotlin/com/gymflow/service/TrainerService.kt` | Clear `profilePhotoUrl` on upload; add delete-photo helper |
| `backend/src/main/kotlin/com/gymflow/service/RoomService.kt` | Add room photo upload/delete/fetch helpers and DTO mapping |
| `backend/src/main/kotlin/com/gymflow/service/ClassTemplateService.kt` | Add class-template photo upload/delete/fetch helpers and DTO mapping |
| `backend/src/main/kotlin/com/gymflow/service/UserClassScheduleService.kt` | Join template photo information into member schedule entries |
| `backend/src/main/kotlin/com/gymflow/controller/GlobalExceptionHandler.kt` | Map `IMAGE_REQUIRED` and reuse `INVALID_IMAGE_FORMAT`, `IMAGE_TOO_LARGE`, `IMAGE_NOT_FOUND` for all entities |
| `backend/src/main/kotlin/com/gymflow/config/SecurityConfig.kt` | Permit public GET on `/api/v1/trainers/*/photo`, `/api/v1/rooms/*/photo`, `/api/v1/class-templates/*/photo`; keep `/api/v1/profile/me/photo` authenticated |

Implementation notes:
- do not add a generic `media_assets` table in this phase; it is unnecessary complexity
  for one image per row
- room and class-template photo endpoints should set `Cache-Control: public, max-age=300`
- profile photo endpoint should set `Cache-Control: private, no-store`
- reusing the same error codes across entities keeps the frontend upload components small

---

## 4. Frontend Components to Create or Modify

### Types

Update the following TypeScript contracts:

```ts
export interface UserProfileResponse {
  userId: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  dateOfBirth: string | null
  fitnessGoals: string[]
  preferredClassTypes: string[]
  hasProfilePhoto: boolean
  profilePhotoUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface RoomResponse {
  id: string
  name: string
  capacity: number | null
  description: string | null
  hasPhoto: boolean
  photoUrl: string | null
  createdAt?: string
}

export interface RoomSummaryResponse {
  id: string
  name: string
  photoUrl: string | null
}

export interface ClassTemplateResponse {
  id: string
  name: string
  description: string | null
  category: ClassCategory
  defaultDurationMin: number
  defaultCapacity: number
  difficulty: Difficulty
  room: RoomSummaryResponse | null
  hasPhoto: boolean
  photoUrl: string | null
  isSeeded: boolean
  createdAt: string
  updatedAt: string
}

export interface UserClassScheduleEntryResponse {
  id: string
  name: string
  scheduledAt: string
  localDate: string
  durationMin: number
  trainerNames: string[]
  classPhotoUrl: string | null
}
```

### New / Updated API Functions

Add:
- `uploadMyProfilePhoto(file: File): Promise<void>`
- `deleteMyProfilePhoto(): Promise<void>`
- `getMyProfilePhotoBlob(): Promise<Blob>`
- `uploadRoomPhoto(id: string, file: File): Promise<void>`
- `deleteRoomPhoto(id: string): Promise<void>`
- `uploadClassTemplatePhoto(id: string, file: File): Promise<void>`
- `deleteClassTemplatePhoto(id: string): Promise<void>`
- `deleteTrainerPhoto(id: string): Promise<void>`

Keep:
- `uploadTrainerPhoto(id, file)` and `getTrainerPhotoUrl(id)`

### Pages / Components

| Component | Change |
|-----------|--------|
| `frontend/src/pages/profile/UserProfilePage.tsx` | Replace decorative icon-only header with real avatar area, upload CTA, remove-photo action, and preview state |
| `frontend/src/components/profile/UserProfileForm.tsx` | Surface photo actions above the form body so profile image and profile details live in one place |
| `frontend/src/components/layout/Navbar.tsx` | Render the member's profile photo instead of email initials when available; fall back to initials |
| `frontend/src/pages/admin/AdminTrainersPage.tsx` | No contract change beyond honoring the corrected trainer photo precedence |
| `frontend/src/components/trainers/TrainerFormModal.tsx` | Allow selecting a photo during create flow; after successful create, immediately call upload endpoint if a file is queued |
| `frontend/src/components/trainers/TrainerPhotoUpload.tsx` | Add remove-photo action and expose upload success callback |
| `frontend/src/pages/admin/AdminRoomsPage.tsx` | Add photo column / thumbnail to the room list |
| `frontend/src/components/rooms/RoomFormModal.tsx` | Add photo picker with two-step create-then-upload behavior |
| `frontend/src/components/scheduler/RoomPicker.tsx` | Render optional room thumbnail in selected state and search results |
| `frontend/src/components/scheduler/ClassTemplateCard.tsx` | Stop using hard-coded Unsplash imagery when `template.photoUrl` exists; fallback imagery remains only for templates without uploaded photos |
| `frontend/src/components/scheduler/ClassTemplateFormModal.tsx` | Add class photo picker with two-step create-then-upload behavior |
| `frontend/src/pages/schedule/GroupClassesSchedulePage.tsx` and related schedule cards | Render `classPhotoUrl` when present in member schedule entries |

### State / Data Loading

User profile photo needs one small state addition:
- create a lightweight `profileSummaryStore` or extend the existing profile store so
  `Navbar` can read `firstName`, `lastName`, and a resolved avatar source without
  fetching the full editable profile on every route change
- the profile photo blob loader should cache an object URL and revoke it when replaced

Room / class / trainer photos do not need special blob loaders because their GET
endpoints are public-read and can be used directly as image sources.

### Relevant Display Surfaces

This feature treats "all relevant sections" as the places where each entity is already a
primary visual subject in the current app:
- user: profile page header and top navigation avatar
- trainer: admin trainer table, trainer discovery cards, trainer profile page
- room: admin room list, room picker, room references embedded in class-template cards
- class: admin class-template cards and member-facing schedule cards

The feature does not force images into every narrow table cell or every text-only badge.
If a surface currently does not visually foreground the entity, fallback text remains
acceptable in v1.

---

## 5. Task List per Agent

### -> backend-dev
- Create `V19__add_entity_image_columns.sql`.
- Add image fields to `UserProfile`, `Room`, and `ClassTemplate`.
- Extend DTOs with resolved `photoUrl` / `hasPhoto` fields.
- Implement `UserProfilePhotoController`, `RoomPhotoController`, and
  `ClassTemplatePhotoController`.
- Refactor shared upload validation into one helper service.
- Update `TrainerService.uploadPhoto()` so upload clears `profile_photo_url`.
- Add `deletePhoto()` methods for trainer, room, class template, and user profile.
- Extend member schedule query / mapping to emit `classPhotoUrl`.
- Update `SecurityConfig` for the new public GET photo endpoints.
- Add controller and service tests for all four entity photo flows.

### -> frontend-dev
- Add reusable image-upload UI fragment that supports preview, remove, inline validation,
  and post-save upload chaining.
- Update the profile page and navbar to display the member's uploaded photo.
- Update trainer create/edit flow so photo can be selected during create, not only after
  editing an existing trainer.
- Update room create/edit flow with room photo upload and thumbnail rendering.
- Update class-template create/edit flow with class photo upload and uploaded-photo
  precedence over hard-coded fallback imagery.
- Update member schedule cards to show `classPhotoUrl` when present.
- Add tests covering fallback rendering, upload success, remove-photo behavior, and
  failed upload validation states.

### -> ui_ux_designer
- Define a single upload interaction pattern reused across profile, trainer, room, and
  class-template forms.
- Specify avatar, rectangular room image, and class hero-image treatments that fit the
  existing GymFlow dark visual language.
- Define empty and error states for missing photos so fallback initials / placeholders
  remain intentional rather than broken-looking.
- Provide mobile behavior for upload controls and schedule cards with class imagery.

### -> qa / e2e
- Cover user profile photo upload, persistence, replacement, and deletion.
- Cover trainer create-with-photo and trainer photo replacement.
- Cover room and class-template create-with-photo flows.
- Verify uploaded class images appear in admin template cards and the member schedule.
- Verify file-type and size validation for all upload surfaces.

---

## 6. Open Questions / Resolved Assumptions

1. **Class photo ownership**
   Photo ownership is assigned to `ClassTemplate`, not `ClassInstance`, because the
   current system stores reusable class metadata on templates. This avoids duplicate
   image columns and keeps scheduled instances lightweight.

2. **Legacy trainer external URLs**
   `profile_photo_url` remains readable for already-seeded or manually migrated data, but
   new uploads must supersede it by clearing the field on upload.

3. **Future scale**
   If GymFlow later needs multiple images per entity, cropping, CDN delivery, or admin
   bulk media management, revisit this feature and move to a dedicated media subsystem.
   That is intentionally out of scope for this version.
