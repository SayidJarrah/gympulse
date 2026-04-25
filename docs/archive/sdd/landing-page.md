# SDD: Public Landing Page — "The Pulse" Redesign

## Reference
- PRD: docs/prd/landing-page.md
- Design handoff: docs/design-system/handoffs/landing-page-redesign/
- Design system: docs/design-system/README.md
- Date: 2026-04-18

## Architecture Overview

This document supersedes the v1 landing-page SDD (2026-03-29). The Pulse redesign
converts the static plans-preview page into a live, viewer-state-driven homepage.

Layers affected:
- **Backend**: four new endpoints (viewer state, live stats, activity feed REST + SSE
  stream), plus a new `ActivityEvent` domain concept backed by a new DB table.
- **Frontend**: full replacement of `LandingPage.tsx` and all `src/components/landing/`
  components; new SSE subscription hook; page-scoped hooks for landing state.
- **DB**: one new table (`activity_events`). No changes to existing tables.

The existing `GET /api/v1/membership-plans` endpoint is no longer the primary data
source for the landing page. It remains available for other parts of the app.

---

## 1. Database Changes

### New Table: `activity_events`

Records individual activity events that populate the landing-page feed. Events are
written by service methods when relevant domain actions occur (booking created, check-in
recorded, PR logged, class filled).

```sql
-- V22__create_activity_events_table.sql
CREATE TABLE activity_events (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        VARCHAR(10)  NOT NULL,
  actor_id    UUID         REFERENCES users(id) ON DELETE SET NULL,
  actor_name  VARCHAR(200) NOT NULL,
  text        VARCHAR(500) NOT NULL,
  text_public VARCHAR(500) NOT NULL,
  occurred_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_activity_events_kind
    CHECK (kind IN ('checkin', 'booking', 'pr', 'class'))
);

CREATE INDEX idx_activity_events_occurred_at
  ON activity_events (occurred_at DESC);
```

**Column notes:**

| Column | Purpose |
|---|---|
| `kind` | One of `checkin`, `booking`, `pr`, `class`. Controls feed-dot color on the client. |
| `actor_id` | FK to `users`. Nullable — `class` kind events reference a class, not a user; set to NULL. Also set NULL on user deletion via `ON DELETE SET NULL`. |
| `actor_name` | Display name at event time (e.g. "Noah B."). Denormalized to survive user profile changes. |
| `text` | Full action text for authenticated users (e.g. "logged a deadlift PR — 285lb"). |
| `text_public` | Anonymized text for public feed (e.g. "logged a deadlift PR"). Never contains performance values or PII. |
| `occurred_at` | Event timestamp. Written at the time the domain action occurs. |

**Retention**: No automated pruning in v1. The feed query fetches the 20 most recent
rows; table growth has no user-visible impact. A future migration adds cleanup if needed.

**Flyway filename**: `V22__create_activity_events_table.sql`

---

## 2. API Contract

### Base URL: `/api/v1`

All error responses: `{ "error": "...", "code": "..." }`.

---

### 2.1 GET /api/v1/landing/viewer-state

**Auth**: Optional JWT. Valid JWT => authenticated branch. Missing or invalid JWT =>
`loggedOut` shape. No 401 is returned.

**Request**: No body. No query params.

**Success response — loggedOut (200)**:
```json
{
  "state": "loggedOut"
}
```

**Success response — booked (200)**:
```json
{
  "state": "booked",
  "firstName": "Dana",
  "onTheFloor": 47,
  "upcomingClass": {
    "id": "uuid",
    "name": "Power Vinyasa",
    "startsAt": "2026-04-18T14:30:00Z",
    "trainer": {
      "id": "uuid",
      "name": "Priya Mendes",
      "avatarUrl": "/api/v1/trainers/{id}/photo"
    },
    "studio": "Studio B",
    "durationMin": 60
  }
}
```

