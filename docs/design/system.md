# GymFlow Design System

> Living document. All UI/UX design specs for GymFlow reference this file.
> Last updated: 2026-03-21

---

## 1. Design Principles

**Clear over clever.** Every element earns its place on screen. Labels, icons, and copy communicate purpose without ambiguity. Cleverness that creates confusion gets cut.

**Progress feels earned.** Motion and visual weight drive the user forward. Active states, transitions, and feedback reward interaction without noise. Every pixel of feedback justifies itself.

**Accessible by default.** Contrast, focus rings, and touch targets are non-negotiable. Every design decision passes AA contrast before it ships — dark surfaces demand extra vigilance.

**Consistency scales.** Spacing, color, and component patterns are fixed tokens. One-off values create debt. When a new pattern is needed, it is added to this document and applied everywhere.

---

## 2. Color Palette

The palette is dark-first — near-black surfaces, electric green primary, orange accent. Think gym-floor energy: intense, focused, motivating. Status colors are adapted for dark backgrounds so tints never muddy the surface.

### 2.1 Brand Colors

| Token | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| Primary | `bg-green-500` / `text-green-500` | `#22C55E` | CTAs, active states, links, primary buttons |
| Primary Dark | `bg-green-600` | `#16A34A` | Button hover/pressed |
| Primary Light | `bg-green-500/10` | rgba(34,197,94,0.10) | Subtle tints, active sidebar background |
| Accent | `bg-orange-500` / `text-orange-500` | `#F97316` | Highlights, badges, secondary accents |
| Accent Light | `bg-orange-500/10` | rgba(249,115,22,0.10) | Accent badge backgrounds |

### 2.2 Surface Colors

| Token | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| Page Background | `bg-[#0F0F0F]` | `#0F0F0F` | Root page background |
| Surface 1 | `bg-gray-900` | `#111827` | Cards, modals, input backgrounds |
| Surface 2 | `bg-gray-800` | `#1F2937` | Elevated cards, dropdowns, sidebar active |
| Surface 3 | `bg-gray-700` | `#374151` | Hover states on cards |
| Sidebar Background | `bg-[#0F0F0F]` | `#0F0F0F` | Same as page bg — sidebar blends into page |

### 2.3 Border Colors

| Token | Value | Usage |
|-------|-------|-------|
| Border Card | `border-gray-800` `#1F2937` | Default card, modal, and panel borders |
| Border Input | `border-gray-700` `#374151` | Default input and select borders |
| Border Strong | `border-gray-600` `#4B5563` | Dividers, table headers |
| Border Focus | `ring-green-500` `#22C55E` | Focus ring on inputs and buttons |

Note: `border-gray-700` is correct for form inputs (see §6B). `border-gray-800` is correct for cards and modal surfaces (see §6C, §6E). Always use the appropriate token for the element type — do not use `border-gray-700` on cards or `border-gray-800` on inputs.

### 2.4 Text Colors

| Token | Value | Usage |
|-------|-------|-------|
| Text Default | `text-white` `#FFFFFF` | Body text, headings |
| Text Muted | `text-gray-400` `#9CA3AF` | Helper text, secondary labels |
| Text Subtle | `text-gray-600` `#4B5563` | Disabled text, metadata |
| Text Inverse | `text-gray-900` `#111827` | Text on light/primary backgrounds |
| Text Link | `text-green-400` `#4ADE80` | Hyperlinks (lighter green for dark bg contrast) |
| Text Link Hover | `text-green-300` `#86EFAC` | Hyperlink hover |

### 2.5 Status Colors

Each status color has three parts: a background tint, a text color, and a border color — all adapted for dark surfaces.

| Status | Background | Text | Border |
|--------|-----------|------|--------|
| Success | `bg-green-500/10` | `text-green-400` | `border-green-500/30` |
| Warning | `bg-orange-500/10` | `text-orange-400` | `border-orange-500/30` |
| Error | `bg-red-500/10` | `text-red-400` | `border-red-500/30` |
| Info | `bg-blue-500/10` | `text-blue-400` | `border-blue-500/30` |

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

Dark-surface defaults. All text renders on `bg-gray-900` (`#111827`) or `bg-[#0F0F0F]` unless otherwise noted.

| Role | Classes |
|------|---------|
| Page heading | `text-3xl font-bold leading-tight text-white` |
| Section heading | `text-xl font-semibold leading-tight text-white` |
| Card title | `text-lg font-semibold leading-tight text-white` |
| Body | `text-base font-normal leading-normal text-white` |
| Label | `text-sm font-semibold leading-normal text-gray-300` |
| Helper text | `text-sm font-normal leading-normal text-gray-400` |
| Caption | `text-xs font-normal leading-normal text-gray-400` |

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

Shadows use black bases to remain visible against dark surfaces.

