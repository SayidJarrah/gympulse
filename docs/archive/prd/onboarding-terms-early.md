# PRD — Onboarding Terms Early

## Problem

The unified-signup wizard that just shipped (PR #73) puts `terms` as the LAST
mandatory step, after `preferences`, `membership`, and the conditional `booking`
step. Because the combined-payload `POST /api/v1/auth/register` only fires when
the guest submits `terms`, no backend account exists for any step before it.
The `booking` step (step 5, conditional on a plan being selected at
`membership`) therefore runs while the user is still an unauthenticated guest.

That step's UI calls member-only endpoints — `GET /api/v1/class-schedule` and
`GET /api/v1/pt/trainers` — to populate the class list and trainer list, and
its `Continue` action calls `POST /api/v1/bookings` (or `/pt-bookings`) to
create the booking. All three return `401` for a guest. The result the user
sees today is "Unable to load upcoming classes," an empty trainer list, and a
silent no-op when they try to advance — even though the wizard structurally
told them their next step is "pick a class." The mental model "I just picked a
plan, now show me classes" doesn't match the reality "you don't exist on the
backend yet."

The fix is structural: move `terms` forward to step 3, immediately after
`profile`. The same combined-payload register fires there instead of at the
end of the wizard. The user becomes an authenticated Member at the terms
boundary, and the remaining steps (`preferences`, `membership`, `booking`,
`done`) run as a real account against the existing authed endpoints — so
`booking` finally sees real classes and trainers, and `Continue` actually
creates the booking. No backend security or contract changes are required.

## Goals

- The `booking` step shows real classes and a real trainer list for any user
  who selects a plan; submitting it actually creates the booking.
- The "no `users` row until terms is submitted" guarantee from unified-signup
  is preserved for the steps where the user truly hasn't committed yet —
  `credentials` and `profile`.
- Once an account exists, the wizard cannot navigate back into the pre-account
  steps; the terms boundary is the structural point of no return.
- The combined-payload register contract introduced by unified-signup is
  unchanged in shape; only its trigger position moves from step 6 to step 3.
- `onboardingCompletedAt` is still set only when the user reaches the `done`
  step, so `UserRoute`'s gate to `/home` still holds.

## Non-Goals

- Email verification / confirmation link
- Social auth (Google / Apple sign-in)
- Real paid-membership activation — selecting a plan still results in a
  "pending" membership; actual payment + activation is its own feature
- Allowing the user to edit credentials, profile, or terms acceptance from
  inside the wizard after register
- Migrating users who are mid-flow under the unified-signup ordering at the
  moment this ships — they continue under the existing onboarding-flow resume
  logic
- Backend security changes — no endpoints become public or change shape; the
  structural reorder removes the need

## User Roles

- **Guest** (steps 1–3) — becomes a Member at terms-step submission
- **Member** (steps 4–7) — runs the optional enrichment suffix as an
  authenticated account against the existing authed endpoints

## User Journey (happy path)

1. Guest lands on the public landing page and clicks the "Sign up" / "Join
   GymFlow" CTA. The wizard opens at step 1 (`credentials`).
2. **Step 1 — Credentials (Guest):** the guest enters email + password. The
   credentials are held client-side; no backend call fires. The wizard advances
   to `profile`.
3. **Step 2 — Profile (Guest):** the guest fills the mandatory profile fields
   (first name, last name, phone, date of birth). Held client-side. The wizard
   advances to `terms`.
4. **Step 3 — Terms (Guest → Member):** the guest checks the required terms
   and waiver toggles and clicks Continue. The wizard now fires the existing
   combined-payload `POST /api/v1/auth/register` with credentials + mandatory
   profile + terms acks. On success, auth tokens are stored and the user is
   authenticated. **This is the first and only point at which a `users` row
   exists.** The wizard advances to `preferences`.
5. **Step 4 — Preferences (Member):** optional. The user fills or skips. Runs
   as an authenticated call. Advances to `membership`.
6. **Step 5 — Membership (Member):** optional. The user can pick a plan or
   skip. Runs as an authenticated call. If a plan is picked, the wizard
   advances to `booking`; if not, the wizard advances to `done`.
7. **Step 6 — Booking (Member, only if plan selected):** the step fetches the
   real class schedule and trainer list from the existing authed endpoints —
   so the lists populate normally instead of failing. The user picks a class
   or trainer slot and clicks Continue. The booking is created via the
   existing authed endpoint. Advances to `done`.
8. **Step 7 — Done (Member):** the existing `POST /api/v1/onboarding/complete`
   call fires from `StepDone` on mount and `onboardingCompletedAt` is set to a
   real timestamp. The user clicks the final CTA and lands at `/home` as a
   fully onboarded Member.
9. **Back navigation rules:**
    - Within steps 1–2 (pre-terms), Back works between adjacent steps as
      today.
    - Once the user advances past `terms` (i.e. is now authenticated), the
      wizard locks the terms boundary: Back from any post-terms step cannot
      return the user to `terms`, `profile`, or `credentials`. Within the
      post-terms suffix (steps 4–6), Back continues to work between adjacent
      steps.
10. **Abandonment:**
    - Closing the tab during steps 1–2 leaves no `users` row, no profile
      data, and no waiver/terms acceptance on the server. Returning later
      starts the wizard from `credentials` and the same email is still
      available.
    - Closing the tab during or after step 4 leaves a real account with the
      populated profile and waiver acceptance. Logging in later resumes the
      wizard at the appropriate post-terms step per the existing
      onboarding-flow resume behaviour for authenticated users.

## Acceptance Criteria

1. **AC-01 — Wizard step order is reordered with terms at position 3.** The
   wizard's step sequence is `credentials → profile → terms → preferences →
   membership → booking → done`, with `booking` conditional on a plan being
   selected at `membership`. The mini-nav, the step rail, and the "Step N of
   M" copy all reflect this order; no UI surface still shows `terms` after
   `membership` or `booking`.

2. **AC-02 — Submitting terms (step 3) creates the backend account and
   authenticates the user.** When the user submits `terms` at step 3 with
   both required toggles checked, the wizard fires the existing
   combined-payload `POST /api/v1/auth/register` (same request shape as
   unified-signup, just at step 3 instead of step 6), stores the returned
   tokens, and advances to `preferences`. From `preferences` onward the user
   is authenticated for the rest of the wizard.

3. **AC-03 — Back navigation is locked at the terms boundary once the user
   advances past it.** From any of `preferences`, `membership`, or `booking`,
   the wizard exposes no affordance that would navigate back to `terms`,
   `profile`, or `credentials`. The Back control on `preferences` (the first
   post-terms step) is hidden or disabled. Within the post-terms suffix
   (steps 4–6), Back continues to work between adjacent steps in the order
   they were visited.

4. **AC-04 — Booking step shows real data and creates real bookings.** Any
   authenticated member who reaches `booking` via the wizard sees a populated
   class list and trainer list (no "Unable to load upcoming classes" message,
   no empty trainer list). Selecting a class — or selecting a trainer and a
   slot — and clicking Continue successfully creates the booking via the
   existing authed endpoint and advances the wizard to `done`.

5. **AC-05 — Abandoning before terms leaves no server-side trace.** A guest
   who closes the tab, navigates away, or kills the browser at the
   `credentials` or `profile` step leaves no `users` row, no `user_profiles`
   row, and no waiver/terms acceptance on the server. Returning later starts
   the wizard fresh from `credentials` and the same email is still available
   for signup.

6. **AC-06 — Abandoning after terms leaves a real account that can resume.**
   A user who closes the tab, navigates away, or kills the browser at any
   step from `preferences` onward leaves a real account on the server with
   the populated profile and waiver acceptance. The next time that email
   logs in, the wizard resumes at the appropriate post-terms step per the
   existing onboarding-flow resume behaviour, rather than restarting at
   `credentials`.

7. **AC-07 — `onboardingCompletedAt` is set only at the done step.** The
   `POST /api/v1/onboarding/complete` call still fires from `StepDone` on
   mount (not at terms-step submission). `onboardingCompletedAt` is therefore
   set to a real timestamp only when the user reaches `done`, preserving
   `UserRoute`'s existing gate that sends users with no
   `onboardingCompletedAt` back into the wizard rather than to `/home`.

## Open Questions

None. The brief plus the unified-signup PRD/SDD cover all behavioural
decisions. Implementation-level questions (exact mechanism for hiding/disabling
Back at `preferences`, how the post-terms remount of the wizard derives
`computeResumeStep` for an authenticated returning user, how the existing
`isAuthenticated` skip-guards are removed from the post-terms steps) belong
in the SDD.
