# Changelog

## In Progress
<!-- business-analyst moves items here when PRD is written -->
- Docker: share one Postgres container across dev and E2E, with `gymflow` and `gymflow_e2e` databases
- Membership plans: PRD written — admin create/edit/deactivate; public read access for guests and members
- User membership purchase: PRD written — self-service plan activation, one-active-membership enforcement, user and admin cancel endpoints
- Scheduler (admin): PRD written — trainer profile management, class template library with predefined seeds, drag-and-drop weekly calendar, trainer assignment with double-booking prevention, CSV/iCal import and export
- User access flow: PRD written — membership gate on post-login routing, portal navigation shell, visually disabled nav items with tooltip for non-members, membership status widget with near-expiry warning; admin bypass to dashboard
- User profile: PRD written — GET/PATCH /api/v1/users/me; editable fields: firstName, lastName, phone, dateOfBirth (min age 14), fitnessGoals (max 500 chars); email read-only; membership status display on profile page
- Group Classes Schedule View: PRD written — member-facing read-only schedule powered by admin scheduler data, with week, day, and list views; no booking in this phase
- Trainer Discovery: PRD written — paginated trainer list with specialization filter and experience sort; full profile page with availability preview; Member-only favorites (save/remove/list); 38 acceptance criteria; 5 open questions flagged for schema and policy decisions

## Completed
<!-- /implement moves items here with date when feature ships -->
- Project scaffold and Docker setup (docker-compose.yml dev stack + docker-compose.full.yml full-stack with multi-stage Dockerfiles) [2026-03-21]
- Auth (register/login/JWT): full-stack — DB migrations, backend endpoints, JWT + refresh token rotation, register/login pages, Zustand store, Axios interceptor [2026-03-21]
