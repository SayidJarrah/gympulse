# Design: Scheduler (Admin)

> Feature slug: `scheduler`
> Covers: Trainer Profiles (`/admin/trainers`) + Room Management (`/admin/rooms`) + Class Templates + Weekly Calendar (`/admin/scheduler`)
> Role: ADMIN only — all screens in this spec are inaccessible to USER and GUEST roles.
> Last updated: 2026-03-26

---

## User Flows

### Flow 1 — Trainer lifecycle (create → assign → delete)

1. Admin navigates to `/admin/trainers` via sidebar ("Trainers" link).
2. Admin sees paginated table of existing trainers, sorted by last name A–Z.
3. Admin types into the search bar — table filters live (debounced 300 ms).
4. Admin clicks "Add Trainer" button — `TrainerFormModal` opens in create mode.
5. Admin fills required fields (first name, last name, email) and optional fields, then clicks "Save Trainer".
6. On success (201) the modal closes and the new row appears at the top of the table.
7. Admin clicks the photo icon button on a row — `TrainerPhotoUpload` panel opens inside the same modal (or inline). Admin selects a JPEG/PNG/WEBP file, previews it, clicks "Upload".
8. Admin clicks the edit icon on a row — `TrainerFormModal` opens in edit mode with prepopulated values.
9. Admin clicks the delete icon on a row — system calls `DELETE /api/v1/admin/trainers/{id}`.
   - If `TRAINER_HAS_ASSIGNMENTS` (409): `TrainerDeleteConfirmModal` opens listing affected class instances.
   - Admin confirms: system calls `DELETE .../trainers/{id}?force=true`. Trainer is removed.
   - Admin cancels: modal closes, no change.

### Flow 1b — Room lifecycle (create → assign → delete)

1. Admin navigates to `/admin/rooms` via sidebar ("Rooms" link).
2. Admin sees paginated table of existing rooms, sorted by name A–Z.
3. Admin types into the search bar — table filters live (debounced 300 ms).
4. Admin clicks "Add Room" button — `RoomFormModal` opens in create mode.
5. Admin fills in the Name (required) and optional Capacity and Description fields, then clicks "Save".
6. On success (201) the modal closes and the new row appears in the table.
7. Admin clicks the edit icon on a row — `RoomFormModal` opens in edit mode with prepopulated values.
8. Admin clicks the delete icon on a row — system calls `DELETE /api/v1/rooms/{id}`.
   - If no instances are assigned (204 immediately or 200 with empty list): `RoomDeleteConfirmModal` opens in State 1 (simple confirmation). Admin confirms — room is deleted.
   - If `ROOM_HAS_INSTANCES` (200 with affected list): `RoomDeleteConfirmModal` opens in State 2 (amber warning + affected instances). Admin confirms — system calls `DELETE .../rooms/{id}?force=true`. Room is deleted and cleared from all listed instances.
   - Admin cancels: modal closes, no change.

### Flow 2 — Class template lifecycle

1. Admin navigates to `/admin/class-templates` via sidebar (sub-item under Scheduler section, or separate page).
2. Admin sees card grid of templates (seeded templates visible on first visit).
3. Admin uses the search input and category filter dropdown to narrow the list.
4. Admin clicks "Add Template" — `ClassTemplateFormModal` opens.
5. Admin fills all fields, clicks "Save Template".
6. On success the modal closes and the new card appears in the grid.
7. Admin clicks the edit icon on a card — modal reopens in edit mode.
8. Admin clicks the delete icon on a card:
   - If `CLASS_TEMPLATE_HAS_INSTANCES` (409): `ClassTemplateDeleteConfirmModal` opens listing affected instances.
   - Admin confirms: system calls `DELETE .../class-templates/{id}?force=true`. Template removed; instances become standalone.
   - Admin cancels: modal closes, no change.

### Flow 3 — Building the weekly schedule

1. Admin navigates to `/admin/scheduler`.
2. Page loads current ISO week from `?week=` URL param (defaults to current week on first load).
3. `WeekCalendarGrid` renders with 7 day columns (Mon–Sun) and 32 time rows (06:00–22:00, 30-min slots).
4. `ClassPalette` sidebar on the left shows draggable template tiles.
5. Admin drags a template tile and drops it onto a target slot — a new `ClassInstanceCard` appears immediately (optimistic), and `POST /api/v1/admin/class-instances` fires in the background.
   - On success: card is confirmed with the returned `id`.
   - On failure: card is removed (rollback), toast error shown.
6. Admin clicks an existing `ClassInstanceCard` — `ClassInstanceEditPanel` (slide-over) opens.
7. Admin edits fields and clicks "Save Changes" — `PATCH /api/v1/admin/class-instances/{id}` fires.
   - On `TRAINER_SCHEDULE_CONFLICT` (409): inline red error appears on the trainer multi-select; form is NOT dismissed.
   - On success: panel closes, card updates.
8. Admin drags an existing card to a different slot — optimistic update; `PATCH` fires.
9. Admin clicks the trash icon in the edit panel — `DeleteInstanceConfirmDialog` appears. On confirm, `DELETE` fires.
10. Admin clicks "Copy Week" button — `CopyWeekConfirmModal` opens showing the count. On confirm, `POST /api/v1/admin/class-instances/copy-week` fires.
11. Admin clicks "Import" button — `ImportModal` opens. Admin uploads CSV.
    - If `IMPORT_FORMAT_INVALID` (400): full-error state shown in modal.
    - If partial success: summary report screen shown within modal (imported count, rejected rows table).
12. Admin clicks "Export" button — `ExportMenu` dropdown opens. Admin selects CSV or iCal — file downloads immediately.
13. Admin uses `WeekNavigator` Back/Forward buttons — URL updates to `?week=YYYY-Www`; new week data loads.

### Flow 4 — Conflict states

1. **Trainer double-booking (hard block):** Admin assigns a trainer to an instance that overlaps with another. `PATCH` returns 409 `TRAINER_SCHEDULE_CONFLICT`. Red error message appears inline below the trainer multi-select. Admin must adjust trainers or time before saving.
2. **Room soft conflict (amber warning):** Two instances share the same room at overlapping times. Both cards render an amber left border and an amber "Room conflict" badge. Admin may click a conflicted card, review, and save anyway — no hard block.
3. **Unassigned trainer (visual indicator):** A class instance with `trainers.length === 0` renders with a red left border and an "Unassigned" error badge on the card.

---

## Screens & Components

### Admin Sidebar — Navigation Order

The admin sidebar (`AdminSidebar.tsx`) includes the following links for this feature, in this order. Uses the system.md 6H Sidebar component.

| Order | Label | Route | Icon (Heroicons outline) |
|-------|-------|-------|--------------------------|
| ... | Trainers | `/admin/trainers` | `UserGroupIcon` |
| ... | Class Templates | `/admin/class-templates` | `RectangleGroupIcon` |
| ... | Rooms | `/admin/rooms` | `BuildingOfficeIcon` |
| ... | Scheduler | `/admin/scheduler` | `CalendarDaysIcon` |

