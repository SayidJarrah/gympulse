# Design: Class Booking & Cancellation

## Reference
- PRD: `docs/prd/class-booking-cancellation.md`
- SDD: pending
- Design System: `docs/design/system.md`
- Date: 2026-04-04

## Benchmark

Peloton class booking flow — booking state is embedded directly in each class card (available / booked / full) rather than behind a separate booking page. A compact confirmation modal appears in-context over the schedule. Booking status updates the card immediately after confirm. Chosen because it minimises navigation interruption for a high-frequency action and keeps the member oriented to the full schedule while confirming their spot.

## User Flows
1. Member opens `/schedule`, sees upcoming classes with booking actions embedded in each card instead of a read-only experience.
2. Available class card shows a primary `Book spot` CTA. Member clicks it, a compact confirmation modal opens, and on success the card switches to a booked state.
3. Already booked class card shows `Booked` and a secondary `Cancel booking` action until the three-hour cutoff is reached.
4. Member tries to book a full class. The button is disabled or the action returns an inline message: `This class is fully booked.`
5. Member tries to cancel inside the final three hours before start. The booking remains intact and the UI explains that cancellation is closed.
6. User without an ACTIVE membership sees schedule browsing but booking actions are blocked by a membership-required state.
7. Admin opens an on-behalf booking panel from the admin side and books a member into a class while bypassing membership requirement but still respecting capacity and duplicate-booking rules.
8. Member books or cancels from the schedule and receives immediate visual reinforcement: card-state change, active-booking summary update, and a lightweight toast confirmation.

## Screens & Components
### Screen: Group Classes Schedule with Booking (`/schedule`)
Who sees it: authenticated `USER` accounts. Booking controls depend on ACTIVE membership.
Purpose: extend the existing schedule experience with booking state and cancellation actions.
Layout: preserve the existing Group Classes Schedule page layout and sticky toolbar. Changes are additive inside class cards, the class detail modal, and schedule-level messaging.

#### BookableClassCard
- Purpose: show class details and booking state directly in the schedule.
- Data shown: `name`, local date when needed, local time range, trainer names, remaining spots or full state, and current-user booking state.
- Tailwind structure:
  - Base: reuse schedule card shell from the schedule design
  - Footer row: `mt-4 flex flex-col gap-3 border-t border-gray-800 pt-4`
- States:
  - Available: green primary CTA
  - Booked: green confirmation badge + secondary `Cancel booking`
  - Full: orange status badge, no primary CTA
  - Cancellation locked: booked badge + disabled cancel action + helper line
- Interaction notes:
  - Card lift on hover
  - stronger border emphasis when the class becomes booked
  - visible capacity cue for low remaining spots

##### Available state
- Spots line: `{n} spots left`
- Primary CTA: `Book spot`
- Secondary link: `View details`

##### Booked state
- Confirmation badge: `Booked`
- Supporting line: `Your place is reserved.`
- Secondary CTA: `Cancel booking`

##### Full state
- Status badge: `Fully booked`
- Supporting line: `No spots left in this class.`
- No book CTA in this state

##### Membership-required state
- Supporting line: `Active membership required to book.`
- Primary CTA: `Browse plans`

##### Cancellation-locked state
- Supporting line: `Cancellation closes 3 hours before class start.`
- Cancel CTA is disabled

#### BookingConfirmModal
- Purpose: confirm the booking action without forcing the user to leave the schedule.
- Data shown: class name, date, time, trainer, and a short confirmation line.
- User actions: `Confirm booking`, `Keep browsing`
- Tailwind structure:
  - Overlay: shared modal pattern
  - Panel: `w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl shadow-black/60`
- Success path: modal closes and the underlying class card updates to `Booked`.
- Error path:
  - `CLASS_FULL`: inline orange banner
  - `ALREADY_BOOKED`: inline orange banner
  - generic error: inline red banner

#### CancelBookingModal
- Purpose: warn the user before releasing their spot.
- Data shown: class name, date/time, and policy line about the three-hour cutoff.
- User actions: `Cancel booking`, `Keep booking`
- Tailwind structure:
  - Same shared modal shell as booking confirmation
  - Destructive button uses red emphasis
- Success path: modal closes and the class card returns to `Book spot` if the class still has capacity.
- Locked path: if the booking becomes non-cancellable before submit, replace body with the cancellation-window-closed message.

#### BookingToast
- Purpose: give lightweight confirmation after booking or cancellation.
- Placement: fixed bottom-center on mobile, bottom-right on desktop.
- Success booking copy: `Spot booked.`
- Success cancellation copy: `Booking cancelled.`
- Error full copy: `This class is fully booked.`
- Motion: short slide-up entrance, auto-dismiss after a brief interval

