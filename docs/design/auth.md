# Design: Auth (Register / Login)

> Authoritative UI/UX specification for the Register and Login pages.
> All refactoring of existing frontend components must match this spec exactly.
> Last updated: 2026-03-21

---

## User Flows

### Flow 1: Guest registers a new account

1. Guest visits `/register`.
2. Guest sees the GymFlow logo mark, wordmark, "Create your account" heading, and
   a "Already have an account? Sign in" link that navigates to `/login`.
3. Guest fills in "Email address" and "Password" fields inside the card.
4. While the form is submitting, the submit button enters the loading state: it becomes
   non-interactive, turns `bg-green-500/40`, and shows a spinning SVG left of the
   "Creating account..." label.
5a. On success (201): the guest is redirected to `/login` (or auto-logged in — document
    the choice in code; spec does not mandate one path).
5b. On `EMAIL_ALREADY_EXISTS` (409): the server error banner appears above the submit
    button with the message "An account with this email already exists. Please sign in
    instead." The button returns to its default state.
5c. On `VALIDATION_ERROR` (400): the specific field error text returned by the backend
    appears below the relevant input as an inline error message. The input enters the
    error border state. The button returns to its default state.

### Flow 2: Guest logs in

1. Guest visits `/login`.
2. Guest sees the GymFlow logo mark, wordmark, "Sign in to your account" heading, and
   a "Don't have an account? Register" link that navigates to `/register`.
3. Guest fills in "Email address" and "Password" fields inside the card.
4. While the form is submitting, the submit button enters the loading state (same as
   Flow 1, with "Signing in..." label).
5a. On success (200): tokens are stored in the auth store and the guest is redirected
    to `/classes`.
5b. On `INVALID_CREDENTIALS` (401): the server error banner appears above the submit
    button with the message "Incorrect email or password. Please try again."
5c. On `VALIDATION_ERROR` (400): inline field error (same as Flow 1, step 5c).

### Flow 3: Axios interceptor handles expired refresh token (background)

1. Any authenticated page request returns 401.
2. The Axios response interceptor silently calls `POST /api/v1/auth/refresh`.
3a. If refresh succeeds: the original request is retried with the new access token.
    The user sees nothing.
3b. If refresh returns `REFRESH_TOKEN_EXPIRED` or `REFRESH_TOKEN_INVALID`: the auth
    store is cleared and the user is redirected to `/login` with no error message shown.
    (This is a silent redirect, not a banner error.)

---

## Screens & Components

### Screen: Login Page (`/login`)

Who sees it: Guest (unauthenticated visitors only; authenticated users are redirected away)

Layout: full-screen column, `min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-4 py-12`

The screen is divided into two stacked zones:

1. **Header block** — sits above the card, centered.
2. **Card** — contains the AuthForm.

#### Header Block

```
flex flex-col items-center gap-3 mb-8
```

Elements in order:

1. Logo mark: a 40x40 green rounded square containing the lightning bolt SVG.
   ```jsx
   <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500">
     <svg
       xmlns="http://www.w3.org/2000/svg"
       viewBox="0 0 24 24"
       className="h-6 w-6"
       aria-hidden="true"
     >
       <path d="M13 2L4.5 13.5H11L9 22L19.5 9.5H13.5L16 2Z" fill="white" />
     </svg>
   </div>
   ```
2. Wordmark: `<span className="text-3xl font-bold leading-tight text-white">GymFlow</span>`
3. Page heading: `<h1 className="text-xl font-semibold leading-tight text-gray-400">Sign in to your account</h1>`
4. Navigation link:
   ```jsx
   <p className="text-sm text-gray-500">
     Don't have an account?{' '}
     <a href="/register" className="font-medium text-green-400 hover:text-green-300 transition-colors duration-200 focus-visible:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-green-500">
       Register
     </a>
   </p>
   ```

#### Card

```
bg-gray-900 border border-gray-800 rounded-xl px-8 py-10 w-full max-w-md
```

Contains: `<AuthForm mode="login" ... />` — see AuthForm component spec below.

---

### Screen: Register Page (`/register`)

Who sees it: Guest (unauthenticated visitors only)

Layout: identical to Login Page — `min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-4 py-12`

#### Header Block

Same structure as Login Page with these differences:

- Page heading: `<h1 className="text-xl font-semibold leading-tight text-gray-400">Create your account</h1>`
- Navigation link:
  ```jsx
  <p className="text-sm text-gray-500">
    Already have an account?{' '}
    <a href="/login" className="font-medium text-green-400 hover:text-green-300 transition-colors duration-200 focus-visible:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-green-500">
      Sign in
    </a>
  </p>
  ```

#### Card

```
bg-gray-900 border border-gray-800 rounded-xl px-8 py-10 w-full max-w-md
```

Contains: `<AuthForm mode="register" ... />` — see AuthForm component spec below.

---

## Components

### AuthForm

**File:** `src/components/auth/AuthForm.tsx`

