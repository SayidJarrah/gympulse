# Design: Public Landing Page

## Benchmark

| Pattern | Reference | What we borrow |
|---------|-----------|----------------|
| Hero with dual CTA (primary action + secondary scroll anchor) | ClassPass public homepage | Guest receives one clear purchase CTA and one soft "learn more" anchor — no decision paralysis |
| Auth-aware hero (CTA mutates for signed-in users) | Whoop.com | Returning members skip the sales pitch and jump straight to their dashboard action |
| Plans-near-top layout (pricing visible before fold) | Peloton membership page | Guests can evaluate the offer without scrolling — reduces bounce on mobile |
| "How it works" numbered steps below plans | CrossFit affiliate sites | Explains the membership-first booking rule in plain language after the price is already visible |

## Experience Goals

- Make `/` feel like a clear first step, not a dense marketing page.
- Put membership plan discovery near the top so guests can evaluate the offer quickly.
- Keep the page short enough that the scroll feels intentional on mobile.
- Use auth-aware CTA changes to help returning users continue without friction.
- Explain the membership-first booking rule in a calm, direct way.

## Visual Direction

### Theme: Focused Start

The landing page should feel sharper and calmer than the earlier concept. It still uses
GymFlow's dark-first system, but the mood shifts from "show everything" to "guide the
next move." The visual language should feel like a disciplined training floor: strong
headline, clean spacing, one accent color doing most of the work, and only a few pieces
of supporting information visible at once.

### Typography

- Body UI keeps the existing `Inter` system from
  [system.md](/Users/d.korniichuk/IdeaProjects/gympulse/docs/design/system.md).
- The hero headline and step numerals use `Barlow Condensed` to add athletic character
  without making the rest of the page feel editorial or noisy.
- Headlines stay short. Supporting copy should rarely exceed two compact lines per block.

### Color Application

- Base page background: `#0F0F0F`
- Primary surface: `#111827`
- Secondary surface: `#1F2937`
- Primary action color: `#22C55E`
- Accent color: `#F97316`, used only for small emphasis such as a plan highlight badge
- Hero background may use a subtle green radial glow and a faint grid texture, but the
  background must stay secondary to the content

### Motion

- Hero text and plans section can use a short fade-and-rise entrance (`200-250ms`).
- Plan cards may lift slightly on hover.
- Avoid layered animated panels, rotating elements, or multiple moving proof blocks.

## User Flows

### Flow 1 - Guest lands on `/`

1. Guest sees a concise value proposition, `Join GymFlow`, and one supporting CTA.
2. Guest scrolls into plan cards to compare the offer.
3. Guest reads the short "how it works" explanation if they need more clarity.
4. Guest clicks the hero CTA or a plan CTA and goes to `/register`.

### Flow 2 - Signed-in user without ACTIVE membership

1. User lands on `/`.
2. Hero primary CTA changes to `View membership plans`.
3. Plans become the main decision block.
4. Supporting CTA can point to `#journey` if more explanation is helpful.

### Flow 3 - Signed-in user with ACTIVE membership

1. User lands on `/`.
2. Hero primary CTA changes to `Open member area`.
3. The page still shows plans for context, but the user has a clear route back into the
   product.

### Flow 4 - No active plans

1. The plans section still renders in the same page position.
2. Cards are replaced with one clear unavailable state.
3. The page remains useful because the hero, journey explanation, and FAQ still work.

## Screen: Public Landing Page (`/`)

Who sees it: Guest, signed-in USER, signed-in ADMIN

Layout: Single-column public page with a sticky header, compact hero, plans section,
three-step journey section, static FAQ block, and small footer. Content width uses
`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8`. Vertical rhythm should feel tighter than the
earlier concept: `py-14` to `py-20` rather than oversized showcase spacing.

## Section Structure

### LandingHeader

- Data shown: GymFlow wordmark, minimal anchor links, `Sign in`, auth-aware primary CTA
- Anchor links:
  - `Plans`
  - `How it works`
  - `FAQ`
- Behaviour:
  - sticky header with `bg-gray-900/75 backdrop-blur-md`
  - mobile keeps only the logo, `Sign in`, and primary CTA visible
  - no hamburger menu is required in v1 because there are only a few anchors

### HeroSection

