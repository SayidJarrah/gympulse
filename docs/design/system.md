# GymFlow Design System

> Living document. All UI/UX design specs for GymFlow reference this file.
> Last updated: 2026-03-21

---

## 1. Design Principles

**Clear over clever.** Every UI element communicates its purpose immediately. Labels, icons, and copy leave no room for ambiguity. Cleverness is never worth confusion.

**Progress feels earned.** Motion and visual weight guide the user from one step to the next. Active states, transitions, and feedback reward interaction without overwhelming.

**Accessible by default.** Contrast, focus rings, and touch targets are not afterthoughts. Every design decision passes AA contrast before it ships.

**Consistency scales.** Spacing, color, and component patterns are fixed tokens. One-off values create debt. When a new pattern is needed, it is added to this document.

---

## 2. Color Palette

The primary palette is indigo — energetic enough for a fitness brand, professional enough for an admin dashboard. Status colors follow universal conventions so users never have to learn new meanings.

### 2.1 Brand Colors

| Token | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| Primary | `bg-indigo-600` / `text-indigo-600` | `#4F46E5` | CTAs, active nav links, focus rings, primary buttons |
| Primary Dark | `bg-indigo-700` / `text-indigo-700` | `#4338CA` | Button hover/pressed, link hover |
| Primary Light | `bg-indigo-50` / `text-indigo-50` | `#EEF2FF` | Subtle tints, active sidebar bg, badge backgrounds |
| Primary Mid | `bg-indigo-100` / `text-indigo-100` | `#E0E7FF` | Hover tints on ghost buttons |
| Secondary | `bg-violet-500` / `text-violet-500` | `#8B5CF6` | Highlight badges, feature callouts, secondary accents |
| Secondary Light | `bg-violet-50` / `text-violet-50` | `#F5F3FF` | Secondary badge backgrounds |

### 2.2 Surface Colors

| Token | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| Page Background | `bg-gray-50` | `#F9FAFB` | Root page background |
| Card Background | `bg-white` | `#FFFFFF` | Cards, modals, dropdowns |
| Input Background | `bg-white` | `#FFFFFF` | Form inputs default |
| Input Background Disabled | `bg-gray-100` | `#F3F4F6` | Disabled form inputs |
| Sidebar Background | `bg-gray-900` | `#111827` | Admin sidebar |
| Sidebar Active | `bg-gray-800` | `#1F2937` | Active sidebar item |

### 2.3 Border Colors

| Token | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| Border Default | `border-gray-200` | `#E5E7EB` | Default card and input borders |
| Border Strong | `border-gray-300` | `#D1D5DB` | Dividers, table headers |
| Border Focus | `ring-indigo-500` | `#6366F1` | Focus ring on inputs and buttons |

### 2.4 Text Colors

| Token | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| Text Default | `text-gray-900` | `#111827` | Body text, headings |
| Text Muted | `text-gray-500` | `#6B7280` | Helper text, secondary labels, placeholders |
| Text Subtle | `text-gray-400` | `#9CA3AF` | Disabled text, metadata |
| Text Inverse | `text-white` | `#FFFFFF` | Text on dark/primary backgrounds |
| Text Link | `text-indigo-600` | `#4F46E5` | Hyperlinks |
| Text Link Hover | `text-indigo-500` | `#6366F1` | Hyperlink hover |

### 2.5 Status Colors

Each status color has three parts: a background tint, a text color (for readability on that tint), and a border color.

| Status | Background | Text | Border | Hex (bg) |
|--------|-----------|------|--------|----------|
| Success | `bg-green-50` | `text-green-700` | `border-green-200` | `#F0FDF4` |
| Warning | `bg-yellow-50` | `text-yellow-700` | `border-yellow-200` | `#FEFCE8` |
| Error | `bg-red-50` | `text-red-700` | `border-red-300` | `#FEF2F2` |
| Info | `bg-blue-50` | `text-blue-700` | `border-blue-200` | `#EFF6FF` |

For **Error input borders** specifically: `border-red-400` (`#F87171`) is used on form fields to provide sufficient contrast against the white input background.

---

## 3. Typography Scale

**Font family:** Inter (loaded via Google Fonts). System fallback stack: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.