| Token | Tailwind Class | Usage |
|-------|---------------|-------|
| none | `shadow-none` | Flat cards, table rows |
| sm | `shadow-sm shadow-black/50` | Subtle lift on inputs, secondary cards |
| md (default card) | `shadow-md shadow-black/50` | Standard card elevation |
| lg (elevated) | `shadow-lg shadow-black/50` | Modals, elevated cards, sticky headers |
| xl (dropdown) | `shadow-xl shadow-black/50` | Dropdowns, tooltips, floating menus |
| glow (primary) | `shadow-green-500/20` | Primary buttons (hover), active elements |

Glow usage: apply `hover:shadow-lg hover:shadow-green-500/25` to primary buttons and key interactive elements to create an electric edge on hover.

---

## 6. Component Library

---

### 6A. Button

**Purpose:** The primary interactive element for triggering actions — form submissions, navigation, and destructive operations.

#### Variants and Visual Spec

| Variant | Default Classes | Hover | Active/Pressed | Disabled | Notes |
|---------|----------------|-------|----------------|----------|-------|
| Primary | `bg-green-500 text-white border-transparent` | `bg-green-600 shadow-lg shadow-green-500/25` | `bg-green-700` | `bg-green-500/40 cursor-not-allowed` | Filled, high emphasis, glow on hover |
| Secondary | `border border-green-500 text-green-400 bg-transparent` | `bg-green-500/10 text-green-300` | `bg-green-500/20` | `border-gray-700 text-gray-600 cursor-not-allowed` | Outlined, medium emphasis |
| Ghost | `bg-transparent text-gray-400 border-transparent` | `bg-gray-800 text-white` | `bg-gray-700` | `text-gray-700 cursor-not-allowed` | Text-only, low emphasis |
| Destructive | `bg-red-600 text-white border-transparent` | `bg-red-700` | `bg-red-800` | `bg-red-600/40 cursor-not-allowed` | High emphasis, destructive actions |

#### Sizes

| Size | Padding | Font | Min Height |
|------|---------|------|------------|
| sm | `px-3 py-1.5` | `text-sm font-medium` | 32px |
| md (default) | `px-4 py-2` | `text-sm font-medium` | 40px |
| lg | `px-6 py-3` | `text-base font-medium` | 48px |

All buttons share: `rounded-md inline-flex items-center justify-center gap-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900`

Loading state: replace leading icon with a spinner (`animate-spin`) and set `disabled` attribute. Spinner is white on primary, green (`text-green-400`) on secondary.

#### JSX Usage Examples

```jsx
{/* Primary — default size */}
<button
  type="submit"
  className="inline-flex items-center justify-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 active:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:bg-green-500/40"
>
  Get Started
</button>

{/* Secondary — default size */}
<button
  type="button"
  className="inline-flex items-center justify-center gap-2 rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 hover:text-green-300 active:bg-green-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-600"
>
  View Details
</button>

{/* Ghost — default size */}
<button
  type="button"
  className="inline-flex items-center justify-center gap-2 rounded-md bg-transparent px-4 py-2 text-sm font-medium text-gray-400 transition-all duration-200 hover:bg-gray-800 hover:text-white active:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:text-gray-700"
>
  Cancel
</button>

{/* Destructive — default size */}
<button
  type="button"
  className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-red-700 active:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:bg-red-600/40"
>
  Delete Plan
</button>

{/* Primary — loading state */}
<button
  type="submit"
  disabled
  className="inline-flex items-center justify-center gap-2 rounded-md bg-green-500/40 px-4 py-2 text-sm font-medium text-white transition-all duration-200 cursor-not-allowed"
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
  className="inline-flex items-center justify-center gap-2 rounded-md bg-green-500 px-6 py-3 text-base font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
>
  Join Now
</button>
```

---

### 6B. Input

**Purpose:** Collects text from the user. Covers all standard form input patterns including password and search.

#### Visual Spec

Base wrapper: `flex flex-col gap-1.5`

Label: `text-sm font-medium text-gray-300`

Input base classes: `w-full rounded-md border bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-transparent`

| State | Additional Classes |
|-------|-------------------|
| Default | `border-gray-700` |
| Focus | `ring-2 ring-green-500 border-transparent` (via focus-visible: prefix above) |
| Error | `border-red-500/60 focus-visible:ring-red-500` |
| Disabled | `bg-gray-800 text-gray-600 cursor-not-allowed border-gray-700 opacity-60` |

Helper/Error text: `text-sm` — gray-400 (`text-gray-400`) for helper, red-400 (`text-red-400`) for errors, rendered below the input. Errors include a visible label so color is not the only indicator.

#### Variants

**Text Input** — standard layout described above.

**Password Input** — add a show/hide toggle button (`<button type="button">`) absolutely positioned inside a `relative` wrapper on the right side: `absolute inset-y-0 right-0 flex items-center pr-3`. Toggle icon switches between `EyeIcon` and `EyeSlashIcon` (Heroicons outline). Icon color: `text-gray-500 hover:text-gray-300`.

