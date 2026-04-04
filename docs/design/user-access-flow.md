# Design: User Access Flow

## Reference
- PRD: `docs/prd/user-access-flow.md`
- SDD: pending
- Design System: `docs/design/system.md`
- Related designs:
  - `docs/design/member-home.md`
  - `docs/design/membership-plans.md`
  - `docs/design/user-membership-purchase.md`
- Date: 2026-04-04

## Design Decisions
1. `Home` is the only primary post-login destination for authenticated `USER` accounts.
2. The authenticated primary navigation removes `Plans` as a top-level tab and keeps `Home`, `Schedule`, `Trainers`, `My Favorites`, and `Profile`.
3. The first major content block on `/home` is always the membership access section. It changes by membership state instead of sending the user to a separate promotional tab.
4. Users with an `ACTIVE` membership see a focused summary card only. They do not see inline plan comparison or a `Compare plans` CTA until upgrade and switch logic exist.
5. Users without an `ACTIVE` membership see a limited preview of highlighted plans directly inside the membership section. The preview is capped at three cards on desktop and one card plus peek on mobile.
6. The full authenticated comparison experience stays on the existing `/plans` route, but it becomes a secondary surface reached from the membership section rather than from primary nav.
7. Legacy logged-in `/plans` entries are state-aware:
   - no active membership: open the authenticated comparison page
   - active membership: redirect to `/home#membership` and show an informational banner
8. Purchase success returns the user to `/home#membership` in the `ACTIVE` state with a transient success banner so the access change is immediately visible.

## User Flows
### Flow 1 - Login lands on Home
1. Authenticated `USER` signs in.
2. The app routes them to `/home`.
3. The authenticated shell highlights `Home` and does not show `Plans` in the main nav.
4. The first visible content block is the membership access section.

### Flow 2 - Active member opens Home
1. User lands on `/home`.
2. Membership access section renders the current plan summary first.
3. The section shows `planName`, `status`, `startDate`, `endDate`, and monthly booking usage.
4. Primary actions stay operational: `Manage membership` and `Open schedule`.
5. No inline plan catalogue or comparison CTA is shown.

### Flow 3 - No active membership opens Home
1. User lands on `/home`.
2. Membership access section renders the no-membership state.
3. Up to three highlighted plans appear as compact comparison cards.
4. Each card shows `planName`, `duration`, `price`, and one concise supporting value point.
5. User clicks `Compare all plans` or a highlighted card CTA.
6. App routes to `/plans` with authenticated comparison content and purchase actions.

### Flow 4 - No active plans available
1. User without an active membership lands on `/home`.
2. Membership access section checks the active plan catalogue.
3. If no active plans are returned, the teaser rail is replaced with a single unavailable state.
4. The state explains that plan availability is temporarily unavailable instead of implying a broken page.
5. User can retry the fetch or continue to browse the club with non-booking destinations.

### Flow 5 - Purchase returns to Home
1. User without an active membership navigates from `/home` to `/plans`.
2. User completes the existing membership purchase flow.
3. On success, app routes to `/home#membership`.
4. Membership access section re-renders in the `ACTIVE` state without a new login.
5. A success banner confirms that booking access is now unlocked.

### Flow 6 - Legacy logged-in Plans entry point
1. Authenticated user opens a stale `/plans` bookmark.
2. If the user does not have an `ACTIVE` membership, the app opens the authenticated comparison page normally.
3. If the user already has an `ACTIVE` membership, the app redirects to `/home#membership`.
4. Home shows an info banner: `Your membership is already active. Manage your current access here.`

## Screens & Components
### Screen: Authenticated App Shell (`USER`)
Who sees it: authenticated `USER` accounts only.

Purpose: keep the logged-in information architecture operational and consistent across desktop and mobile after removing the `Plans` nav tab.

Layout:
- Desktop shell: sticky top navigation over `bg-[#0F0F0F]`
- Page container: `mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8`
- Mobile shell: sticky top bar plus bottom navigation bar with five destinations

#### PrimaryNavigation
- Items:
  - `Home`
  - `Schedule`
  - `Trainers`
  - `My Favorites`
  - `Profile`
- Active item styling:
  - desktop tab: `border-b-2 border-green-500 text-green-400`
  - mobile item: icon + label with `text-green-400`
