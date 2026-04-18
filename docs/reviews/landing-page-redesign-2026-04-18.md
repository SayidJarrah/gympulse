# Review: Landing Page Redesign ("The Pulse") — 2026-04-18

## Summary

The Pulse redesign is a substantial, well-structured piece of work. The three-viewer-state
architecture is correct, the backend domain model is solid, the frontend component split
follows conventions, and the visual implementation is genuinely impressive for a dark
fitness brand. A Peloton or Whoop user would not be embarrassed by this UI.

Three issues rise to blocker level; none require architectural changes — they are targeted
fixes. Several non-blocking improvements are noted below.

---

## Blockers (must fix before PR)

- [ ] `frontend/src/components/landing/HeroBooked.tsx:68` — "Check in now →" links to
  `/schedule` but the SDD (AC-26) and handoff spec require it to navigate to `/check-in`.
  This is the primary CTA in the `booked` state. A member who taps it to check in is sent
  to the schedule page instead — the flow is broken. Change `to="/schedule"` to
  `to="/check-in"`.

- [ ] `backend/src/main/kotlin/com/gymflow/service/LandingService.kt:243` and
  `backend/src/main/kotlin/com/gymflow/repository/BookingRepository.kt:26-35` —
  `countOnFloor` calls `countConfirmedByClassIds`, which filters only on
  `status = 'CONFIRMED'`. The SDD (Assumption A2), PRD (AC-21), and the viewer-state
  docstring in `LandingService` all state that "On the floor" counts CONFIRMED **or**
  ATTENDED bookings. `ATTENDED` status is excluded entirely. This makes the stat
  systematically under-count: as soon as a staff member marks attendees the number drops
  to zero for that class. Add a `status IN ('CONFIRMED', 'ATTENDED')` variant query and
  use it in `countOnFloor` (and the parallel call in `getStats`). The developer flagged
  this as a known deviation; it contradicts both the PRD and SDD, so it must be resolved
  before merge.

- [ ] `backend/src/main/kotlin/com/gymflow/service/ActivityEventService.kt:47` —
  `recordEvent` calls `broadcastToEmitters(event, authed = false)` and then
  `broadcastToEmitters(event, authed = true)` sequentially, broadcasting to the same
  single emitter list twice. Every connected client receives two identical SSE events for
  each booking: once with the public text, once with the full text. This causes duplicates
  in the client feed. The root cause is that the emitter list is not partitioned by auth
  level. For v1, since the SSE stream is acknowledged as public-only (the developer's
  known deviation), the fix is straightforward: remove the double-broadcast and keep only
  one call — `broadcastToEmitters(event, authed = false)` — and update the comment.
  If true auth-level separation is added later (separate emitter lists), do that in a
  follow-up. The current code actively delivers duplicate events and must be fixed.

---

## Suggestions (non-blocking)

- `frontend/src/api/landingPage.ts` — this v1 file (`getLandingPlans`) is still present
  and still imported by `hooks/useLandingPlans.ts`. The SDD lists it among the files that
  remain available for other parts of the app, so it is not formally in scope to remove,
  but the file is confusingly named alongside the new `landing.ts`. Worth a comment or
  rename in a cleanup pass.

- `frontend/src/components/landing/HeroNoBooked.tsx:73` — the no-class fallback copy is
  "No open classes right now" whereas the PRD (AC-20) specifies "No open classes remaining
  today. Browse tomorrow." with a link to `/schedule`. The implemented copy is acceptable
  UX but diverges from the agreed spec copy. Consider aligning, especially since the PRD
  is explicit.

- `backend/src/main/kotlin/com/gymflow/service/ActivityEventService.kt:63` —
  `registerEmitter` does not send an initial keepalive comment on connection. Clients
  connecting briefly before any booking event may see a long gap before the first push.
  Adding a `emitter.send(SseEmitter.event().comment("keepalive"))` at registration time
  is a one-liner that prevents SSE pre-flight timeouts in some proxy configurations.

- `frontend/src/components/landing/TrainerRow.tsx` — trainer avatar data is hardcoded
  to the five placeholder names from the prototype (`PLACEHOLDER_NAMES`). The SDD (AC-35,
  Assumption A3) requires real trainer photos from `/api/v1/trainers/{id}/photo`. The
  component accepts a `trainers` prop but neither `HeroBooked` nor `HeroNoBooked` pass
  real trainer data from the viewer-state response. The trainer name from the booked class
  is available in `viewerData.upcomingClass.trainer`; plumbing it through would satisfy the
  spec. For v1 this is acceptable as a known gap but worth a tech-debt ticket.

