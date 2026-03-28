# PRD: User Access Flow

## Overview
The User Access Flow governs how an authenticated user enters and navigates the GymFlow
member portal. It enforces a membership gate — users without an active membership are
directed to the plan catalogue and blocked from reaching member-only sections — while
users with an active membership land directly on the portal home. Admin accounts bypass
the portal entirely and are redirected to the admin dashboard. Once inside the portal,
a persistent navigation shell gives members one-click access to all sections; nav items
for Trainers and Schedule are visually disabled (with an explanatory tooltip) for users
who have not yet purchased a membership. A membership status widget in the nav shell
surfaces plan name, expiry date, and a near-expiry warning at all times.

## Goals
- **User problem:** After logging in, users have no consistent landing experience — members
  waste time clicking around to reach their sections, and non-members receive no
  guidance about what they need to do first.
- **Business outcome:** A clearly enforced membership gate surfaces the plan catalogue
  immediately to unpaid users, shortening the time between account creation and first
  purchase. The persistent membership widget keeps expiry visible, prompting timely renewal
  and reducing involuntary churn caused by forgotten expiry dates.

## User Roles Involved
- **User (active member)** — authenticated USER-role account with a current ACTIVE
  UserMembership; primary actor of the full portal experience.
- **User (no membership / guest-state)** — authenticated USER-role account with no
  ACTIVE UserMembership; can only access the plan catalogue and purchase flow.
- **Admin** — authenticated ADMIN-role account; redirected away from the portal to the
  admin dashboard.
- **Guest (unauthenticated)** — cannot access any portal URL; redirected to login.

## User Stories

### Happy Path Stories

- As a user with an active membership, I want to be taken directly to the portal home
  after logging in so that I can immediately start using the platform without extra steps.
- As a user without an active membership, I want to be taken to the plan catalogue after
  logging in so that I understand I need to purchase a plan and know where to do it.
- As an admin, I want to be redirected to the admin dashboard when I visit any portal URL
  so that I am not presented with the member-facing shell.
- As a user, I want to see a persistent navigation shell (Home, My Membership, Browse Plans,
  Trainers, Schedule) on every portal page so that I can move between sections without
  losing context.
- As a user with an active membership, I want to see my plan name and expiry date in the
  navigation shell at all times so that I always know my current subscription status at a
  glance.
- As a user whose membership expires within 7 days, I want to see a warning banner in the
  navigation shell so that I have enough notice to renew before losing access.
- As a user with an active membership, I want to click the Trainers and Schedule nav items
  and navigate to those pages so that I can explore the full portal.

### Edge Case Stories

- As a user without an active membership, I want the Trainers and Schedule nav items to be
  visually disabled and non-clickable, with a tooltip explaining that a membership is
  required, so that I understand why those sections are unavailable rather than assuming
  the site is broken.
- As a user without an active membership, I want any direct attempt to navigate to a
  members-only URL (e.g., `/portal/home`, `/portal/trainers`, `/portal/schedule`) to
  redirect me to the plan catalogue with an explanatory banner, so that I cannot bypass the
  gate by typing a URL directly.
- As a guest (unauthenticated user), I want any attempt to reach a portal URL to redirect
  me to the login page so that I am never shown a broken or empty portal state.
- As a user whose access token has expired mid-session, I want any portal action to redirect
  me to the login page (after an attempted token refresh fails) so that I do not see a
  broken portal with empty data.
- As a user with an active membership, I want the membership status widget to reflect a
  newly purchased or cancelled membership immediately — without a full page reload — so
  that the displayed status is always accurate after I take an action.
- As an admin who accidentally navigates to a portal URL, I want to be silently redirected
  to the admin dashboard so that I never see the member portal interface.

## Acceptance Criteria

### Unauthenticated Access

1. Any request to a URL matching `/portal/*` by an unauthenticated user (no valid access
   token present) results in a client-side redirect to `/login`. The original URL is
   preserved as a `redirect` query parameter so the user is returned there after login.
2. After a successful login, if no valid access token can be obtained (e.g., token refresh
   fails), the user is redirected to `/login` and not left on a broken portal page.

### Membership Gate — Post-Login Routing

3. After a successful login, a USER-role account with at least one `UserMembership` record
   where `status = ACTIVE` and `endDate > now` is navigated to `/portal/home`.
4. After a successful login, a USER-role account with no `UserMembership` record where
   `status = ACTIVE` is navigated to `/portal/plans` and a banner is displayed with the
   message: "You need an active membership to access GymFlow. Choose a plan below to get
   started."
5. After a successful login, an ADMIN-role account is navigated to `/admin/dashboard`
   regardless of whether a UserMembership record exists for that account.

### Membership Gate — Direct URL Navigation

6. A USER-role account without an active membership that navigates directly to
   `/portal/home`, `/portal/trainers`, or `/portal/schedule` is redirected to
   `/portal/plans` with the same restricted-access banner described in criterion 4.
7. A USER-role account without an active membership can navigate freely to `/portal/plans`
   and `/portal/memberships/purchase` without being redirected.
8. A USER-role account with an active membership can navigate directly to any portal URL
   without being redirected.
9. An ADMIN-role account that navigates to any `/portal/*` URL is redirected to
   `/admin/dashboard`.

### Portal Navigation Shell

