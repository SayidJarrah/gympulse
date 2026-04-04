# GymFlow — Product Overview

> Living document. Updated automatically after each feature completes.
> Last updated: 2026-04-04

## What This App Does
GymFlow is a gym membership and class booking platform. Members can purchase
membership plans, browse scheduled classes, and book spots. Trainers have
profile pages linked to their classes. Admins manage everything from a dashboard.

## User Roles

| Role | Can Do |
|------|--------|
| Guest (unauthenticated) | Browse membership plans, view class schedule |
| Member (USER role) | Everything a guest can + purchase membership, book/cancel classes |
| Admin (ADMIN role) | Everything a member can + manage plans, classes, trainers, view all bookings |

## Feature Registry

| Feature | Status | Description |
|---------|--------|-------------|
| Project scaffold | ✅ Done | Monorepo, Spring Boot skeleton, React skeleton, Docker Compose (dev + full-stack) |
| Public landing page | 🔄 In progress | Public homepage that introduces the gym, surfaces plans, classes, and trainers, and routes guests and signed-in users into the right next step |
| Auth (register/login/JWT) | ✅ Done | JWT-based register, login, token refresh, and logout with role-based access |

| Membership plans | 🔄 In progress | Admins create, edit, and deactivate membership plans; any visitor can list active plans |
| User membership purchase | 🔄 In progress | Authenticated users activate a membership plan, creating a timed subscription record |

| Scheduler (admin) | 🔄 In progress | Admin-only workspace to manage trainer profiles, define class templates, compose a weekly drag-and-drop schedule, and import/export the programme |

| User access flow | 🔄 In progress | Membership gate on login, portal navigation shell, disabled nav items for non-members, and membership status widget |
| Member Home | 🔄 In progress | Default logged-in home for users with current membership status, trainer discovery preview, and upcoming class preview |
| User profile | 🔄 In progress | Member view and edit of personal profile fields (name, phone, date of birth, fitness goals); email is read-only |
| Group Classes Schedule View | 🔄 In progress | Member-facing read-only class schedule that reuses admin-managed timetable data in week, day, and list views |
| Class Booking & Cancellation | 🔄 In progress | Members book and cancel class reservations with a 3-hour cancellation cutoff, full-class blocking, and no waitlist in v1 |

| Trainer Discovery | 🔄 In progress | Members and Guests browse trainer profiles with filtering by specialization, sorting by experience, availability previews, and a Member-only favorites list |
| Entity Image Management | 🔄 In progress | Shared image uploads and display rules for user profile photos, trainer photos, room photos, and class-template images across admin and member surfaces |

<!-- business-analyst adds a row here when each PRD is written -->

## Current API Surface

### Auth — `/api/v1/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | None | Register a new USER account |
| POST | `/api/v1/auth/login` | None | Login; returns access + refresh tokens |
| POST | `/api/v1/auth/refresh` | None | Rotate refresh token; returns new token pair |
| POST | `/api/v1/auth/logout` | Bearer token | Invalidate refresh token |

### Utility

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/health` | None | Service health check — returns `{"status":"ok"}` |

### Member Home

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/member-home/classes-preview` | Bearer token (`USER`) | Returns up to 8 upcoming scheduled group classes in the next 14 local days for the Member Home carousel |

## Data Model

### User
`id` (UUID PK), `email` (unique), `password_hash`, `role` (USER/ADMIN), `created_at`, `updated_at`, `deleted_at`

### RefreshToken
`id` (UUID PK), `user_id` (FK → users), `token_hash` (SHA-256 hex, unique), `expires_at`, `invalidated` (bool), `created_at`, `updated_at`, `deleted_at`

## Known Limitations (Current Version)
- No email verification on registration
- No OAuth / social login
- No payment processing (membership purchase is simulated)

## What's Being Built Next
<!-- business-analyst updates this when a new PRD is written -->
- Public landing page — public homepage with hero, plan discovery, class and trainer previews, and auth-aware CTAs
- Membership plans — admin CRUD for plan catalogue; public read access for guests and members
- User membership purchase — self-service plan activation for authenticated members; one active membership per user enforced
- Scheduler (admin) — trainer profiles, class template library, drag-and-drop weekly calendar, trainer assignment, CSV/iCal import and export
- User access flow — membership gate on login, portal navigation shell with persistent nav, disabled items for non-members, and membership status widget
- Member Home — default logged-in user destination with current membership summary, trainer carousel, and upcoming group classes carousel
- User profile — member view and edit of personal details (name, phone, date of birth, fitness goals); email read-only; membership status display
- Group Classes Schedule View — member-facing read-only schedule browser powered by admin scheduler data, with week, day, and list views
- Class Booking & Cancellation — member self-booking with full-class blocking and a 3-hour self-cancellation cutoff; admin on-behalf booking; no waitlist in v1
- Trainer Discovery — member and guest browsing of trainer roster with specialization filter, experience sort, availability preview, and member-only favorites
- Entity Image Management — shared image upload and display support for user profiles, trainers, rooms, and class templates, with inheritance into relevant schedule and discovery surfaces