Configure in `tailwind.config.js`:

```js
theme: {
  extend: {
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
    },
  },
}
```

### 3.1 Size Scale

| Token | Size | Tailwind Class | Usage |
|-------|------|---------------|-------|
| xs | 12px | `text-xs` | Captions, fine print, badge labels |
| sm | 14px | `text-sm` | Helper text, table cells, secondary UI |
| base | 16px | `text-base` | Body copy, form inputs |
| lg | 18px | `text-lg` | Card titles, section subheadings |
| xl | 20px | `text-xl` | Page section headings |
| 2xl | 24px | `text-2xl` | Card/modal primary headings |
| 3xl | 30px | `text-3xl` | Page headings |
| 4xl | 36px | `text-4xl` | Hero headings, brand wordmark |

### 3.2 Weight Scale

| Token | Weight | Tailwind Class | Usage |
|-------|--------|---------------|-------|
| Regular | 400 | `font-normal` | Body text |
| Medium | 500 | `font-medium` | Labels, nav links, button text (sm/md) |
| Semibold | 600 | `font-semibold` | Card headings, table headers, form labels |
| Bold | 700 | `font-bold` | Page titles, CTAs, brand wordmark |

### 3.3 Line Height Scale

| Token | Value | Tailwind Class | Usage |
|-------|-------|---------------|-------|
| tight | 1.25 | `leading-tight` | Headings, badges |
| normal | 1.5 | `leading-normal` | Body text, inputs |
| relaxed | 1.75 | `leading-relaxed` | Long-form content, descriptions |

### 3.4 Common Text Pairings

| Role | Classes |
|------|---------|
| Page heading | `text-3xl font-bold leading-tight text-gray-900` |
| Section heading | `text-xl font-semibold leading-tight text-gray-900` |
| Card title | `text-lg font-semibold leading-tight text-gray-900` |
| Body | `text-base font-normal leading-normal text-gray-900` |
| Label | `text-sm font-semibold leading-normal text-gray-700` |
| Helper text | `text-sm font-normal leading-normal text-gray-500` |
| Caption | `text-xs font-normal leading-normal text-gray-500` |

---

## 4. Spacing System

Base unit: 4px (Tailwind default). All spacing uses multiples of this unit.

| Token | Value | Tailwind Class | Usage |
|-------|-------|---------------|-------|
| xs | 4px | `p-1` / `gap-1` / `m-1` | Tight internal padding (badge, chip) |
| sm | 8px | `p-2` / `gap-2` / `m-2` | Icon margins, compact list gaps |
| md | 16px | `p-4` / `gap-4` / `m-4` | Default card padding (inner sections), form field gaps |
| lg | 24px | `p-6` / `gap-6` / `m-6` | Card padding (outer), section vertical rhythm |
| xl | 32px | `p-8` / `gap-8` / `m-8` | Page section padding, modal padding |
| 2xl | 48px | `p-12` / `gap-12` / `m-12` | Between page sections |
| 3xl | 64px | `p-16` / `gap-16` / `m-16` | Hero section vertical padding |

---

## 5. Border Radius and Shadow Tokens

### 5.1 Border Radius

| Token | Value | Tailwind Class | Usage |
|-------|-------|---------------|-------|
| none | 0px | `rounded-none` | Table rows, flush elements |
| sm | 2px | `rounded-sm` | Subtle rounding on small badges |
| md | 6px | `rounded-md` | Buttons, inputs, small cards |
| lg | 12px | `rounded-xl` | Standard cards, modals |
| xl | 16px | `rounded-2xl` | Feature cards, hero panels |
| full | 9999px | `rounded-full` | Avatars, pill badges, circular icon buttons |

Note: Tailwind's `rounded-xl` maps to 12px (`0.75rem`) and `rounded-2xl` maps to 16px (`1rem`).

### 5.2 Shadow Tokens

| Token | Tailwind Class | Usage |
|-------|---------------|-------|
| none | `shadow-none` | Flat cards, table rows |
| sm | `shadow-sm` | Subtle lift on inputs, secondary cards |
| md (default card) | `shadow-md` | Standard card elevation |
| lg (elevated) | `shadow-lg` | Modals, elevated cards, sticky headers |
| xl (dropdown) | `shadow-xl` | Dropdowns, tooltips, floating menus |

