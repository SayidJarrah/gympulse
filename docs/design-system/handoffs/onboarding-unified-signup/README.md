# Handoff — Onboarding Unified Signup

## Overview

This is a **delta handoff** on top of the existing onboarding wizard at
`docs/design-system/handoffs/onboarding/`. It introduces one new step — the
credentials step — as step 1 of the wizard, and changes the landing-page "Sign up"
CTA route target. Every other wizard step (profile, preferences, membership,
booking, terms, done) is unchanged from the existing handoff. The credentials step
must read as a sibling of those steps in visual rhythm, chrome, and copy voice.

The purpose of this change is to eliminate the standalone `RegisterPage` as the
entry point for guests, so that the first thing a guest sees after clicking "Sign
up" is the on-theme onboarding wizard — not an off-theme, pre-design-system
registration form. Backend account creation is deferred: credentials are held
client-side until the guest submits the `terms` step, at which point a combined
payload (credentials + mandatory profile fields) is sent as a single request. No
`users` row exists until that moment.

This handoff covers the credentials step anatomy, all its states including the
late-error recovery flow, the wizard progress-indicator chrome update, the removal
of "back to login" affordances, and the landing-page CTA routing change.

## Reuse from existing handoffs

**onboarding handoff (`docs/design-system/handoffs/onboarding/`):**

- Wizard chrome is reused verbatim: mini nav (logo + step eyebrow), 3px progress
  bar, 260px left step rail, sticky footer (Back / Skip / Continue), and the
  full-viewport dark background.
- Step content skeleton is reused verbatim: eyebrow (`STEP 01 · YOUR ACCOUNT`),
  `<h1>` in Barlow Condensed 48px uppercase, inline REQUIRED/OPTIONAL pill, lede
  paragraph, form below.
- Step rail state tokens (current / done / todo numeral treatment) are unchanged.
- Sticky footer primary button copy pattern ("Continue →", "Finish onboarding →")
  is unchanged; credentials step footer reads "Continue →".
- `localStorage` persistence pattern (`gf:onboarding:v1`) is extended with
  `{ email, password }` fields; password must be cleared from local storage after
  the terms submission succeeds.
- Step-transition motion (200ms ease-out fade-and-rise) is unchanged.
- `prefers-reduced-motion` handling is unchanged.

**landing-page-redesign handoff (`docs/design-system/handoffs/landing-page-redesign/`):**

- The "Join GymFlow" / "Start 7-day trial →" CTA buttons in the logged-out state
  and the Nav "Join GymFlow" button are the only elements in scope. Their visual
  design is unchanged. Only the route target changes (see §3 below).

## Tokens to add

None. All tokens required by this handoff already exist in
`docs/design-system/colors_and_type.css` and `docs/design-system/tailwind.gymflow.cjs`.

---

## New / changed screens

### 1. Credentials step (new — step 1 of the wizard)

#### Position in the step sequence

```
credentials (1) → profile (2) → preferences (3) → membership (4) → booking (5*) → terms (6) → done
* booking only shown if a plan was selected — unchanged from existing handoff
```

The existing step-count display ("Step N of M") changes from `N of 6` to `N of 7`
(or `N of 6` when booking is hidden). The credentials step is always at position 1;
all existing steps shift up by one.

#### Layout

Mirrors the existing step-content column exactly. No layout deviation.

```
┌────────────────────────────────────────────────────────────────┐
│  MINI NAV  (logo · Step 01 of 07 · CREDENTIALS eyebrow)        │  ~72px
├────────────────────────────────────────────────────────────────┤
│  PROGRESS BAR (3px, fills to 1/7)                               │
├─────────────┬──────────────────────────────────────────────────┤
│             │                                                  │
│  STEP RAIL  │   eyebrow: STEP 01 · YOUR ACCOUNT               │
│  (260px)    │   h1: Create your account   [REQUIRED]           │
│             │   lede (max-w 580px)                             │
│             │   — — — — — — — — — — — — — — — — —             │
│             │   Email address label                            │
│             │   [ email input                         ]        │
│             │   Password label                  Show / Hide   │
│             │   [ password input                      ]        │
│             │   password helper text (8–15 characters)         │
│             │   [error banner — only when late error]          │
│             │                                                  │
├─────────────┴──────────────────────────────────────────────────┤
│  STICKY FOOTER  (Back disabled · — · Continue →)               │  ~88px
└────────────────────────────────────────────────────────────────┘
```

