# SDD: Member Profile Redesign

## Reference
- PRD: `docs/prd/user-profile-management.md` (updated for this redesign)
- Base SDD: `docs/sdd/user-profile-management.md`
- Handoff: `docs/design-system/handoffs/member-profile-redesign/`
- Date: 2026-04-18

## Architecture Overview

This SDD covers only the **delta** introduced by the member-profile-redesign on top of
the shipped `user-profile-management` feature. Read the base SDD first.

**Classification: Functional extension.** The handoff introduces three new data fields not
in the existing implementation:

1. `emergencyContact` on `UserProfile` — new optional object with `name` and `phone`.
2. Membership display fields on `GET /api/v1/memberships/me` — `price`, `paymentMethod`,
   `nextChargeCopy`, `autoRenew` — needed for the Membership Control card.
3. Consolidated `UserProfilePage` at `/profile` that surfaces both personal information
   and membership control in a single two-column Pulse-DNA layout.

The following handoff interactions are **deferred** (not wired to real mutations in this
iteration):
- Pause membership flow (duration picker + reason)
- Cancel membership modal with reason capture (existing `CancelMembershipModal` is wired)
- Change password (navigates to existing password flow or shows stub)
- Update payment method (stub toast)
- Change plan (navigates to `/pricing?intent=change`)

---

## 1. Database Changes

### Modified Tables

**`user_profiles`** — add `emergency_contact_name` and `emergency_contact_phone`.

```sql
-- V23__add_emergency_contact_to_user_profiles.sql

ALTER TABLE user_profiles
  ADD COLUMN emergency_contact_name  VARCHAR(100),
  ADD COLUMN emergency_contact_phone VARCHAR(30);

ALTER TABLE user_profiles
  ADD CONSTRAINT chk_user_profiles_ec_name
    CHECK (emergency_contact_name IS NULL OR char_length(btrim(emergency_contact_name)) BETWEEN 1 AND 100),
  ADD CONSTRAINT chk_user_profiles_ec_phone
    CHECK (emergency_contact_phone IS NULL OR char_length(emergency_contact_phone) BETWEEN 1 AND 30);
```

These are always persisted together — if one is non-null both must be non-null (enforced
in the service layer, not the DB constraint, to give a friendly error message).

### New Tables
None.

### Flyway Migration
`V23__add_emergency_contact_to_user_profiles.sql` — next after V22.

---

## 2. Backend API Contract

### GET /api/v1/profile/me — delta

The existing `UserProfileResponse` gains two new nullable fields:

```json
{
  ...existing fields...
  "emergencyContact": {
    "name": "Sam Reyes",
    "phone": "(347) 555-0122"
  }
}
```

`emergencyContact` is `null` when neither field is set. It is never partially populated:
if either `name` or `phone` is null the service returns `null` for the whole object.

### PUT /api/v1/profile/me — delta

`UpdateUserProfileRequest` gains:

```json
{
  ...existing fields...
  "emergencyContact": {
    "name": "Sam Reyes",
    "phone": "(347) 555-0122"
  }
}
```

`emergencyContact` is optional (nullable). When present, both `name` and `phone` must be
non-blank strings. Partial objects (one field null) are rejected with a new error code.

**New error responses:**

| Status | Error Code | Condition |
|--------|------------|-----------|
| 400 | `INVALID_EMERGENCY_CONTACT` | `emergencyContact` is present but `name` or `phone` is blank, or name exceeds 100 chars, or phone exceeds 30 chars |

### GET /api/v1/memberships/me — delta

The existing `UserMembershipResponse` gains four new fields derived from the plan and
from membership metadata. These are computed in `UserMembershipService` using the
existing `MembershipPlan` association — no new tables required.

```json
{
  ...existing fields...
  "price": "$120 / 90 days",
  "paymentMethod": null,
  "nextChargeCopy": "$120 on May 2",
  "autoRenew": true
}
```

**Field derivation:**

| Field | Source | Notes |
|-------|--------|-------|
| `price` | `plan.price` + `plan.durationDays` | Formatted server-side as `"$N / D days"`. Use `plan.price` (BigDecimal) and `plan.durationDays` (Integer). |
| `paymentMethod` | Always `null` for now | Payment provider integration is deferred. Return `null`. Field is typed `PaymentMethodDto?`. |
| `nextChargeCopy` | `membership.endDate` + `plan.price` | Formatted as `"$N on Mon D"` using the renewal date. Only shown when `autoRenew = true`. |
| `autoRenew` | Always `true` for now | Auto-renew toggle is deferred. Return `true` for ACTIVE memberships. |