- Purpose: explain the product and make the next step obvious
- Required content:
  - eyebrow
  - one strong headline
  - short supporting copy
  - one primary CTA
  - one supporting CTA
  - one short policy note: `Booking opens after membership activation`
- Layout:
  - desktop: simple two-column layout
  - left: copy and CTAs
  - right: one supporting information panel, not a multi-card cluster
- Supporting panel content:
  - short summary of the GymFlow journey
  - example labels such as `Join`, `Choose plan`, `Book when active`

### PlansPreviewSection (`#plans`)

- Position: directly below the hero
- Data shown: all active public `MembershipPlan` records with `name`, `price`,
  `durationDays`, and `maxBookingsPerMonth`
- User actions:
  - guest -> CTA routes to `/register`
  - signed-in user without membership -> CTA routes to `/plans`
  - active member -> CTA becomes lower-emphasis `Compare plans`
- Card styling:
  - clean, equal-height cards
  - one plan may be visually highlighted in v1
  - highlight must not rely on fake popularity claims
- Empty state:
  - title `Membership plans are being updated`
  - helper copy explaining that plans will return here once active offerings are
    available

### HowItWorksSection (`#journey`)

- Purpose: remove ambiguity without adding another large proof section
- Layout:
  - three cards or three compact columns on desktop
  - stacked cards on mobile
- Steps:
  1. `Create your account`
  2. `Choose a membership`
  3. `Book classes once active`
- Copy stays operational and short

### FaqSection (`#faq`)

- Purpose: answer the minimum product questions that block conversion
- Questions:
  - `Do I need a membership to book classes?`
  - `Can I compare plans before creating an account?`
  - `What happens after I sign up?`
- Layout:
  - static stacked cards in v1
  - accordion behaviour is optional later, not required for the first design

### LandingFooter

- Content:
  - GymFlow wordmark
  - one-line brand statement
  - links to `Plans`, `Sign in`, and `Register`
- Keep the footer compact. No large sitemap or social area in v1.

## Auth-Aware CTA Rules

| Persona | Hero primary CTA | Header primary CTA | Supporting CTA |
|---------|------------------|--------------------|----------------|
| Guest | `Join GymFlow` -> `/register` | `Create account` -> `/register` | `Browse plans` -> `#plans` |
| USER without ACTIVE membership | `View membership plans` -> `/plans` | `Choose a plan` -> `/plans` | `See how it works` -> `#journey` |
| USER with ACTIVE membership | `Open member area` -> `/membership` | `Go to portal` -> `/membership` | `Review plans` -> `#plans` |
| ADMIN | `Manage plans` -> `/admin/plans` | `Admin dashboard` -> `/admin/plans` | `Browse plans` -> `#plans` |

## Responsive Behaviour

- Mobile first at `360px`
- Header stays single-row and compact
- Hero CTA stack becomes vertical below `sm`
- Plans use one column on mobile, two on tablet, three on desktop
- "How it works" becomes a simple stacked sequence on mobile
- FAQ cards remain readable without accordion interaction

## Empty, Loading, and Error States

- The page should only have one live-content state for v1: plans
- Plans loading:
  - render skeleton cards matching final card height
- Plans empty:
  - render one centered unavailable card
- Plans error:
  - render a small inline error block with `Try again`
- The rest of the page must continue rendering regardless of plan state

## Content Rules

- Do not add class previews, trainer spotlights, testimonials, or future-route callouts
  in this version
- Do not make policy promises beyond the approved booking rule
- Keep section count low and copy short
- If a new content block cannot clearly justify conversion or comprehension, leave it out

## Accessibility Notes

- Use semantic landmarks: `header`, `main`, `section`, `footer`
- Preserve heading order with one `h1` and one `h2` per section
- CTAs need visible focus rings and clear labels
- Supporting panel and plan highlight cannot rely on color alone to communicate meaning
- The policy note about membership-first booking should remain plain text, not only a
  decorative badge

## Prototype Notes

- HTML prototype file:
  [landing-page.html](/Users/d.korniichuk/IdeaProjects/gympulse/docs/design/prototypes/landing-page.html)
- Prototype includes persona switching for guest, signed-in non-member, active member,
  and admin
- Prototype includes a single content-state toggle for plans available vs unavailable
- Prototype intentionally excludes classes and trainer sections so implementation starts
  from the reduced scope rather than the older, overloaded concept