---

## 6. Component Library

---

### 6A. Button

**Purpose:** The primary interactive element for triggering actions — form submissions, navigation, and destructive operations.

#### Variants and Visual Spec

| Variant | Default Classes | Hover | Active/Pressed | Disabled | Notes |
|---------|----------------|-------|----------------|----------|-------|
| Primary | `bg-indigo-600 text-white border-transparent` | `bg-indigo-700` | `bg-indigo-800` | `bg-indigo-300 cursor-not-allowed` | Filled, high emphasis |
| Secondary | `bg-white text-indigo-600 border border-indigo-600` | `bg-indigo-50 text-indigo-700 border-indigo-700` | `bg-indigo-100` | `text-gray-400 border-gray-200 cursor-not-allowed` | Outlined, medium emphasis |
| Ghost | `bg-transparent text-gray-600 border-transparent` | `bg-gray-100 text-gray-900` | `bg-gray-200` | `text-gray-300 cursor-not-allowed` | Text-only, low emphasis |
| Destructive | `bg-red-600 text-white border-transparent` | `bg-red-700` | `bg-red-800` | `bg-red-300 cursor-not-allowed` | High emphasis, destructive actions |

#### Sizes

| Size | Padding | Font | Min Height |
|------|---------|------|------------|
| sm | `px-3 py-1.5` | `text-sm font-medium` | 32px |
| md (default) | `px-4 py-2` | `text-sm font-medium` | 40px |
| lg | `px-6 py-3` | `text-base font-medium` | 48px |

All buttons share: `rounded-md inline-flex items-center justify-center gap-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2`

Loading state: replace leading icon with a spinner (`animate-spin`) and set `disabled` attribute.

#### JSX Usage Examples

```jsx
{/* Primary — default size */}
<button
  type="submit"
  className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-indigo-700 active:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-300"
>
  Get Started
</button>

{/* Secondary — default size */}
<button
  type="button"
  className="inline-flex items-center justify-center gap-2 rounded-md border border-indigo-600 bg-white px-4 py-2 text-sm font-medium text-indigo-600 transition-colors duration-200 hover:border-indigo-700 hover:bg-indigo-50 hover:text-indigo-700 active:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
>
  View Details
</button>

{/* Ghost — default size */}
<button
  type="button"
  className="inline-flex items-center justify-center gap-2 rounded-md bg-transparent px-4 py-2 text-sm font-medium text-gray-600 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-gray-300"
>
  Cancel
</button>

{/* Destructive — default size */}
<button
  type="button"
  className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-red-700 active:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-300"
>
  Delete Plan
</button>

{/* Primary — loading state */}
<button
  type="submit"
  disabled
  className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-indigo-300"
>
  <svg
    className="h-4 w-4 animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
  Saving...
</button>

{/* Large size */}
<button
  type="button"
  className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-6 py-3 text-base font-medium text-white transition-colors duration-200 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
>
  Join Now
</button>
```

---

### 6B. Input

**Purpose:** Collects text from the user. Covers all standard form input patterns including password and search.

#### Visual Spec

Base wrapper: `flex flex-col gap-1.5`

Label: `text-sm font-semibold text-gray-700`

Input base classes: `w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent`

| State | Additional Classes |
|-------|-------------------|
| Default | `border-gray-300` |
| Focus | `ring-2 ring-indigo-500 border-transparent` (via focus: prefix above) |
| Error | `border-red-400 focus:ring-red-400` |
| Disabled | `bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200` |

Helper/Error text: `text-sm` — gray (`text-gray-500`) for helper, red (`text-red-600`) for errors. Always rendered below the input. Errors include a visible label so color is not the only indicator.

#### Variants

**Text Input** — standard layout described above.

**Password Input** — add a show/hide toggle button (`<button type="button">`) absolutely positioned inside a `relative` wrapper on the right side: `absolute inset-y-0 right-0 flex items-center pr-3`. Toggle icon switches between `EyeIcon` and `EyeSlashIcon` (Heroicons outline).

