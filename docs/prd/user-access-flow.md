# PRD: User Access Flow

## Overview
User Access Flow defines the default navigation and entry experience for authenticated `USER`
 accounts after sign-in. The current logged-in experience over-emphasizes the standalone
 `Plans` tab even though plans are not the primary day-to-day destination for an active member.
 This feature re-centers the logged-in flow around `Home`, where the user can immediately see
 their current membership state and, when relevant, review available plans inside the membership
 section without leaving the home experience.

## Goals
- Make `Home` the clear primary destination for authenticated `USER` accounts.
- Ensure plan discovery remains easy for users without an `ACTIVE` membership, but is surfaced
  as part of the membership journey rather than a competing top-level destination.
- Reduce navigation noise for users who already hold an `ACTIVE` membership.
- Keep the logged-in navigation and CTA logic aligned with the existing member-home,
  membership-plans, and membership-purchase features.

## User Roles Involved
- **User** (authenticated member or registered user without an active membership) — follows the
  logged-in app navigation, reviews current access, and discovers available plans from `Home`
  when needed.
- **Guest** (unauthenticated visitor) — remains on the public marketing and public plans flow;
  this PRD does not redefine guest navigation.
- **Admin** — out of scope for this flow; admin navigation remains separate.

## User Stories

### Happy Path Stories
- As an authenticated user, I want to land on `Home` after login so that I see my current club
  context before browsing secondary destinations.
- As a user with an `ACTIVE` membership, I want the first area on `Home` to show my current plan
  and access summary so that I can confirm what I have already purchased.
- As a user without an `ACTIVE` membership, I want `Home` to show available plan options in the
  membership section so that I can activate access without hunting for a separate tab.
- As a user without an `ACTIVE` membership, I want a clear path from `Home` to the full plan
  comparison and purchase flow so that I can review more than the highlighted options when needed.
- As a user with an `ACTIVE` membership, I want the main navigation to focus on destinations I
  use regularly so that the app feels operational rather than promotional.
- As a user, I want the membership section on `Home` to match the same visual language as the
  rest of the logged-in experience so that plan access feels native to the product.

### Edge Case Stories
- As a user, I want deep links to the logged-in plans experience to route me back into the
  membership area or the approved full plan comparison surface so that stale bookmarks do not
  strand me in an outdated standalone tab.
- As a user without an `ACTIVE` membership, I want a clear empty state if no active plans are
  available so that I understand the issue is catalogue availability, not a broken page.
- As a user with an `ACTIVE` membership, I do not want the home page to render the full plan
  catalogue inline so that my main landing experience stays focused.
- As a user, I want the logged-in navigation to remain usable on mobile and desktop after the
  plan-tab removal so that the information architecture still feels coherent on smaller screens.

## Acceptance Criteria
1. Authenticated `USER` accounts land on `/home` as their primary post-login destination.
2. The primary logged-in navigation for authenticated `USER` accounts does not include `Plans`
   as a top-level tab.
3. `Home` remains the first and visually primary destination in the authenticated `USER`
   navigation.
4. The first major content area on `Home` is the membership section.
5. If the authenticated user has an `ACTIVE` membership, the membership section shows the
   current plan summary and does not render the full plans catalogue inline.
6. If the authenticated user does not have an `ACTIVE` membership and at least one active plan
   exists, the membership section surfaces a native plan-discovery preview directly on `Home`.
7. The native plan-discovery preview on `Home` shows a limited highlighted set of plans rather
   than the full catalogue grid.
8. Each highlighted plan in the home membership section includes enough information for quick
   comparison at minimum: plan name, duration, price, and one concise supporting value point.
9. The home membership section provides a clear path to the full authenticated plan comparison
   and purchase flow when the user wants more than the highlighted set.
10. The path from `Home` to full plan comparison may open an approved dedicated route, modal, or
    drawer, but it must be triggered from the membership section rather than from a primary nav
    tab.
11. If no active plans exist, the membership section shows a clear unavailable state and no
    broken or empty teaser rail.
12. After a successful membership purchase initiated from the home membership section, the user
    is returned to the `ACTIVE` membership state on `Home` without logging out and back in.
13. The authenticated navigation continues to expose the existing core member destinations:
    `Home`, `Schedule`, `Trainers`, `My Favorites`, and `Profile`, unless a future navigation
    redesign PRD changes that set explicitly.
14. If an authenticated user navigates to a legacy standalone logged-in `Plans` entry point, the
    app routes them to the approved replacement experience without showing an orphaned top-level
    plans tab.
15. The home membership preview and replacement plan-discovery flow use the same plan source of
    truth as the existing membership-plans and membership-purchase features.
16. The authenticated user flow remains readable and usable on mobile and desktop, with no
    navigation dead ends introduced by the plan-tab removal.

## Out of Scope
- Changing the public guest-facing plans catalogue and marketing-site navigation.
- Introducing plan upgrade, downgrade, or switch logic for users with an `ACTIVE` membership.
- Redesigning trainer, class schedule, favorites, or profile feature behavior beyond navigation
  placement changes required by this flow.
- Defining final visual design, motion, or component styling details; those belong in the design
  spec.
- Replacing the existing membership purchase rules or checkout behavior.

## Open Questions
1. Should the full authenticated plan comparison experience open as a dedicated `/plans` route,
   a `Home`-anchored drawer, or a modal overlay? The requirement is that it must be secondary to
   `Home`, but the final interaction model is a design decision.
2. Should users with an `ACTIVE` membership see a low-emphasis `Compare plans` entry for future
   awareness, or should plan discovery be hidden entirely until plan-switching exists?
3. Should the highlighted plans on `Home` be admin-curated, sorted by price, or algorithmically
   selected from active plans? This affects ranking but not the core access flow.

## Technical Notes For The Architect
- This PRD governs authenticated `USER` information architecture and should be implemented in
  coordination with `Member Home`, `Membership Plans`, and `User Membership Purchase` rather than
  by duplicating plan-fetching logic.
- Legacy route handling matters because bookmarked or directly navigated `/plans` URLs may still
  exist for logged-in users even after the primary tab is removed.
- The membership section on `Home` needs state-driven behavior keyed off the same membership
  status source of truth used elsewhere: `ACTIVE`, `CANCELLED`, and `EXPIRED`.
- The plan preview on `Home` should consume the existing active-plan catalogue data and limit or
  rank it at the presentation layer rather than introducing a second plan model.
- If the replacement comparison surface is a modal or drawer, the architecture should still
  support direct-link fallback for accessibility and refresh resilience.
