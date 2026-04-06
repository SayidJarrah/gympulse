# Review: User Profile Management — 2026-04-06

## Blockers (must fix before PR)

- [x] `frontend/e2e/user-profile-management.spec.ts:62,65,97` — E2E tests PROFILE-01 and PROFILE-02 locate the read-only email field via `#profile-email`, but `UserProfileForm.tsx:292` renders `id="email"`. The selector will never match, silently turning both assertions into no-ops or causing a timeout failure. Either rename the input to `id="profile-email"` in `UserProfileForm.tsx` or update the two E2E locators to `#email`. Fixed: renamed `id="email"` to `id="profile-email"` and `htmlFor="email"` to `htmlFor="profile-email"` in `UserProfileForm.tsx`.

## Suggestions (non-blocking)

- `frontend/src/components/profile/ProfileChipInput.tsx:92` — The remove button's `XMarkIcon` uses `h-3.5 w-3.5`. The design spec specifies `h-3 w-3`. The difference is subtle but it is a spec deviation; align to `h-3 w-3` during a cleanup pass.

- `frontend/e2e/user-profile-management.spec.ts` — PROFILE-05 through PROFILE-08 cover AC4, AC17, AC20, AC21, AC15, AC16 as required. However, the gap report flagged several other ACs (AC8, AC9, AC10, AC12, AC13, AC14, AC18, AC19) as still missing from the E2E suite. These are outside the mandatory fix scope for this branch but represent meaningful coverage holes. Log as tech debt and address in a dedicated test sprint.

- `frontend/e2e/user-profile-management.spec.ts:134` — PROFILE-03 uses `page.waitForTimeout(250)` to assert that no PUT was fired. This makes the test 250 ms slower unconditionally. Prefer a route-interception counter checked immediately after the click, or use Playwright's `expect.poll` with a short timeout. `waitForTimeout` is a Playwright anti-pattern that tends to accumulate into slow suites.

## Verdict

APPROVED

---

### Fix summary per gap item

| # | Item | Status |
|---|------|--------|
| 1 | Access-denied state (distinct from fetch failure) | Implemented correctly |
| 2 | Read-only email: `readOnly` + `aria-readonly`, no `disabled` | Implemented correctly |
| 3 | Two-column desktop layout + `ProfileSummaryCard` | Implemented correctly |
| 4 | Banners inside form card content area | Implemented correctly |
| 5 | `aria-live="polite"` on success banner | Implemented correctly |
| 6 | Focus management: first invalid field on fail, banner on success | Implemented correctly |
| 7 | Backspace removes last chip | Implemented correctly |
| 8 | "Maximum reached" copy (no number, no period) | Implemented correctly |
| 9 | Page heading "Your Profile", background `bg-[#0F0F0F]` | Implemented correctly |
| 10 | SDD updated with photo sub-feature (endpoints, fields, store, props, behaviours) | Implemented correctly |
| 11 | E2E tests added (AC4, AC17, AC20, AC21, AC15, AC16) | Implemented — PROFILE-05 through PROFILE-08 present; E2E ID selector bug is the blocker |
| 12 | Benchmark citation in design spec | Implemented correctly |
