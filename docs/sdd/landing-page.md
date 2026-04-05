# SDD: Public Landing Page

## Reference
- PRD: `docs/prd/landing-page.md`
- Date: 2026-03-29

## Architecture Overview
This feature replaces the current `/ -> /plans` redirect with a real public homepage at
`/`.

After design review, the landing page scope has been intentionally reduced. V1 is a
frontend-led page focused on:
- hero with auth-aware CTA
- membership plan preview
- short "how it works" section
- compact FAQ / policy block

The page should not depend on new public classes or trainers APIs. That keeps the
homepage clear for users and removes unnecessary backend work from the first iteration.

Layers affected: **DB** (no change), **Backend** (no new landing-specific endpoints),
**Frontend** (new `/` route, landing components, plans fetch, auth-aware CTA logic, SEO
and analytics utilities).

### Confirmed Decisions
- No dedicated homepage database tables or admin-managed content system in v1.
- No new backend endpoints are required for the landing page.
- Reuse the existing public `GET /api/v1/membership-plans` endpoint for live content.
- "How it works" and FAQ content are static, code-defined frontend content.
- The landing page must not link to unbuilt public schedule or trainer pages in v1.
- SEO for v1 is limited to document title and meta description updates in the SPA.
- Analytics is implemented as a small frontend abstraction that pushes structured events
  to `window.dataLayer` when present and otherwise no-ops.

---

## 1. Database Changes

### New Tables
None.

### Modified Tables
None.

### Migration Files
None.

No Flyway migration is required for this feature.

---

## 2. Backend API Contract

### Reused Endpoint: GET /api/v1/membership-plans

**Auth:** None

This existing endpoint remains the only live data source required by the landing page.
The landing page frontend should call it with `page=0`, `size=100`, and the existing
default sort so all active public plans appear in one request.

No contract change is required.

### New Endpoints

None.

### SecurityConfig Changes

None.

No new public endpoint is introduced, so `SecurityConfig.kt` does not need landing-page
changes in v1.

---

## 3. Backend Changes

### New Files
None.

### Modified Files
None required for landing-page v1.

### Notes
- If the existing membership plans endpoint already returns the required public fields,
  backend implementation work for this feature is effectively zero.
- If a future landing-page iteration needs classes or trainers, that should be a new SDD
  revision rather than silent scope growth in this version.

---

## 4. Frontend Components to Create

### Pages

| Route | Component | Location | Purpose |
|-------|-----------|----------|---------|
| `/` | `LandingPage.tsx` | `src/pages/landing/` | Public homepage with hero, plans preview, journey explanation, FAQ, and auth-aware CTAs |

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `LandingHeader.tsx` | `src/components/landing/` | Public header with logo, sign-in action, and auth-aware primary CTA |
| `HeroSection.tsx` | `src/components/landing/` | Above-the-fold value proposition and two-CTA layout |
| `PlansPreviewSection.tsx` | `src/components/landing/` | Renders active plans using existing membership-plan types |
| `HowItWorksSection.tsx` | `src/components/landing/` | Explains account -> membership -> booking flow |
| `FaqSection.tsx` | `src/components/landing/` | Compact FAQ or policy block |
| `LandingFooter.tsx` | `src/components/landing/` | Minimal footer with public links |
| `SectionAction.tsx` | `src/components/landing/` | Shared CTA button/link component for consistent hierarchy |

### New API Usage

The landing page should use the existing membership-plan API client rather than creating
new backend contracts.

If a dedicated file is helpful, create `src/api/landingPage.ts` with only a thin wrapper
around the existing public plans request. Do not add new landing-specific classes or
trainers API calls.

### New Hook

Create `src/hooks/useLandingPlans.ts` or `src/hooks/useLandingPageData.ts` with a narrow
scope:

```typescript
interface LandingPageData {
  plans: MembershipPlan[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

Implementation notes:
- Fetch only public plans.
- Avoid Zustand for landing-page content data; page-scoped state is enough.
- If plans fail to load, the rest of the page should still render because most sections
  are static.

### Auth-Aware CTA Resolution

Use existing `authStore` and `membershipStore` for CTA decisions. Do not duplicate auth
logic in landing-specific state.

Recommended helper:

```typescript
type LandingPrimaryAction =
  | { kind: "link"; label: string; to: string }
  | { kind: "disabled"; label: string; description: string };
```

Rules:
- Guest: primary CTA -> `/register`; secondary CTA -> `#plans` or `#journey`
- Authenticated USER without active membership: primary CTA -> `/plans`
- Authenticated USER with active membership: primary CTA -> `/membership`
- Authenticated ADMIN: primary CTA -> `/admin/plans`

To determine membership status:
- if `isAuthenticated === false`, do nothing
- if authenticated and `membershipStore` has not fetched yet, call `fetchMyMembership()`
- treat `membershipErrorCode === 'NO_ACTIVE_MEMBERSHIP'` as "signed in without active
  membership", not as a landing-page error state

### SEO Utility

Create `src/hooks/usePageMeta.ts` or `src/utils/seo.ts`:
- set `document.title`
- create or update `<meta name="description">`

No new dependency such as `react-helmet` is required for v1.

### Analytics Utility

Create `src/utils/analytics.ts`:

```typescript
export function trackEvent(
  event: string,
  payload?: Record<string, string | number | boolean | null>
): void
```

Implementation:
- if `window.dataLayer` exists, push `{ event, ...payload }`
- otherwise no-op

Minimum landing events:
- `landing_page_view`
- `landing_hero_primary_click`
- `landing_hero_secondary_click`
- `landing_plan_cta_click`
- `landing_sign_in_click`

### Route Changes

Update `src/App.tsx`:

```tsx
<Route path="/" element={<LandingPage />} />
```

Remove the current root redirect to `/plans`.

### Existing Component Modifications

| File | Change |
|------|--------|
| `src/components/layout/Navbar.tsx` | Change the logo target from `/plans` to `/` so the landing page is the public home |

---

## 5. Content Structure

The landing page should render these sections in this order:

1. `LandingHeader`
2. `HeroSection`
3. `PlansPreviewSection`
4. `HowItWorksSection`
5. `FaqSection`
6. `LandingFooter`

Optional small trust copy inside the hero or between hero and plans is acceptable, but
do not re-expand the page into separate classes, trainers, testimonials, or large
benefits grids in v1.

---

## 6. Task List per Agent

### backend-dev
- [ ] No required backend work for landing-page v1.
- [ ] Confirm the existing public membership plans endpoint returns all fields needed by
  the plan cards.

### frontend-dev
- [ ] Create `src/pages/landing/LandingPage.tsx`.
- [ ] Create landing components in `src/components/landing/`.
- [ ] Fetch active plans using the existing public membership plans API.
- [ ] Implement auth-aware CTA logic using `authStore` and `membershipStore`.
- [ ] Add section-level plans loading, empty, and retry states.
- [ ] Add static "how it works" and FAQ content blocks.
- [ ] Create `src/utils/analytics.ts` and wire the minimum events.
- [ ] Create `src/hooks/usePageMeta.ts` or equivalent SEO utility and apply it on the landing page.
- [ ] Update `src/App.tsx` to render `LandingPage` at `/`.
- [ ] Update `src/components/layout/Navbar.tsx` so the logo navigates to `/`.
- [ ] Keep the page visually focused; do not add extra sections beyond the approved v1 structure.
- [ ] Write component tests for:
  - guest CTA rendering
  - signed-in non-member CTA rendering
  - signed-in active-member CTA rendering
  - plans loading, empty, and error states
  - document title and meta description update on mount

### e2e-tester
- [ ] Add `frontend/e2e/landing-page.spec.ts`.
- [ ] Cover:
  - guest sees hero and plans on `/`
  - guest can navigate to `/register` and `/login`
  - signed-in user without membership sees `/plans` as the primary action
  - signed-in user with membership sees `/membership` as the primary action
  - plans empty state renders without console errors when the API returns no active plans

---

## 7. Auth-Aware CTA Resolution Matrix

### `resolveLandingActions` Resolution Logic

The `resolveLandingActions` helper in `src/utils/landingActions.ts` determines which CTA
actions are presented to the user based on their authentication and membership state.
Evaluation order matters — conditions are checked top to bottom and the first match wins.

| Condition | Primary CTA destination | Label |
|-----------|------------------------|-------|
| Not authenticated (guest) | `/register` | "Join GymFlow" / "Create account" |
| Authenticated, role = `ADMIN` | `/admin/plans` | "Manage plans" |
| Authenticated, `hasActiveMembership = true` | `/membership` | "Open member area" / "Go to portal" |
| Authenticated, `membershipLoading = true` | disabled | "Checking membership" |
| Authenticated, `membershipLoading = false`, `membershipErrorCode = null` (silent error fallback) | `/register` | "Join GymFlow" / "Create account" |
| Authenticated, `membershipErrorCode = 'NO_ACTIVE_MEMBERSHIP'` | `/plans` | "View membership plans" |
| Any other authenticated state | `/plans` | "View membership plans" |

#### Silent error fallback
When `membershipLoading` is `false` and `membershipErrorCode` is `null` but
`hasActiveMembership` is also `false`, it means the membership fetch either never fired or
failed without setting an error code. The user must not remain stuck on the disabled
"Checking membership" state. In this case the resolver falls through to the guest branch
(`/register`), keeping the CTA actionable.

### `LandingPlanAction` Type

```typescript
interface LandingPlanAction {
  label: string;
  to: string;
  variant: 'primary' | 'secondary';
}
```

The `variant` field controls button appearance in `PlansPreviewSection`:
- `'primary'` — filled green button (`bg-green-500`)
- `'secondary'` — outlined button (`border border-gray-700 bg-gray-900`)

### Footer Auth Links

`LandingFooter` always renders sign-in and register links regardless of authentication
state. These links are unconditional — they are not gated on `isAuthenticated`.

### Analytics: `landing_page_view`

The `landing_page_view` event fires **once on mount** via a `useEffect` with an empty
dependency array `[]`. It must not be re-fired on auth state changes. This is intentional
— the page view represents the initial render, not a reaction to state updates.

---

## 8. Risks & Notes

### Risk: The Page Becomes Overloaded Again During Implementation
The main failure mode here is quiet scope growth. If classes, trainers, testimonials, or
other marketing sections are added casually, the original problem returns.

Decision: keep the v1 page narrow and treat any additional public discovery section as a
separate, explicit product decision.

### Risk: The Existing Plans Endpoint May Become a Hidden Constraint
The landing page depends entirely on the current public plans API. If that endpoint later
changes shape or pagination assumptions, the homepage could quietly degrade.

Decision: confirm the existing endpoint contract during implementation and keep plan-card
requirements limited to fields already present in the public model.

### Risk: Static Trust Content Can Drift from Product Reality
Because most of the landing page is code-defined static content, copy can become stale if
the product flow changes.

Decision: keep the copy operational and minimal. Avoid making claims about policies or
features that do not exist elsewhere in the product.

### Risk: SEO Remains Limited in SPA Mode
Updating `document.title` and the meta description improves browser UX and baseline SEO,
but it does not provide the same crawlability guarantees as SSR or pre-rendering.

Decision: accept this tradeoff for v1. Revisit only if SEO becomes a launch-critical
requirement.
