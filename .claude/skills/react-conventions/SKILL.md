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
- **Components must never import `axiosInstance` directly** — only API functions in `src/api/` may use it
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

## Zustand `persist` — key must be computed lazily
Never compute the `persist` storage key at module evaluation time (i.e. at the top of a `create()` call, in an IIFE, or via a module-level function call). At that point the auth store has not rehydrated from `localStorage`, so user-specific keys resolve to `'anonymous'` and multiple users share one draft.

Use a `StateStorage` adapter that resolves the key inside `getItem`/`setItem`/`removeItem`:
```ts
import { StateStorage } from 'zustand/middleware'

const lazyStorage: StateStorage = {
  getItem: () => {
    const userId = useAuthStore.getState().user?.id ?? 'anonymous'
    return localStorage.getItem(`gf:{store}:v1:${userId}`)
  },
  setItem: (_name, value) => {
    const userId = useAuthStore.getState().user?.id ?? 'anonymous'
    localStorage.setItem(`gf:{store}:v1:${userId}`, value)
  },
  removeItem: () => {
    const userId = useAuthStore.getState().user?.id ?? 'anonymous'
    localStorage.removeItem(`gf:{store}:v1:${userId}`)
  },
}
// Then in persist config: { name: 'gf:{store}:v1', storage: lazyStorage }
```

## Never use `setTimeout` to sequence React/Zustand state updates
`setTimeout(fn, 0)` does not guarantee execution after a React commit phase under React 18 automatic batching. Do not use it to work around state-update ordering issues (e.g. "set auth store after route guard re-renders").

The correct pattern: teach the route guard to check additional store state. Example — if a Done screen must render before a redirect fires, add `&& currentStep !== 'done'` to the redirect condition in the route guard, rather than delaying the auth-store write with a timeout.

## Disabled Buttons with Tooltips
Never use `disabled={true}` on a button that must show a tooltip (e.g. guest-state buttons).
HTML `disabled` suppresses `title` attribute tooltip firing on touch devices and in Firefox/Safari.
Instead: use `aria-disabled="true"` on the button, wrap it in `<span title="...">`, and block
clicks via `onClick={condition ? handler : undefined}` + `pointer-events-none` class.