**Search Input** — add a search icon (`MagnifyingGlassIcon`, Heroicons outline, `h-4 w-4 text-gray-400`) absolutely positioned on the left side. Add `pl-9` to the input to offset text from the icon.

#### JSX Usage Examples

```jsx
{/* Text input — default */}
<div className="flex flex-col gap-1.5">
  <label htmlFor="email" className="text-sm font-semibold text-gray-700">
    Email address
  </label>
  <input
    id="email"
    type="email"
    placeholder="you@example.com"
    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
  />
  <p className="text-sm text-gray-500">We will never share your email.</p>
</div>

{/* Text input — error state */}
<div className="flex flex-col gap-1.5">
  <label htmlFor="email-error" className="text-sm font-semibold text-gray-700">
    Email address
  </label>
  <input
    id="email-error"
    type="email"
    aria-describedby="email-error-msg"
    aria-invalid="true"
    className="w-full rounded-md border border-red-400 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
  />
  <p id="email-error-msg" className="text-sm text-red-600">
    Please enter a valid email address.
  </p>
</div>

{/* Password input with show/hide toggle */}
<div className="flex flex-col gap-1.5">
  <label htmlFor="password" className="text-sm font-semibold text-gray-700">
    Password
  </label>
  <div className="relative">
    <input
      id="password"
      type={showPassword ? 'text' : 'password'}
      placeholder="Enter your password"
      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-400 transition-colors duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus-visible:outline-none"
      aria-label={showPassword ? 'Hide password' : 'Show password'}
    >
      {showPassword ? (
        <EyeSlashIcon className="h-4 w-4" />
      ) : (
        <EyeIcon className="h-4 w-4" />
      )}
    </button>
  </div>
</div>

{/* Search input */}
<div className="relative">
  <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
  <input
    type="search"
    placeholder="Search classes..."
    className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
  />
</div>

{/* Disabled input */}
<div className="flex flex-col gap-1.5">
  <label htmlFor="plan-id" className="text-sm font-semibold text-gray-700">
    Plan ID
  </label>
  <input
    id="plan-id"
    type="text"
    value="plan_abc123"
    disabled
    className="w-full cursor-not-allowed rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-400"
  />
  <p className="text-sm text-gray-500">Auto-generated — cannot be changed.</p>
</div>
```

---

### 6C. Card

**Purpose:** Groups related content into a visually distinct container. Used for membership plans, class summaries, and dashboard metrics.

#### Variants and Visual Spec

| Variant | Classes | Usage |
|---------|---------|-------|
| Default | `rounded-xl bg-white shadow-md` | Standard content cards |
| Flat | `rounded-xl bg-white border border-gray-200 shadow-none` | Tables, list items, secondary content |
| Interactive | `rounded-xl bg-white shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5` | Clickable plan cards, class cards |

Padding: `p-6` for standard cards. Use `px-6 py-5` for compact cards (e.g., dashboard stat tiles).

Card header (when present): `flex items-center justify-between border-b border-gray-100 pb-4 mb-4`

Card footer (when present): `flex items-center justify-end gap-3 border-t border-gray-100 pt-4 mt-4`

#### JSX Usage Examples

```jsx
{/* Default card */}
<div className="rounded-xl bg-white p-6 shadow-md">
  <h3 className="text-lg font-semibold text-gray-900">Monthly Plan</h3>
  <p className="mt-1 text-sm text-gray-500">Access to all standard classes</p>
</div>

{/* Flat card */}
<div className="rounded-xl border border-gray-200 bg-white p-6">
  <h3 className="text-lg font-semibold text-gray-900">Plan Details</h3>
</div>

{/* Interactive card — membership plan */}
<div className="cursor-pointer rounded-xl bg-white p-6 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
  <div className="flex items-start justify-between">
    <div>
      <h3 className="text-lg font-semibold text-gray-900">Premium</h3>
      <p className="mt-1 text-sm text-gray-500">Unlimited classes + personal training</p>
    </div>
    <span className="text-2xl font-bold text-indigo-600">$89</span>
  </div>
  <ul className="mt-4 space-y-1 text-sm text-gray-600">
    <li>Unlimited class bookings</li>
    <li>2 PT sessions per month</li>
  </ul>
  <button className="mt-6 w-full rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700">
    Get Started
  </button>
</div>

{/* Card with header and footer */}
<div className="rounded-xl bg-white shadow-md">
  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
    <h3 className="text-lg font-semibold text-gray-900">Edit Plan</h3>
    <button type="button" className="text-gray-400 hover:text-gray-600">
      <XMarkIcon className="h-5 w-5" />
    </button>
  </div>
  <div className="p-6">
    {/* Card body content */}
  </div>
  <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
    <button className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
    <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Save</button>
  </div>
</div>
```