- Removed item:
  - `Plans` is not rendered as a primary navigation item for authenticated `USER` accounts.
- Reuse notes:
  - keep authenticated shell styling aligned with Member Home and Trainer Discovery rather than creating a second logged-in nav treatment.

### Screen: Home (`/home`)
Who sees it: authenticated `USER` accounts.

Purpose: act as the primary logged-in destination and make access status obvious before secondary discovery content.

Layout:
- Content order:
  1. Membership access section
  2. Existing Member Home secondary sections such as trainers and class previews
- Membership section spacing:
  - `rounded-[28px] border border-gray-800 bg-gray-900 p-6 shadow-xl shadow-black/30 sm:p-8`

#### MembershipAccessSection
- Purpose: turn membership state into the first and clearest decision surface on Home.
- Shared header copy:
  - Eyebrow: `Your access`
  - Title:
    - active membership: current plan name
    - no active membership: `Activate your access`
    - no plans available: `Memberships are temporarily unavailable`
- Layout:
  - `flex flex-col gap-6`
  - header row `flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between`
- Reuse notes:
  - reuse membership status badge, booking usage logic, and active plan source of truth from existing membership features.

##### ActiveMembershipSummary
- Shows:
  - `planName`
  - `status`
  - `startDate`
  - `endDate`
  - `bookingsUsedThisMonth`
  - `maxBookingsPerMonth`
- Supporting copy: `Your membership is active and ready for class booking.`
- Metrics layout:
  - `grid gap-4 sm:grid-cols-3`
- Actions:
  - primary: `Manage membership`
  - secondary: `Open schedule`
- Hidden in this state:
  - highlighted plan cards
  - `Compare all plans`
- Tailwind structure:
  - card shell: `rounded-[24px] border border-gray-800 bg-[#0F0F0F] p-6 shadow-md shadow-black/40`

##### InactiveMembershipPreview
- Who sees it:
  - users with membership status `EXPIRED`, `CANCELLED`, or no membership record
- Supporting copy: `Pick a plan to unlock booking and member-only access.`
- Section actions:
  - primary: `Compare all plans` routes to `/plans`
  - secondary: `See schedule` routes to `/schedule`
- Preview rail:
  - desktop: 3 compact cards in a row
  - tablet/mobile: horizontal swipe rail with next-card peek
- Card data:
  - `planName`
  - `duration`
  - `price`
  - one value point such as `20 bookings per month`
- Card CTA:
  - `View plan`
  - routes to `/plans` with the chosen plan visually emphasized
- Tailwind structure:
  - rail: `grid gap-4 lg:grid-cols-3`
  - card: `rounded-2xl border border-gray-800 bg-[#111827] p-5 shadow-md shadow-black/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-green-500/40`
- Ranking:
  - show the first three highlighted plans from the active plan dataset after ranking at the presentation layer.

##### NoPlansAvailableState
- Who sees it:
  - authenticated user without an `ACTIVE` membership when active plan catalogue is empty
- Title: `No plans available right now`
- Body: `There are currently no memberships available to activate. This is a catalogue issue, not a problem with your account.`
- Actions:
  - primary: `Retry`
  - secondary: `Browse trainers`
- Tailwind structure:
  - `rounded-2xl border border-orange-500/30 bg-orange-500/10 p-6`

##### MembershipSuccessBanner
- Trigger:
  - user returns from successful membership purchase
- Copy:
  - title: `Membership activated`
  - body: `Your access is live and class booking is now available.`
- Placement:
  - pinned above the membership card on the next `/home` render only
- Tailwind structure:
  - `rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-4 text-green-100`

##### MembershipInfoRedirectBanner
- Trigger:
  - active member is redirected from `/plans` to `/home#membership`
- Copy: `Your membership is already active. Manage your current access here.`
- Placement:
  - above the membership card
- Tailwind structure:
  - `rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-4 text-blue-100`

### Screen: Authenticated Plans Comparison (`/plans`)
Who sees it: authenticated `USER` accounts without an `ACTIVE` membership, or users opening a direct authenticated comparison link before purchasing.

Purpose: keep full comparison and purchase on a dedicated route, but make it clearly secondary to Home instead of a peer destination in primary navigation.

Layout:
- Page shell: `mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8`
- Header stack above plan grid
- No `Plans` item highlighted in primary nav because the route is secondary, not primary

