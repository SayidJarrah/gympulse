# SDD: Member Home

## Reference
- PRD: `docs/prd/member-home.md`
- Date: 2026-04-04

## Architecture Overview
Member Home adds a new authenticated `USER` route at `/home` and composes existing GymFlow member data into one post-login surface. The page does not introduce a new aggregate table or denormalized cache. It reuses the existing membership, membership plans, and trainer discovery sources of truth directly, and adds one lightweight backend preview endpoint for upcoming classes because the existing full schedule endpoint is intentionally membership-gated and uses a broader schedule contract than the home carousel needs.

Layers affected: **Backend / Frontend**.

Key design decisions:
- Do **not** add a monolithic `GET /api/v1/member-home` backend aggregator. Section-level loading, retry, and partial-failure tolerance are simpler and more robust when the frontend orchestrates independent data sources.
- Reuse `GET /api/v1/memberships/me` for the membership summary and empty-state detection.
- Reuse `GET /api/v1/membership-plans` for up to 3 teaser plans when the user has no active membership.
- Reuse `GET /api/v1/trainers` for the trainer carousel with fixed preview params.
- Add `GET /api/v1/member-home/classes-preview` for the classes carousel so home can remain visible to authenticated users without an active membership while `/schedule` stays gated by active membership.
- Reuse the existing `PurchaseConfirmModal` inline on `/home` for teaser-plan activation so a successful purchase updates Member Home to the ACTIVE state without forcing navigation away from the page.

---

## 1. Database Changes

### New Tables
None.

### Modified Tables
None.

### Flyway Migration
None.

---

## 2. Backend API Contract

Existing endpoints reused unchanged by this feature:
- `GET /api/v1/memberships/me`
- `GET /api/v1/membership-plans`
- `GET /api/v1/trainers`

One new endpoint is required for the classes preview:
- `GET /api/v1/member-home/classes-preview`

### GET /api/v1/memberships/me
**Auth:** Required (`USER` role)

**Request Body:** None.

**Success Response (200):**
```json
{
  "id": "4f7f1b6d-bdc9-4491-85d2-5ad9d97ae4ab",
  "userId": "0bf8a961-d42a-46e7-bd95-1f76673a876f",
  "userEmail": "member@example.com",
  "userFirstName": "Daria",
  "userLastName": "Korn",
  "userPhone": "+48123123123",
  "userDateOfBirth": "1994-06-14",
  "userFitnessGoals": ["Strength", "Mobility"],
  "userPreferredClassTypes": ["Yoga", "Pilates"],
  "userHasProfilePhoto": true,
  "userProfilePhotoUrl": "/api/v1/profile/me/photo",
  "planId": "6e0ddf06-4c7f-43f0-9c87-0fc4f1f14f4c",
  "planName": "Monthly Plus",
  "startDate": "2026-04-01",
  "endDate": "2026-05-01",
  "status": "ACTIVE",
  "bookingsUsedThisMonth": 2,
  "maxBookingsPerMonth": 10,
  "createdAt": "2026-04-01T09:00:00Z"
}
```

**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 401 | `UNAUTHORIZED` | No valid Bearer token |
| 404 | `NO_ACTIVE_MEMBERSHIP` | Caller has no active membership row |

**Business Logic:**
1. Reuse the existing `UserMembershipController` and `UserMembershipService.getMyActiveMembership`.
2. Member Home treats `404 NO_ACTIVE_MEMBERSHIP` as the expected empty-state signal, not as a page-level failure.
3. No contract changes are required for this feature.
4. Idempotency: read-only GET.

### GET /api/v1/membership-plans
**Auth:** Optional

**Query Parameters used by Member Home:**
- `page=0`
- `size=3`
- `sort=createdAt,desc`

**Request Body:** None.

**Success Response (200):**
```json
{
  "content": [
    {
      "id": "6e0ddf06-4c7f-43f0-9c87-0fc4f1f14f4c",
      "name": "Monthly Plus",
      "description": "Unlimited gym access and group classes.",
      "priceInCents": 5900,
      "durationDays": 30,
      "maxBookingsPerMonth": 10,
      "status": "ACTIVE",
      "createdAt": "2026-03-15T09:00:00Z",
      "updatedAt": "2026-03-15T09:00:00Z"
    }
  ],
  "totalElements": 3,
  "totalPages": 1,
  "number": 0,
  "size": 3
}
```