**Success response — nobooked (200)**:
```json
{
  "state": "nobooked",
  "firstName": "Dana",
  "onTheFloor": 47,
  "nextOpenClass": {
    "id": "uuid",
    "name": "HIIT 45",
    "startsIn": "45 min",
    "startsAt": "2026-04-18T11:45:00Z",
    "trainer": {
      "id": "uuid",
      "name": "Mia Taylor",
      "avatarUrl": "/api/v1/trainers/{id}/photo"
    },
    "studio": "Studio A",
    "spotsLeft": 3,
    "remainingClassesToday": 11
  }
}
```

`nextOpenClass` is `null` when no open class exists for the rest of today.

**`startsIn`**: computed server-side as `"N min"` where N = `ceil((startsAt - now) / 60000)`.

**`onTheFloor`**: count of CONFIRMED or ATTENDED bookings where the class `scheduled_at`
is between today at `05:00 UTC` and `now` (proxy for check-ins; see Assumption A2).

**`avatarUrl`**: `/api/v1/trainers/{id}/photo` when `photo_data IS NOT NULL`; `null`
otherwise. The frontend renders an initials circle when `null`.

**Business logic — state derivation (in order)**:
1. If no valid JWT, return `loggedOut`.
2. Load authenticated user's CONFIRMED bookings where `class.scheduled_at` in
   `[now, now + 24h)` AND `class.status = 'SCHEDULED'` AND `class.deleted_at IS NULL`.
3. If any qualifying booking, use the one with earliest `scheduled_at`. Load the class's
   primary trainer (first row in `class_instance_trainers` by insertion order for this
   class). Return `booked`.
4. Otherwise, find the first open class: `scheduled_at > (now + 15min)` AND
   `scheduled_at <= midnight today UTC` AND `status = 'SCHEDULED'` AND
   `deleted_at IS NULL`, ordered `scheduled_at ASC`. For each candidate compute
   `spotsLeft = capacity - COUNT(bookings WHERE class_id = X AND status = 'CONFIRMED')`.
   Skip if `spotsLeft = 0`. Use first with `spotsLeft > 0`.
   `remainingClassesToday` = count of SCHEDULED classes for today starting after `now`
   (including the returned class). Return `nobooked`.
5. If no open class found, return `nobooked` with `nextOpenClass: null`.

**Error table**:

| HTTP | Code | Condition |
|---|---|---|
| 500 | `INTERNAL_ERROR` | Unexpected service or database failure |

---

### 2.2 GET /api/v1/landing/stats

**Auth**: Optional JWT.

**Success response — authed (200)**:
```json
{
  "variant": "authed",
  "onTheFloor": 47,
  "classesToday": 12,
  "tightestClass": {
    "name": "HIIT",
    "spotsLeft": 3
  }
}
```

`tightestClass`: SCHEDULED class starting after `now` today with lowest non-zero
`spotsLeft`. `null` when no remaining classes or all remaining are full.

**Success response — public (200)**:
```json
{
  "variant": "public",
  "memberCount": 1200,
  "classesToday": 12,
  "coachCount": 8
}
```

`memberCount` = `COUNT(*) FROM user_memberships WHERE status = 'ACTIVE'`.
`coachCount` = `COUNT(*) FROM trainers WHERE deleted_at IS NULL`.
`classesToday` = `COUNT(*) FROM class_instances WHERE scheduled_at::date = today AND status = 'SCHEDULED' AND deleted_at IS NULL`.

**Error table**:

| HTTP | Code | Condition |
|---|---|---|
| 500 | `INTERNAL_ERROR` | Unexpected service or database failure |

---

### 2.3 GET /api/v1/landing/activity

Returns the last 20 activity events.

**Auth**: Optional JWT. Authenticated => real actor names and `text`. Public => anonymized.

**Success response — authed (200)**:
```json
{
  "variant": "authed",
  "events": [
    {
      "id": "uuid",
      "kind": "checkin",
      "actor": "Noah B.",
      "text": "checked in",
      "at": "2026-04-18T10:00:00Z"
    }
  ]
}
```