10. Every page under `/portal/*` renders a persistent navigation element containing the
    following labelled links in order: Home, My Membership, Browse Plans, Trainers,
    Schedule.
11. The navigation element displays the authenticated user's `firstName` if set; otherwise
    it displays the user's email address.
12. The navigation element contains a logout button. Clicking it calls the logout API
    endpoint, clears local auth state, and redirects the user to `/login`.
13. The currently active route's navigation link is visually distinguished from inactive
    links (e.g., highlighted text or indicator bar).
14. The Trainers and Schedule nav links are rendered in a visually disabled state (greyed
    out, non-interactive) for a USER-role account without an active membership.
15. Hovering over (or focusing) a disabled Trainers or Schedule nav link displays a tooltip
    with the text: "Active membership required."
16. Clicking a disabled Trainers or Schedule nav link produces no navigation — no route
    change occurs.
17. For a USER-role account with an active membership, the Trainers and Schedule nav links
    are fully interactive with no disabled styling or tooltip.

### Membership Status Widget

18. The navigation shell contains a membership status widget that is visible on every portal
    page.
19. When the user has an active membership, the widget displays the membership plan name and
    the expiry date formatted as a human-readable date (e.g., "Expires 15 Apr 2026").
20. When the user has no active membership, the widget displays the text "No active
    membership" and a link that navigates to `/portal/plans`.
21. When fewer than 7 days remain until membership expiry (`endDate - today <= 7 days`),
    the widget displays a warning banner with the message: "Your membership expires soon."
    The banner must be visually distinct from the normal widget state (e.g., amber or red
    colour).
22. The widget data is loaded once on portal entry from `GET /api/v1/memberships/me` and
    stored in the global Zustand store. It does not re-fetch on every page navigation.
23. The widget updates immediately — without a full page reload — after a membership
    purchase action completes successfully.
24. The widget updates immediately — without a full page reload — after a membership
    cancellation action completes successfully.

### Responsive Layout

25. On viewport widths >= 1024 px the navigation shell renders as a sidebar or top
    navigation bar. On viewport widths < 1024 px the navigation shell renders as a bottom
    navigation bar or a hamburger menu. (Exact layout is defined in the design spec; this
    criterion only requires that a layout switch is present.)

## Out of Scope (for this version)

- Profile management (view/edit user fields) — covered in the User Profile PRD
  (`docs/prd/user-profile.md`).
- Membership purchase flow — covered in the User Membership Purchase PRD
  (`docs/prd/user-membership-purchase.md`).
- Class booking or cancellation — covered in the Class Booking & Cancellation PRD.
- Trainer profiles content and filtering — covered in the Trainer Profiles PRD
  (`docs/prd/trainer-profiles.md`).
- Class schedule content and week navigation — covered in the Class Schedule PRD
  (`docs/prd/class-schedule.md`).
- Push or email notifications for membership expiry — covered in the Notifications PRD.
- OAuth / social login entry points.
- Multi-language support or internationalisation.
- Mobile native app — the portal is a responsive web application.
- Admin-specific navigation shell — admins have their own dashboard layout.

## Open Questions

1. After a successful login, should the user be returned to the originally requested URL
   (stored in the `redirect` query parameter) rather than always routing to `/portal/home`
   or `/portal/plans`? For example, if a user bookmarks `/portal/schedule` and their
   session expires, should they land on the schedule after re-logging in? Assumption: yes,
   preserve the redirect target if one exists — flagging for confirmation.
2. The 7-day expiry warning threshold in criterion 21 — is this the correct lead time, or
   should it be different (e.g., 3 days or 14 days)?
3. Should the membership status widget also display the number of bookings used this month
   vs. the monthly cap (from the active plan's `maxBookingsPerMonth`)? The current scope
   only shows plan name and expiry date. Assumption: bookings used is out of scope for the
   widget — that detail lives on the My Membership page.
4. When a USER-role account has an EXPIRED (not ACTIVE) membership, should they be treated
   identically to a user with no membership (gate to `/portal/plans`) or should they see a
   distinct message like "Your membership has expired — renew it below"? Assumption:
   identical gate behaviour with the standard no-membership banner, but a confirmation is
   needed to determine if a different message is warranted.

## Technical Notes for the Architect

- The membership gate and post-login routing are frontend concerns. A React protected-route
  component wraps all `/portal/*` routes and reads membership status from the Zustand store.
  It should handle three states: (a) loading (membership status not yet fetched), (b) active
  membership, (c) no active membership.
- Membership status must be fetched exactly once per portal session — on the first
  authenticated portal entry — not on every page mount. Individual pages must read from the
  store, not independently call `GET /api/v1/memberships/me`.
- Admin redirection is also a frontend route guard: check `role === 'ADMIN'` from the auth
  store and redirect before rendering any portal page.
- The disabled nav items (Trainers, Schedule) should use `aria-disabled="true"` and
  `tabIndex={-1}` rather than `<a href>` links to be accessible and truly non-interactive.
- The near-expiry warning calculation (`endDate - today`) is a pure frontend calculation
  using data already present in the store; no dedicated backend endpoint is required.
- Store actions for membership purchase and cancellation (defined in the User Membership
  Purchase feature) must dispatch a `refreshMembership` action that the widget subscribes
  to; polling is not acceptable.