**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 401 | `UNAUTHORIZED` | Only if a bad token is sent and interceptor refresh fails; unauthenticated public access remains valid |

**Business Logic:**
1. Reuse the existing public plans endpoint unchanged.
2. Member Home calls this endpoint only after `GET /memberships/me` returns `NO_ACTIVE_MEMBERSHIP`.
3. The first 3 active plans are used as teaser cards in the empty membership state.
4. If `content` is empty, Member Home renders the no-plans-available state instead of purchase CTAs.
5. Idempotency: read-only GET.

### GET /api/v1/trainers
**Auth:** Required (any authenticated user; Member Home calls it only from the `USER` route)

**Query Parameters used by Member Home:**
- `page=0`
- `size=6`
- `sort=experienceYears,desc`

**Request Body:** None.

**Success Response (200):**
```json
{
  "content": [
    {
      "id": "c175f7f6-1629-48de-8ab9-6dc24e116d0b",
      "firstName": "Jane",
      "lastName": "Smith",
      "profilePhotoUrl": "/api/v1/trainers/c175f7f6-1629-48de-8ab9-6dc24e116d0b/photo",
      "specializations": ["Yoga", "Pilates"],
      "experienceYears": 8,
      "classCount": 6,
      "isFavorited": true
    }
  ],
  "totalElements": 12,
  "totalPages": 2,
  "number": 0,
  "size": 6
}
```

**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 400 | `INVALID_SORT_FIELD` | Backend rejects an unexpected sort value |
| 401 | `UNAUTHORIZED` | No valid Bearer token |

**Business Logic:**
1. Reuse the existing trainer discovery list endpoint unchanged.
2. Member Home uses a fixed editorial sort (`experienceYears,desc`) and ignores filters and pagination controls.
3. The supporting text on each home card is derived from existing trainer data:
   `experienceYears != null ? "{n} yrs experience" : "Experience not specified"`.
4. The preview carousel displays at most 6 trainers; the section CTA routes to `/trainers`.
5. Idempotency: read-only GET.

### GET /api/v1/member-home/classes-preview
**Auth:** Required (`USER` role only). Active membership is **not** required for this preview endpoint.

**Query Parameters:**
- `timeZone` required, IANA timezone name from the user device, e.g. `Europe/Warsaw`

**Request Body:** None.

**Success Response (200):**
```json
{
  "timeZone": "Europe/Warsaw",
  "rangeStartDate": "2026-04-04",
  "rangeEndDateExclusive": "2026-04-18",
  "entries": [
    {
      "id": "fd5c4958-37bf-470d-a13e-30b4d4a04dd5",
      "name": "Yoga Flow",
      "scheduledAt": "2026-04-05T16:00:00Z",
      "localDate": "2026-04-05",
      "durationMin": 60,
      "trainerDisplayName": "Jane Smith",
      "classPhotoUrl": "/api/v1/class-templates/8d827873-a91d-4a3b-a718-2bb9b3ee5baf/photo"
    },
    {
      "id": "d7f748bb-a867-4b80-a5dd-33e19c14a91d",
      "name": "Pilates Core",
      "scheduledAt": "2026-04-06T08:30:00Z",
      "localDate": "2026-04-06",
      "durationMin": 45,
      "trainerDisplayName": "Trainer TBA",
      "classPhotoUrl": null
    }
  ]
}
```

Response rules:
- `entries` are sorted by `scheduledAt ASC`
- maximum response size is fixed at `8` entries; no client-supplied `limit`
- only classes with `type = 'GROUP'`, `status = 'SCHEDULED'`, `deleted_at IS NULL`, and `scheduled_at > NOW()` are returned
- `rangeStartDate` is the current local date in the supplied `timeZone`
- `rangeEndDateExclusive` is `rangeStartDate.plusDays(14)`
- empty preview window returns `200` with `entries: []`
- `trainerDisplayName` rules:
  - no trainers -> `Trainer TBA`
  - one trainer -> full name
  - multiple trainers -> first alphabetical full name plus ` +{n}` suffix

