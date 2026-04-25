# Review: member-profile-redesign
Date: 2026-04-18
Branch: feature/member-profile-redesign
Reviewer: Claude Sonnet 4.6

---

## Verdict: APPROVED WITH SUGGESTIONS

No blockers. The implementation is correct, spec-faithful, and safe to merge. Three
suggestions (not blockers) are noted below.

---

## Summary

This is a **functional extension** redesign. It ships:

1. V23 Flyway migration — `emergency_contact_name` / `emergency_contact_phone` columns on `user_profiles`
2. Backend API delta — `emergencyContact` on profile GET/PUT, four new display fields on membership GET
3. Six new/rebuilt frontend components — `FieldRow`, `PersonalInfoCard`, `MembershipControlCard (+Skeleton)`, `AccountActionsCard`, `Toast`, rebuilt `UserProfilePage`

The overall quality is **production-grade**. A Peloton or Whoop user would not find this
embarrassing. The green gradient card, bookings progress bar, days-remaining countdown,
and Barlow Condensed headings all read as intentional and premium.

---

## Design Fidelity

### Layout & Grid
- Two-column `1.3fr 1fr` grid with 24px gap: matches spec exactly.
- Page padding `40/40/48`, max-width 1240px, green radial glow top-right (700x500, blur 40px, 0.10 opacity): matches spec.
- `AccountActionsCard` full-width below the grid via `gap-6` (flex-col): correct.

### Typography
- Page h1 "YOUR ACCOUNT" in Barlow 56px, uppercase, weight 700, -0.01em: matches.
- `PROFILE` eyebrow 11px/600, 0.24em tracking, `#4ADE80`: matches.
- Plan name 34px Barlow uppercase: matches.
- 28px Barlow day countdown: matches.
- Member name 26px Barlow uppercase: matches.

### PersonalInfo card
- Avatar 64x64, green gradient, black initials 26px/700, shadow `0 8px 24px rgba(34,197,94,0.25)`: matches.
- `PERSONAL INFORMATION` eyebrow, `Member since` (12px gray): matches.
- `Change photo` ghost button with `white-space: nowrap`: matches.
- FieldRow grid `160px 1fr auto`, padding-y 18, top-border `rgba(255,255,255,0.05)`: matches.
- Labels 11px/600/0.18em tracking metadata color: matches.
- Edit button subtle border `rgba(255,255,255,0.1)`: matches.
- Edit inline state — input replaces value, Save/Cancel replace Edit, Enter saves, Esc cancels: matches.
- `aria-label="Edit {field name}"` on every Edit button: matches.
- Error displayed below field on save failure: matches (FieldRow `localError` state).

### MembershipControlCard
- Green gradient bg, corner glow, ACTIVE pill (green tint/border/text): matches.
- Price 13px muted below plan name: matches.
- Bookings bar with glow `0 0 12px rgba(34,197,94,0.5)`: matches.
- `role="progressbar"` with `aria-valuenow/min/max/label`: matches accessibility spec.
- Renewal mini-card: long date, `nextChargeCopy` (11px muted), days countdown (28px Barlow): matches.
- Payment row: `paymentMethod` brand+last4 display, "Not on file" fallback, Update stub: matches.
- Change plan → `/pricing?intent=change`: matches.
- Pause → stub toast: matches (deferred per SDD).
- `<CancelMembershipModal>` rendered but cancel action is in `AccountActionsCard`: correct split.

### AccountActionsCard
- `ACCOUNT` eyebrow, "Sign out or close your account" title, policy subcopy: matches.
- Three buttons with correct styles: Change password (ghost), Sign out (ghost), Cancel membership (red destructive): matches.
- Button padding `10px 16px`, 13px, white-space nowrap: matches spec.

### Toast
- Bottom-center, `rgba(15,15,15,0.95)` bg, `backdropFilter: blur(12px)`, 12px radius, 2.4s auto-dismiss: matches.
- `role="status"` / `aria-live="polite"`: matches.
- `WebkitBackdropFilter` vendor prefix present: good.
- Box shadow `0 12px 32px rgba(0,0,0,0.5)`: matches.

### States coverage (design-standards required checklist)
- Populated state: YES — profile + membership data renders correctly.
- Loading state: YES — `isLoading` skeleton for both columns and account actions row.
- Empty state: YES — `activeMembership === null` renders "No active membership" placeholder with "Browse plans" CTA.
- Error state: YES — access-denied banner (lock icon), fetch-error state (triangle icon + retry button), error banner on page, inline FieldRow error.
- Delight detail: YES — green radial glow + Barlow compressed headings + progress bar glow + days countdown.

