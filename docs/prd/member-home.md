# PRD: Member Home

## Overview
Member Home is the default logged-in destination for GymFlow users. It gives the user a single place to understand their current membership status, take the next relevant membership action, discover trainers, and browse upcoming group classes without being dropped back into the full plans catalogue after they already have an active plan.

## Goals
- What user problem does this solve?
  Logged-in users currently have to move between separate pages to understand their membership status, discover trainers, and browse group classes, and users with an active membership still see the full plans catalogue as a primary destination.
- What business outcome does it enable?
  A focused member home improves post-login orientation, reduces friction after purchase, increases discovery of trainers and classes, and creates a clear foundation for later booking and personal-training flows.

## User Roles Involved
- User

## User Stories
Format every story as:
As a {role}, I want to {action} so that {benefit}.

### Happy Path Stories
- As a User, I want to land on a dedicated member home after login so that I can immediately see what matters to me inside the club.
- As a User with an ACTIVE membership, I want to see my current plan summary first so that I understand what I bought without being sent back to a full plans catalogue.
- As a User without an ACTIVE membership, I want to see a clear purchase entry point on the home page so that I can activate a plan without searching the portal.
- As a User, I want to browse a trainer carousel with photos and concise profile highlights so that I can quickly discover trainers available in the club.
- As a User, I want to browse an upcoming group classes carousel so that I can quickly see what group training options are available next.
- As a User, I want clear links from the home page into the full trainer and class experiences so that I can continue exploring when I need more detail.

### Edge Case Stories
- As a User, I want the page to remain usable if one section fails to load so that a trainer or class-data issue does not block my membership view.
- As a User with no ACTIVE membership, I want a clear empty state in the membership section instead of a misleading current-plan card so that the page accurately reflects my status.
- As a User, I want a clear empty state when no trainers exist yet so that the home page does not look broken.
- As a User, I want a clear empty state when no upcoming group classes are scheduled so that I understand there is nothing available right now.
- As a User, I want the home page to reflect my latest membership state after purchase, cancellation, or expiry so that I am not shown stale actions or stale entitlement messaging.

## Acceptance Criteria
1. Authenticated `USER` accounts are routed to Member Home as their primary post-login destination instead of the membership plans catalogue.
2. Member Home is accessible only to authenticated `USER` accounts; unauthenticated visitors must be required to sign in before any member-home content is shown.
3. Member Home contains three primary sections in this version: membership status, trainer discovery preview, and upcoming group classes preview.
4. The membership status section is the first primary content section on the page.
5. If the user has an ACTIVE membership, the membership section displays the current membership's plan name, status, start date, end date, and booking-entitlement summary using the same source of truth as the existing membership feature.
6. If the user has an ACTIVE membership, Member Home must not render the full public plans catalogue inline as the main content of the page.
7. If the user does not have an ACTIVE membership, the membership section shows a no-active-membership state with a clear primary action to activate a plan.
8. If the user does not have an ACTIVE membership and at least one active plan exists, Member Home provides a direct path to activate a plan from the membership section, either inline or by linking into the existing purchase flow.
9. If no active plans exist, the membership section shows a clear unavailable state rather than an empty purchase area.
10. The trainer preview section renders as a horizontally browseable carousel of trainer cards.
11. Each trainer preview card includes, at minimum, trainer photo (or placeholder), trainer name, specialization information, and one concise supporting text element such as a short bio excerpt or experience summary.
12. The trainer preview section includes a clear path to the full trainer discovery experience.
13. The trainer preview section does not expose personal-training booking or trainer-selection actions in this version.
14. The upcoming group classes preview section renders as a horizontally browseable carousel of upcoming classes.
15. Each class preview card includes, at minimum, class name, scheduled date, scheduled start time, and assigned trainer name or a clear placeholder such as `Trainer TBA`.
16. The upcoming group classes preview uses the same schedule source of truth as the member-facing group schedule.
17. The upcoming group classes preview excludes classes that are not in `SCHEDULED` status.
18. The upcoming group classes preview includes a clear path to the full group classes schedule experience.
19. If the trainer preview data fails to load, the membership section and classes section still render normally and the trainer section shows its own retryable error state.
20. If the group classes preview data fails to load, the membership section and trainer section still render normally and the classes section shows its own retryable error state.
21. If the membership section fails to load, the trainer and classes preview sections still render normally and the membership section shows its own retryable error state.
22. If no trainers are available, the trainer section shows a clear empty state instead of a broken carousel.
23. If no upcoming group classes are available, the classes section shows a clear empty state instead of a broken carousel.
24. After a successful membership purchase from the home experience, the home page refreshes to the ACTIVE-membership state without requiring the user to log out and back in.
25. After the user's ACTIVE membership is cancelled or is no longer ACTIVE, the next load of Member Home shows the no-active-membership state instead of the previous current-plan summary.
26. The page remains readable and usable on mobile and desktop, with no horizontal page-level overflow at 360 px width.

## Out of Scope (for this version)
- Group class booking or cancellation directly from Member Home.
- Personal trainer selection, enquiry, or booking flows.
- Membership upgrade, downgrade, or plan-switch logic.
- Replacing the full trainer discovery page or full group schedule page.
- Admin-specific controls or admin dashboard content.
- Notifications, recommendations, or personalized ranking of trainers or classes.
- Historical activity, attendance history, or usage analytics for the member.

## Open Questions
- Assumption for confirmation: the first version may reuse the existing membership purchase flow from Member Home rather than introducing a brand-new inline checkout pattern.
- Assumption for confirmation: the trainer and classes preview sections are visible to any authenticated `USER` account, including users who do not currently have an ACTIVE membership.

## Technical Notes for the Architect
- This page is an aggregation surface that depends on multiple existing features and should tolerate partial failures section by section.
- Membership state is permission-sensitive because it changes which actions are shown, even though the page itself is still a logged-in user surface.
- The page should reuse existing membership, trainer, and schedule sources of truth instead of introducing duplicate summary data stores.
- The home page will likely become the integration point for later booking and personal-training flows, so CTA placement and entitlement handling should remain extensible.