**Error Responses:**
| Status | Error Code | Condition |
|--------|-----------|-----------|
| 400 | `INVALID_TIME_ZONE` | `timeZone` missing or not a valid IANA timezone |
| 401 | `UNAUTHORIZED` | No valid Bearer token |
| 403 | `ACCESS_DENIED` | Caller is authenticated but not `USER` |

**Business Logic:**
1. `@PreAuthorize("hasRole('USER')")` blocks admins and unauthenticated callers before any query work.
2. Parse `timeZone`; invalid or blank values throw `MemberHomeInvalidTimeZoneException`, mapped to `400 INVALID_TIME_ZONE`.
3. Compute `todayLocal = LocalDate.now(zoneId)` and `rangeEndLocalExclusive = todayLocal.plusDays(14)`.
4. Query candidate class instance IDs using a dedicated repository method constrained to:
   - `deleted_at IS NULL`
   - `type = 'GROUP'`
   - `status = 'SCHEDULED'`
   - `scheduled_at > NOW()`
   - `scheduled_at < rangeEndUtcExclusive`
   - ordered by `scheduled_at ASC`
   - `LIMIT 8`
5. If no IDs are found, return `entries: []` immediately.
6. Load the selected instances with trainers and class template in one follow-up query to avoid N+1 reads and avoid invalid pagination on a collection fetch join.
7. Sort trainer names alphabetically by last name then first name before computing `trainerDisplayName`.
8. Map each row to `MemberHomeClassPreviewItemResponse`:
   - `localDate = scheduledAt.atZoneSameInstant(zoneId).toLocalDate()`
   - `classPhotoUrl = "/api/v1/class-templates/{templateId}/photo"` when template photo exists; otherwise `null`
9. Return `MemberHomeClassPreviewResponse` with the requested `timeZone`, the 14-day preview window, and the ordered entries.
10. Transaction rule: `@Transactional(readOnly = true)`. The endpoint is idempotent and emits no events.

---

## 3. Backend Files / Classes to Create or Modify

### New Files
| File | Type | Purpose |
|------|------|---------|
| `backend/src/main/kotlin/com/gymflow/controller/MemberHomeController.kt` | REST controller | Exposes `GET /api/v1/member-home/classes-preview` for authenticated `USER` accounts |
| `backend/src/main/kotlin/com/gymflow/service/MemberHomeService.kt` | Service | Validates timezone, computes the preview window, executes the 2-step class preview query, and maps DTOs |
| `backend/src/main/kotlin/com/gymflow/dto/MemberHomeClassPreviewResponse.kt` | DTO | Defines `MemberHomeClassPreviewResponse` and `MemberHomeClassPreviewItemResponse` |
| `backend/src/main/kotlin/com/gymflow/exception/MemberHomeInvalidTimeZoneException.kt` | Exception | Feature-specific invalid-timezone exception mapped to `INVALID_TIME_ZONE` |
| `backend/src/test/kotlin/com/gymflow/service/MemberHomeServiceTest.kt` | Test | Covers timezone validation, 14-day window calculation, limiting to 8, `Trainer TBA`, and multi-trainer label formatting |
| `backend/src/test/kotlin/com/gymflow/controller/MemberHomeControllerTest.kt` | Test | Covers 200/400/401/403 contract behavior and JSON shape |

### Modified Files
| File | Change |
|------|--------|
| `backend/src/main/kotlin/com/gymflow/repository/ClassInstanceRepository.kt` | Add one ID-only preview query and one follow-up detail query for the selected IDs with trainers/template fetched |
| `backend/src/main/kotlin/com/gymflow/controller/GlobalExceptionHandler.kt` | Map `MemberHomeInvalidTimeZoneException` to `400 INVALID_TIME_ZONE` |

Implementation notes:
- Do not change `UserMembershipController`, `MembershipPlanController`, or `TrainerDiscoveryController`; Member Home reuses their contracts as-is.
- Do not relax the existing `/api/v1/class-schedule` membership gate. The new home preview endpoint is intentionally narrower and read-only.
- Keep transaction boundaries in `MemberHomeService.getUpcomingClassesPreview` only; the controller stays thin.

