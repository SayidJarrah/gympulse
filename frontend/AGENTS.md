# GymFlow Frontend — Developer Context

See root `/AGENTS.md` for project-wide context, conventions, and implementation status.

## React/TypeScript Conventions

### Types
- All types in `src/types/` — one file per domain (e.g. `booking.ts`, `class.ts`)
- Type names match backend DTO names exactly (e.g. backend `BookingResponse` → frontend `BookingResponse`)
- Never use `any` — use `unknown` and narrow, or define the type properly
- API error shape: `{ error: string; code: string }`

### API Layer
- All Axios calls live in `src/api/` — never fetch inline inside components or hooks
- Every API function is async and returns the typed response directly (unwrap `.data`)
- Handle errors by letting them propagate — catch at the hook or page level

### Hooks
- Data fetching hooks live in `src/hooks/` — named `use{Feature}` (e.g. `useBookings`)
- Each hook manages: data state, loading state, error state — always all three
- Hooks call API functions, never Axios directly

### Components
- Functional components only, no class components
- Props interfaces defined inline above the component: `interface Props { ... }`
- Loading states: show a skeleton or spinner, never render partial data
- Error states: always display a user-friendly message — never swallow errors silently

### Error Code Mapping
Map backend error codes to user messages in `src/utils/errorMessages.ts`.
Example: `CLASS_FULL` → "This class is fully booked"

## Directory Layout
```
src/
├── api/          # Axios functions (one file per domain, never inline in components)
├── components/   # Reusable UI components
├── hooks/        # Custom React hooks (data fetching, loading/error state)
├── pages/        # Route-level page components
├── store/        # Zustand global state stores
└── types/        # TypeScript types — must match backend DTO field names exactly
```

## When Adding a Feature (follow this order)
1. Types in `src/types/{feature}.ts` — mirror backend DTO fields exactly
2. API functions in `src/api/{feature}.ts` — Axios calls only, no fetch inside components
3. Custom hook in `src/hooks/use{Feature}.ts` — wraps API, exposes loading + error state
4. Page component in `src/pages/{feature}/`
5. Reusable sub-components in `src/components/{feature}/`
6. Add route in `App.tsx`

## Design System Quick Reference
Full spec: `docs/design-system/README.md` (voice, visual rules, component patterns)
Tokens: `docs/design-system/colors_and_type.css` and `docs/design-system/tailwind.gymflow.cjs`
Per-feature mocks + specs: `docs/design-system/handoffs/{feature}/`

| Token | Value |
|-------|-------|
| Page background | `bg-[#0F0F0F]` |
| Card / input surface | `bg-gray-900` |
| Elevated surface | `bg-gray-800` |
| Primary | `bg-green-500` / `text-green-500` / `#22C55E` |
| Accent | `bg-orange-500` / `#F97316` |
| Default text | `text-white` |
| Muted text | `text-gray-400` |
| Focus ring | `ring-green-500 ring-offset-gray-900` |

## Key Rules
- No `any` types — TypeScript strict mode throughout
- No inline styles — Tailwind classes only
- No API calls inside components — always via `src/api/`
- Forms: React Hook Form + Zod validation
- Global state: Zustand store; local UI state: useState
- Always show loading states and handle errors with user-friendly messages

## E2E Tests

Specs live at the repo root in `e2e/specs/` — NOT under `frontend/`. Run via `/verify`. See `docs/sdd/testing-reset.md` for scope.

## Updating Implementation Status
After all pages/components are built and working, update the **Frontend** column
in the Implementation Status table in `/AGENTS.md` to ✅.
