# Design: Entity Image Management

## Reference
- Design system: `docs/design/system.md`
- Existing surfaces impacted: `docs/design/user-profile-management.md`, `docs/design/trainer-discovery.md`, `docs/design/group-classes-schedule-view.md`, `docs/design/scheduler.md`
- Prototype: `docs/design/prototypes/entity-image-management.html`
- Date: 2026-04-03

## Benchmark

Nike Training Club trainer and class profile screens — each entity has one primary photo with a consistent circular (person) or rectangular (class) crop. Upload is embedded inline in the edit form rather than a separate media manager. Fallback states (initials, category art) are styled and never leave an empty placeholder. Chosen because it keeps the upload interaction predictable across all four entity types and matches the GymFlow visual language.

## Scope
This feature introduces one primary image per supported entity and defines where that image is uploaded, how it is previewed, and where it is displayed afterward.

Entities in scope:
- `User` profile photo
- `Trainer` profile photo
- `Room` photo
- `Class` photo

Current-codebase mapping:
- User photo is managed on `/profile`.
- Trainer photo is managed from `/admin/trainers`.
- Room photo is managed from `/admin/rooms`.
- Class creation currently happens through class templates, so the class photo is attached in `/admin/class-templates` and inherited by downstream class-instance and member schedule surfaces.

This spec deliberately extends the existing dark GymFlow visual language instead of adding a new media subsystem with its own styling rules.

## Design Goals
- Make image upload feel native to each existing form instead of like a separate asset-management tool.
- Keep all four entity types on one interaction model so validation, messaging, and fallback behavior stay predictable.
- Show images only where they add recognition value. Dense calendar surfaces keep text-first layouts.
- Preserve strong fallback states so the UI still reads cleanly before any image exists.

## Shared Interaction Model

### Component: `EntityImageField`

Purpose: Reusable upload field used by profile, trainer, room, and class surfaces.

Variants:

| Variant | Used for | Preview ratio | Fallback |
|--------|----------|---------------|----------|
| `avatar` | User, Trainer | `1:1` circle | initials or person glyph |
| `room` | Room | `4:3` rounded rectangle | building glyph + room name |
| `cover` | Class | `16:9` rounded rectangle | category or gradient placeholder |

Base shell:

```jsx
<section className="rounded-2xl border border-gray-800 bg-[#0F0F0F] p-5">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
    <div className="shrink-0">{/* preview */}</div>
    <div className="min-w-0 flex-1">{/* copy, dropzone, actions, errors */}</div>
  </div>
</section>
```

Empty dropzone:
- `rounded-xl border-2 border-dashed border-gray-700 bg-[#0F0F0F]/60 px-5 py-6 transition-colors duration-200 hover:border-gray-500`
- Icon:
  - avatar: `UserCircleIcon h-8 w-8 text-gray-500`
  - room/cover: `PhotoIcon h-8 w-8 text-gray-500`
- Primary copy: `Click to upload or drag and drop`
- Secondary copy: `JPEG, PNG or WEBP - max 5 MB`

Preview behavior:
- All previews use `object-cover`.
- Preview never stretches the source image.
- The original asset is center-cropped in v1. Crop, rotate, and focal-point editing are explicitly out of scope.

Actions:
- `Upload photo` or `Upload image` is the primary action when no persisted asset exists.
- `Replace` is a secondary action shown after an image exists.
- `Remove` is a ghost-destructive action shown only when a persisted asset exists or a queued file is present.

Status and helper messages:

| State | Message | Visual treatment |
|------|---------|------------------|
| Idle | `JPEG, PNG or WEBP - max 5 MB` | `text-xs text-gray-500` |
| Queued | `Ready to upload after save.` | `text-xs text-blue-400` |
| Uploading | `Uploading image...` | spinner + disabled actions |
| Success | `Photo updated.` / `Image updated.` | `text-xs text-green-400` |
| Invalid format | `File must be JPEG, PNG or WEBP.` | `text-xs text-red-400` |
| File too large | `File exceeds the 5 MB limit.` | `text-xs text-red-400` |
| Generic failure | `Upload failed. Try again.` | `text-xs text-red-400` |

Create-mode behavior:
- In create mode the user can select a file before the entity exists.
- The file is held in local UI state and the form footer CTA remains the single primary action.
- On submit, metadata is created first. If creation succeeds and a file is queued, upload starts automatically before the modal closes.
- If metadata save succeeds but the image upload fails, the modal stays open, the entity is already created, and the upload area shows retry copy instead of discarding the file silently.

Edit-mode behavior:
- The currently stored image appears immediately.
- Selecting a new file updates the local preview before upload.
- `Remove` opens a lightweight confirm step only for persisted images. Queued-but-unsaved selections can be discarded immediately.

### Image Display Rules

- Use uploaded assets wherever the entity is primarily identified by face, place, or program branding.
- Do not add images to ultra-dense admin scheduler calendar cards. That surface stays text-first.
- When no image exists, always show a stable fallback instead of collapsing the media slot.

