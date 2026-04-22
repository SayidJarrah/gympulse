# Brief: onboarding-unified-signup

## Problem
Guests who click "Sign up" on the landing page are routed to the login page first, then through the onboarding wizard only after they log in. Account creation is split across two surfaces (standalone RegisterPage + onboarding) with inconsistent styling — the RegisterPage predates the current design system DNA while onboarding is on the new theme. The detour through the login page before onboarding is confusing and visually jarring.

## Roles
- **Guest** (only role affected)

## Key Actions
- **Guest:** Create account credentials (email + password) as step 1 of the onboarding wizard
- **Guest:** Fill out mandatory profile/goals/fitness-level steps in the same wizard without leaving the flow
- **Guest:** Skip the optional final steps (same skip behaviour as today) and land in the app as a Member

## Business Rules
- Email must be unique — checked during signup
- The backend account is **only created after the last mandatory step is submitted**, not after step 1. If the guest abandons the wizard before that point, no user row exists.
- Optional (non-mandatory) final steps can still be skipped, matching current behaviour.
- No "back to login" escape hatch from inside the wizard — once the guest enters onboarding-unified-signup, they stay until they finish or abandon.
- The `POST /auth/register` contract is **not fixed** — it should be adjusted to match the unified wizard's submission shape (e.g. credentials + mandatory profile fields in one payload) rather than forcing the frontend to match the legacy contract.

## Out of Scope
- Social auth (Google / Apple sign-in)
- Email verification / confirmation link
- Password reset flow changes
- Admin-created accounts (trainers/admins invited via backoffice) — unchanged
- Redesigning the login page itself — only the signup surface is in scope
- Migrating existing half-onboarded users
