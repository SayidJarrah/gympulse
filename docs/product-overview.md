# GymFlow — Product Overview

> Living document. Updated automatically after each feature completes.
> Last updated: 2026-03-21

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
| Auth (register/login/JWT) | ✅ Done | JWT-based register, login, token refresh, and logout with role-based access |

| Membership plans | 🔄 In progress | Admins create, edit, and deactivate membership plans; any visitor can list active plans |
| User membership purchase | 🔄 In progress | Authenticated users activate a membership plan, creating a timed subscription record |

| Scheduler (admin) | 🔄 In progress | Admin-only workspace to manage trainer profiles, define class templates, compose a weekly drag-and-drop schedule, and import/export the programme |

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
- Membership plans — admin CRUD for plan catalogue; public read access for guests and members
- User membership purchase — self-service plan activation for authenticated members; one active membership per user enforced
- Scheduler (admin) — trainer profiles, class template library, drag-and-drop weekly calendar, trainer assignment, CSV/iCal import and export