**Success response — public (200)**:
```json
{
  "variant": "public",
  "events": [
    {
      "id": "uuid",
      "kind": "checkin",
      "actor": "A member",
      "text": "checked in",
      "at": "2026-04-18T10:00:00Z"
    }
  ]
}
```

Public variant: `actor` is always `"A member"`; `text` comes from `text_public` column
(never from `text`). `id` and `at` are included so the client can deduplicate SSE events
against the initial fetch.

**Business logic**: `SELECT * FROM activity_events ORDER BY occurred_at DESC LIMIT 20`.
Branch on JWT validity to choose authed vs public projection.

**Error table**:

| HTTP | Code | Condition |
|---|---|---|
| 500 | `INTERNAL_ERROR` | Unexpected service or database failure |

---

### 2.4 GET /api/v1/landing/activity/stream

Server-sent events stream. Pushes new activity events as they occur.

**Auth**: Optional JWT. Read once at connection time. Authed connections receive full
data; public connections receive anonymized data.

**Request**: `GET` with `Accept: text/event-stream`.

**Event payload** (one `data:` line per event):
```
data: {"id":"uuid","kind":"checkin","actor":"Noah B.","text":"checked in","at":"2026-04-18T10:05:00Z"}
```

Public connection:
```
data: {"id":"uuid","kind":"checkin","actor":"A member","text":"checked in","at":"2026-04-18T10:05:00Z"}
```

**Keepalive**: Server sends `": keepalive"` comment every 20 seconds. Clients ignore
comment lines per the SSE spec.

**Reconnect**: Client uses browser's native `EventSource` reconnect behavior. The server
does not replay missed events. On reconnect the client re-fetches `GET /activity` to
refresh the list, then re-subscribes to the stream.

**Implementation**: `SseEmitter` with a `CopyOnWriteArrayList<SseEmitter>`. Register
`onCompletion`, `onTimeout`, and `onError` callbacks on each emitter to remove it from
the list immediately. Without this the list grows unboundedly.

---

### 2.5 SecurityConfig Changes

Add `/api/v1/landing/**` to the permit-all list in `SecurityConfig.kt`. All four landing
endpoints are publicly accessible. The service layer reads the principal and branches on
its presence.

---

## 3. Kotlin Files

### New Files

| File path | Type | Purpose |
|---|---|---|
| `domain/ActivityEvent.kt` | JPA Entity | Maps `activity_events` table |
| `repository/ActivityEventRepository.kt` | Spring Data JPA Repository | `findTop20ByOrderByOccurredAtDesc()`, `save()` |
| `dto/LandingViewerStateResponse.kt` | Response DTO sealed hierarchy | `LoggedOutStateResponse`, `BookedStateResponse`, `NoBookedStateResponse`, `UpcomingClassDto`, `NextOpenClassDto`, `TrainerRefDto` |
| `dto/LandingStatsResponse.kt` | Response DTO sealed hierarchy | `AuthedStatsResponse`, `PublicStatsResponse`, `TightestClassDto` |
| `dto/ActivityEventDto.kt` | Response DTO | Single event shape used in REST and SSE |
| `dto/LandingActivityResponse.kt` | Response DTO | `variant` + `events` list |
| `service/LandingService.kt` | Service | `getViewerState()`, `getStats()`, `getActivity()` |
| `service/ActivityEventService.kt` | Service | `recordEvent()`, `getRecent()`, `broadcastToEmitters()` |
| `controller/LandingController.kt` | REST Controller | Four `GET` endpoints under `/api/v1/landing/` |

### Modified Files

| File path | Change |
|---|---|
| `config/SecurityConfig.kt` | Add `/api/v1/landing/**` to permit-all |
| `service/BookingService.kt` | Call `ActivityEventService.recordEvent(kind="booking", ...)` after successful booking creation |
| `domain/ErrorCode.kt` | Add `INTERNAL_ERROR` if not already present |

### Entity: `ActivityEvent.kt`