---

### 6D. Badge / Chip

**Purpose:** Communicates status, category, or a removable selection tag in a compact pill format.

#### Variants

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| Success | `bg-green-50` | `text-green-700` | `border-green-200` | Active membership, confirmed booking |
| Warning | `bg-yellow-50` | `text-yellow-700` | `border-yellow-200` | Expiring soon, pending review |
| Error | `bg-red-50` | `text-red-700` | `border-red-200` | Cancelled, inactive, overdue |
| Info | `bg-blue-50` | `text-blue-700` | `border-blue-200` | Informational labels |
| Neutral | `bg-gray-100` | `text-gray-600` | `border-gray-200` | Default tags, unset status |
| Primary | `bg-indigo-50` | `text-indigo-700` | `border-indigo-200` | Selected filter, active category |

#### Sizes

| Size | Padding | Font |
|------|---------|------|
| sm | `px-2 py-0.5` | `text-xs font-medium` |
| md | `px-2.5 py-1` | `text-sm font-medium` |

Base classes: `inline-flex items-center gap-1 rounded-full border leading-tight`

#### JSX Usage Examples

```jsx
{/* Status badge — Success, sm */}
<span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium leading-tight text-green-700">
  Active
</span>

{/* Status badge — Warning, md */}
<span className="inline-flex items-center gap-1 rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-sm font-medium leading-tight text-yellow-700">
  Expiring Soon
</span>

{/* Status badge — Error, sm */}
<span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium leading-tight text-red-700">
  Cancelled
</span>

{/* Neutral badge */}
<span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-sm font-medium leading-tight text-gray-600">
  Yoga
</span>

{/* Removable chip — Primary */}
<span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-sm font-medium leading-tight text-indigo-700">
  Strength Training
  <button
    type="button"
    onClick={() => removeFilter('strength')}
    className="ml-0.5 rounded-full p-0.5 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
    aria-label="Remove Strength Training filter"
  >
    <XMarkIcon className="h-3 w-3" />
  </button>
</span>
```

---

### 6E. Modal

**Purpose:** Displays focused content or confirmation dialogs that require user attention before continuing.

#### Structure

- **Overlay:** `fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4`
- **Dialog box:** `relative w-full rounded-xl bg-white shadow-lg` with max-width per size
- **Header:** `flex items-center justify-between border-b border-gray-100 px-6 py-5`
- **Body:** `overflow-y-auto px-6 py-6` — scrollable independently of header/footer
- **Footer:** `flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4`

#### Sizes

| Size | Max Width | Tailwind Class | Usage |
|------|-----------|---------------|-------|
| sm | 400px | `max-w-sm` | Confirmation dialogs, alerts |
| md | 560px | `max-w-lg` | Forms, detail views |
| lg | 720px | `max-w-2xl` | Complex forms, data tables in modal |

Close on overlay click and on Escape key. Focus trap inside the dialog when open.

#### JSX Usage Example

```jsx
{/* Modal — md size, open/close state */}
{isOpen && (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
  >
    <div className="relative w-full max-w-lg rounded-xl bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
        <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
          Create Membership Plan
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Close"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Body */}
      <div className="overflow-y-auto px-6 py-6">
        {/* Form fields or content here */}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 transition-colors duration-200 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          Save Plan
        </button>
      </div>
    </div>
  </div>
)}
```

---

### 6F. Table

**Purpose:** Displays tabular data sets (membership plans, bookings, user lists) with sorting, row actions, and an empty state.

#### Structure

