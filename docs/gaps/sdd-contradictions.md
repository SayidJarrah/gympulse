# SDD Cross-Document Contradiction Report
Date: 2026-04-09

## Summary
13 contradictions found across 10 SDD files.

---

## Contradictions

### C-01: Post-Login Redirect for Regular Users
**Area:** Redirect
**SDDs involved:** `auth.md` (Section 4 task list) vs `auth.md` (Section 7 implemented behaviour) vs `member-home.md` vs `user-access-flow.md`

**What auth.md Section 4 (task list) says:**
> `LoginPage.tsx` — on success redirects to `/classes`.

**What auth.md Section 7 (implemented behaviour) says:**
> `USER` (any membership state) → `/home`. All authenticated `USER` accounts land on `/home` unconditionally.

**What member-home.md says:**
> Login redirect for `USER` becomes `/home` instead of `/plans`. ADMIN login redirect remains `/admin/plans`.

**What user-access-flow.md says:**
> `/home` remains the only primary post-login destination for authenticated `USER` accounts.

**Conflict:** The original Section 4 task list in `auth.md` says redirect goes to `/classes`. Section 7 of the same file corrects this to `/home`. `member-home.md` refers to changing it "from `/plans`", implying the intermediate state was `/plans`, not `/classes`. Three different values appear in the corpus: `/classes`, `/plans`, and `/home`.

**Recommended resolution:** `/home` is authoritative. It is documented in auth.md Section 7 as the implemented behavior, corroborated by `user-access-flow.md` and `member-home.md`, and aligns with UX intent (member lands on their membership context, not on a plans catalogue or a schedule route that did not exist yet). The stale `/classes` entry in auth.md Section 4 task list is an artefact from an earlier draft and should be corrected to `/home`.

---

### C-02: Post-Login Redirect — Does Membership State Affect the Redirect Target?
**Area:** Redirect / auth flow
**SDDs involved:** `auth.md` (Section 7) vs `gymflow-domain` skill (domain skill post-login routing table)

**What auth.md Section 7 says:**
> All authenticated `USER` accounts land on `/home` unconditionally. `hasActiveMembership` does not drive the redirect destination.

**What the gymflow-domain skill post-login routing table says:**
> Regular user with ACTIVE membership → `/home`; Regular user with no active membership (Guest) → `/plans`

**Conflict:** The domain skill says a guest-state user (authenticated but no active membership) should go to `/plans` after login, while auth.md says all `USER` accounts unconditionally go to `/home`. The `user-access-flow.md` SDD backs auth.md: it states `/home` is the only primary post-login destination.

**Recommended resolution:** auth.md Section 7 and user-access-flow.md are authoritative as the most recently decided documents. Routing all users to `/plans` after login is explicitly called out as disruptive (domain skill commentary agrees with this reasoning). The domain skill routing table entry for "no active membership → `/plans`" should be removed or updated to reflect that `/home` handles this state and surfaces plan options inline.

---

### C-03: Login Response Shape — `hasActiveMembership` Field Presence
**Area:** API entity / auth flow
**SDDs involved:** `auth.md` (Section 3 DTO, Section 4 TypeScript type) vs `auth.md` (Section 7 implemented behaviour)

**What auth.md Section 3 DTO spec says:**
```kotlin
data class LoginResponse(
  val accessToken: String,
  val refreshToken: String,
  val tokenType: String = "Bearer",
  val expiresIn: Long
)
```
No `hasActiveMembership` field.

**What auth.md Section 4 TypeScript type says:**
```typescript
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}
```
No `hasActiveMembership` field.

**What auth.md Section 7 (implemented behaviour) says:**
> `hasActiveMembership` is returned by `POST /api/v1/auth/login` in `LoginResponse`.

**Conflict:** The DTO and TypeScript type definitions in the original SDD sections do not include `hasActiveMembership`, but Section 7 documents it as implemented. Both the Kotlin DTO and the frontend TypeScript type are missing this field. Any frontend code based on the Section 4 type definition will not see `hasActiveMembership` without updating the type.

**Recommended resolution:** Add `hasActiveMembership: boolean` to both the Kotlin `LoginResponse` DTO spec in Section 3 and the TypeScript `LoginResponse` interface in Section 4 of auth.md. Section 7 is authoritative here because it documents what was actually built.

---

### C-04: `GET /api/v1/class-schedule` — Active Membership Gate: Required or Not?
**Area:** Auth / role access
**SDDs involved:** `group-classes-schedule-view.md` vs `class-booking-cancellation.md`

**What group-classes-schedule-view.md says:**
> **Auth:** Required (`USER` role only, plus current ACTIVE membership)
> Error: `404 NO_ACTIVE_MEMBERSHIP` — Caller has no membership row with `status = 'ACTIVE'` and `end_date >= current_date`