- `frontend/src/components/landing/BigCountdown.tsx:37` — the colon separator between
  countdown cells has `opacity-40` applied as a Tailwind class on top of an already-dimmed
  base color (`text-[#4B5563]`). The handoff specifies the separator color as
  `--color-fg-subtle` at `opacity: 0.4` — using `text-[#4B5563]` (which is already
  `gray-700` and thus at surface-3 level) and then `opacity-40` on top effectively
  renders it nearly invisible. Use `text-[#9CA3AF]` (muted) with `opacity-40` to match
  the handoff intent.

- `backend/src/main/kotlin/com/gymflow/service/LandingService.kt:232` — the `displayName`
  variable is computed inside the `runCatching` block in `BookingService` but is never
  used (only `shortName` is passed to `recordEvent`). Dead assignment — remove.

- `frontend/src/components/landing/PulseNav.tsx:67` — the "Pricing" link in the
  logged-out nav is an `<a href="#pricing">` anchor. There is no `#pricing` section on the
  new landing page (it was explicitly deferred in the PRD). Either point it to `/plans`
  or remove it. As-is it scrolls nowhere and the overflow-hidden on the root means even
  a valid anchor would not work.

- `@JsonTypeInfo` + `@JsonSubTypes` on `LandingViewerStateResponse` and
  `LandingStatsResponse` — the `visible = true` flag on `EXISTING_PROPERTY` correctly
  preserves the discriminator field in serialized output. Jackson deserialization is not
  used for these response DTOs server-side, so there is no functional risk. This is
  correctly implemented; noted only because the developer flagged it for attention.

- `SseEmitter(0L)` — no server-side timeout is intentional and documented. The three
  `onCompletion`/`onTimeout`/`onError` cleanup callbacks are all registered. This is
  correct for v1.

- Barlow Condensed via Google Fonts — FOUT is real. The font is loaded in `index.css`
  with `display=swap`. Consider adding `<link rel="preconnect" href="https://fonts.googleapis.com">`
  and `<link rel="preload">` for the two Barlow Condensed weight files to reduce jitter
  on first load, especially for the 88px countdown digits which are the page's focal point.

---

## Design Fidelity Assessment

The implementation is high-fidelity against the handoff. Specifically confirmed:

- Three-column grid layout (1.3fr 1fr, gap 40px, padding 48/40/32) — implemented via
  inline style on `<main>` (acceptable per reviewer attention item 4).
- 88px Barlow Condensed, tabular-nums, three cells with dimmed separators — correct.
- 72px/80px Barlow headline per state, uppercase, line-height 1.0/0.95 — correct.
- Kind-colored feed dots with box-shadow glow — correct.
- Bottom gradient fade on the activity feed — correct.
- Pulsing dot animation defined in `index.css`, gated on `prefers-reduced-motion` both
  via the CSS `@media` rule and the React `useReducedMotion` conditional class — doubly
  guarded, correct.
- Ambient waveform: ECG spike shape, 60px/sec scroll, opacity 0.22, horizontal gradient
  fade, frozen on reduced motion — correct.
- `StateSwitcher` absent from production code — confirmed. No dev-only controls shipped.
- `landing_page_view` analytics event fires on mount with auth context — correct.
- All five required UI states present: populated (three hero variants), loading (skeleton
  in `PulseLandingPage` and `StatsStrip`), empty (no-class fallback in `HeroNoBooked`),
  error (caught silently in feed and viewer-state hooks — see note below), delight
  (waveform + pulsing dots + countdown).
- Error state note: `useViewerState` sets an `error` string but `PulseLandingPage` never
  renders it — on fetch failure the page shows the logged-out hero silently. This is
  passable (the logged-out state is the safe fallback) but there is no visible error
  message for the user. Not a blocker given the graceful degradation, but worth tracking.

---

## Domain Correctness

- Viewer-state derivation logic matches PRD and SDD exactly: loggedOut → booked (earliest
  CONFIRMED booking in [now, now+24h)) → nobooked (next open class after now+15min today).
- `nextOpenClass` null path returns `nobooked` with `null` — matches SDD Section 2.1.
- `spotsLeft` computed at query time (`capacity - countConfirmedByClassId`) — not cached.
- `startsIn` computed as `ceil(diffMillis / 60_000)` clamped to `coerceAtLeast(1)` — matches
  SDD formula. Note the clamp to 1 means a class 0–60 seconds away shows "1 min" — acceptable.
- `remainingClassesToday` counts all SCHEDULED candidates after `now + 15min` including the
  returned class, which matches the SDD comment but the PRD says "11 more classes today"
  (excluding the returned one). This is a minor off-by-one; not blocking but worth
  clarifying with the product owner.
- `countOnFloor` blocker documented above.
- Public anonymization of `actor` and `text` — correctly uses `textPublic` from DB, not
  truncation of `text`. AC-13/14 satisfied in the REST endpoint. SSE deviation documented.