```kotlin
@Entity
@Table(name = "activity_events")
class ActivityEvent(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false, length = 10)
    val kind: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    val actor: User? = null,

    @Column(name = "actor_name", nullable = false, length = 200)
    val actorName: String,

    @Column(nullable = false, length = 500)
    val text: String,

    @Column(name = "text_public", nullable = false, length = 500)
    val textPublic: String,

    @Column(name = "occurred_at", nullable = false)
    val occurredAt: OffsetDateTime = OffsetDateTime.now()
)
```

### DTO: `ActivityEventDto.kt`

```kotlin
data class ActivityEventDto(
    val id: UUID,
    val kind: String,
    val actor: String,
    val text: String,
    val at: OffsetDateTime
)
```

### DTO: `LandingViewerStateResponse.kt` (sealed hierarchy)

```kotlin
sealed class LandingViewerStateResponse { abstract val state: String }

data class LoggedOutStateResponse(
    override val state: String = "loggedOut"
) : LandingViewerStateResponse()

data class BookedStateResponse(
    override val state: String = "booked",
    val firstName: String,
    val onTheFloor: Int,
    val upcomingClass: UpcomingClassDto
) : LandingViewerStateResponse()

data class NoBookedStateResponse(
    override val state: String = "nobooked",
    val firstName: String,
    val onTheFloor: Int,
    val nextOpenClass: NextOpenClassDto?
) : LandingViewerStateResponse()

data class UpcomingClassDto(
    val id: UUID,
    val name: String,
    val startsAt: OffsetDateTime,
    val trainer: TrainerRefDto,
    val studio: String,
    val durationMin: Int
)

data class NextOpenClassDto(
    val id: UUID,
    val name: String,
    val startsIn: String,
    val startsAt: OffsetDateTime,
    val trainer: TrainerRefDto,
    val studio: String,
    val spotsLeft: Int,
    val remainingClassesToday: Int
)

data class TrainerRefDto(
    val id: UUID?,
    val name: String,
    val avatarUrl: String?
)
```

### DTO: `LandingStatsResponse.kt` (sealed hierarchy)

```kotlin
sealed class LandingStatsResponse { abstract val variant: String }

data class AuthedStatsResponse(
    override val variant: String = "authed",
    val onTheFloor: Int,
    val classesToday: Int,
    val tightestClass: TightestClassDto?
) : LandingStatsResponse()

data class PublicStatsResponse(
    override val variant: String = "public",
    val memberCount: Long,
    val classesToday: Int,
    val coachCount: Long
) : LandingStatsResponse()

data class TightestClassDto(val name: String, val spotsLeft: Int)
```

### DTO: `LandingActivityResponse.kt`

```kotlin
data class LandingActivityResponse(
    val variant: String,
    val events: List<ActivityEventDto>
)
```

---

## 4. Frontend Components

### Route

`/` renders `PulseLandingPage.tsx`. Update `src/App.tsx` accordingly.

### Pages

| Route | Component | Location |
|---|---|---|
| `/` | `PulseLandingPage.tsx` | `src/pages/landing/` |

### New Components

| Component | Location | Purpose |
|---|---|---|
| `PulseNav.tsx` | `src/components/landing/` | Nav with authed vs public variants |
| `PulseFooter.tsx` | `src/components/landing/` | Footer with address and hours |
| `AmbientWaveform.tsx` | `src/components/landing/` | Animated SVG ECG waveform; freezes on `prefers-reduced-motion` |
| `HeroBooked.tsx` | `src/components/landing/` | `booked` state hero: countdown + check-in CTA |
| `HeroNoBooked.tsx` | `src/components/landing/` | `nobooked` state hero: next-open class card + booking CTA |
| `HeroLoggedOut.tsx` | `src/components/landing/` | `loggedOut` state hero: brand statement + trial CTA |
| `BigCountdown.tsx` | `src/components/landing/` | HH:MM:SS countdown, 88px Barlow Condensed, tabular-nums |
| `TrainerRow.tsx` | `src/components/landing/` | Overlapping trainer avatar circles + coaches copy |
| `ActivityFeed.tsx` | `src/components/landing/` | Feed list with 2800ms rotation highlight and gradient fade |
| `StatsStrip.tsx` | `src/components/landing/` | Three-cell stats grid, variant-aware |

