# Gap Report: user-access-flow
Date: 2026-04-09

## Summary

The two bugs reported by the user are confirmed. The post-login redirect is wrong for users
without an active membership (they land on `/plans` instead of `/home`), and the `Plans` nav
tab reappears for any authenticated user whose `activeMembership` store value is `null` at the
time the Navbar renders — which includes the moment between login and the first membership fetch.

---

## DOCS → CODE Gaps

### Missing Functionality

- **`usePlansAccessGate` `canPurchase` gate** — the gate returns `canPurchase: membershipErrorCode === 'NO_ACTIVE_MEMBERSHIP'`. This is structurally correct but has no fallback for the edge case where `membershipErrorCode` remains `null` due to a non-404 membership fetch failure. In that state the user is shown the full plan grid (mode `'authenticated'`) but `canPurchase` is `false`, so no purchase CTA appears and no explanation is shown. The design spec's error table requires a retryable error state for generic fetch failure on `/plans`; the page has a plan-fetch error but no membership-fetch error branch.

- **`MembershipAccessSection` hero ordering** — Design spec Section "Screen: Home" states: "Content order: 1. Membership access section; 2. Existing Member Home secondary sections". In `MemberHomePage.tsx` the `MemberHomeHero` renders **before** the `<section id="membership">`. The spec also states the hero "may remain only if it is visually subordinate and does not precede membership as a peer section." The hero is currently rendered as the first peer block, not subordinate to or after the membership section.

- **`PlansContextHeader` back-link deep-links to `#membership`** — SDD §4 states the `Back to Home` link routes to `/home#membership`. The component needs verification.

- **`My Favorites` nav tab gated on `activeMembership`** — Navbar line 38: `...(activeMembership ? [{ label: 'My Favorites', href: '/trainers/favorites' }] : [])`. PRD AC-13 requires the authenticated navigation to always expose `My Favorites`. The SDD §4 Navigation Rules also lists `My Favorites` as a fixed nav item for authenticated `USER` shell with no conditional. Gating it behind `activeMembership` is undocumented behaviour that contradicts AC-13.

### Broken Flows

- **Post-login redirect: authenticated USER without an active membership lands on `/plans` instead of `/home`**
  `LoginPage.tsx` line 17: `navigate(hasActiveMembership ? '/home' : '/plans')`.
  Domain model Post-Login Routing rule: "Regular user with no active membership (Guest) → `/plans`".
  PRD AC-1: "Authenticated `USER` accounts land on `/home` as their primary post-login destination."
  The PRD AC-1 and the gymflow-domain skill are in direct contradiction here. The domain skill was written after the PRD to capture the implemented SDD decision. The SDD §2 Backend API Contract states: "USER → /home" with no membership branch. The correct behaviour is that **all** authenticated USER accounts land on `/home`; only the membership *section within home* adapts by state. The current code sends non-members to `/plans`, breaking AC-1 and contradicting the SDD.

- **`Plans` nav tab reappears for authenticated users without an active membership**
  `Navbar.tsx` line 31: `const navLinks = isAuthenticated && user?.role === 'USER' ? [] : [{ label: 'Plans', href: '/plans' }]`.
  When `isAuthenticated` is `true` and `user?.role === 'USER'`, `navLinks` is `[]` — so `Plans` is **not** in `navLinks`. However, `Plans` can reappear indirectly: when `activeMembership` is `null` (before or without an active membership) the `userNavLinks` does not include `Plans` either, so `Plans` should be absent.
  On closer inspection: `Plans` is absent from both `navLinks` (empty for USER) and `userNavLinks` (never includes Plans). So the nav tab itself is correctly absent per the code.
  **However**, the reported symptom of "Plans menu option has reappeared" is most likely caused by the broken redirect landing the user on `/plans` (the standalone plans page) after login, where the **public** Navbar renders because `/plans` is not wrapped in `UserRoute`. When the user is unauthenticated or the store has not yet hydrated `user`, `navLinks` includes `Plans`. The mismatch between the redirect landing and the authenticated shell is the root cause of the perception that `Plans` is a nav tab.

- **`/plans` route is not wrapped in authentication context** — `App.tsx` line 33: `<Route path="/plans" element={<PlansPage />} />` — no `AuthRoute` or `UserRoute` wrapper. This means the Navbar in `PlansPage` renders in guest mode (with `Plans` visible) on first render before the auth store re-hydrates from localStorage, even for authenticated users. This produces a flash of the public nav including `Plans`.