- Form column: max-width 560px, matches the profile step form width.
- Back button: present but disabled on the credentials step (same treatment as
  step 1 / welcome in the existing onboarding handoff). It is not hidden — it
  maintains the footer layout.
- Skip button: not shown on the credentials step (step is REQUIRED).

#### Eyebrow and headline copy

- Eyebrow: `STEP 01 · YOUR ACCOUNT` — 12px/600, letter-spacing `0.22em`,
  uppercase, color `--color-primary-light`.
- Headline: `Create your account` — Barlow Condensed 48px/700, uppercase,
  letter-spacing `-0.01em`, line-height 1, color `--color-fg-default`.
- Required pill: inline next to the `<h1>`, same treatment as the profile step
  (`REQUIRED` label, 10px/600, letter-spacing 0.18em, uppercase,
  `--color-fg-muted`, 1px `--color-border-card` border, `--radius-md` padding
  `2px 8px`).
- Lede: `"Enter your email and choose a password. Your account is created only once
  you complete onboarding — nothing is saved until you finish."` — 15px,
  `--color-fg-label`, max-width 580px, line-height 1.6.

#### Form fields

**Email address**

- Label: `Email address` — 14px/500, `--color-fg-label`.
- Input: full-width, `--color-bg-surface-1` fill, `1px --color-border-input`
  border, `--radius-md`, padding `10px 12px`, 14px/400 `--color-fg-default` text,
  placeholder `you@example.com` in `--color-fg-muted`.
- `type="email"`, `autocomplete="email"`, `autofocus` on step mount.
- Focus ring: `box-shadow: 0 0 0 3px rgba(34,197,94,0.25)`, border shifts to
  `--color-border-focus`.
- Error state: border shifts to `--color-error-strong`, focus ring to
  `rgba(239,68,68,0.25)`. Inline error message below the input: 12px,
  `--color-error-fg`, with a leading `ExclamationCircleIcon` (Heroicons v2
  outline, 14px) and the message text.

**Password**

- Label: `Password` — 14px/500, `--color-fg-label`.
- Input: same dimensions and tokens as email. Password show/hide toggle button
  on the right inset, using `EyeIcon` / `EyeSlashIcon` (Heroicons v2 outline,
  20px), color `--color-fg-muted`, hover `--color-fg-label`, duration-fast
  transition.
- `type="password"` (toggles to `type="text"` when revealed), `autocomplete=
  "new-password"`.
- Helper text below input (always visible when no error): `8–15 characters` —
  12px/400, `--color-fg-muted`.
- Error state: same border / ring treatment as email. Helper text is replaced by
  the inline error message.

**Delight detail:** when the email field loses focus with a valid format, the
field border transitions from `--color-border-input` to `--color-primary-border`
with a 200ms ease-out animation — a subtle "accepted" signal before the user
finishes the form. This uses only CSS custom properties and a class toggle; no
additional tokens required.

#### States

| State | Description |
|---|---|
| Empty | Both fields blank. Continue button active (validation fires on submit, not on mount). |
| Filled-valid | Both fields contain valid values. No inline errors visible. Continue button active. |
| Invalid-email | Submitted with a malformed email. Inline error under the email field: "Please enter a valid email address." Border red. Focus returns to email field. |
| Password-too-short | Submitted with password under 8 characters. Inline error: "Password must be at least 8 characters." |
| Password-too-long | Submitted with password over 15 characters. Inline error: "Password must be at most 15 characters." |
| Submitting (late) | Spinner replaces Continue button text (matching existing AuthForm loading treatment). No form changes otherwise. |
| Late-error-email-in-use | Terms step submission failed with `EMAIL_ALREADY_EXISTS`. See §"Late-error recovery" below. |

