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

## Design token pre-flight (developer)

Before writing any component that uses `var(--color-*)`, `var(--font-*)`, or any CSS custom property from the design system, verify `frontend/src/index.css` contains the `:root` token block.

```bash
grep -c 'color-primary' frontend/src/index.css   # must be > 0
```

If the block is missing, add it by inlining the contents of `docs/design-system/colors_and_type.css` into `index.css` before writing the component. CSS custom properties silently fall back to `undefined` when undefined — there is no build error, no console warning, only invisible buttons and broken layouts at runtime.

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

## Zustand state inside React callbacks — always read fresh, never close over

If a callback (event handler, step-advance function, submit handler) reads Zustand-derived values that may have been written in the **same event tick** just before the callback runs, the closed-over render value will be stale — Zustand has updated the store but React has not re-rendered yet.

Rule: any callback that runs *after* a Zustand write in the same tick must read fresh state via `useXxxStore.getState()`, not via a variable captured from the render closure.

```ts
// ❌ stale — visibleSteps was computed at render time, before store.setPlan() ran
const advance = () => {
  const idx = visibleSteps.indexOf(currentStep) // stale closure
  goTo(visibleSteps[idx + 1])
}

// ✅ fresh — reads live store state after the write has landed
const advance = () => {
  const freshPlanId = useOnboardingStore.getState().selectedPlanId
  const freshSteps = computeVisibleSteps(freshPlanId)
  const idx = freshSteps.indexOf(useOnboardingStore.getState().currentStep)
  goTo(freshSteps[idx + 1])
}
```

When reviewing multi-step wizard code: flag any `advance()` / `goTo()` / `nextStep()` callback that (a) computes the next step index and (b) reads a Zustand-derived array or value from the render closure rather than `getState()`.

## Never use `setTimeout` to sequence React/Zustand state updates
`setTimeout(fn, 0)` does not guarantee execution after a React commit phase under React 18 automatic batching. Do not use it to work around state-update ordering issues (e.g. "set auth store after route guard re-renders").

The correct pattern: teach the route guard to check additional store state. Example — if a Done screen must render before a redirect fires, add `&& currentStep !== 'done'` to the redirect condition in the route guard, rather than delaying the auth-store write with a timeout.

## Disabled Buttons with Tooltips
Never use `disabled={true}` on a button that must show a tooltip (e.g. guest-state buttons).
HTML `disabled` suppresses `title` attribute tooltip firing on touch devices and in Firefox/Safari.
Instead: use `aria-disabled="true"` on the button, wrap it in `<span title="...">`, and block
clicks via `onClick={condition ? handler : undefined}` + `pointer-events-none` class.

## Cross-component constants must have a single source of truth
When a constant is rendered in two or more components (e.g. the wizard step number is shown in `MiniNav` AND in each step body's eyebrow), do not let each consumer hardcode its own copy. Per-component duplication is a future-bug magnet — the next reorder updates one location and silently leaves the other lagging, producing two contradictory values on the same screen.

Extract to a single source of truth in `frontend/src/types/{domain}.ts` (or a sibling) and import from every consumer. If you find an existing duplication during unrelated work, file it as TD rather than ignoring it. The pattern that surfaced this rule: `MiniNav` derived its eyebrows from `EYEBROW_LABELS` in `types/onboarding.ts`, but each `StepX.tsx` component hardcoded its own `Step 0X · {Name}` body eyebrow — a wizard-step reorder updated the map but missed the four step files, producing "STEP 03" in the top bar and "Step 06" in the body simultaneously.

Applies whenever a numeric position, label, threshold, copy string, or feature flag is rendered in more than one component.
