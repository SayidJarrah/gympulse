# PRD: Public Landing Page — "The Pulse" Redesign

## Overview

The "Pulse" redesign replaces the static v1 landing page with a live, activity-driven
homepage. The page treats the gym as a heartbeat you can tune into: real-time check-in
activity, live spot counts, and a countdown to your next class replace the static hero
and plans-preview pattern.

The page adapts to three distinct viewer states based on authentication and booking
status. Each state presents a different hero experience while sharing the same nav,
ambient background, activity feed, and stats strip.

This supersedes the v1 PRD scope. The membership plans preview, "how it works", and FAQ
sections defined in v1 are replaced by this live-activity design and are intentionally
deferred.

## Competitive Context

Research date: **2026-03-29** (carried forward from v1)

The Pulse concept moves GymFlow from the generic gym-SaaS landing pattern (plans preview
+ how-it-works) toward a product that competes on real-time club-floor presence. A
visitor or returning member should feel the energy of the gym the moment they land on the
page.

## Goals

- Give a returning member an immediate, at-a-glance read of what is happening at the club
  right now and a frictionless path to their next action (check in or book a class).
- Give a logged-out visitor social proof through anonymized live activity, driving sign-up.
- Eliminate the gap between the landing page and the member experience — the page should
  feel like the gym is open and running, not like a marketing brochure.

## Non-Goals

- Mobile layout (not yet designed — follow-up ticket).
- Check-in QR modal.
- Multi-location selector.
- Countdown T-0 end state (deferred — see Open Questions).
- Full accessibility screen-reader audit (noted as follow-up).
- CMS or admin-managed homepage content.
- Membership plans preview, how-it-works section, FAQ block (deferred from v1).

## Viewer States

The page renders in one of three states derived server-side from auth and booking data:

| State | Condition | Hero Content |
|---|---|---|
| `booked` | Authenticated AND a CONFIRMED booking exists for a class starting within [now, now+24h) | Large countdown to next class, check-in CTA |
| `nobooked` | Authenticated AND no CONFIRMED booking in [now, now+24h) | Next available open class with spot count, one-tap booking |
| `loggedOut` | Not authenticated | Brand statement, 7-day trial CTA, anonymized live activity |

"Within the next 24h" means the class `scheduled_at` is in `[now, now + 24h)`.
"Next available open class" means `scheduled_at` is in `(now + 15min, end of current day]`,
`status = 'SCHEDULED'`, `deleted_at IS NULL`, and `spotsLeft > 0`.

## User Roles Involved

- **Guest** — sees the `loggedOut` state with anonymized feed and public stats.
- **Authenticated member (USER role)** — sees either `booked` or `nobooked` state.
- **Admin** — not a primary audience for this page; no admin-specific hero variant.

## User Stories

### Member with a booked class
- As a member with a booked class, I want to see a live countdown to that class the
  moment I open the homepage, so I know exactly how long I have.
- As a member, I want a prominent check-in CTA alongside the countdown so I can act
  immediately when the time comes.
- As a member, I want to see the trainer name and studio for my booked class without
  navigating away.

### Member with nothing booked
- As a member with nothing booked, I want to see the next available class I could join
  right now, with a spot count that tells me how urgent it is.
- As a member with three or fewer spots remaining, I want the spot count visually distinct
  (orange) so urgency is clear.
- As a member, I want a one-tap path from the landing page to book that class.
- As a member with nothing booked, I also want a quick way to browse the full schedule
  if the suggested class is not right for me.

### Logged-out visitor
- As a visitor, I want to see that the gym is active and real without needing an account.
- As a visitor, I want the activity feed to show real things are happening, even if
  individual member names are not visible.
- As a visitor, I want a clear primary CTA to start a 7-day trial and a secondary CTA
  to see a class on the schedule.

### All users
- As any user, I want the activity feed to rotate its highlighted row automatically so
  the page feels live between real events.
- As any user, I want the ambient waveform to respect my reduced-motion preference.

## Acceptance Criteria

### Viewer-State Derivation (AC-01 through AC-05)

1. A logged-out visitor always sees the `loggedOut` state.
2. An authenticated user with at least one CONFIRMED booking whose class `scheduled_at`
   falls within `[now, now+24h)` sees the `booked` state. If multiple qualifying bookings
   exist, the earliest `scheduled_at` is used.
3. An authenticated user with no qualifying booking sees the `nobooked` state.
4. The viewer-state endpoint is publicly accessible for the `loggedOut` case; for
   authenticated users it requires a valid JWT.
5. Viewer-state derivation is performed server-side; the frontend must not re-derive state
   from raw booking data on the client.

### Countdown (AC-06 through AC-08)

6. The countdown in the `booked` state displays hours, minutes, and seconds, updated
   every 1000ms, using tabular-nums rendering so digits do not cause layout shift.
7. Countdown values never go negative; they clamp to `00:00:00` when the target time passes.
8. When `prefers-reduced-motion` is active, the countdown continues ticking but the
   pulsing dot and ambient waveform animation freeze.

### Activity Feed — Authed (AC-09 through AC-12)

9. The authenticated activity feed shows the last 20 events, including real actor names.
10. Each event row shows: actor name, action description, kind-colored dot, and relative
    timestamp.
11. The feed auto-rotates the "active" highlighted row every 2800ms, cycling through all
    returned items.
12. New events received via real-time transport are prepended to the feed list; if the
    list exceeds 20 items the oldest is dropped.

### Activity Feed — Public (AC-13 through AC-16)

13. The public feed shows the last 20 events with actor names anonymized to "A member".
    No PII is present in any public feed field.