**Search Input** — add a search icon (`MagnifyingGlassIcon`, Heroicons outline, `h-4 w-4 text-gray-500`) absolutely positioned on the left side. Add `pl-9` to the input to offset text from the icon.

#### JSX Usage Examples

```jsx
{/* Text input — default */}
<div className="flex flex-col gap-1.5">
  <label htmlFor="email" className="text-sm font-medium text-gray-300">
    Email address
  </label>
  <input
    id="email"
    type="email"
    placeholder="you@example.com"
    className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:outline-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-green-500"
  />
  <p className="text-sm text-gray-400">We will never share your email.</p>
</div>

{/* Text input — error state */}
<div className="flex flex-col gap-1.5">
  <label htmlFor="email-error" className="text-sm font-medium text-gray-300">
    Email address
  </label>
  <input
    id="email-error"
    type="email"
    aria-describedby="email-error-msg"
    aria-invalid="true"
    className="w-full rounded-md border border-red-500/60 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
  />
  <p id="email-error-msg" className="text-xs text-red-400">
    Please enter a valid email address.
  </p>
</div>

{/* Password input with show/hide toggle */}
<div className="flex flex-col gap-1.5">
  <label htmlFor="password" className="text-sm font-medium text-gray-300">
    Password
  </label>
  <div className="relative">
    <input
      id="password"
      type={showPassword ? 'text' : 'password'}
      placeholder="Enter your password"
      className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 pr-10 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:outline-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-green-500"
    />
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 focus-visible:outline-none"
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
  <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
  <input
    type="search"
    placeholder="Search classes..."
    className="w-full rounded-md border border-gray-700 bg-gray-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:outline-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-green-500"
  />
</div>

{/* Disabled input */}
<div className="flex flex-col gap-1.5">
  <label htmlFor="plan-id" className="text-sm font-medium text-gray-300">
    Plan ID
  </label>
  <input
    id="plan-id"
    type="text"
    value="plan_abc123"
    disabled
    className="w-full cursor-not-allowed rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-600 opacity-60"
  />
  <p className="text-sm text-gray-400">Auto-generated — cannot be changed.</p>
</div>
```

---

### 6C. Card

**Purpose:** Groups related content into a visually distinct container. Used for membership plans, class summaries, and dashboard metrics.

#### Variants and Visual Spec

| Variant | Classes | Usage |
|---------|---------|-------|
| Default | `rounded-xl bg-gray-900 border border-gray-800 shadow-md shadow-black/50` | Standard content cards |
| Flat | `rounded-xl bg-gray-900 border border-gray-700` | Tables, list items, secondary content |
| Interactive | `rounded-xl bg-gray-900 border border-gray-800 cursor-pointer transition-all duration-200 hover:border-gray-600 hover:bg-gray-800` | Clickable plan cards, class cards |

Padding: `p-6` for standard cards. Use `px-6 py-5` for compact cards (e.g., dashboard stat tiles).

Card header (when present): `flex items-center justify-between border-b border-gray-800 pb-4 mb-4`

Card footer (when present): `flex items-center justify-end gap-3 border-t border-gray-800 pt-4 mt-4`

#### JSX Usage Examples

```jsx
{/* Default card */}
<div className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-md shadow-black/50">
  <h3 className="text-lg font-semibold text-white">Monthly Plan</h3>
  <p className="mt-1 text-sm text-gray-400">Access to all standard classes</p>
</div>

{/* Flat card */}
<div className="rounded-xl border border-gray-700 bg-gray-900 p-6">
  <h3 className="text-lg font-semibold text-white">Plan Details</h3>
</div>

{/* Interactive card — membership plan */}
<div className="cursor-pointer rounded-xl border border-gray-800 bg-gray-900 p-6 transition-all duration-200 hover:border-gray-600 hover:bg-gray-800">
  <div className="flex items-start justify-between">
    <div>
      <h3 className="text-lg font-semibold text-white">Premium</h3>
      <p className="mt-1 text-sm text-gray-400">Unlimited classes + personal training</p>
    </div>
    <span className="text-2xl font-bold text-green-400">$89</span>
  </div>
  <ul className="mt-4 space-y-1 text-sm text-gray-400">
    <li>Unlimited class bookings</li>
    <li>2 PT sessions per month</li>
  </ul>
  <button className="mt-6 w-full rounded-md bg-green-500 py-2 text-sm font-medium text-white hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 transition-all duration-200">
    Get Started
  </button>
</div>

{/* Card with header and footer */}
<div className="rounded-xl border border-gray-800 bg-gray-900 shadow-md shadow-black/50">
  <div className="flex items-center justify-between border-b border-gray-800 px-6 py-5">
    <h3 className="text-lg font-semibold text-white">Edit Plan</h3>
    <button type="button" className="text-gray-500 hover:text-gray-300">
      <XMarkIcon className="h-5 w-5" />
    </button>
  </div>
  <div className="p-6">
    {/* Card body content */}
  </div>
  <div className="flex items-center justify-end gap-3 border-t border-gray-800 px-6 py-4">
    <button className="rounded-md px-4 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors duration-200">Cancel</button>
    <button className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 transition-all duration-200">Save</button>
  </div>
</div>
```

