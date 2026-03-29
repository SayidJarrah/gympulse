# E2E Test Cases Catalog

Date: 2026-03-29
Scope: implemented user-facing functionality only

## Purpose

This document is the master E2E catalog for the functionality currently implemented in GymFlow.
It is intended as the implementation backlog for `@test-automator`.

It combines:

- feature scope from `docs/sdd`
- supporting behavior from `docs/prd` and `docs/design`
- current browser coverage in `frontend/e2e`

## Reviewed Sources

- `docs/sdd/auth.md`
- `docs/sdd/membership-plans.md`
- `docs/sdd/user-membership-purchase.md`
- `docs/sdd/scheduler.md`
- `docs/prd/auth.md`
- `docs/prd/membership-plans.md`
- `docs/prd/user-membership-purchase.md`
- `docs/prd/scheduler.md`
- `docs/design/auth.md`
- `docs/design/membership-plans.md`
- `docs/design/user-membership-purchase.md`
- `docs/design/scheduler.md`
- `frontend/e2e/auth.spec.ts`
- `frontend/e2e/membership-plans.spec.ts`
- `frontend/e2e/user-membership-purchase.spec.ts`
- `frontend/e2e/class-schedule.spec.ts`

## Current Suite Snapshot

- Current Playwright suite size: `79` tests
- Feature split:
- `auth`: `4`
- `membership plans`: `5`
- `user membership purchase`: `19`
- `scheduler`: `51`

## Status Legend

- `Covered`: existing E2E already exercises the scenario meaningfully
- `Partial`: some browser coverage exists, but it is shallow, permissive, mocked, or misses a critical assertion
- `Missing`: no meaningful E2E coverage exists

## Guidance For `@test-automator`

- Prefer real backend-driven setup over `page.route()` mocking for business rules.
- Use route interception only when validating explicit client behavior that is otherwise hard to trigger deterministically.
- Avoid false-green assertions:
- pagination tests must prove page change
- drag-and-drop tests must prove persisted schedule change
- error tests must not early-return when the preconditions are absent
- Keep deterministic seed data for plans, memberships, trainers, rooms, templates, and class instances.
- Scheduler uses the SDD rule of `30-minute` slots, not the older PRD `15-minute` wording.

## Full Catalog

### Auth

#### `AUTH-01` Register happy path ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: guest user, unused email
- Steps:
- Open `/register`
- Submit valid email and valid password
- Expected:
- Registration succeeds
- User is redirected to `/login`

#### `AUTH-02` Register duplicate email ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: existing user account
- Steps:
- Open `/register`
- Submit existing email and valid password
- Expected:
- User remains on `/register`
- Duplicate-account error is shown

#### `AUTH-03` Register validation matrix ✅

- Priority: `P1`
- Status: `Missing`
- Preconditions: guest user
- Steps:
- Submit malformed email
- Submit password shorter than `8`
- Submit password longer than `15`
- Expected:
- Validation errors render correctly
- No successful redirect occurs

#### `AUTH-04` Login happy path for regular user ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: existing `USER` account
- Steps:
- Open `/login`
- Submit valid user credentials
- Expected:
- Login succeeds
- User is redirected to `/plans`
- Authenticated navbar state is visible

#### `AUTH-05` Login happy path for admin ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: seeded `ADMIN` account
- Steps:
- Open `/login`
- Submit valid admin credentials
- Expected:
- Login succeeds
- User is redirected to `/admin/plans`

#### `AUTH-06` Login invalid credentials ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: existing account
- Steps:
- Open `/login`
- Submit valid email with wrong password
- Expected:
- User remains on `/login`
- Generic invalid-credentials message is shown

#### `AUTH-07` Login unknown email uses same generic error ✅

- Priority: `P1`
- Status: `Missing`
- Preconditions: guest user
- Steps:
- Open `/login`
- Submit non-existent email and any password
- Expected:
- User remains on `/login`
- Same generic invalid-credentials message is shown

#### `AUTH-08` Public navbar logout ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: logged-in `USER`
- Steps:
- Click `Log out` in the public navbar
- Navigate to `/membership`
- Expected:
- Session is cleared
- User is redirected to `/login`
- Guest navbar state is visible

