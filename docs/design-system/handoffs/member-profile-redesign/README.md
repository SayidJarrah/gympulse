# Handoff: GymFlow "Pulse" Member Profile

## Overview

Redesign of the **authenticated member profile page** — where a member controls personal information and manages their membership. Applies the **"Pulse"** design DNA established on the landing page and member home. Companion to `design_handoff_pulse_landing` and `design_handoff_pulse_home`.

Scope is intentionally tight — two things only:

1. **Personal information** — name, email, phone, DOB, emergency contact, avatar
2. **Membership control** — plan, status, bookings cycle, renewal, payment method, change/pause/cancel

Plus a small account-actions row (change password, sign out, cancel membership).

**No new features.** Everything is surfacing or editing data the member already has.

## About the Design Files

Files in `design_reference/` are **HTML/React prototypes** — design references, not production code. Recreate them in the target GymFlow codebase using its existing stack (React/Next.js, component library, forms, auth, data layer). The prototype uses React 18 + Babel + inline-style objects purely for prototyping convenience.

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii final. Pixel-match. Lofi bits:
- Avatar is a colored circle with initial — replace with real photo upload flow
- All Edit / Update / Change / Sign out / Cancel buttons are stubs — wire to real mutations
- DOB is displayed as "Aug 14, 1992" — inline editor not designed (see Open Questions)

## Relationship to the other Pulse handoffs

**Reuses verbatim** from the landing handoff:
- `pulse_shared.jsx` — `<Logo>`, `<Nav>`, `<Footer>`, `<AmbientWaveform>` (waveform NOT used on profile)
- `colors_and_type.css` — design tokens

The **MembershipControl** component here is a superset of the `MembershipSection` used on the home page — same gradient + corner glow + bookings bar + renewal mini-card, plus payment method, Change plan, and Pause. If you extract it as a shared `<MembershipCard variant="compact|full">`, use:
- `compact` on home (current behavior)
- `full` on profile (with payment + actions)

---

## Screen Layout

Single page at route `/profile` (or `/account`) for authenticated members.

```
┌──────────────────────────────────────────────────────────────┐
│  Nav (authed)                                                │
├──────────────────────────────────────────────────────────────┤
│  PROFILE / eyebrow                                           │
│  YOUR ACCOUNT   (Barlow 56px uppercase)                      │
│  Update your personal information and manage your membership.│
│                                                              │
│  ┌──────────────────────────┐  ┌─────────────────────────┐   │
│  │ Personal Information     │  │ Membership              │   │
│  │  avatar + name           │  │  gradient card          │   │
│  │  5 editable rows         │  │  bookings bar           │   │
│  │                          │  │  renewal card           │   │
│  │                          │  │  payment row            │   │
│  │                          │  │  Change plan · Pause    │   │
│  └──────────────────────────┘  └─────────────────────────┘   │
│   grid: 1.3fr 1fr · gap 24px                                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Account · Sign out/password/cancel actions           │    │
│  └──────────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────┤
│  Footer                                                      │
└──────────────────────────────────────────────────────────────┘

<main>: relative, overflow hidden, padding 40/40/48, max-width 1240px centered.
Subtle green radial glow top-right (~700×500, blur 40px, opacity 0.10).
```

---

## Components

### Page header
- Eyebrow `PROFILE` (11px/600, 0.24em, uppercase, `--color-primary-light`)
- `h1` "YOUR ACCOUNT" — Barlow Condensed 56px/700 uppercase, letter-spacing -0.01em, line-height 1
- 14px muted helper copy (max-width 520px)

### PersonalInfo card
Container: padding `28/28/12` (less bottom so the last row has proper rhythm), `rgba(255,255,255,0.02)` bg, `--color-border-card` border, 16px radius.

**Header row** (flex, align-center, gap 20):
- 64×64 avatar, circle, `linear-gradient(135deg, #22C55E, #4ADE80)`, centered initial in black (26px/700), box-shadow `0 8px 24px rgba(34,197,94,0.25)`
- Middle column: `PERSONAL INFORMATION` eyebrow, then name in Barlow 26px/700 uppercase, then `Member since {date}` (12px muted)
- Right: `Change photo` button (8/14 padding, transparent bg, 1px `rgba(255,255,255,0.15)` border, 8px radius, 12px/500, **`white-space: nowrap`**)

**Field list** (margin-top 24):
- `<Field>` primitive: grid `160px 1fr auto`, align-center, gap 16, padding-y 18, 1px top-border `rgba(255,255,255,0.05)` (acts as between-rows rule)
- Label: 11px/600, 0.18em tracking, uppercase, `--color-fg-metadata`
- Value: 15px/500 white
- Edit button: 6/12 padding, transparent, 1px `rgba(255,255,255,0.1)` border, `--color-fg-label`, 8px radius, 12px/500

