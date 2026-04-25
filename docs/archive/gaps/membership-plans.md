# Gap Report: membership-plans
Date: 2026-04-05

## DOCS → CODE Gaps

### Missing Functionality
- `maxBookingsPerMonth` field exists in `MembershipPlan.kt`, `MembershipPlanResponse.kt`, and the frontend type — but is absent from the SDD DTO spec. Added by migration V7 without SDD update.
- Migration V7 (`max_bookings_per_month` column) not documented in the SDD.

### Broken Flows
- `PLAN_HAS_ACTIVE_SUBSCRIBERS` error: design spec says the price field should show an error border in addition to the banner message. Implementation only shows the banner; `FIELD_ERROR_CODES` does not route this code to the price field.

### Design Divergence
- `PlansPage` and `PlanCard` diverge structurally from the design spec for authenticated users: `PlansContextHeader`, `ctaMode='details'` variant, and `highlighted` prop are used in code but absent from the design spec.
- Design spec has no Benchmark Citations on any of the three screens — required by design-standards.

<!-- TEST COVERAGE SECTIONS — to be appended by tester agent -->

## CODE → DOCS Gaps

### Undocumented Endpoints / Logic
- `MembershipPlanRepository.findAllByNameStartingWith` / `deleteAllByNameStartingWith` — E2E test-support methods with no SDD coverage.

### Undocumented UI
- `PlansContextHeader` component — no design spec entry.
- `usePlansAccessGate` hook — no SDD entry.
- `PurchaseConfirmModal` wiring on `/plans` — no design spec or SDD entry.
- `highlighted` and `ctaMode` card variants — no design spec or SDD entry.

### Undocumented Behaviours
- Redirect behaviour that sends active members away from `/plans` is not in any PRD acceptance criterion.

<!-- TESTER AGENT WILL APPEND BELOW -->

---

## TEST COVERAGE AUDIT
Date: 2026-04-05
Auditor: tester agent (audit mode)

### Infrastructure Note
The E2E stack frontend container (`gympulse-e2e-frontend-1`) failed to start — nginx could not
resolve the `backend` upstream hostname during container startup because the container had not
yet joined the compose network. Postgres (5433) and backend (8081) E2E containers are healthy.
All API-level checks in this audit were run directly against `http://localhost:8081/api/v1`.
UI walk-through was performed via Playwright MCP against the review frontend at
`http://localhost:3000` (same codebase, same build).

### Spec-to-AC Mapping

| Spec test | ACs covered |
|-----------|-------------|
| PLAN-01 | AC1 (public list loads with plan cards) |
| PLAN-02 | AC3 (clicking card navigates to detail) |
| PLAN-03 | AC2, AC3 (detail page fields: name, description, price, duration, CTA) |
| PLAN-04 | AC4 (non-existent plan — 404 UI state) |
| PLAN-05 | AC5 (inactive plan blocked as guest — 404 UI state) |
| PLAN-06 | AC1 empty state (mocked via route intercept) |
| PLAN-07 | AC21 (public list pagination — Next/Previous, page indicator) |
| PLAN-08 | AC7 partial (unauthenticated guest redirect from /admin/plans to /plans) |
| PLAN-09 | AC18 (admin can access /admin/plans and sees plans table) |
| PLAN-10 | AC6 (admin creates plan via UI, appears in table) |
| PLAN-11 | AC11 (admin edits plan via UI, table row updates) |
| PLAN-12 | AC8, AC9, AC10, AC18b (create and edit form validation, field errors stay open) |
| PLAN-13 | AC14 (admin deactivates via UI, disappears from public catalog) |
| PLAN-14 | AC16 (admin reactivates via UI, appears in public catalog) |
| PLAN-15 | AC15, AC17 (409 conflict: already-inactive, already-active — mocked) |
| PLAN-16 | AC18 status filter tabs + URL sync |
| PLAN-17 | AC21 (admin pagination — Next/Previous, page indicator) |
| PLAN-18 | AC18a (price change blocked when active subscribers exist) |

### API Verification Results (against E2E backend port 8081)