#### Continue button (sticky footer primary)

- Default: primary green, `Continue →` with a right-arrow icon
  (`ArrowRightIcon`, Heroicons outline, 16px).
- Loading (during the late submission at terms): primary green at 40% opacity,
  spinner inline, text "Creating account..." — matches existing `AuthForm`
  loading button treatment.
- The button is never disabled at rest on this step — validation is on-submit
  only (standard form UX, matches existing flow).

#### Interactions

- Tab order: email → password show/hide toggle → Continue → Back.
- Enter key on either field submits the form (standard HTML form behavior).
- Escape key: no effect — does not exit the wizard (same rule as the rest of the
  onboarding flow per the existing handoff accessibility section).
- Focus ring: `box-shadow: 0 0 0 3px rgba(34,197,94,0.25)` on `:focus-visible`
  for all interactive elements, duration-normal (200ms).

#### Accessibility

- `<form aria-label="Create your account">` wrapping the two fields.
- Email: `id="cred-email"`, `<label for="cred-email">`, `aria-required="true"`,
  `aria-invalid="true"` only when an error is present, `aria-describedby=
  "cred-email-error"` when error is shown.
- Password: `id="cred-password"`, `<label for="cred-password">`, `aria-required=
  "true"`, `aria-invalid`, `aria-describedby="cred-password-hint cred-password-
  error"` (helper text always; error only when present).
- Show/hide toggle: `aria-label="Show password"` / `"Hide password"`.
- Error messages: `role="alert"` so they are announced by screen readers on
  appearance.
- `aria-describedby` on Continue button pointing to `"cred-form-error"` when the
  late-error banner is visible.

---

### 2. Wizard chrome update

#### Step rail

The step rail gains a credentials row at position 1. All existing steps shift
down by one index. The visual treatment of each row state (current / done / todo)
is unchanged from the existing onboarding handoff.

New step rail rows (in order):

```
① YOUR ACCOUNT     — REQUIRED
② YOUR PROFILE     — REQUIRED
③ PREFERENCES      — OPTIONAL
④ MEMBERSHIP       — OPTIONAL
⑤ FIRST BOOKING    — OPTIONAL · IF PLAN CHOSEN
⑥ FINAL CHECK      — REQUIRED
 ✓ DONE
```

Sub-label token: 10px/600, letter-spacing `0.18em`, uppercase, `--color-fg-muted`.

#### Mini nav step eyebrow

The existing pattern `STEP 03 · PREFS` updates for the new numbering:

- Credentials: `STEP 01 · ACCOUNT`
- Profile: `STEP 02 · PROFILE`
- Preferences: `STEP 03 · PREFS`
- Membership: `STEP 04 · MEMBERSHIP`
- Booking: `STEP 05 · BOOKING`
- Terms: `STEP 06 · FINAL CHECK`

The step fraction updates from `3 of 6` to `3 of 7` (or `3 of 6` when booking
step is hidden because no plan was selected — same conditional as today).

#### Removal of "back to login" / "already have an account?" affordances

The following elements must be removed or never added (they are absent from the
existing onboarding handoff, but this document explicitly prohibits their future
introduction per PRD AC-06):

- Any "Already have an account? Sign in" link inside the wizard chrome.
- Any "Back to login" button or link in the sticky footer, mini nav, or step
  content.
- Any text that implies the user can or should navigate to a login surface from
  inside the wizard.

Where should users who already have an account log in? They must return to the
landing page or navigate to `/login` directly. The wizard does not provide this
affordance. This is a deliberate product decision (PRD AC-06 — no escape hatch
from inside the wizard).

---

### 3. Landing-page CTA route change (no visual change)

The "Join GymFlow" button in the logged-out Nav state and the "Start 7-day trial →"
hero CTA in State 3 (Logged-out visitor) of the landing-page-redesign handoff
currently route to `/signup`.

**Change:** both route targets update from `/signup` (or `/register`) to
`/onboarding` (the credentials step is always step 1, so `/onboarding` lands
directly on it for unauthenticated guests).