---

## Backend Contract

### Database (V23)
- Migration adds two nullable VARCHAR columns with inline CHECK constraints: correct.
- Both fields nullable; partial state (one null, one non-null) is prevented at service layer, not DB: matches SDD (intentional for friendlier errors).

### UserProfileService
- `validateEmergencyContact` trims both fields, checks null/blank, length limits 100/30: matches SDD.
- Returns `Pair(null, null)` when `input == null` → clears both columns: correct.
- `toResponse` builds `EmergencyContactDto` only when both fields are non-null: correct.
- Service-level exception `InvalidEmergencyContactException` maps to `INVALID_EMERGENCY_CONTACT` in `GlobalExceptionHandler`: correct.

### UserMembershipService
- `priceInCents / 100` for integer dollar amount: correct (plans are whole-dollar amounts in this codebase).
- `price` formatted as `"$N / D days"`: matches spec and SDD.
- `nextChargeCopy` formatted as `"$N on Month D"`: matches spec.
- `paymentMethod` always `null`, `autoRenew` = `status == "ACTIVE"`: matches SDD deferred items.
- `formatShortDate` uses `TextStyle.FULL` + English locale: produces correct "May 2" style output.
- All 4 `toResponse` call sites updated (purchaseMembership, getMyActiveMembership, cancelMyMembership, getAllMemberships, adminCancelMembership): correct.

### ErrorCode enum
- `INVALID_EMERGENCY_CONTACT` added after `INVALID_PREFERRED_CLASS_TYPES`: correct placement.

---

## Frontend

### Type alignment
- `UserProfile.emergencyContact: EmergencyContact | null` and `UpdateUserProfileRequest.emergencyContact` match backend DTO shapes: correct.
- `UserMembership` gains `price`, `paymentMethod`, `nextChargeCopy`, `autoRenew`: correct.

### profileStore
- `toastMessage` state added; `setToastMessage` action added: matches SDD.
- `saveMyProfile` sets `toastMessage: 'Profile updated.'` on success: correct.
- `uploadPhoto`/`deletePhoto` set `toastMessage`: correct.
- `FIELD_ERROR_CODES` includes `INVALID_EMERGENCY_CONTACT: 'emergencyContact'`: correct.
- `resetProfile` and `clearMessages` reset `toastMessage`: correct.

### PersonalInfoCard — emergency contact handling
- Display value `"Name · Phone"` and parse with `indexOf(' · ')` split: functionally correct.
- On clear (empty string), sends `emergencyContact: null` to remove: correct.

### FieldRow
- Keyboard: Enter saves, Escape cancels, auto-focus via `setTimeout`: matches spec.
- `readOnly` prop hides Edit button (email row): correct.
- `isSaving` (global) + `saving` (local) both gate the Save button: correct double-guard.

### UserProfilePage
- `toastMessage` from `profileStore` synced into page-level `pageToast` via `useEffect`: correctly avoids double-toast.
- Membership fetch guard: only triggers when `activeMembership === null && !membershipLoading && !membershipError && !membershipErrorCode`: prevents refetch loop.
- Error banner uses `ref` + `tabIndex={-1}` + `focus()`: good accessibility.

### UserProfileForm (legacy form — still rendered elsewhere)
- Emergency contact fields added correctly to Zod schema and `defaultValuesFromProfile`.
- `fieldErrors.emergencyContact` binding present: correct.
- Partial EC entry (name but no phone) sends `emergencyContact: null` rather than `{ name, phone: null }` — this matches the "both or nothing" semantics expected by the backend.

---

## Security

- All endpoints protected by `@PreAuthorize` (unchanged): correct.
- `emergencyContact` fields not logged or surfaced in error messages: confirmed in `validateEmergencyContact` — exceptions use generic messages only.
- `paymentMethod.last4` only display data; no full card numbers: correct.

---

## PRD / SDD Coherence

- PRD AC 22 (emergencyContact validation): implemented and tested via service + handler.
- PRD AC 23 (profile page shows membership card): implemented.
- PRD AC 24 (account actions with confirmation dialog): implemented — cancel opens `CancelMembershipModal`.
- SDD deferred items correctly stubbed: pause → toast, change password → toast, update payment → toast.
- SDD note about `UserMembershipService.toResponse` using `plan.priceInCents` (not `plan.price`): correct — `MembershipPlan` has `priceInCents: Int`, code uses `priceInCents / 100`.

