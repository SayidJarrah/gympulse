---
name: react-conventions
description: Load GymFlow React/TypeScript coding conventions. Activate automatically
  when writing, reviewing, or discussing any frontend TypeScript/React code.
---

# GymFlow React/TypeScript Conventions

## Types
- All types in `src/types/` — one file per domain (e.g. `booking.ts`, `class.ts`)
- Type names match backend DTO names exactly (e.g. backend `BookingResponse` → frontend `BookingResponse`)
- Never use `any` — use `unknown` and narrow, or define the type properly
- API error shape: `{ error: string; code: string }`

## API Layer
- All Axios calls live in `src/api/` — never fetch inline inside components or hooks
- Every API function is async and returns the typed response directly (unwrap `.data`)
- Handle errors by letting them propagate — catch at the hook or page level

## Hooks
- Data fetching hooks live in `src/hooks/` — named `use{Feature}` (e.g. `useBookings`)
- Each hook manages: data state, loading state, error state — always all three
- Hooks call API functions, never Axios directly

## Components
- Functional components only, no class components
- Props interfaces defined inline above the component: `interface Props { ... }`
- Loading states: show a skeleton or spinner, never render partial data
- Error states: always display a user-friendly message — never swallow errors silently

## Error Code Mapping
Map backend error codes to user messages in `src/utils/errorMessages.ts`:
`CLASS_FULL` → "This class is fully booked"
`NO_ACTIVE_MEMBERSHIP` → "You need an active membership to book classes"