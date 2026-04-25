# Gap Report: auth + user-access-flow + landing-page
Date: 2026-04-09

---

## DOCS → CODE Gaps

### auth

- **`AuthService.kt:116–121` — `refresh` response does not populate `hasActiveMembership`.**
  `AuthService.login()` calls `userMembershipRepository.findAccessibleActiveMembership(...)` and sets
  `hasActiveMembership` correctly. `AuthService.refresh()` constructs a `LoginResponse` with
  `hasActiveMembership` left at its Kotlin default (`false`). The SDD (§7, Post-Login Redirect) says
  `hasActiveMembership` is returned by `POST /api/v1/auth/login` and is used by the home page to
  avoid an extra API call. The same field is present on `LoginResponse` and is therefore also
  returned by `POST /api/v1/auth/refresh`, but it is silently wrong after a token refresh. Any
  client that relies on the refreshed `LoginResponse` to determine membership state (e.g., a silent
  refresh on page reload) would see `false` regardless of actual membership. Fix: populate
  `hasActiveMembership` in `refresh()` the same way it is populated in `login()`.

- **`authStore.ts` does not store `hasActiveMembership`.**
  The SDD (§4 State) specifies the `AuthState` shape as `accessToken`, `refreshToken`, `user`,
  `isAuthenticated`. `hasActiveMembership` is not listed there — the SDD says the home page reads
  it from `LoginResponse` and then relies on `useMembershipStore` for subsequent checks. However,
  there is no documented mechanism to transfer the `hasActiveMembership` field from the login
  response into any store. The field is decoded in `useAuth` hooks and used transiently, but there
  is no SDD entry covering how it flows from the login response into page-level state. See
  CODE → DOCS section.

### user-access-flow

- **No gaps found.** All new files listed in SDD §4 exist and implement the specified behaviour:
  `MembershipAccessBanner.tsx`, `PlansContextHeader.tsx`, `usePlansAccessGate.ts`,
  `accessFlowNavigation.ts`. Render order on `/home` matches the SDD §4 Home Render Order spec.
  Navbar removes `Plans` for authenticated `USER` on both desktop and mobile.

### landing-page

- **`landingActions.ts:37–44` — active-member CTA destination is `/membership`, not `/home`.**
  SDD §7 Auth-Aware CTA Resolution Matrix specifies:

  > Authenticated, `hasActiveMembership = true` → Primary CTA destination: `/home`, label:
  > "Go to member home"

  The code sends active members to `/membership` ("Open member area", "Go to portal"). The
  E2E test `LAND-04` asserts `href="/membership"`, confirming the E2E test was written against
  the implemented behaviour rather than the SDD spec. This is a three-way conflict: SDD says
  `/home`, code says `/membership`, E2E says `/membership`. Per Lesson 4, resolution requires
  UX intent reasoning, not majority vote. An active member landing on `/membership` (their plan
  management page) is a reasonable destination. An active member landing on `/home` (their
  activity hub) is also reasonable and aligns with the primary authenticated surface established
  by the user-access-flow SDD. The SDD must be updated to match whichever destination is
  intentional, and the discrepancy must be resolved explicitly before the next delivery.

---

## CODE → DOCS Gaps

### auth

- **`types/auth.ts:38–41` — `ApiErrorResponse` interface is not in the SDD.**
  The file exports an `ApiErrorResponse` interface (`{ error: string; code: string }`) that does
  not appear in the SDD §4 New Types list. It is referenced by `PurchaseConfirmModal.tsx` and
  `useLandingPlans.ts`. This is a legitimate shared type that should be documented under either
  the auth SDD §4 or a shared types section to avoid it being silently duplicated or removed.

- **`AuthService.kt` — `userMembershipRepository` dependency is not documented in auth SDD §3.**
  `AuthService` imports and calls `UserMembershipRepository.findAccessibleActiveMembership()` to
  populate `hasActiveMembership`. The auth SDD §3 Kotlin Classes table lists `AuthService` but
  does not mention this cross-feature repository dependency. The SDD §7 post-login redirect
  section acknowledges the call in prose but never updates the §3 constructor signature. A reader
  following §3 alone would not know to wire this dependency.

### user-access-flow

- **`usePlansAccessGate.ts:62` — `canPurchase` is gated on `membershipErrorCode === 'NO_ACTIVE_MEMBERSHIP'`, not simply on `mode === 'authenticated'`.**
  The SDD §4 Plans Behaviour says authenticated users without an ACTIVE membership "can purchase
  from this page". The hook returns `canPurchase: false` if the membership fetch failed with any
  error code other than `NO_ACTIVE_MEMBERSHIP`, even though `mode` would also be `'authenticated'`
  in that case. This is a tighter guard than the SDD specifies and is not documented. It should
  be documented as an intentional safety rule (purchase disabled on ambiguous membership state)
  or relaxed to match the SDD.

- **`PlansContextHeader.tsx:9` — Back to Home link uses `buildHomeMembershipPath()` (which adds `#membership` hash) rather than plain `/home`.**
  The SDD §4 Plans Behaviour says the context header provides "a back link to `/home#membership`".
  The code calls `buildHomeMembershipPath()` without a banner argument, which builds
  `/home#membership`. This matches the SDD. No doc gap — this is a confirmation that the
  implementation is correct.

### landing-page

- **`landingActions.ts` returns a four-key `ResolvedLandingActions` object (`headerPrimary`,
  `heroPrimary`, `heroSecondary`, `planAction`) but the SDD §7 only defines a two-type union
  (`LandingPrimaryAction` and `LandingPlanAction`).**
  The actual return type lives in `src/types/landing.ts` (inferred from the import at line 2 of
  `landingActions.ts`). The SDD does not document `headerPrimary` as a separate action distinct
  from `heroPrimary`, and does not document the `ResolvedLandingActions` aggregate type. These
  should be added to SDD §7 to keep the type contract authoritative.

- **`LandingPage.tsx:39` — `landing_page_view` event includes `isAuthenticated` and `role` as payload fields.**
  The SDD §4 Analytics Utility specifies the `trackEvent` signature and lists the minimum events
  but does not specify payload schemas. The `role` and `isAuthenticated` fields in the
  `landing_page_view` payload are undocumented. Low severity, but if downstream analytics
  consumers depend on this shape, it should be in the SDD.

---

## Summary

| Feature | DOCS → CODE | CODE → DOCS | Status |
|---------|-------------|-------------|--------|
| auth | 2 gaps (refresh missing `hasActiveMembership`, `userMembershipRepository` undocumented in §3) | 2 gaps (`ApiErrorResponse` type, constructor dependency) | Gaps present |
| user-access-flow | 0 | 1 gap (`canPurchase` narrower guard than SDD) | Minor gap |
| landing-page | 1 gap (active-member CTA `/membership` vs SDD `/home`) | 2 gaps (`ResolvedLandingActions` type, analytics payload schemas) | CTA destination conflict needs resolution |

### Action required before next delivery

1. **Resolve the active-member landing CTA destination** — SDD §7 says `/home`, code and E2E say
   `/membership`. Decide which is correct, update the SDD to match, and align the E2E assertion.
   Per Lesson 4, this requires a product/UX decision, not a code vote.

2. **Fix `AuthService.refresh()` to populate `hasActiveMembership`** — the field is present on
   `LoginResponse` and will silently return `false` after a token rotation, causing the home page
   to show the inactive membership state until the membership store fetches separately.