#### `AUTH-09` Admin sidebar logout ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: logged-in `ADMIN`
- Steps:
- Open any admin page
- Click sidebar `Log out`
- Revisit an admin route
- Expected:
- Session is cleared
- User is redirected away from admin area

#### `AUTH-10` Authenticated user route guard ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: guest user
- Steps:
- Open `/membership`
- Expected:
- Redirect to `/login`

#### `AUTH-11` Admin route guard for unauthenticated guest ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: guest user
- Steps:
- Open `/admin/plans`
- Expected:
- Redirect to `/plans`

#### `AUTH-12` Admin route guard for authenticated non-admin ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: logged-in `USER`
- Steps:
- Open `/admin/plans`
- Expected:
- Redirect to `/plans`

#### `AUTH-13` Silent refresh success ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: persisted session with expired access token and valid refresh token
- Steps:
- Trigger an authenticated API request from the browser
- Expected:
- Refresh flow succeeds in background
- Original request completes
- User stays in-app without redirect to `/login`

#### `AUTH-14` Silent refresh failure ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: persisted session with invalid or expired refresh token
- Steps:
- Trigger an authenticated API request from the browser
- Expected:
- Session is cleared
- Browser redirects to `/login`

### Membership Plans

#### `PLAN-01` Public plans catalog loads ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: at least one active plan exists
- Steps:
- Open `/plans`
- Expected:
- Plan cards render
- Active plans are visible

#### `PLAN-02` Public plan detail navigation ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: at least one active plan exists
- Steps:
- Open `/plans`
- Click a plan card
- Expected:
- Browser opens `/plans/:id`
- Plan detail content renders

#### `PLAN-03` Public plan detail content ✅

- Priority: `P1`
- Status: `Missing`
- Preconditions: active plan exists
- Steps:
- Open `/plans/:id`
- Expected:
- Name, description, duration, price, and CTA render correctly

#### `PLAN-04` Public plan detail not found ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: guest user
- Steps:
- Open `/plans/<nonexistent-id>`
- Expected:
- Not-found state renders
- `Browse all plans` link is available

#### `PLAN-05` Public direct access to inactive plan ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: inactive plan exists
- Steps:
- Open inactive plan detail URL as guest
- Expected:
- Not-found state renders

#### `PLAN-06` Public catalog empty state ✅

- Priority: `P1`
- Status: `Missing`
- Preconditions: zero active plans
- Steps:
- Open `/plans`
- Expected:
- Empty-state message renders

#### `PLAN-07` Public catalog pagination ✅

- Priority: `P1`
- Status: `Missing`
- Preconditions: more than `9` active plans
- Steps:
- Open `/plans`
- Use `Next` and `Previous`
- Expected:
- Page number changes
- Visible plan set changes

#### `PLAN-08` Unauthenticated guest blocked from admin plans ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: guest user
- Steps:
- Open `/admin/plans`
- Expected:
- Redirect to `/plans`

#### `PLAN-09` Admin can open plans management ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: logged-in `ADMIN`
- Steps:
- Open `/admin/plans`
- Expected:
- Plans table renders

#### `PLAN-10` Admin create plan happy path ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: logged-in `ADMIN`
- Steps:
- Open `New Plan`
- Submit valid plan data
- Expected:
- Plan is created
- New row appears in admin table

#### `PLAN-11` Admin edit plan happy path ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: existing editable plan
- Steps:
- Open edit modal
- Change name, description, price, or duration
- Save
- Expected:
- Table row updates immediately

#### `PLAN-12` Admin create and edit validation matrix ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: logged-in `ADMIN`
- Steps:
- Submit blank `name`
- Submit blank `description`
- Submit `priceInCents <= 0`
- Submit `durationDays <= 0`
- Expected:
- Modal stays open
- Validation or mapped error messages are shown

#### `PLAN-13` Admin deactivate plan ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: active plan exists
- Steps:
- Open deactivate action
- Confirm modal
- Expected:
- Plan status becomes `INACTIVE`
- Plan disappears from public `/plans`

#### `PLAN-14` Admin reactivate plan ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: inactive plan exists
- Steps:
- Open activate action
- Confirm modal
- Expected:
- Plan status becomes `ACTIVE`
- Plan appears in public `/plans`

#### `PLAN-15` Status action conflict handling ✅