**What class-booking-cancellation.md says:**
> This feature also deliberately changes one existing contract from the Group Classes Schedule View design: `/api/v1/class-schedule` remains `USER`-only, but it is no longer gated by active membership. Any authenticated `USER` may browse the schedule; only booking creation is membership-gated.
> **Auth:** Required (`USER` role only). Active membership is not required.

**Conflict:** `group-classes-schedule-view.md` hard-gates `/api/v1/class-schedule` behind active membership and returns `404 NO_ACTIVE_MEMBERSHIP`. `class-booking-cancellation.md` explicitly reverts this: any authenticated `USER` can browse, no membership required. The schedule now returns `200` even when `hasActiveMembership = false`.

**Recommended resolution:** `class-booking-cancellation.md` is authoritative and supersedes. It explicitly calls out the change and explains the product rationale (browsing schedule is not membership-gated; only booking creation is). The `group-classes-schedule-view.md` SDD must be updated to remove the active-membership gate from `GET /api/v1/class-schedule` and change the error table accordingly. The PRD for group-classes-schedule-view AC 3 says users without a membership "cannot access schedule data" — this PRD AC is now contradicted by the booking PRD's deliberate product decision; product confirmation is needed.

---

### C-05: Flyway Migration Version V15 — Two Conflicting Files Claim the Same Version
**Area:** DB schema / migrations
**SDDs involved:** `group-classes-schedule-view.md` vs `trainer-discovery.md`

**What group-classes-schedule-view.md says:**
> `V15__add_class_instance_status_for_member_schedule.sql` — adds `class_instances.status` column, backfill, and indexes.

**What trainer-discovery.md says:**
> `V15__add_trainer_discovery_columns.sql` — adds `experience_years` and `profile_photo_url` to `trainers`; creates `user_trainer_favorites` table.

**Conflict:** Two separate SDDs each claim Flyway migration version `V15`. Flyway requires unique version numbers; both cannot be `V15` in the same schema baseline. One of them will fail to apply on a clean database.

**Recommended resolution:** Inspect the actual migration files in `backend/src/main/resources/db/migration/` to determine which one was applied first and which one received a corrected version number. The `entity-image-management.md` SDD says "The current latest migration is `V18__add_class_instance_status_for_member_schedule.sql`", which implies the schedule migration was renumbered (from `V15` to `V18`). The SDDs themselves still say `V15` and are out of date. Both SDDs must be updated to reflect the renumbered versions that were actually applied.

---

### C-06: `GET /api/v1/memberships/me` — Expiry Check: `status = ACTIVE` Only vs. `endDate >= today`
**Area:** API / business rule
**SDDs involved:** `user-membership-purchase.md` vs `group-classes-schedule-view.md` vs `class-booking-cancellation.md`

**What user-membership-purchase.md says:**
> Query `userMembershipRepository.findByUserIdAndStatus(userId, "ACTIVE")`. This endpoint returns exactly the current ACTIVE membership. The query uses `status = 'ACTIVE'` only — it does not check `endDate >= today`. The expiry scheduler (future feature) is responsible for transitioning status to `EXPIRED` when `endDate` passes.

**What group-classes-schedule-view.md says:**
> `SELECT m FROM UserMembership m WHERE m.userId = :userId AND m.status = 'ACTIVE' AND m.endDate >= :today AND m.deletedAt IS NULL`

**What class-booking-cancellation.md says:**
> Resolve the caller's accessible active membership with `findAccessibleActiveMembership(userId, todayUtcDate)` — which requires `status = 'ACTIVE'` AND `endDate >= today`.

**Conflict:** `user-membership-purchase.md` defines `GET /memberships/me` as a pure `status = ACTIVE` check with no date gate, because an expiry scheduler is responsible for transitioning statuses. However `group-classes-schedule-view.md` and `class-booking-cancellation.md` both use the `findAccessibleActiveMembership` query that additionally requires `endDate >= today`. This means a membership that is still `ACTIVE` in the DB but past its end date would appear active to the `/memberships/me` endpoint but would be blocked on the schedule and booking endpoints.

**Recommended resolution:** The `findAccessibleActiveMembership` pattern in the schedule and booking SDDs is the correct defensive approach for a system without a reliable expiry job — it avoids granting booking access to technically-expired memberships. `user-membership-purchase.md` should add the `endDate >= today` check to `GET /memberships/me` (at minimum for the auth gate response) and acknowledge this is consistent with the domain skill's definition of accessible membership.

---

### C-07: `isFavorited` Field Population — Members Only vs. All Authenticated Users
**Area:** Business rule / API
**SDDs involved:** `trainer-discovery.md` vs `member-home.md`