"Rooms" sits between "Class Templates" and "Scheduler" in the admin section group, since rooms are supporting data consumed by both the template form and the scheduler. The exact surrounding items (e.g. Dashboard, Memberships) follow the overall admin nav order defined in `AdminSidebar.tsx`; this spec only constrains the relative order of the four items above.

---

### Screen: Admin Trainer List (`/admin/trainers`)

**Who sees it:** ADMIN only
**Layout:** Full admin shell — sidebar (collapsible) on the left, main content area on the right. Page heading row at top, search bar + "Add Trainer" button in a toolbar below the heading, then the data table filling the remaining height, pagination controls at the bottom.

```
[Sidebar] | [Page heading: "Trainers"]
          | [Search input ............] [Add Trainer btn]
          | [Table: Last name | First name | Email | Phone | Specialisations | Actions]
          | [Row] [Row] [Row] ...
          | [Pagination: < 1 2 3 >]
```

#### PageHeader

- Text: `text-3xl font-bold leading-tight text-white` — "Trainers"
- Sub-label: `text-sm text-gray-400` — "{totalElements} trainers"
- Tailwind structure: `flex items-center justify-between mb-6`

#### SearchToolbar

- Left: Search input (see system.md 6B Search variant), `placeholder="Search by name or email"`, width `max-w-xs`
- Right: "Add Trainer" Primary button with `PlusIcon h-4 w-4`
- Tailwind structure: `flex items-center justify-between gap-4 mb-4`

#### TrainerTable

Extends the system.md Table component (6F) with columns:

| Column | Source field | Notes |
|--------|-------------|-------|
| Photo | `hasPhoto` | 32x32 avatar circle — `GET /api/v1/trainers/{id}/photo` if `hasPhoto`, else initials fallback (`bg-gray-800 text-gray-400 text-xs font-semibold`) |
| Last Name | `lastName` | `font-medium text-white` |
| First Name | `firstName` | `text-white` |
| Email | `email` | `text-gray-400` |
| Phone | `phone` | `text-gray-400`; "—" if null |
| Specialisations | `specialisations` | Up to 3 neutral badges (`text-xs`); "+N more" neutral badge if > 3 |
| Actions | — | Edit ghost icon button (`PencilIcon`), Delete ghost icon button (`TrashIcon text-red-400`) |

- Default sort: `lastName,asc` — Last Name column header shows `ChevronUpIcon text-green-400`
- Empty state icon: `UserGroupIcon h-6 w-6 text-gray-500`
- Empty state text: "No trainers found" / "Add your first trainer to get started."
- Skeleton loading: 5 rows × all columns, each cell replaced by `animate-pulse rounded bg-gray-800` bar

#### Pagination

Standard controls: `< Prev  Page 1 of N  Next >` using Ghost buttons and `text-sm text-gray-400`.
Tailwind structure: `flex items-center justify-between pt-4 border-t border-gray-800 mt-4`

---

### Component: TrainerFormModal

**Trigger:** "Add Trainer" button (create mode) or row Edit button (edit mode)
**Size:** `max-w-lg` (560px) — Modal 6E md size
**Title:** "Add Trainer" / "Edit Trainer"

#### Fields

| Field | Input type | Required | Constraints | Error |
|-------|-----------|----------|-------------|-------|
| First Name | text | Yes | max 100 chars | "First name is required" |
| Last Name | text | Yes | max 100 chars | "Last name is required" |
| Email | email | Yes | unique | "Email is required" / "A trainer with this email already exists" |
| Phone | text | No | max 30 chars | — |
| Bio | textarea | No | max 1000 chars | Character counter `{n}/1000 text-xs text-gray-500`; "Bio must be 1000 characters or fewer" |
| Specialisations | tag-input | No | max 10 tags, each max 50 chars | "Maximum 10 specialisations" / "Each tag must be 50 characters or fewer" |

**Specialisations tag input (new pattern — TagInput):** Text input that converts each entry on Enter or comma into a removable chip using the Neutral badge variant with an `XMarkIcon` remove button. When 10 tags are present, the text input is hidden and replaced by `text-xs text-gray-500 "Maximum reached"`.

Tailwind structure for form body: `flex flex-col gap-5 px-6 py-6`

Two-column row for First/Last Name: `grid grid-cols-2 gap-4`

Footer actions: Cancel (Ghost) + Save Trainer (Primary, loading state while submitting).

**Photo upload section** (visible in edit mode only, below the form fields, separated by `border-t border-gray-800 pt-5 mt-1`): see `TrainerPhotoUpload` below.

#### TrainerPhotoUpload

- Label: `text-sm font-semibold text-gray-300` — "Profile Photo"
- Upload area: `flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-700 p-6 text-center cursor-pointer hover:border-gray-500 transition-colors duration-200`
  - Icon: `PhotoIcon h-8 w-8 text-gray-500`
  - Text: `text-sm text-gray-400` — "Click to upload or drag and drop"
  - Subtext: `text-xs text-gray-500` — "JPEG, PNG or WEBP — max 5 MB"
- When a file is selected: show a 64x64 preview circle (`object-cover rounded-full`) beside the upload area, plus a "Remove" Ghost sm button.
- Error states:
  - `INVALID_PHOTO_FORMAT`: `text-xs text-red-400` — "File must be JPEG, PNG or WEBP"
  - `PHOTO_TOO_LARGE`: `text-xs text-red-400` — "File exceeds the 5 MB limit"
- Upload trigger: "Upload Photo" Primary sm button — fires `POST /api/v1/admin/trainers/{id}/photo`

---

### Component: TrainerDeleteConfirmModal

**Trigger:** Delete icon button on a trainer row, after `TRAINER_HAS_ASSIGNMENTS` (409) is returned
**Size:** `max-w-sm` (400px) — Modal 6E sm size
**Title:** "Delete Trainer?"

#### Layout

```
[Warning icon — ExclamationTriangleIcon h-5 w-5 text-red-400]
"Deleting [First Last] will remove them from the following classes.
Those classes will become unassigned."

[Affected instances list]
  • Yoga Flow — Mon 28 Apr · 09:00
  • HIIT Bootcamp — Tue 29 Apr · 07:30
  (scrollable if > 5 items: max-h-40 overflow-y-auto)

Footer: [Cancel (Ghost)] [Delete Trainer (Destructive)]
```

- Affected instance list: `space-y-1 mt-3` — each item is `text-sm text-gray-400` with a `CalendarIcon h-3.5 w-3.5 inline mr-1 text-gray-500`
- The Destructive button triggers `DELETE .../trainers/{id}?force=true`

---

### Screen: Admin Rooms (`/admin/rooms`)

**Who sees it:** ADMIN only
**Layout:** Same admin shell as the Trainers page — sidebar on the left, main content area on the right. Page heading row at top, search bar + "Add Room" button in a toolbar below the heading, then a data table filling the remaining height, pagination controls at the bottom.

