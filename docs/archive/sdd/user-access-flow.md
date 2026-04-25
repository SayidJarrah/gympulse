# SDD: User Access Flow

## Reference
- PRD: `docs/prd/user-access-flow.md`
- Design: `docs/design/user-access-flow.md`
- Related SDDs:
  - `docs/sdd/auth.md`
  - `docs/sdd/member-home.md`
  - `docs/sdd/membership-plans.md`
  - `docs/sdd/user-membership-purchase.md`
- Date: 2026-04-04

## Architecture Overview
User Access Flow is an orchestration feature for authenticated `USER` accounts. It does not add a
new GymFlow domain object, database table, or backend entitlement rule. Instead, it formalizes how
the existing auth, membership, member-home, and membership-plan features are composed into one
state-aware logged-in journey centered on `/home`.

The current codebase already contains most of the required building blocks:
- `/home` exists and is already the post-login destination for authenticated `USER` accounts
- `GET /api/v1/memberships/me` is the current membership source of truth
- `GET /api/v1/membership-plans` already powers plan discovery
- `POST /api/v1/memberships` already activates membership without a fresh login
- Member Home already renders membership, trainer, and classes preview sections

This SDD therefore focuses on navigation, routing, and presentation orchestration rather than new
business logic.

Layers affected: **Frontend**.

Key design decisions:
- `/home` remains the only primary post-login destination for authenticated `USER` accounts.
- The authenticated primary navigation removes `Plans` as a top-level item and keeps `Home`,
  `Schedule`, `Trainers`, `My Favorites`, and `Profile`.
- The membership access section becomes the first major content block on `/home`; introductory hero
  content may remain only if it is visually subordinate and does not precede membership as a peer
  section.
- `/plans` remains the dedicated comparison and purchase route, but only as a secondary surface
  reached from `Home` or a direct bookmark.
- Authenticated users with an `ACTIVE` membership who open `/plans` are immediately redirected to
  `/home?membershipBanner=already-active#membership`.
- Users without an `ACTIVE` membership can still use `/plans`; the page receives authenticated
  context and a back link to `/home#membership`.
- The Home teaser cards are discovery-only. They deep-link into `/plans` and do not open the
  purchase modal inline on `/home`.
- Purchase success returns to `/home?membershipBanner=activated#membership`, where the existing
  membership store re-renders the page in the `ACTIVE` state without a new login.
- Banner context and highlighted-plan context are URL-derived so the flow survives refreshes,
  bookmarks, and deep links.

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

No new backend endpoints, DTOs, or error codes are required. User Access Flow reuses existing
contracts unchanged and moves the orchestration into the React app.

> **Cross-reference — onboarding gate:**
> `docs/sdd/onboarding-flow.md §4.2` documents an onboarding gate that intercepts `USER` role
> post-login navigation. A newly-registered USER is redirected from `/home` to `/onboarding`
> by `UserRoute` until their `onboardingCompletedAt` field is set. The sequence is:
> login → `/home` → onboarding gate fires → `/onboarding`. This SDD documents the login
> redirect target as `/home`, which remains correct; the gate is applied by `UserRoute`
> downstream of the redirect. Engineers modifying login or auth routes should consult
> `onboarding-flow.md §4.2` for the full gate behaviour.

### POST /api/v1/auth/login
**Auth:** None.

**Contract Change:** None.

**Frontend usage:**
1. Keep the current role-aware redirect:
   - `ADMIN` -> `/admin/plans`
   - `USER` -> `/home`
2. Do not add a backend-managed redirect field to the response.

### GET /api/v1/memberships/me
**Auth:** Required (`USER` role).

**Contract Change:** None.

**Frontend usage:**
1. `200` with an `ACTIVE` membership means:
   - `/home` renders the active membership summary
   - `/plans` redirects to `/home?membershipBanner=already-active#membership`
2. `404 NO_ACTIVE_MEMBERSHIP` is an expected state, not a page-level failure:
   - `/home` renders the inactive membership preview
   - `/plans` remains available for authenticated comparison and purchase
3. Other errors remain retryable UI failures.

### GET /api/v1/membership-plans
**Auth:** Optional.

**Contract Change:** None.

**Frontend usage:**
1. `/plans` continues to use the full active-plan catalogue as the source of truth.
2. `/home` uses the same endpoint for teaser cards and limits the rendered subset to three cards at
   the presentation layer.
3. Initial teaser ranking uses the existing endpoint ordering so no second highlighted-plan model or
   admin curation field is introduced in this feature.

### POST /api/v1/memberships
**Auth:** Required (`USER` role).

**Contract Change:** None.

**Frontend usage:**
1. A successful purchase from `/plans` navigates to
   `/home?membershipBanner=activated#membership`.
2. A stale purchase attempt that returns `MEMBERSHIP_ALREADY_ACTIVE` triggers a membership refresh:
   - if `GET /memberships/me` now resolves to an active membership, redirect to
     `/home?membershipBanner=already-active#membership`
   - otherwise keep the existing modal-level error state