No visual change to the buttons. No copy change. No layout change. This is a
single routing wire in the Nav and hero components.

Reference component in the landing handoff: `<Nav>` logged-out variant in
`design_reference/pulse_shared.jsx`, and `<HeroLoggedOut>` in
`design_reference/pulse_hero.jsx`.

---

## Late-error recovery (terms-step uniqueness failure)

### The problem

The credentials step collects an email address and holds it client-side. No
uniqueness check is made at that moment. The backend account is created only when
the guest submits the `terms` step. At that point, if another user has registered
with the same email address during the intervening minutes, the backend returns
`HTTP 409` with error code `EMAIL_ALREADY_EXISTS`.

### The chosen UX: snap back to the credentials step with a persistent error banner

**Rationale:** A modal would interrupt the user's sense of location inside the
wizard and add a dismissal step before they can correct the data. Silently failing
or showing the error only on the terms step — with no path back to the email field
— would be confusing. The simplest, most direct recovery is to snap the wizard
back to the credentials step, where the offending field lives, and show a clear
persistent banner at the top of the form.

**Exact flow:**

1. Guest submits the `terms` step. The wizard enters loading state (Continue
   button shows spinner, footer disabled).
2. Backend responds `409 EMAIL_ALREADY_EXISTS`.
3. The wizard immediately navigates back to the credentials step
   (`setStep('credentials')`) — no confirmation, no modal.
4. At the top of the credentials step form, a persistent error banner appears
   (above the email field, below the lede paragraph):

   ```
   ┌──────────────────────────────────────────────────────────┐
   │  ⚠  This email is already registered. Enter a different  │
   │     email address to continue.                            │
   └──────────────────────────────────────────────────────────┘
   ```

   - Container: `--color-error-bg` fill, `--color-error-border` 1px border,
     `--radius-md`, padding `12px 16px`.
   - Icon: `ExclamationTriangleIcon` (Heroicons v2 outline, 16px),
     `--color-error-fg`.
   - Text: 14px/400, `--color-error-fg`.
   - `role="alert"` so it is announced immediately by screen readers.
   - The banner persists until the user modifies the email field (first
     `onChange` on the email input clears it). This prevents confusion if the
     user reads the banner, then tabs to the password field.

5. The email input receives focus automatically on snap-back (scroll into view
   if needed on small screens).
6. The email field border shows the error state (`--color-error-strong` border)
   immediately on snap-back — the field is effectively "pre-errored".
7. The guest corrects the email and taps Continue. The wizard re-traverses from
   credentials: it advances through the subsequent steps again (they are already
   filled in from `localStorage`, so the guest sees their existing data
   pre-populated). When they reach `terms` again, the same combined submission
   fires.

**What is not shown:** the wizard does not reveal the competing account, suggest
the guest log in, or offer any path to the login page from inside this error
state (AC-06).

**State needed in the onboarding store:**

```ts
credentialsLateError: string | null  // null when clear, error message when set
```

This is set by the terms-submission handler on `EMAIL_ALREADY_EXISTS` and cleared
on the first email field `onChange` after the snap-back.

---

## Data contracts (designer level)

The credentials step collects:

```ts
{
  email: string;    // valid email format; held client-side only until terms submit
  password: string; // 8–15 chars; held client-side only; cleared from store on success
}
```

These are combined with the mandatory profile fields at terms submission:

```ts
POST /api/v1/auth/register
Body: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;       // E.164 formatted
  dateOfBirth: string; // ISO date
  agreeTerms: boolean;
  agreeWaiver: boolean;
}
```

The exact request shape is implementation-level and belongs in the SDD. The
designer's contract is: credentials + mandatory profile fields are submitted in
one request at the `terms` step.

Error code mapping (designer-level only — implementation in
`frontend/src/utils/errorMessages.ts`):

| Code | Displayed where | Message |
|---|---|---|
| `EMAIL_ALREADY_EXISTS` | Credentials step late-error banner | "This email is already registered. Enter a different email address to continue." |
| `VALIDATION_ERROR` | Inline under the relevant field | Per-field message from the backend |

