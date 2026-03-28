# Scheduler Feature Test Coverage Review

Date: 2026-03-28
Scope: scheduler coverage outside the dedicated drag-and-drop review in `docs/qa/scheduler-drag-and-drop-coverage.md`

## Executive Summary

Scheduler has the widest test surface in the repo, but also the highest concentration of false-green behavior.

- The single Playwright spec covers trainers, rooms, templates, scheduler pages, import, export, and access control.
- Many scenarios are only smoke-tested.
- Several tests explicitly rely on seed data and then degrade to structural assertions when that data is missing.
- Drag-and-drop has its own dedicated gap review and remains the highest-risk scheduler area.

Result: scheduler coverage looks broad on paper, but much of it is not deterministic enough to catch behavior regressions.

## Reviewed Sources

- `frontend/e2e/class-schedule.spec.ts`
- `frontend/e2e/global-setup.ts`
- `frontend/e2e/global-teardown.ts`
- `docs/prd/scheduler.md`
- `docs/design/scheduler.md`
- `docs/sdd/scheduler.md`
- `docs/qa/scheduler-drag-and-drop-coverage.md`

## Current Coverage By Area

| Area | Status | Notes |
| --- | --- | --- |
| Trainer CRUD basics | Partial | Create, edit shell, delete happy path, search, duplicate error, required-fields modal state are covered. |
| Trainer photo upload | Partial | Only section presence and disabled button state are covered. |
| Room CRUD basics | Partial | Create, edit shell, delete happy path, search, duplicate error, required-fields modal state are covered. |
| Class template CRUD basics | Partial | Seeded template presence, create, edit shell, delete happy path, search/filter, duplicate error are covered. |
| Scheduler page shell | Covered | Grid, week navigation controls, desktop-only message, basic access checks are covered. |
| Drag-and-drop | Weak | Covered separately in `scheduler-drag-and-drop-coverage.md`. |
| Card details, edit panel, delete, bounds | Partial | Most tests depend on existing instances and silently do nothing if none exist. |
| Trainer conflict and room conflict | Weak | Mostly structural checks; real conflict behavior is not proven. |
| Import | Partial | Invalid header, file-size, modal open/close, and partial-result shell are covered. |
| Export | Partial and false-green | Download tests pass even when no download event is observed. |
| Access control | Partial | Unauthenticated checks exist; non-admin authenticated coverage is incomplete. |

## High-Risk False-Green Patterns

### 1. Seed-dependent scenarios degrade to smoke tests

Examples:

- assigned-trainer delete confirmation
- assigned-room delete confirmation
- template-with-instances delete confirmation
- card details/edit/delete flows
- trainer conflict
- room conflict

Pattern used:

- open the page
- only continue if seed data exists
- otherwise pass after basic page render

That means real feature behavior can break without failing the suite.

### 2. Some edit tests do not verify the edited value

Examples:

- trainer edit changes bio but only verifies the row still exists
- room edit changes description but only verifies the original room is still present
- class template edit changes duration but does not verify the new value

These are workflow checks, not behavioral assertions.

### 3. Export tests are permissive

Both download tests catch timeout and still pass if the browser never emits a download event. That makes export coverage non-blocking.

## Detailed Gaps

### Trainers

Current strengths:

- Create, duplicate email error, empty-state search, and blank-submit behavior are covered.

Missing or weak:

- Actual photo upload success and validation failure paths
- Delete-with-assignments confirmation flow
- Edit persistence verification after save
- Pagination and sort behavior
- Non-admin authenticated access control
- Validation detail beyond “modal stays open”

### Rooms

Current strengths:

- Create, duplicate name error, search empty state, and simple delete are covered.

Missing or weak:

- Delete-with-assigned-instances confirmation flow
- Edit persistence verification after save
- Pagination and sort behavior
- Non-admin authenticated access control
- Validation detail and capacity edge cases

### Class Templates

Current strengths:

- Create, search/filter shell, duplicate name error, and simple delete are covered.

Missing or weak:

- True first-visit seeding behavior
- Delete-with-scheduled-instances confirmation flow
- Edit persistence verification after save
- Field validation coverage
- Pagination or large-library behavior
- Non-admin authenticated access control

### Scheduler Calendar Outside DnD

Current strengths:

- Page renders, week URL changes, copy-week modal opens, desktop fallback renders.

Missing or weak:

- Copy Week successful execution and resulting schedule changes
- Edit panel save flow with actual persisted changes
- Delete flow when class instances are absent from seed data
- Real verification of card contents, not just presence
- Positive validation of trainer assignment changes
- Real room-conflict warning behavior
- Real trainer-conflict error behavior
- Accessibility contract from design docs

### Import

Current strengths:

- Invalid file format message
- file-too-large handling
- modal open/close

Missing or weak:

- Imported rows appearing on the calendar immediately
- Detailed rejected-row report verification
- `TRAINER_NOT_FOUND` row handling
- `ROOM_NOT_FOUND` row handling
- Unknown `class_name` creating a standalone instance
- Import into a week that already has data

### Export

Current strengths:

- Export menu opens
- menu closes after selection

Missing or weak:

- Deterministic CSV download verification
- Deterministic iCal download verification
- Export content sanity checks
- Export of correct week data

### Access Control

Current strengths:

- Unauthenticated users are redirected away from admin scheduler routes.

Missing or weak:

- Authenticated non-admin access checks for trainer, room, template, and scheduler pages
- Role-sensitive UI visibility checks inside the admin workflow

## Recommended Next Coverage

### 1. Remove false-green guards

Target:

- replace `if (count > 0)` with deterministic setup
- create required trainers, rooms, templates, and instances within the test or fixture

### 2. Convert workflow tests into persistence tests

Target:

- after edit, reopen and verify updated value
- after conflict action, assert the actual conflict UI or response
- after copy week, verify new instances exist in the next week

### 3. Strengthen import/export assertions

Target:

- require download event for export
- verify imported rows appear in the expected week
- verify rejected rows show specific error reasons

### 4. Add access-control coverage for logged-in non-admin users

Target:

- regular user blocked from `/admin/trainers`
- regular user blocked from `/admin/rooms`
- regular user blocked from `/admin/class-templates`
- regular user blocked from `/admin/scheduler`

## Priority Gaps To Fix First

1. Replace seed-dependent scheduler tests that currently pass without asserting real behavior.
2. Add persistence assertions for trainer, room, and template edit flows.
3. Make export tests fail when download does not happen.
4. Add real copy-week success coverage.
5. Add real conflict-flow tests for trainer and room scenarios.

## Bottom Line

Scheduler has the broadest coverage footprint, but much of it is shallow. The biggest improvement is not adding more tests first, but making the current scheduler tests deterministic and assertion-driven.