---

## Blockers

None.

---

## Suggestions (not blockers)

### S1 — `Toast` does not visually animate in/out
The spec says "Button hover `filter: brightness(1.08)` 160ms" and mentions a "180ms field edit transition", but more specifically the design system says all entrances use `ease-out`, exits use `ease-in`. The `Toast` component currently has no enter/exit transition — it simply appears and disappears. Adding a `transition-opacity` with `opacity-0 → opacity-100` over 160ms (and respecting `prefers-reduced-motion`) would match the design system's motion section and would noticeably improve the feel.

Suggested addition to `Toast.tsx`:
```tsx
className="... transition-opacity duration-[160ms]"
// Use a useEffect to toggle an `visible` class from false → true after mount
```

### S2 — Emergency contact inline edit UX is non-obvious
The handoff spec notes the inline editor is "not designed" for this field, and the current implementation uses the same `FieldRow` primitive with a single flat text input expecting `"Name · Phone"` format. The format expectation is invisible to the user — there is no placeholder, no helper text, and no format hint. A user who clears the field then types "Sam Reyes" (without the separator) will hit a confusing parse error thrown by `PersonalInfoCard.tsx` before the save call even reaches the backend.

Suggested improvement: add `placeholder="Name · Phone (e.g. Sam Reyes · (347) 555-0122)"` to the FieldRow when it's in edit mode for the emergency contact row. This can be done by adding an optional `inputPlaceholder?: string` prop to `FieldRow`.

### S3 — `priceInCents` integer division truncates fractional plans
`val priceWhole = priceInCents / 100` uses integer division. If a plan's price is, say, 1999 cents (i.e. $19.99), the display would show "$19" rather than "$19.99". The current seed data may use whole-dollar amounts, but this is a silent correctness risk as new plans are created. The SDD notes "Use `plan.price` (BigDecimal)" but the entity has `priceInCents: Int` — this is a SDD documentation error (the SDD refers to a field that doesn't exist). The truncation is harmless now but could silently mislead users if fractional-cent plans are ever created.

Suggested fix: change to `"$%.2f".format(priceInCents / 100.0)` and trim trailing `.00` if desired (e.g. use `BigDecimal(priceInCents).divide(BigDecimal(100)).stripTrailingZeros().toPlainString()`). Low priority while plans are whole-dollar.

---

## Manual-Test Checklist

Work through these flows manually before merging. The checklist covers every state and edge case.

### 1 — Page load (authenticated user with active membership)
- [ ] Navigate to `/profile`
- [ ] Skeleton renders for both columns during fetch
- [ ] After load: Personal Information card shows avatar initials (or photo), correct name, "Member since [date]"
- [ ] After load: Membership Control card shows plan name, price, ACTIVE pill, bookings bar, renewal date, `nextChargeCopy`, days countdown
- [ ] After load: Account Actions row shows all three buttons

### 2 — Page load (authenticated user, no membership)
- [ ] "No active membership" placeholder renders in the right column
- [ ] "Browse plans" link is present and navigates to `/plans`

### 3 — Page load (no auth token / session expired)
- [ ] Access-denied state renders with lock icon and "Access denied" message
- [ ] Back to classes link navigates to `/classes`

### 4 — Page load (network error on profile fetch)
- [ ] Fetch-error state renders with triangle icon and "Failed to load your profile" message
- [ ] "Try again" button refetches and renders the profile on success

### 5 — Inline field edit: Full name
- [ ] Click "Edit" on the Full name row — input appears with current value pre-filled
- [ ] Edit button replaced by Save + Cancel
- [ ] Enter key saves; name updates in header
- [ ] Esc key cancels; original value restored
- [ ] Toast appears "Name updated." and auto-dismisses after ~2.4s
- [ ] Submit with blank value → inline error "Update failed."
- [ ] Submit with name > 50 chars → inline error from backend

### 6 — Inline field edit: Phone
- [ ] Edit phone → enter `+14155552671` → save → toast "Phone updated."
- [ ] Edit phone → enter invalid value → inline error "Enter a valid international phone number."
- [ ] Edit phone → clear → save → toast "Phone updated." + field shows "—"

