# Gap Report: member-home
Date: 2026-04-05

## DOCS → CODE Gaps

### Missing Functionality

- **SDD: `PurchaseConfirmModal` inline activation not implemented.**
  The SDD explicitly requires reusing `PurchaseConfirmModal` directly on Member Home so a successful plan purchase updates the page to ACTIVE without navigating away. The implementation replaces this with `Link` elements that deep-link to `/plans?source=home&highlight={planId}`. PRD AC 24 requires the home page to refresh to ACTIVE state after purchase — not satisfied if the user navigates away with no guaranteed return.

- **SDD `MembershipPrimaryCard` props: `onExploreClasses` absent.**
  The SDD prop interface includes `onExploreClasses: () => void`. The implementation replaces this with `onOpenSchedule` and labels the button `Open schedule`. Prop name and label diverge from the SDD contract.

- **Backend service test: null/blank `timeZone` case not covered.**
  `timeZone` is `required = false` (nullable), making the null path reachable in production. `parseTimeZone` handles it via `isNullOrBlank`, but there is no test for `getUpcomingClassesPreview(null)` or `getUpcomingClassesPreview("")`.

- **`MemberHomeSectionEmptyCard` missing CTA slot.**
  The design spec notes "with a CTA where applicable" for empty states. The component accepts only `title` and `body` — structurally narrower than the spec described.

### Broken Flows

- **Hero renders below the membership section, contradicting the design spec.**
  `MemberHomePage.tsx` renders `<MembershipPrimaryCard>` before `<MemberHomeHero>`. The design spec defines `WelcomeHero` as the first component in page layout, with the membership card following it.

### Design Divergence

- **`MemberHomeHero` container class diverges from spec.**
  Spec: `overflow-hidden rounded-[28px] border border-gray-800 bg-gray-900 p-6 shadow-xl shadow-black/40 sm:p-8` plus animated radial green highlight and mesh pattern.
  Implementation: `rounded-2xl border border-gray-800 bg-[#111827]/80 p-6 shadow-md shadow-black/40` — wrong border-radius, wrong background, weaker shadow, no `overflow-hidden`, no `sm:p-8`, no animated highlight or mesh.

- **`MemberHomeHero` grid column spec diverges.**
  Spec: `lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end`.
  Implementation: `lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start` — column 40px narrower, alignment `items-start` instead of `items-end`.

- **`MembershipPrimaryCard` ACTIVE state secondary CTA label diverges.**
  Spec: `Explore classes`. Implementation: `Open schedule`.

- **`MembershipPrimaryCard` NO_ACTIVE_MEMBERSHIP headline diverges.**
  Spec: `No active membership`. Implementation: `Activate your access` (when plans exist) or `Memberships are temporarily unavailable` (when no plans).

- **`MembershipPrimaryCard` NO_ACTIVE_MEMBERSHIP secondary CTA diverges.**
  Spec: `See what's inside the club`. Implementation: `See schedule`.

- **`SectionErrorCard` call-site inversion — error message renders twice.**
  In `TrainerPreviewCarousel.tsx` and `ClassPreviewCarousel.tsx`, the full error message string is passed as both `title` and `body`. The short label (e.g. `Trainers unavailable`) should be `title`; the detail string goes in `body`.

---

## CODE → DOCS Gaps

### Undocumented Endpoints / Logic

- **`MembershipAccessBanner` and `accessFlowNavigation` utility have no SDD or design coverage.**
  `MembershipAccessBanner.tsx` renders a banner for `activated` and `already-active` states driven by a `membershipBanner` query param. `accessFlowNavigation.ts` (`buildPlansPath`, `getMembershipBanner`, `withoutMembershipBanner`) manages this query-param-based post-purchase protocol. This is the actual implementation of PRD AC 24, yet it appears nowhere in the SDD or design spec.

- **Plan teaser deep-link `source` and `highlight` query params are undocumented.**
  The SDD specifies `PurchaseConfirmModal` inline. The implementation navigates to `/plans?source=home&highlight={planId}`. These params, what `PlansPage` does with them, and the expected return journey to `/home` are entirely absent from documentation.

- **`useMemberHomeMembershipSection` splits errors into `error` and `planTeasersError` fields.**
  The SDD state design describes a single `error` / `errorCode` pair per hook. The hook exposes both fields separately — reasonable but undocumented.

### Undocumented UI