**Props:**
```typescript
interface AuthFormProps {
  mode: 'login' | 'register';
  onSubmit: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null; // server-level error; shown in the error banner
}
```

**Layout:** `<form>` element with `flex flex-col gap-5` and `aria-label` matching the mode
("Sign in" for login, "Create account" for register).

**Internal order:**
1. Email field wrapper
2. Password field wrapper
3. Server error banner (conditionally rendered)
4. Submit button

#### Email Field

Wrapper: `flex flex-col gap-1.5`

Label:
```jsx
<label htmlFor="email" className="text-sm font-medium text-gray-300">
  Email address
</label>
```

Input — default state:
```jsx
<input
  id="email"
  type="email"
  autoComplete="email"
  placeholder="you@example.com"
  className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 focus-visible:border-transparent"
/>
```

Input — error state (add these classes, remove `border-gray-700`):
```
border-red-500/60 focus-visible:ring-red-500
```
Also add `aria-invalid="true"` and `aria-describedby="email-error"` attributes.

Input — disabled/loading state (add these classes):
```
cursor-not-allowed bg-gray-800 opacity-60
```

Error message (rendered below the input when a field-level error exists):
```jsx
<p id="email-error" role="alert" className="mt-1 text-xs text-red-400">
  {emailError}
</p>
```

#### Password Field

Wrapper: `flex flex-col gap-1.5`

Label:
```jsx
<label htmlFor="password" className="text-sm font-medium text-gray-300">
  Password
</label>
```

Contains `<PasswordInput />` — see PasswordInput component spec below.

Pass `autoComplete="current-password"` when `mode === 'login'`.
Pass `autoComplete="new-password"` when `mode === 'register'`.

For the error state on the password wrapper, follow the same pattern as the email
field: `border-red-500/60 focus-visible:ring-red-500`, `aria-invalid`, `aria-describedby`.

#### Server Error Banner

Rendered between the last field and the submit button when `error` prop is non-null.

```jsx
{error && (
  <div
    role="alert"
    className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
  >
    {error}
  </div>
)}
```

#### Submit Button

The button spans the full width of the card and is always the last child of the form.

Default state:
```jsx
<button
  type="submit"
  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
>
  {mode === 'login' ? 'Sign in' : 'Create account'}
</button>
```

Loading state — replace the above with:
```jsx
<button
  type="submit"
  disabled
  aria-busy="true"
  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-green-500/40 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 cursor-not-allowed"
>
  <svg
    className="h-5 w-5 animate-spin text-white"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
</button>
```

Note: `aria-hidden="true"` on the spinner SVG ensures screen readers announce only the
button text, not the icon.

---

### PasswordInput

**File:** `src/components/auth/PasswordInput.tsx`

**Props:**
```typescript
interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  autoComplete: 'current-password' | 'new-password';
  disabled?: boolean;
}
```

**Layout:** `relative` wrapper div containing the input and the toggle button.

Input:
```jsx
<input
  id={id}
  type={showPassword ? 'text' : 'password'}
  value={value}
  onChange={(e) => onChange(e.target.value)}
  autoComplete={autoComplete}
  placeholder="••••••••"
  disabled={disabled}
  aria-invalid={error ? 'true' : undefined}
  aria-describedby={error ? `${id}-error` : undefined}
  className={[
    'w-full rounded-md border bg-gray-900 px-3 py-2 pr-10 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 focus-visible:border-transparent',
    error
      ? 'border-red-500/60 focus-visible:ring-red-500'
      : 'border-gray-700 focus-visible:ring-green-500',
    disabled ? 'cursor-not-allowed bg-gray-800 opacity-60' : '',
  ].join(' ')}
/>
```

Toggle button — positioned absolutely inside the wrapper:
```jsx
<button
  type="button"
  onClick={() => setShowPassword((prev) => !prev)}
  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-300 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:rounded-sm"
  aria-label={showPassword ? 'Hide password' : 'Show password'}
  tabIndex={0}
>
  {showPassword ? (
    <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
  ) : (
    <EyeIcon className="h-5 w-5" aria-hidden="true" />
  )}
</button>
```

Icon library: Heroicons v2 outline (`@heroicons/react/24/outline`).
Import: `import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'`

Error message (rendered below the wrapper, outside the `relative` div):
```jsx
{error && (
  <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-400">
    {error}
  </p>
)}
```

---

## Component States

| Component | Loading | Empty / Blank | Error | Populated |
|-----------|---------|---------------|-------|-----------|
| Email input | `cursor-not-allowed bg-gray-800 opacity-60` | Default border `border-gray-700`, placeholder visible | `border-red-500/60`, inline `text-xs text-red-400` message below | Default border, user text in `text-white` |
| PasswordInput | Same disabled classes as email | Default border `border-gray-700`, `••••••••` placeholder | `border-red-500/60`, inline error below | Default border, masked or revealed text |
| Server error banner | Not shown | Not shown (error prop is null) | `bg-red-500/10 border-red-500/30 text-red-400` block above button | N/A |
| Submit button | `bg-green-500/40 cursor-not-allowed` + spinner + "...ing" label | — | — | `bg-green-500 hover:bg-green-600 hover:shadow-green-500/25`, mode label |
| AuthForm | All inputs disabled, button loading | All inputs empty, button enabled | Per-field or banner error shown | Inputs filled, button enabled |