**`PaymentMethodDto`** (nullable, always null in this iteration):
```kotlin
data class PaymentMethodDto(
    val brand: String,  // "visa", "mastercard", "amex", ...
    val last4: String   // "4421"
)
```

---

## 3. Kotlin Classes to Modify

### `UserProfile` entity
Add fields:
- `emergencyContactName: String?`
- `emergencyContactPhone: String?`

### `UserProfileResponse` DTO
Add:
- `emergencyContact: EmergencyContactDto?`

New inner/companion DTO:
```kotlin
data class EmergencyContactDto(
    val name: String,
    val phone: String
)
```

### `UpdateUserProfileRequest` DTO
Add:
- `emergencyContact: EmergencyContactInput?`

New inner/companion DTO:
```kotlin
data class EmergencyContactInput(
    val name: String?,
    val phone: String?
)
```

### `UserProfileService`
Add `validateEmergencyContact(input: EmergencyContactInput?)` helper:
- If `input` is null → persist null (clear).
- If present, both `name` and `phone` must be non-blank after trimming, `name` ≤ 100 chars, `phone` ≤ 30 chars.
- Throw `InvalidEmergencyContactException` on failure.

### `UserMembershipResponse` DTO
Add:
- `price: String`
- `paymentMethod: PaymentMethodDto?`
- `nextChargeCopy: String`
- `autoRenew: Boolean`

### `UserMembershipService`
In `toResponse(membership: UserMembership)`, compute derived fields:
- `price`: `"$${plan.price.toBigInteger()} / ${plan.durationDays} days"`
- `nextChargeCopy`: `"$${plan.price.toBigInteger()} on ${formatShortDate(membership.endDate)}"` — e.g. `"$120 on May 2"`
- `autoRenew`: `true` (constant for now)
- `paymentMethod`: `null`

### `GlobalExceptionHandler`
Add handler for `InvalidEmergencyContactException` → 400 `INVALID_EMERGENCY_CONTACT`.

---

## 4. Frontend Components to Create / Modify

### New: `src/components/profile/PersonalInfoCard.tsx`
Replaces the old `ProfileSummaryCard` + `UserProfileForm` pair with the Pulse-DNA
Personal Information card from the handoff:
- 64×64 green gradient avatar with member initials (or photo if `avatarUrl` is set)
- `PERSONAL INFORMATION` eyebrow, member name in Barlow 26px uppercase, `Member since` date
- `Change photo` button (ghost, `white-space: nowrap`)
- `<FieldRow>` primitive for each editable field (Full name, Email, Phone, Date of birth, Emergency contact)
- Inline edit mode per field: clicking Edit replaces value with input + Save/Cancel buttons
- On save: calls `profileStore.saveMyProfile`, shows toast on success, shows inline error on failure
- `aria-label="Edit {field name}"` on every Edit button

### New: `src/components/profile/FieldRow.tsx`
Primitive extracted from the PersonalInfo card:
- Grid `160px 1fr auto`, align-center, gap 16, padding-y 18, top-border hairline
- Props: `label`, `value`, `editAriaLabel`, `onSave`, `isSaving`, `error`
- Internal state: `editing: boolean`, `draft: string`
- Keyboard: `Enter` saves, `Escape` cancels, auto-focus on edit open

### New: `src/components/membership/MembershipControlCard.tsx`
Pulse-DNA Membership Control card for the profile page (full variant):
- Green gradient bg, corner glow overlay
- Plan name (Barlow 34px uppercase) + price (13px muted)
- Bookings progress bar (`bookingsUsedThisMonth / maxBookingsPerMonth`)
- Renewal mini-card: date, `nextChargeCopy`, days-remaining countdown
- Payment row (always shows "Not on file" when `paymentMethod` is null; "Update" button shows stub toast)
- `Change plan` → navigates to `/pricing?intent=change`
- `Pause` → stub toast (pause flow deferred)
- Uses `useMembershipStore` internally — fetches if not yet loaded

### New: `src/components/profile/AccountActionsCard.tsx`
Full-width account actions row:
- `ACCOUNT` eyebrow, "Sign out or close your account" title, policy subcopy
- `Change password` → navigates to `/account/security` or stub toast if route not yet available
- `Sign out` → calls `authStore.logout`, redirects to `/`
- `Cancel membership` — opens existing `CancelMembershipModal`; destructive red styling

