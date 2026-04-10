# Design: User Profile Management

> Authoritative UI/UX specification for the authenticated user profile page.
> All frontend implementation for this feature must match this spec exactly unless a
> later design revision explicitly replaces it.
> Prototype: `docs/design/prototypes/user-profile-management.html`
> Last updated: 2026-03-29

**Benchmark:** Nike Training Club — account/profile screen: dark surface card layout with avatar, display name, and read-only account email in an aside panel alongside an editable fields form, using high-contrast action colours on near-black backgrounds.

---

## User Flows

### Flow 1: Authenticated user opens an existing profile

1. User clicks `Profile` from the authenticated navbar and lands on `/profile`.
2. The page loads inside the standard authenticated shell: sticky navbar, dark page
   background, centered content container.
3. While `GET /api/v1/profile/me` is in flight, the page shows a summary-card skeleton
   and a form-card skeleton.
4. When the request succeeds, the user sees:
   - a profile summary card with initials, read-only email, and last-updated metadata
   - a form card prefilled with their current editable values
5. The email field is visibly read-only and cannot receive text input.

### Flow 2: First-time user opens profile with no stored profile row

1. User navigates to `/profile`.
2. `GET /api/v1/profile/me` returns HTTP 200 with `email` and `userId`, editable scalar
   fields as `null`, and list fields as empty arrays.
3. The page renders the normal profile layout, not an error or "empty page" state.
4. The summary card shows a neutral helper line: "Complete your profile to keep your
   account details current."
5. All editable fields render empty with helper text where needed. The user can begin
   typing immediately.

### Flow 3: User updates profile successfully

1. User edits any combination of `firstName`, `lastName`, `phone`, `dateOfBirth`,
   `fitnessGoals`, and `preferredClassTypes`.
2. The form validates basic constraints on blur and on submit.
3. User clicks `Save changes`.
4. While `PUT /api/v1/profile/me` is in flight:
   - all form controls remain visible
   - the submit button enters the loading state with spinner and `Saving...`
   - the button is disabled
5. On success:
   - success banner appears at the top of the form card: `Profile updated.`
   - summary card updates immediately
   - form dirty state resets to clean
   - keyboard focus moves to the success banner

### Flow 4: User hits validation errors

1. User enters an invalid value such as a future date, blank chip, too many chips, or
   an invalid international phone number.
2. Client-side validation blocks obvious invalid submissions before the request is sent.
3. If the server still returns a field-specific validation error, the matching field
   shows inline error text and error border styling.
4. The first invalid field receives focus after submit.
5. Previously entered valid values remain intact.

### Flow 5: User encounters page-level failure

1. If `GET /api/v1/profile/me` fails with a recoverable error, the page shows a single
   centered error card with message: `Failed to load your profile.`
2. The card includes a secondary `Try again` button that repeats the fetch.
3. If an authenticated non-`USER` account reaches `/profile` and receives
   `ACCESS_DENIED`, the page shows a non-editable access state with message:
   `You do not have permission to view this profile.`
4. This state includes a ghost `Back to schedule` link to `/schedule`.

---

## Screens & Components

### Screen: User Profile Page (`/profile`)

Who sees it: Authenticated `USER` accounts only. Unauthenticated visitors are redirected
by `AuthRoute`. Authenticated non-`USER` accounts may technically reach the route, but
the backend remains authoritative and returns the access-denied state.

Layout:

```jsx
<div className="min-h-screen bg-[#0F0F0F] text-white">
  <Navbar />
  <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
    {/* Header */}
    {/* Content grid */}
  </main>
</div>
```

Desktop content layout: `lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-6`

Mobile content layout: single-column stack with summary card first, form card second.

The page is divided into three zones:

1. `ProfilePageHeader`
2. `ProfileSummaryCard`
3. `UserProfileFormCard`

#### ProfilePageHeader

Data shown:
- heading: `Your Profile`
- subheading: `Manage the personal details tied to your GymFlow account.`

Tailwind structure:

```jsx
<div className="flex flex-col gap-2">
  <h1 className="text-3xl font-bold leading-tight text-white">Your Profile</h1>
  <p className="max-w-2xl text-base font-normal leading-normal text-gray-400">
    Manage the personal details tied to your GymFlow account.
  </p>
</div>
```

No CTA appears in the page header. Saving belongs inside the form card footer so the
action stays close to the edited fields.