### Design Divergence

- **Hero precedes membership section** — Design spec requires membership section first; `MemberHomeHero` renders before `<section id="membership">`. Minor if the hero is visually subordinate but currently they are equal-weight peer blocks.

- **`InactiveMembershipPreview` section heading** — Design spec: title should be `Activate your access` (from "no active membership" eyebrow/title table). Implemented text is `No active membership`. This is a direct copy divergence from the design spec Screen: Home > MembershipAccessSection.

- **`NoPlansAvailableState` title** — Design spec: `No plans available right now`. Implemented text matches. No divergence here.

- **`MembershipInfoRedirectBanner` colour** — Design spec: `border-blue-500/30 bg-blue-500/10 text-blue-100`. Not verifiable without reading `MembershipAccessBanner.tsx`; flagged for manual check.

### Missing Test Coverage

- **AC-1**: "Authenticated USER accounts land on `/home` as their primary post-login destination" — `member-home.spec.ts` AC-01 tests navigation to `/home` but tests it by directly injecting persisted auth state and navigating to `/home`, not by going through the login form. The broken redirect in `LoginPage.tsx` is not caught by this test.
- **AC-2**: "Primary logged-in navigation does not include `Plans` as a top-level tab" — no E2E assertion for the absence of a `Plans` nav item when authenticated.
- **AC-14**: "If an authenticated user navigates to a legacy standalone logged-in Plans entry point, the app routes them to the approved replacement experience" — no E2E spec for active-member redirect from `/plans` to `/home`.
- **AC-12**: "After a successful membership purchase initiated from the home membership section, the user is returned to the ACTIVE membership state on Home without logging out" — partially covered in `user-membership-purchase.spec.ts` but not from the home-section entry point specifically.
- No `user-access-flow.spec.ts` file exists. All access-flow ACs are scattered across `member-home.spec.ts` and `user-membership-purchase.spec.ts` or not covered at all.

---

## CODE → DOCS Gaps

### Undocumented Endpoints / Logic

- None identified. All API calls follow existing documented contracts.

### Undocumented UI

- **`MemberHomeHero` component** — exists and renders before the membership section, but the SDD §4 only says it may remain if "visually subordinate". No design spec section describes its populated/loading/empty states or exact position relative to the membership section. Its ordering relative to the membership block is undocumented and is a structural decision that should be explicit.

- **`QuickActionsPanel` component** — renders between the membership section and the trainer carousel on `/home`. Not mentioned in the design spec or SDD. Its content and interaction behaviour are undocumented.

### Undocumented Behaviours

- **`My Favorites` conditionally hidden when no active membership** — Navbar hides `My Favorites` when `activeMembership` is `null`. This is not documented in any AC, SDD rule, or design spec. It contradicts AC-13.

- **`Plans` route served as a public-first page** — `/plans` has no auth-aware route wrapper in `App.tsx`. The page uses `usePlansAccessGate` to self-gate internally, but this means the Navbar mounted inside the page briefly renders in guest mode (showing `Plans`) before the auth store hydrates. This flash is a UX side-effect not described in the SDD.

- **`canPurchase: false` when membership fetch fails generically on `/plans`** — the access gate returns `mode: 'authenticated'` but `canPurchase: false` when `membershipErrorCode` is any value other than `NO_ACTIVE_MEMBERSHIP`. The page renders the full plan grid with no purchase CTAs and no explanation. The SDD error table does not describe this state.

### Untested Code Paths

- Active-member redirect from `/plans` to `/home?membershipBanner=already-active#membership`.
- `PlansPage` rendering in `mode: 'authenticated'` with `canPurchase: false` (generic membership error state on `/plans`).
- Post-purchase `MEMBERSHIP_ALREADY_ACTIVE` fallback path in `PurchaseConfirmModal` (line 70–78).
- One-time banner display (`MembershipSuccessBanner` and `MembershipInfoRedirectBanner`) and auto-removal via URL `replace`.

---

## Root Cause Analysis

### Bug 1 — Wrong post-login redirect for users without an active membership
File: `frontend/src/pages/auth/LoginPage.tsx` line 17.
```
navigate(hasActiveMembership ? '/home' : '/plans')
```
Should be: `navigate('/home')` for all authenticated USER accounts.
The SDD §2 is unambiguous: "USER → /home". The `hasActiveMembership` field in `LoginResponse` was added to support this routing decision, but the code uses it to branch away from `/home` rather than using it only to adapt the home page content. The domain skill's routing table entry "Regular user with no active membership → /plans" reflects the broken implementation, not the spec intent.

