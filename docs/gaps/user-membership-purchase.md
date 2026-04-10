# Gap Report: user-membership-purchase
Date: 2026-04-06

---

## DOCS → CODE Gaps

### Missing Functionality

- **SDD §3 — `UserMembershipResponse` field mismatch with SDD spec.** The SDD specifies the DTO with exactly these fields: `id`, `userId`, `planId`, `planName`, `startDate`, `endDate`, `status`, `bookingsUsedThisMonth`, `maxBookingsPerMonth`, `createdAt`. The actual `UserMembershipResponse.kt` adds eleven undocumented fields: `userEmail`, `userFirstName`, `userLastName`, `userPhone`, `userDateOfBirth`, `userFitnessGoals`, `userPreferredClassTypes`, `userHasProfilePhoto`, `userProfilePhotoUrl`. The SDD response shape is incomplete for any downstream consumer.

- **SDD §3 — `getAllMemberships` service method signature diverges from SDD.** The SDD specifies `getAllMemberships(status: String?, userId: UUID?, pageable: Pageable)`. The implementation adds a fourth parameter `memberQuery: String?` enabling name-based search. The SDD method table does not list this parameter.

- **SDD §4 — `AdminMembershipsQuery` TypeScript type is missing `memberQuery`.** The SDD specifies `status`, `userId`, `page`, `size`, and `sort` only. The implemented type in `src/types/userMembership.ts` adds `memberQuery?: string`.

- **SDD §3 — `UserMembershipRepository` contains extra methods beyond the spec.** Methods `findAllByUserIdIn`, `findAllByUserIdInAndStatus`, `deleteAllByUserIds`, `deleteAllByPlanIds`, `findAccessibleActiveMembership`, and `findAccessibleActiveMembershipForUpdate` are all absent from the SDD §3 repository specification.

### Broken Flows

- **`findByUserIdAndStatus` vs. `findAccessibleActiveMembership` — two competing "find active" methods.** `UserMembershipService` uses `findByUserIdAndStatus(userId, "ACTIVE")` for `GET /me` and `DELETE /me`. The repository also exposes `findAccessibleActiveMembership` which additionally filters by `endDate >= today AND deletedAt IS NULL`. For memberships whose `endDate` has passed but whose `status` has not yet been flipped to EXPIRED by the scheduler, the two methods return different results. The PRD/SDD are clear that status-only is correct, but having both methods without documentation of which is authoritative creates latent risk when the Class Booking feature calls into this repository.

### Design Divergence

- **Admin filter bar label.** The design spec labels the second filter field "User ID" with placeholder "Paste user UUID...". The implementation labels it "Name or UUID" with placeholder "Search by first name, last name, or UUID". This reflects the undocumented `memberQuery` feature.

- **`AdminMembershipsTable` first column.** The design spec shows a truncated UUID string as the "User ID" first column. The implementation's first column is "Member" and renders an avatar (photo or initials), full name, email, and phone. Structurally divergent from the spec.

- **`AdminMembershipsTable` breakpoints.** The design spec specifies `hidden sm:table-cell` for User ID, Start date, End date, and Bookings. The implementation uses `hidden sm:table-cell` only for Plan, `hidden lg:table-cell` for Start date and End date, and `hidden xl:table-cell` for Bookings. More granular than spec.

- **Pagination controls hidden when `totalPages <= 1`.** The design spec renders `PaginationControls` unconditionally (with disabled buttons at boundaries). The implementation wraps them in `{totalPages > 1 && ...}`, hiding them entirely on a single-page result set. Omits the "Page 1 of 1" information.

- **`AdminMembershipDetailsModal` has no design spec.** A row-click detail modal is rendered in `AdminMembershipsPage` with no matching design spec component, no SDD section, and no benchmark citation.

### Missing Test Coverage

- AC 3: `POST /api/v1/memberships` without a Bearer token returns 401 `UNAUTHORIZED` — no E2E spec (MEM-14 only covers frontend redirect for GET `/membership`).
- AC 5: `POST /api/v1/memberships` with non-existent `planId` returns 404 `PLAN_NOT_FOUND` — no E2E spec.
- AC 7: `POST /api/v1/memberships` with missing/blank `planId` returns 400 `INVALID_PLAN_ID` — no E2E spec.
- AC 13: `GET /api/v1/admin/memberships` without ADMIN role returns 403 `ACCESS_DENIED` — MEM-16/MEM-17 assert frontend redirect only; no direct API-level assertion.
- AC 15: `DELETE /api/v1/admin/memberships/{membershipId}` on CANCELLED/EXPIRED returns 409 — MEM-23 covers via race condition; no direct API-level test.
- AC 16: `DELETE /api/v1/admin/memberships/{membershipId}` with non-existent ID returns 404 `MEMBERSHIP_NOT_FOUND` — no E2E spec.
- AC 18: Concurrent `POST /api/v1/memberships` results in exactly one ACTIVE membership — no concurrency E2E test (structurally difficult; the DB partial unique index is the hard guard).
- AC 21: `?sort` parameter round-tripping in pagination — MEM-21 does not assert sort behaviour.

