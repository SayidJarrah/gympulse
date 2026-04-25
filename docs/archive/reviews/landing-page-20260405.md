# Review: Landing Page — 2026-04-05

## Blockers (must fix before PR)

- [x] `docs/design/landing-page.md` — No Benchmark Citation. Fixed: added Benchmark section citing ClassPass (dual CTA), Whoop (auth-aware hero), Peloton (plans-near-top), CrossFit affiliates ("how it works"). Commit 74a801f.

## Suggestions (non-blocking)

- `landingActions.ts:66-73` — The silent-error fallback routes an authenticated user to
  `/register`. Most registration flows redirect already-authenticated users away, which
  could produce a confusing bounce. Consider routing to `/plans` instead of `/register`
  for the silent-error path, since the user is authenticated and `/plans` is safe for
  both members and non-members. Worth discussing with product before the next iteration.

- `LandingPage.tsx:46-58` — The `fetchMyMembership` guard relies on
  `membershipErrorCode === null` to prevent re-fetching after a silent network failure.
  This works today because `membershipStore.ts:86` falls back to `code = ''` (empty
  string) rather than `null` on a response with no error body. The coupling is invisible
  — one change to the store default could reintroduce an infinite fetch loop. Add a
  comment in `LandingPage.tsx` explaining the dependency on the empty-string sentinel, or
  introduce an explicit `membershipFetchAttempted: boolean` flag in the store.

- `docs/sdd/landing-page.md` Section 7 — The resolution matrix documents the primary,
  header, and hero CTAs for every condition, but omits the `planAction` value for the
  `membershipLoading = true` row. `landingActions.ts:59` returns a primary-variant
  `/plans` CTA during loading. Document this in the matrix so the loading row is
  complete.

- `PlansPreviewSection.tsx:92` — Plan card hover uses `transition-transform` and
  `-translate-y-1`. On low-end Android devices this can trigger paint rather than
  composite-only rendering. Adding `will-change: transform` (via Tailwind
  `will-change-transform`) promotes the card to its own layer and keeps the hover
  animation smooth.

## Verdict

APPROVED
