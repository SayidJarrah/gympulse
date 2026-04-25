# Review: Class Booking — 2026-04-18

## Blockers (must fix before PR)

- [x] `frontend/src/components/schedule/MyBookingsDrawer.tsx:263` — `disabled={!booking.isCancellable}` on the Cancel booking button uses the HTML `disabled` attribute. The design spec (spec.md §Accessibility) explicitly forbids this: "Disabled cancel button sets `aria-disabled='true'` and `title='Cancellation closes 2 hours before class start'` — not `disabled` attribute, so tooltip is accessible to keyboard users." The react-conventions skill also documents this as a hard rule. Replace with `aria-disabled="true"` on the button, a wrapping `<span title="Cancellation closes 2 hours before class start">`, and an `onClick` guard (`onClick={booking.isCancellable ? () => onCancelBooking(booking) : undefined}`) plus `pointer-events-none` when locked. The `MyBookingsPage.tsx` implementation correctly uses conditional rendering with no disabled attribute — the drawer must match. — FIXED: replaced `disabled` with `aria-disabled`, wrapped button in `<span>` with conditional `title` tooltip, guarded `onClick`, and added `pointer-events-none` + muted styling when locked.

## Suggestions (non-blocking)

- `MyBookingsPage.tsx:37` — `fetchMyBookings({ page: 0, size: 100 })` fetches all bookings client-side and groups/filters in memory. For members with large histories this will grow unbounded. Consider server-side pagination with separate requests for Upcoming and Past/Cancelled once the page reaches production scale.

- `frontend/src/components/scheduler/AdminAttendeeListPanel.tsx:11` — The panel passes `status: 'CONFIRMED'` hard-coded, bypassing the `ALL` and other status filter values the backend supports. The spec and SDD both describe a single confirmed list for this delivery, so this is correct scope, but a comment documenting the intentional limitation would prevent a future developer from treating it as a bug.

- `frontend/src/components/admin/AdminUserBookingHistoryPanel.tsx:200` — `formatDateTime` is duplicated identically in both `AdminUserBookingHistoryPanel.tsx` and `AdminAttendeeListPanel.tsx`. Extract to `src/utils/scheduleFormatters.ts` to avoid drift between the two admin surfaces.

- `backend/.../BookingService.kt:163` — `getClassAttendees` calls `classInstanceRepository.findWithDetailsById(classId)?.takeIf { it.deletedAt == null }`. The `findWithDetailsById` method likely does a full join-fetch; since only `id`, `name`, `scheduledAt`, and `capacity` are needed for the summary header, a lighter projection query would avoid over-fetching trainer/room data on every admin attendee list open.

- `MyBookingsDrawer.tsx` — The "empty" state renders a plain text row (`No bookings yet.`) without the `CalendarIcon h-8 w-8` illustration and `Book a class from the schedule above.` helper copy specified in spec.md §MyBookingsDrawer states. The functional behavior is correct but the empty state is less polished than the spec intends. The design-standards quality bar asks for a delight-quality empty state on every screen.

## Verdict

APPROVED