```
[Sidebar] | [Page heading: "Rooms"]
          | [Search input ............] [Add Room btn]
          | [Table: Name | Capacity | Description | Actions]
          | [Row] [Row] [Row] ...
          | [Pagination: < 1 2 3 >]
```

#### PageHeader

- Text: `text-3xl font-bold leading-tight text-white` — "Rooms"
- Sub-label: `text-sm text-gray-400` — "{totalElements} rooms"
- Tailwind structure: `flex items-center justify-between mb-6`

#### SearchToolbar

- Left: Search input (system.md 6B Search variant), `placeholder="Search by name"`, `max-w-xs`
- Right: "Add Room" Primary button with `PlusIcon h-4 w-4`
- Tailwind structure: `flex items-center justify-between gap-4 mb-4`

#### RoomTable

Extends the system.md Table component (6F) with columns:

| Column | Source field | Notes |
|--------|-------------|-------|
| Name | `name` | `font-medium text-white` |
| Capacity | `capacity` | `text-gray-400`; blank cell (dash "—") if `null` |
| Description | `description` | `text-gray-400 truncate max-w-xs`; "—" if null; single line, truncated with `overflow-hidden whitespace-nowrap text-ellipsis` |
| Actions | — | Edit ghost icon button (`PencilIcon`), Delete ghost icon button (`TrashIcon text-red-400`) |

- Default sort: `name,asc` — Name column header shows `ChevronUpIcon text-green-400`
- Empty state icon: `BuildingOfficeIcon h-6 w-6 text-gray-500`
- Empty state text: "No rooms found" / "Add your first room to get started."
- Skeleton loading: 5 rows × all columns, each cell replaced by `animate-pulse rounded bg-gray-800` bar

#### Pagination

Standard controls: `< Prev  Page 1 of N  Next >` using Ghost buttons and `text-sm text-gray-400`.
Tailwind structure: `flex items-center justify-between pt-4 border-t border-gray-800 mt-4`

---

### Component: RoomFormModal

**Trigger:** "Add Room" button (create mode) or row Edit button (edit mode)
**Size:** `max-w-lg` (560px) — Modal 6E md size
**Title:** "Add Room" / "Edit Room"

#### Fields

| Field | Input type | Required | Constraints | Error |
|-------|-----------|----------|-------------|-------|
| Name | text | Yes | max 100 chars; unique | "Name is required" / "A room with this name already exists" |
| Capacity | number | No | min 1; `type="number" min="1"` | — |
| Description | textarea | No | max 500 chars; character counter `{n}/500 text-xs text-gray-500` | "Description must be 500 characters or fewer" |

- Capacity helper text: `text-xs text-gray-500 mt-1` — "Limits visible in room picker"
- Error `ROOM_NAME_CONFLICT` (409): inline error below Name field — "A room with this name already exists"
- Error `VALIDATION_ERROR` (422): field-level errors below each failing input

Footer: Cancel (Ghost) + Save (Primary, loading state while submitting)

Tailwind structure for form body: `flex flex-col gap-5 px-6 py-6`

---

### Component: RoomDeleteConfirmModal

**Trigger:** Delete icon button on a room row, after attempting `DELETE /api/v1/rooms/{id}`
**Size:** `max-w-sm` (400px) — Modal 6E sm size

#### State 1 — No conflicts (room not assigned to any class instances)

**Title:** "Delete Room?"

Body: `text-sm text-gray-400` — "Are you sure you want to delete **[Room Name]**? This cannot be undone."

Footer: Cancel (Ghost) + Delete (Destructive)

The Destructive button triggers `DELETE /api/v1/rooms/{id}` directly (no `force` param needed when no instances are assigned).

#### State 2 — Has assigned class instances (`ROOM_HAS_INSTANCES` returned with affected list)

**Title:** "Delete Room?"

Layout:
```
[Amber warning banner]
  [ExclamationTriangleIcon h-5 w-5 text-orange-400]
  "This room is assigned to the following scheduled classes:"

[Affected instances list]
  • HIIT Bootcamp — Mon 28 Apr · 09:00
  • Yoga Flow — Tue 29 Apr · 07:30
  (scrollable if > 5 items: max-h-40 overflow-y-auto)

"If you proceed, the room will be cleared from these instances."

Footer: [Cancel (Ghost)] [Delete Anyway (Destructive)]
```

- Amber warning banner: `flex items-start gap-2 rounded-md bg-orange-500/10 border border-orange-500/30 px-3 py-3 text-sm text-orange-400`
- Affected instance list: `space-y-1 mt-3` — each item `text-sm text-gray-400` with `CalendarIcon h-3.5 w-3.5 inline mr-1 text-gray-500`
- "If you proceed" note: `text-xs text-gray-500 mt-3`
- Scrollable wrapper when > 5 items: `max-h-40 overflow-y-auto space-y-1`
- The Destructive button triggers `DELETE /api/v1/rooms/{id}?force=true`

---

### Screen: Admin Class Templates (`/admin/class-templates`)

**Who sees it:** ADMIN only
**Layout:** Same admin shell. Page heading + toolbar (search + category filter + "Add Template" button) above a responsive card grid.

```
[Sidebar] | [Page heading: "Class Templates"]
          | [Search ..........] [Category v] [Add Template btn]
          | [Card Grid: 3 columns on lg, 2 on md, 1 on sm]
```

#### ClassTemplateToolbar

- Search input: `placeholder="Search templates"`, `max-w-xs`
- Category filter: `<select>` styled as an input-like dropdown: `rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus-visible:ring-2 focus-visible:ring-green-500` with `"All Categories"` default option followed by all 11 categories
- Add Template: Primary button with `PlusIcon`
- Tailwind structure: `flex flex-wrap items-center gap-3 mb-6`

#### ClassTemplateCard (new component — see New Components section)

- Container: Interactive card variant from system.md 6C — `rounded-xl bg-gray-900 border border-gray-800 cursor-pointer transition-all duration-200 hover:border-gray-600 hover:bg-gray-800 p-5`
- Header row: template name (`text-base font-semibold text-white`) + action icon buttons (edit, delete) right-aligned
- Category badge: Neutral badge sm `text-xs font-medium` — category value
- Difficulty badge: coloured by level:
  - Beginner: Success badge
  - Intermediate: Info (`bg-blue-500/10 text-blue-400 border-blue-500/30`) badge
  - Advanced: Error badge
  - All Levels: Neutral badge