#### ProfileSummaryCard

Purpose: Provide identity context and reassure the user that email is account-owned and
outside this editing surface.

Data shown:
- initials badge derived from `firstName` and `lastName`; fallback `GF`
- primary name line:
  - `FirstName LastName` when at least one name exists
  - `Profile not completed yet` when both names are empty
- read-only email
- last-updated caption using `updatedAt`
- helper copy that changes by state

Helper copy rules:
- profile contains at least one editable value: `Keep these details accurate so GymFlow can personalize future experiences.`
- no editable value present: `Complete your profile to keep your account details current.`

Tailwind structure:

```jsx
<aside className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-md shadow-black/50">
  <div className="flex items-center gap-4">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-xl font-bold text-green-400 ring-1 ring-green-500/30">
      {initials}
    </div>
    <div className="min-w-0">
      <h2 className="text-lg font-semibold leading-tight text-white">{displayName}</h2>
      <p className="mt-1 text-sm text-gray-400 break-all">{profile.email}</p>
    </div>
  </div>

  <div className="mt-6 rounded-lg border border-gray-800 bg-[#0F0F0F] p-4">
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
      Account email
    </p>
    <p className="mt-2 text-sm text-white break-all">{profile.email}</p>
    <p className="mt-2 text-xs text-gray-400">
      Email is your login identity and cannot be changed here.
    </p>
  </div>

  <p className="mt-6 text-sm text-gray-400">{helperCopy}</p>
  <p className="mt-3 text-xs text-gray-500">Last updated {formatDateTime(profile.updatedAt)}</p>
</aside>
```

Notes:
- The summary card is informational only. It contains no buttons or menus.
- The initials badge is decorative context, not an avatar-upload affordance.

#### UserProfileFormCard

Purpose: Single source of truth for all editable fields in this feature.

Card shell:

```jsx
<section className="rounded-xl border border-gray-800 bg-gray-900 shadow-md shadow-black/50">
  <div className="border-b border-gray-800 px-6 py-5">
    <h2 className="text-xl font-semibold leading-tight text-white">Personal details</h2>
    <p className="mt-1 text-sm text-gray-400">
      Update your contact details, birth date, and fitness preferences.
    </p>
  </div>
  <div className="px-6 py-6">
    {/* Form content */}
  </div>
  <div className="flex items-center justify-end border-t border-gray-800 px-6 py-4">
    {/* Save button */}
  </div>
</section>
```

Form layout:
- vertical rhythm: `flex flex-col gap-6`
- two-column field rows at `md` and above
- single column below `md`

Field order:
1. top-level success or error banner
2. read-only email field
3. `firstName` and `lastName`
4. `phone` and `dateOfBirth`
5. `fitnessGoals`
6. `preferredClassTypes`

#### Banner states inside the form card

Top-level error banner for non-field errors:

```jsx
<div
  role="alert"
  className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
>
  {errorMessage}
</div>
```

Top-level success banner:

```jsx
<div
  role="status"
  aria-live="polite"
  tabIndex={-1}
  className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400"
>
  Profile updated.
</div>
```

Only one top-level banner is shown at a time. Success replaces any earlier success when
the user saves again.

### Component: UserProfileForm

**File:** `frontend/src/components/profile/UserProfileForm.tsx`

Props:

```ts
interface UserProfileFormProps {
  profile: UserProfile;
  isSaving: boolean;
  fieldErrors: Partial<Record<
    'firstName' | 'lastName' | 'phone' | 'dateOfBirth' | 'fitnessGoals' | 'preferredClassTypes',
    string
  >>;
  error: string | null;
  successMessage: string | null;
  onSubmit: (values: UpdateUserProfileRequest) => Promise<void>;
}
```

Internal form wrapper:

```jsx
<form className="flex flex-col gap-6" aria-label="User profile form">
```

#### Read-only email field

This field looks stable and intentionally non-editable, not disabled-and-broken.

```jsx
<div className="flex flex-col gap-1.5">
  <label htmlFor="email" className="text-sm font-medium text-gray-300">
    Email address
  </label>
  <input
    id="email"
    type="email"
    value={profile.email}
    readOnly
    aria-readonly="true"
    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300"
  />
  <p className="text-sm text-gray-400">
    Email changes are handled in account management, not on this page.
  </p>
</div>
```

#### Name row