### New: `src/components/profile/Toast.tsx`
Bottom-center auto-dismissing toast:
- `rgba(15,15,15,0.95)` bg, `backdropFilter: blur(12px)`, 12px radius
- Auto-dismiss after 2.4 s
- Props: `message: string | null`, `onClose: () => void`
- Respects `prefers-reduced-motion` — skip transition if reduced

### Modified: `src/pages/profile/UserProfilePage.tsx`
Rebuilt as the consolidated Pulse-DNA page:
- Page bg `#0F0F0F`, green radial glow top-right
- Header: `PROFILE` eyebrow, `YOUR ACCOUNT` h1 (Barlow 56px uppercase), 14px helper copy
- Two-column grid: `1.3fr 1fr`, gap 24 — `<PersonalInfoCard>` | `<MembershipControlCard>`
- `<AccountActionsCard>` below, full-width, margin-top 24
- Toast state lifted to page level, passed down to cards via callback props
- Loading skeleton: two matching skeleton cards + actions skeleton
- Error states: access-denied and fetch-error states preserved

### Modified: `src/pages/membership/MyMembershipPage.tsx`
The dedicated `/membership` page is preserved as-is for backward compatibility. It
continues using `MembershipStatusCard`. The new `MembershipControlCard` is used only
on the profile page. No changes required to `MyMembershipPage`.

### Modified: `src/types/userProfile.ts`
Add `emergencyContact` field:
```ts
export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface UserProfile {
  ...existing...
  emergencyContact: EmergencyContact | null;
}

export interface UpdateUserProfileRequest {
  ...existing...
  emergencyContact: EmergencyContact | null;
}
```

### Modified: `src/types/userMembership.ts`
Add membership display fields:
```ts
export interface PaymentMethod {
  brand: string;
  last4: string;
}

export interface UserMembership {
  ...existing...
  price: string;
  paymentMethod: PaymentMethod | null;
  nextChargeCopy: string;
  autoRenew: boolean;
}
```

### Modified: `src/store/profileStore.ts`
Extend `saveMyProfile` to accept partial field update (for inline editing):
- Add `saveField(field: ProfileFieldName, value: string | EmergencyContact | null): Promise<void>`
- This fetches current profile, applies only the changed field, then calls `PUT /profile/me`
- Fires toast via `toastMessage` state atom (new) instead of `successMessage`

New state additions:
```ts
toastMessage: string | null;
setToastMessage: (msg: string | null) => void;
```

---

## 5. Route Map

| Path | Component | Auth |
|------|-----------|------|
| `/profile` | `UserProfilePage` (rebuilt) | `AuthRoute` (USER) |
| `/membership` | `MyMembershipPage` (unchanged) | `AuthRoute` (USER) |

No new routes added. `/profile` already exists in `App.tsx`.

---

## 6. State Derivation

### `memberSince` display
Derived from `profile.createdAt` in the frontend: `new Date(profile.createdAt)` formatted
as "Month YYYY" (e.g. "March 2024"). No new backend field needed.

### Days remaining
Derived from `membership.endDate`: `Math.ceil((new Date(endDate) - new Date()) / 86_400_000)`.
When `autoRenew = false`, show "Won't renew" instead of the day count.

### Initials
`(firstName[0] ?? '') + (lastName[0] ?? '')`. Fallback to `'GF'` when both are null.

---

## 7. Deferred Items (from handoff open questions)

| Item | Status |
|------|--------|
| Pause flow (duration picker, reason) | Deferred — stub toast shown |
| Cancel flow multi-step modal with reason | Deferred — existing `CancelMembershipModal` used |
| Change password dedicated flow | Deferred — navigates to `/account/security` if exists, else stub |
| Update payment method (Stripe Elements) | Deferred — stub toast shown |
| Avatar hover overlay | Nice-to-have, not required |
| Mobile responsive layout (stacked) | Deferred — not designed in handoff |
| Verified email/phone badges | Deferred — not in handoff scope |
| `autoRenew = false` "Won't renew" state | Backend always returns `true` for now; frontend handles it |
| `paymentMethod` real data | Backend always returns `null`; frontend shows "Not on file" |

---

## 8. Security Notes

- All endpoints remain protected by existing `@PreAuthorize("hasRole('USER')")`.
- `emergencyContact` is PII — never logged, never exposed in error messages.
- `paymentMethod.last4` is the only payment data stored client-side; full card numbers
  never touch this codebase.