---

### 6D. Badge / Chip

**Purpose:** Communicates status, category, or a removable selection tag in a compact pill format.

#### Variants

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| Success | `bg-green-500/10` | `text-green-400` | `border-green-500/30` | Active membership, confirmed booking |
| Warning | `bg-orange-500/10` | `text-orange-400` | `border-orange-500/30` | Expiring soon, pending review |
| Error | `bg-red-500/10` | `text-red-400` | `border-red-500/30` | Cancelled, inactive, overdue |
| Info | `bg-blue-500/10` | `text-blue-400` | `border-blue-500/30` | Informational labels |
| Neutral | `bg-gray-800` | `text-gray-400` | `border-gray-700` | Default tags, unset status |
| Primary | `bg-green-500/10` | `text-green-400` | `border-green-500/30` | Selected filter, active category |

#### Sizes

| Size | Padding | Font |
|------|---------|------|
| sm | `px-2 py-0.5` | `text-xs font-medium` |
| md | `px-2.5 py-1` | `text-sm font-medium` |

Base classes: `inline-flex items-center gap-1 rounded-full border leading-tight`

#### JSX Usage Examples

```jsx
{/* Status badge — Success, sm */}
<span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-medium leading-tight text-green-400">
  Active
</span>

{/* Status badge — Warning, md */}
<span className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-sm font-medium leading-tight text-orange-400">
  Expiring Soon
</span>

{/* Status badge — Error, sm */}
<span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium leading-tight text-red-400">
  Cancelled
</span>

{/* Neutral badge */}
<span className="inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-800 px-2.5 py-1 text-sm font-medium leading-tight text-gray-400">
  Yoga
</span>

{/* Removable chip — Primary */}
<span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-sm font-medium leading-tight text-green-400">
  Strength Training
  <button
    type="button"
    onClick={() => removeFilter('strength')}
    className="ml-0.5 rounded-full p-0.5 hover:bg-green-500/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500"
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

- **Overlay:** `fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4`
- **Dialog box:** `relative w-full rounded-2xl bg-gray-900 border border-gray-800 shadow-xl shadow-black/50` with max-width per size
- **Header:** `flex items-center justify-between border-b border-gray-800 px-6 py-5`
- **Body:** `overflow-y-auto px-6 py-6` — scrollable independently of header/footer
- **Footer:** `flex items-center justify-end gap-3 border-t border-gray-800 px-6 py-4`

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
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
    onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
  >
    <div className="relative w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 shadow-xl shadow-black/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-6 py-5">
        <h2 id="modal-title" className="text-xl font-semibold text-white">
          Create Membership Plan
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
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
      <div className="flex items-center justify-end gap-3 border-t border-gray-800 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-400 transition-colors duration-200 hover:bg-gray-800 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
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

- **Wrapper:** `overflow-hidden rounded-xl border border-gray-800 bg-[#0F0F0F]`
- **Scroll container:** `overflow-x-auto`
- **Table:** `w-full text-sm`
- **thead:** `sticky top-0 bg-gray-900 text-left`
- **th:** `border-b border-gray-800 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400`
- **tbody tr default:** `border-t border-gray-800 text-white transition-colors duration-100`
- **tbody tr hover:** `hover:bg-gray-900`
- **td:** `px-4 py-3 text-white`
- **Row actions td:** `px-4 py-3 text-right` — Ghost buttons or icon buttons

#### Sort Indicator

Active sorted column header: `text-green-400`. Append `ChevronUpIcon` or `ChevronDownIcon` (Heroicons, `h-4 w-4 inline ml-1`) based on sort direction. Unsorted columns show `ChevronUpDownIcon` at low opacity (`opacity-40`).

#### Responsive Behavior

Wrap columns of lower priority in a `<td>` with `hidden sm:table-cell` on the `<th>` and `<td>` pairs. Columns to hide on mobile: secondary metadata (e.g., created date, plan ID).

#### Empty State

When `data.length === 0`, replace `<tbody>` rows with:

```jsx
<tr>
  <td colSpan={columnCount} className="px-4 py-16 text-center">
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800">
        <TableCellsIcon className="h-6 w-6 text-gray-500" />
      </div>
      <p className="text-sm font-medium text-white">No plans found</p>
      <p className="text-sm text-gray-500">Create a membership plan to get started.</p>
    </div>
  </td>
</tr>
```

#### JSX Usage Example

```jsx
<div className="overflow-hidden rounded-xl border border-gray-800 bg-[#0F0F0F]">
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-gray-900">
        <tr>
          <th className="border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
            <button
              type="button"
              onClick={() => onSort('name')}
              className="inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              Plan Name
              <ChevronUpDownIcon className="h-4 w-4 opacity-40" />
            </button>
          </th>
          <th className="border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-green-400">
            <button
              type="button"
              onClick={() => onSort('price')}
              className="inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              Price
              <ChevronUpIcon className="h-4 w-4" />
            </button>
          </th>
          <th className="hidden border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 sm:table-cell">
            Duration
          </th>
          <th className="border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
            Status
          </th>
          <th className="border-b border-gray-800 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {plans.map((plan) => (
          <tr key={plan.id} className="border-t border-gray-800 transition-colors duration-100 hover:bg-gray-900 last:border-0">
            <td className="px-4 py-3 font-medium text-white">{plan.name}</td>
            <td className="px-4 py-3 text-white">${plan.price}</td>
            <td className="hidden px-4 py-3 text-gray-400 sm:table-cell">{plan.durationDays} days</td>
            <td className="px-4 py-3">
              <span className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                Active
              </span>
            </td>
            <td className="px-4 py-3 text-right">
              <button type="button" className="mr-2 rounded-md px-2 py-1 text-xs font-medium text-green-400 hover:bg-green-500/10 transition-colors duration-150">
                Edit
              </button>
              <button type="button" className="rounded-md px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors duration-150">
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

- **Root:** `sticky top-0 z-40 bg-gray-900/80 backdrop-blur-md border-b border-gray-800`
- **Inner container:** `mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8`
- **Left zone:** Logo mark + wordmark
- **Center zone:** Nav links — hidden on mobile, shown on `sm:flex`
- **Right zone:** Notification bell + avatar dropdown — always visible

#### Left: Logo Mark and Wordmark

The GymFlow logo mark is a lightning bolt in a rounded square container.

```jsx
<a href="/dashboard" className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:rounded-md">
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
  <span className="text-lg font-bold text-white">GymFlow</span>
</a>
```

#### Center: Nav Links

Active link: adds `text-green-400 border-b-2 border-green-500` and removes `text-gray-400`. All links: `pb-0.5 text-sm font-medium transition-colors duration-200 hover:text-white`.

```jsx
<nav className="hidden items-center gap-6 sm:flex">
  {[
    { label: 'Home', href: '/home' },
    { label: 'Schedule', href: '/schedule' },
    { label: 'Trainers', href: '/trainers' },
    { label: 'My Favorites', href: '/trainers/favorites' },
    { label: 'Profile', href: '/profile' },
  ].map(({ label, href }) => (
    <a
      key={href}
      href={href}
      className={`pb-0.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:rounded-sm ${
        isActive(href)
          ? 'border-b-2 border-green-500 text-green-400'
          : 'text-gray-400 hover:text-white'
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
    className="relative rounded-full p-2 text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
    aria-label="Notifications"
  >
    <BellIcon className="h-5 w-5" />
    {unreadCount > 0 && (
      <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-orange-500" />
    )}
  </button>

  {/* Avatar dropdown trigger */}
  <button
    type="button"
    className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-sm font-semibold text-white ring-2 ring-green-500/50 hover:ring-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition-all duration-200"
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
  className="sm:hidden rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
  aria-label="Toggle menu"
>
  {mobileMenuOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
</button>

{/* Mobile nav drawer */}
{mobileMenuOpen && (
  <div className="border-t border-gray-800 bg-gray-900 sm:hidden">
    <nav className="flex flex-col px-4 py-3 gap-1">
      {navLinks.map(({ label, href }) => (
        <a
          key={href}
          href={href}
          className="rounded-md px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors duration-150"
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

- **Root:** `flex h-screen flex-col bg-[#0F0F0F] border-r border-gray-800 transition-all duration-300`
- **Expanded width:** `w-60` (240px)
- **Collapsed width:** `w-16` (64px — icon only)
- **Toggle button:** At the bottom of the sidebar; uses `ChevronLeftIcon` / `ChevronRightIcon`

#### Nav Item States

| State | Classes |
|-------|---------|
| Default | `text-gray-400 hover:text-white hover:bg-gray-900` |
| Active | `bg-green-500/10 border-l-2 border-green-500 text-green-400` |

All items: `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500`

In collapsed state: hide label text with `overflow-hidden whitespace-nowrap` and reduce padding. Use `title` attribute on each item for a native tooltip.

#### JSX Usage Example

```jsx
<aside
  className={`flex h-screen flex-col bg-[#0F0F0F] border-r border-gray-800 transition-all duration-300 ${
    isCollapsed ? 'w-16' : 'w-60'
  }`}
>
  {/* Logo */}
  <div className="flex h-16 items-center border-b border-gray-800 px-3">
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-500">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M13 2L4.5 13.5H11L9 22L19.5 9.5H13.5L16 2Z" fill="white" />
      </svg>
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
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
              isActive(href)
                ? 'border-l-2 border-green-500 bg-green-500/10 text-green-400'
                : 'text-gray-400 hover:bg-gray-900 hover:text-white'
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
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20 text-xs font-bold text-green-400 ring-2 ring-green-500/30">
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
      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors duration-200 hover:bg-gray-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
    >
      <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
      {!isCollapsed && <span>Log out</span>}
    </button>

    {/* Collapse toggle */}
    <button
      type="button"
      onClick={() => setIsCollapsed(!isCollapsed)}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors duration-200 hover:bg-gray-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
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
| Button hover color + glow | `transition-all duration-200 ease-in-out hover:shadow-lg hover:shadow-green-500/25` |
| Card hover | `transition-all duration-200 ease-out hover:border-gray-600 hover:bg-gray-800` |
| Sidebar collapse | `transition-all duration-300 ease-in-out` |
| Modal overlay fade | `transition-opacity duration-200 ease-out` |
| Input focus ring | `transition-colors duration-200` (ring appears via `focus-visible:ring-2`) |

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

Dark-surface contrast ratios:

- White text on `#0F0F0F` (`text-white` on `bg-[#0F0F0F]`): 21:1 — passes AAA
- White text on `#111827` (`text-white` on `bg-gray-900`): ~17:1 — passes AAA
- `text-green-400` (`#4ADE80`) on `bg-gray-900` (`#111827`): ~7.5:1 — passes AA
- `text-gray-400` (`#9CA3AF`) on `bg-gray-900` (`#111827`): ~5.5:1 — passes AA
- White text on `bg-green-500` (`#22C55E`) for primary buttons: ~5.1:1 — passes AA
- `text-orange-400` (`#FB923C`) on `bg-gray-900` (`#111827`): ~4.6:1 — passes AA
- `text-red-400` (`#F87171`) on `bg-gray-900` (`#111827`): ~4.8:1 — passes AA
- All UI component contrast (borders, icons): minimum 3:1 against adjacent background

### Focus Rings

All interactive elements must have a visible focus indicator. Standard pattern for dark surfaces:

```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
```

Use `focus-visible:` (not `focus:`) to show rings only for keyboard navigation, not on mouse click. The `ring-offset-gray-900` ensures the ring is visible against dark card backgrounds.

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
- The logo mark SVG carries `aria-hidden="true"` — the adjacent wordmark text provides the accessible label

---

### 6I. TagInput

**Purpose:** Converts free-text entries into removable chip tags. Used for the Specialisations field on trainer profiles and any other multi-value free-text input.

#### Visual Spec

- Wrapper: `flex flex-col gap-1.5`
- Tag container + input row: `flex flex-wrap gap-1.5 rounded-md border border-gray-700 bg-gray-900 px-3 py-2 min-h-[42px] cursor-text focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent transition-colors duration-200`
- Each tag chip: Neutral badge md with `XMarkIcon h-3 w-3` remove button (see 6D Badge/Chip)
- Text input inside container: `flex-1 min-w-[120px] bg-transparent text-sm text-white placeholder:text-gray-500 outline-none`
- Max-reached state: input replaced by `text-xs text-gray-500 italic self-center` — "Maximum reached"
- Error state: container border changes to `border-red-500/60`; error text `text-xs text-red-400` below

#### Interaction

- Pressing Enter or typing a comma commits the current value as a new chip
- Pressing Backspace with an empty input removes the last chip
- When `max` prop is reached the text input is hidden

#### Props

`value: string[]`, `onChange: (tags: string[]) => void`, `max?: number` (default uncapped), `maxLength?: number`, `placeholder?: string`

#### JSX Usage Example

```jsx
<div className="flex flex-col gap-1.5">
  <label htmlFor="specialisations" className="text-sm font-medium text-gray-300">
    Specialisations
  </label>
  <div className="flex flex-wrap gap-1.5 rounded-md border border-gray-700 bg-gray-900 px-3 py-2 min-h-[42px] cursor-text focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent transition-colors duration-200">
    {tags.map((tag) => (
      <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-800 px-2.5 py-1 text-sm font-medium leading-tight text-gray-400">
        {tag}
        <button
          type="button"
          onClick={() => removeTag(tag)}
          className="ml-0.5 rounded-full p-0.5 hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500"
          aria-label={`Remove ${tag}`}
        >
          <XMarkIcon className="h-3 w-3" />
        </button>
      </span>
    ))}
    {tags.length < max && (
      <input
        id="specialisations"
        type="text"
        placeholder="Add specialisation..."
        className="flex-1 min-w-[120px] bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
        onKeyDown={handleKeyDown}
      />
    )}
    {tags.length >= max && (
      <span className="text-xs text-gray-500 italic self-center">Maximum reached</span>
    )}
  </div>
  <p className="text-xs text-gray-400">Press Enter or comma to add. Max {max} tags.</p>
</div>
```

---

### 6J. Slide-over Panel

**Purpose:** A right-anchored overlay panel for focused editing tasks that does not fully block the underlying content (lighter overlay than a modal). Used for class instance editing in the Scheduler.

#### Structure

- Backdrop: `fixed inset-0 z-30 bg-black/30` — lighter than modal overlay (`bg-black/70`)
- Panel: `fixed inset-y-0 right-0 z-30 flex flex-col bg-gray-900 border-l border-gray-800 shadow-xl shadow-black/50`
- Standard width: `w-[400px]`; use `w-[520px]` for complex multi-section panels
- Header: `flex items-center justify-between border-b border-gray-800 px-6 py-5 flex-shrink-0`
- Body: `flex-1 overflow-y-auto px-6 py-6`
- Footer: `flex items-center border-t border-gray-800 px-6 py-4 flex-shrink-0`

#### Animation

Entry: `transform translate-x-full` → `translate-x-0`, `transition-transform duration-300 ease-out`
Exit: `translate-x-0` → `translate-x-full`, `transition-transform duration-200 ease-in`

#### Accessibility

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to panel title
- Focus trap inside the panel when open
- Escape key closes the panel
- Close button: `XMarkIcon h-5 w-5` Ghost icon button in the header, `aria-label="Close panel"`

#### JSX Usage Example

```jsx
{isOpen && (
  <>
    {/* Backdrop */}
    <div
      className="fixed inset-0 z-30 bg-black/30"
      onClick={onClose}
      aria-hidden="true"
    />
    {/* Panel */}
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="panel-title"
      className="fixed inset-y-0 right-0 z-30 flex w-[400px] flex-col bg-gray-900 border-l border-gray-800 shadow-xl shadow-black/50 transition-transform duration-300 ease-out translate-x-0"
    >
      <div className="flex items-center justify-between border-b border-gray-800 px-6 py-5 flex-shrink-0">
        <h2 id="panel-title" className="text-lg font-semibold text-white">Edit Class</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          aria-label="Close panel"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Panel body */}
      </div>
      <div className="flex items-center border-t border-gray-800 px-6 py-4 flex-shrink-0">
        {/* Footer actions */}
      </div>
    </div>
  </>
)}
```

---

### 6L. RoomPicker

**Purpose:** Searchable dropdown for selecting a managed room entity by ID. Used wherever a form needs to associate a room with a class template or class instance.

#### Visual Spec

- Wrapper: `flex flex-col gap-1.5`
- Label: `text-sm font-medium text-gray-300`
- Dropdown base classes: `w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-transparent`

| State | Additional Classes |
|-------|-------------------|
| Default | `border-gray-700` |
| Focused | `ring-2 ring-green-500 border-transparent` (via focus-visible: prefix) |
| Loading | Replaced by skeleton: `animate-pulse rounded bg-gray-800 h-9 w-full` |
| Error | `border-red-500/60 focus-visible:ring-red-500` |
| Disabled / Empty | `opacity-60 cursor-not-allowed bg-gray-800` |

- Each option: room name + capacity hint `"Studio A (cap. 25)"` when capacity set; `"Studio A"` when capacity is null
- First option is always "No room" (value = empty string, maps to `roomId: null`)
- Error message: `text-xs text-red-400` — "Failed to load rooms"
- Empty state option text: "No rooms found — add one first" (`disabled`)
- "Manage rooms" helper link below the dropdown: `text-xs text-green-400 hover:text-green-300 mt-1 inline-flex items-center gap-1` pointing to `/admin/rooms`

#### Props

`value: string | null` (roomId), `onChange: (roomId: string | null) => void`

Data source: `GET /api/v1/rooms` fetched on mount.

#### JSX Usage Example

```jsx
<div className="flex flex-col gap-1.5">
  <label htmlFor="room-picker" className="text-sm font-medium text-gray-300">
    Room
  </label>
  {isLoading ? (
    <div className="animate-pulse rounded bg-gray-800 h-9 w-full" aria-busy="true" />
  ) : (
    <select
      id="room-picker"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      aria-invalid={hasError}
      aria-describedby={hasError ? 'room-picker-error' : undefined}
      className={`w-full rounded-md border bg-gray-900 px-3 py-2 text-sm text-white transition-colors duration-200 focus:outline-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-green-500 ${
        hasError ? 'border-red-500/60 focus-visible:ring-red-500' : 'border-gray-700'
      } ${rooms.length === 0 ? 'cursor-not-allowed opacity-60' : ''}`}
      disabled={rooms.length === 0}
    >
      <option value="">No room</option>
      {rooms.map((room) => (
        <option key={room.id} value={room.id}>
          {room.name}{room.capacity != null ? ` (cap. ${room.capacity})` : ''}
        </option>
      ))}
      {rooms.length === 0 && (
        <option disabled>No rooms found — add one first</option>
      )}
    </select>
  )}
  {hasError && (
    <p id="room-picker-error" className="text-xs text-red-400">Failed to load rooms</p>
  )}
  <a
    href="/admin/rooms"
    className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:rounded-sm"
  >
    Manage rooms →
  </a>
</div>
```

---

### 6K. Drag-and-drop Drop Target

**Purpose:** Visual affordance for HTML5 drag-and-drop drop zones. Used in the Scheduler calendar time slots.

#### States

| State | Classes | Notes |
|-------|---------|-------|
| Default | (no additional styles) | Normal grid cell appearance |
| Drag-over (valid) | `bg-green-500/10 border border-green-500/40 rounded-md` | Applied via `onDragOver` when `preventDefault()` is called |
| Drag-over (invalid) | `bg-red-500/5 border border-red-500/30 rounded-md` | For out-of-range or disallowed drop targets |
| Drag-over (occupied) | `bg-orange-500/10 border border-orange-500/30 rounded-md` | Slot already has a class instance (soft warning) |

#### Implementation Pattern

```jsx
const [isDragOver, setIsDragOver] = useState(false);

<div
  className={`relative h-10 border-t border-l border-gray-800 transition-colors duration-100 ${
    isDragOver ? 'bg-green-500/10 border border-green-500/40 rounded-md' : 'hover:bg-gray-800/40'
  }`}
  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
  onDragLeave={() => setIsDragOver(false)}
  onDrop={(e) => { e.preventDefault(); setIsDragOver(false); onDrop(e); }}
>
  {/* ClassInstanceCard rendered here when occupied */}
</div>
```

---

### 6M. Sticky Segmented Toolbar

**Purpose:** A sticky, member-facing control bar that combines segmented view switching with period navigation and compact context metadata. Used on pages where the content view and visible date range need to stay accessible while scrolling.

#### Structure

- **Root:** `sticky top-16 z-30 rounded-2xl border border-gray-800 bg-gray-900/95 shadow-lg shadow-black/40 backdrop-blur`
- **Inner layout:** `flex flex-col gap-4 px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between`
- **Left zone:** segmented control
- **Right zone:** period label card + navigation buttons + metadata badge

#### Segmented Control

- Wrapper: `inline-flex w-full rounded-xl border border-gray-800 bg-[#0F0F0F] p-1 sm:w-auto`
- Button base: `min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900`
- Active button: `bg-green-500 text-white`
- Inactive button: `text-gray-400 hover:bg-gray-800 hover:text-white`
- Disabled button: `cursor-not-allowed text-gray-600`

#### Period Label and Navigation

- Label card: `rounded-xl border border-gray-800 bg-[#0F0F0F] px-4 py-3 text-left`
- Primary label: `text-base font-semibold text-white`
- Secondary label: `mt-1 text-xs uppercase tracking-[0.12em] text-gray-500`
- Button row: `inline-flex items-center gap-2`
- Navigation button: use Secondary button variant for `Previous`, `Today`, `Next`

#### Responsive Behaviour

- Mobile: stack segmented control above the label and action row; segmented buttons fill available width.
- Tablet: allow wrapping into two rows; keep the label full width when space is tight.
- Desktop: keep controls in a single wrapped row with the segmented control on the left and period controls on the right.

#### Loading / Error Rules

- Loading: replace segmented buttons and label card with pulse blocks; do not show stale labels.
- Invalid route/query state: hide the toolbar and replace the page body with a recovery state rather than leaving dead controls on screen.

#### JSX Usage Example

```jsx
<section className="sticky top-16 z-30 rounded-2xl border border-gray-800 bg-gray-900/95 shadow-lg shadow-black/40 backdrop-blur">
  <div className="flex flex-col gap-4 px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
    <div className="inline-flex w-full rounded-xl border border-gray-800 bg-[#0F0F0F] p-1 sm:w-auto">
      {['Week', 'Day', 'List'].map((label) => (
        <button
          key={label}
          type="button"
          className={`min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
            label === activeView ? 'bg-green-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="rounded-xl border border-gray-800 bg-[#0F0F0F] px-4 py-3 text-left">
        <p className="text-base font-semibold text-white">{rangeLabel}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-gray-500">{metaLabel}</p>
      </div>

      <div className="inline-flex items-center gap-2">
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900">
          Previous
        </button>
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900">
          Today
        </button>
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900">
          Next
        </button>
      </div>
    </div>
  </div>
</section>
```