**What trainer-discovery.md says:**
> `isFavorited` — `true` if the requesting user has this trainer in their favorites list. Always `false` for users without an active membership (they cannot have favorites).

**What member-home.md `GET /api/v1/trainers` response says:**
> `"isFavorited": true` — field is present on trainer responses in the Member Home trainer preview section.

**Conflict:** `trainer-discovery.md` states users without an active membership always get `isFavorited = false` because they cannot have favorites. But `member-home.md` includes `isFavorited: true` in the sample response for the trainer carousel, and Member Home explicitly allows users without an active membership to see the trainer carousel. If a user without a membership somehow has a favorite (edge case), the response would differ depending on which contract is followed.

**Recommended resolution:** This is a mild conflict. The intent in `trainer-discovery.md` is correct: users without an active membership cannot add favorites, so the field will always be `false` for them in practice. However the comment "they cannot have favorites" is misleading — a user who had a membership, favorited trainers, then cancelled will still have rows in `user_trainer_favorites`. Clarify in `trainer-discovery.md` that `isFavorited` is derived by checking the actual favorites table for all authenticated users, and separately that adding new favorites requires active membership.

---

### C-08: `GET /api/v1/trainers` — Authentication Requirement: Any Authenticated User vs. USER Role Only
**Area:** Auth / role access
**SDDs involved:** `trainer-discovery.md` vs `member-home.md`

**What trainer-discovery.md says:**
> **Auth:** Required (any authenticated user — USER or ADMIN role)

**What member-home.md says:**
> **Auth:** Required (any authenticated user; Member Home calls it only from the `USER` route)

**Conflict:** This is consistent in intent but `member-home.md` adds the caveat "only from the `USER` route", which is a frontend constraint, not a backend one. Admins can also call `GET /api/v1/trainers`. No actual contradiction, but the wording in `member-home.md` is misleadingly restrictive and could cause a developer to add a `USER`-only `@PreAuthorize` annotation incorrectly.

**Recommended resolution:** Minor wording inconsistency. `member-home.md` should clarify that "USER route" refers to the frontend route guard, not a backend authorization restriction. The backend allows any authenticated user.

---

### C-09: Landing Page CTA — Active Member Redirected to `/membership` vs. `/home`
**Area:** Navigation / redirect
**SDDs involved:** `landing-page.md` vs `user-access-flow.md` vs `member-home.md`

**What landing-page.md Section 4 says:**
> Authenticated USER with active membership: primary CTA → `/membership`

**What landing-page.md Section 7 resolution table says:**
> `Authenticated, hasActiveMembership = true` → `/membership` — "Open member area" / "Go to portal"

**What user-access-flow.md says:**
> `/home` remains the only primary post-login destination for authenticated `USER` accounts.

**What member-home.md says:**
> Add `Home` to the authenticated user navbar; update authenticated-member landing CTAs from `/membership` to `/home`.

**Conflict:** `landing-page.md` routes an active member who clicks the landing page CTA to `/membership`. `user-access-flow.md` and `member-home.md` establish `/home` as the primary authenticated destination, and `member-home.md` explicitly directs that landing CTAs should point to `/home`. Sending an active member to `/membership` from the landing page CTA is inconsistent with the intent of those later SDDs.

**Recommended resolution:** `user-access-flow.md` and `member-home.md` are later and more product-intentional. The landing page CTA for active members should go to `/home`, not `/membership`. `/membership` is the deeper management surface, not the primary landing. Update `landing-page.md` Section 4 and Section 7 table accordingly.

---

### C-10: `MembershipPlanResponse` DTO — `maxBookingsPerMonth` Field Present or Absent
**Area:** Entity / API response shape
**SDDs involved:** `membership-plans.md` vs `user-membership-purchase.md` vs `member-home.md`

**What membership-plans.md Section 2 success response shows:**
```json
{
  "id": "uuid",
  "name": "Monthly Basic",
  "description": "...",
  "priceInCents": 2999,
  "durationDays": 30,
  "status": "ACTIVE",
  "createdAt": "...",
  "updatedAt": "..."
}
```
No `maxBookingsPerMonth` field.

**What user-membership-purchase.md Section 2 `POST /memberships` success response shows:**
```json
{
  ...
  "maxBookingsPerMonth": 10,
  ...
}
```

**What member-home.md `GET /api/v1/membership-plans` response shows:**
```json
{
  "maxBookingsPerMonth": 10
}
```

**Conflict:** The public `GET /api/v1/membership-plans` response in `membership-plans.md` does not include `maxBookingsPerMonth`, but `member-home.md` and the `UserMembershipResponse` in `user-membership-purchase.md` both expose it. Member Home uses the plans endpoint to build teaser cards, and AC 8 of the user-access-flow PRD requires plan comparison to include enough information for "quick comparison", which implicitly includes booking limits.