- `INTERNAL_ERROR` is present in `ErrorCode.kt`. SecurityConfig permits
  `/api/v1/landing/**`. Flyway migration V22 matches entity definition.
- `@JsonTypeInfo` with `EXISTING_PROPERTY` correctly preserves `state` / `variant` fields
  in JSON output without adding a wrapper.

---

## Manual-Test Checklist

The user should manually verify the following flows once the stack is running:

### Setup

1. Start the review stack: `/run`.
2. Confirm `V22__create_activity_events_table.sql` ran (check Flyway log or
   `SELECT * FROM flyway_schema_history WHERE script LIKE '%V22%'`).

### State: Logged-out visitor

3. Open `http://localhost:5173` in an incognito window (no auth cookie/token).
4. Verify the hero shows "A gym with a / pulse." headline (80px, logged-out variant).
5. Verify eyebrow is "Brooklyn · Williamsburg" with pulsing dot.
6. Verify activity feed header reads "Live at the club" (not "Activity").
7. Verify no real member names appear in the feed — actors should be "A member".
8. Verify stats strip shows three public cells: Members / Classes today / Coaches.
9. Verify "Start 7-day trial →" links to `/register`, "See a class" links to `/schedule`.
10. Verify "Join GymFlow" nav button links to `/register`, "Log in" links to `/login`.
11. Verify "Meet the team" in the trainer row links to `/trainers`.
12. Verify the nav "Pricing" link does not throw an error (it currently points to `#pricing`
    which scrolls nowhere — confirm it is not crashing, but note it as a gap).

### State: Logged-in member, no booking in next 24h

13. Log in as a member who has no CONFIRMED bookings for classes starting in [now, now+24h).
14. Verify hero shows "Hey {firstName}. / Get on a mat." (72px, nobooked variant).
15. Verify the next-open class card appears if a qualifying class exists.
16. Verify `spotsLeft <= 3` renders the count in orange (`#FDBA74`), `> 3` in gray.
17. Verify "Grab a spot →" links to `/schedule?classId={id}` (deep-link to the specific class).
18. Verify "browse the full schedule" links to `/schedule`.
19. If no qualifying class exists today, verify the fallback renders (not a blank or crash).
20. Verify feed header reads "Activity", actors show real names.
21. Verify stats strip shows authed variant: On the floor / Classes today / Spots left.

### State: Logged-in member, booked class in next 24h

22. Ensure a CONFIRMED booking exists for a SCHEDULED class starting within the next 24 hours.
23. Load `/` and verify the countdown hero renders with the correct class name in the label.
24. Wait 2–3 seconds and confirm the seconds digit ticks (tabular-nums, no layout shift).
25. Verify the trainer name and studio detail appear in the right panel of the countdown row.
26. Verify "Check in now →" navigates to `/check-in` (this is Blocker 1 — confirm after fix).
27. Verify "View schedule" navigates to `/schedule`.
28. Verify eyebrow shows "Live at the club · N members in" with the pulsing dot.

### Countdown edge cases

29. With a booking 0–2 minutes away, confirm the countdown shows `00:00:XX` not negative.
30. With a booking in the past (manually set `scheduled_at` to a past time in the DB),
    confirm the "Class starting now" banner renders instead of the countdown.

### Activity feed live update

31. While the page is open (any state), use an admin account or test endpoint to create a
    new booking for a different user.
32. Confirm a new row appears at the top of the activity feed within a few seconds (SSE push).
33. Confirm the row count does not exceed 8 visible rows.
34. In the logged-out variant, confirm the new row shows "A member" as the actor.
35. After Blocker 3 is fixed (double-broadcast removed), confirm only one new row appears
    per booking event (not two identical rows).

### Waveform and animations

36. With `prefers-reduced-motion: reduce` set in OS or browser, verify the waveform is
    static (not scrolling) and the pulsing dots are not animating.
37. With motion enabled, verify the waveform scrolls continuously without stutter.

### Loading state

38. Throttle network (DevTools → Slow 3G). Reload `/`.
39. Verify the skeleton (gray pulse blocks) appears in the hero column before data arrives.
40. Verify the stats strip skeleton (three gray cells) appears before stats load.
41. Verify the activity feed renders empty or with a graceful absence — no crash, no blank
    white space.

### No-booking edge case

42. Log in as a user where all remaining classes today are either full or start within 15
    minutes. Verify the no-class fallback message appears (not a crash).

### Navigator / routing

43. Verify `Meet the team` → `/trainers`, `Schedule` nav → `/schedule`,
    `Trainers` nav → `/trainers`, `Membership` nav (authed only) → `/membership`.

### Console errors

44. In all three states, open the browser console and confirm zero errors (PRD AC-36).

---

## Verdict

BLOCKED — 3 blockers

Fix the three blockers, then the PR is clear to merge. The design quality is high; no
further design changes are needed.
