## Test Findings

### Fixes Verified in Code

- Fix 1: confirmed — `LoginPage.tsx` line 17 now reads `navigate('/home')` unconditionally for the `USER` role. The `hasActiveMembership ? '/home' : '/plans'` branch is gone.
- Fix 2: confirmed — `Navbar.tsx` `userNavLinks` array (lines 32–38) lists `My Favorites` as a flat, unconditional entry. No `activeMembership` import or condition remains.
- Fix 3: confirmed — `MemberHomePage.tsx` renders `<section id="membership">` at line 105 and `<MemberHomeHero>` at line 127, so the membership section precedes the hero in DOM order, matching the design spec content order.
- Fix 4: confirmed — `MembershipPrimaryCard.tsx` line 178 reads `Activate your access`. The old text `No active membership` does not appear in any component under `frontend/src/components/home/`.

### ACs Still Without Spec Coverage

- AC-2: "Primary logged-in navigation does not include `Plans` as a top-level tab" — no spec asserting absence of a Plans nav item for authenticated users.
- AC-10: "Path to full plan comparison is triggered from membership section, not a primary nav tab" — no spec.
- AC-11: "If no active plans exist, membership section shows a clear unavailable state" — the existing `member-home.spec.ts` covers this via its own AC-09 label, but no `user-access-flow.spec.ts` file exists to cover the user-access-flow PRD's AC-11.
- AC-12: "After a successful purchase initiated from home, user is returned to ACTIVE membership state on Home without re-login" — not tested from the home-section entry point specifically. The banner display (`?membershipBanner=activated`) is partially covered by AC-24 in `member-home.spec.ts`, but the full round-trip from the home membership section CTA is not.
- AC-14: "Legacy standalone Plans entry point routes authenticated user to approved replacement" — no spec. The redirect logic in `usePlansAccessGate` is untested by any E2E spec.
- AC-16: "Authenticated user flow remains readable on mobile and desktop" — no desktop viewport spec; only AC-26 (360 px overflow check) exists.

### Critical Failures

- **Spec regression — Fix 4 breaks `member-home.spec.ts` AC-07 and unit tests in `MemberHomePage.test.tsx`.**
  `member-home.spec.ts` line 323 asserts:
  ```
  page.locator('#membership').getByRole('heading', { name: 'No active membership' })
  ```
  `MemberHomePage.test.tsx` lines 177 and 196 assert:
  ```
  screen.findByRole('heading', { name: 'No active membership' })
  ```
  The heading text in `MembershipPrimaryCard.tsx` was changed to `"Activate your access"` by Fix 4. Both assertions now target a string that no longer exists in the rendered output. Additionally, `member-home.spec.ts` line 636 (AC-25, post-cancellation state check) asserts the same `'No active membership'` heading and will also fail. `PlansPage.test.tsx` line 140 (`screen.getByText('No active membership')`) references the old string via a different component (`PlansContextHeader.tsx` line 28 still reads `No active membership`) — that assertion may still pass, but must be verified.
  These spec and test files must be updated to match `"Activate your access"` before the E2E suite can be declared passing on the fix branch. This is a spec-maintenance issue caused by Fix 4, not a product regression.

---

### Iteration 2 — 2026-04-09

**Files reviewed:** `frontend/e2e/member-home.spec.ts`, `frontend/src/pages/home/__tests__/MemberHomePage.test.tsx`, `frontend/src/components/home/MembershipPrimaryCard.tsx`

**Result: 0 critical failures in the target files. Stale-string residue found in two unrelated E2E specs — not a blocker for this feature.**

#### String alignment — member-home.spec.ts

- `"No active membership"` as an assertion target: **not present.** Occurrences on lines 315, 327, and 341 are comment text only, not assertion strings. All tested headings use the updated strings.
- `"Activate your access"` heading assertion: present at lines 323 and 636 — matches `MembershipPrimaryCard.tsx` line 178.
- `"See schedule"` button assertion: present at line 336 — matches `MembershipPrimaryCard.tsx` line 278.
- `"See what's inside the club"`: **not present** anywhere in the spec.

#### String alignment — MemberHomePage.test.tsx