### 7 — Inline field edit: Date of birth
- [ ] Edit DOB → enter a future date → inline error "Enter a valid date of birth that is not in the future."
- [ ] Edit DOB → enter valid date → save → toast "Date of birth updated." + field shows formatted date

### 8 — Inline field edit: Emergency contact
- [ ] Edit emergency contact → type `Sam Reyes · (347) 555-0122` → save → toast "Emergency contact updated."
- [ ] Emergency contact value displays as `Sam Reyes · (347) 555-0122` after save
- [ ] Edit → clear value → save → toast "Emergency contact removed." + field shows "—"
- [ ] Edit → type name only without ` · ` separator → save → inline error "Use format: Name · Phone"
- [ ] Edit → type `Sam Reyes · ` (empty phone) → save → inline error "Both name and phone are required."

### 9 — Email field
- [ ] Email row has no Edit button (read-only)
- [ ] Email value cannot be changed

### 10 — Change photo
- [ ] Click "Change photo" button or avatar → file picker opens
- [ ] Select a JPEG/PNG/WEBP → toast "Photo updated." → avatar shows new image
- [ ] Select an unsupported file type → toast "Photo upload failed."

### 11 — Membership Control card — Change plan
- [ ] Click "Change plan" → navigates to `/pricing?intent=change`

### 12 — Membership Control card — Pause
- [ ] Click "Pause" → toast "Pause feature coming soon."

### 13 — Membership Control card — Update payment
- [ ] Click "Update" in the Payment row → toast "Payment update coming soon."

### 14 — Membership Control card — payment method display
- [ ] When `paymentMethod` is null (current state): Payment row shows "Not on file"

### 15 — Account actions — Sign out
- [ ] Click "Sign out" → redirected to `/login`
- [ ] Re-navigating to `/profile` redirects to login (session cleared)

### 16 — Account actions — Change password
- [ ] Click "Change password" → toast "Password change — coming soon."

### 17 — Account actions — Cancel membership (with active membership)
- [ ] Click "Cancel membership" → `CancelMembershipModal` opens
- [ ] Modal shows plan name and active-until date
- [ ] Click "Keep membership" → modal closes, no change
- [ ] Esc key → modal closes, no change
- [ ] Click "Cancel membership" in modal → membership cancelled
- [ ] After cancellation: Membership column shows "No active membership" placeholder
- [ ] Toast "Membership cancelled." appears

### 18 — Account actions — Cancel membership (no active membership)
- [ ] Click "Cancel membership" when no membership → toast "No active membership to cancel."

### 19 — Bookings progress bar
- [ ] Bar fills proportionally to `bookingsUsedThisMonth / maxBookingsPerMonth`
- [ ] Bar is fully filled (100%) when at cap
- [ ] Bar is empty when 0 bookings used

### 20 — Days remaining countdown
- [ ] Shows a large number when renewal is far away
- [ ] Shows "0 days" gracefully when endDate is today or past

### 21 — Multiple field saves in sequence
- [ ] Edit name, save → toast appears → before toast dismisses, edit phone, save → second toast appears (replaces first)

### 22 — Saving state
- [ ] While a save is in progress, Edit buttons are disabled (controlled by `isSaving` from store)
- [ ] Save/Cancel buttons show "Saving…" and are disabled during the save call

### 23 — Loading skeleton
- [ ] On slow network, two skeleton cards render (green gradient hint + pulse animation) before data loads
- [ ] Skeleton includes the account-actions row skeleton below

### 24 — No membership + membership fetch error
- [ ] If membership fetch returns a non-404 error, the placeholder still renders (no crash)
- [ ] `membershipError` does not block profile data from rendering

### 25 — Admin console (regression check)
- [ ] `GET /api/v1/admin/memberships` still returns results (new fields `price`, `paymentMethod`, `nextChargeCopy`, `autoRenew` present on each record)
- [ ] Admin cancel membership still works

### 26 — Accessibility spot-check
- [ ] Tab through the Personal Info card — focus order is: avatar/photo button → FieldRow Edit buttons in order → account action buttons
- [ ] Each Edit button has a unique `aria-label` (e.g. "Edit full name", "Edit phone number")
- [ ] Error messages are associated with their inputs (`role="alert"` or `aria-describedby`)
- [ ] Toast uses `role="status"` / `aria-live="polite"` — screen reader announces it without interrupting

---

*Committed to: `feature/member-profile-redesign` branch*