- **Wrapper:** `overflow-hidden rounded-xl border border-gray-200 bg-white`
- **Scroll container:** `overflow-x-auto`
- **Table:** `w-full text-sm`
- **thead:** `sticky top-0 bg-gray-50 text-left`
- **th:** `border-b border-gray-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500`
- **tbody tr default:** `border-b border-gray-100 transition-colors duration-100`
- **tbody tr hover:** `hover:bg-gray-50`
- **td:** `px-4 py-3 text-gray-900`
- **Row actions td:** `px-4 py-3 text-right` — Ghost buttons or icon buttons

#### Sort Indicator

Active sorted column header: `text-indigo-600`. Append `ChevronUpIcon` or `ChevronDownIcon` (Heroicons, `h-4 w-4 inline ml-1`) based on sort direction. Unsorted columns show `ChevronUpDownIcon` at low opacity (`opacity-40`).

#### Responsive Behavior

Wrap columns of lower priority in a `<td>` with `hidden sm:table-cell` on the `<th>` and `<td>` pairs. Columns to hide on mobile: secondary metadata (e.g., created date, plan ID).

#### Empty State

When `data.length === 0`, replace `<tbody>` rows with:

```jsx
<tr>
  <td colSpan={columnCount} className="px-4 py-16 text-center">
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        <TableCellsIcon className="h-6 w-6 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-900">No plans found</p>
      <p className="text-sm text-gray-500">Create a membership plan to get started.</p>
    </div>
  </td>
</tr>
```

#### JSX Usage Example

```jsx
<div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-gray-50">
        <tr>
          <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <button
              type="button"
              onClick={() => onSort('name')}
              className="inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Plan Name
              <ChevronUpDownIcon className="h-4 w-4 opacity-40" />
            </button>
          </th>
          <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-indigo-600">
            <button
              type="button"
              onClick={() => onSort('price')}
              className="inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Price
              <ChevronUpIcon className="h-4 w-4" />
            </button>
          </th>
          <th className="hidden border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:table-cell">
            Duration
          </th>
          <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            Status
          </th>
          <th className="border-b border-gray-200 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {plans.map((plan) => (
          <tr key={plan.id} className="border-b border-gray-100 transition-colors duration-100 hover:bg-gray-50 last:border-0">
            <td className="px-4 py-3 font-medium text-gray-900">{plan.name}</td>
            <td className="px-4 py-3 text-gray-900">${plan.price}</td>
            <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">{plan.durationDays} days</td>
            <td className="px-4 py-3">
              <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                Active
              </span>
            </td>
            <td className="px-4 py-3 text-right">
              <button type="button" className="mr-2 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50">
                Edit
              </button>
              <button type="button" className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

---

### 6G. NavBar

**Purpose:** Top-level navigation visible on all authenticated pages for members. Provides access to main sections, notifications, and the user account menu.

#### Structure

- **Root:** `sticky top-0 z-40 border-b border-gray-200 bg-white`
- **Inner container:** `mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8`
- **Left zone:** Logo + wordmark
- **Center zone:** Nav links — hidden on mobile, shown on `sm:flex`
- **Right zone:** Notification bell + avatar dropdown — always visible

#### Left: Logo and Wordmark

```jsx
<a href="/dashboard" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:rounded-md">
  {/* Replace with SVG logo */}
  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
    <span className="text-sm font-bold text-white">G</span>
  </div>
  <span className="text-lg font-bold text-gray-900">GymFlow</span>
</a>
```

#### Center: Nav Links

Active link: adds `text-indigo-600 border-b-2 border-indigo-600` and removes `text-gray-600`. All links: `pb-0.5 text-sm font-medium transition-colors duration-200 hover:text-indigo-600`.

```jsx
<nav className="hidden items-center gap-6 sm:flex">
  {[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Classes', href: '/classes' },
    { label: 'Memberships', href: '/memberships' },
    { label: 'Trainers', href: '/trainers' },
  ].map(({ label, href }) => (
    <a
      key={href}
      href={href}
      className={`pb-0.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:rounded-sm ${
        isActive(href)
          ? 'border-b-2 border-indigo-600 text-indigo-600'
          : 'text-gray-600 hover:text-indigo-600'
      }`}
    >
      {label}
    </a>
  ))}
