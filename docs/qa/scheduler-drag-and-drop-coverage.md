# Scheduler Drag-and-Drop Test Coverage Review

Date: 2026-03-28
Scope: admin scheduler drag-and-drop behavior in `/admin/scheduler`

## Executive Summary

Current drag-and-drop automation is not reliable enough to catch real regressions.

- There are 2 direct Playwright tests for drag-and-drop in `frontend/e2e/class-schedule.spec.ts`.
- Both tests are non-blocking: they pass even when drag-and-drop does nothing.
- There are 2 supporting unit tests:
  - `frontend/src/utils/__tests__/week.test.ts` covers slot-to-time mapping.
  - `frontend/src/store/__tests__/schedulerStore.test.ts` covers temp ID replacement in the store.
- Adjacent scheduler tests often use `if (count > 0)` guards, so they silently pass when required class instances are missing.

Result: the suite currently exercises the scheduler UI, but it does not deterministically prove that drag-and-drop create and move flows work end to end.

## Reviewed Sources

- `frontend/e2e/class-schedule.spec.ts`
- `frontend/e2e/global-setup.ts`
- `frontend/e2e/global-teardown.ts`
- `frontend/src/components/scheduler/WeekCalendarGrid.tsx`
- `frontend/src/components/scheduler/ClassPalette.tsx`
- `frontend/src/components/scheduler/ClassInstanceCard.tsx`
- `frontend/src/pages/admin/AdminSchedulerPage.tsx`
- `frontend/src/store/__tests__/schedulerStore.test.ts`
- `frontend/src/utils/__tests__/week.test.ts`
- `docs/prd/scheduler.md`
- `docs/design/scheduler.md`
- `docs/bugs/20260328-221730-scheduler-drag-drop.md`

## Current Automated Coverage

| Scenario | Current automation | Status | Notes |
| --- | --- | --- | --- |
| Scheduler page renders week grid and drop targets | Playwright AC 23 | Covered | Verifies the calendar shell loads, not the DnD behavior itself. |
| Template drop computes visible slot time correctly | Vitest `week.test.ts` | Partial | Tests the helper used for slot calculation, but not the actual DOM drop event wiring. |
| Optimistic create replaces temp instance with persisted backend instance | Vitest `schedulerStore.test.ts` | Partial | Covers store replacement only, not the full page flow after dropping a template. |
| Drag template from palette to grid creates instance | Playwright AC 24 | Partial and false-green | Test only asserts if card count increases. If nothing happens, it still passes. |
| Drag existing class instance to another slot | Playwright AC 25 | Partial and false-green | Test does not assert that time/day changed or that a PATCH request was sent. |
| Created or moved card can be opened/edited/deleted immediately | No deterministic DnD-specific test | Missing | The temp-ID bug described in `docs/bugs/20260328-221730-scheduler-drag-drop.md` is only indirectly covered. |
| DnD behavior with seeded conflicts or trainer assignments | Seeded data exists in `global-setup.ts` | Partial | Data exists, but there is no direct DnD assertion that uses it. |

## Direct DnD Test Inventory

### `AC 24 - dragging a class template from the palette onto a day/time slot creates a class instance`

Current behavior:

- Opens `/admin/scheduler`
- Finds the first draggable template tile
- Drags it to the first `gridcell`
- Compares card count before and after
- Only asserts if the count increased

Why this is weak:

- No assertion that a `POST /admin/class-instances` request was sent
- No assertion that the created card appears in the dropped slot
- No assertion that the created time matches the target slot
- No assertion that the new card can be interacted with immediately
- The test passes when drag-and-drop produces no visible result

### `AC 25 - dragging an existing class instance to a different slot updates its position`

Current behavior:

- Opens `/admin/scheduler`
- Locates the first class instance card if one exists
- Drags it to another `gridcell`
- Waits 1 second
- Verifies the page still shows the `Copy Week` button

Why this is weak:

- No assertion that a `PATCH /admin/class-instances/:id` request was sent
- No assertion that the instance moved to the target day/time
- No assertion that the card label changed
- No assertion that rollback happens on API failure
- The test is skipped logically when no seed instance is present

## Supporting Tests That Help But Do Not Close The Gap

### `frontend/src/utils/__tests__/week.test.ts`

What it proves:

- The first visible slot maps to `06:00 UTC`
- Half-hour slot alignment works across days

What it does not prove:

- `WeekCalendarGrid` uses the helper correctly during the real drop event
- A drop on the DOM grid produces the expected callback payload
- The visible card lands in the correct cell after a drop

### `frontend/src/store/__tests__/schedulerStore.test.ts`

What it proves:

- `replaceInstance(previousId, persistedInstance)` swaps a temp card for the real backend entity

What it does not prove:

- `AdminSchedulerPage` calls the correct store action after a successful drop
- A freshly dropped class is editable or draggable before a refetch
- The full optimistic create flow survives real API timing and UI rerendering

## Adjacent Scheduler Tests With Hidden Coverage Gaps