#### PlansContextHeader
- Elements:
  - back link: `Back to Home`
  - eyebrow: `Membership access`
  - title: `Choose the plan that unlocks your booking access`
  - body: `Compare all current options, then continue into the existing purchase flow.`
- Optional context badge:
  - `No active membership`
- Tailwind structure:
  - `rounded-[28px] border border-gray-800 bg-gray-900 p-6 shadow-xl shadow-black/30`

#### AuthenticatedPlanGrid
- Reuses:
  - active plan source of truth from Membership Plans
  - purchase CTA behavior from User Membership Purchase
- Differences from public marketing plans page:
  - stronger access-focused header
  - optional `Highlighted on Home` badge on plans promoted from the preview rail
  - back link to `/home#membership`
- Card actions:
  - primary: `Activate`
  - secondary: `View details`

#### ActiveMemberRedirectState
- Trigger:
  - authenticated user with an `ACTIVE` membership opens `/plans`
- Behaviour:
  - immediate route transition to `/home#membership`
  - info banner rendered after redirect
- No intermediate empty screen should flash for longer than one frame.

## Component States
| Component | Loading | Empty | Error | Populated |
|-----------|---------|-------|-------|-----------|
| Authenticated App Shell | nav chrome renders immediately | n/a | n/a | current destination is highlighted and `Plans` is absent |
| MembershipAccessSection | summary skeletons for title, metrics, and teaser cards | no-plans unavailable state | membership fetch failure card with retry | active summary or inactive preview |
| ActiveMembershipSummary | skeleton metrics | n/a | membership-specific retry card | current plan summary with booking usage |
| InactiveMembershipPreview | 3 skeleton cards on desktop, swipe skeleton cards on mobile | replaced by unavailable state when no active plans exist | inline plan-preview error card with retry | up to 3 highlighted plan cards and `Compare all plans` CTA |
| Authenticated Plans Comparison | existing plan-card skeletons | `No plans available right now` | `Failed to load plans` with retry | full authenticated comparison grid |
| Redirect banner | hidden until redirect occurs | hidden | n/a | informational message after `/plans` redirect |
| Success banner | hidden until purchase succeeds | hidden | n/a | one-time confirmation on return to Home |

## Error Code -> UI Message
| Error Code | Message shown to user | Location |
|-----------|----------------------|----------|
| `NO_ACTIVE_MEMBERSHIP` | `Pick a plan to unlock booking and member-only access.` | MembershipAccessSection inactive state |
| `PLAN_NOT_FOUND` / `PLAN_NOT_AVAILABLE` | `That plan is no longer available. Please choose another option.` | Authenticated Plans Comparison or purchase flow |
| empty active-plan catalogue | `There are currently no memberships available to activate.` | NoPlansAvailableState |
| generic membership fetch failure | `We couldn't load your current access. Please try again.` | MembershipAccessSection |
| generic plan fetch failure | `We couldn't load plans right now. Please try again.` | Authenticated Plans Comparison |
| `MEMBERSHIP_ALREADY_ACTIVE` | `Your membership is already active. Manage your current access here.` | Redirect banner after `/plans` attempt |

## Responsive Behaviour
- Mobile:
  - primary nav condenses to top bar plus bottom navigation with five destinations
  - membership section remains first and spans full width
  - inactive plan preview becomes a horizontal swipe rail with one full card and partial next card visible
  - `Compare all plans` remains pinned inside the membership section footer
- Tablet:
  - membership metrics can use a 2-column then 3-column grid depending on available width
  - preview cards may wrap to two columns before switching to a full desktop row
- Desktop:
  - membership card remains visually dominant and precedes all discovery sections
  - plan preview shows exactly three compact comparison cards when data allows
  - `/plans` uses a wide grid and a strong back-to-home affordance instead of relying on nav position

## Motion & Interaction Notes
- Home entry:
  - membership section fades up first with `duration-300`
  - secondary sections can stagger afterward so access status is always perceived first
- Preview cards:
  - hover lift limited to `translateY(-2px)` to keep the section calm and operational
- Success state:
  - purchase-return banner slides down once and fades after dismissal or route change
- Redirect state:
  - no modal interruption; redirect should feel immediate and explanatory, not punitive