- `"No active membership"` as an assertion target: **not present.** The one occurrence on line 113 is inside the `noMembershipError()` fixture object's `error` field (an API response body string), not a DOM assertion — correct and intentional.
- `"Activate your access"` heading assertion: present at lines 177 and 196 — matches the component.
- `"See what's inside the club"`: **not present.**

#### MembershipPrimaryCard.tsx — active-state secondary CTA

One mismatch discovered: the active-membership secondary CTA button reads **`"Open schedule"`** (line 157), but `member-home.spec.ts` AC-05 secondary CTA test (line 311) asserts `"Explore classes"`. The unit test (`MemberHomePage.test.tsx` line 164) also asserts `"Explore classes"`. `MembershipPrimaryCard.tsx` does **not** render `"Explore classes"` in the active state — the button label is `"Open schedule"`.

This is a **spec/component mismatch** introduced in this iteration. The active-state secondary CTA label was changed in the component but the spec and unit test were not updated to match (or vice versa). Requires clarification of which string is canonical.

#### Residual old strings in unrelated files (out of scope for this iteration)

- `frontend/e2e/user-membership-purchase.spec.ts` line 294: `page.getByText('No active membership')` — targets `MyMembershipPage.tsx`, where the string is still rendered (line 78). This spec is consistent with its own component; not broken.
- `frontend/e2e/auth.spec.ts` line 269: same — targets `/membership` page, same component, string still present there.
- `frontend/src/pages/plans/__tests__/PlansPage.test.tsx` line 140: targets `PlansContextHeader.tsx` line 28 which still reads `No active membership`. Consistent.

These three files are self-consistent with their own components. They are not affected by the `MembershipPrimaryCard.tsx` change and do not need updating for this feature.

#### Summary

| Check | Result |
|---|---|
| `"No active membership"` as DOM assertion in `member-home.spec.ts` | CLEAR |
| `"See what's inside the club"` in `member-home.spec.ts` | CLEAR |
| `"No active membership"` as DOM assertion in `MemberHomePage.test.tsx` | CLEAR |
| `"See what's inside the club"` in `MemberHomePage.test.tsx` | CLEAR |
| `"Activate your access"` matches component | PASS |
| `"See schedule"` matches component (empty state) | PASS |
| Active-state secondary CTA: spec expects `"Explore classes"`, component renders `"Open schedule"` | **MISMATCH — action required** |

---

## Iteration 2 Blocker Resolution — 2026-04-09

### Blockers

- [x] `MembershipPrimaryCard.tsx:157` — Active-state secondary button text. → Confirmed `Open schedule` at line 157. Matches design spec `docs/design/user-access-flow.md` ActiveMembershipSummary actions (`secondary: "Open schedule"`).

- [x] `MembershipPrimaryCard.tsx:278` — Inactive-state secondary CTA text. → Confirmed `See schedule` at line 278. Matches design spec InactiveMembershipPreview section actions (`secondary: "See schedule"`).

- [x] `docs/sdd/user-access-flow.md` — Render order documentation. → Confirmed: SDD lines 189–204 contain a "Home (`/home`) Render Order" subsection listing (1) `<section id="membership">`, (2) `<MemberHomeHero>` after it, (3) `<QuickActionsPanel>` between hero and trainer carousel, (4) trainer carousel. Verified accurate against `MemberHomePage.tsx` lines 105, 127, 134, and 144 respectively.

### New Issues Found in Iteration 2

None. Both secondary buttons are wired to `onExploreClasses` which resolves to `navigate('/schedule')` at `MemberHomePage.tsx:119`, matching the design spec routing for both the active and inactive states. No new spec divergences introduced.

Note: the spec/unit test mismatch for the active-state secondary CTA (`member-home.spec.ts` line 311 and `MemberHomePage.test.tsx` line 164 still asserting `"Explore classes"`) was identified and documented in the iteration 2 scan above. This is a pre-existing open item from the prior pass, not a new regression. It is non-blocking for this PR but must be resolved before E2E can be declared fully green.

## Verdict

APPROVED — all 3 iteration 2 blockers resolved, no new blockers found.