- Priority: `P1`
- Status: `Missing`
- Preconditions: ability to trigger already-active or already-inactive state
- Steps:
- Attempt to activate active plan or deactivate inactive plan
- Expected:
- Conflict error is shown
- Plan state remains unchanged

#### `PLAN-16` Admin status tabs and URL sync ✅

- Priority: `P1`
- Status: `Missing`
- Preconditions: mix of active and inactive plans
- Steps:
- Switch `All`, `Active`, `Inactive`
- Expected:
- Table results match the tab
- URL query param stays in sync

#### `PLAN-17` Admin plans pagination ✅

- Priority: `P1`
- Status: `Missing`
- Preconditions: more than `20` plans
- Steps:
- Open `/admin/plans`
- Move between pages
- Expected:
- Visible rows change
- Current page indicator updates

#### `PLAN-18` Price change blocked when plan has active subscribers ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: plan with at least one active membership
- Steps:
- Edit only `priceInCents`
- Save
- Expected:
- Conflict error is shown
- Old price remains

### User Membership Purchase

#### `MEM-01` User purchases membership from plans page ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: logged-in `USER` with no active membership, active plan exists
- Steps:
- Open `/plans`
- Activate a plan
- Confirm purchase
- Expected:
- Purchase succeeds
- Browser navigates to `/membership`

#### `MEM-02` Purchase modal cancel via button ✅

- Priority: `P1`
- Status: `Covered`
- Preconditions: logged-in `USER` with no active membership
- Steps:
- Open purchase modal
- Click `Cancel`
- Expected:
- Modal closes
- No membership is created

#### `MEM-03` Purchase modal dismiss via overlay or escape ✅

- Priority: `P1`
- Status: `Missing`
- Preconditions: logged-in `USER` with no active membership
- Steps:
- Open purchase modal
- Dismiss via overlay click
- Repeat via `Escape`
- Expected:
- Modal closes
- No membership is created

#### `MEM-04` Activate CTA visibility matrix ✅

- Priority: `P0`
- Status: `Partial`
- Preconditions: guest, `USER` with no active membership, `USER` with active membership
- Steps:
- Open `/plans` in each state
- Expected:
- Guest sees no activate CTA
- Eligible user sees activate CTA
- Active member sees no activate CTA

#### `MEM-05` Active membership page renders details ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: logged-in `USER` with active membership
- Steps:
- Open `/membership`
- Expected:
- Plan name, status, dates, and usage render

#### `MEM-06` Membership page empty state ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: logged-in `USER` without active membership
- Steps:
- Open `/membership`
- Expected:
- Empty-state card renders

#### `MEM-07` Empty-state CTA to plans ✅

- Priority: `P1`
- Status: `Missing`
- Preconditions: logged-in `USER` without active membership
- Steps:
- Open `/membership`
- Click `Browse plans`
- Expected:
- Browser navigates to `/plans`

#### `MEM-08` Membership page fetch failure and retry ✅

- Priority: `P1`
- Status: `Missing`
- Preconditions: logged-in `USER`
- Steps:
- Make `GET /memberships/me` fail once
- Open `/membership`
- Click `Retry`
- Expected:
- Generic error state renders on failure
- Retry recovers when backend is available

#### `MEM-09` User cancels active membership ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: logged-in `USER` with active membership
- Steps:
- Open cancel flow on `/membership`
- Confirm cancellation
- Expected:
- Membership becomes inactive
- Empty state is shown after refresh

#### `MEM-10` Cancel modal dismiss without cancelling ✅

- Priority: `P1`
- Status: `Covered`
- Preconditions: logged-in `USER` with active membership
- Steps:
- Open cancel modal
- Dismiss it
- Expected:
- Membership remains active

#### `MEM-11` User repurchases after cancellation ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: logged-in `USER` with cancelled membership and no active membership
- Steps:
- Activate a plan again
- Expected:
- New membership is created successfully

#### `MEM-12` Purchase blocked because plan is inactive ✅

- Priority: `P0`
- Status: `Partial`
- Preconditions: logged-in `USER`, target plan becomes inactive before purchase
- Steps:
- Attempt purchase
- Expected:
- Modal shows `PLAN_NOT_AVAILABLE` message
- No membership is created

#### `MEM-13` Purchase blocked because user already has active membership ✅

