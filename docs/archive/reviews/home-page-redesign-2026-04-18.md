# Review: Home Page Redesign — 2026-04-18

## Blockers (must fix before PR)

- [x] `frontend/src/hooks/useHomePage.ts:158–169` — **Cancel booking is not optimistic and has no error-restore.** Fixed: snapshot `previousBookings` before call, remove booking from state optimistically before `await cancelBooking(next.id)`, restore `previousBookings` and re-throw on error.

- [x] `frontend/src/hooks/useHomePage.ts` — **"Bookings left" stat cell does not decrement optimistically on cancel.** Fixed: added `bookingsUsedOverride: number | null` state; on optimistic cancel sets it to `max(0, currentUsed - 1)`; restores to `null` on error. `MemberStats` now prefers override when non-null.

- [x] `frontend/src/hooks/useHomePage.ts` — **`onTheFloor` is fetched once on mount and never refreshed.** Fixed: added `setInterval(() => void load(), 60_000)` in the viewer-state effect; interval cleared alongside `cancelled = true` in cleanup.

- [x] `frontend/src/hooks/useMemberHomeClassesPreview.ts`, `useMemberHomeMembershipSection.ts`, `useMemberHomeTrainerPreview.ts` — **Three dead hook files not deleted as required by SDD §4.** Fixed: all three files removed via `git rm` and staged for deletion.

- [x] `frontend/src/components/home/MemberStats.tsx:73–78` — **Third stat cell shows "Bookings used" instead of "Favorite coaches."** Fixed: hook fetches `GET /api/v1/trainers/favorites?page=0&size=1` → `totalElements` as `savedCoachesCount`; `MemberStats` third cell now shows eyebrow "FAVORITE COACHES", count, and sub-line "Saved trainers".

- [x] `frontend/src/components/home/HomeHero.tsx:83–87` — **Hero trainer-detail metadata line shows only duration, omitting studio.** Fixed: `useHomePage` now captures `upcomingClass.studio` from `viewer-state` into `nextClassStudio` (option b — no backend change needed); `HomeHero` renders `"{studio} · {durationMin} min"` when studio is available.

- [x] `frontend/src/pages/home/MemberHomePage.tsx:68` — **No responsive padding — page overflows horizontally at 360 px.** Fixed: `px-10` replaced with `px-4 sm:px-6 lg:px-10` on the `<main>` element.

## Suggestions (non-blocking)

- **`useHomePage.ts` does not filter feed events to `kind === "booking" | "class"` before passing to `ActivityFeed`.** The SDD §2 and PRD AC 14 require the home feed to be club-level only (no `checkin` or `pr` events). Currently, all events from the SSE stream are passed directly to `ActivityFeed` via `feedEvents`; filtering to `booking | class` kinds never happens in this hook. `ActivityFeed` itself does not filter by mode — it renders whatever events it receives. In practice the SSE stream may already return only club events for authenticated calls, but the contract is not enforced client-side. Add `.filter(e => e.kind === 'booking' || e.kind === 'class')` when setting `feedEvents` state.

- **`CancelBookingDialog` does not trap focus within the dialog (only `dialogRef.current?.focus()` on the container, no focus cycle).** The `useEffect` calls `focus()` on the `div` once, but Tab and Shift+Tab can still reach elements outside the overlay behind it. For a modal dialog, WCAG 2.4.3 requires a complete focus trap. Wire a `focusTrap` utility or a small `tabbable` query on keydown.

- **`HomeHero` `HomeHeroNoBoked` function name has a typo — "Boked" instead of "Booked".** This is an internal function so it does not affect the public API, but it will generate confusion in code review and IDE navigation. Rename to `HomeHeroNoBooked`.

- **`useHomePage.ts` fetches 10 bookings (`size: 10`) but SDD §2 specifies `size: 3` and then `size: 10` may be a reasonable buffer — however fetching `size: 4` and slicing to 3 for display is already done.** The oversized fetch is benign but wasteful. Reduce to `size: 4` (enough for 3 display + 1 buffer for the "next-up after cancel" scenario) per SDD §3 note.

