# Design: Member Home

## Reference
- PRD: `docs/prd/member-home.md`
- SDD: pending
- Design System: `docs/design/system.md`
- Date: 2026-04-04

## User Flows
1. Logged-in `USER` lands on `/home` immediately after login instead of `/plans`.
2. Member Home loads the membership section first. If the user has an ACTIVE membership, the current plan summary is shown. If not, the hero card switches to a membership-required state with plan activation CTAs.
3. User scrolls horizontally through the trainer carousel, reading trainer photos, specializations, and short profile highlights. Clicking a trainer card routes to `/trainers/{id}`.
4. User scrolls horizontally through the upcoming group classes carousel, reading class name, date, time, and trainer name. Clicking the section CTA routes to `/schedule`.
5. User with no active membership can still browse the trainer and class preview sections, but the membership section keeps the main CTA focused on plan activation.
6. A section-level API failure affects only that section. Membership, trainers, and classes each show their own error card with a retry action while the rest of the page remains usable.
7. After a successful membership purchase from the home experience, the home page reloads into the ACTIVE-membership state without a full logout/login cycle.
8. User interacts with carousel controls in the trainer and class sections. Both sections support horizontal browse, previous/next controls, and visible progress indicators so the page feels curated rather than static.
9. User uses quick actions near the membership area to jump into the most emotionally relevant next steps, such as tonight’s classes or favorite coaches.

## Screens & Components
### Screen: Member Home (`/home`)
Who sees it: authenticated `USER` accounts only. Unauthenticated visitors are redirected to `/login`. `ADMIN` users do not use this page as their primary destination.
Purpose: give members a focused, modern home surface with membership status first, followed by trainer and class discovery.
Layout: `min-h-screen bg-[#0F0F0F]`; sticky shared `Navbar`; page shell `mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8`.

#### WelcomeHero
- Purpose: establish context and make the page feel like the user's club portal rather than a plan catalogue.
- Data shown: static greeting shell, optional user-first-name personalization if already available, one short descriptor line, two compact club stats, and a small set of floating contextual chips.
- Tailwind structure:
  - Container: `overflow-hidden rounded-[28px] border border-gray-800 bg-gray-900 p-6 shadow-xl shadow-black/40 sm:p-8`
  - Background treatment: animated radial green highlight plus low-contrast mesh pattern
  - Layout: `grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end`
- Reuse notes: this visual style should be reusable for future member-home hero surfaces.

- Heading: `Welcome back`
- Body copy:
  - Active member: `Everything important in your club, in one place.`
  - No active membership: `Activate a plan to unlock booking and full member access.`

#### MembershipPrimaryCard
- Purpose: make membership status the first and most important block on the page.
- Data shown when ACTIVE: `planName`, `status`, `startDate`, `endDate`, `bookingsUsedThisMonth`, `maxBookingsPerMonth`.
- User actions when ACTIVE: `Manage membership` routes to `/membership`.
- User actions when no ACTIVE membership: `Browse plans` routes to `/plans`; optional secondary CTA `Activate plan`.
- Tailwind structure:
  - Card: `rounded-[24px] border border-gray-800 bg-[#0F0F0F] p-6 shadow-md shadow-black/40`
  - Header row: `flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between`
  - Metrics row: `grid gap-4 sm:grid-cols-3`
  - Footer CTA row: `mt-6 flex flex-col gap-3 sm:flex-row`
- Reuse notes: reuse existing membership status data and badge logic rather than inventing new plan-specific summary DTOs.

##### ACTIVE state
- Headline: current plan name
- Status badge: reuse Membership status badge with ACTIVE styling
- Supporting line: `Your membership is active and ready for class booking.`
- Metrics:
  - `Start date`
  - `End date`
  - `Bookings this month`
- Booking usage bar remains informational only in this version.
- Main CTA: `Manage membership`
- Secondary CTA: `Explore classes`

##### NO_ACTIVE_MEMBERSHIP state
- Headline: `No active membership`
- Supporting line: `Pick a plan to unlock class booking and member access.`
- If active plans exist: show up to 3 compact plan teaser chips or cards with plan name, duration, and price.
- If no active plans exist: replace teaser row with `No plans available right now. Please check back later.`
- Main CTA: `Browse plans`
- Secondary CTA: `See what’s inside the club`

##### Error state
- Heading: `Membership unavailable`
- Body: `We couldn’t load your current membership. Please try again.`
- CTA: `Retry`

#### TrainerCarouselSection
- Purpose: surface trainer discovery in a fast, visual, swipeable format.
- Data shown per card: profile photo or placeholder, full name, up to 2 specialization tags plus overflow count, one short supporting line (experience or bio excerpt), and a compact CTA.
- User actions:
  - Scroll horizontally
  - Use previous / next arrow controls
  - Use progress dots to jump to a specific card position
  - Click card or CTA to open trainer profile
  - Click section CTA `See all trainers` to route to `/trainers`
- Tailwind structure:
  - Section shell: `flex flex-col gap-4`
  - Header row: `flex items-end justify-between gap-4`
  - Rail: viewport + translated track, with optional native swipe fallback on mobile
  - Card: `min-w-[280px] max-w-[280px] snap-start rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-md shadow-black/40 transition-all duration-200 hover:border-gray-700 hover:-translate-y-0.5`
- Reuse notes: content comes from Trainer Discovery, but the card density is lighter and more editorial than the full list page.

- Section title: `Meet the coaches`
- Section body: `Browse a few standout trainers and jump into the full roster when you want more detail.`
- Card CTA: `View profile`
- Carousel controls:
  - `Previous`
  - `Next`
  - dot indicators below the rail