### Bug 2 — "Plans" nav appears to reappear
This is a consequence of Bug 1. Non-members are redirected to `/plans` after login, which renders the `Navbar` in guest/unauthenticated appearance (briefly, or fully if auth store hydration is slow), showing the public `Plans` link. The nav itself is correctly coded when the authenticated shell renders. The fix for Bug 1 eliminates this symptom.

A secondary contributing cause: `/plans` has no route wrapper so the Navbar inside it renders guest-mode on first paint before Zustand rehydrates. This should be addressed independently.

### Bug 3 — `My Favorites` hidden for non-members (undocumented, contradicts AC-13)
File: `frontend/src/components/layout/Navbar.tsx` line 38.
`...(activeMembership ? [...] : [])` makes `My Favorites` conditional. PRD AC-13 lists it as a required nav item.

---

## Suggested Fix Order

1. **[BLOCKER] Fix post-login redirect** — `LoginPage.tsx` line 17: change to `navigate('/home')` for all USER accounts regardless of `hasActiveMembership`. This fixes Bug 1 and eliminates the root cause of the perceived Plans nav reappearance (Bug 2).

2. **[BLOCKER] Restore `My Favorites` as an unconditional nav item** — `Navbar.tsx` line 38: remove the `activeMembership` condition from the `userNavLinks` array. `My Favorites` must always appear for authenticated USER accounts per AC-13.

3. **[HIGH] Wrap `/plans` route in an auth-aware shell or add a route wrapper** — prevent the guest-mode Navbar flash on `/plans` for authenticated users. Simplest fix: render the Navbar from within `PlansPage` using auth-store state for the initial render, which is already the case — but ensure the store hydrates before first paint by persisting auth state correctly (already done via localStorage). Alternatively, wrap `/plans` in `AuthRoute` and accept that unauthenticated users are redirected to login (guests who bookmarked `/plans` would need to go through login first, which is a product decision).

4. **[MEDIUM] Fix `InactiveMembershipPreview` section title** — `MembershipPrimaryCard.tsx`: change heading `No active membership` to `Activate your access` to match the design spec.

5. **[MEDIUM] Reorder `MemberHomeHero` below or visually subordinate to the membership section** — `MemberHomePage.tsx`: render `<section id="membership">` before `MemberHomeHero` so the membership access block is the first major content the user sees, per AC-4 and the design spec content order.

6. **[LOW] Add E2E spec `user-access-flow.spec.ts`** covering: authenticated USER login redirect to `/home`, absence of `Plans` nav tab for authenticated users, active-member redirect from `/plans` to home banner, purchase-return banner on `/home`, `My Favorites` visibility for non-members.

7. **[LOW] Document `QuickActionsPanel` and `MemberHomeHero` ordering** in `docs/sdd/user-access-flow.md` and `docs/design/user-access-flow.md` to close the undocumented-UI gap.

---

## Test Coverage Findings