- **`MembershipSection` treats `bookingsMax === 0` as "unlimited" but the SDD and PRD define unlimited as `bookingsMax === null`.** At `MembershipSection.tsx:64`, `const isUnlimited = bookingsMax === 0` — the Zustand store initialises `bookingsMax` to `0` when `activeMembership?.maxBookingsPerMonth` is falsy. If a plan actually has `maxBookingsPerMonth: 0` (allowed in the admin UI before TD-017 is fixed), this will incorrectly show "Unlimited". Align with the SDD by using a nullable `bookingsMax: number | null` path, returning `null` from the hook when the field is absent or zero.

- **ICS download is missing the `DESCRIPTION` field.** SDD §2 specifies `DESCRIPTION = "with {trainer.name} · {studio}"` in the generated `.ics`. `HomeHero.tsx:118–128` constructs the ICS without a `DESCRIPTION` line. This reduces calendar-event usefulness. Add the `DESCRIPTION` line using `trainerName` and the studio value (once studio data gap is resolved).

- **The no-booked hero (`HomeHeroNoBoked`) does not reuse `HeroNoBooked` from `components/landing/`.** SDD §4 and PRD AC 4 both specify reusing the landing-page `HeroNoBooked` component. The implementation renders a bespoke inline variant. While the visual result is close, maintaining two divergent no-booked variants will drift. The SDD task list item "Import `HeroNoBooked` from `../../components/landing/`" was not completed. Switch to the shared component (which requires passing `nextOpenClass` data — but that is already available from `viewer-state.nextOpenClass`).

- **`BigCountdown` digit color is `#4ADE80` (primary-light / green) but the handoff spec says countdown digits should be white.** The handoff `home_sections.jsx` countdown cells use white (`color: #fff` implicitly via the page default); the label and separator are muted. The current `BigCountdown.tsx:16` hard-codes `text-[#4ADE80]` making all three digits green — energetic, but diverging from the spec. The handoff shows digits in white with the name label muted above. This is a non-blocking styling deviation since it is visually consistent, but flag for design sign-off.

## Verdict

APPROVED — all 6 blockers resolved

---

## Manual-Test Checklist

Use this checklist against the review stack after all blockers are fixed. Each item maps to an acceptance criterion.

### Setup

- Log in as a member with: (a) an active Quarterly plan, (b) at least one upcoming confirmed booking in the future, (c) two or three total upcoming confirmed bookings, (d) at least one favorited trainer. Seed this state before testing.

### Hero — Booked State

- [ ] Page loads at `/home`. Background is `#0F0F0F`. Green radial glow visible top-left. Ambient ECG waveform rendered behind the hero content.
- [ ] Eyebrow reads "Live at the club · N members in" with a pulsing green dot. The member count (N) is a non-zero number from the server.
- [ ] Headline: "Welcome back, / {firstName}." in Barlow Condensed 64px. First name is in green.
- [ ] BigCountdown shows hours, minutes, seconds in 88px Barlow digits, ticking down every second.
- [ ] Countdown label above digits reads "{class name} starts in".
- [ ] Right of countdown: vertical hairline border, "with" muted text, trainer name in white 17px, duration in muted 12px. **Studio name must also appear.**
- [ ] "Add to calendar" button is primary green with shadow. Clicking it downloads a `.ics` file without a network request (check browser network tab — no API call).
- [ ] Open the downloaded `.ics` in a text editor — verify `DTSTART`, `DTEND`, `SUMMARY` are correct. (DESCRIPTION is a suggestion, not required for merge.)
- [ ] "Cancel booking" button is ghost (white border, transparent bg).

### Cancel Booking Flow

- [ ] Clicking "Cancel booking" opens the `CancelBookingDialog`.
- [ ] Dialog shows the class name in bold.
- [ ] Pressing Escape closes the dialog without cancelling.
- [ ] Clicking "Keep booking" closes the dialog without cancelling.
- [ ] Clicking "Yes, cancel" while the API call is in flight: button shows "Cancelling…", both buttons are disabled.
- [ ] On cancel success: dialog closes, toast "Cancelled {class name}" appears, upcoming list removes the cancelled booking, the next booking is now "Next up".
- [ ] The "Bookings left" stat cell decrements by 1 immediately after cancel (optimistic).
- [ ] Simulate a cancel API failure (e.g. disable network after clicking confirm): the booking should be restored to the top of the upcoming list, and an error toast appears.

### Hero — T-0 Behaviour

- [ ] Set system time or use a booking starting in < 60 seconds. As the countdown reaches 00:00:00, the digits are replaced by the "Class starting · check in" green banner.
- [ ] Countdown continues ticking for the next booking after T-0.

