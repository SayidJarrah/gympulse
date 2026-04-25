# PRD: Group Classes Schedule View

## Overview
The Group Classes Schedule View gives Members a read-only way to browse the gym's upcoming group class programme inside the user portal. It reuses the schedule maintained in the admin Scheduler feature and presents classes in weekly, daily, and list views so users can quickly understand what is happening, when it starts, and which trainer is assigned. This feature is for discovery and planning only; booking, waitlist, and trainer contact actions are explicitly outside this version.

## Goals
- What user problem does this solve? Members need a clear, reliable place to see the current class programme without relying on staff, static PDFs, or social posts.
- What business outcome does it enable? A readable member-facing schedule increases perceived membership value, reduces front-desk schedule questions, and creates the foundation for later class booking flows.

## User Roles Involved
- User

## User Stories
Format every story as:
As a {role}, I want to {action} so that {benefit}.

### Happy Path Stories
- As a Member, I want to open the group classes schedule from the user portal so that I can see the current programme included with my membership.
- As a Member, I want to switch between weekly, daily, and list views so that I can browse the schedule in the format that is easiest for me to scan.
- As a Member, I want each class entry to show its time, class type, and assigned trainer so that I can decide which classes fit my routine.
- As a Member, I want schedule information to reflect the latest updates from the admin scheduler so that I am not planning around outdated class data.

### Edge Case Stories
- As a User without an ACTIVE membership, I want to be blocked from the schedule view and directed toward membership purchase so that membership-gated portal rules stay consistent.
- As an unauthenticated visitor, I want the schedule view to require sign-in so that member portal data is not exposed outside the portal.
- As a Member, I want a clear empty state when there are no classes in the selected period so that the page remains understandable instead of looking broken.
- As a Member, I want a class with no assigned trainer to remain visible with a clear placeholder label so that I can still see the programme even when staffing is not final.
- As a Member, I want a non-technical error state if the schedule cannot load so that I know the issue is temporary and can retry.

## Acceptance Criteria
1. The Group Classes Schedule View is available only inside the authenticated user portal and is not exposed as a public landing-page feature in this version.
2. An authenticated `USER` account with an `ACTIVE` membership can open the Group Classes Schedule View and see schedule data.
3. An authenticated `USER` account without an `ACTIVE` membership cannot access schedule data; the system must show a membership-required state with a clear path to membership purchase or renewal.
4. An unauthenticated visitor attempting to open the Group Classes Schedule View must be required to sign in before any schedule data is shown.
5. The schedule view uses the admin Scheduler as its source of truth and displays group classes created there without manual duplicate entry in the user portal.
6. The default state on first load is the current calendar week in Week view.
7. Week view displays the selected Monday-through-Sunday week and places classes under the correct day and start time.
8. Day view displays classes for one selected calendar date only.
9. List view displays the classes for a rolling 14-day window anchored to the selected date, grouped by date and ordered chronologically.
10. The user can switch between Week, Day, and List views without losing the selected week context.
11. The user can move to an earlier or later period from any view; the selected date range updates accordingly and the schedule refreshes for that period.
12. Every class entry shown in any view includes, at minimum: class name, scheduled date when not already implied by the view, start time, and assigned trainer name.
13. If a class has more than one assigned trainer, the entry displays all assigned trainer names.
14. If a class has no assigned trainer, the entry remains visible and displays a placeholder such as `Trainer TBA` instead of leaving the trainer field blank.
15. Schedule times are displayed consistently in the user's device timezone across all views in this version.
16. If no classes exist for the selected period, the page shows a clear empty state instead of a blank grid or blank list.
17. If schedule data cannot be loaded, the page shows a non-technical error message and a retry action; previously shown stale data must not be mislabeled as current.
18. Changes made in the admin Scheduler to a `SCHEDULED` class's time, name, or assigned trainer are reflected the next time the member schedule is loaded or refreshed.
19. Class instances that are no longer in status `SCHEDULED` do not appear in the member schedule view in this version.
20. If a user's membership stops being `ACTIVE`, subsequent access to the schedule view must stop showing schedule data and return the membership-required state.
21. The Group Classes Schedule View is read-only in this version; it must not provide actions to book, cancel, join a waitlist, contact a trainer, or modify the class schedule.
22. The page must remain readable and usable on mobile and desktop, with no horizontal page-level scrolling at 360 px width.

## Out of Scope (for this version)
- Class booking, cancellation, attendance, or waitlist actions.
- Public schedule browsing outside the authenticated user portal.
- Filtering, sorting, or search by trainer, class type, difficulty, or time of day.
- Trainer profile deep links or trainer contact actions from the schedule.
- Push notifications, reminders, calendar sync, or export of the schedule.
- Display of available spots, booking limits, or membership usage counters.
- Historical activity, attended-class history, or recommended classes.
- Admin editing capabilities inside the user-facing schedule view.

## Open Questions
None.

## Technical Notes for the Architect
- This feature is permission-sensitive because access depends on both authentication and membership status, not just the `USER` role.
- The member schedule and admin Scheduler should share one schedule source of truth to avoid divergence between what staff manage and what members see.
- Expect frequent read-heavy access patterns around the current week and evening hours; date-range queries should stay efficient.
- A clear freshness model matters: members need predictable behaviour when admin staff edits the programme close to class start time.
- Empty, loading, and error states are important product requirements here because the schedule page is informational and must remain trustworthy even when data is unavailable.