- Metadata row: `text-sm text-gray-400` — `ClockIcon h-3.5 w-3.5 inline mr-1` "{defaultDurationMin} min" · `UserGroupIcon h-3.5 w-3.5 inline mr-1` "Up to {defaultCapacity}" · `MapPinIcon h-3.5 w-3.5 inline mr-1` "{room.name}" resolved from the `room: RoomSummary | null` field (or "No room set" in `text-gray-600` when `room` is `null`)
- Description: `text-sm text-gray-400 leading-relaxed mt-2 line-clamp-2` (truncated at 2 lines)
- Seeded indicator: if `isSeeded`, a small `text-xs text-gray-500` — "Seeded" label at bottom right
- Grid structure: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`

**Empty state:** Centered in the grid area — `CalendarDaysIcon h-8 w-8 text-gray-500`, "No templates found", "Try adjusting your search or filters."

**Loading state:** Grid of 6 skeleton cards using `animate-pulse` with `rounded-xl bg-gray-800 h-40`.

---

### Component: ClassTemplateFormModal

**Trigger:** "Add Template" button or card Edit button
**Size:** `max-w-lg` (560px) — Modal 6E md size
**Title:** "Add Class Template" / "Edit Class Template"

#### Fields

| Field | Input type | Required | Constraints |
|-------|-----------|----------|-------------|
| Name | text | Yes | max 100 chars; unique |
| Description | textarea | No | max 500 chars; counter `{n}/500` |
| Category | select | Yes | 11 options from enum |
| Default Duration (min) | number | Yes | min 15, max 240; `type="number" min="15" max="240"` |
| Default Capacity | number | Yes | min 1, max 500; `type="number" min="1" max="500"` |
| Difficulty | select | Yes | Beginner / Intermediate / Advanced / All Levels |
| Room | RoomPicker | No | Searchable dropdown — see RoomPicker component spec below |

- Two-column layout for Duration + Capacity: `grid grid-cols-2 gap-4`
- Two-column layout for Category + Difficulty: `grid grid-cols-2 gap-4`
- Below the Room field: `text-xs text-green-400 hover:text-green-300 mt-1` — "Manage rooms →" link pointing to `/admin/rooms` (opens in same tab). Tailwind: `inline-flex items-center gap-1`
- The Room field sends `roomId: string | null` to the API (not free text). When no room is selected, `roomId` is `null`.
- Error `CLASS_TEMPLATE_NAME_CONFLICT` (409): inline error below Name field — "A template with this name already exists"
- Error `VALIDATION_ERROR` (422): field-level errors below each failing input

Footer: Cancel (Ghost) + Save Template (Primary)

---

### Component: ClassTemplateDeleteConfirmModal

**Trigger:** Delete icon on a template card, after `CLASS_TEMPLATE_HAS_INSTANCES` (409)
**Size:** `max-w-sm` — Modal 6E sm size
**Title:** "Delete Template?"

Body:
```
"Deleting [Template Name] will unlink it from the following scheduled classes.
Those classes will remain on the calendar as standalone instances."

[Affected instances list — same pattern as TrainerDeleteConfirmModal]

Footer: [Cancel (Ghost)] [Delete Template (Destructive)]
```

---

### Screen: Admin Scheduler — Weekly Calendar (`/admin/scheduler`)

**Who sees it:** ADMIN only
**Layout:** Full-width admin shell. A narrow left palette sidebar + the calendar grid occupying all remaining width. Toolbar above the grid for week navigation, copy, import, and export controls. This page is desktop-only (min-width: 1024px) per PRD out-of-scope note on mobile drag-and-drop.

```
[Sidebar (admin)] | [Scheduler Toolbar: WeekNavigator | Copy Week | Import | Export]
                  | [ClassPalette (260px fixed)] | [WeekCalendarGrid (flex-1)]