---

## 4. Frontend Components to Create or Modify

### Pages
| Route | Component | Purpose |
|------|-----------|---------|
| `/home` | `MemberHomePage` | Default logged-in destination for `USER` accounts; renders hero, membership card, trainer preview, classes preview, and quick actions |

### New Components
| Component | Location | Props |
|-----------|----------|-------|
| `MemberHomeHero` | `frontend/src/components/home/` | `{ firstName: string | null; hasActiveMembership: boolean; activePlanName: string | null; stats: { label: string; value: string }[] }` |
| `MembershipPrimaryCard` | `frontend/src/components/home/` | `{ membership: UserMembership | null; availablePlans: MembershipPlan[]; mode: 'loading' | 'active' | 'empty' | 'error'; errorMessage: string | null; onRetryMembership: () => void; onBrowsePlans: () => void; onManageMembership: () => void; onExploreClasses: () => void; onSelectPlan: (plan: MembershipPlan) => void }` |
| `QuickActionsPanel` | `frontend/src/components/home/` | `{ hasActiveMembership: boolean; onScrollToClasses: () => void }` |
| `TrainerPreviewCarousel` | `frontend/src/components/home/` | `{ trainers: TrainerDiscoveryResponse[]; loading: boolean; errorMessage: string | null; onRetry: () => void }` |
| `ClassPreviewCarousel` | `frontend/src/components/home/` | `{ entries: MemberHomeClassPreviewItem[]; timeZone: string; loading: boolean; errorMessage: string | null; onRetry: () => void }` |
| `MemberHomeSectionErrorCard` | `frontend/src/components/home/` | `{ title: string; body: string; onRetry: () => void }` |
| `MemberHomeSectionEmptyCard` | `frontend/src/components/home/` | `{ title: string; body: string }` |

### New Types
```ts
export interface MemberHomeClassPreviewItem {
  id: string
  name: string
  scheduledAt: string
  localDate: string
  durationMin: number
  trainerDisplayName: string
  classPhotoUrl: string | null
}

export interface MemberHomeClassPreviewResponse {
  timeZone: string
  rangeStartDate: string
  rangeEndDateExclusive: string
  entries: MemberHomeClassPreviewItem[]
}

export interface GetMemberHomeClassesPreviewParams {
  timeZone: string
}

export interface MemberHomeQuickAction {
  id: 'manage-membership' | 'browse-plans' | 'open-schedule' | 'see-trainers' | 'jump-to-classes'
  label: string
  description: string
  to?: string
}
```

### New API Functions
- `getMemberHomeClassesPreview(params: GetMemberHomeClassesPreviewParams): Promise<MemberHomeClassPreviewResponse>`
- `getMemberHomeTrainerPreview(): Promise<TrainerDiscoveryResponse[]>`
- `getMemberHomePlanTeasers(): Promise<MembershipPlan[]>`

Exact behavior:
- `getMemberHomeClassesPreview` calls `GET /member-home/classes-preview`
- `getMemberHomeTrainerPreview` wraps `listTrainers({ page: 0, size: 6, sort: 'experienceYears,desc' })` and returns `content`
- `getMemberHomePlanTeasers` wraps `getActivePlans(0, 3, 'createdAt,desc')` and returns `content`

### State
No new global Zustand store is required.

State design:
- Reuse `useMembershipStore()` as the source of truth for the current membership and purchase updates.
- Add Member Home-specific hooks under `frontend/src/hooks/`:
  - `useMemberHomeMembershipSection()`
  - `useMemberHomeTrainerPreview()`
  - `useMemberHomeClassesPreview()`
- Keep trainer preview, plan teaser, and class preview state local to the page via those hooks:
  - `data`
  - `loading`
  - `error`
  - `errorCode`
  - `retry()`

