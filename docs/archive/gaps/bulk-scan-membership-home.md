# Gap Report: membership-plans + user-membership-purchase + member-home
Date: 2026-04-09

---

## DOCS → CODE Gaps

### membership-plans

- **`GET /api/v1/membership-plans/{id}` — public auth is incorrectly enforced at the controller layer.**
  The SDD (Section 2) states this endpoint has no auth requirement for public callers, but the controller method `getPlanById` in `MembershipPlanController.kt:39` accepts `authentication: Authentication?` (nullable) and derives `isAdmin` from it. This is functionally correct, but the endpoint is not listed in the `SecurityConfig` `permitAll` block per the SDD note ("Add `.requestMatchers(HttpMethod.GET, "/api/v1/membership-plans/*").permitAll()`"). If `SecurityConfig` does not have this matcher, unauthenticated callers will be blocked by the default `authenticated()` fallback before they reach the controller. This needs a `SecurityConfig` audit to confirm it is present.

- **`PUT /api/v1/membership-plans/{id}` — admin endpoint is served from `MembershipPlanController` instead of a separate admin path.**
  The SDD Section 2 defines the public/user endpoints in one controller and the admin list at `/api/v1/admin/membership-plans`. However, `POST`, `PUT`, `PATCH /activate`, and `PATCH /deactivate` are all under `/api/v1/membership-plans` in `MembershipPlanController.kt`. The SDD does not explicitly say write operations must be on a separate `/admin/` prefix — they use `@PreAuthorize("hasRole('ADMIN')")` — so this is not a violation, but the controller structure (mixing public GET and admin write endpoints in one file) diverges from the implied separation the SDD describes. No blocker, logged as structural note.

- **`MembershipPlanRequest` does not include `maxBookingsPerMonth` field.**
  The SDD Section 3 DTO spec for `MembershipPlanRequest` does not include `maxBookingsPerMonth`, and neither does the code. This is consistent. However, `maxBookingsPerMonth` defaults to `0` on all newly created plans and there is no way for an admin to set it via the `POST` or `PUT` endpoint. This is a known limitation noted in SDD Section 6. No gap between docs and code, but worth flagging as a missing capability.

### user-membership-purchase

- **`getMyActiveMembership` does NOT use `findAccessibleActiveMembership`.**
  SDD Section 2 (`GET /api/v1/memberships/me` business logic, step 2) specifies: "Query `userMembershipRepository.findAccessibleActiveMembership(userId, today)`. This checks `status = 'ACTIVE'` AND `endDate >= today` AND `deletedAt IS NULL`."
  The actual implementation at `UserMembershipService.kt:86` calls `userMembershipRepository.findByUserIdAndStatus(userId, "ACTIVE")` — a simple derived query that checks only `status = 'ACTIVE'`. It does NOT check `endDate >= today` or `deletedAt IS NULL`. This means an expired membership (status still `ACTIVE` but endDate in the past) or a soft-deleted membership will be returned as accessible, contradicting the SDD's explicit `findAccessibleActiveMembership` contract. The repository has `findAccessibleActiveMembership` implemented and available (line 59), but `getMyActiveMembership` does not call it.

- **`UserMembershipResponse` DTO contains additional fields not in SDD Section 3.**
  The SDD `dto/UserMembershipResponse.kt` spec lists: `id, userId, planId, planName, startDate, endDate, status, bookingsUsedThisMonth, maxBookingsPerMonth, createdAt`.
  The actual `UserMembershipResponse.kt` includes additional fields: `userEmail`, `userFirstName`, `userLastName`, `userPhone`, `userDateOfBirth`, `userFitnessGoals`, `userPreferredClassTypes`, `userHasProfilePhoto`, `userProfilePhotoUrl`. These fields are used by the Member Home feature (SDD `member-home.md` Section 2 — the `GET /api/v1/memberships/me` 200 response example includes them). The membership-plans SDD is simply out of date / underspecified. The member-home SDD is authoritative for the full response shape. No code defect, but the user-membership-purchase SDD Section 3 DTO spec is stale.

- **`cancelMyMembership` uses `findByUserIdAndStatus` rather than `findAccessibleActiveMembership`.**
  SDD Section 2 (`DELETE /api/v1/memberships/me` business logic, step 2) states: "Query `userMembershipRepository.findByUserIdAndStatus(userId, "ACTIVE")`." The code at `UserMembershipService.kt:111` matches this exactly. This is consistent; however, this creates an asymmetry: cancel accepts a membership that `getMyActiveMembership` would refuse to return (expired-but-status-ACTIVE). This is a secondary side effect of the `getMyActiveMembership` gap above, not a separate SDD violation.

- **`getAllMemberships` accepts a `memberQuery` parameter not described in the SDD.**
  `UserMembershipService.getAllMemberships` at line 142 accepts `memberQuery: String?` and performs a name-search join against `UserProfileRepository.findUserIdsByNameContainingIgnoreCase`. This parameter is not documented in the SDD Section 2 (`GET /api/v1/admin/memberships` query parameters table). The controller must be passing this through — see CODE → DOCS section.

### member-home

- **`MemberHomePage` renders `MemberHomeHero` AFTER the membership section.**
  SDD Section 4 UI rules state: "Hero renders immediately from auth/profile data and must not wait on the trainer/classes calls." The order in `MemberHomePage.tsx` is: membership section first (line 105), then hero (line 127). The SDD does not mandate that hero is first in the DOM — it only says it must not wait on async calls. The hero does render from `firstName` and `mode` which are derived synchronously. This is consistent with the SDD intent, though the visual order (membership section above hero) differs from typical hero-first layout conventions. No SDD violation found.

- **`MembershipPrimaryCard` prop interface diverges from SDD spec.**
  SDD Section 4 defines `MembershipPrimaryCard` props as including `onBrowsePlans: () => void` and `onSelectPlan: (plan: MembershipPlan) => void`. The actual `MemberHomePage.tsx` passes `browsePlansHref` (a string href) and `getPlanHref` (a function returning a string) instead of callback functions. This is an interface divergence from the SDD spec. The component uses `<a href>` links rather than imperative navigation callbacks. Functionally equivalent but the SDD prop contract is not implemented as specified.

- **`usePlansAccessGate` redirect to `/home` for already-active members is not confirmed in the member-home SDD.**
  `usePlansAccessGate.ts` redirects to `buildHomeMembershipPath('already-active')` when a member with an active membership visits `/plans`. This behaviour is consistent with the `accessFlowNavigation` Section 5a but the redirect-when-already-active path is only mentioned in the context of the `PurchaseConfirmModal`, not in the plans access gate. This is an undocumented code behaviour (see CODE → DOCS).

---

## CODE → DOCS Gaps

### membership-plans

- **No undocumented endpoints found.** All six endpoints (`GET /`, `GET /{id}`, `POST /`, `PUT /{id}`, `PATCH /{id}/deactivate`, `PATCH /{id}/activate`, `GET /admin/membership-plans`) are implemented and documented.

### user-membership-purchase

- **`getAllMemberships` accepts undocumented `memberQuery` string search parameter.**
  `UserMembershipService.kt:142` and the admin memberships controller accept a `memberQuery` parameter for free-text member name search. This is not described anywhere in the user-membership-purchase SDD Section 2 (`GET /api/v1/admin/memberships` query parameters table). The feature is implemented but has no SDD coverage.

- **`UserMembershipRepository` contains methods not in the SDD spec.**
  The SDD Section 3 repository spec does not include: `findAllByUserIdIn`, `findAllByUserIdInAndStatus`, `deleteAllByUserIds`, `deleteAllByPlanIds`, `findAccessibleActiveMembershipForUpdate`. These exist in `UserMembershipRepository.kt`. `findAccessibleActiveMembershipForUpdate` (pessimistic write lock) is particularly notable — it suggests a concurrent booking feature that uses this lock, but this is not described in the membership-purchase SDD. The delete methods appear to be E2E test-support or a cleanup utility not referenced by any documented service.

### member-home

- **`usePlansAccessGate` issues a redirect to `/home?membershipBanner=already-active#membership` when a user with an active membership visits `/plans`.**
  This redirect is implemented in `frontend/src/hooks/usePlansAccessGate.ts:56` but is not described in the member-home SDD Section 5a. Section 5a only describes the `already-active` banner value being set by `PurchaseConfirmModal`. The access gate applying the same redirect proactively is undocumented behaviour.

- **`MembershipAccessBanner` component exists with no SDD entry.**
  `frontend/src/components/home/MembershipAccessBanner.tsx` is implemented but the member-home SDD Section 4 new components table does not list it. It is referenced in `MemberHomePage.tsx` and its props shape (`{ banner: MembershipBanner }`) is inferable from usage. The component is functionally required by Section 5a but is never explicitly named in the components table.

- **`PlansContextHeader` component exists and uses `buildHomeMembershipPath`.**
  `frontend/src/components/plans/PlansContextHeader.tsx` renders a "Back to Home" link using `buildHomeMembershipPath()`. This component is not mentioned in the member-home SDD or any plans SDD. It is a UI element introduced for the home round-trip flow that has no documentation.

---

## Summary of Critical Gaps

1. **`UserMembershipService.getMyActiveMembership` uses `findByUserIdAndStatus` instead of `findAccessibleActiveMembership`** — this means expired memberships (past `endDate` but `status` not yet transitioned) are incorrectly returned as accessible. File: `backend/src/main/kotlin/com/gymflow/service/UserMembershipService.kt:86`. SDD says: `findAccessibleActiveMembership(userId, today)`.

2. **`UserMembershipResponse` DTO in user-membership-purchase SDD is out of date** — the spec omits the user profile fields that the actual DTO carries. The member-home SDD is the authoritative source for the full response shape.

3. **`memberQuery` admin search parameter is undocumented** — `GET /api/v1/admin/memberships` accepts a `memberQuery` free-text filter with no SDD coverage.

4. **`MembershipAccessBanner`, `PlansContextHeader`, and the plans-access-gate redirect are undocumented** — three frontend behaviours directly related to the home round-trip have no SDD entries.
