# PRD: Public Landing Page

## Overview
The Public Landing Page is GymFlow's public entry point at `/`. Its job in v1 is simple:
help a visitor understand the product quickly, evaluate membership plans early, and move
into the correct next action without friction.

The page should not try to explain every part of the platform. It is not a full public
content hub, not a schedule browser, and not a trainer catalogue. In v1 it should act as
an intentionally focused first-step page:
- introduce GymFlow as one gym membership and class booking experience
- show real membership plans near the top
- explain the membership-first journey clearly
- route guests and signed-in users into the right next step

## Competitive Context

Research date: **2026-03-29**

- **[ClassPass](https://classpass.com/try)** leads with one clear promise and two clear
  first actions.
- **[PureGym](https://www.puregym.com/)** puts plan information and reassurance high on
  the page.
- **[Equinox](https://www.equinox.com/)** uses stronger brand framing, but still gives
  immediate direction.
- **[F45 Training](https://f45training.com/)** turns program clarity into conversion by
  making the next step obvious.

### Product Decision for GymFlow

The first landing-page drafts pulled in too many jobs at once: marketing, plans,
classes, trainers, trust proof, FAQ, and future route placeholders. That makes the page
feel overloaded and increases implementation complexity before the core booking features
are even public.

For v1, GymFlow should take the smaller path:
- one dominant CTA and one supporting CTA in the hero
- one real conversion section: membership plans
- one short "how it works" explanation
- one compact FAQ or policy block

Classes and trainer discovery can return later as a separate iteration once those public
experiences are more mature.

## Goals
- Give guests a fast understanding of what GymFlow is and what they can do next.
- Surface membership plans early so the user can evaluate the offer before registering.
- Reduce drop-off between first visit and first meaningful action.
- Keep the page focused enough that it feels clear on both desktop and mobile.
- Support returning signed-in users with auth-aware CTA routing.

## Non-Goals
- Build a rich public schedule experience on the homepage.
- Build a public trainer discovery experience on the homepage.
- Turn the landing page into a long-form marketing or editorial page.
- Add speculative content blocks that depend on not-yet-built downstream routes.

## User Roles Involved
- **Guest** — primary audience; evaluates the gym and starts registration or sign-in.
- **User without an ACTIVE membership** — returning signed-in user who should be routed
  to membership plan selection.
- **User with an ACTIVE membership** — returning signed-in member who should be routed
  back into their member area.
- **Admin** — secondary audience only; may see an auth-aware CTA, but admin workflows do
  not shape the landing-page design.

## User Stories

### Happy Path Stories
- As a guest, I want to understand what GymFlow offers within a few seconds so I can
  decide whether to continue.
- As a guest, I want to see available membership plans on the landing page so I can
  evaluate the offer before creating an account.
- As a guest, I want a clear CTA to start joining so I do not have to guess where the
  journey begins.
- As a returning signed-in user without an ACTIVE membership, I want the landing page to
  steer me to plans immediately.
- As a returning signed-in member, I want the landing page to steer me back into the
  member area quickly.

### Edge Case Stories
- As a guest, I want the page to remain useful even if there are no active plans, so I
  do not land on a broken homepage.
- As a guest, I want the page to explain the membership-first booking rule clearly, so I
  understand the product before joining.
- As a signed-in user, I want CTAs to avoid dead ends or future-placeholder routes.
- As a mobile visitor, I want the page to stay clear and easy to act on without
  excessive scrolling.

## Required Page Structure

V1 landing page should contain only these primary sections:

1. **Header**
   - GymFlow logo
   - sign-in action
   - auth-aware primary CTA
2. **Hero**
   - concise value proposition
   - one dominant CTA
   - one supporting CTA
3. **Membership Plans Preview**
   - real active plans
   - plan comparison at a glance
4. **How It Works**
   - short explanation of account -> membership -> booking
5. **FAQ / Policy Block**
   - clarify at minimum that booking requires an ACTIVE membership
6. **Footer**
   - minimal navigation and auth links

## Acceptance Criteria

### Public Access & Navigation

1. The landing page is served at `/` and is publicly accessible without authentication.
2. The header includes the GymFlow logo, a sign-in action, and a primary CTA.
3. A guest sees a primary CTA that starts the join flow and a secondary CTA that helps
   them explore the offer.
4. A signed-in USER without an ACTIVE membership sees a primary CTA that routes toward
   membership plan selection or purchase.
5. A signed-in USER with an ACTIVE membership sees a primary CTA that routes toward the
   member area.
6. The page must not include links to unbuilt public schedule or trainer pages in v1.

### Hero & Value Proposition

7. The first viewport contains a headline, short supporting copy, and the primary CTA
   without requiring scroll on standard desktop and mobile layouts.
8. The hero communicates GymFlow as a membership-first gym and class booking product for
   one gym, not a multi-gym marketplace.
9. The hero includes exactly one secondary exploration CTA.

### Membership Discovery

10. The page contains a membership plans section near the top portion of the page.
11. The plans section displays all active `MembershipPlan` records intended for public
    sale.
12. Each plan card shows at minimum: plan name, price, duration, and
    `maxBookingsPerMonth`.
13. Each plan card has a CTA that routes guests to registration and signed-in eligible
    users to the purchase flow.
14. If no active plans exist, the section remains visible with a clear unavailable state
    and without a misleading purchase CTA.

### Journey Clarity & Trust

15. The page includes a short "how it works" section that explains the real flow:
    create an account, choose a membership, then book classes once membership is active.
16. The page includes a compact FAQ or policy block.
17. The FAQ or policy block explains at minimum that booking classes requires an ACTIVE
    membership.
18. The page content must not claim free trials, refunds, cancellation terms, trainer
    access, or schedule depth unless those are explicitly defined elsewhere in product
    documentation.

### Conversion & Measurement

19. The primary guest CTA routes to the registration flow.
20. A sign-in CTA is available for returning users and routes to the login flow.
21. The landing page tracks analytics events for at least: page view, hero primary CTA
    click, hero secondary CTA click, plan CTA click, and sign-in CTA click.

### Quality

22. The page is fully usable on mobile widths down to 360 px without horizontal scroll.
23. The page uses semantic landmarks, accessible heading hierarchy, keyboard-focusable
    CTAs, and non-decorative images with alt text.
24. The page defines unique SEO metadata for title and description.

## Out of Scope (for this version)
- Public class preview section.
- Trainer spotlight section.
- Public schedule browsing from the landing page.
- Public trainer profile browsing from the landing page.
- Testimonials, reviews, or user-generated proof.
- CMS or admin-managed homepage content editing.
- Blog, article feed, or SEO content hub.
- Lead forms, newsletter signup, or CRM automation.
- Free-trial, promo-code, or campaign-specific landing variants.

## Open Questions

1. Should the supporting hero CTA point to `#plans` or to a short "how it works"
   section?
2. Should active members be routed from the landing page to `/membership` or to a future
   dashboard route once portal navigation expands?
3. Should the FAQ remain always visible in v1, or be collapsible once the frontend team
   implements an accordion pattern?

## Technical Notes for the Architect
- Reuse the existing public membership plans API rather than introducing landing-specific
  summary endpoints.
- Treat the landing page as primarily a frontend composition feature with static content
  plus live plan data.
- CTA behaviour must be auth-aware and rely on the same session state used elsewhere in
  the frontend.
- If future iterations add public class or trainer discovery, they should be treated as
  a separate scope expansion rather than bundled into this v1 landing page.