UI rules:
- Login redirect for `USER` becomes `/home` instead of `/plans`.
- `ADMIN` login redirect remains `/admin/plans`.
- Add `Home` to the authenticated user navbar and point landing-page “portal/member area” actions to `/home`.
- `/home` must use `UserRoute`; unauthenticated users go to `/login`; admins go to `/admin/plans`.
- Hero renders immediately from auth/profile data and must not wait on the trainer/classes calls.
- Membership section is always the first primary content section.
- Membership section modes:
  - `loading`: render skeleton card
  - `active`: render current plan summary and CTA buttons `Manage membership` (`/membership`) and `Explore classes` (`/schedule`)
  - `empty`: render `No active membership`, up to 3 teaser plans, inline purchase trigger using existing `PurchaseConfirmModal`, primary CTA `Browse plans`
  - `empty + no plans`: render unavailable copy, no inline activation button
  - `error`: render retryable membership error card only
- Trainer section modes:
  - `loading`: 3 skeleton cards
  - `empty`: `No trainers to show yet`
  - `error`: `Could not load trainers right now.` with Retry
  - `success`: horizontal carousel of up to 6 cards plus `See all trainers`
- Classes section modes:
  - `loading`: 3 skeleton cards
  - `empty`: `No upcoming classes`
  - `error`: `Could not load upcoming classes right now.` with Retry
  - `success`: horizontal carousel of up to 8 cards plus `See full schedule`
- Quick actions are frontend-derived only:
  - active membership: `Manage membership`, `Open schedule`, `See all trainers`
  - no active membership: `Browse plans`, `See all trainers`, `Jump to classes`

Backend error handling in UI:
- `NO_ACTIVE_MEMBERSHIP`: render the membership empty state, not a toast/banner
- `PLAN_NOT_FOUND` / `PLAN_NOT_AVAILABLE`: show existing modal-level purchase error copy inline
- `INVALID_SORT_FIELD`: show section error card and allow retry
- `INVALID_TIME_ZONE`: show classes section error card; retry uses the latest `useScheduleTimeZone()` value
- `UNAUTHORIZED`: handled by route guard / auth refresh flow; Member Home should not render stale protected content

Form and interaction constraints:
- No new free-text forms are introduced in this feature.
- Inline activation on Member Home must reuse the existing purchase confirmation modal and existing plan activation API.
- Carousel controls must support pointer click and touch swipe; page root must keep `overflow-x-hidden` so no page-level horizontal overflow appears at 360 px width.

---

## 5. Task List per Agent

### → backend-dev
- [ ] Create `MemberHomeController`, `MemberHomeService`, `MemberHomeClassPreviewResponse`, and `MemberHomeInvalidTimeZoneException`.
- [ ] Add `GET /api/v1/member-home/classes-preview` with `@PreAuthorize("hasRole('USER')")`.
- [ ] Add repository methods in `ClassInstanceRepository` for:
  - ordered preview ID selection limited to 8
  - detail fetch by selected IDs with trainers and template eagerly loaded
- [ ] Implement service logic to validate IANA timezone input, compute the 14-day preview window, exclude past classes with `scheduled_at > NOW()`, and map `trainerDisplayName`.
- [ ] Reuse existing `SCHEDULED` / `GROUP` / `deletedAt IS NULL` visibility rules from the member schedule feature; do not duplicate business constants in multiple places.
- [ ] Map `MemberHomeInvalidTimeZoneException` to `400 INVALID_TIME_ZONE` in `GlobalExceptionHandler`.
- [ ] Add service tests for:
  - invalid timezone
  - empty result
  - trainer fallback to `Trainer TBA`
  - multi-trainer display label
  - result cap of 8
  - ordering by `scheduledAt ASC`
- [ ] Add controller tests for 200, 400, 401, and 403 responses.
- [ ] Verify no schema migration is added.

### → frontend-dev
- [ ] Add `/home` route in `App.tsx` behind `UserRoute`.
- [ ] Create `MemberHomePage` plus `components/home/*` pieces for hero, membership card, quick actions, trainer carousel, class carousel, section empty card, and section error card.
- [ ] Add `frontend/src/types/memberHome.ts` with the exact preview types from this SDD.
- [ ] Add `frontend/src/api/memberHome.ts` with:
  - `getMemberHomeClassesPreview`
  - `getMemberHomeTrainerPreview`
  - `getMemberHomePlanTeasers`