### Existing Member Home Preview Endpoints
The following existing contracts are reused unchanged on `/home`:
- `GET /api/v1/member-home/classes-preview`
- `GET /api/v1/trainers`

No access-flow-specific backend aggregator is introduced.

---

## 3. Backend Files / Classes to Create or Modify

None.

Implementation notes:
- Do not add a `UserAccessFlowController`, service, or migration. This feature is not a new backend
  bounded context.
- Keep membership status as the sole entitlement source of truth. The frontend should derive access
  decisions from existing auth and membership contracts instead of duplicating status state.
- Legacy `/plans` bookmark handling stays client-side inside the SPA route flow.

---

## 4. Frontend Components to Create or Modify

### Routes
| Route | Component | Purpose |
|------|-----------|---------|
| `/home` | `MemberHomePage` | Primary authenticated `USER` landing route with membership access as the first major content block |
| `/plans` | `PlansPage` | Public plan catalogue for guests and authenticated comparison surface for users without an `ACTIVE` membership |

### New Components / Hooks / Utilities
| File | Type | Purpose |
|------|------|---------|
| `frontend/src/components/home/MembershipAccessBanner.tsx` | component | Renders one-time success/info banners above the Home membership section |
| `frontend/src/components/plans/PlansContextHeader.tsx` | component | Adds `Back to Home`, authenticated comparison title, and secondary-route context on `/plans` |
| `frontend/src/hooks/usePlansAccessGate.ts` | hook | Resolves whether `/plans` should render public content, authenticated comparison content, a loading state, or an active-member redirect |
| `frontend/src/utils/accessFlowNavigation.ts` | utility | Builds and parses `membershipBanner`, `source`, and `highlight` URL parameters consistently |

### Modified Files
| File | Change |
|------|--------|
| `frontend/src/components/layout/Navbar.tsx` | Remove authenticated top-level `Plans`; keep guest/public `Plans`; always expose the authenticated `USER` destinations required by the PRD |
| `frontend/src/pages/home/MemberHomePage.tsx` | Move membership access ahead of other major Home sections, consume one-time banner query params, and anchor banner flows to `#membership` |
| `frontend/src/components/home/MembershipPrimaryCard.tsx` | Change inactive teaser CTAs from inline activation to `/plans` deep links; keep active summary focused and catalogue-free |
| `frontend/src/components/home/MemberHomeHero.tsx` | Demote or reorder hero content so it does not compete with the membership section as the first major block |
| `frontend/src/pages/plans/PlansPage.tsx` | Add authenticated secondary-route header, highlighted-plan support, and active-member redirect behavior |
| `frontend/src/components/plans/PlanCard.tsx` | Support optional highlighted styling and a lightweight `Highlighted on Home` treatment when routed from the Home preview |
| `frontend/src/components/membership/PurchaseConfirmModal.tsx` | Standardize post-purchase redirect to Home banner URLs and keep modal-level purchase errors intact |
| `frontend/src/pages/home/__tests__/MemberHomePage.test.tsx` | Update for banner handling and Home-to-Plans teaser navigation |
| `frontend/src/pages/plans/*` tests | Add route-gating and authenticated comparison coverage |
| `frontend/src/components/layout/*` tests | Add authenticated-navbar coverage for the removed `Plans` tab |

### State Design
No new global Zustand store is required.

State rules:
- Reuse `useAuthStore()` for authenticated user role.
- Reuse `useMembershipStore()` as the only source of truth for current membership state and
  purchase updates.
- Use URL state, not global state, for transient access-flow context:
  - `/home?membershipBanner=activated#membership`
  - `/home?membershipBanner=already-active#membership`
  - `/plans?source=home`
  - `/plans?source=home&highlight={planId}`
- Banner query params are consumed once on `MemberHomePage` and then removed with `replace`
  navigation so they do not reappear on normal in-app back/forward movement.
- Highlight query params on `/plans` are presentation-only and may remain in the URL.

### Home (`/home`) Render Order

The DOM order of major content blocks on `/home` is:

1. **`<section id="membership">`** — the membership access section is the first major content block
   rendered on the page. It is the primary purpose of the `/home` route for authenticated users.
2. **`<MemberHomeHero>`** — renders immediately after `<section id="membership">`, not before it.
   It is visually subordinate: it provides introductory or motivational copy but must not compete
   with membership as the opening peer block.
3. **`<QuickActionsPanel>`** — renders between `<MemberHomeHero>` and the trainer carousel. It
   provides a set of shortcut action tiles (e.g. browse schedule, find trainers) so members can
   navigate to secondary surfaces without scrolling through the full page.
4. **Trainer carousel** — renders after `<QuickActionsPanel>`.

This order is non-negotiable: any refactor that moves `<MemberHomeHero>` above
`<section id="membership">` violates the design intent of this feature.

### Home (`/home`) Behaviour
1. `MemberHomePage` resolves current membership through `useMembershipStore`.
2. The first major content block is the membership access section.
3. If membership is `ACTIVE`:
   - show the current plan summary
   - show operational CTAs only: `Manage membership` and `Open schedule`
   - hide inline plan discovery and hide `Compare all plans`