**Rows:** Full name / Email / Phone / Date of birth / Emergency contact. Click Edit → open an inline editor or side-panel (not designed).

### MembershipControl card
Same gradient + corner glow as the home `MembershipSection`. All of that spec carries over — diff vs home:

**New above the bookings bar:** price under plan title (13px muted, `$120 / 90 days`).

**Renewal mini-card** gets a third line: next-charge copy `$120 on May 2` (11px muted) beneath the renewal date.

**New: Payment row** (below renewal, same inset-panel treatment):
- Left: `PAYMENT` eyebrow + payment method (14px/500 white — `Visa ending 4421`)
- Right: `Update` button (same subtle ghost as Field edit buttons)

**New: Action buttons** (2-col grid, gap 10, margin-top 18):
- `Change plan` — **primary green** (green bg, black text, 12/16 padding, 8px radius, 13px/700, `0 8px 24px rgba(34,197,94,0.3)` glow)
- `Pause` — ghost (transparent, subtle border)

### AccountActions row (full-width below the 2-col grid)
Container: padding 24, `rgba(255,255,255,0.02)` bg, `--color-border-card` border, 16px radius, flex row space-between gap 20.

**Left side:**
- `ACCOUNT` eyebrow
- Title: `Sign out or close your account` (15px/600 white)
- Subcopy: `Cancelling ends your plan at the current cycle's end — no refund for unused days.` (12px muted)

**Right side** (3 buttons, gap 10, all **`white-space: nowrap`**, 10/16 padding, 13px/500, 8px radius, transparent bg):
- `Change password` — subtle white border
- `Sign out` — subtle white border
- `Cancel membership` — `1px solid rgba(239,68,68,0.3)` border, `#F87171` text (destructive accent)

### Toast
Bottom-center, 12/20 padding, `rgba(15,15,15,0.95)` bg, subtle white border, 12px radius, 13px white, `backdropFilter: blur(12px)`, auto-dismiss after 2.4s. Used for all confirmations ("Email updated", "Payment method saved", etc).

---

## State Management

### `profile`
```ts
{
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: ISODate;              // rendered as "Aug 14, 1992"
  emergencyContact: {
    name: string;
    phone: string;           // display "Sam Reyes · (347) 555-0122"
  } | null;
  avatarUrl: string | null;  // null → fallback to initial-in-circle
  memberSince: ISODate;
}
```

### `membership`
Same shape as the home handoff, plus:
```ts
{
  ...same as home
  price: string;             // "$120 / 90 days" — precomputed on server
  paymentMethod: {
    brand: "visa" | "mastercard" | "amex" | ...;
    last4: string;           // display "Visa ending 4421"
  };
  nextChargeCopy: string;    // "$120 on May 2" — server-formatted
  autoRenew: boolean;        // if false, show "Won't renew" in place of day count
}
```

### Mutations (wire to existing API)
- `PATCH /profile` — name, email, phone, dob, emergencyContact (separate calls fine)
- `POST /profile/avatar` — multipart upload
- `POST /auth/password` — change password (opens flow in its own route or modal)
- `POST /auth/signout` — clears session, redirects to `/`
- `POST /membership/plan` — change plan (opens pricing page / modal)
- `POST /membership/pause` — pause with reason picker (not designed)
- `POST /membership/cancel` — cancel with confirm + reason (not designed)
- `POST /membership/payment-method` — update card (Stripe Elements / existing provider)

All mutations should fire an optimistic update + toast on success.

---

## Interactions & Behavior

- **Edit field** — Click `Edit` on a row → inline edit mode (input replaces value, `Save` / `Cancel` replaces Edit button). On save: optimistic update + toast `"Email updated"`. Keep keyboard flow: Enter saves, Esc cancels, Tab through fields.
- **Change photo** — opens file picker → preview → upload. Show spinner in the avatar during upload. Toast on success/failure.
- **Change plan** — routes to `/pricing` with `?intent=change` so the pricing page can show a "Current" badge on the active plan.
- **Pause** — confirmation modal with duration picker (7 days / 30 days / until {date}).
- **Cancel membership** — two-step modal: first explains policy, second captures reason and confirms.
- **Update payment** — opens payment-method modal using your existing Stripe/Paddle/etc. integration.
- **Destructive styling** — only the Cancel button uses red. Sign out and Change password are neutral.
- **Avatar mouse behavior** — hover shows `Change` overlay (nice-to-have; not required).

---

## Design Tokens

Ported from `colors_and_type.css` — use these, don't invent:

### Key values used on this page
- Page bg `#0F0F0F`
- Card bg `rgba(255,255,255,0.02)`
- Inset panel bg `rgba(0,0,0,0.3)`
- Borders: `--color-border-card` (#1F2937), hairlines `rgba(255,255,255,0.05)`, ghost button `rgba(255,255,255,0.1–0.15–0.2)`
- Primary green `#22C55E`, text variant `#4ADE80`, border `rgba(34,197,94,0.30)`, tint `0.06–0.10`
- Destructive `#F87171` text, `rgba(239,68,68,0.30)` border
- Avatar gradient `linear-gradient(135deg, #22C55E, #4ADE80)`
- Text: white / `#D1D5DB` label / `#9CA3AF` muted / `#6B7280` metadata

### Typography
| Size / line-height / tracking | Weight | Usage |
|------|--------|-------|
| 56px Barlow / 1.0 / -0.01em uppercase | 700 | Page h1 "Your account" |
| 34px Barlow / 1.05 / -0.01em uppercase | 700 | `QUARTERLY MEMBERSHIP` |
| 28px Barlow / -0.01em | 700 | `12` day countdown |
| 26px Barlow / -0.01em uppercase | 700 | Member name header |
| 15px Inter | 500/600 | Field values, AccountActions title |
| 14px Inter | 500/600 | Renewal date, payment method |
| 13px Inter | 500/600/700 | Buttons, helper copy |
| 12px Inter | 400/500/600 | Field edit buttons, metadata, progress caption |
| 11px Inter / 0.18–0.24em uppercase | 600 | Row labels, eyebrows |
| 10px Inter / 0.22em uppercase | 600/700 | Inset-panel eyebrows, ACTIVE pill |

### Spacing
Page padding 40/40/48. Grid gap 24 between info+membership, margin-top 24 to actions row. Cards internal padding 24–28. Field row padding-y 18.

### Radius
- 8px buttons
- 12px inset panels (renewal, payment)
- 16px cards
- 999 pills, progress, avatar
- 50% avatar

### Shadows
- Primary button glow `0 8px 24px rgba(34,197,94,0.3)`
- Avatar `0 8px 24px rgba(34,197,94,0.25)`
- Progress fill `0 0 12px rgba(34,197,94,0.5)`
- Toast `0 12px 32px rgba(0,0,0,0.5)` + `backdropFilter: blur(12px)`

### Motion
- Button hover `filter: brightness(1.08)` 160ms
- Field edit transition: ~180ms swap of value ↔ input
- Respect `prefers-reduced-motion`

---

## Accessibility

- Each Edit button needs `aria-label="Edit email"` etc — "Edit" alone is ambiguous.
- Inline edit mode: auto-focus the input on open; `Esc` cancels; `Enter` saves.
- Error states not designed — reserve space below the input for an error string (12px `--color-error-fg`).
- Destructive Cancel button should open a confirm dialog — don't fire the mutation from a single click.
- Form labels should be associated (`<label for>` or wrapping) — in the prototype they are visual only.

---

## Files

In `design_reference/`:

| File | Contains |
|------|----------|
| `index.html` | Entry — loads React + Babel + JSX modules |
| `colors_and_type.css` | **Canonical design tokens** — port verbatim |
| `pulse_shared.jsx` | `<Logo>`, `<Nav>`, `<Footer>`, `<AmbientWaveform>` — shared with landing + home |
| `profile_sections.jsx` | `<PersonalInfo>`, `<MembershipControl>`, `<AccountActions>`, `<Field>` primitive |
| `profile_app.jsx` | `<ProfilePage>`, `<Toast>` |

### Reuse strategy
In the real codebase, extract `<MembershipCard>` as a shared component used by both home (compact variant) and profile (full variant). Extract `<Field>` (label / value / edit) as a primitive — it will be reused on other settings pages.

---

## Open Questions / Deferred

- **Inline vs dedicated edit flows** — the prototype shows an `Edit` button but doesn't design the editor itself. Decide: inline (swap value for input) or side-panel. Recommendation: inline for simple fields, side-panel for DOB + emergency contact.
- **Pause flow** — duration picker, reason selector, confirmation not designed.
- **Cancel flow** — multi-step modal with reason capture not designed (important for retention analytics).
- **Change password flow** — not designed. Likely route to existing `/account/security` or a modal.
- **Notifications preferences** — email frequency, class reminders, push — not in this scope. Could be a third column or a separate `/profile/notifications` sub-route.
- **Privacy controls** — who sees my activity in the club feed? — not in this scope but relevant given the public/anonymized feed modes.
- **Mobile** — not designed. Stack vertically: header → Personal Info → Membership Control → Account Actions. Drop the h1 to ~40px, field row becomes 2-row (label above value).
- **Verified states** — email verification, phone verification — not visualized. Add a green checkmark + "Verified" label if applicable.
