# Gap Report: landing-page
Date: 2026-04-05

## DOCS → CODE Gaps

### Missing Functionality
- `PlansPreviewSection.tsx` — Design spec says one plan may be visually highlighted. No highlight logic is implemented.

### Broken Flows
- `frontend/src/utils/landingActions.ts:39-40` — Active-member CTA routes to `/home`. The SDD, design spec, and E2E test LAND-04 all require `/membership`. LAND-04 will fail against the live code.
- `landingActions.ts:46` — The condition `membershipLoading || membershipErrorCode === null` means a user whose membership fetch fails silently (no error code set, but no membership found) sees a permanently disabled "Checking membership" CTA with no recovery path.

### Design Divergence
- `LandingHeader.tsx:20` — Logo mark renders `<span>G</span>` instead of the canonical lightning bolt SVG defined in `docs/design/system.md` and used in `Navbar.tsx`. Two logo marks coexist on the public page.
- `docs/design/landing-page.md` — No Benchmark citation block. Design-standards require one per screen design.

### Missing Test Coverage

Audit date: 2026-04-05. Spec file: `frontend/e2e/landing-page.spec.ts`. Screenshots: `screenshots/20260405-170600/`.

The spec contains 5 tests (LAND-01 through LAND-05) covering ACs 1–5, 14, 19, and 20. The following ACs have no spec at all:

- AC 6: Page must not include links to unbuilt public schedule or trainer pages in v1 — no spec exists
- AC 7: First viewport contains headline, supporting copy, and primary CTA without scroll on desktop and mobile — no spec exists
- AC 8: Hero communicates single-gym, membership-first product (not a multi-gym marketplace) — no spec exists
- AC 9: Hero includes exactly one secondary exploration CTA — no spec exists
- AC 10: Plans section appears near the top portion of the page — no spec exists
- AC 11: Plans section displays all active `MembershipPlan` records, INACTIVE excluded — partially covered only (LAND-01 mocks one plan; no spec verifies INACTIVE plans are filtered out)
- AC 12: Each plan card shows name, price, duration, and `maxBookingsPerMonth` — no spec exists
- AC 13: Plan card CTA routes guests to `/register` and signed-in eligible users to purchase flow — no spec exists
- AC 15: "How it works" section present, explaining account → membership → booking — no spec exists
- AC 16: FAQ / policy block present on the page — no spec exists
- AC 17: FAQ explains booking requires an ACTIVE membership — no spec exists
- AC 18: Page does not claim free trials, refunds, cancellation terms, trainer access, or schedule depth — no spec exists
- AC 21: Analytics events tracked for page view, hero primary click, hero secondary click, plan CTA click, sign-in click — no spec exists
- AC 22: Fully usable at 360 px width without horizontal scroll — no spec exists (manually verified: `scrollWidth === clientWidth === 360`, no horizontal overflow)
- AC 23: Semantic landmarks, accessible heading hierarchy, keyboard-focusable CTAs, non-decorative images with alt text — no spec exists
- AC 24: Unique SEO title and description meta tags — no spec exists (manually verified: title "GymFlow | Memberships and Class Booking" and description present)

## CODE → DOCS Gaps

### Undocumented Endpoints / Logic
- `landingActions.ts` full resolution matrix (loading state, checking state, fallback branch, admin plan CTA routing to `/admin/plans`) — all produce user-visible behaviour with no SDD coverage.
- `planErrors.ts` and `planFormatters.ts` — used by landing components with no mention in the SDD.

### Undocumented UI
- `LandingFooter.tsx` — Sign-in and Register links always render regardless of auth state; not documented.

### Undocumented Behaviours
- `LandingPlanAction` type with `variant` field — not in SDD; SDD only describes `LandingAction`.
- `LandingPage.tsx:34-39` — `landing_page_view` analytics event fires on every auth state change, not just on mount. SDD specifies it as a page-load event.

### Untested Code Paths

- **Plans API error state**: `PlansPreviewSection` renders an error card with a "Try again" retry button when the membership-plans API fails. No E2E spec covers this path.
- **Plans loading skeleton**: Three animated skeleton cards render while the API is in-flight. No spec covers this loading state.
- **Auth-aware plan card CTA — signed-in no-membership variant**: The plan card CTA resolves at runtime: guest → "Create account" → `/register`; signed-in no-membership → CTA to `/plans`. The guest path is incidentally exercised by LAND-01 but the signed-in variant is not covered by any plan-card-specific test.
- **Auth-aware plan card CTA — signed-in active-member variant**: When a user with an active membership views the landing page the plan card CTA resolves differently (see `resolveLandingActions`). No spec verifies this variant.
- **Header auth-aware state**: Guest header renders "Sign in" + "Create account" links; authenticated header renders "Go to portal" → `/home`. The authenticated header variant has no dedicated spec.
- **`maxBookingsPerMonth = 0` display**: `PlansPreviewSection.tsx` line 123 renders `{plan.maxBookingsPerMonth} class bookings` verbatim. Plans stored with `maxBookingsPerMonth = 0` (including "E2E Seed Unlimited Monthly", "Unlimited Monthly", and "Annual Unlimited" in the live seeded database) display as "0 class bookings" — factually misleading given their descriptions say "Unlimited class bookings" or "unlimited bookings". No spec catches this rendering. If `0` is a sentinel for unlimited, the display layer needs a guard. Suggested assignee: frontend-dev. Evidence: live screenshot at `screenshots/20260405-170600/landing-guest-full.png`.

## Suggested Fix Order
1. Fix active-member CTA `/home` → `/membership` in `landingActions.ts` (confirmed failing E2E — LAND-04).
2. Document the `resolveLandingActions` logic in the SDD (SDD hygiene rule).
3. Harden the stuck "checking membership" state with an explicit fallback.
4. Replace `LandingHeader` logo mark with canonical lightning bolt SVG.
5. Add Benchmark citation to `docs/design/landing-page.md`.
6. Document `LandingPlanAction`, admin plan card routing, footer auth behaviour in SDD.
7. Fix `landing_page_view` analytics to fire only on mount.
