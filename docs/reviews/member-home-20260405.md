# Review: member-home — 2026-04-05

## Gap report resolution summary

| Gap | Status |
|-----|--------|
| Hero renders below membership card | FIXED — `MemberHomeHero` now precedes `MembershipPrimaryCard` in `MemberHomePage.tsx` |
| Hero container classes diverge from spec | FIXED — `rounded-[28px]`, `bg-gray-900`, `shadow-xl shadow-black/40`, `overflow-hidden`, `sm:p-8` all now match spec |
| Hero grid column spec diverges | FIXED — `lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end` |
| `MembershipPrimaryCard` ACTIVE secondary CTA label diverges | FIXED — now `Explore classes` |
| `MembershipPrimaryCard` NO_ACTIVE_MEMBERSHIP headline diverges | PARTIALLY FIXED — see Blocker 1 |
| `MembershipPrimaryCard` NO_ACTIVE_MEMBERSHIP secondary CTA diverges | FIXED — now `See what's inside the club` |
| `SectionErrorCard` call-site inversion (message passed as both title and body) | FIXED — call sites now pass a short label as `title` and the detail string as `body` |
| Backend service test: null/blank `timeZone` not covered | FIXED — three separate tests added (null, blank, invalid) |
| `accessFlowNavigation` / `MembershipAccessBanner` undocumented | FIXED in SDD section 5a; design spec now includes `MembershipAccessBanner` variants |
| `MemberHomeSectionEmptyCard` missing CTA slot | NOT FIXED — component still accepts only `title` and `body` |
| E2E spec absent (`frontend/e2e/member-home.spec.ts`) | NOT FIXED — file still does not exist |

---

## Blockers (must fix before PR)

- [ ] `frontend/src/pages/home/__tests__/MemberHomePage.test.tsx:164` — Stale test assertion will fail at CI. The test calls `screen.getByRole('button', { name: 'Open schedule' })` but no element with that role+name exists: `MembershipPrimaryCard` uses `Explore classes` for its button, and `Open schedule` in `QuickActionsPanel` is a `<Link>` (role `link`). Change the assertion to `screen.getByRole('button', { name: 'Explore classes' })` or `screen.getByRole('link', { name: 'Open schedule' })` depending on what the test intends to cover.

- [ ] `frontend/src/pages/home/__tests__/MemberHomePage.test.tsx:177` — The test asserts `screen.findByRole('heading', { name: 'Activate your access' })`, but `MembershipPrimaryCard.tsx:178` now renders `No active membership` as the heading in the empty state (the copy correction from the gap report). One of the two is wrong; they cannot both be correct. The component heading wins — fix the test assertion to `'No active membership'` to match the rendered output and the design spec.

- [ ] `frontend/src/pages/home/__tests__/MemberHomePage.test.tsx:196` — Same root cause as Blocker 2. The test asserts `screen.findByRole('heading', { name: 'Memberships are temporarily unavailable' })`, but the rendered component (`MembershipPrimaryCard.tsx:178`) always shows `No active membership` as the `<h2>`. The no-plans-available distinction is conveyed by the sub-card copy, not by changing the heading. Fix the assertion to match `'No active membership'` and add a separate assertion for the sub-card copy if needed.

---

## Suggestions (non-blocking)

- `MemberHomeSectionEmptyCard` still accepts only `title` and `body` with no optional CTA slot. The design spec says "with a CTA where applicable." Adding an optional `cta?: { label: string; onClick: () => void }` prop now would avoid a breaking change later when a future empty state (e.g. no-plans) needs an action button directly inside the empty card.

- `frontend/e2e/member-home.spec.ts` does not exist. All 26 acceptance criteria remain without E2E coverage. This is non-blocking for the PR itself if the team has accepted unit-test-only coverage as the policy for this feature, but it is a material regression risk given that AC 1, 2, 24, and 25 (routing, redirect, post-purchase state refresh, stale-state recovery) are very hard to verify from unit tests alone.

- `MembershipAccessBanner` uses `border-blue-500/30 bg-blue-500/10 text-blue-100` for the `already-active` variant. The design spec now documents this as an acknowledged deviation from the design system (no blue semantic token is defined). A follow-up task to align with the system palette (e.g. orange informational or a neutral gray) would remove this one-off token before blue spreads further.

- `useMemberHomeMembershipSection.ts:132` — when `membershipErrorCode === 'NO_ACTIVE_MEMBERSHIP'`, `planTeasersLoading` is set to `true` while `hasLoadedPlanTeasers` is false, even before the plan fetch has started. This makes the skeleton show briefly before the `loadPlanTeasers` effect fires. The logic is correct in outcome but the ordering creates a visible flicker on slow connections. Consider initialising `planTeasersLoading` to `false` and letting the effect set it to `true` immediately on first run, or coalescing the two states.

- `GlobalExceptionHandler.kt:585-595` — there are now two separate handler methods (`handleInvalidTimeZone` for a pre-existing `InvalidTimeZoneException` and `handleMemberHomeInvalidTimeZone` for the new `MemberHomeInvalidTimeZoneException`) that both map to `INVALID_TIME_ZONE`. If the pre-existing exception already existed and was already tested, the two exception classes could be unified (or `MemberHomeInvalidTimeZoneException` could extend the existing one) to avoid duplicating the mapping.

---

## Verdict

BLOCKED — 3 blockers. All three are stale or misaligned test assertions introduced during the fix pass. The component code itself is correct. Fix the three test assertions and the PR is clear to merge.
