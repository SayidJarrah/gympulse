# Brief: onboarding-terms-early

## Problem
The unified-signup wizard puts terms (the registration commit point) as the LAST mandatory step, after preferences, membership, and the conditional booking step. That means a guest who selects a plan in step 4 reaches the booking step (step 5) still unauthenticated — the lists of classes and trainers, and the actual create-booking calls, are all member-only endpoints. The booking step shows "Unable to load upcoming classes" and Continue silently fails for any selection. The user mental model "I picked a plan, now show me classes" doesn't match the reality "you don't exist on the backend yet."

The fix is structural: move terms forward so the user becomes an authenticated account BEFORE the booking step runs. The wizard splits cleanly into a "guest commitment" prefix (credentials → profile → terms) and an "authenticated enrichment" suffix (preferences → membership → booking → done).

## Roles
- **Guest** (only role affected) — becomes a Member at terms submission

## Key Actions
- **Guest:** Same first three actions as unified-signup, but terms now comes immediately after profile rather than at the end.
- **Guest → Member:** Submit terms (step 3) → backend account is created via the existing combined-payload `POST /api/v1/auth/register` (credentials + mandatory profile + waiver/terms acceptance). Auth tokens stored. The user is now a Member for the rest of the wizard.
- **Member:** Fill or skip preferences (step 4), membership (step 5), and the conditional booking step (step 6) — all running as authenticated calls against the existing endpoints. Booking now sees a real class schedule and a real trainer list, and createBooking succeeds because the user has a real account.
- **Member:** Submit the done step (step 7) → `POST /api/v1/onboarding/complete` marks `onboardingCompletedAt` → land at `/home` as a fully onboarded member.

## Business Rules
- **Combined-payload register at terms still applies** — same DTO shape as unified-signup, just fires at step 3 instead of step 6. No new endpoint.
- **Back navigation is locked at the terms boundary.** Once an account exists (i.e. user has advanced past step 3), the wizard cannot navigate back to terms, profile, or credentials. Those are immutable from inside the wizard. Within the post-register suffix (steps 4–7), Back continues to work between adjacent steps.
- **Abandonment in steps 1–2 still leaves no server-side trace.** The "no `users` row until terms is submitted" guarantee is preserved for the pre-terms portion of the flow. Abandonment after step 3 leaves a real account with profile + waiver + terms acceptance; the user can log in later and resume the wizard from wherever they left off (this resume path already exists in onboarding-flow for authenticated users).
- **The `isAuthenticated` skip-guards added in unified-signup must be removed from the post-terms steps.** StepProfile keeps its guard (still pre-register), but StepPreferences, StepMembership, and StepBooking are always authenticated when they run, so they call their server endpoints directly with no guard. The handler code paths simplify.
- **Booking step now genuinely works for the wizard flow.** `GET /api/v1/class-schedule`, `GET /api/v1/pt/trainers`, and `POST /api/v1/bookings` (or `/pt-bookings`) are all reachable because the user is authenticated. No backend security changes are required.
- **The `/onboarding/complete` call still happens at done (step 7).** `onboardingCompletedAt` is what `UserRoute` uses to gate `/home`, so it must remain at the actual end of the wizard, not at terms.

## Out of Scope
- Email verification / confirmation link
- Social auth (Google / Apple sign-in)
- Real paid-membership activation (selecting a plan still results in a "pending" state — actual payment + activation is its own feature)
- Allowing the user to edit credentials, profile, or terms acceptance from inside the wizard after register
- Migrating users who are mid-flow on the unified-signup ordering at the moment this ships — those will resume per the existing onboarding-flow logic
- Backend security changes (no endpoints become public; the structural fix removes the need)