### Removed Components (from v1)

Delete the following (v1 implementation only — do not ship):

- `src/components/landing/LandingHeader.tsx`
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/PlansPreviewSection.tsx`
- `src/components/landing/HowItWorksSection.tsx`
- `src/components/landing/FaqSection.tsx`
- `src/components/landing/LandingFooter.tsx`
- `src/components/landing/SectionAction.tsx`

### TypeScript Types

```typescript
// src/types/landing.ts

export type ViewerState = 'booked' | 'nobooked' | 'loggedOut';

export interface TrainerRef {
  id: string | null;
  name: string;
  avatarUrl: string | null;
}

export interface UpcomingClass {
  id: string;
  name: string;
  startsAt: string;        // ISO — drives countdown
  trainer: TrainerRef;
  studio: string;
  durationMin: number;
}

export interface NextOpenClass {
  id: string;
  name: string;
  startsIn: string;        // e.g. "45 min"
  startsAt: string;
  trainer: TrainerRef;
  studio: string;
  spotsLeft: number;
  remainingClassesToday: number;
}

export interface LoggedOutViewerState {
  state: 'loggedOut';
}

export interface BookedViewerState {
  state: 'booked';
  firstName: string;
  onTheFloor: number;
  upcomingClass: UpcomingClass;
}

export interface NoBookedViewerState {
  state: 'nobooked';
  firstName: string;
  onTheFloor: number;
  nextOpenClass: NextOpenClass | null;
}

export type ViewerStateResponse =
  | LoggedOutViewerState
  | BookedViewerState
  | NoBookedViewerState;

export interface ActivityEvent {
  id: string;
  kind: 'checkin' | 'booking' | 'pr' | 'class';
  actor: string;
  text: string;
  at: string;              // ISO
}

export interface AuthedStats {
  variant: 'authed';
  onTheFloor: number;
  classesToday: number;
  tightestClass: { name: string; spotsLeft: number } | null;
}

export interface PublicStats {
  variant: 'public';
  memberCount: number;
  classesToday: number;
  coachCount: number;
}

export type LandingStats = AuthedStats | PublicStats;
```

### API Functions

```typescript
// src/api/landing.ts

export async function fetchViewerState(): Promise<ViewerStateResponse>
// GET /api/v1/landing/viewer-state via axiosInstance (JWT attached if present)

export async function fetchLandingStats(): Promise<LandingStats>
// GET /api/v1/landing/stats

export async function fetchActivityFeed(): Promise<ActivityEvent[]>
// GET /api/v1/landing/activity — returns events array from response.events

export function createActivityStream(
  onEvent: (event: ActivityEvent) => void
): EventSource
// Creates EventSource to /api/v1/landing/activity/stream
// Caller must call .close() on unmount
```

### Custom Hooks

```typescript
// src/hooks/useViewerState.ts
function useViewerState(): {
  data: ViewerStateResponse | null;
  loading: boolean;
  error: string | null;
}
// Fetches on mount. No refetch on auth change — page reload handles it.

// src/hooks/useActivityFeed.ts
function useActivityFeed(): {
  events: ActivityEvent[];
  activeIndex: number;    // rotates 0..n-1 every 2800ms
}
// Fetches initial 20 events, then subscribes to SSE.
// Prepends new SSE events; trims list to 20.
// Rotates activeIndex every 2800ms.
// Closes EventSource on unmount.

// src/hooks/useLandingStats.ts
function useLandingStats(): {
  stats: LandingStats | null;
  loading: boolean;
}
// Fetches on mount; no auto-refresh.

// src/hooks/useCountdown.ts
function useCountdown(targetIso: string): { h: number; m: number; s: number }
// Re-ticks every 1000ms. Clamps to {0,0,0} when target is past.
// Does NOT freeze on prefers-reduced-motion — countdown is functional data.

// src/hooks/useReducedMotion.ts
function useReducedMotion(): boolean
// window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