```

#### SchedulerToolbar

- Left cluster: `WeekNavigator` component
- Right cluster: "Copy Week" Secondary sm button (`DocumentDuplicateIcon`), "Import" Ghost sm button (`ArrowUpTrayIcon`), "Export" Ghost sm button (`ArrowDownTrayIcon`) — Export opens a dropdown menu
- Tailwind structure: `flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900 sticky top-0 z-20`

#### WeekNavigator (new component)

- Structure: `flex items-center gap-3`
- Back button: Ghost sm icon button — `ChevronLeftIcon h-4 w-4`, `aria-label="Previous week"`
- Forward button: Ghost sm icon button — `ChevronRightIcon h-4 w-4`, `aria-label="Next week"`
- Week label: `text-sm font-semibold text-white` — e.g. "14–20 Apr 2026" (Mon–Sun of current ISO week)
- Sub-label: `text-xs text-gray-500` — "Week 14"
- Behavior: clicking Back/Forward updates `?week=` URL param via `useSearchParams`; fetches new week schedule from `GET /api/v1/admin/class-instances?week=YYYY-Www`

#### ClassPalette (new component)

- Container: `flex flex-col bg-[#0F0F0F] border-r border-gray-800 w-[260px] flex-shrink-0 h-full overflow-y-auto`
- Heading: `text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 pt-4 pb-2` — "Class Templates"
- Search within palette: compact Search input `text-xs px-3 py-1.5 mb-2 mx-3`
- Template tile (draggable): `mx-3 mb-2 flex cursor-grab items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 transition-all duration-150 hover:border-gray-600 hover:bg-gray-800 active:cursor-grabbing`
  - Left: category color dot (`w-2.5 h-2.5 rounded-full flex-shrink-0` — see Category Color Dot table below)
  - Name: `text-sm font-medium text-white truncate`
  - Duration: `text-xs text-gray-500 ml-auto flex-shrink-0` — "{n} min"
  - `draggable="true"` with `onDragStart` setting `dataTransfer.setData("templateId", template.id)`
- Empty palette state (after search): `text-xs text-gray-500 px-4 py-3` — "No templates match"

**Category Color Dot tokens:**

| Category | Dot color |
|----------|-----------|
| Cardio | `bg-orange-500` |
| Strength | `bg-red-500` |
| Flexibility | `bg-purple-500` |
| Mind & Body | `bg-blue-400` |
| Cycling | `bg-yellow-500` |
| Combat | `bg-red-700` |
| Dance | `bg-pink-500` |
| Functional | `bg-green-500` |
| Aqua | `bg-cyan-500` |
| Wellness | `bg-indigo-400` |
| Other | `bg-gray-500` |

#### WeekCalendarGrid (new component)

- Outer container: `flex flex-1 flex-col overflow-hidden`
- Day header row: `grid grid-cols-[60px_repeat(7,1fr)] sticky top-[49px] z-10 bg-gray-900 border-b border-gray-800`
  - Left gutter cell (60px): empty, `bg-gray-900`
  - Day header cells: `py-2 text-center border-l border-gray-800 first:border-l-0`
    - Day name: `text-xs font-semibold uppercase tracking-wider text-gray-400` — "Mon"
    - Date: `text-sm font-semibold text-white` — "14" (today's date gets a green circle: `inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white text-sm font-bold`)
- Scrollable body: `overflow-y-auto flex-1`
- Time grid: `grid grid-cols-[60px_repeat(7,1fr)]` — 32 rows for 06:00–22:00 in 30-min increments
- Time label column: `text-right pr-2 text-xs text-gray-500 pt-1 flex-shrink-0` — displays hour labels (06:00, 06:30, ... 22:00) on the left of each row; on the half-hour row show only "·" or leave blank
- DayColumn cells (new component): each cell in the grid is a drop target:
  - Default: `relative border-t border-l border-gray-800 first:border-l-0 h-10 hover:bg-gray-800/40 transition-colors duration-100 cursor-pointer`
  - Hour boundary (on-the-hour row): `border-t border-gray-700` (slightly stronger line)
  - Drag-over state: `bg-green-500/10 border border-green-500/40`
  - Cells with class instances render `ClassInstanceCard` absolutely positioned
- Class instance cards are positioned using `top` and `height` calculated from the instance's `scheduledAt` (relative to 06:00) and `durationMin` at 40px per 30-min slot (80px per hour)

#### ClassInstanceCard (new component)

A card overlaid onto the grid cell. Absolute positioned within its DayColumn.

- Base container: `absolute left-1 right-1 rounded-md px-2 py-1 overflow-hidden cursor-pointer select-none transition-all duration-150 z-10`
  - Default border: `border border-green-500/30 bg-green-500/10`
  - Hover: `hover:brightness-110 hover:z-20`
  - Dragging: `opacity-60 cursor-grabbing`
- **Unassigned state** (trainers.length === 0): `border-red-500/50 bg-red-500/10`
- **Room conflict state** (hasRoomConflict === true): `border-orange-500/50 bg-orange-500/10`
- **Unassigned + room conflict**: unassigned styling takes visual priority (red border)

Card body layout (compact, fits in minimal height):
- Row 1: `text-xs font-semibold text-white leading-tight truncate` — class name
- Row 2: `text-xs text-gray-400 leading-tight` — start time (e.g. "07:00") + duration ("· 60 min")
- Row 3 (trainer area): `mt-0.5 flex flex-wrap gap-0.5`
  - If `trainers.length > 0`: up to 2 `TrainerChip` components, then "+N" neutral badge if more
  - If `trainers.length === 0`: `text-xs font-medium text-red-400` — "Unassigned" (with `ExclamationCircleIcon h-3 w-3 inline mr-0.5`)
- Capacity indicator: `text-xs text-gray-500 mt-0.5` — `UserGroupIcon h-3 w-3 inline mr-0.5` "{capacity} spots"
- Room conflict badge (shown on card when `hasRoomConflict`): bottom-right overlay `absolute bottom-1 right-1` — amber dot `w-2 h-2 rounded-full bg-orange-500` with `title="Room conflict"` tooltip

**TrainerChip (new component):**
- Compact inline representation of an assigned trainer inside a ClassInstanceCard
- Structure: `inline-flex items-center gap-0.5 rounded-full bg-gray-700 px-1.5 py-0.5 text-xs text-white leading-none`
- Shows initials only when card is small (default in calendar); full name only in the edit panel trainer list

---

### Component: ClassInstanceEditPanel (slide-over)

**Trigger:** Clicking a `ClassInstanceCard` or clicking an empty DayColumn cell with `?new=true` implicit state
**Layout:** Right-side slide-over panel, `fixed inset-y-0 right-0 z-30 flex w-[400px] flex-col bg-gray-900 border-l border-gray-800 shadow-xl shadow-black/50`
**Entry animation:** `translate-x-full` → `translate-x-0`, `duration-300 ease-out`

#### Panel structure

```
[Header: "Edit Class" | "New Class Instance" + X close button]
[Scrollable body: form fields]
[Footer: Delete (Destructive sm, left-aligned) | Cancel (Ghost) | Save Changes (Primary)]
```

#### Header

- `flex items-center justify-between border-b border-gray-800 px-6 py-5`
- Title: `text-lg font-semibold text-white`
- Sub-label (template link when `templateId` is set): `text-xs text-gray-500` — "From: {templateName}"
- Close button: `XMarkIcon h-5 w-5` Ghost icon button

#### Fields

| Field | Input type | Notes |
|-------|-----------|-------|
| Class Name | text (read-only display) | `text-base font-semibold text-white` — not editable (instance name fixed at creation) |
| Date | read-only display | `text-sm text-gray-400` — formatted day label |
| Start Time | select | 30-min increments 06:00–21:30; `rounded-md border border-gray-700 bg-gray-900 text-sm text-white` |
| Duration (min) | number input | min 15, max 240; shows `text-xs text-red-400` error on out-of-range |
| Capacity | number input | min 1, max 500 |
| Room | RoomPicker | Searchable dropdown — see RoomPicker component spec. Sends `roomId: string \| null`. Below the field: `text-xs text-green-400 hover:text-green-300 mt-1` — "Manage rooms →" link to `/admin/rooms` |
| Trainer(s) | multi-select | See TrainerMultiSelect below |

**TrainerMultiSelect:**
- Label: `text-sm font-semibold text-gray-300` — "Assign Trainers"
- Selected trainers shown as chips using the `TrainerChip` component (full-name variant) with remove X — displayed in a wrapping flex container `flex flex-wrap gap-1.5 mt-1.5 min-h-[36px] rounded-md border border-gray-700 bg-gray-900 p-2`
- Clicking the container or a "+" icon button opens an inline dropdown listing all trainers from `schedulerStore.trainers` — searchable within the dropdown
- Trainer dropdown item: `flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-gray-800 cursor-pointer` with initials avatar left
- **Hard error state** (`TRAINER_SCHEDULE_CONFLICT`): border on the multi-select wrapper changes to `border-red-500/60`; below the wrapper: `text-xs text-red-400 mt-1` — "Trainer [Name] is already assigned to another class at this time." Icon: `ExclamationCircleIcon h-3.5 w-3.5 inline mr-1`

**Room conflict soft warning** (when `hasRoomConflict` is true on the currently editing instance):
- Amber inline alert below the Room field: `flex items-start gap-2 rounded-md bg-orange-500/10 border border-orange-500/30 px-3 py-2 mt-1 text-xs text-orange-400`
- `ExclamationTriangleIcon h-4 w-4 flex-shrink-0 text-orange-400`
- Text: "Another class is scheduled in **[Room Name]** at an overlapping time. You can save anyway." — where [Room Name] is resolved from `instance.room.name` (the room entity name, not raw text). Render the room name in `font-semibold`.

Footer note: Delete button is hidden when in "create new instance" mode (no existing instance to delete).

---

### Component: DeleteInstanceConfirmDialog

**Trigger:** "Delete" button in ClassInstanceEditPanel footer
**Size:** `max-w-sm` — Modal 6E sm size
**Title:** "Delete this class?"

Body: `text-sm text-gray-400` — "This will permanently remove [Class Name] on [Day, Date] at [Time]. This action cannot be undone."

Footer: Cancel (Ghost) + Delete Class (Destructive)

---

### Component: CopyWeekConfirmModal

**Trigger:** "Copy Week" button in SchedulerToolbar
**Size:** `max-w-sm` — Modal 6E sm size
**Title:** "Copy Week to Next Week"

Body:
```
[DocumentDuplicateIcon h-8 w-8 text-green-400 centered]
"This will copy all {N} class instances from [Week label] to [Next week label]."
"Existing classes in the target week will not be overwritten."
[text-xs text-gray-500 mt-2] "Trainer conflicts will not be checked during copy."
```

Loading state: Primary button shows spinner while `POST /copy-week` is in flight.

Success state (shown inline, replaces body before modal auto-closes after 1.5s):
```
[CheckCircleIcon h-8 w-8 text-green-400 centered]
"{copied} classes copied. {skipped} skipped (already existed)."
```

Footer: Cancel (Ghost) + Copy Week (Primary)

---

### Component: ImportModal

**Trigger:** "Import" button in SchedulerToolbar
**Size:** `max-w-lg` — Modal 6E md size
**Title:** "Import Schedule from CSV"

#### State 1 — File picker

- Upload area: same dashed-border pattern as TrainerPhotoUpload, 100% width within modal
  - Icon: `DocumentArrowUpIcon h-8 w-8 text-gray-500`
  - Text: "Click to upload or drag and drop"
  - Subtext: "CSV file — max 2 MB. Required columns: class_name, date, start_time, duration_minutes, capacity"
- Below: `text-xs text-gray-500` — "Optional columns: trainer_email, room"
- Footer: Cancel (Ghost) + Upload (Primary, disabled until file selected)

#### State 2 — Hard error (`IMPORT_FORMAT_INVALID` or `IMPORT_FILE_TOO_LARGE`)

- Body replaced by:
  ```
  [XCircleIcon h-8 w-8 text-red-400 centered]
  "Import failed"
  [text-sm text-red-400 mt-1] — specific message:
    - IMPORT_FORMAT_INVALID: "The file is missing required columns or is not a valid CSV."
    - IMPORT_FILE_TOO_LARGE: "The file exceeds the 2 MB size limit."
  ```
- Footer: Close (Ghost) + Try Again (Secondary)

#### State 3 — Partial success report

Header changes to: "Import Complete"

Body:
```
[Summary row]
  [CheckCircleIcon h-5 w-5 text-green-400] "{imported} rows imported successfully"
  [XCircleIcon h-5 w-5 text-red-400] "{rejected} rows rejected"  (hidden if 0)

[Error table — shown only when rejected > 0]
  [Table: Row # | Reason | Detail]
  Wrapper: max-h-60 overflow-y-auto rounded-lg border border-gray-800
  th: text-xs font-semibold uppercase text-gray-500
  td: text-sm text-gray-400
  Reason displayed as Error badge (e.g., "TRAINER_NOT_FOUND")
```

Footer: Close (Ghost) + View Schedule (Primary — closes modal, calendar refreshes)

---

### Component: ExportMenu

**Trigger:** "Export" button in SchedulerToolbar — opens a dropdown below the button
**Dropdown structure:** `absolute right-0 top-full mt-1 w-44 rounded-xl border border-gray-800 bg-gray-900 shadow-xl shadow-black/50 z-30 py-1`

Items:
- "Export as CSV" — `flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-gray-800 cursor-pointer w-full` with `TableCellsIcon h-4 w-4 text-gray-400`
- "Export as iCal" — same styling with `CalendarDaysIcon h-4 w-4 text-gray-400`

Clicking either item triggers the appropriate `GET /api/v1/admin/schedule/export?week=...&format=...` and initiates a browser file download. A toast notification appears: "Downloading schedule-YYYY-Www.{csv|ics}..."

Dismiss on click outside (same pattern as all dropdown menus).

---

## Component States

| Component | Loading | Empty | Error | Populated |
|-----------|---------|-------|-------|-----------|
| TrainerTable | 5 skeleton rows (animate-pulse bars) | "No trainers found" empty state with UserGroupIcon | Full-page toast if GET fails | Rows with photo avatar, name, email, specialisation chips, action buttons |
| RoomTable | 5 skeleton rows (animate-pulse bars) | "No rooms found" empty state with BuildingOfficeIcon | Full-page toast if GET fails | Rows with name, capacity, truncated description, action buttons |
| RoomFormModal | — | — | ROOM_NAME_CONFLICT inline below Name field; VALIDATION_ERROR field-level errors | Fields prepopulated in edit mode |
| RoomPicker | Skeleton bar (animate-pulse h-9) | Disabled dropdown "No rooms found — add one first" | Red border + "Failed to load rooms" below dropdown | Searchable dropdown; selected room name + capacity hint |
| ClassTemplateCard grid | 6 skeleton cards | "No templates found" empty state with CalendarDaysIcon | Full-page toast if GET fails | Card grid with category dot, difficulty badge, metadata (room name from entity) |
| WeekCalendarGrid | Skeleton overlay: `absolute inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center` with spinner | Day columns visible but empty (zero cards); each DayColumn cell is a valid drop target | Toast + empty grid (instances not shown on fetch error; retry button in toolbar) | ClassInstanceCards positioned at correct slot heights |
| ClassInstanceCard | — | — | Unassigned (red border+badge) / Room conflict (amber border+dot) | Default green tint; name, time, TrainerChips, capacity |
| ClassPalette | Skeleton tiles (animate-pulse bars) | "No templates" message | Toast | Draggable template tiles |
| ClassInstanceEditPanel | Disabled fields + spinner overlay on save | — | TRAINER_SCHEDULE_CONFLICT inline red on multi-select; VALIDATION_ERROR field-level errors | All fields populated; RoomPicker shows selected room; room conflict amber alert with room name if applicable |
| ImportModal | Upload spinner | File picker (initial state) | IMPORT_FORMAT_INVALID / IMPORT_FILE_TOO_LARGE error state | Partial success report with counts and error table |
| CopyWeekConfirmModal | Spinner on button | — | Toast if API fails | Count preview; post-copy success inline state |

---

## Error Code — UI Message

| Error Code | Message shown to user | Location |
|-----------|----------------------|----------|
| `TRAINER_EMAIL_CONFLICT` | "A trainer with this email already exists" | Email field inline error |
| `VALIDATION_ERROR` (trainer) | "Please fill in all required fields" + per-field messages | Field-level inline errors |
| `TRAINER_HAS_ASSIGNMENTS` | "This trainer is assigned to {N} scheduled class(es). Confirm to remove them from those classes." | TrainerDeleteConfirmModal body |
| `TRAINER_NOT_FOUND` | "Trainer not found. Please refresh and try again." | Toast (error) |
| `INVALID_PHOTO_FORMAT` | "File must be JPEG, PNG or WEBP" | Photo upload area inline error |
| `PHOTO_TOO_LARGE` | "File exceeds the 5 MB limit" | Photo upload area inline error |
| `ROOM_NAME_CONFLICT` | "A room with this name already exists" | Name field inline error in RoomFormModal |
| `ROOM_NOT_FOUND` | "Room not found. Please refresh and try again." | Toast (error) |
| `ROOM_HAS_INSTANCES` | (not shown as text — triggers State 2 of RoomDeleteConfirmModal showing amber warning + affected list) | RoomDeleteConfirmModal |
| `VALIDATION_ERROR` (room) | "Name is required" / per-field messages | Field-level inline errors in RoomFormModal |
| `CLASS_TEMPLATE_NAME_CONFLICT` | "A template with this name already exists" | Name field inline error |
| `CLASS_TEMPLATE_NOT_FOUND` | "Template not found. Please refresh and try again." | Toast (error) |
| `CLASS_TEMPLATE_HAS_INSTANCES` | "This template has {N} scheduled class instance(s). Confirm to unlink them and delete the template." | ClassTemplateDeleteConfirmModal body |
| `TRAINER_SCHEDULE_CONFLICT` | "Trainer [First Last] is already assigned to another class at this time." | TrainerMultiSelect inline error in ClassInstanceEditPanel |
| `CLASS_INSTANCE_NOT_FOUND` | "This class instance no longer exists. Please refresh the schedule." | Toast (error), panel closes |
| `VALIDATION_ERROR` (instance) | Per-field: "Duration must be between 15 and 240 minutes" / "Capacity must be between 1 and 500" | Field-level inline errors in ClassInstanceEditPanel |
| `IMPORT_FORMAT_INVALID` | "The file is missing required columns or is not a valid CSV." | ImportModal error state |
| `IMPORT_FILE_TOO_LARGE` | "The file exceeds the 2 MB size limit." | ImportModal error state |
| `VALIDATION_ERROR` (copy-week) | "Invalid week format. Please navigate to a valid week." | Toast (error) |

---

## Responsive Behaviour

The Scheduler calendar page (`/admin/scheduler`) is a **desktop-only view** (per PRD out-of-scope). The minimum supported width is 1024px (`lg` breakpoint).

- Below 1024px: display a centered notice — `text-sm text-gray-400 text-center p-8` — "The Scheduler requires a desktop browser. Please use a screen at least 1024px wide." Hide the calendar grid and palette.
- The toolbar controls (week nav, copy, import, export) stack vertically on screens below 1024px if the notice approach is not used.

The Trainer List (`/admin/trainers`), Rooms (`/admin/rooms`), and Class Templates (`/admin/class-templates`) pages are responsive:

### Mobile (< 640px `sm`)

- **Trainer table:** Phone column hidden (`hidden sm:table-cell`); specialisations column hidden (`hidden md:table-cell`); avatar + full name + email + actions remain visible.
- **Rooms table:** Description column hidden (`hidden sm:table-cell`); Name + Capacity + Actions remain visible.
- **Class Templates:** Single-column card grid (`grid-cols-1`).
- **Modals:** Full-width (`w-full max-w-none mx-4`), scrollable body.

### Tablet (640px–1023px)

- **Trainer table:** Phone column visible, specialisations hidden.
- **Class Templates:** Two-column grid (`sm:grid-cols-2`).

### Desktop (1024px+)

- All columns visible.
- Three-column template grid (`lg:grid-cols-3`).
- Scheduler calendar fully rendered with palette + grid.

---

## Accessibility

- All form inputs have visible `<label>` elements linked via `htmlFor`/`id`.
- Error states use both `aria-invalid="true"` and `aria-describedby` pointing to the error message `id` — color is never the sole indicator.
- The `WeekCalendarGrid` uses `role="grid"`, day headers use `role="columnheader"`, and each cell uses `role="gridcell"`. The accessible label of each cell includes the day name and time: `aria-label="Monday 14 April, 07:00"`.
- `ClassInstanceCard` uses `role="button"` and `tabIndex={0}` with `onKeyDown` for Enter/Space to open the edit panel. `aria-label` includes class name, time, and assigned trainers or "Unassigned".
- Draggable template tiles in `ClassPalette` have `aria-grabbed` state and keyboard fallback: pressing Enter on a tile focuses the first available drop target; subsequent arrow keys move the focus between slots; pressing Enter again drops the template.
- Drag-and-drop calendar interaction has an explicit keyboard alternative via the `ClassInstanceEditPanel` where the admin can change `scheduledAt` via a select input.
- `TrainerMultiSelect` has `role="combobox"` with `aria-expanded` and `aria-controls` pointing to the dropdown list id. Each dropdown item has `role="option"`.
- `RoomPicker` has a visible `<label>` linked via `htmlFor`/`id`. In loading state: `aria-busy="true"` on the container. In error state: `aria-invalid="true"` and `aria-describedby` pointing to the error message. Empty state option is rendered as `disabled` with `aria-disabled="true"`.
- The `ExportMenu` dropdown uses `role="menu"` with `role="menuitem"` on each option. Escape closes it and returns focus to the Export button.
- All icon-only buttons (`PencilIcon`, `TrashIcon`, navigation arrows) have `aria-label`.
- Status badges that convey critical state (Unassigned, Room conflict) include `aria-label` with a descriptive string (e.g., `aria-label="No trainer assigned"`).
- `ImportModal`, `CopyWeekConfirmModal`, `TrainerFormModal`, `RoomFormModal`, `RoomDeleteConfirmModal`, and all other dialogs use `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the modal title `id`, and a focus trap.
- Loading states use `aria-busy="true"` on the containing region; live regions (`aria-live="polite"`) announce import results and copy-week completion to screen readers.
- Focus rings: all interactive elements use `focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900`.
- Touch targets: all action buttons in the trainer table and calendar toolbar are padded to a minimum 44x44px touch target.

---

## New Reusable Components Introduced

The following components are introduced by this feature. They belong in `src/components/scheduler/`, `src/components/trainers/`, or `src/components/rooms/` and should be added to the GymFlow component library.

### WeekCalendarGrid

Location: `src/components/scheduler/WeekCalendarGrid.tsx`

A 7-column × 32-row CSS grid representing Mon–Sun, 06:00–22:00 in 30-min slots. Accepts `instances: ClassInstance[]` and renders `ClassInstanceCard` components positioned via absolute layout within their day column. Emits `onInstanceClick(id)`, `onSlotClick(day, time)`, `onDrop(templateId, day, time)`, and `onInstanceDrop(instanceId, day, time)` callbacks. Manages HTML5 drag-and-drop drop-target highlighting internally.

Tokens used: `bg-[#0F0F0F]` page background for grid background, `border-gray-800` grid lines, `border-gray-700` hour boundary lines, `bg-gray-800/40` hover slot, `bg-green-500/10 border-green-500/40` drag-over slot.

### DayColumn

Location: internal to `WeekCalendarGrid.tsx` (not a standalone exported component)

Each of the 7 day columns. Renders 32 drop-target cells stacked vertically. Each cell is a `div` with `onDragOver`, `onDrop` handlers. Passes computed `day` and `timeSlot` to parent callbacks.

### ClassInstanceCard

Location: `src/components/scheduler/ClassInstanceCard.tsx`

Compact card rendered inside the calendar grid, absolutely positioned. Receives a single `ClassInstance` and `onClick` callback. Visual variants: default (green tint), unassigned (red), room conflict (amber). Includes `TrainerChip` sub-components for each assigned trainer.

### TrainerChip

Location: `src/components/scheduler/TrainerChip.tsx`

Compact display of a single trainer. Two size variants:
- `compact`: initials only — used inside `ClassInstanceCard`
- `full`: full name with initials avatar — used in `ClassInstanceEditPanel` selected-trainers list

Base classes: `inline-flex items-center gap-0.5 rounded-full text-xs leading-none` with `bg-gray-700 text-white` (compact) or `bg-gray-800 border border-gray-700 text-gray-300 px-2 py-0.5` (full).

### ClassPalette

Location: `src/components/scheduler/ClassPalette.tsx`

Left sidebar panel listing all available `ClassTemplate` records as draggable tiles. Includes its own search input. Receives `templates: ClassTemplate[]` and renders each as a draggable div with category color dot.

### ClassInstanceEditPanel

Location: `src/components/scheduler/ClassInstanceEditPanel.tsx`

Right-side slide-over panel. Receives `instanceId: string | null` and `defaultSlot: { day: string, time: string } | null`. When `instanceId` is null, renders in create mode using `defaultSlot`. Contains `TrainerMultiSelect` sub-component. Emits `onSave`, `onDelete`, `onClose`.

### WeekNavigator

Location: `src/components/scheduler/WeekNavigator.tsx`

Back/Forward week controls + formatted week label. Reads and writes the `?week=` URL param. Uses `useSearchParams` from React Router.

### CopyWeekConfirmModal

Location: `src/components/scheduler/CopyWeekConfirmModal.tsx`

Confirmation dialog before copy-week. Displays source/target week labels and instance count. Three display states: confirm, loading, success.

### ImportModal

Location: `src/components/scheduler/ImportModal.tsx`

Three-state modal: file-picker, hard-error, partial-success-report. Handles file validation client-side (size check before upload) and displays the `ImportResultResponse` error table on partial success.

### ExportMenu

Location: `src/components/scheduler/ExportMenu.tsx`

Dropdown menu anchored to the Export button. Two items: CSV and iCal. Triggers Axios blob downloads and initiates `URL.createObjectURL` + programmatic anchor click for file save.

### RoomPicker

Location: `src/components/scheduler/RoomPicker.tsx`

A searchable dropdown for selecting a managed room entity. Used in both `ClassTemplateFormModal` and `ClassInstanceEditPanel`.

**Props:** `value: string | null` (roomId), `onChange: (roomId: string | null) => void`

**Behaviour:**
- Fetches rooms from `GET /api/v1/rooms` on mount (no search param — loads all rooms for client-side filtering).
- Renders as a searchable `<select>`-style dropdown. Each option displays room name + capacity hint in parentheses when capacity is set: `"Studio A (cap. 25)"`. When capacity is null: just `"Studio A"`.
- Includes a "No room" option at the top of the list (value `null`) to allow clearing the selection.
- Shows a loading skeleton while fetching: `animate-pulse rounded bg-gray-800 h-9 w-full`
- Empty state (list is empty after fetch): renders a disabled dropdown showing `"No rooms found — add one first"` in `text-gray-500`.
- Below the dropdown: `text-xs text-green-400 hover:text-green-300 mt-1` — `"Manage rooms →"` link to `/admin/rooms`.

**States:**

| State | Appearance |
|-------|------------|
| Default | `rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white w-full` |
| Focused | `focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-transparent` (green ring) |
| Loading | Skeleton bar replaces the dropdown: `animate-pulse rounded bg-gray-800 h-9 w-full` |
| Error | `border-red-500/60 focus-visible:ring-red-500`; error text below: `text-xs text-red-400` — "Failed to load rooms" |
| Empty | Dropdown disabled, single option "No rooms found — add one first" in `text-gray-500` |

**Accessibility:** `<label>` linked via `htmlFor`/`id`. When in error state: `aria-invalid="true"` and `aria-describedby` pointing to the error message.

### ClassTemplateCard

Location: `src/components/scheduler/ClassTemplateCard.tsx`

Card representation of a `ClassTemplate` in the `/admin/class-templates` grid. Shows name, category dot, difficulty badge, metadata row, description excerpt. Edit/delete icon buttons in top-right corner.

### TagInput

Location: `src/components/ui/TagInput.tsx` (shared utility — added to system.md)

A text input that converts entries into removable chips. Props: `value: string[]`, `onChange: (tags: string[]) => void`, `max?: number`, `maxLength?: number`, `placeholder?: string`. Each chip uses the Neutral badge variant with `XMarkIcon` remove. When `max` is reached the text input renders as disabled.

---

## Design System Additions

The following patterns are new to this feature and must be added to `docs/design/system.md`.

### Section 6I — TagInput

**Purpose:** Converts free-text entries into removable chip tags. Used for the Specialisations field on trainer profiles.

- Wrapper: `flex flex-col gap-1.5`
- Tag container + input row: `flex flex-wrap gap-1.5 rounded-md border border-gray-700 bg-gray-900 px-3 py-2 min-h-[42px] cursor-text focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent transition-colors duration-200`
- Each tag chip: Neutral badge md with `XMarkIcon h-3 w-3` remove button
- Text input: `flex-1 min-w-[120px] bg-transparent text-sm text-white placeholder:text-gray-500 outline-none`
- Max-reached state: input replaced by `text-xs text-gray-500 italic self-center` — "Maximum reached"
- Error state: container border changes to `border-red-500/60`

### Section 6J — Slide-over Panel

**Purpose:** A right-anchored overlay panel for focused editing tasks (class instance, future booking detail). Does not block the main content behind it (unlike a modal).

- Overlay: `fixed inset-0 z-30 bg-black/30` (lighter than modal overlay)
- Panel: `fixed inset-y-0 right-0 z-30 flex w-[400px] flex-col bg-gray-900 border-l border-gray-800 shadow-xl shadow-black/50`
- Entry: `transform translate-x-full` → `translate-x-0` with `transition-transform duration-300 ease-out`
- Exit: `translate-x-0` → `translate-x-full` with `transition-transform duration-200 ease-in`
- Header: `flex items-center justify-between border-b border-gray-800 px-6 py-5 flex-shrink-0`
- Body: `flex-1 overflow-y-auto px-6 py-6`
- Footer: `flex items-center border-t border-gray-800 px-6 py-4 flex-shrink-0`

### Section 6K — Drag-and-drop Drop Target

**Purpose:** Visual affordance for HTML5 drag-and-drop drop zones (calendar time slots).

- Default: no additional styling beyond normal grid cell
- Drag-over active: `bg-green-500/10 border border-green-500/40 rounded-md`
- Invalid drop target: `bg-red-500/5 border border-red-500/30 rounded-md` (used if a template is dragged over an out-of-range slot)

### Category Color Dot

**Purpose:** 10px colored dot indicating class category. Used in ClassPalette tiles and ClassTemplateCard.

- Structure: `inline-block w-2.5 h-2.5 rounded-full flex-shrink-0`
- Color mapping: see Category Color Dot table in the ClassPalette section above
