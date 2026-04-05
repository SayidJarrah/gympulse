# Review: Membership Plans Gap Fixes — 2026-04-05

Branch: `fix/membership-plans-gaps`

## Scope

Four change sets reviewed:
1. `backend/src/main/kotlin/com/gymflow/service/MembershipPlanService.kt` — `updatedAt` writes (AC20 fix)
2. `frontend/src/utils/planErrors.ts` — `PLAN_HAS_ACTIVE_SUBSCRIBERS` field routing
3. `frontend/e2e/membership-plans.spec.ts` — new tests PLAN-19 through PLAN-24
4. `docs/sdd/membership-plans.md` and `docs/design/membership-plans.md` — documentation catch-up

---

## Blockers (must fix before PR)

- [x] `docs/sdd/membership-plans.md:317` and `:467-469` — SDD documented `updatedAt` as managed by DB trigger only, contradicting the application-side writes. Fixed: SDD step 6 for PUT now documents the explicit `updatedAt` assignment; the entity notes block now describes the dual-write strategy, explains why the application-side set is the reliable mechanism, and designates the DB trigger as a backstop only.

- [x] `frontend/src/utils/planErrors.ts:39` vs `docs/design/membership-plans.md:409` and `:532` — Design spec listed `PLAN_HAS_ACTIVE_SUBSCRIBERS` under banner-only errors, contradicting the field-level routing in `planErrors.ts` and Flow 4 step 6. Fixed: line 409 now describes the banner as for `PLAN_EDIT_CONFLICT` only and adds a dedicated note that `PLAN_HAS_ACTIVE_SUBSCRIBERS` is field-level (Price field); the error table at line 532 now states "Below Price input field (field-level error)" for this code.

---

## Suggestions (non-blocking)

- **PLAN-19 uses `setTimeout` for timing** — The 1100 ms delay in PLAN-19 (`await new Promise((resolve) => setTimeout(resolve, 1100))`) is a test-reliability smell. If DB timestamp resolution is the concern, asserting `updatedAt !== createdAt` (not strict inequality by time delta) would be more robust, or the test could accept a GET-after-PUT and simply assert the `updatedAt` string differs from the one returned in the POST response body. The current approach adds ~1 second to every PLAN-19 run.

- **PLAN-22 uses duplicate test names** — Three tests are all named `'PLAN-22 AC12: PUT with ...'`. Playwright identifies tests by their full title within the describe block; duplicate top-level IDs work but break the ability to run a single PLAN-22 case by ID. Rename them to `PLAN-22a`, `PLAN-22b`, `PLAN-22c` or use `test.describe('PLAN-22 AC12')` with individual inner test names.

- **PLAN-23 sort test uses unbounded `size=1000`** — Using `size=1000` on the public and admin list endpoints in PLAN-23 will include every plan ever created by any prior E2E test run, not just the two created in the test. The assertion still works (index comparison), but a tighter approach would be to create plans with a unique time-stamped prefix and search only within the returned slice. This is the same pattern as the rest of the suite and would make the test more self-contained.

- **`MembershipPlanRequest` does not include `maxBookingsPerMonth`** — The `MembershipPlanRequest` TypeScript interface (and the Kotlin DTO) does not expose `maxBookingsPerMonth`. Admins currently have no way to set a per-plan monthly booking cap at creation or edit time. This is noted as partial enforcement in the SDD, but there is no backlog item tracking the UI + API work to complete it. Consider logging a backlog item so it does not get lost.

- **Benchmark Citations absent from design spec** — The gap report flagged that no screen in `docs/design/membership-plans.md` has a Benchmark Citation (required by design-standards). The SA agent updated the doc with authenticated variants and component props but did not add citations. This is a non-blocking gap since no code ships from it, but the spec remains incomplete per the design-standards skill. Add a Benchmark section before the next design review.

- **AC7 clarification not written into SDD** — PLAN-24 encodes the 401 vs 403 distinction as a comment in the test, but the gap report recommended clarifying this with the product owner and updating the SDD. The SDD AC7 row still says "403 without ADMIN JWT". The test is correct, but the SDD has not been updated to reflect the agreed behaviour. A small SDD note acknowledging the Spring Security 401-for-no-token / 403-for-non-admin-token distinction would prevent the next engineer from raising the same question.

---

## Gap Report Coverage Check

Items from `docs/gaps/membership-plans.md` and their status after this PR:

| Gap item | Addressed? |
|----------|------------|
| `maxBookingsPerMonth` absent from SDD DTO spec | Fixed — SDD now documents the field in `MembershipPlanResponse` and `MembershipPlan` entity |
| V7 migration not in SDD | Fixed — SDD Section 1 now contains the V7 migration block |
| `PLAN_HAS_ACTIVE_SUBSCRIBERS` not routing to price field | Code fix applied in `planErrors.ts`; design spec contradiction not yet resolved (see Blocker 2) |
| `PlansContextHeader`, `ctaMode`, `highlighted` absent from design spec | Fixed — design spec now covers all three |
| No Benchmark Citations | Not addressed — still missing from design spec |
| `findAllByNameStartingWith` / `deleteAllByNameStartingWith` undocumented | Fixed — SDD Section 3 now documents both test-support methods |
| `usePlansAccessGate` undocumented | Fixed — SDD Section 4 now fully specifies the hook |
| `PurchaseConfirmModal` wiring undocumented | Fixed — SDD `canPurchase` flag and `onActivate` handler documented |
| Redirect behaviour for active members undocumented | Fixed — SDD `usePlansAccessGate` mode table now documents the redirect |
| AC20: `updatedAt` not updated on PUT | Code fix applied; SDD contradiction not resolved (see Blocker 1) |
| AC19: no spec for deactivation not affecting UserMembership | Fixed — PLAN-20 added |
| AC13: no spec for PUT to non-existent ID | Fixed — PLAN-21 added |
| AC7: 401/403 distinction untested | Fixed — PLAN-24 added (with inline comment noting the ambiguity) |
| AC21: `?sort` uncovered | Fixed — PLAN-23 added |
| AC12: PUT field validation uncovered at API level | Fixed — PLAN-22 added |

---

## Verdict

APPROVED

Both blockers were documentation/spec consistency issues; the runtime code was functionally correct throughout. Both resolved in the fix loop.