Fallback rules by entity:
- User: initials badge in navbar and profile hero.
- Trainer: initials badge everywhere trainer identity is shown.
- Room: building glyph plus subtle gradient tile.
- Class: existing category-based fallback art remains the fallback only when no uploaded class image exists.

## User Flows

### Flow 1: User uploads or replaces their profile photo
1. Authenticated user opens `/profile`.
2. The existing hero card and profile form load as today.
3. A new `Profile photo` section appears at the top of the form card.
4. User selects a valid file. The preview updates immediately and helper text changes to `Ready to upload`.
5. User clicks `Save changes`.
6. Profile data saves, then the photo upload runs automatically.
7. On success:
   - the hero card switches from icon/initials to the uploaded photo
   - the navbar avatar switches to the uploaded photo on the same page session
   - the success banner reads `Profile updated. Photo updated.`

### Flow 2: Admin creates a trainer with a queued photo
1. Admin opens `Add Trainer`.
2. The modal includes a top-level `Profile photo` field above the text fields.
3. Admin selects a file before the trainer exists.
4. Admin completes the trainer details and clicks `Save Trainer`.
5. The system creates the trainer, then uploads the queued photo automatically.
6. On success, the trainers table row and downstream trainer cards use the uploaded photo.

### Flow 3: Admin creates a room with a queued photo
1. Admin opens `Add Room`.
2. The modal includes a `Room photo` field below the title and before the scalar fields.
3. Admin selects a file and sees a 4:3 preview card.
4. On `Save`, the room record is created first and the photo upload follows automatically.
5. The new photo appears in the rooms table and room picker.

### Flow 4: Admin creates a class template with a queued cover image
1. Admin opens `Add Class Template`.
2. A `Class image` cover-upload field appears before the form fields.
3. Admin chooses a cover image while setting category, duration, capacity, room, and description.
4. On `Save Template`, the template is created first and the queued image uploads second.
5. On success:
   - the class template card uses the uploaded image instead of category stock art
   - class palette tiles and member-facing schedule details inherit the same image

### Flow 5: Recoverable upload failure after successful entity creation
1. The create request succeeds, but the image upload fails.
2. The modal stays open.
3. A non-blocking red inline banner explains that the entity was created but the image was not uploaded.
4. Actions shown:
   - `Retry upload`
   - `Save without image`
5. The user never loses the created entity because of a media failure.

## Screen Updates

### Screen: User Profile (`/profile`)

This screen should follow the current implemented page shell in `frontend/src/pages/profile/UserProfilePage.tsx`, not the older split-summary layout from the earlier profile design doc.

#### Hero card update
- Replace the generic `UserCircleIcon` tile with a profile identity block:
  - avatar: `h-18 w-18 rounded-2xl object-cover`
  - fallback: `rounded-2xl bg-green-500/10 text-green-300 ring-1 ring-green-500/20`
- Keep the current headline and supporting copy.
- Add metadata line under the copy when a photo exists: `Visible anywhere your GymFlow account is represented.`

#### New section: `ProfilePhotoPanel`
- Position: first section inside `UserProfileForm`, above `Email`.
- Title: `Profile photo`
- Helper copy: `Use a clear headshot so your account is easier to recognize across GymFlow.`
- Variant: `avatar`
- Primary actions:
  - no stored photo: `Upload photo`
  - stored photo: `Replace photo`
  - always show `Remove` when stored photo exists

#### Downstream user surfaces in scope
- `Navbar` account avatar
- profile hero card
- any future user-only account chip that currently shows initials should consume the same image token

### Screen: Admin Trainers (`/admin/trainers`)

#### `TrainerFormModal`
- Keep the existing form shell and place the image field above the name/email fields.
- Reuse the avatar variant and keep the current dashed upload styling.
- Section title remains `Profile Photo`.
- Preview size increases from `64x64` to `88x88` to match the profile page and improve perceived quality.
- Footer CTA remains single-path:
  - create mode: `Save Trainer`
  - edit mode: `Save Changes`

#### `AdminTrainersPage` table
- Keep the current table structure but turn the name cell into a compact media object:

```jsx
<div className="flex items-center gap-3">
  <img className="h-10 w-10 rounded-full object-cover" />
  <div>
    <p className="font-medium text-white">{name}</p>
    <p className="text-xs text-gray-500">{email}</p>
  </div>
</div>
```

#### Member-facing trainer surfaces
- `TrainerCard` and `TrainerProfilePage` continue to use trainer photos when present.
- No additional layout changes are required beyond ensuring the uploaded source is used consistently.

### Screen: Admin Rooms (`/admin/rooms`)

#### `RoomFormModal`
- Add a new first body section: `Room photo`
- Variant: `room`
- Helper copy: `Show the space members should expect when they arrive.`
- Preview ratio: `4:3`
- Because rooms are place-oriented rather than person-oriented, the preview is rectangular, not circular.