| AC | Expected | Observed | Pass? |
|----|----------|----------|-------|
| AC1 | HTTP 200, paginated ACTIVE plans, no auth required | HTTP 200, ACTIVE plans only, unauthenticated access confirmed | PASS |
| AC2 | Response contains all 8 required fields | All 8 fields present: `id`, `name`, `description`, `priceInCents`, `durationDays`, `status`, `createdAt`, `updatedAt` | PASS |
| AC3 | HTTP 200 for active plan, no auth | HTTP 200 | PASS |
| AC4 | HTTP 404, code `PLAN_NOT_FOUND` | HTTP 404, `PLAN_NOT_FOUND` | PASS |
| AC5 | HTTP 404, code `PLAN_NOT_FOUND` for inactive plan | HTTP 404, `PLAN_NOT_FOUND` | PASS |
| AC6 | HTTP 201, status=ACTIVE, full object | HTTP 201, status=ACTIVE, all fields present | PASS |
| AC7 | HTTP 403, code `ACCESS_DENIED` without ADMIN JWT | Unauthenticated POST returns HTTP 401 (not 403). Non-admin authenticated POST returns HTTP 403, `ACCESS_DENIED` | PARTIAL — see note |
| AC8 | HTTP 400, `INVALID_PRICE` for priceInCents <= 0 | HTTP 400, `INVALID_PRICE` | PASS |
| AC9 | HTTP 400, `INVALID_DURATION` for durationDays <= 0 | HTTP 400, `INVALID_DURATION` | PASS |
| AC10 | HTTP 400, `INVALID_NAME` for blank name | HTTP 400, `INVALID_NAME` | PASS |
| AC11 | HTTP 200, updated object returned | HTTP 200, updated fields confirmed | PASS |
| AC12 | Same 400 codes on PUT as POST | PUT shares same validation logic — confirmed via shared code path | PASS |
| AC13 | HTTP 404, `PLAN_NOT_FOUND` on PUT to non-existent ID | HTTP 404, `PLAN_NOT_FOUND` | PASS |
| AC14 | HTTP 200, status=INACTIVE | HTTP 200, status=INACTIVE | PASS |
| AC15 | HTTP 409, `PLAN_ALREADY_INACTIVE` | HTTP 409, `PLAN_ALREADY_INACTIVE` | PASS |
| AC16 | HTTP 200, status=ACTIVE | HTTP 200, status=ACTIVE | PASS |
| AC17 | HTTP 409, `PLAN_ALREADY_ACTIVE` | HTTP 409, `PLAN_ALREADY_ACTIVE` | PASS |
| AC18 | HTTP 200, all plans returned; ?status= filter works | HTTP 200; ACTIVE filter returns only ACTIVE; INACTIVE filter returns only INACTIVE | PASS |
| AC18a | HTTP 409, `PLAN_HAS_ACTIVE_SUBSCRIBERS` on price change with subscribers | HTTP 409, `PLAN_HAS_ACTIVE_SUBSCRIBERS` | PASS |
| AC18b | HTTP 400, `INVALID_DESCRIPTION` for blank description | HTTP 400, `INVALID_DESCRIPTION` | PASS |
| AC19 | Deactivating plan does NOT alter existing UserMembership records | Membership record retained with status=ACTIVE and correct planId after plan deactivated | PASS |
| AC20 | All writes update `updatedAt` | PATCH deactivate/activate: `updatedAt` is updated. PUT update: `updatedAt` is NOT updated — timestamp is identical before and after a 5-second-gap edit | **FAIL** |
| AC21 | ?page, ?size, ?sort query parameters respected | ?page and ?size confirmed working on both endpoints; ?sort not independently verified | PASS (partial) |

**Note on AC7:** The PRD says "without an ADMIN JWT returns HTTP 403". The backend returns HTTP 401
for a caller with no JWT at all (standard Spring Security behaviour for a missing/absent token),
and HTTP 403 for a caller presenting a valid non-admin JWT. Strict reading of the AC fails on the
no-JWT path. This ambiguity should be clarified with the product owner — the AC text may intend
"a caller whose JWT does not carry the ADMIN role" rather than "a caller with no JWT at all".

---

## DOCS → CODE Gaps (test section)

### Missing Test Coverage
- AC7: No spec tests the API-level 401/403 distinction. PLAN-08 only tests the frontend redirect
  behaviour for an unauthenticated browser visitor; it does not assert the HTTP response code
  returned by the API endpoint.
- AC12: PUT field validation (same rules as create) has no independent API-level spec. It is only
  covered implicitly through the edit UI flow in PLAN-12.
- AC13: PUT to a non-existent plan ID returning 404 `PLAN_NOT_FOUND` has no spec. The API
  responds correctly but no test asserts it.
- AC19: No spec verifies that deactivating a plan leaves existing UserMembership records intact.
  This is a data-integrity guarantee with zero automated coverage.
- AC20: No spec asserts that `updatedAt` changes after a write. The API has a confirmed bug —
  PUT does not update `updatedAt`. Without a spec, this regression has no automated anchor.
- AC21 (?sort): The `?sort` query parameter is referenced in AC21 and in the API conventions but
  no spec exercises sort order on either list endpoint.

## CODE → DOCS Gaps (test section)

### Untested Code Paths
- API response shape for the admin list endpoint (`GET /api/v1/admin/membership-plans`): specs
  only check the UI table; no test asserts the raw JSON field names or types returned.
- HTTP 401 path for unauthenticated API calls to write endpoints: specs exercise the frontend
  redirect but never directly assert the 401 API response body or code.
- `?sort` parameter on both public and admin list endpoints: no spec exercises sort order.
- Edit plan modal pre-population: no spec asserts that the Edit modal opens with the plan's
  current field values already present in the form inputs.
- `maxBookingsPerMonth` field: the backend includes this field in every plan response but no
  spec asserts its presence or value.
- Cancel button in a confirm dialog that has already shown a 409 conflict error: PLAN-15 covers
  the cancel after a conflict, but a plain cancel with no prior error is not tested.

## Suggested Fix Order
1. Write a spec for AC20 (`updatedAt` on PUT) — this will surface the confirmed backend bug and
   create a regression anchor once it is fixed. File a bug brief alongside it.
2. Write a spec for AC19 (deactivation does not affect UserMembership records) — data-integrity
   guarantee with zero coverage and high business risk if broken.
3. Write a spec for AC13 (PUT to non-existent ID returns 404) — straightforward API-level test
   with zero coverage.
4. Clarify AC7 with the product owner (401 vs 403 for no-JWT callers), then write an API-level
   spec for the agreed-upon behaviour.
5. Add `?sort` parameter coverage to PLAN-07 and PLAN-17 to complete AC21 coverage.
6. Add Edit modal pre-population assertion to PLAN-11 — assert form fields show current plan
   values when the edit dialog opens.
