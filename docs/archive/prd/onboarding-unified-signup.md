# PRD — Onboarding Unified Signup

## Problem

Today, account creation for new members is split across two surfaces. When a guest
clicks "Sign up" on the landing page they are taken to a standalone `RegisterPage`
that predates the current design system DNA, asked to enter email + password, and
only then dropped into the onboarding wizard which is on the new theme. The detour
through a separate, off-theme registration screen — followed immediately by a wizard
that re-collects information about the same person — is confusing and visually
jarring.

We are unifying signup so that account creation happens **inside the onboarding
wizard itself**, as its credentials step. The legacy standalone registration surface
goes away for guests, the wizard becomes the single entry point for new accounts,
and the backend account is only created once the guest has committed enough data to
be a meaningful user — not on the very first form.

## Goals

- Give guests a single, on-theme surface for becoming a member: one wizard, no
  detours through an off-theme registration page.
- Remove the visual whiplash between the legacy `RegisterPage` and the new
  onboarding theme by making the wizard's first step do the credentials work.
- Defer backend account creation to the moment the guest has actually completed the
  mandatory wizard steps, so abandoned signups do not leave orphaned `users` rows
  in the database.
- Keep the optional steps of the existing onboarding wizard (preferences,
  membership, first booking) skippable exactly as they are today — this change is
  about the entry point, not the wizard's optional content.

## Non-Goals

- Social auth (Google / Apple sign-in)
- Email verification / confirmation link
- Password reset flow changes
- Admin-created accounts (trainers/admins invited via backoffice) — unchanged
- Redesigning the login page itself — only the signup surface is in scope
- Migrating existing half-onboarded users

## User Roles

- Guest (only role in scope)

## User Journey (happy path)

1. Guest lands on the public landing page and clicks the "Sign up" CTA.
2. The CTA routes the guest **directly into the onboarding wizard** at its
   credentials step. There is no intermediate stop on the login page or on the
   legacy `/register` page.
3. The wizard opens on a new credentials step (the unified signup step) which asks
   for **email and password only**. The same input rules that the legacy
   `RegisterPage` enforced today apply here: email must be a valid format, password
   must be 8–15 characters. The guest submits.
4. The credentials are held client-side. **No backend account is created yet.** The
   wizard advances to the existing `profile` step (REQUIRED — first name, last
   name, phone, date of birth) as defined in the onboarding-flow PRD/SDD.
5. After `profile`, the wizard offers the existing optional steps in order —
   `preferences`, `membership`, `booking` — exactly as today. Each remains
   skippable with the existing skip behaviour.
6. The wizard reaches the `terms` step (REQUIRED — the final mandatory step).
   When the guest submits `terms` with the required toggles checked, the system
   **submits the held credentials together with the collected mandatory profile
   data to the backend, creating the user account at this moment** and returning
   auth tokens. This is the first and only point at which a `users` row exists.
7. The wizard advances to the `done` step and the guest is then taken into the app
   as an authenticated Member, landing on the same destination as today's onboarding
   completion (`/home`).
8. **If the guest abandons the wizard at any point before submitting `terms`** —
   closes the tab, navigates away, kills the browser — no `users` row is created
   and no email address is reserved on the server. The guest can later return to
   the landing page, click "Sign up" again, and start over with the same email.
9. Once a guest has entered the wizard, there is **no "back to login" escape hatch
   from inside the wizard** — they stay in the flow until they finish or abandon.
   Returning to the landing page restarts the wizard from the credentials step.

## Acceptance Criteria

1. **AC-01 — Sign up CTA goes straight to the wizard.** Clicking the "Sign up"
   CTA on the public landing page routes the guest directly into the onboarding
   wizard's credentials step, with no intermediate navigation through the login
   page or the legacy `/register` page.

2. **AC-02 — Credentials step captures email + password with the existing input
   rules.** The wizard's first step accepts an email address and a password and
   enforces the same input rules used by today's `RegisterPage`: a valid email
   format and a password of 8–15 characters. Invalid input blocks advancement and
   surfaces a field-level error in the same shape as today's auth form errors.

3. **AC-03 — Email uniqueness is checked during signup.** If the email entered at
   the credentials step is already in use by an existing account, the guest sees
   a clear "email already in use" error on the signup step and cannot continue.
   Uniqueness must be enforced no later than the moment the backend account is
   created (AC-05) so that two guests cannot complete onboarding with the same
   address.

4. **AC-04 — Optional steps remain skippable.** The `preferences`, `membership`,
   and `booking` steps of the onboarding wizard remain skippable with the same
   skip behaviour as today. Skipping them advances the wizard without creating
   any data those steps would otherwise create, and does not block reaching
   `terms`.

5. **AC-05 — Backend account is created only after the last mandatory step.**
   No `users` row, no `user_profiles` row, and no auth tokens exist on the server
   for a guest until they submit the final mandatory step (`terms`). Specifically,
   submitting the credentials step alone, or abandoning the wizard at any point
   before `terms` is submitted, leaves zero server-side trace of the guest's
   email or any profile data they entered.

6. **AC-06 — No "back to login" escape from inside the wizard.** Once the guest
   has entered the unified signup wizard, the wizard UI exposes no link, button,
   or other affordance that takes them to the login page. The only ways out are
   to finish the wizard or to leave the app.

7. **AC-07 — Completing the wizard lands the guest in the app as a Member.**
   After the `terms` step is submitted and the account is created, the guest is
   taken through the existing `done` step and then lands in the app at the same
   post-onboarding destination as today's flow (`/home`), authenticated as a
   Member.

## Open Questions

None. The brief plus the existing onboarding-flow SDD cover all behavioural
decisions; remaining questions (e.g. exact request shape of the new combined
signup endpoint, error code mapping for "email already in use" returned at the
end of the wizard, where the wizard re-mounts a returning guest who abandoned
before `terms`) are implementation-level and belong in the SDD.