Grid: `grid grid-cols-1 gap-4 md:grid-cols-2`

Fields:
- `First name`
- `Last name`

Both use the design-system input style. Optional fields keep the label clean; optional
status is communicated once in helper copy below the row:

`Names are optional, but when provided they must be 1 to 50 characters.`

#### Contact row

Grid: `grid grid-cols-1 gap-4 md:grid-cols-2`

Fields:
- `Phone number`
- `Date of birth`

Phone field:
- placeholder: `+48 123 123 123`
- helper text: `Use international format starting with +.`
- mobile keyboard hint: `inputMode="tel"`
- `autoComplete="tel"`

Date of birth field:
- use native `type="date"`
- helper text: `Date cannot be in the future.`
- max attribute set to the current local date

#### FitnessGoals field

Uses `ProfileChipInput` with:
- label: `Fitness goals`
- placeholder: `Add a goal and press Enter`
- helper text: `Up to 5 goals. Press Enter or comma to add each one.`

This field is a free-text ordered list. The UI does not auto-suggest predefined values.

#### PreferredClassTypes field

Uses `ProfileChipInput` with:
- label: `Preferred class types`
- placeholder: `Add a class type and press Enter`
- helper text: `Up to 5 preferences. Press Enter or comma to add each one.`

Examples may be shown only as placeholder or helper copy, not as prefilled chips.

#### Save action

Footer action alignment: right-aligned on desktop, full-width button on mobile.

Default button:

```jsx
<button
  type="submit"
  className="inline-flex items-center justify-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:bg-green-500/40"
>
  Save changes
</button>
```

Loading button label: `Saving...`

Disable rule:
- disabled while request is in flight
- enabled for both clean and dirty states; the frontend may optionally gate submission
  on dirty state, but the visual spec does not require a disabled "clean" state

### Component: ProfileChipInput

**File:** `frontend/src/components/profile/ProfileChipInput.tsx`

Purpose: A profile-specific wrapper around the design-system `TagInput` pattern, tuned
to the ordered-list rules in the PRD and SDD.

Props:

```ts
interface ProfileChipInputProps {
  id: string;
  label: string;
  value: string[];
  onChange: (nextValue: string[]) => void;
  error?: string;
  helperText: string;
  placeholder: string;
}
```

Visual spec:
- wrapper, container, chip, and error states inherit `TagInput` from the design system
- max 5 chips
- chip style: neutral badge md
- remove button uses `XMarkIcon h-3 w-3`

Interaction rules:
1. Pressing `Enter` or typing `,` commits the current input as a chip.
2. Trimming happens before insertion.
3. Blank values are ignored and never rendered as chips.
4. When the list already contains 5 chips, the text input is replaced with
   `Maximum reached`.
5. Pressing `Backspace` with an empty input removes the last chip.
6. Removing a chip updates order without re-sorting remaining items.
7. Duplicate chips are allowed in the temporary client input only until commit; on
   commit, the component removes duplicates case-insensitively and keeps the first
   occurrence to match backend persistence rules.

### Loading state: Profile page skeleton

The page renders two stacked skeleton cards on mobile and a two-column skeleton layout
on desktop. Use `animate-pulse`.

Summary skeleton:

```jsx
<div className="rounded-xl border border-gray-800 bg-gray-900 p-6 animate-pulse">
  <div className="flex items-center gap-4">
    <div className="h-16 w-16 rounded-full bg-gray-800" />
    <div className="flex-1">
      <div className="h-5 w-32 rounded bg-gray-800" />
      <div className="mt-2 h-4 w-40 rounded bg-gray-800" />
    </div>
  </div>
  <div className="mt-6 h-24 rounded-lg bg-gray-800" />
  <div className="mt-6 h-4 w-full rounded bg-gray-800" />
  <div className="mt-3 h-3 w-28 rounded bg-gray-800" />
</div>
```

Form skeleton:
- card shell matches the final form card
- 6 to 8 horizontal skeleton bars inside the content section
- one full-width button skeleton in the footer

### Error state: Fetch failure card

Shown only when initial profile load fails.

```jsx
<div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 px-6 py-10 text-center shadow-md shadow-black/50">
  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
    <ExclamationTriangleIcon className="h-7 w-7 text-red-400" aria-hidden="true" />
  </div>
  <h2 className="text-xl font-semibold text-white">Failed to load your profile</h2>
  <p className="text-sm text-gray-400">
    Please try again. If the problem continues, contact support.
  </p>
  <button className="inline-flex items-center justify-center rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 hover:text-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900">
    Try again
  </button>
</div>
```