#### `AdminRoomsPage` table
- Remove the separate visual distinction between a photo column and a name column.
- Instead, update the `Name` column cell to a media object:

```jsx
<div className="flex items-center gap-3">
  <div className="h-10 w-12 overflow-hidden rounded-lg border border-gray-800 bg-gray-900">
    {/* room image or building fallback */}
  </div>
  <span className="font-medium text-white">{room.name}</span>
</div>
```

#### `RoomPicker`
- Add a `32x32` thumbnail to each option row.
- Selected trigger uses the same thumbnail on the left of the room name.
- Keep capacity hint on the right.
- Empty-state option remains text only.

Relevant room display surfaces in scope for this phase:
- room form modal
- rooms table
- room picker in class template and class instance editing

Room photos are intentionally not forced into every scheduler surface because the room name is currently absent from most member-facing class cards.

### Screen: Admin Class Templates (`/admin/class-templates`)

#### `ClassTemplateFormModal`
- Add a top `Class image` field above the existing form fields.
- Variant: `cover`
- Preview ratio: `16:9`
- Helper copy: `Use a representative image for the class members will browse in schedules and details.`

#### `ClassTemplateCard`
- Uploaded image is the first-choice art source.
- If no uploaded image exists, keep the current category/seeded fallback behavior.
- Card header and action buttons remain unchanged.

Art-source priority:
1. uploaded class image
2. existing seeded image by template name
3. existing category fallback image
4. generic fallback

#### `ClassPalette`
- Add a compact `40x40` thumbnail on the left of each tile when an uploaded image exists.
- If no image exists, keep the current category color dot.

### Screen: Member Group Classes (`/schedule`)

#### `GroupScheduleEntryCard`
- Day and list views add a leading `40x40` rounded thumbnail.
- Week view stays image-free because the card density is already high and the photo would crowd time and trainer data.
- Layout for day/list:

```jsx
<button className="flex w-full items-start gap-3 rounded-xl border border-gray-800 bg-[#0F0F0F] p-4">
  <div className="h-10 w-10 overflow-hidden rounded-lg bg-gray-900">{/* class image */}</div>
  <div className="min-w-0 flex-1">{/* existing name/time/trainer text */}</div>
</button>
```

#### `GroupScheduleEntryModal`
- Add a `16:9` hero image at the top of the modal body.
- Below the image keep the current read-only summary grid.
- If the selected class has no uploaded image, use the same class fallback art as the admin template card.

#### `GroupSchedulePage` dense-surface rule
- Do not add photos to the week-grid cells or admin scheduler instance cards.
- Those surfaces remain text-first for scan speed.

## Component States

| Component | Empty | Queued | Uploading | Error | Persisted |
|-----------|-------|--------|-----------|-------|-----------|
| `EntityImageField` avatar | initials/person fallback + dashed dropzone | local preview + `Ready to upload after save.` | disabled actions + spinner | inline error text under actions | stored photo preview + `Replace` / `Remove` |
| `EntityImageField` room | building fallback tile | 4:3 room preview | disabled actions + spinner | inline error text | stored room photo preview |
| `EntityImageField` cover | gradient/category fallback tile | 16:9 cover preview | disabled actions + spinner | inline error text | stored cover preview |
| `NavbarAvatar` | initials circle | n/a | n/a | n/a | circular user photo |
| `RoomPickerOption` | building fallback tile | n/a | skeleton row only | red helper under trigger | room photo thumbnail |
| `ClassTemplateCard` | fallback art | n/a | skeleton card only | page-level toast if fetch fails | uploaded cover image |
| `GroupScheduleEntryModal` | fallback art | n/a | modal still opens from local data | inline stale-entry error as today | uploaded class cover |

## Responsive Behaviour
- Mobile:
  - `EntityImageField` stacks preview above copy/actions.
  - Upload buttons become full width where the parent form already uses full-width actions.
  - Day/list schedule cards keep the `40x40` thumbnail; it must not exceed one text line in height.
- Tablet and desktop:
  - avatar upload fields use side-by-side preview + controls
  - room and cover upload fields may use wider preview rails with action blocks aligned to the right
- No horizontal scrolling is introduced by image fields or table media objects.

## Accessibility
- Every upload field needs a visible `<label>` and a hidden native file input linked by `htmlFor`.
- Preview images require meaningful alt text:
  - user: `Current profile photo`
  - trainer: `Current trainer photo`
  - room: `Current room photo`
  - class: `Current class image`
- Decorative fallback icons use `aria-hidden="true"`.
- Upload progress uses `aria-live="polite"` on the status line.
- Remove actions use explicit labels such as `Remove class image`.
- When an upload error occurs after create succeeds, focus moves to the inline error banner inside the still-open modal.

## Notes For Implementation
- This spec supersedes photo-specific portions of the older scheduler design where only trainer upload was described.
- The class image should replace hardcoded stock imagery in `ClassTemplateCard` whenever an uploaded image URL is available.
- This phase does not introduce crop tooling, galleries, multiple images, or per-instance class-image overrides.