Manual walkthrough performed 2026-04-09 against the review stack (http://localhost:3000 / http://localhost:8080).
Test user: `audit-user@gymflow.local` / `Member@1234` — freshly registered, no active membership.
No `user-access-flow.spec.ts` file exists.

### ACs with Passing Behaviour

- AC3: Home is the first nav item in the authenticated USER navigation (`Navbar.tsx` userNavLinks — confirmed by code inspection; the link `href: '/home'` is first in the array).
- AC13 (partial): Schedule, Trainers, and Profile nav items are present for authenticated USER accounts (confirmed in nav snapshot at `/plans` after login). Home link exists in code. My Favorites is gated (see AC13 failure note below).
- AC15: The home membership preview and plans page consume the same `/api/v1/memberships/me` and `/api/v1/membership-plans` endpoints — confirmed via `usePlansAccessGate` and `useMemberHomeMembershipSection` hooks sharing the same `membershipStore`.

### ACs with Failing Behaviour

- AC1: **FAIL** — After login as a USER without an active membership, the app redirected to `/plans` (observed URL: `http://localhost:3000/plans`) instead of `/home`. `LoginPage.tsx` line 17: `navigate(hasActiveMembership ? '/home' : '/plans')`. Expected: redirect to `/home` for all authenticated USER accounts.

- AC2: **FAIL** — The nav rendered at `/plans` after login showed a "Plans" link as the first nav item (observed snapshot: `link "Plans" [ref=e39] /url: /plans`). Expected: no "Plans" top-level tab for authenticated USER. Root cause: `/plans` renders `<Navbar />` without a `UserRoute` wrapper; Navbar briefly reads `isAuthenticated=false` or renders guest `navLinks` before Zustand rehydrates from localStorage, causing the Plans tab to appear. This is a consequence of the AC1 redirect depositing the user on a public-first page.

- AC4: **UNABLE TO VERIFY** — `/home` rendered a blank page when navigated to directly in the Playwright MCP browser session (auth state in localStorage was not available to the MCP browser context after navigation). The `MemberHomePage` component was loaded via `UserRoute`, which requires `isAuthenticated=true`. The page returned no snapshot content. Cannot confirm the membership section is the first major content area.

- AC5: **UNABLE TO VERIFY** — No user with an ACTIVE membership was available in the review stack for the Playwright session. Code review of `MemberHomePage.tsx` shows `MemberHomeHero` renders before `<section id="membership">`, which contradicts the "membership section first" ordering required by AC4 and AC5.

- AC6: **UNABLE TO VERIFY** — Same blocker as AC4/AC5; could not reach `/home` in an authenticated session via the Playwright MCP browser.

- AC13 (partial): **FAIL** — "My Favorites" nav link is conditioned on `activeMembership` being non-null (`Navbar.tsx` line 38). For a USER without an active membership, "My Favorites" is absent from the nav. AC13 requires it to be present for all authenticated USER accounts.

### ACs with No Spec Coverage

- AC1: "Authenticated USER accounts land on `/home` as their primary post-login destination" — no spec. The `member-home.spec.ts` tests that `/home` renders correctly by injecting auth state directly; it does not test the login-form redirect path that is currently broken.
- AC2: "Primary logged-in navigation does not include `Plans` as a top-level tab" — no spec asserting absence of Plans nav item for authenticated users.
- AC4: "The first major content area on Home is the membership section" — no spec for content ordering.
- AC5: "If user has ACTIVE membership, membership section shows plan summary and not full catalogue" — no spec for the active-membership home state.
- AC6: "If user does not have ACTIVE membership and plans exist, membership section surfaces plan-discovery preview" — no spec for the inactive-membership home state (plan teasers).
- AC7: "Native plan-discovery preview shows a limited highlighted set of plans rather than the full catalogue grid" — no spec.
- AC8: "Each highlighted plan includes name, duration, price, and one value point" — no spec.
- AC9: "Home membership section provides a clear path to full plan comparison" — no spec.
- AC10: "Path to full plan comparison is triggered from membership section, not a primary nav tab" — no spec.
- AC11: "If no active plans exist, membership section shows a clear unavailable state" — no spec.
- AC12: "After a successful purchase initiated from home, user is returned to ACTIVE membership state on Home without re-login" — no spec for the home-entry-point purchase return path specifically.
- AC14: "Legacy standalone Plans entry point routes authenticated user to approved replacement" — no spec. Code exists (`usePlansAccessGate` redirects active-member from `/plans` to `/home#membership`) but is untested by any E2E spec.
- AC16: "Authenticated user flow remains readable on mobile and desktop" — no mobile viewport spec.

### Untested Code Paths

- Login form submit → `navigate('/home')` for authenticated USER (currently navigates to `/plans`, spec would also catch the bug).
- Navbar renders correct user nav links (Home, Schedule, Trainers, My Favorites, Profile) on first paint after login — no flash of guest nav tested.
- `usePlansAccessGate` redirect: authenticated USER with ACTIVE membership navigating to `/plans` → redirect to `/home?membershipBanner=already-active#membership`.
- `MembershipPrimaryCard` in "inactive with plans" mode rendering plan teasers (limited set, not full catalogue).
- `MembershipPrimaryCard` in "active" mode rendering plan summary without full catalogue.
- `MembershipPrimaryCard` in "no plans available" mode rendering unavailable state.
- `MembershipAccessBanner` one-time display and URL cleanup after purchase return.
- `QuickActionsPanel` presence and CTA behaviour for both active and inactive membership states.
- `/home` on mobile viewport (nav, membership section, hero layout).
