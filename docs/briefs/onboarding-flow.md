# Brief: onboarding-flow

## Problem
Registration today only collects email and password. The user profile data model is much richer,
but there is no flow to populate it. New members land in the app with an empty profile, no
membership, and no guidance on next steps. We need a modern multi-step onboarding flow that
collects profile data, optionally sets up a membership, and optionally books a first class or
personal training session.

## Roles
- **Guest** — a new user who has just created an account

## Key Actions
- **Guest:**
  - Complete account creation (email + password)
  - Fill in required profile fields and optionally enrich with fitness preferences, emergency contact, and a profile photo
  - Optionally choose a membership plan
  - If membership chosen, optionally book a class or personal training session
  - Agree to terms of use and notification preferences (placeholder step — basics only)

## Business Rules
- **Required profile fields:** first name, last name, phone, date of birth
- **Optional profile fields:** fitness goals, preferred class types, emergency contact name + phone, profile photo
- All required profile fields must be filled before the user can advance past the profile step
- Membership selection is optional — the user can skip and proceed without a plan
- Booking step is only shown if the user selected a membership; it is also skippable
- Terms & notifications step is a placeholder — UI shell only, full implementation deferred
- Payment is out of scope for this feature

## Out of Scope
- Payment processing for membership purchase
- Full implementation of terms of use (legal copy, versioning, acceptance tracking)
- Full implementation of notification preferences (push/email settings, backend storage)
- Editing the profile after onboarding (covered by the existing profile feature)