- Priority: `P0`
- Status: `Partial`
- Preconditions: logged-in `USER` already has active membership
- Steps:
- Attempt duplicate purchase through real backend setup
- Expected:
- Modal shows `MEMBERSHIP_ALREADY_ACTIVE` message

#### `MEM-14` Authenticated user route guard for `/membership` ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: guest user
- Steps:
- Open `/membership`
- Expected:
- Redirect to `/login`

#### `MEM-15` Admin memberships page loads ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: logged-in `ADMIN`
- Steps:
- Open `/admin/memberships`
- Expected:
- Memberships table renders

#### `MEM-16` Non-admin blocked from admin memberships ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: logged-in `USER`
- Steps:
- Open `/admin/memberships`
- Expected:
- Redirect to `/plans`

#### `MEM-17` Guest blocked from admin memberships ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: guest user
- Steps:
- Open `/admin/memberships`
- Expected:
- Redirect to `/plans`

#### `MEM-18` Admin status filter ✅

- Priority: `P1`
- Status: `Partial`
- Preconditions: data set with `ACTIVE`, `CANCELLED`, and `EXPIRED` memberships
- Steps:
- Change status filter in `/admin/memberships`
- Expected:
- Table rows match the chosen status

#### `MEM-19` Admin user ID filter positive match ✅

- Priority: `P1`
- Status: `Missing`
- Preconditions: known membership for a target `userId`
- Steps:
- Enter matching `userId`
- Expected:
- Table narrows to that user’s memberships

#### `MEM-20` Admin user ID filter no-result state ✅

- Priority: `P1`
- Status: `Covered`
- Preconditions: no matching membership for supplied `userId`
- Steps:
- Enter unknown `userId`
- Expected:
- Empty state renders

#### `MEM-21` Admin memberships pagination ✅

- Priority: `P1`
- Status: `Partial`
- Preconditions: more than `20` memberships
- Steps:
- Move between pages
- Expected:
- Visible rows change
- Count and page indicator update

#### `MEM-22` Admin cancels active membership ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: active membership exists
- Steps:
- Open admin cancel modal
- Confirm
- Expected:
- Membership status becomes `CANCELLED`

#### `MEM-23` Admin cancel blocked for non-active membership ✅

- Priority: `P1`
- Status: `Partial`
- Preconditions: cancelled or expired membership
- Steps:
- Attempt admin cancel
- Expected:
- `MEMBERSHIP_NOT_ACTIVE` message is shown

### Scheduler

#### `SCH-01` Trainer create happy path ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: logged-in `ADMIN`
- Steps:
- Open `/admin/trainers`
- Create trainer with valid fields
- Expected:
- Trainer appears in list

#### `SCH-02` Trainer edit happy path ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: existing trainer
- Steps:
- Edit trainer fields
- Save
- Expected:
- Updated values render immediately

#### `SCH-03` Trainer delete with no assigned classes ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: trainer without class assignments
- Steps:
- Delete trainer
- Expected:
- Trainer is removed from list

#### `SCH-04` Trainer delete with assigned classes ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: trainer assigned to scheduled instances
- Steps:
- Delete trainer
- Inspect confirmation modal
- Confirm deletion
- Expected:
- Affected instances are listed in the modal
- Trainer is removed and classes become unassigned

#### `SCH-05` Trainer search and empty state ✅

- Priority: `P1`
- Status: `Covered`
- Preconditions: trainer list exists
- Steps:
- Search by trainer data
- Search for non-existent trainer
- Expected:
- Matching rows are shown
- Empty state renders for no matches

#### `SCH-06` Trainer duplicate email validation ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: existing trainer email
- Steps:
- Create trainer with duplicate email
- Expected:
- Conflict error is shown

#### `SCH-07` Trainer required-field validation ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: logged-in `ADMIN`
- Steps:
- Create trainer missing required fields
- Expected:
- Validation error is shown
- Modal stays open

#### `SCH-08` Trainer photo upload UI presence ✅

- Priority: `P1`
- Status: `Covered`
- Preconditions: trainer opened in edit mode
- Steps:
- Open trainer edit modal
- Expected:
- Photo upload section and accepted-format hint are visible