---

## State schema

The existing `OnboardingData` type from the onboarding handoff gains two fields:

```ts
type OnboardingData = {
  // NEW — credentials step
  email: string;               // collected at step 1, submitted at terms
  password: string;            // collected at step 1; cleared from store on success
  credentialsLateError: string | null; // set on EMAIL_ALREADY_EXISTS, cleared on email change

  // UNCHANGED — from existing onboarding handoff
  firstName: string;
  lastName: string;
  phone: string;
  dob: string;
  goals: string[];
  classTypes: string[];
  frequency: string | "";
  photoName: string | null;
  photoPreview: string | null;
  plan: "monthly" | "quarterly" | "annual" | null;
  bookingType: "class" | "trainer";
  bookingId: string | null;
  agreeTerms: boolean;
  agreeWaiver: boolean;
  notifBooking: boolean;
  notifNews: boolean;
};
```

Step visibility (credentials step is always shown; the booking conditional is
unchanged):

```ts
const visibleSteps = ALL_STEPS.filter(s => s.key !== "booking" || !!data.plan);
// ALL_STEPS now begins with { key: "credentials", required: true, label: "Your account" }
```

Completion check (unchanged logic; credentials fields are not part of the
required-complete gate because they are a prerequisite to reaching terms, not a
separate gate at terms):

```ts
const requiredComplete =
  !!data.firstName && !!data.lastName && !!data.phone && !!data.dob
  && data.agreeTerms && data.agreeWaiver;
```

---

## Interactions and motion

All timing and easing values are from the canonical token set:

- Step transition into credentials step: fade-and-rise 12px upward, 200ms
  `--ease-out`. Same as all other step transitions.
- Snap-back to credentials on late error: same step transition (not an instant
  jump — the transition signals intentional navigation).
- Error banner appearance: fade in 200ms `--ease-out`; no slide (banner is
  always in the DOM, opacity transitions from 0 to 1).
- Email field pre-error border: transitions from default to error border color
  in 200ms on snap-back.
- Show/hide password toggle icon swap: instant (no transition — icon state
  toggle).
- Focus ring: `box-shadow: 0 0 0 3px rgba(34,197,94,0.25)` on `:focus-visible`,
  200ms `--ease-in-out`.
- "Accepted email" delight border: `--color-border-input` → `--color-primary-border`,
  200ms `--ease-out`, triggered on `blur` of a valid email field.

`prefers-reduced-motion`: all `transition` and `animation` durations collapse to
`0.01ms` via the existing rule in `colors_and_type.css`. The snap-back navigation
still occurs; only its animation is suppressed.

---

## Accessibility

- Credentials form: `<form aria-label="Create your account">` containing the
  two fields and the error banner.
- Email field: `<label for="cred-email">Email address</label>`, `aria-required=
  "true"`, `aria-describedby="cred-email-error"` (only when error is present).
- Password field: `<label for="cred-password">Password</label>`, `aria-required=
  "true"`, `aria-describedby="cred-password-hint cred-password-error"` — the
  helper text has `id="cred-password-hint"` so it is always announced.
- Show/hide toggle: `type="button"` (not submit), `aria-label` toggled between
  "Show password" and "Hide password".
- Late-error banner: `role="alert"` with `aria-live="assertive"` so snap-back
  is announced without the user moving focus — in addition to the programmatic
  focus move to the email field.
- Continue button: `aria-describedby="cred-form-error"` (references the late-
  error banner `id`) when the banner is visible.
- Step rail: `<nav aria-label="Onboarding progress">` with `<ol>`, credentials
  row has `aria-current="step"` when it is the active step.
- Back button (disabled on credentials): `aria-disabled="true"` rather than
  `disabled` (so it remains in the tab order and assistive technology can
  announce it as disabled rather than silently skipping it).

---

## Responsive

Inherits the existing onboarding handoff responsive rules. No additional breakpoints.

| Breakpoint | Behavior |
|---|---|
| < 1024px | Drop left step rail; keep progress bar only. Form becomes full-width, padding 24px. |
| < 720px | Footer buttons stack: Back on top-left, Continue full-width below. |
| < 560px | Headline drops from 48px to 36px. Form gaps 48 → 24px. |

