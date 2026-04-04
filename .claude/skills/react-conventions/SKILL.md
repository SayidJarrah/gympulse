---
name: react-conventions
description: GymPulse React/TypeScript coding conventions. Load when writing,
  reviewing, or discussing any frontend TypeScript/React code in this project.
---

# GymPulse React/TypeScript Conventions

## Types
- All types in `src/types/` — one file per domain entity (e.g. `booking.ts`, `classInstance.ts`)
- Type names match backend DTO names exactly (`BookingResponse` → `BookingResponse`)
- Never use `any` — use `unknown` and narrow, or define the type explicitly
- API error shape: `{ error: string; code: string }`
- Prices from the API are in cents (`priceInCents: number`) — always divide by 100 for display

## API Layer
- All Axios calls in `src/api/` — never fetch inline in components or hooks
- Every API function is async, returns typed response directly (unwrap `.data`)
- Let errors propagate — catch at the hook or page level, never silently swallow

## Hooks
- Data-fetching hooks in `src/hooks/` — named `use{Feature}` (e.g. `useBookings`)
- Each hook manages: `data`, `loading`, `error` — always all three, never omit one
- Hooks call API functions, never Axios directly

## Components
- Functional components only — no class components
- Props interface defined inline above component: `interface Props { ... }`
- Loading state: skeleton or spinner — never render partial/undefined data
- Error state: user-friendly message always displayed — never swallow silently
- Forms: React Hook Form + Zod validation

## Error Code Mapping
Backend error codes → user messages in `src/utils/errorMessages.ts`:
```typescript
export const errorMessages: Record<string, string> = {
  CLASS_FULL: 'This class is fully booked',
  NO_ACTIVE_MEMBERSHIP: 'You need an active membership to book classes',
  ALREADY_BOOKED: 'You have already booked this class',
};
```

## State Management
- Zustand for global state (auth, shared entity lists)
- `useState` for local component state
- Never use context for data that changes frequently