#### `SCH-09` Trainer photo upload happy path ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: existing trainer, valid image file
- Steps:
- Upload valid JPEG, PNG, or WEBP
- Expected:
- Upload succeeds
- Trainer photo is subsequently retrievable and rendered

#### `SCH-10` Trainer photo invalid format ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: existing trainer
- Steps:
- Upload unsupported file type
- Expected:
- `INVALID_PHOTO_FORMAT` message is shown

#### `SCH-11` Trainer photo too large ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: existing trainer
- Steps:
- Upload file larger than `5 MB`
- Expected:
- `PHOTO_TOO_LARGE` message is shown

#### `SCH-12` Room create happy path ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: logged-in `ADMIN`
- Steps:
- Open `/admin/rooms`
- Create room
- Expected:
- Room appears in list

#### `SCH-13` Room search ✅

- Priority: `P1`
- Status: `Covered`
- Preconditions: rooms exist
- Steps:
- Search by room name
- Expected:
- Matching rooms are shown

#### `SCH-14` Room edit happy path ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: existing room
- Steps:
- Edit room
- Save
- Expected:
- Updated values render immediately

#### `SCH-15` Room delete with no assigned instances ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: room without scheduled classes
- Steps:
- Delete room
- Expected:
- Room disappears from list

#### `SCH-16` Room delete with assigned instances ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: room assigned to scheduled instances
- Steps:
- Delete room
- Inspect confirmation modal
- Confirm deletion
- Expected:
- Affected instances are listed
- Room is removed and instances lose room assignment

#### `SCH-17` Room duplicate name validation ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: existing room name
- Steps:
- Create room with duplicate name
- Expected:
- Conflict error is shown

#### `SCH-18` Room required-field validation ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: logged-in `ADMIN`
- Steps:
- Create room without name
- Expected:
- Validation error is shown

#### `SCH-19` Seeded class templates exist ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: first launch or seeded environment
- Steps:
- Open `/admin/class-templates`
- Expected:
- Default templates are present

#### `SCH-20` Class template create happy path ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: logged-in `ADMIN`
- Steps:
- Create class template with valid fields
- Expected:
- Template appears in library

#### `SCH-21` Class template edit happy path ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: existing template
- Steps:
- Edit template fields
- Save
- Expected:
- Updated values render immediately

#### `SCH-22` Class template delete with no instances ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: template without scheduled instances
- Steps:
- Delete template
- Expected:
- Template disappears from library

#### `SCH-23` Class template delete with scheduled instances ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: template with scheduled instances
- Steps:
- Delete template
- Inspect confirmation modal
- Confirm deletion
- Expected:
- Affected instances are listed
- Instances remain scheduled as standalone entries

#### `SCH-24` Class template search and category filter ✅

- Priority: `P1`
- Status: `Covered`
- Preconditions: multiple templates across categories
- Steps:
- Search by name
- Filter by category
- Expected:
- Results narrow correctly

#### `SCH-25` Class template duplicate name validation ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: existing template name
- Steps:
- Create duplicate-name template
- Expected:
- Conflict error is shown

#### `SCH-26` Scheduler week grid renders ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: logged-in `ADMIN`
- Steps:
- Open `/admin/scheduler`
- Expected:
- Seven-day calendar and week header render

#### `SCH-27` Drag template to grid creates instance ✅

- Priority: `P0`
- Status: `Partial`
- Preconditions: template exists
- Steps:
- Drag template from palette onto grid slot
- Expected:
- New instance is created in that slot
- Persisted instance is visible after refresh or reload

#### `SCH-28` New instance inherits template defaults ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: template with known default duration, capacity, and optional room
- Steps:
- Drag template to grid
- Open created instance
- Expected:
- New instance uses template defaults

#### `SCH-29` Drag existing instance to new slot ✅

- Priority: `P0`
- Status: `Partial`
- Preconditions: existing scheduled instance
- Steps:
- Drag existing instance to another slot
- Expected:
- Instance time or day changes
- Persisted position remains after reload

#### `SCH-30` Class card displays required fields ✅

- Priority: `P1`
- Status: `Covered`
- Preconditions: existing scheduled instance
- Steps:
- Inspect calendar card
- Expected:
- Name, start time, duration, trainer info, and capacity are shown

#### `SCH-31` Edit panel opens from class card ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: existing scheduled instance
- Steps:
- Click class card
- Expected:
- Edit panel opens with editable fields

