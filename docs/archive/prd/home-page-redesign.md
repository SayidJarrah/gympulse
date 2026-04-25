# PRD: Member Home — "Pulse" Redesign

## Overview

The member home page receives a full visual and compositional overhaul to match the
"Pulse" design DNA introduced in the landing-page redesign. The page becomes a live,
activity-driven experience — a countdown to the next booked class, an ambient ECG
waveform, a real-time club activity feed, and a compact membership card. No new features
are introduced; the data contracts are entirely served by existing endpoints.

## Goals

- What user problem does this solve?
  The previous home was a flat card-grid that did not communicate the live state of the
  club or create urgency around the member's next booked session. It felt static and
  disconnected from the gym-floor energy.
- What business outcome does it enable?
  A live, identity-forward home surface increases session stickiness, surfaces the next
  booked class immediately, and reinforces the "Pulse" brand identity consistently between
  the landing page and the logged-in experience.

## User Roles Involved

- User (authenticated member)

## User Stories

### Happy Path Stories

- As a User with an upcoming booked class, I want to see a live countdown to that class
  as the first thing on my home page so that I feel connected to my next session.
- As a User, I want to see the next three booked sessions at a glance so that I can plan
  my week without opening the full schedule.
- As a User, I want to see my membership status, bookings-used progress, and renewal date
  in one compact card so that I understand my remaining entitlement without navigating away.
- As a User, I want three stat cells showing bookings left, days until renewal, and saved
  coaches so that I can track my activity at a glance.
- As a User, I want to see a live club activity feed of class-level events (spots filling,
  new classes, sold-out notices) so that I feel connected to the gym floor in real time.
- As a User, I want an "Add to calendar" action on my next booked class so that I can
  save it to my device calendar.
- As a User, I want to cancel a booking from the home page with a confirmation step so
  that I can free up a spot without going to the full bookings screen.

### Edge Case Stories

- As a User with no upcoming bookings, I want the hero to switch to a "grab a spot" view
  showing the next open class so that the page stays actionable.
- As a User with zero upcoming bookings in the upcoming-sessions section, I want a clear
  empty state ("No sessions booked") with a link to open the schedule so that the section
  does not look broken.
- As a User, I want the countdown to reach zero gracefully — swapping to a "Class
  started · Check in now" banner — rather than showing negative numbers.
- As a User who prefers reduced motion, I want all purely decorative animations (waveform
  scroll, dot pulse, feed crossfade) to stop while the countdown continues ticking so
  that the page is comfortable and the countdown still functions as information.

## Acceptance Criteria

1. The member home page at `/` (for authenticated members) renders in the Pulse visual
   system: `#0F0F0F` page background, Barlow Condensed display type, electric-green
   primary accents, ambient waveform, radial green glow.
2. The page layout matches the handoff exactly: hero row (1.3fr : 1fr grid, gap 40px,
   min-height 440px), stats strip (3-col, gap 14px), bottom row (1.4fr : 1fr grid, gap
   20px), footer.
3. When the member has a next booked class, `HomeHero` shows:
   - a pulsing green dot + "Live at the club · {N} members in" eyebrow
   - a "Welcome back, {firstName}." headline (64px Barlow Condensed, first name in
     primary green)
   - a `BigCountdown` ticking to the class start time (88px Barlow digits)
   - trainer name, studio, and duration displayed to the right of the countdown
   - "Add to calendar" (primary green button) and "Cancel booking" (ghost button)
4. When the member has no upcoming booked class, `HomeHero` renders the `HeroNoBooked`
   variant (reused from the landing page), showing the next open class with a "Grab a
   spot" CTA.
5. The countdown ticks every second. At T-0 the countdown is replaced by a "Class
   started · Check in now" banner. The next upcoming booking then drives a fresh
   countdown.
6. "Cancel booking" triggers a confirmation dialog. On confirm, the booking is cancelled
   via `DELETE /api/v1/bookings/{id}`, the upcoming list is updated optimistically, the
   first stat cell decrements, and a toast reads "Cancelled {class name}".
7. "Add to calendar" generates and downloads a `.ics` file from the booked class
   `startsAt`. No Google OAuth integration in this version.
8. `MemberStats` renders three cells: "Bookings left" (`bookingsMax - bookingsUsed` /
   `bookingsMax`), "Plan renews" (days until `renewsAt` / renewal date), "Favorite
   coaches" (count of favorited trainers / sub-line with first two names plus "+N").
9. `UpcomingSection` renders the next three CONFIRMED upcoming bookings. Rows are
   clickable and navigate to `/schedule?classId={id}`. "Open schedule →" navigates to
   `/schedule`.
10. The first row in `UpcomingSection` has a green "Next up" pill; subsequent rows have a
    grey "Booked" pill.
11. When `upcomingBookings` is an empty array, `UpcomingSection` renders an empty-state
    card: "No sessions booked · Open schedule to book your week".
12. `MembershipSection` renders plan name (Barlow 34px), ACTIVE/PAUSED/EXPIRED status
    pill, bookings progress bar (fill = used/max, glow, gradient), renewal mini-card
    (date + days countdown), and a "Manage membership" button linking to `/membership`.
13. When `bookingsMax` is `null` or `Infinity`, the progress bar is hidden and "Unlimited"
    is shown in its place.
14. `ActivityFeed` on the home page uses `mode="club"`: the eyebrow reads "AT THE CLUB",
    events are of `kind ∈ ["booking", "class"]` only (no personal check-ins or PRs), and
    `actor` is a class name, not a person's name.
15. The activity feed is populated by the same SSE stream used on the landing page
    (`GET /api/v1/landing/activity/stream`). The home page subscribes as an authenticated
    client using the existing `useLandingActivityFeed` hook or equivalent.
16. The active highlight in the activity feed rotates every 2800ms. On `prefers-reduced-motion`
    the rotation stops (feed is static) but items remain readable.
17. The ambient waveform, radial green glow, and dot-pulse animation respect
    `prefers-reduced-motion: reduce` by halting. The BigCountdown continues ticking.
18. The hero countdown `aria-label` updates every tick: "Morning Flow Yoga starts in
    {H} hours {M} minutes". A visually hidden `aria-live="polite"` mirror is used so
    assistive technology announces updates without being overly verbose.
19. The activity feed container has `role="log"` and `aria-live="polite"`.
20. The first upcoming row's primary-green color is backed by text ("Next up" label), not
    color alone.
21. Shared Pulse components (`PulseNav`, `PulseFooter`, `AmbientWaveform`, `ActivityFeed`,
    `BigCountdown`, `StatsStrip`) are imported from `frontend/src/components/landing/`,
    not duplicated into a home-specific directory.
22. The page is not scrollable horizontally at 360 px width.
23. The page route remains `/` for authenticated members (or the existing `/home` route
    if the router is already configured that way — see SDD for routing decision).