- **`MembershipAccessBanner` — no design spec entry.**
  The activated (green) and already-active (blue) banner variants are not in the design spec. The `already-active` blue colour tokens (`border-blue-500/30 bg-blue-500/10`) are outside the documented design system, which defines no blue semantic token.

- **Landing page `Open member area` CTA label — not documented in member-home docs.**
  `landingActions.ts` routes authenticated active members to `/home` with label `Open member area`. The SDD mentions updating landing CTAs but does not document the exact label.

### Undocumented Behaviours

- **Banner query-param consumption: `MemberHomePage` reads and strips `?membershipBanner=activated` on mount.**
  The param name, supported values (`activated`, `already-active`), and URL-replacement strategy are not described in any AC or SDD section.

- **`useMemberHomeClassesPreview` re-fetches automatically when `timeZone` changes.**
  The hook uses `[timeZone]` as a `useEffect` dependency — correct and useful, but not mentioned in any AC or SDD section.

- **The `Retry` button in the no-plans sub-card retriggers the membership fetch, not a plan refetch.**
  Whether retrying membership is the right action when the catalogue is empty is not specified.

---

## Missing Test Coverage

- AC 1: Post-login routing to `/home` — no spec exists
- AC 2: Unauthenticated redirect to `/login` — no spec exists
- AC 3: Three sections present on home — no spec exists
- AC 7: No-active-membership empty state with plan teasers — no spec exists
- AC 8: Plan teasers shown in empty state — no spec exists
- AC 10: Trainer carousel rendered — no spec exists
- AC 11: Trainer photo vs placeholder — no spec exists
- AC 12: "See all trainers" link — no spec exists
- AC 14: Classes carousel rendered — no spec exists
- AC 15: Class name/date/time/trainer shown — no spec exists
- AC 18: Classes "See full schedule" link — no spec exists
- AC 24: Home page updates to ACTIVE state after purchase — no spec exists
- ACs 4–6, 9, 13, 16–17, 19–23, 25–26 — no spec exists

All 26 acceptance criteria have **zero E2E spec coverage**. `frontend/e2e/member-home.spec.ts` does not exist and the feature is absent from the test manifest.

## Untested Code Paths

- `MembershipPrimaryCard` active state (valid membership, dates, plan name)
- `MembershipPrimaryCard` empty/no-membership state (404 from `/api/v1/memberships/me`)
- `MembershipPrimaryCard` no-plans-available state
- `MembershipPrimaryCard` error state
- `MembershipPrimaryCard` loading/skeleton state
- `MembershipAccessBanner` — `activated` variant (green)
- `MembershipAccessBanner` — `already-active` variant (blue)
- `MembershipAccessBanner` — absent (no param)
- `QuickActionsPanel` — active member action set
- `QuickActionsPanel` — inactive/no-membership action set
- `MemberHomeHero` — active member state
- Trainer carousel navigation (prev/next arrows)
- Trainer photo vs placeholder fallback
- Classes carousel navigation (prev/next arrows)
- Class photo vs placeholder fallback
- `accessFlowNavigation` round-trip: `/plans?source=home&highlight=X` → return to `/home` → banner appears → banner dismissed
- 404-as-empty-state API contract: `GET /api/v1/memberships/me` returns 404 for no-membership users; a 500 would be silently handled the same way — untested
- Backend: null/blank `timeZone` → `400 INVALID_TIME_ZONE`
- Mobile responsive layout at 360px viewport

---

## Suggested Fix Order

1. **Resolve inline activation vs. navigation-away** — document the `accessFlowNavigation` round-trip in the SDD (param name, values, `PlansPage` handling, return-to-`/home` flow), or reintroduce `PurchaseConfirmModal` inline as originally specified.
2. **Fix `SectionErrorCard` call-site inversion** in `TrainerPreviewCarousel.tsx` and `ClassPreviewCarousel.tsx`.
3. **Correct `MemberHomeHero` container styles** — `rounded-[28px]`, `bg-gray-900`, `shadow-xl`, `overflow-hidden`, `sm:p-8`, column `320px`, `items-end`, green radial accent.
4. **Document the `accessFlowNavigation` protocol** — add to `docs/sdd/member-home.md`.
5. **Align `MembershipPrimaryCard` copy with design spec** — headline, CTAs.
6. **Add backend service test for null/blank `timeZone`**.
7. **Add design spec entry for `MembershipAccessBanner`** — both variants, colour treatment, trigger conditions.
8. **Write `frontend/e2e/member-home.spec.ts`** covering all 26 ACs.