### Hero — No-Booked State

- [ ] Log in as a member with no upcoming confirmed bookings. The hero switches to the no-booked variant showing a "Grab a spot" CTA.
- [ ] "Grab a spot →" navigates to `/schedule`.
- [ ] "browse the full schedule" link navigates to `/schedule`.

### Stats Strip

- [ ] Three stat cells render: "BOOKINGS LEFT" (bookingsMax − bookingsUsed / bookingsMax), "PLAN RENEWS" (days / date), "FAVORITE COACHES" (count / sub-line with names). **Cell 3 must not say "Bookings used".**
- [ ] Skeleton placeholders show during membership loading (three gray pulse blocks).
- [ ] For an unlimited plan (bookingsMax = null): "BOOKINGS LEFT" cell shows "Unlimited" without a denominator.

### Activity Feed

- [ ] Feed eyebrow reads "AT THE CLUB" (not "Activity" or "Live at the club").
- [ ] Feed contains class-level events only — no entries showing individual member names for check-ins or PRs.
- [ ] One row is highlighted (opacity 1) at a time; others are dimmed (opacity ~0.55). Active row cycles approximately every 2.8 seconds.
- [ ] Feed has a 60px bottom fade overlay.
- [ ] Inspect the DOM — activity feed container has `role="log"` and `aria-live="polite"`.

### Upcoming Section

- [ ] Three booking rows rendered (or fewer if member has fewer bookings).
- [ ] First row has a green "Next up" pill with a solid green dot. Day label is in green.
- [ ] Subsequent rows have a grey "Booked" pill. Day label is white.
- [ ] Day labels: "Today", "Tomorrow", or abbreviated weekday ("Thu", "Sat").
- [ ] Clicking any row navigates to `/schedule?classId={id}`.
- [ ] "Open schedule →" link navigates to `/schedule`.
- [ ] Skeleton shows three pulse blocks during loading.
- [ ] With zero upcoming bookings: renders "No sessions booked" text and an "Open schedule →" button.

### Membership Section

- [ ] Shows plan name in Barlow 34px uppercase on two lines: "{planName} / Membership".
- [ ] "ACTIVE" green pill visible when status is ACTIVE.
- [ ] Bookings progress bar: fill = used/max ratio, gradient from green to light-green, glow effect visible.
- [ ] "Bookings this cycle: N / M" label above bar.
- [ ] Renewal mini-card: "RENEWS" eyebrow, formatted date, days countdown in green 28px Barlow.
- [ ] "Manage membership" button full-width, navigates to `/membership`.
- [ ] Corner glow (green radial, top-right) visible.
- [ ] Skeleton shows a single full-height pulse block during loading.
- [ ] With no active plan (planName = null): shows "No plan active" state with "Browse plans" button navigating to `/plans`.
- [ ] Unlimited plan (bookingsMax = null): progress bar hidden, "Unlimited" text shown.

### Accessibility

- [ ] Enable a screen reader and navigate to the countdown region. The screen reader should announce changes ("Morning Flow Yoga starts in 2 hours 14 minutes") via the hidden `aria-live="polite"` span — not with disruptive interruptions.
- [ ] Tab through the page — UpcomingSection rows are focusable (tabIndex=0) and show a green focus ring.
- [ ] Open the cancel dialog — verify Tab key stays within the dialog; pressing Escape closes it.

### Reduced Motion

- [ ] Set `prefers-reduced-motion: reduce` in browser DevTools (Rendering panel).
- [ ] Verify: pulsing green dot stops animating; ambient waveform stops scrolling; activity feed crossfade is instantaneous; countdown digits continue ticking.

### Layout / Responsive

- [ ] At 1440px viewport: two-column hero row, three-column stats strip, two-column bottom row all render side-by-side.
- [ ] Resize to 360px: no horizontal scrollbar. All content is readable.
- [ ] Resize to 768px: two-column grids should stack to single-column.

### Navigation

- [ ] Nav shows "Schedule", "Trainers", "Membership" links and the user-name pill with avatar initial.
- [ ] Footer shows gym address and hours.
- [ ] Logo navigates to home (`/`).

### Data Freshness

- [ ] Wait 60 seconds on the page (with the review stack running). The "N members in" eyebrow count should update if the server-side `onTheFloor` value has changed (requires the 60s poll blocker to be fixed first).