---

## Components used

These existing components from `frontend/src/components/` should be reused or
directly adapted by the developer:

| Component | Path | Use |
|---|---|---|
| `PasswordInput` | `frontend/src/components/auth/PasswordInput.tsx` | Password field with show/hide toggle — reuse as-is |
| `AuthForm` | `frontend/src/components/auth/AuthForm.tsx` | Email field pattern and error rendering — do not import the whole component; extract the email input pattern |
| `OnboardingShell` | `frontend/src/components/onboarding/OnboardingShell.tsx` | Wizard chrome (mini nav, rail, sticky footer) — add credentials step to the step table |

The developer should **not** import `RegisterPage` or `AuthForm` wholesale into
the wizard — the credentials step is a bespoke wizard step that follows the step
content skeleton, not a wrapped standalone auth form.

---

## Files in this handoff

```
docs/design-system/handoffs/onboarding-unified-signup/
├── README.md                        — this spec
└── design_reference/
    ├── index.html                   — standalone prototype, opens without a build step
    ├── colors_and_type.css          — verbatim copy of docs/design-system/colors_and_type.css
    └── brief.md                     — verbatim copy of docs/briefs/onboarding-unified-signup.md
```

---

## Deferred items

The following items are explicitly out of scope for this handoff. They are
unchanged from the existing onboarding handoff or are deliberate non-goals from
the PRD:

- **Login page redesign** — the login page is unchanged.
- **Profile / preferences / membership / booking / terms / done step layouts**
  — these are unchanged from `docs/design-system/handoffs/onboarding/`.
- **Email verification** — not in scope; no verification email is sent.
- **Social auth** — not in scope.
- **Password reset** — not in scope.
- **Admin-created accounts** — unchanged; out of scope per PRD.
- **Migrating existing half-onboarded users** — out of scope per PRD.
- **Password strength meter** — the PRD specifies 8–15 characters; no strength
  meter is specified. If added in future, it requires a new brief.
- **Returning guest who abandoned mid-wizard** — the wizard resumes from
  `localStorage`. The behavior for a returning guest who tries to start over
  with the same email (before anyone else registered it) is implementation-level
  and belongs in the SDD.
- **`RegisterPage` retirement** — removing the standalone `/register` route for
  guests is implementation work; this handoff does not include a design for that
  route's tombstone or redirect.

---

## Open questions

1. **What route does `/register` redirect to after retirement?** If a guest
   arrives at `/register` via a bookmarked URL or an external link, should they
   be redirected to `/onboarding` (the credentials step) or to the landing page?
   This is a product + backend decision; the designer's assumption is `/onboarding`.

2. **Password clearing from localStorage after success.** The `password` field
   should be erased from the onboarding store and `localStorage` immediately on
   successful terms submission (before the wizard advances to the done step). The
   developer must confirm this is handled before the PR is merged. This is
   implementation-level; raised here to ensure it is not overlooked.

3. **Combined endpoint vs. two-step endpoint.** The brief states the
   `POST /auth/register` contract should be adjusted to accept credentials + profile
   fields in one payload. If the backend team prefers a two-call approach (create
   user, then patch profile), the frontend must handle partial failure between
   the two calls. Product should confirm which contract shape is required before
   implementation begins.

---

## Benchmarks

| Pattern | Reference |
|---|---|
| Credentials step as first step of a wizard (no separate registration page) | **Linear** signup flow — email-first step embedded directly in workspace creation wizard |
| Late-error recovery (unique-constraint failure surfaced after multi-step flow) | **Vercel** project import — validation errors snap back to the relevant form step with a persistent inline banner |
| Password field with show/hide toggle inside a dark-theme wizard | **Whoop** account creation flow — EyeIcon toggle, helper text always visible, focus ring in brand color |
| Progress rail + sticky footer in multi-step onboarding | **Peloton** app onboarding — numbered rail left, content right, primary CTA pinned to bottom right |