---

## CODE → DOCS Gaps

### Undocumented Endpoints / Logic

- **`GET /api/v1/admin/memberships?memberQuery=<string>` is not in the SDD or PRD.** The controller accepts `memberQuery: String?` and the service resolves it via `userProfileRepository.findUserIdsByNameContainingIgnoreCase`. This is a name-search feature with no AC, no SDD entry, and no documented query parameter in the API contract.

- **`UserMembershipRepository.findAccessibleActiveMembership` and `findAccessibleActiveMembershipForUpdate` are not in the SDD.** These filter by `status = 'ACTIVE' AND endDate >= today AND deletedAt IS NULL` using `@Lock(PESSIMISTIC_WRITE)`. They appear to be provisioned for the Class Booking feature but are housed in this feature's repository without any cross-reference.

- **`UserMembershipRepository.deleteAllByUserIds` and `deleteAllByPlanIds` are not in the SDD.** These bulk `@Modifying @Query` methods appear to serve E2E cleanup or future admin operations. No SDD section documents them.

### Undocumented UI

- **`AdminMembershipDetailsModal.tsx`** (`frontend/src/components/membership/AdminMembershipDetailsModal.tsx`) — A full detail modal shown on table row click in `AdminMembershipsPage`. No design spec, no SDD section, no benchmark citation, no dedicated E2E coverage.

- **Member avatar / profile photo column in `AdminMembershipsTable`** — Renders an avatar (photo or initials), display name, email, and phone. No design spec counterpart; the spec specifies a truncated UUID string.

- **`PlansContextHeader` component in `PlansPage`** — Rendered when `accessGate.mode === 'authenticated'`. This context-aware header for authenticated users is not described in the design spec section for `/plans` modifications.

### Undocumented Behaviours

- **`PurchaseConfirmModal` — silent-success redirect on MEMBERSHIP_ALREADY_ACTIVE.** When the API returns 409 `MEMBERSHIP_ALREADY_ACTIVE` and `fetchMyMembership` confirms an active membership exists, the modal closes and navigates to `buildHomeMembershipPath('already-active')` without showing an inline error. Design Flow 5 says the modal should show the inline error. This alternate path is undocumented.

- **Pagination hidden when `totalPages <= 1`.** Controls are not rendered at all for single-page results. No design spec justification for this deviation.

- **Row-click opens `AdminMembershipDetailsModal`.** Clicking any table row (not just the Cancel button) opens a detail modal. This interaction model is absent from the design spec and SDD.

- **Avatar / profile photo async loading in admin table.** `AdminMembershipsPage` fetches profile photos and manages blob object URL lifecycles. Not documented in the SDD or design spec.

- **`buildHomeMembershipPath` utility.** Imported in `PurchaseConfirmModal` and `PlansPage`. This navigation helper has no SDD entry describing its logic or the routes it constructs.

### Untested Code Paths

- `UserMembershipService.getAllMemberships` with `memberQuery` resolving to a non-empty list of user IDs — no E2E test exercises name-based search.
- `UserMembershipService.getAllMemberships` early-return `Page.empty(pageable)` when `memberQuery` matches zero users.
- `AdminMembershipDetailsModal` — open, display, close, and the "cancel from detail modal" delegation to `AdminCancelMembershipModal` — no E2E spec.
- `findAccessibleActiveMembership` and `findAccessibleActiveMembershipForUpdate` — no call site exists in this feature's service; untested within this feature's scope.

---

## Suggested Fix Order

1. **Update `docs/sdd/user-membership-purchase.md` §3** — add the eleven user-profile fields to the `UserMembershipResponse` DTO spec. The API contract is incomplete without this; any new consumer building against the SDD will not know these fields exist.

2. **Document `memberQuery` in the SDD** — add the `?memberQuery=` query parameter to the `GET /api/v1/admin/memberships` endpoint spec in §2, update the `getAllMemberships` service method signature in §3, and add `memberQuery` to the `AdminMembershipsQuery` TypeScript type in §4.

3. **Add `AdminMembershipDetailsModal` to the design spec** — write a design section covering the component states (populated, loading, error), layout, the cancel-delegation flow, and a benchmark citation. Required by design-standards (no benchmark = incomplete).

4. **Clarify `findAccessibleActiveMembership` ownership** — either add a cross-reference comment in the SDD ("provisioned for Class Booking; see `docs/sdd/class-booking.md`") or move these methods to the Class Booking feature when that SDD is written. Prevents confusion about which query method is authoritative for this feature.

5. **Add E2E specs for AC 3, 5, 7, 16** — the unauthenticated POST, non-existent plan, blank planId, and non-existent membershipId paths are completely absent from the E2E suite.

6. **Reconcile the admin table "Member" column with the design spec** — either update `docs/design/user-membership-purchase.md` to reflect the avatar/name/email layout, or revert to the spec's truncated UUID column. Record the decision in the SDD.