---

## Error Code to UI Message Mapping

| Error Code | Message Shown to User | Location |
|------------|-----------------------|----------|
| `EMAIL_ALREADY_EXISTS` | "An account with this email already exists. Please sign in instead." | Server error banner |
| `VALIDATION_ERROR` | The specific field error string returned by the backend (e.g. "Password must be between 8 and 15 characters") | Inline below the relevant input field |
| `INVALID_CREDENTIALS` | "Incorrect email or password. Please try again." | Server error banner |
| `REFRESH_TOKEN_EXPIRED` | Silent redirect to `/login` — no banner shown | Axios interceptor; no UI message |
| `REFRESH_TOKEN_INVALID` | Silent redirect to `/login` — no banner shown | Axios interceptor; no UI message |

---

## Responsive Behaviour

**Mobile (default, below `sm` breakpoint):**
- The card fills the horizontal space to a max of `max-w-md`. On small screens with
  `px-4` page padding it occupies nearly the full width.
- The header block stacks vertically and is centered.
- Inputs and button are full-width — no changes needed from default spec.
- Card padding: `px-8 py-10` is retained; if the viewport is very narrow (below 360px),
  consider reducing to `px-6 py-8` but this is not a required breakpoint change.

**Desktop (`sm` breakpoint and above):**
- The card is centered and capped at `max-w-md` (448px). It does not expand further.
- The page background (`bg-[#0F0F0F]`) is visible on all sides around the card.
- No layout changes from the mobile spec — the centered column layout already handles
  desktop correctly.

---

## Accessibility

- All inputs have a visible `<label>` with `htmlFor` matching the input `id`.
- Inputs in the error state carry `aria-invalid="true"` and `aria-describedby` pointing
  to the error message `id`.
- Error messages (both inline field errors and the server error banner) use `role="alert"`
  so they are announced immediately by screen readers when they appear.
- The `<form>` element carries `aria-label` matching the page mode ("Sign in" or
  "Create account").
- The submit button uses `aria-busy="true"` during the loading state.
- The loading spinner SVG carries `aria-hidden="true"` so screen readers read only the
  button text.
- The show/hide toggle button has an `aria-label` that updates between "Show password"
  and "Hide password".
- All interactive elements (inputs, buttons, links) show a visible focus ring using
  `focus-visible:ring-2 focus-visible:ring-green-500`. Mouse clicks do not trigger the
  ring (use `focus-visible:` not `focus:`). The `ring-offset-gray-900` offset ensures the
  ring separates cleanly from dark card backgrounds.
- The logo mark SVG carries `aria-hidden="true"`.
- The `<h1>` page heading is the first heading on the page.
- Color is never the sole indicator of state: error inputs show both a red border and an
  explicit error text message below.
- Minimum touch target size for the show/hide toggle is met by `px-3 inset-y-0` giving a
  44px height target on a standard 40px input.
- Contrast on dark surfaces: `text-white` on `bg-gray-900` is ~17:1 (AAA). `text-red-400`
  on `bg-gray-900` is ~4.8:1 (AA). `text-green-400` on `bg-gray-900` is ~7.5:1 (AA).

---

## Motion and Transitions

| Element | Transition Classes |
|---------|-------------------|
| Email input (color states) | `transition-colors duration-200` |
| PasswordInput (color states) | `transition-colors duration-200` |
| Show/hide toggle (icon color) | `transition-colors duration-150` |
| Submit button (color + glow states) | `transition-all duration-200` |
| Navigation links | `transition-colors duration-200` |
| Card | No animation — static |

Reduced motion: the global `prefers-reduced-motion` rule in `src/index.css` collapses
all transitions and animations to `0.01ms`. The spinner's `animate-spin` is also
suppressed by this rule. No additional component-level guards are needed.

---

## Dependency Notes and Gaps

### Heroicons v2 (required dependency)

The `PasswordInput` component uses `EyeIcon` and `EyeSlashIcon` from Heroicons v2.

The existing implementation uses inline SVG paths. Refactoring requires installing:

```bash
npm install @heroicons/react
```

Import pattern:
```typescript
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
```

This is a new `package.json` dependency. It must be added before the `PasswordInput`
refactor is applied.

### autoComplete on PasswordInput

The existing `PasswordInput` component hardcodes `autoComplete="current-password"`.
The spec requires the `autoComplete` value to be passed as a prop so `AuthForm` can
supply `"current-password"` in login mode and `"new-password"` in register mode.
The `autoComplete` prop is already included in the `PasswordInputProps` interface above.

### No gaps identified between PRD / SDD and this spec

All screens and components map directly to endpoints defined in
`docs/sdd/auth.md` Section 2. No endpoint has been invented. No screen requires data
that the SDD does not provide.