#### UpcomingClassesCarouselSection
- Purpose: preview upcoming group classes without forcing the user into the full schedule first.
- Data shown per card: class name, scheduled date, start time, trainer name or `Trainer TBA`, and one short descriptive badge such as class type or duration.
- User actions:
  - Scroll horizontally
  - Use previous / next arrow controls
  - Use progress dots to jump to another class
  - Click `See full schedule` to route to `/schedule`
- Tailwind structure:
  - Section shell: `flex flex-col gap-4`
  - Rail: viewport + translated track, with mobile swipe behavior preserved
  - Card: `min-w-[304px] max-w-[304px] snap-start rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-md shadow-black/40`
  - Time badge: `inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300`
- Reuse notes: data source should match the member schedule source of truth and filter to `SCHEDULED` only.

- Section title: `Next up in the club`
- Section body: `A quick look at the upcoming group programme before you open the full schedule.`
- Primary section CTA: `See full schedule`
- Carousel controls:
  - `Previous`
  - `Next`
  - dot indicators below the rail

#### QuickActionsPanel
- Purpose: give the member emotionally relevant next steps without making the page feel like a dashboard grid.
- Data shown: 3 lightweight action cards driven by current club context and membership state.
- User actions: jump into likely next tasks such as tonight’s classes, favorite coaches, or weekly highlights.
- Tailwind structure:
  - Panel: `rounded-[24px] border border-gray-800 bg-gray-900 p-6 shadow-md shadow-black/40`
  - Action cards: `rounded-2xl border border-gray-800 bg-[#0F0F0F] px-4 py-4 text-left transition-all duration-200 hover:border-green-500/40 hover:bg-gray-800/60`
- Reuse notes: designed to stay compact and complement the membership card rather than compete with it.

#### SectionErrorCard
- Purpose: keep failures isolated to one section.
- Tailwind structure: `rounded-2xl border px-5 py-5`
- Trainer error copy: `Could not load trainers right now.`
- Classes error copy: `Could not load upcoming classes right now.`
- CTA: `Retry`

#### SectionEmptyCard
- Purpose: avoid blank rails when content is unavailable.
- Tailwind structure: `rounded-2xl border border-gray-800 bg-gray-900 px-6 py-10 text-center`
- Trainer empty title: `No trainers to show yet`
- Trainer empty body: `Trainer profiles will appear here once the roster is ready.`
- Classes empty title: `No upcoming classes`
- Classes empty body: `There are no scheduled group classes in the current preview window.`

#### MembershipAccessBanner

- Purpose: confirm to the returning member that a post-purchase navigation round-trip completed successfully, or explain why their membership state has not changed.
- Trigger: rendered by `MemberHomePage` when the `membershipBanner` query param is present on page load. The param is stripped from the URL immediately after reading.
- Location in layout: renders inside the membership section `<div>`, above `MembershipPrimaryCard`.

##### `activated` variant
- Styling: green success banner.
- Tailwind tokens (within design system): `border-green-500/30 bg-green-500/10 text-green-300`.
- Copy: confirms the plan was activated and membership is now active.

##### `already-active` variant
- Styling: blue informational banner.
- Tailwind tokens used in implementation: `border-blue-500/30 bg-blue-500/10 text-blue-300`.
- **Design system note:** this uses an ad-hoc blue that is outside the documented design system colour tokens. The design system defines no blue semantic token. This should be revisited and aligned with the system palette in a future design pass.
- Copy: informs the user that their membership was already active when the activation was attempted.

## Component States
| Component | Loading | Empty | Error | Populated |
|-----------|---------|-------|-------|-----------|
| Member Home | Hero and membership card render first; trainer and class sections can show skeleton rails independently. | N/A at page level. | N/A at page level; failures are section-scoped. | All three sections render together. |
| MembershipPrimaryCard | Skeleton blocks for title, dates, and usage bar. | No-active-membership state with plan CTAs. | Membership-specific retry card. | Current plan summary with status badge and CTA. |
| QuickActionsPanel | Skeleton action tiles. | Hidden when actions are not available. | Hidden; membership card remains primary. | 2–3 contextual action cards. |
| TrainerCarouselSection | 3 skeleton cards in a horizontal rail. | Centered empty-state card. | Section error card with Retry. | Horizontal carousel with real trainer cards. |
| UpcomingClassesCarouselSection | 3 skeleton cards in a horizontal rail. | Centered empty-state card. | Section error card with Retry. | Horizontal carousel of upcoming class cards. |

## Error Code → UI Message
| Error Code | Message shown to user | Location |
|-----------|----------------------|----------|
| `NO_ACTIVE_MEMBERSHIP` | `Pick a plan to unlock class booking and member access.` | MembershipPrimaryCard empty state |
| `PLAN_NOT_FOUND` / `PLAN_NOT_AVAILABLE` | `That plan is no longer available. Please choose another option.` | Membership activation surface on Member Home |
| generic membership fetch failure | `We couldn’t load your current membership. Please try again.` | MembershipPrimaryCard |
| generic trainer fetch failure | `Could not load trainers right now.` | TrainerCarouselSection |
| generic classes fetch failure | `Could not load upcoming classes right now.` | UpcomingClassesCarouselSection |

## Responsive Behaviour
- Mobile:
  - Hero stacks into a single column.
  - Membership card metrics collapse into one column.
  - Both carousels use swipeable horizontal rails with visible next-card peeking.
  - Section CTAs remain visible above the rails.
- Tablet:
  - Hero can split into content + compact stat panel.
  - Rails maintain horizontal browse behavior.
- Desktop:
  - Hero uses split layout.
  - Membership section remains full-width and dominant.
  - Carousels remain horizontal instead of switching to static grids so the page keeps a curated, browse-first feel.
