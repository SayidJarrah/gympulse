# Bug Brief: scheduler-drag-drop — dropping in the weekly calendar can place classes in the wrong time slot or make them disappear

Date: 2026-03-28 22:17
Reported by: codex

## Failing Test
Spec file: `frontend/e2e/class-schedule.spec.ts`
Relevant tests:
- `AC 24 — dragging a class template from the palette onto a day/time slot creates a class instance`
- `AC 25 — dragging an existing class instance to a different slot updates its position`

No deterministic failing assertion currently protects this behavior. Both DnD tests are written as
best-effort checks and intentionally do not fail when drag-and-drop produces no visible result.

## Symptom
Expected: dragging a class template or an existing class instance onto a visible calendar slot in
`/admin/scheduler` should create or move the class to that exact visible day/time immediately.

Observed: the frontend drop logic computes the dropped time from the start of the week at `00:00`
UTC instead of from the visible grid start at `06:00`. As a result, dropping into the top visible
slots maps to times between `00:00` and `05:30`, which are outside the rendered scheduler range and
can make the class appear to vanish. In addition, newly created classes are stored optimistically
with a temporary `temp-*` ID that is never reconciled with the backend-generated ID, so follow-up
move/edit/delete actions on the newly dropped card can fail until the page is refreshed.

## Code Evidence
The scheduler grid renders visible time rows starting at `06:00`, but the drop handler omits that
offset when calculating `scheduledAt`:

- `frontend/src/components/scheduler/WeekCalendarGrid.tsx`
  - `START_HOUR = 6`
  - visible row labels are built with `weekStart + slotIndex * 30m + START_HOUR`
  - drop timestamps are built with `weekStart + dayIndex * 24h + slotIndex * 30m`

That means:
- dropping on the first visible slot (`slotIndex = 0`) produces `00:00Z`, not `06:00Z`
- dropping on Monday `10:30` produces Monday `04:30Z`
- any dropped time before `06:00` is filtered out from rendering because card placement is
  calculated relative to `06:00`

There is a second frontend bug in the optimistic create flow:

- `frontend/src/pages/admin/AdminSchedulerPage.tsx` adds a temporary instance with ID
  `temp-${Date.now()}`
- after `POST /api/v1/admin/class-instances` succeeds, it calls `updateInstance(created)`
- `frontend/src/store/schedulerStore.ts` only replaces an existing item when `item.id === instance.id`

Because the real backend ID never matches the temp ID, the optimistic card is never replaced with
the persisted instance. The UI continues to reference a stale temp object until a refetch occurs.

## Runtime Evidence
- `docker compose -f docker-compose.full.yml ps` on 2026-03-28 showed `backend`, `frontend`, and
  `postgres` running.
- Backend health returned `200` from inside the backend container.
- Frontend access logs show repeated successful `GET` requests for:
  - `/admin/scheduler`
  - `/api/v1/admin/class-instances?week=2026-W13`
  - `/api/v1/admin/class-templates?page=0&size=200`
  - `/api/v1/admin/trainers?page=0&size=200`
- A search through current container logs did not find `POST` or `PATCH /api/v1/admin/class-instances`
  traffic during the inspected scheduler sessions, which is consistent with drag-and-drop not
  completing the expected create/move request path.

No backend exception related to class-instance scheduling appeared in the sampled logs.

## Spec / Requirement Context
The PRD requires:
- an admin can drag a template onto a day/time slot and create a scheduled instance
- an admin can drag an existing class instance to a different day/time slot and update it immediately

The design spec also states that calendar card placement is calculated relative to `06:00`.

## Suspected Layer
Primary issue: frontend scheduler implementation

Reason:
- the incorrect drop timestamp is computed entirely in the frontend
- the temp-ID reconciliation bug is also entirely in the frontend
- backend logs reviewed here do not indicate request rejection or scheduling exceptions

There is a separate documentation inconsistency to track later:
- `docs/prd/scheduler.md` says 15-minute increments
- the implemented frontend grid and backend validation both use 30-minute increments

That documentation mismatch is not the primary cause of the reported drag-and-drop failure.

## Suggested Agent
@frontend-dev

## Reproduction Steps
1. Start the GymFlow Docker stack.
2. Log in as an admin in a desktop browser with width at least `1024px`.
3. Navigate to `/admin/scheduler`.
4. Confirm at least one class template is visible in the left `Class Templates` palette.
5. Drag a template onto a visible early slot, for example Monday `06:00`.
6. Observe that the new card may not appear in the visible grid even though the drop was accepted.
7. If a card does appear after a different drop, try to drag or edit that newly created card before
   refreshing the page.
8. Observe that follow-up actions can behave inconsistently because the UI still holds a temporary ID.

## Smallest Recommended Fix
1. In `WeekCalendarGrid`, include `START_HOUR` in the `scheduledAt` calculation used by `handleDrop`.
2. In the optimistic create flow, replace the temp instance with the persisted backend instance
   instead of calling a plain ID-based update with a different ID.
3. Add one deterministic DnD verification path that fails when no create/move request is sent or
   when the resulting visible time does not match the drop target.