**Recommended resolution:** `maxBookingsPerMonth` was added via `V7__add_max_bookings_per_month_to_membership_plans.sql` and is part of the `MembershipPlan` entity. The `MembershipPlanResponse` in `membership-plans.md` should be updated to include `maxBookingsPerMonth`. This is a documentation gap; the field almost certainly exists in the actual implementation given the migration is documented.

---

### C-11: Trainer `classCount` Definition — `status = 'SCHEDULED'` vs. `deleted_at IS NULL AND scheduled_at > NOW()`
**Area:** Entity / business rule
**SDDs involved:** `trainer-discovery.md` vs `group-classes-schedule-view.md`

**What trainer-discovery.md says:**
> `classCount` — number of currently SCHEDULED class instances (defined as: `deleted_at IS NULL AND scheduled_at > NOW()`).

**What group-classes-schedule-view.md says:**
> only `class_instances` with `type = 'GROUP'`, `status = 'SCHEDULED'`, and `deleted_at IS NULL` are visible.

**Conflict:** `trainer-discovery.md` was written before `group-classes-schedule-view.md` added the `status` column to `class_instances`. The `classCount` definition in `trainer-discovery.md` uses `scheduled_at > NOW()` as a proxy for "scheduled/active", but the correct filter after `V15`/`V18` is `status = 'SCHEDULED'`. A class with `status = 'CANCELLED'` but `scheduled_at > NOW()` would be incorrectly counted by the trainer-discovery definition.

**Recommended resolution:** `trainer-discovery.md` `classCount` definition should be updated to require `status = 'SCHEDULED'` in addition to `deleted_at IS NULL AND scheduled_at > NOW()`. The filter in `group-classes-schedule-view.md` is the canonical visibility rule.

---

### C-12: Trainer Photo Field Name — `profilePhotoUrl` (list DTO) vs. `photoUrl` (entity-image-management)
**Area:** Entity / API response field names
**SDDs involved:** `trainer-discovery.md` vs `entity-image-management.md`

**What trainer-discovery.md `TrainerDiscoveryResponse` DTO says:**
```kotlin
data class TrainerDiscoveryResponse(
    ...
    val profilePhotoUrl: String?,
    ...
)
```

**What entity-image-management.md says:**
> trainer response and discovery response continue to expose one resolved URL field (`photoUrl` / `profilePhotoUrl`)

and the trainer admin section refers to:
> trainer `profile_photo_url` remains readable for backward compatibility

**What member-home.md `GET /api/v1/trainers` response shows:**
```json
{
  "profilePhotoUrl": "https://cdn.example.com/trainers/jane.jpg"
}
```

**Conflict:** `entity-image-management.md` uses the shorthand `photoUrl / profilePhotoUrl` interchangeably and is ambiguous about the exact JSON key in the discovery response. The actual field name in `trainer-discovery.md` and `member-home.md` is `profilePhotoUrl`. This is a documentation ambiguity in `entity-image-management.md` rather than a hard contradiction, but it could cause the wrong key name to be used when the entity-image-management feature updates the trainer response DTO.

**Recommended resolution:** `entity-image-management.md` should be updated to consistently use `profilePhotoUrl` as the field name for the trainer discovery response to avoid ambiguity during implementation.

---

### C-13: Member Home — Inline Purchase vs. Navigate to `/plans`
**Area:** Navigation / UX flow
**SDDs involved:** `member-home.md` (original Section 4) vs `member-home.md` (Section 5a) vs `user-access-flow.md`

**What member-home.md Section 4 UI rules say:**
> `empty`: render `No active membership`, up to 3 teaser plans, inline purchase trigger using existing `PurchaseConfirmModal`, primary CTA `Browse plans`

**What member-home.md Section 5a says:**
> The actual implementation navigates to `/plans` with query params rather than embedding `PurchaseConfirmModal` inline. The `accessFlowNavigation` utility manages this round-trip.

**What user-access-flow.md says:**
> Replace Home teaser-card inline activation with `/plans` deep links:
> - `Compare all plans` → `/plans?source=home`
> - `View plan` → `/plans?source=home&highlight={planId}`

**Conflict:** The original member-home.md Section 4 specifies inline purchase on `/home` using `PurchaseConfirmModal`. Section 5a of the same file documents that the actual implementation replaced this with navigation to `/plans`. `user-access-flow.md` also mandates the `/plans` navigation flow. The contradiction is within `member-home.md` itself — two sections of the same document describe incompatible behaviour.

**Recommended resolution:** Section 5a and `user-access-flow.md` represent the final decided behaviour. Section 4 of `member-home.md` should be updated to remove the inline `PurchaseConfirmModal` pattern and replace it with the navigation-to-`/plans` pattern. Section 4 UI rules are stale relative to Section 5a.