4. If `GET /memberships/me` returns `NO_ACTIVE_MEMBERSHIP`:
   - show the inactive membership preview
   - fetch plan data from the existing plans endpoint
   - render up to three teaser cards
   - primary CTA: `Compare all plans` -> `/plans?source=home`
   - card CTA: `View plan` -> `/plans?source=home&highlight={planId}`
5. If the plan catalogue is empty:
   - replace teaser cards with the unavailable state
   - keep the section readable and retryable
6. If `membershipBanner=activated`, show:
   - title: `Membership activated`
   - body: `Your access is live and class booking is now available.`
7. If `membershipBanner=already-active`, show:
   - body: `Your membership is already active. Manage your current access here.`

### Plans (`/plans`) Behaviour
The same route serves three valid contexts:

1. **Guest**
   - sees the existing public catalogue treatment
   - no back-to-home authenticated header
   - no purchase redirect changes

2. **Authenticated user without an ACTIVE membership**
   - sees `PlansContextHeader` with `Back to Home`
   - sees the authenticated comparison copy from the design spec
   - can purchase from this page
   - if `highlight` is present, visually emphasize the matching card only

3. **Authenticated user with an ACTIVE membership**
   - do not render the grid body
   - immediately redirect with `replace` to `/home?membershipBanner=already-active#membership`
   - avoid an intermediate empty state or a visible one-frame flash of the plans grid

### Navigation Rules
- Guest / public shell:
  - may continue to show `Plans`
- Authenticated `USER` shell:
  - show `Home`, `Schedule`, `Trainers`, `My Favorites`, `Profile`
  - do not show `Plans`
- The absence of a `Plans` nav item must hold on both desktop and mobile navigation.
- `PlansPage` must not rely on a highlighted nav tab because the route is secondary, not primary.

### Error Handling
| Condition | UI behavior |
|-----------|-------------|
| `NO_ACTIVE_MEMBERSHIP` on `/home` | Render the inactive membership preview |
| `NO_ACTIVE_MEMBERSHIP` on `/plans` | Treat as eligible authenticated comparison state |
| empty active-plan catalogue | Render `No plans available right now` in Home or Plans context as appropriate |
| generic membership fetch failure | Retryable membership error state on Home |
| generic plan fetch failure | Retryable plan-grid error state on `/plans` |
| `PLAN_NOT_FOUND` / `PLAN_NOT_AVAILABLE` during purchase | Keep the existing purchase-modal error copy |
| `MEMBERSHIP_ALREADY_ACTIVE` during purchase | Refresh membership state, then redirect to Home banner if the user now has an active membership |

---

## 5. Task List per Agent

### -> frontend-dev
- [ ] Remove `Plans` from the authenticated `USER` navbar on desktop and mobile while preserving the public guest link.
- [ ] Ensure `Home` remains visually primary and that the membership access section is the first major block on `/home`.
- [ ] Add one-time Home banner handling using URL params plus `#membership`.
- [ ] Replace Home teaser-card inline activation with `/plans` deep links:
  - `Compare all plans` -> `/plans?source=home`
  - `View plan` -> `/plans?source=home&highlight={planId}`
- [ ] Add `/plans` access gating so active members redirect to Home and non-members still see the authenticated comparison flow.
- [ ] Add the authenticated `/plans` context header with `Back to Home`.
- [ ] Add optional highlighted-card styling on `/plans` when a `highlight` query param is present.
- [ ] Standardize purchase success return to `/home?membershipBanner=activated#membership`.
- [ ] Keep using existing stores and APIs; do not introduce a new access-flow Zustand slice.
- [ ] Add or update tests for:
  - authenticated login redirect to `/home`
  - authenticated navbar without `Plans`
  - `/plans` redirect for active members
  - Home teaser navigation to `/plans`
  - purchase success return banner on `/home`
  - direct `/plans` access for a user with `NO_ACTIVE_MEMBERSHIP`

### -> backend-dev
- [ ] No API or schema work is required.
- [ ] Verify that existing membership endpoints and error codes remain unchanged while frontend work is implemented.

---

## 6. Risks & Notes

- The largest implementation risk is route flicker on `/plans`. The access gate must wait for the
  membership check to settle before rendering the grid or redirecting.
- Because `/plans` serves both public and authenticated contexts, the page should centralize its
  auth and membership branching logic in one hook or wrapper instead of duplicating conditional
  checks across subcomponents.
- This SDD intentionally does not add a separate highlighted-plans API. Home preview cards and the
  authenticated comparison route must continue to consume the same active plan catalogue.
- `My Favorites` remains part of the authenticated navigation set, but the deeper entitlement UX for
  favorites without an active membership stays owned by the trainer feature. That follow-up is out
  of scope here unless product revises that journey explicitly.
- Existing backend security remains authoritative. Frontend route redirects are UX behavior only and
  must not be treated as a substitute for server-side authorization.