- [ ] Add page-scoped hooks for membership section orchestration, trainer preview, and class preview. Reuse `useMembershipStore` instead of cloning membership state.
- [ ] Reuse `PurchaseConfirmModal` inline from Member Home teaser plans so successful purchase updates the page to ACTIVE without navigation.
- [ ] Keep `/membership` as the detailed membership-management page; do not delete or replace it.
- [ ] Update login success redirect for `USER` from `/plans` to `/home`.
- [ ] Update authenticated-member landing CTAs from `/membership` to `/home`.
- [ ] Add `Home` to the user navbar and keep admin navigation unchanged.
- [ ] Ensure the page uses `overflow-x-hidden` at the root and that carousel rails do not create page-level overflow at 360 px width.
- [ ] Map backend errors exactly:
  - `NO_ACTIVE_MEMBERSHIP` -> membership empty state
  - `PLAN_NOT_FOUND` / `PLAN_NOT_AVAILABLE` -> existing purchase modal error
  - trainer/classes generic failure -> section retry cards
- [ ] Write page tests for:
  - USER login lands on `/home`
  - membership ACTIVE state
  - no-membership state with teaser plans
  - no-plans-available state
  - trainer section error isolated from membership/classes
  - classes section error isolated from membership/trainers
  - successful inline purchase refreshes the membership card to ACTIVE
  - admin hitting `/home` is redirected to `/admin/plans`

---

## 5a. Post-Purchase Flow: `accessFlowNavigation` Protocol

This section documents the implementation of PRD AC 24 ("Home page updates to ACTIVE state after purchase").

The actual implementation navigates to `/plans` with query params rather than embedding `PurchaseConfirmModal` inline. The `accessFlowNavigation` utility in `frontend/src/utils/accessFlowNavigation.ts` manages this round-trip.

### URL construction

`buildPlansPath(options)` generates the URL for the plan browse/activate flow:
- `buildPlansPath({ source: 'home' })` → `/plans?source=home`
- `buildPlansPath({ source: 'home', highlight: planId })` → `/plans?source=home&highlight={planId}`

The `highlight` param signals to `PlansPage` that a specific plan should be visually emphasised on arrival.

### `membershipBanner` query param

After a successful plan activation on `/plans`, the user is returned to `/home` with a `membershipBanner` query param:

| Value | Meaning |
|-------|---------|
| `activated` | Plan was successfully purchased and activated |
| `already-active` | User attempted to activate but already had an active membership |

### Reading and stripping the banner param

On mount, `MemberHomePage` calls `getMembershipBanner(searchParams)` to read the current `membershipBanner` value from the URL. If a recognised value is found:
1. The banner state is set, causing `MembershipAccessBanner` to render.
2. `withoutMembershipBanner(searchParams)` strips the `membershipBanner` key from the URL.
3. `navigate({ …, search }, { replace: true })` replaces the history entry so the param is not visible on back-navigation or page refresh.

### Relationship to PRD AC 24

PRD AC 24 requires the home page to reflect ACTIVE membership after a purchase. This is satisfied by the round-trip: the membership section re-fetches on mount (the `useMemberHomeMembershipSection` hook re-runs), and the `activated` banner confirms to the user that the state change happened. The membership card transitions from `empty` mode to `active` mode during the same page load.

---

## 6. Risks & Notes
- The main product assumption carried into this SDD is that trainer and class previews are visible to any authenticated `USER`, including users without an active membership. This is consistent with `docs/design/member-home.md`, but the PRD still lists it as an open question.
- The full `/schedule` page remains membership-gated. Member Home preview visibility does not imply schedule entitlement.
- No backend aggregate endpoint is introduced on purpose. This keeps section failures isolated and avoids turning one upstream timeout into a page-wide failure.
- The inline activation pattern is a reuse of the existing purchase flow, not a new checkout system. If product later wants inline payment or plan comparison on `/home`, that is a separate feature.
- `QuickActionsPanel` is implemented as frontend-derived links only. No recommendation engine, analytics ranking, or personalized backend contract is part of this version.
- The trainer preview ordering is a product decision made here: `experienceYears,desc` for a more curated feel. If product wants alphabetical or manually curated trainers later, that requires a separate sorting rule or admin curation field.
- The classes preview query uses a 14-day window plus a hard cap of 8 entries. This keeps the carousel compact and predictable on mobile and desktop.