The scheduler spec contains multiple tests that only run meaningful assertions when data already exists:

- AC 26 card details
- AC 27 click card to open edit panel
- AC 28 trainer conflict path
- AC 29 room conflict indicator
- AC 30 delete scheduled class instance
- AC 33 capacity bounds in edit panel
- AC 34 unassigned styling
- AC 35 duration bounds in edit panel

Pattern used today:

- check `count > 0`
- if true, do a real assertion
- if false, the test effectively becomes a page-smoke test and still passes

This means seed drift or drag-and-drop failure can remove the very data these tests depend on without turning the suite red.

## Missing Scenarios

The following drag-and-drop scenarios are currently unprotected or only indirectly protected.

| Scenario | Status | Why it matters |
| --- | --- | --- |
| Template drop sends create request | Missing | Core create flow can break without test failure. |
| Existing card drop sends move request | Missing | Core rescheduling flow can break without test failure. |
| Drop target time matches rendered slot, especially `06:00` | Missing end to end | This is the exact bug captured in `docs/bugs/20260328-221730-scheduler-drag-drop.md`. |
| Drop target day matches rendered column | Missing | A move can succeed to the wrong day and still look plausible. |
| Created card is rendered immediately in the correct visible slot | Missing | Protects optimistic UI behavior. |
| Newly created card is reconciled with backend ID and remains editable | Missing end to end | Prevents regressions like the temp-ID issue. |
| Move failure rolls back card position | Missing | Required for safe optimistic updates. |
| Create failure removes optimistic card and shows error | Missing | Prevents ghost classes after API failure. |
| Drag-over highlight on active drop target | Missing | Important UI affordance and a good low-level component test. |
| Keyboard alternative for palette-to-grid placement | Missing | Required by design, and current implementation does not appear to be tested. |
| Accessibility contract for DnD elements (`role="grid"`, rich cell labels, `aria-grabbed`) | Missing | The design spec defines these behaviors, but there is no dedicated test coverage. |
| Boundary slots near start/end of visible window (`06:00`, `21:30`) | Missing | Boundary math is a common DnD regression source. |
| Cross-day move to another weekday at the same time | Missing | Common scheduling path. |
| Repeated drags within one session without refresh | Missing | Would catch stale optimistic state and temp-ID issues. |

## Test Data Situation

Current setup is better than pure historical-data reliance, but not yet strict enough for DnD.

What exists now:

- `frontend/e2e/global-setup.ts` logs in through the API and creates known scheduler fixtures for the current week.
- `frontend/e2e/global-teardown.ts` deletes seeded and newly created entities and sweeps nearby weeks for leftover instances.

Remaining problems:

- DnD tests still depend on shared suite-level seed data rather than creating their own minimal fixtures.
- Several tests silently downgrade to smoke tests if the expected seeded instances are missing.
- The spec file itself documents that some cases "require seed data", which means the test intent is still coupled to external setup rather than to self-contained preconditions.

## Recommended Coverage Shape

### 1. Add deterministic component tests around `WeekCalendarGrid`

Target:

- Simulate `drop` with a mocked `DataTransfer`
- Assert `onDropTemplate` and `onInstanceDrop` receive the exact ISO timestamp for:
  - Monday `06:00`
  - Monday `10:30`
  - Wednesday `06:30`
  - Sunday `21:30`

Why first:

- Fast feedback
- Catches slot-mapping regressions without browser flakiness

### 2. Replace best-effort Playwright DnD checks with request-aware assertions

Target:

- For create: assert a `POST /api/v1/admin/class-instances` call is made after drop
- For move: assert a `PATCH /api/v1/admin/class-instances/:id` call is made after drop
- Assert the resulting card appears with the expected visible time label

Preferred data strategy:

- Create fixture template, trainer, room, and class instance through API in the test or in a per-test fixture
- Delete them in test teardown, not only in global teardown

### 3. Add rollback and post-drop interaction coverage

Target:

- Failed create removes optimistic card and shows error
- Failed move restores original position and shows error
- Freshly created card can be clicked, edited, moved again, and deleted without refresh

### 4. Add explicit accessibility and keyboard coverage if the design contract still stands

Target:

- Palette tile keyboard pickup
- Grid keyboard navigation and drop
- Required ARIA states and labels on DnD elements

## Priority Gaps To Fix First

1. Deterministic create-after-drop assertion for AC 24
2. Deterministic move-after-drop assertion for AC 25
3. Boundary-slot mapping coverage for `06:00` and `21:30`
4. Post-create interaction coverage to catch temp-ID reconciliation regressions
5. Remove `if (count > 0)` false-green patterns from scheduler tests that are expected to validate real class instances

## Bottom Line

The project has scheduler automation, but drag-and-drop coverage is currently only partial. The highest-risk gap is that the suite does not fail when the two core DnD behaviors stop working. Until AC 24 and AC 25 become deterministic and self-contained, the scheduler suite will continue to allow false greens.