#### `SCH-32` Edit panel save happy path ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: existing scheduled instance
- Steps:
- Change time, duration, capacity, room, and trainer assignments
- Save
- Expected:
- Card updates immediately
- Persisted changes remain after reload

#### `SCH-33` Delete scheduled class instance ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: existing scheduled instance
- Steps:
- Delete from edit panel
- Expected:
- Instance is removed from calendar

#### `SCH-34` Previous and next week navigation ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: logged-in `ADMIN`
- Steps:
- Use `Next week`
- Use `Previous week`
- Expected:
- URL `?week=` changes correctly

#### `SCH-35` Week deep-link survives reload ✅

- Priority: `P1`
- Status: `Missing`
- Preconditions: known week URL
- Steps:
- Open `/admin/scheduler?week=YYYY-Www`
- Reload page
- Expected:
- Same week remains selected

#### `SCH-36` Copy Week modal opens with class count ✅

- Priority: `P1`
- Status: `Covered`
- Preconditions: classes exist in current week
- Steps:
- Click `Copy Week`
- Expected:
- Confirmation modal opens and shows class count

#### `SCH-37` Copy Week happy path ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: populated source week, empty target week
- Steps:
- Confirm `Copy Week`
- Open next week
- Expected:
- Source-week instances are copied into the next week

#### `SCH-38` Copy Week does not overwrite existing target instances ✅

- Priority: `P1`
- Status: `Missing`
- Preconditions: populated source week and pre-existing target-week instances
- Steps:
- Confirm `Copy Week`
- Inspect target week
- Expected:
- Existing target instances remain untouched
- New instances are added without overwrite

#### `SCH-39` Capacity field bounds ✅

- Priority: `P1`
- Status: `Covered`
- Preconditions: existing scheduled instance
- Steps:
- Open edit panel
- Inspect capacity field min and max behavior
- Expected:
- UI enforces `1..500`

#### `SCH-40` Duration field bounds ✅

- Priority: `P1`
- Status: `Covered`
- Preconditions: existing scheduled instance
- Steps:
- Open edit panel
- Inspect duration field min and max behavior
- Expected:
- UI enforces `15..240`

#### `SCH-41` Server-side save validation on invalid capacity or duration ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: existing scheduled instance
- Steps:
- Submit invalid capacity or duration through save flow
- Expected:
- Error is shown
- Edit panel remains open

#### `SCH-42` Unassigned class visual indicator ✅

- Priority: `P1`
- Status: `Covered`
- Preconditions: class instance without trainers
- Steps:
- Inspect calendar card
- Expected:
- `Unassigned` indicator renders distinctly

#### `SCH-43` Trainer schedule conflict on save ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: overlapping class times for same trainer
- Steps:
- Assign conflicting trainer
- Save
- Expected:
- `TRAINER_SCHEDULE_CONFLICT` message is shown

#### `SCH-44` Room conflict warning indicator ✅

- Priority: `P1`
- Status: `Covered`
- Preconditions: overlapping classes in same room
- Steps:
- Inspect affected class cards
- Expected:
- Amber warning indicator is shown

#### `SCH-45` Room picker empty state ✅

- Priority: `P2`
- Status: `Missing`
- Preconditions: zero managed rooms
- Steps:
- Open edit panel
- Inspect room picker
- Expected:
- `No rooms found` state is shown
- Link to manage rooms is visible

#### `SCH-46` Import modal opens and shows format requirements ✅

- Priority: `P1`
- Status: `Covered`
- Preconditions: logged-in `ADMIN`
- Steps:
- Open import modal
- Expected:
- CSV requirements are visible

#### `SCH-47` Import invalid headers rejects whole file ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: malformed CSV file
- Steps:
- Import file with missing required headers
- Expected:
- `IMPORT_FORMAT_INVALID` message is shown
- No rows are imported

#### `SCH-48` Import file larger than 2 MB ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: CSV larger than `2 MB`
- Steps:
- Import oversized file
- Expected:
- Size error is shown

#### `SCH-49` Import partial success ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: CSV with valid and invalid rows
- Steps:
- Import file
- Expected:
- Valid rows are imported
- Rejected rows appear in error report