</nav>
```

#### Right: Notification Bell + Avatar Dropdown

```jsx
<div className="flex items-center gap-3">
  {/* Notification bell */}
  <button
    type="button"
    className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    aria-label="Notifications"
  >
    <BellIcon className="h-5 w-5" />
    {unreadCount > 0 && (
      <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-red-500" />
    )}
  </button>

  {/* Avatar dropdown trigger */}
  <button
    type="button"
    className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 hover:bg-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    aria-label="User menu"
    aria-haspopup="true"
  >
    {userInitials}
  </button>
</div>
```

#### Mobile: Hamburger Menu

On mobile (below `sm` breakpoint), the center nav is hidden. Show a hamburger icon button in the right zone (before the notification bell). Tapping it opens a full-width slide-down drawer with the same nav links in a vertical list.

```jsx
{/* Hamburger button — visible only on mobile */}
<button
  type="button"
  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
  className="sm:hidden rounded-md p-2 text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
  aria-label="Toggle menu"
>
  {mobileMenuOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
</button>

{/* Mobile nav drawer */}
{mobileMenuOpen && (
  <div className="border-t border-gray-200 bg-white sm:hidden">
    <nav className="flex flex-col px-4 py-3 gap-1">
      {navLinks.map(({ label, href }) => (
        <a
          key={href}
          href={href}
          className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
        >
          {label}
        </a>
      ))}
    </nav>
  </div>
)}
```

---

### 6H. Sidebar

**Purpose:** Primary navigation for the admin dashboard. Provides persistent access to all admin sections.

#### Structure

- **Root:** `flex h-screen flex-col bg-gray-900 transition-all duration-300`
- **Expanded width:** `w-60` (240px)
- **Collapsed width:** `w-16` (64px — icon only)
- **Toggle button:** At the bottom of the sidebar; uses `ChevronLeftIcon` / `ChevronRightIcon`

#### Nav Item States

| State | Classes |
|-------|---------|
| Default | `text-gray-400 hover:bg-gray-800 hover:text-white` |
| Active | `border-l-2 border-indigo-500 bg-gray-800 text-white` |

All items: `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`

In collapsed state: hide label text with `overflow-hidden whitespace-nowrap` and reduce padding. Use `title` attribute on each item for a native tooltip.

#### JSX Usage Example

```jsx
<aside
  className={`flex h-screen flex-col bg-gray-900 transition-all duration-300 ${
    isCollapsed ? 'w-16' : 'w-60'
  }`}
>
  {/* Logo */}
  <div className="flex h-16 items-center border-b border-gray-800 px-3">
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600">
      <span className="text-sm font-bold text-white">G</span>
    </div>
    {!isCollapsed && (
      <span className="ml-3 text-base font-bold text-white">GymFlow</span>
    )}
  </div>

  {/* Nav items */}
  <nav className="flex-1 overflow-y-auto px-2 py-4">
    <ul className="space-y-1">
      {sidebarLinks.map(({ label, href, icon: Icon }) => (
        <li key={href}>
          <a
            href={href}
            title={isCollapsed ? label : undefined}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isActive(href)
                ? 'border-l-2 border-indigo-500 bg-gray-800 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>{label}</span>}
          </a>
        </li>
      ))}
    </ul>
  </nav>

  {/* User info + logout */}
  <div className="border-t border-gray-800 px-2 py-4 space-y-1">
    {!isCollapsed && (
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
          {userInitials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{userName}</p>
          <p className="truncate text-xs text-gray-400">{userEmail}</p>
        </div>
      </div>
    )}
    <button
      type="button"
      onClick={onLogout}
      title={isCollapsed ? 'Log out' : undefined}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors duration-200 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
      {!isCollapsed && <span>Log out</span>}
    </button>

    {/* Collapse toggle */}
    <button
      type="button"
      onClick={() => setIsCollapsed(!isCollapsed)}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors duration-200 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {isCollapsed ? (
        <ChevronRightIcon className="h-5 w-5 flex-shrink-0" />
      ) : (
        <>
          <ChevronLeftIcon className="h-5 w-5 flex-shrink-0" />
          <span>Collapse</span>
        </>
      )}
    </button>
  </div>
</aside>
```

---

## 7. Icon System

**Library:** Heroicons v2 (`@heroicons/react`). Install via:

```bash
npm install @heroicons/react
```

**Import pattern:**

```jsx
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid'
```

**Style rules:**

| Context | Style | Size Classes |
|---------|-------|-------------|
| Nav links and sidebar (default) | Outline | `h-5 w-5` |
| Nav links and sidebar (active state) | Solid | `h-5 w-5` |
| Button icons (all sizes) | Outline | `h-4 w-4` |
| Empty state illustrations | Outline | `h-6 w-6` or `h-8 w-8` |
| Notification badges | Outline | `h-5 w-5` |

**Accessibility rule:** Always pair icons with either a visible text label or an `aria-label` on the parent button. Never use an icon alone without labeling context for screen readers.

---

## 8. Motion and Animation

Keep motion purposeful. Every animation communicates state change — not decoration.

### Duration Tokens

| Token | Value | Tailwind Class | Usage |
|-------|-------|---------------|-------|
| fast | 100ms | `duration-100` | Hover color changes, button active state |
| normal | 200ms | `duration-200` | Transitions between states, card hover, focus rings |
| slow | 300ms | `duration-300` | Sidebar collapse, modal enter/exit, drawer slide |

### Easing

| Context | Easing | Tailwind Class |
|---------|--------|---------------|
| Enter / grow / appear | ease-out | `ease-out` |
| Exit / shrink / disappear | ease-in | `ease-in` |
| State change (hover) | ease-in-out | `ease-in-out` |

### Common Patterns

| Pattern | Tailwind Classes |
|---------|-----------------|
| Button hover color | `transition-colors duration-200 ease-in-out` |
| Card hover lift | `transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg` |
| Sidebar collapse | `transition-all duration-300 ease-in-out` |
| Modal overlay fade | `transition-opacity duration-200 ease-out` |
| Input focus ring | `transition-colors duration-200` (ring appears via `focus:ring-2`) |

### Reduced Motion

Always respect `prefers-reduced-motion`. Wrap motion utilities in a guard where possible:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

Add this block to `src/index.css`.

---

## 9. Accessibility Baseline

These rules apply to every component in GymFlow. They are non-negotiable.

### Color Contrast

- Body text on white (`text-gray-900` on `bg-white`): 16.1:1 — passes AAA
- Muted text on white (`text-gray-500` on `bg-white`): 7.0:1 — passes AA
- Primary button text (`text-white` on `bg-indigo-600`): 5.9:1 — passes AA
- Link text (`text-indigo-600` on `bg-white`): 5.9:1 — passes AA
- Error text (`text-red-700` on `bg-red-50`): 6.9:1 — passes AA
- Warning text (`text-yellow-700` on `bg-yellow-50`): 5.5:1 — passes AA
- All UI component contrast (borders, icons): minimum 3:1 against adjacent background

### Focus Rings

All interactive elements must have a visible focus indicator. Standard pattern:

```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
```

Use `focus-visible:` (not `focus:`) to show rings only for keyboard navigation, not on mouse click.

### Touch Targets

All interactive elements must be at least 44x44px. For icon buttons that are visually smaller, extend the clickable area with padding:

```jsx
<button className="p-2">  {/* adds 8px padding, making a 20px icon into a 36px target — use p-3 for 44px */}
  <XMarkIcon className="h-5 w-5" />
</button>
```

For 44px minimum: icon buttons use `p-2.5` with `h-5 w-5` icon (20 + 20 = 40px), or `p-3` with `h-5 w-5` (24 + 20 = 44px).

### Semantic HTML

- Use `<button>` for actions, `<a>` for navigation
- Form inputs always paired with a `<label>` via `htmlFor` / `id`
- Error messages linked to inputs via `aria-describedby` and `aria-invalid="true"`
- Modals use `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- Tables use `<thead>`, `<tbody>`, `<th scope="col">` for data tables
- Navigation landmarks: `<nav>`, `<main>`, `<aside>` — one `<main>` per page

### Screen Reader Support

- Icon-only buttons have `aria-label`
- Loading states use `aria-busy="true"` on the containing element
- Status badges that convey meaning not shown in text use `aria-label`
- Dynamic content updates use `aria-live="polite"` (errors, success messages)