### `prefers-reduced-motion` implementation

`AmbientWaveform.tsx` cancels `requestAnimationFrame` when `useReducedMotion()` returns
`true` and renders a static path instead. The pulsing dot keyframe animation is gated
via `motion-safe:` Tailwind variant or a `data-reduced-motion` attribute on the root
element set by `PulseLandingPage`.

### Zustand

No new Zustand slice. Landing data is page-scoped and managed in the hooks above. The
existing `authStore` is read (not written) to determine whether `axiosInstance` attaches
a JWT.

### Route change

`src/App.tsx`: replace `<Route path="/" element={<LandingPage />} />` with
`<Route path="/" element={<PulseLandingPage />} />`.

### Analytics

Carry forward `src/utils/analytics.ts` from v1 unchanged. Wire `landing_page_view` on
mount in `PulseLandingPage` (single `useEffect` with `[]` dependency, per v1 decision).
The five minimum events remain valid; no new events are added by this redesign.

---

## 5. Task List

### Developer (backend phase)

- [ ] Create `V22__create_activity_events_table.sql`.
- [ ] Create `ActivityEvent.kt` JPA entity.
- [ ] Create `ActivityEventRepository.kt` with `findTop20ByOrderByOccurredAtDesc()`.
- [ ] Create `ActivityEventService.kt`: `recordEvent()`, `getRecent()`,
      `broadcastToEmitters()` with `CopyOnWriteArrayList<SseEmitter>` and
      `onCompletion`/`onTimeout`/`onError` cleanup callbacks.
- [ ] Create `LandingService.kt`: `getViewerState()`, `getStats()`, `getActivity()`.
- [ ] Create all response DTOs listed in Section 3.
- [ ] Create `LandingController.kt` with four endpoints.
- [ ] Add `/api/v1/landing/**` to permit-all in `SecurityConfig.kt`.
- [ ] Wire `ActivityEventService.recordEvent(kind="booking", ...)` into
      `BookingService.createBooking()` after the booking is persisted.
- [ ] Add `INTERNAL_ERROR` to `ErrorCode.kt` if absent.
- [ ] Write unit tests for `LandingService`:
  - viewer-state derivation: `booked`, `nobooked`, `nobooked` with null `nextOpenClass`,
    `loggedOut`
  - stats: authed variant, public variant
  - `spotsLeft` computation correctness

### Developer (frontend phase)

- [ ] Delete all v1 landing components listed in "Removed Components".
- [ ] Create `src/types/landing.ts`.
- [ ] Create `src/api/landing.ts`.
- [ ] Create `src/hooks/useViewerState.ts`.
- [ ] Create `src/hooks/useActivityFeed.ts` (initial fetch + SSE + rotation + cleanup).
- [ ] Create `src/hooks/useLandingStats.ts`.
- [ ] Create `src/hooks/useCountdown.ts`.
- [ ] Create `src/hooks/useReducedMotion.ts`.
- [ ] Create `AmbientWaveform.tsx` (rAF path gen; freeze on reduced motion).
- [ ] Create `BigCountdown.tsx` (88px Barlow Condensed, tabular-nums, three cells with
      unit labels, separators at opacity 0.4).
- [ ] Create `TrainerRow.tsx` (real photo or hsl initials fallback; overlapping circles).
- [ ] Create `HeroBooked.tsx`, `HeroNoBooked.tsx`, `HeroLoggedOut.tsx`.
- [ ] Create `ActivityFeed.tsx` (kind-dot colors per spec, rotation, bottom gradient fade).
- [ ] Create `StatsStrip.tsx` (three cells, authed vs public data).
- [ ] Create `PulseNav.tsx` and `PulseFooter.tsx`.
- [ ] Create `PulseLandingPage.tsx` (single-screen layout: `height: 100vh`,
      `overflow: hidden`, `grid-template-columns: 1.3fr 1fr`, `gap: 40px`,
      `padding: 48px 40px 32px`).
- [ ] Update `src/App.tsx` to use `PulseLandingPage`.
- [ ] Gate `StateSwitcher` on `import.meta.env.DEV`; ensure it is absent from
      production bundles.