14. `pr` event text for public viewers omits the specific performance value; only the
    event type is shown (e.g. "logged a deadlift PR", not "logged a deadlift PR — 285lb").
15. The public feed endpoint is accessible without authentication.
16. The public feed uses the same real-time transport as the authed feed.

### Next-Open Class Card (AC-17 through AC-20)

17. The `nobooked` hero shows the class with the earliest `scheduled_at` after
    `now + 15min` on the current calendar day that has `spotsLeft > 0`.
18. `spotsLeft` is `capacity - confirmedBookingCount` computed at query time; the value
    is not cached.
19. When `spotsLeft <= 3`, the spot count renders in accent-orange (`#FDBA74`).
20. When no open class exists today (all full or already started), the hero shows:
    "No open classes remaining today. Browse tomorrow." with a link to `/schedule`.

### Live Stats (AC-21 through AC-23)

21. Authed stats strip shows three cells:
    - "On the floor": count of members with CONFIRMED or ATTENDED bookings for classes
      that started after 5am today and have `scheduled_at <= now`.
    - "Classes today": count of SCHEDULED class instances for today.
    - "Spots left · {className}": `spotsLeft` of the class starting after now with the
      lowest non-zero `spotsLeft`, plus that class name.
22. Public stats strip shows three cells:
    - "Members": count of all ACTIVE user memberships.
    - "Classes today": count of SCHEDULED class instances for today.
    - "Coaches": count of active (non-deleted) trainers.
23. Stats are fetched on page load and do not auto-refresh during the session.

### Real-Time Feed Transport (AC-24 through AC-25)

24. After initial page load, the activity feed subscribes to a server-sent events (SSE)
    stream. New events are pushed without polling.
25. If the SSE connection drops, the client retries using the browser's native
    EventSource reconnect behavior; no error state is shown to the user.

### Navigation (AC-26 through AC-31)

26. "Check in now" navigates to `/check-in`.
27. "View schedule" and "browse the full schedule" navigate to `/schedule`.
28. "Grab a spot" navigates to `/schedule?classId={id}` deep-linked to the specific class.
29. "Meet the team" navigates to `/trainers`.
30. "Join GymFlow" / "Start 7-day trial" navigate to `/register`.
31. "Log in" navigates to `/login`.

### Visual Fidelity (AC-32 through AC-35)

32. The page is a single-screen layout at 1440x900 reference viewport: `overflow: hidden`
    on root, `height: 100vh`. No vertical scroll.
33. The ambient waveform SVG path regenerates every animation frame at 60px/sec
    horizontal scroll with an ECG-style QRS spike every 220px.
34. The radial green glow and waveform are absolutely positioned behind hero content and
    do not affect layout flow.
35. Trainer avatar circles use real trainer photo data when available, falling back to
    initials in hsl-generated color circles.

### Quality (AC-36 through AC-37)

36. The landing page renders without console errors in all three viewer states.
37. The `StateSwitcher` dev tool is not present in production builds.

## Page Copy (Pulse redesign)

### Nav
- Logo wordmark: `GYMFLOW`
- Authed nav links: `Schedule`, `Trainers`, `Membership`
- Public nav links: `Schedule`, `Trainers`, `Pricing`, `Log in`, `Join GymFlow`

### Hero — booked state
- Eyebrow: `Live at the club · {n} members in`
- Headline line 1: `Welcome back,`
- Headline line 2 (green): `{firstName}.`
- Countdown label: `{className} starts in`
- Trainer side: `with` / `{trainerName}` / `{studio} · {durationMin} min`
- Buttons: `Check in now →` (primary) / `View schedule` (secondary)
- Trainer row: `{n} coaches teaching this week · Meet the team`

### Hero — nobooked state
- Eyebrow: `Live at the club · {n} members in`
- Headline line 1: `Hey {firstName}.`
- Headline line 2 (green): `Get on a mat.`
- Card eyebrow: `Next open · {startsIn}`
- Card class name: `{className}`
- Card detail: `{trainerName} · {studio} · {spotsLeft} spots left`
- Card CTA: `Grab a spot →`
- Under-card: `Or browse the full schedule — {remainingClassesToday} more classes today.`
- Trainer row: `{n} coaches teaching this week · Meet the team`

### Hero — loggedOut state
- Eyebrow: `Brooklyn · Williamsburg`
- Headline line 1: `A gym with a`
- Headline line 2 (green): `pulse.`
- Subhead: `Strength, flow, and lifting classes six days a week. No crowded floors. No nonsense.`
- Buttons: `Start 7-day trial →` (primary) / `See a class` (secondary)
- Social proof: `{n} coaches, 1,200+ members · Meet the team`

### Footer
- Left: `GymFlow · 214 Wythe Ave, Brooklyn · (718) 555-0144`
- Right: `Mon–Fri 5am–11pm` / `Sat–Sun 7am–9pm`

## Out of Scope (Pulse redesign)

- Mobile layout.
- Countdown T-0 end state.
- Multi-location eyebrow.
- Full screen-reader accessibility audit.
- Membership plans preview, how-it-works section, FAQ block (from v1).
- New analytics events beyond v1 minimum set.

## Open Questions

1. **Countdown at T-0**: what happens when the booked class starts? Placeholder: clamp
   to 00:00:00. Design lead to specify end state before implementing the transition.
2. **Real-time transport**: SSE is specified. If the existing infra already has a
   WebSocket layer, the architect may substitute it without changing the client event
   shape or anonymization rules.
3. **Floor count**: "members on the floor" is defined as CONFIRMED/ATTENDED bookings for
   classes that started after 5am today. If a separate check-in event exists in the DB,
   use that instead and document the substitution in the SDD.