#### BookingSummaryBar
- Purpose: give the member lightweight awareness of their booking state without introducing a full bookings dashboard.
- Placement: directly under the schedule header and above the sticky toolbar when the user has at least one active booking in the current visible period.
- Data shown: count of booked classes in the visible date range.
- Copy: `You have 3 booked classes in this view.`
- CTA: `See my bookings`
- Extended presentation:
  - a compact horizontal rail of currently booked classes
  - each booked item shows name, time, and status (`Booked` or `Cancellation locked`)

#### MyBookingsDrawer
- Purpose: present the member’s own bookings without leaving the schedule context.
- Trigger: `See my bookings`
- Data shown: booked classes grouped into `Upcoming` and `Past / inactive`.
- User actions: navigate to a class in the schedule, cancel an eligible booking.
- Tailwind structure: right-side sheet on desktop, bottom sheet on mobile.
- Note: this is the first version of the member’s bookings list and stays secondary to the schedule.

### Screen: Admin On-Behalf Booking Panel (`/admin/...`)
Who sees it: `ADMIN`
Purpose: allow staff to reserve a spot for a specific member without requiring that member to have an ACTIVE membership.
Layout: compact side panel or modal invoked from an admin class instance row/card.

#### AdminBookForMemberPanel
- Data shown:
  - selected class summary
  - member lookup field
  - selected member summary
  - capacity warning area
- User actions:
  - search/select member
  - confirm booking
  - cancel
- Validation:
  - member must exist
  - class must still be `SCHEDULED`
  - class must not be full
  - selected member must not already be booked into the same class
- Error handling:
  - `CLASS_FULL`: inline orange banner
  - `ALREADY_BOOKED`: inline orange banner
  - `CLASS_NOT_FOUND` / `CLASS_NOT_BOOKABLE`: inline red banner

## Component States
| Component | Loading | Empty | Error | Populated |
|-----------|---------|-------|-------|-----------|
| BookableClassCard | Existing schedule skeleton + disabled CTA placeholder. | N/A. | Inline action error banner beneath the card body. | Available, booked, full, membership-required, or cancellation-locked state. |
| BookingConfirmModal | Confirm button enters loading state. | N/A. | Inline banner in modal body. | Class summary + confirm action. |
| CancelBookingModal | Destructive button enters loading state. | N/A. | Inline banner in modal body. | Class summary + cancellation warning. |
| BookingSummaryBar | Hidden during initial schedule load. | Hidden if no visible bookings. | Hidden; page-level schedule errors take precedence. | Visible count + CTA + booked-class strip. |
| MyBookingsDrawer | Skeleton list rows. | `No bookings yet.` empty state. | Drawer-level retry card. | Grouped booking rows with cancel affordance where allowed. |
| AdminBookForMemberPanel | Search results and submit button show loading state independently. | `Search for a member to continue.` | Inline validation / API banners. | Selected class + selected member + confirm action. |

## Error Code → UI Message
| Error Code | Message shown to user | Location |
|-----------|----------------------|----------|
| `MEMBERSHIP_REQUIRED` | `Active membership required to book.` | BookableClassCard |
| `CLASS_FULL` | `This class is fully booked.` | BookableClassCard, BookingConfirmModal, BookingToast |
| `ALREADY_BOOKED` | `You already booked this class.` | BookingConfirmModal |
| `CLASS_ALREADY_STARTED` | `Booking is no longer available because this class has already started.` | BookingConfirmModal |
| `CLASS_NOT_BOOKABLE` | `This class is no longer open for booking.` | BookingConfirmModal |
| `CANCELLATION_WINDOW_CLOSED` | `You can no longer cancel within 3 hours of class start.` | CancelBookingModal and BookableClassCard helper text |
| `BOOKING_NOT_ACTIVE` | `This booking can no longer be cancelled.` | CancelBookingModal |
| `ACCESS_DENIED` | `Only admins can book on behalf of a member.` | AdminBookForMemberPanel |

## Responsive Behaviour
- Mobile:
  - Booking CTA stays directly inside each class card and spans full width.
  - Confirmation and cancel modals use a bottom-sheet presentation.
  - My Bookings opens as a bottom sheet with stacked rows.
- Tablet:
  - Class cards keep action row visible without expanding card height excessively.
  - Booking summary bar stays compact.
- Desktop:
  - Card actions can sit inline with spot/count information.
  - My Bookings opens as a right-side drawer.
  - Admin on-behalf booking uses a side panel rather than a blocking modal.