- [ ] Wire `landing_page_view` analytics event on mount.
- [ ] Write component tests:
  - `HeroBooked` renders countdown from `startsAt`.
  - `HeroNoBooked` renders spots-left in `#FDBA74` when `spotsLeft <= 3`.
  - `HeroNoBooked` renders no-class fallback when `nextOpenClass` is null.
  - `ActivityFeed` uses "A member" actor in public variant.
  - `useReducedMotion` returns true when media query matches.

### Developer (E2E phase)

- [ ] Update `frontend/e2e/landing-page.spec.ts`:
  - Logged-out visitor sees `loggedOut` hero and anonymized feed.
  - Authed member with qualifying booking sees countdown hero.
  - Authed member without qualifying booking sees next-open class card.
  - `spotsLeft <= 3` renders in orange.
  - "Grab a spot" href matches `/schedule?classId={id}`.
  - No console errors in any of the three states.

---

## 6. Risks & Notes

### Design Decision: combined viewer-state endpoint

`GET /api/v1/landing/viewer-state` bundles viewer state, `onTheFloor`, and `firstName`
into one response to minimize round trips on the critical path. Stats and feed are
separate parallel fetches so the page can render partial data early.

### Design Decision: SSE over WebSocket

SSE is chosen because no WebSocket layer exists in the current codebase. Spring's
`SseEmitter` is the minimal addition. If a WebSocket layer is added in future, it may
replace the SSE stream without changing the client event shape or anonymization rules.

### Design Decision: no SSE event replay on reconnect

The feed is a display element, not a durable event log. On reconnect the client
re-fetches `GET /activity` to refresh the list. Missed events are acceptable.

### Assumption A1: primary trainer per class

The design requires one trainer per class in the viewer-state response. `V12__` creates a
`class_instance_trainers` join table. `LandingService` uses the first row by insertion
order as the primary trainer. If no trainer is assigned: `TrainerRefDto(id=null,
name="Staff", avatarUrl=null)`.

### Assumption A2: "on the floor" uses booking proxy

The `bookings` table has no distinct check-in event beyond status `ATTENDED`. The
`onTheFloor` count uses CONFIRMED or ATTENDED bookings for classes whose `scheduled_at`
falls between `today at 05:00 UTC` and `now`. If a future migration adds
`checked_in_at TIMESTAMPTZ` to `bookings`, update `LandingService` and note it here.

### Assumption A3: trainer avatar URL construction

`avatarUrl` is set to `/api/v1/trainers/{id}/photo` when the trainer record has
`photo_data IS NOT NULL`. Null otherwise. The frontend renders an `hsl({i*47+140},60%,50%)`
initials circle when `avatarUrl` is null.

### Risk: SSE emitter memory leak

`SseEmitter` instances must be removed from the registered list on completion, timeout,
or error. `ActivityEventService` must register all three callbacks. Without this, the
`CopyOnWriteArrayList` grows unboundedly and sends to dead connections.

### Risk: `recordEvent` in the booking transaction

`ActivityEventService.recordEvent()` is called synchronously within the booking
transaction. If write latency is a concern at scale, move to `@Async` outside the
transaction. For v1 volume this is acceptable.

### DB: live DB unavailable at SDD authoring time

The Postgres MCP was unavailable (authentication error) when this SDD was authored.
Schema decisions are based on Flyway migration files V1 through V21. Before running
`V22__create_activity_events_table.sql`, confirm no `activity_events` table already
exists in the target DB.

### v1 SDD decisions that no longer apply

The following v1 SDD (2026-03-29) decisions are superseded:
- Reuse of `GET /api/v1/membership-plans` as the landing data source.
- `PlansPreviewSection`, `HowItWorksSection`, `FaqSection` components.
- `resolveLandingActions` helper, `LandingPrimaryAction` type, auth-CTA matrix (Section 7).
- `LandingPlanAction` type.

Do not implement these as part of the Pulse redesign.