#### `SCH-50` Import unknown trainer email ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: CSV row with unknown `trainer_email`
- Steps:
- Import file
- Expected:
- Row is rejected with `TRAINER_NOT_FOUND`

#### `SCH-51` Import unknown room name ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: CSV row with unknown room name
- Steps:
- Import file
- Expected:
- Row is rejected with `ROOM_NOT_FOUND`

#### `SCH-52` Import unknown class name creates standalone instance ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: CSV row whose `class_name` has no matching template
- Steps:
- Import file
- Expected:
- Standalone class instance is created successfully

#### `SCH-53` Import modal cancel ✅

- Priority: `P1`
- Status: `Covered`
- Preconditions: import modal open
- Steps:
- Click `Cancel`
- Expected:
- Modal closes

#### `SCH-54` Export menu opens ✅

- Priority: `P1`
- Status: `Covered`
- Preconditions: logged-in `ADMIN`
- Steps:
- Open export menu
- Expected:
- `Export as CSV` and `Export as iCal` are visible

#### `SCH-55` Export CSV download starts ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: week with schedule data
- Steps:
- Trigger CSV export
- Expected:
- File download begins

#### `SCH-56` Export CSV content ✅

- Priority: `P1`
- Status: `Missing`
- Preconditions: week with known schedule data
- Steps:
- Download exported CSV
- Inspect file content
- Expected:
- Required columns and expected row values are present

#### `SCH-57` Export iCal download starts ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: week with schedule data
- Steps:
- Trigger iCal export
- Expected:
- `.ics` file download begins

#### `SCH-58` Export iCal content ✅

- Priority: `P1`
- Status: `Missing`
- Preconditions: week with known schedule data
- Steps:
- Download exported iCal file
- Inspect file content
- Expected:
- `VEVENT`, `SUMMARY`, `DTSTART`, `DTEND`, and other expected fields are present

#### `SCH-59` Export menu closes after selection ✅

- Priority: `P1`
- Status: `Covered`
- Preconditions: export menu open
- Steps:
- Choose CSV or iCal export
- Expected:
- Menu closes

#### `SCH-60` Admin scheduler route guards for guest ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: guest user
- Steps:
- Open `/admin/scheduler`, `/admin/trainers`, `/admin/rooms`, `/admin/class-templates`
- Expected:
- Each route redirects to `/plans`

#### `SCH-61` Admin scheduler route guards for authenticated non-admin ✅

- Priority: `P0`
- Status: `Missing`
- Preconditions: logged-in `USER`
- Steps:
- Open `/admin/scheduler`, `/admin/trainers`, `/admin/rooms`, `/admin/class-templates`
- Expected:
- Each route redirects to `/plans`

#### `SCH-62` Admin can access scheduler ✅

- Priority: `P0`
- Status: `Covered`
- Preconditions: logged-in `ADMIN`
- Steps:
- Open `/admin/scheduler`
- Expected:
- Week navigator is visible

#### `SCH-63` Mobile viewport warning ✅

- Priority: `P2`
- Status: `Covered`
- Preconditions: narrow viewport
- Steps:
- Open `/admin/scheduler`
- Expected:
- Desktop-only message is shown

## Recommended Next Implementation Order

1. `AUTH-04`
2. `AUTH-08`
3. `AUTH-13`
4. `AUTH-14`
5. `PLAN-11`
6. `PLAN-13`
7. `PLAN-14`
8. `PLAN-18`
9. `MEM-12`
10. `MEM-13`
11. `MEM-19`
12. `MEM-21`
13. `SCH-09`
14. `SCH-27`
15. `SCH-28`
16. `SCH-29`
17. `SCH-32`
18. `SCH-37`
19. `SCH-38`
20. `SCH-50`
21. `SCH-51`
22. `SCH-52`
23. `SCH-56`
24. `SCH-58`

## Assumptions And Gaps

- This catalog only covers features that have both implementation surface and active docs: `auth`, `membership plans`, `user membership purchase`, and `scheduler`.
- It intentionally excludes not-yet-implemented features such as user profile, user access flow, class booking, attendance, notifications, and admin dashboard.
- A few currently `Partial` scenarios are technically present in Playwright, but they are not strong enough to trust as regression protection.
- Concurrency and token-rotation rules are still better validated at integration or API-test level in addition to browser E2E.