### Error state: Access denied

Shown for authenticated callers who fail the server role check.

```jsx
<div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 px-6 py-10 text-center shadow-md shadow-black/50">
  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10">
    <LockClosedIcon className="h-7 w-7 text-orange-400" aria-hidden="true" />
  </div>
  <h2 className="text-xl font-semibold text-white">Access denied</h2>
  <p className="text-sm text-gray-400">
    You do not have permission to view this profile.
  </p>
  <a
    href="/schedule"
    className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-gray-400 transition-all duration-200 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
  >
    Back to schedule
  </a>
</div>
```

### Navbar change

Update `Navbar` to expose the new route for authenticated `USER` accounts.

Desktop nav order:
`Home` | `Schedule` | `Trainers` | `My Favorites` | `Profile`

This matches the authenticated primary navigation defined in `docs/design/user-access-flow.md`.
`Plans` is not a top-level nav item for authenticated `USER` accounts.

Active nav link styling uses the existing design-system rule:
`text-green-400 border-b-2 border-green-500`

Mobile drawer:
- include `Profile` in the authenticated link list
- keep ordering consistent with desktop

Do not hide profile access behind an avatar-only dropdown. This feature needs a visible
entry point.

---

## States & Validation

### Field states

Every editable input supports:
- default
- focus
- error
- disabled while saving

Error presentation rules:
- border becomes `border-red-500/60`
- focus ring becomes red
- error text is rendered below the field in `text-xs text-red-400`
- inputs set `aria-invalid="true"` and `aria-describedby`

### Form-level messaging

Use the following copy:
- success: `Profile updated.`
- generic save error: `We could not save your profile. Please try again.`
- access denied: `You do not have permission to view this profile.`
- read-only-field error banner: `Email and account ownership fields cannot be changed here.`

### Validation copy

Use these user-facing messages:
- `INVALID_FIRST_NAME`: `First name must be between 1 and 50 characters.`
- `INVALID_LAST_NAME`: `Last name must be between 1 and 50 characters.`
- `INVALID_PHONE`: `Enter a valid international phone number.`
- `INVALID_DATE_OF_BIRTH`: `Enter a valid date of birth that is not in the future.`
- `INVALID_FITNESS_GOALS`: `Fitness goals must contain up to 5 items, each 1 to 50 characters long.`
- `INVALID_PREFERRED_CLASS_TYPES`: `Preferred class types must contain up to 5 items, each 1 to 50 characters long.`

### First-time profile state

When the API returns empty editable data:
- do not show placeholder badges, fake sample values, or onboarding modal overlays
- render empty inputs directly
- show the normal summary and form cards
- allow immediate save even if only one field is entered

---

## Accessibility Notes

1. Use one page-level `<main>` landmark and preserve the shared `<nav>` landmark from
   the authenticated shell.
2. Every form control must have a persistent visible label. Placeholder text is not a
   substitute for labels.
3. Read-only email uses `readOnly` and `aria-readonly="true"`, not `disabled`, so the
   value remains selectable and available to assistive tech.
4. All error messages are linked to inputs via `aria-describedby`; top-level banners use
   `role="alert"` for errors and `aria-live="polite"` for success.
5. On failed submit, move focus to the first invalid field. On successful save, move
   focus to the success banner.
6. The chip remove buttons require explicit labels such as `Remove Yoga`.
7. Interactive controls must keep the standard dark-surface focus ring:
   `focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900`
8. Icon-only states in fetch error or access-denied cards use `aria-hidden="true"` on
   the icon because the heading and body text already convey meaning.
9. Button and chip-remove tap targets must remain at least 44x44px.
10. Respect `prefers-reduced-motion`; card and button transitions stay within the
    design-system 200ms default and should be effectively disabled for reduced motion.

---

## Implementation Notes

1. The form submits the full editable payload on every save. This page does not use
   partial patch semantics.
2. `fitnessGoals` and `preferredClassTypes` preserve insertion order in the UI to match
   the backend's ordered-list contract.
3. The page does not display membership status, booking history, avatar upload, or
   account-email editing because those are out of scope for this feature version.
