# SDD: Trainer Discovery

## Reference
- PRD: `docs/prd/trainer-discovery.md`
- Date: 2026-03-30

## Architecture Overview

Trainer Discovery is a read-heavy, user-facing feature layered on top of the existing
`trainers` and `class_instances` tables. It introduces three new pieces of infrastructure:

1. **Two new DB columns** on `trainers` (`experience_years`, `profile_photo_url`) added via
   a single Flyway migration.
2. **One new DB table** (`user_trainer_favorites`) to persist Member favorites.
3. **One new public REST controller** (`TrainerDiscoveryController`) for browsing, profile
   detail, and availability preview — separate from the existing admin-only
   `AdminTrainerController`.
4. **One new REST controller** (`TrainerFavoriteController`) for favorites CRUD.
5. **One new service** (`TrainerDiscoveryService`) encapsulating all read/query logic,
   plus **one new service** (`TrainerFavoriteService`) for favorites write logic.
6. **Frontend pages and components** under `frontend/src/pages/trainers/` and
   `frontend/src/components/trainers/`.

**Layers affected:** DB, Backend, Frontend.

**Existing files that must be modified:**
- `domain/Trainer.kt` — add two new nullable fields.
- `config/SecurityConfig.kt` — permit the new public-facing GET endpoints for authenticated
  users (no change needed since `anyRequest().authenticated()` already covers them; the
  new endpoints sit at `/api/v1/trainers/**` and require a JWT token).

**Schema note (from migration file inspection):**
- The `trainers` table spells the array column `specialisations` (British spelling). All
  SQL and JPQL in this SDD must use `specialisations` to match.
- The `class_instances` table has no `status` column. A "SCHEDULED" (active, future) class
  instance is defined as: `deleted_at IS NULL AND scheduled_at > NOW()`.
- The existing photo mechanism stores binary data in `photo_data BYTEA` and serves it at
  `/api/v1/trainers/{id}/photo`. The new `profile_photo_url TEXT` column is additive and
  nullable; it allows an admin to store an external URL instead of uploading a binary.
  The frontend prefers `profilePhotoUrl` if non-null; otherwise it constructs the BYTEA
  endpoint URL `/api/v1/trainers/{id}/photo` if `hasPhoto = true`; otherwise it uses a
  placeholder avatar. This logic lives in a helper in `frontend/src/utils/trainerPhoto.ts`.

---

## 1. Database Changes

### New Columns on `trainers`

```sql
-- V15__add_trainer_discovery_columns.sql
ALTER TABLE trainers
  ADD COLUMN IF NOT EXISTS experience_years   INT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS profile_photo_url  TEXT         DEFAULT NULL;

ALTER TABLE trainers
  ADD CONSTRAINT chk_trainers_experience_years
    CHECK (experience_years IS NULL OR experience_years >= 0);

CREATE INDEX idx_trainers_experience_years
  ON trainers (experience_years NULLS LAST)
  WHERE experience_years IS NOT NULL;
```

**Column notes:**
- `experience_years` — nullable INT; no NOT NULL constraint (self-reported, admin-entered).
  The CHECK ensures no negative values are stored. The partial index covers sort queries on
  `experience_years DESC` / `ASC` where NULL trainers are always pushed to the end (enforced
  by `NULLS LAST` in the index; the service-layer sort clause must also specify `NULLS LAST`).
- `profile_photo_url` — nullable TEXT; no length cap (URLs can be long). No index needed
  (never filtered or sorted on).

### New Table: `user_trainer_favorites`

```sql
-- also in V15__add_trainer_discovery_columns.sql (same migration)
CREATE TABLE user_trainer_favorites (
  user_id    UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  trainer_id UUID        NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, trainer_id)
);

CREATE INDEX idx_utf_user_id    ON user_trainer_favorites (user_id);
CREATE INDEX idx_utf_trainer_id ON user_trainer_favorites (trainer_id);
```

**Constraint notes:**
- Composite PK `(user_id, trainer_id)` enforces the no-duplicate-favorites rule at DB level
  (AC 18 / edge case story). Any duplicate INSERT will produce a `DataIntegrityViolationException`
  which the service maps to `ALREADY_FAVORITED`.
- `ON DELETE CASCADE` on `user_id`: when a user is deleted, their favorites are removed.
- `ON DELETE CASCADE` on `trainer_id`: when a trainer is soft-deleted it is NOT actually
  removed from DB (soft-delete pattern), so this cascade only fires on a hard-delete if
  ever introduced. Safe to keep.
- No `updated_at` column — favorites have no mutable fields.

### Flyway Migration Filename

`V15__add_trainer_discovery_columns.sql`

Both the column additions and the new table live in a single migration to keep the
feature atomic. If either DDL change fails, the whole migration rolls back.

---

## 2. Backend API Contract

### Allowed Sort Fields (used by all list endpoints)

| `sort` param value | DB expression |
|--------------------|---------------|
| `lastName,asc` (default) | `ORDER BY last_name ASC NULLS LAST` |
| `lastName,desc` | `ORDER BY last_name DESC NULLS LAST` |
| `experienceYears,desc` | `ORDER BY experience_years DESC NULLS LAST` |
| `experienceYears,asc` | `ORDER BY experience_years ASC NULLS LAST` |

Any other value → HTTP 400 `INVALID_SORT_FIELD`.

The service must validate the sort field name explicitly before passing it to Spring's
`Pageable`. Do NOT allow arbitrary field names through to JPA (SQL-injection surface).

---

### GET /api/v1/trainers

**Auth:** Required (any authenticated user — USER or ADMIN role)
**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `specialization` | `string` (repeatable) | No | Case-insensitive filter; multi-value OR logic |
| `sort` | `string` | No | One of the four values above; default `lastName,asc` |
| `page` | `int` | No | 0-based page index; default `0` |
| `size` | `int` | No | Page size; default `12` |

**Success Response (200):**
```json
{
  "content": [
    {
      "id": "uuid",
      "firstName": "Jane",
      "lastName": "Smith",
      "profilePhotoUrl": "https://cdn.example.com/trainers/jane.jpg",
      "specializations": ["Yoga", "Pilates"],
      "experienceYears": 5,
      "classCount": 3,
      "isFavorited": true
    }
  ],
  "totalElements": 42,
  "totalPages": 4,
  "page": 0,
  "size": 12
}
```

Field notes:
- `profilePhotoUrl` — null when both `profile_photo_url` DB column and `photo_data` are
  absent. When `profile_photo_url` is non-null, return it verbatim. When `profile_photo_url`
  is null but `photo_data` is present, return the relative URL `/api/v1/trainers/{id}/photo`.
- `specializations` — uses American spelling in the API (camelCase JSON key); maps to the
  `specialisations` DB column.
- `classCount` — number of currently SCHEDULED class instances (defined as:
  `deleted_at IS NULL AND scheduled_at > NOW()`).
- `isFavorited` — `true` if the requesting user has this trainer in their favorites list.
  Always `false` for users without an active membership (they cannot have favorites).

**Error Responses:**

| Status | Error Code | Condition |
|--------|------------|-----------|
| 400 | `INVALID_SORT_FIELD` | `sort` param is not one of the four allowed values |
| 401 | — | No valid JWT token |

**Business Logic:**
1. Validate `sort` parameter against the allowed set; throw `400` if invalid.
2. If `specialization` filter values are provided, query using
   `EXISTS (SELECT 1 FROM unnest(t.specialisations) s WHERE LOWER(s) = LOWER(:value))`
   for each value, joined with OR.
3. Fetch paginated list of trainers where `deleted_at IS NULL`.
4. For each trainer in the result page, compute `classCount` via a single aggregating query
   (see Section 3 — Service implementation note on N+1 avoidance).
5. Resolve `isFavorited` for the current user via a single batch query against
   `user_trainer_favorites` for the trainer IDs in the page.
6. Resolve `profilePhotoUrl` per the field note above.

---

### GET /api/v1/trainers/favorites

**Auth:** Required; Member role (ACTIVE membership) only.

**Important routing note:** This path must be registered BEFORE `GET /api/v1/trainers/{id}`
in the controller (or Spring will attempt to parse `"favorites"` as a UUID). Use a dedicated
`@GetMapping("/favorites")` method above the `/{id}` mapping.

**Query Parameters:** Same `sort`, `page`, `size` as the list endpoint above.

**Success Response (200):** Same paginated envelope and DTO shape as `GET /api/v1/trainers`.

**Error Responses:**

| Status | Error Code | Condition |
|--------|------------|-----------|
| 400 | `INVALID_SORT_FIELD` | `sort` param is not one of the four allowed values |
| 401 | — | No valid JWT token |
| 403 | `MEMBERSHIP_REQUIRED` | User has no ACTIVE membership |

**Business Logic:**
1. Check that the requesting user has an ACTIVE membership via
   `UserMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE")`.
   If not, throw `403 MEMBERSHIP_REQUIRED`.
2. Query `user_trainer_favorites` for the user's `trainer_id` set, then fetch those
   trainers with the same sort/filter logic as the main list (without specialization
   filter — not supported on the favorites list).
3. `isFavorited` is always `true` for all results on this endpoint.

---

### GET /api/v1/trainers/{id}

**Auth:** Required (any authenticated user)
**Path Variable:** `id` — UUID

**Success Response (200):**
```json
{
  "id": "uuid",
  "firstName": "Jane",
  "lastName": "Smith",
  "profilePhotoUrl": null,
  "bio": "Certified yoga instructor with 10 years experience.",
  "specializations": ["Yoga", "Pilates"],
  "experienceYears": 10,
  "classCount": 3,
  "isFavorited": false,
  "availabilityPreview": {
    "MONDAY":    ["MORNING", "AFTERNOON"],
    "TUESDAY":   [],
    "WEDNESDAY": ["EVENING"],
    "THURSDAY":  [],
    "FRIDAY":    ["MORNING"],
    "SATURDAY":  [],
    "SUNDAY":    []
  }
}
```

Field notes:
- `email` is explicitly NEVER included in this response (security rule).
- `phone` is explicitly NEVER included in this response.
- `availabilityPreview` — all seven day keys are always present, even if the value is `[]`.
  A time block appears for a day if and only if the trainer has at least one SCHEDULED class
  instance (defined as `deleted_at IS NULL AND scheduled_at > NOW()`) starting within that
  block's hour range on that day of the week. Blocks: MORNING = 06:00–11:59 UTC,
  AFTERNOON = 12:00–16:59 UTC, EVENING = 17:00–21:59 UTC. Classes outside 06:00–22:00 UTC
  are ignored for the preview (treated as no block).

**Error Responses:**

| Status | Error Code | Condition |
|--------|------------|-----------|
| 401 | — | No valid JWT token |
| 404 | `TRAINER_NOT_FOUND` | No trainer with given `id`, or trainer is soft-deleted |

**Business Logic:**
1. Look up trainer by ID where `deleted_at IS NULL`. If not found, throw `404 TRAINER_NOT_FOUND`.
2. Compute `classCount` (same definition as list endpoint).
3. Compute `availabilityPreview` via a single native SQL aggregation query (see Section 3).
4. Resolve `isFavorited` for the requesting user.
5. Resolve `profilePhotoUrl` per the field note above.

---

### POST /api/v1/trainers/{id}/favorites

**Auth:** Required; Member role (ACTIVE membership) only.
**Path Variable:** `id` — UUID of the trainer to favorite.
**Request Body:** none

**Success Response (201):**
```json
{
  "trainerId": "uuid",
  "firstName": "Jane",
  "lastName": "Smith"
}
```

**Error Responses:**

| Status | Error Code | Condition |
|--------|------------|-----------|
| 401 | — | No valid JWT token |
| 403 | `MEMBERSHIP_REQUIRED` | User has no ACTIVE membership |
| 404 | `TRAINER_NOT_FOUND` | Trainer `id` does not exist or is soft-deleted |
| 409 | `ALREADY_FAVORITED` | This trainer is already in the user's favorites |

**Business Logic:**
1. Check ACTIVE membership; throw `403 MEMBERSHIP_REQUIRED` if absent.
2. Look up trainer by ID where `deleted_at IS NULL`; throw `404 TRAINER_NOT_FOUND` if absent.
3. Insert row into `user_trainer_favorites (user_id, trainer_id)`.
   Catch `DataIntegrityViolationException` (duplicate PK) and map to `409 ALREADY_FAVORITED`.
4. Return `201` with trainer summary.

---

### DELETE /api/v1/trainers/{id}/favorites

**Auth:** Required; Member role (ACTIVE membership) only.
**Path Variable:** `id` — UUID of the trainer to un-favorite.
**Request Body:** none

**Success Response (204):** no body.

**Error Responses:**

| Status | Error Code | Condition |
|--------|------------|-----------|
| 401 | — | No valid JWT token |
| 403 | `MEMBERSHIP_REQUIRED` | User has no ACTIVE membership |
| 404 | `FAVORITE_NOT_FOUND` | No favorite record exists for this user + trainer pair |

**Business Logic:**
1. Check ACTIVE membership; throw `403 MEMBERSHIP_REQUIRED` if absent.
2. Attempt to delete the `user_trainer_favorites` row for `(userId, trainerId)`.
   If no row is deleted (0 rows affected), throw `404 FAVORITE_NOT_FOUND`.
3. Return `204`.

**Note on trainer existence:** Per AC 21, the error code is `FAVORITE_NOT_FOUND` (not
`TRAINER_NOT_FOUND`) even if the trainer ID does not exist at all. Both cases result in
0 rows deleted from the favorites table, so a single delete-and-check covers both scenarios.

---

## 3. Kotlin Classes to Create

### New Files

| File | Type | Purpose |
|------|------|---------|
| `backend/src/main/kotlin/com/gymflow/domain/UserTrainerFavorite.kt` | Entity | JPA entity for `user_trainer_favorites` |
| `backend/src/main/kotlin/com/gymflow/dto/TrainerDiscoveryResponse.kt` | DTO | Trainer card/list item response (used by list + favorites list) |
| `backend/src/main/kotlin/com/gymflow/dto/TrainerProfileResponse.kt` | DTO | Full trainer profile response including `availabilityPreview` |
| `backend/src/main/kotlin/com/gymflow/dto/TrainerFavoriteResponse.kt` | DTO | Response body for POST /favorites |
| `backend/src/main/kotlin/com/gymflow/dto/AvailabilityPreview.kt` | DTO | Availability preview map: `Map<DayOfWeek, List<TimeBlock>>` |
| `backend/src/main/kotlin/com/gymflow/repository/UserTrainerFavoriteRepository.kt` | Repository | Favorites CRUD + batch exists queries |
| `backend/src/main/kotlin/com/gymflow/service/TrainerDiscoveryService.kt` | Service | List, filter, sort, profile, availability, `isFavorited` resolution |
| `backend/src/main/kotlin/com/gymflow/service/TrainerFavoriteService.kt` | Service | Add/remove favorites + membership gate |
| `backend/src/main/kotlin/com/gymflow/controller/TrainerDiscoveryController.kt` | Controller | GET /api/v1/trainers, GET /api/v1/trainers/{id}, GET /api/v1/trainers/favorites |
| `backend/src/main/kotlin/com/gymflow/controller/TrainerFavoriteController.kt` | Controller | POST + DELETE /api/v1/trainers/{id}/favorites |

### Modified Files

| File | Change |
|------|--------|
| `backend/src/main/kotlin/com/gymflow/domain/Trainer.kt` | Add two nullable fields: `var experienceYears: Int? = null` and `var profilePhotoUrl: String? = null` |
| `backend/src/main/kotlin/com/gymflow/dto/TrainerRequest.kt` | Add optional field `val experienceYears: Int?` and `val profilePhotoUrl: String?` so Admin Scheduler can set them |

### Class Specifications

#### `UserTrainerFavorite.kt`
```kotlin
@Entity
@Table(name = "user_trainer_favorites")
@IdClass(UserTrainerFavoriteId::class)
data class UserTrainerFavorite(
    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    val userId: UUID,

    @Id
    @Column(name = "trainer_id", nullable = false, updatable = false)
    val trainerId: UUID,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now()
)

data class UserTrainerFavoriteId(
    val userId: UUID = UUID.randomUUID(),
    val trainerId: UUID = UUID.randomUUID()
) : java.io.Serializable
```

#### `TrainerDiscoveryResponse.kt` (list item / card DTO)
```kotlin
data class TrainerDiscoveryResponse(
    val id: UUID,
    val firstName: String,
    val lastName: String,
    val profilePhotoUrl: String?,        // null → frontend uses placeholder
    val specializations: List<String>,   // maps from DB column 'specialisations'
    val experienceYears: Int?,
    val classCount: Int,
    val isFavorited: Boolean
)
```

#### `TrainerProfileResponse.kt`
```kotlin
data class TrainerProfileResponse(
    val id: UUID,
    val firstName: String,
    val lastName: String,
    val profilePhotoUrl: String?,
    val bio: String?,
    val specializations: List<String>,
    val experienceYears: Int?,
    val classCount: Int,
    val isFavorited: Boolean,
    val availabilityPreview: Map<String, List<String>>  // day → list of block labels
)
// Example availabilityPreview keys: "MONDAY", "TUESDAY", ..., "SUNDAY"
// Example block labels: "MORNING", "AFTERNOON", "EVENING"
```

#### `TrainerFavoriteResponse.kt`
```kotlin
data class TrainerFavoriteResponse(
    val trainerId: UUID,
    val firstName: String,
    val lastName: String
)
```

#### `UserTrainerFavoriteRepository.kt`
```kotlin
interface UserTrainerFavoriteRepository : JpaRepository<UserTrainerFavorite, UserTrainerFavoriteId> {

    fun findAllByUserId(userId: UUID, pageable: Pageable): Page<UserTrainerFavorite>

    fun existsByUserIdAndTrainerId(userId: UUID, trainerId: UUID): Boolean

    // Used to batch-resolve isFavorited for a page of trainer IDs
    @Query("SELECT f.trainerId FROM UserTrainerFavorite f WHERE f.userId = :userId AND f.trainerId IN :trainerIds")
    fun findFavoritedTrainerIds(
        @Param("userId") userId: UUID,
        @Param("trainerIds") trainerIds: Collection<UUID>
    ): Set<UUID>

    // Returns number of deleted rows (0 or 1)
    @Modifying
    @Query("DELETE FROM UserTrainerFavorite f WHERE f.userId = :userId AND f.trainerId = :trainerId")
    fun deleteByUserIdAndTrainerId(
        @Param("userId") userId: UUID,
        @Param("trainerId") trainerId: UUID
    ): Int
}
```

#### `TrainerDiscoveryService.kt` — key methods

```kotlin
@Service
@Transactional(readOnly = true)
class TrainerDiscoveryService(
    private val trainerRepository: TrainerRepository,
    private val userTrainerFavoriteRepository: UserTrainerFavoriteRepository,
    private val userMembershipRepository: UserMembershipRepository
) {

    fun listTrainers(
        specializations: List<String>?,
        sortField: String,
        sortDir: String,
        pageable: Pageable,
        requestingUserId: UUID
    ): Page<TrainerDiscoveryResponse>

    fun getFavoriteTrainers(
        sortField: String,
        sortDir: String,
        pageable: Pageable,
        requestingUserId: UUID
    ): Page<TrainerDiscoveryResponse>

    fun getTrainerProfile(
        trainerId: UUID,
        requestingUserId: UUID
    ): TrainerProfileResponse
}
```

**N+1 avoidance — `classCount`:**
After fetching a page of trainers, compute classCount for the entire page in one query:

```sql
-- Native SQL (run as a single batch after fetching the trainer page)
SELECT cit.trainer_id, COUNT(*) AS class_count
FROM class_instance_trainers cit
JOIN class_instances ci ON ci.id = cit.class_instance_id
WHERE cit.trainer_id IN (:trainerIds)
  AND ci.deleted_at IS NULL
  AND ci.scheduled_at > NOW()
GROUP BY cit.trainer_id
```

Returns a `List<Array<Any>>` (trainer_id, count) which is mapped into a `Map<UUID, Int>`.
Missing keys map to count = 0.

Add this as a native query method in `ClassInstanceRepository`:
```kotlin
@Query(
    value = """
    SELECT cit.trainer_id AS trainerId, COUNT(*) AS classCount
    FROM class_instance_trainers cit
    JOIN class_instances ci ON ci.id = cit.class_instance_id
    WHERE cit.trainer_id IN (:trainerIds)
      AND ci.deleted_at IS NULL
      AND ci.scheduled_at > NOW()
    GROUP BY cit.trainer_id
    """,
    nativeQuery = true
)
fun countScheduledClassesForTrainers(
    @Param("trainerIds") trainerIds: Collection<UUID>
): List<Array<Any>>
```

**Availability preview query:**

Add as a native query method in `ClassInstanceRepository`:
```kotlin
@Query(
    value = """
    SELECT
        TRIM(TO_CHAR(ci.scheduled_at AT TIME ZONE 'UTC', 'DAY'))  AS day_of_week,
        EXTRACT(HOUR FROM ci.scheduled_at AT TIME ZONE 'UTC')      AS hour_of_day
    FROM class_instances ci
    JOIN class_instance_trainers cit ON cit.class_instance_id = ci.id
    WHERE cit.trainer_id = :trainerId
      AND ci.deleted_at IS NULL
      AND ci.scheduled_at > NOW()
    """,
    nativeQuery = true
)
fun findScheduledDayHoursByTrainer(
    @Param("trainerId") trainerId: UUID
): List<Array<Any>>
```

The service maps each row's `(day_of_week, hour_of_day)` to a `(DayOfWeek, TimeBlock)` pair,
deduplicates, and constructs the seven-key map. `TO_CHAR(..., 'DAY')` returns the full day
name in uppercase (e.g. `MONDAY   `) — use `TRIM()` to strip trailing spaces. Hour mapping:
- 6–11 → `MORNING`
- 12–16 → `AFTERNOON`
- 17–21 → `EVENING`
- All other hours → ignored (no block entry)

**Sort validation — allowed set:**
```kotlin
private val ALLOWED_SORT_FIELDS = setOf("lastName", "experienceYears")

fun validateSort(sortField: String) {
    if (sortField !in ALLOWED_SORT_FIELDS) throw InvalidSortFieldException(sortField)
}
```

`InvalidSortFieldException` is caught by `GlobalExceptionHandler` and mapped to
`400 { "error": "Invalid sort field: $field", "code": "INVALID_SORT_FIELD" }`.

**Specialization filter — JPQL:**
```kotlin
@Query(
    """
    SELECT t FROM Trainer t
    WHERE t.deletedAt IS NULL
      AND (
        :#{#specs == null || #specs.isEmpty()} = true
        OR EXISTS (
          SELECT 1 FROM t.specialisations s
          WHERE LOWER(s) IN :lowerSpecs
        )
      )
    """
)
fun findBySpecializations(
    @Param("specs") specs: List<String>?,
    @Param("lowerSpecs") lowerSpecs: List<String>?,
    pageable: Pageable
): Page<Trainer>
```

Add `lowerSpecs` (pre-lowercased in the service) to avoid calling LOWER() on both sides.
The service transforms the incoming list: `lowerSpecs = specs?.map { it.lowercase() }`.

#### `TrainerFavoriteService.kt` — key methods

```kotlin
@Service
@Transactional
class TrainerFavoriteService(
    private val trainerRepository: TrainerRepository,
    private val userTrainerFavoriteRepository: UserTrainerFavoriteRepository,
    private val userMembershipRepository: UserMembershipRepository
) {

    fun addFavorite(userId: UUID, trainerId: UUID): TrainerFavoriteResponse {
        requireActiveMembership(userId)
        val trainer = trainerRepository.findByIdAndDeletedAtIsNull(trainerId)
            ?: throw TrainerNotFoundException("Trainer with id '$trainerId' not found")
        val favorite = UserTrainerFavorite(userId = userId, trainerId = trainerId)
        try {
            userTrainerFavoriteRepository.save(favorite)
        } catch (ex: DataIntegrityViolationException) {
            throw AlreadyFavoritedException(trainerId)
        }
        return TrainerFavoriteResponse(
            trainerId = trainer.id,
            firstName = trainer.firstName,
            lastName = trainer.lastName
        )
    }

    fun removeFavorite(userId: UUID, trainerId: UUID) {
        requireActiveMembership(userId)
        val deleted = userTrainerFavoriteRepository.deleteByUserIdAndTrainerId(userId, trainerId)
        if (deleted == 0) throw FavoriteNotFoundException(trainerId)
    }

    private fun requireActiveMembership(userId: UUID) {
        if (!userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE")) {
            throw MembershipRequiredException()
        }
    }
}
```

**New exception classes** (add to `TrainerFavoriteService.kt`):
```kotlin
class AlreadyFavoritedException(trainerId: UUID) :
    RuntimeException("Trainer $trainerId is already in favorites")
class FavoriteNotFoundException(trainerId: UUID) :
    RuntimeException("Favorite for trainer $trainerId not found")
class MembershipRequiredException :
    RuntimeException("Active membership required")
class InvalidSortFieldException(field: String) :
    RuntimeException("Invalid sort field: $field")
```

**`GlobalExceptionHandler` additions** (modify existing
`backend/src/main/kotlin/com/gymflow/controller/GlobalExceptionHandler.kt`):

| Exception | HTTP Status | Error Code |
|-----------|-------------|------------|
| `AlreadyFavoritedException` | 409 | `ALREADY_FAVORITED` |
| `FavoriteNotFoundException` | 404 | `FAVORITE_NOT_FOUND` |
| `MembershipRequiredException` | 403 | `MEMBERSHIP_REQUIRED` |
| `InvalidSortFieldException` | 400 | `INVALID_SORT_FIELD` |

`TrainerNotFoundException` already exists in `TrainerService.kt`. It is already mapped in
`GlobalExceptionHandler`. Verify it maps to 404 with code `TRAINER_NOT_FOUND`; add mapping
if missing.

#### `TrainerRepository.kt` — new method to add

```kotlin
fun findByIdAndDeletedAtIsNull(id: UUID): Trainer?
```

Spring Data JPA derives this from the method name automatically — no `@Query` needed.

#### `TrainerDiscoveryController.kt`

```kotlin
@RestController
@RequestMapping("/api/v1/trainers")
class TrainerDiscoveryController(
    private val trainerDiscoveryService: TrainerDiscoveryService
) {

    @GetMapping("/favorites")          // MUST appear before /{id} mapping
    fun getMyFavorites(
        @RequestParam(defaultValue = "lastName") sortField: String,
        @RequestParam(defaultValue = "asc") sortDir: String,
        @PageableDefault(size = 12) pageable: Pageable,
        authentication: Authentication
    ): ResponseEntity<Page<TrainerDiscoveryResponse>>

    @GetMapping
    fun listTrainers(
        @RequestParam(required = false) specialization: List<String>?,
        @RequestParam(defaultValue = "lastName") sortField: String,
        @RequestParam(defaultValue = "asc") sortDir: String,
        @PageableDefault(size = 12) pageable: Pageable,
        authentication: Authentication
    ): ResponseEntity<Page<TrainerDiscoveryResponse>>

    @GetMapping("/{id}")
    fun getTrainer(
        @PathVariable id: UUID,
        authentication: Authentication
    ): ResponseEntity<TrainerProfileResponse>
}
```

**Auth:** All three methods require any authenticated user. Spring Security's
`anyRequest().authenticated()` already enforces this globally — no additional
`@PreAuthorize` needed. The favorites endpoint enforces ACTIVE membership inside
`TrainerDiscoveryService.getFavoriteTrainers`.

#### `TrainerFavoriteController.kt`

```kotlin
@RestController
@RequestMapping("/api/v1/trainers/{id}/favorites")
class TrainerFavoriteController(
    private val trainerFavoriteService: TrainerFavoriteService
) {

    @PostMapping
    fun addFavorite(
        @PathVariable id: UUID,
        authentication: Authentication
    ): ResponseEntity<TrainerFavoriteResponse>

    @DeleteMapping
    fun removeFavorite(
        @PathVariable id: UUID,
        authentication: Authentication
    ): ResponseEntity<Void>
}
```

---

## 4. Frontend Components to Create

### Pages

| Route | Component File | Purpose |
|-------|---------------|---------|
| `/trainers` | `frontend/src/pages/trainers/TrainerListPage.tsx` | Browse, filter, sort trainer cards |
| `/trainers/:id` | `frontend/src/pages/trainers/TrainerProfilePage.tsx` | Full trainer profile + availability grid |
| `/trainers/favorites` | `frontend/src/pages/trainers/TrainerFavoritesPage.tsx` | Member's saved trainers (Members only; redirects Guests) |

**Routing note:** `/trainers/favorites` is a static path segment. It must be registered
BEFORE the `/trainers/:id` dynamic route in the React Router config to prevent React
Router treating `"favorites"` as an `:id` param.

### New Components

| Component File | Location | Key Props |
|---------------|----------|-----------|
| `TrainerCard.tsx` | `frontend/src/components/trainers/` | `trainer: TrainerDiscoveryItem`, `onFavoriteToggle: (id: string) => void`, `isMember: boolean` |
| `TrainerCardSkeleton.tsx` | `frontend/src/components/trainers/` | none — fixed placeholder |
| `SpecializationFilterPanel.tsx` | `frontend/src/components/trainers/` | `allSpecializations: string[]`, `selected: string[]`, `onChange: (selected: string[]) => void` |
| `SortDropdown.tsx` | `frontend/src/components/trainers/` | `value: SortOption`, `onChange: (v: SortOption) => void` |
| `AvailabilityGrid.tsx` | `frontend/src/components/trainers/` | `preview: AvailabilityPreview` |
| `FavoriteButton.tsx` | `frontend/src/components/trainers/` | `isFavorited: boolean`, `isMember: boolean`, `loading: boolean`, `onToggle: () => void` |

### New Types (`frontend/src/types/trainer.ts`)

```typescript
export type TimeBlock = 'MORNING' | 'AFTERNOON' | 'EVENING';

export type DayOfWeek =
  | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY'
  | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export type AvailabilityPreview = Record<DayOfWeek, TimeBlock[]>;

export interface TrainerDiscoveryItem {
  id: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
  specializations: string[];
  experienceYears: number | null;
  classCount: number;
  isFavorited: boolean;
}

export interface TrainerProfile extends TrainerDiscoveryItem {
  bio: string | null;
  availabilityPreview: AvailabilityPreview;
}

export interface TrainerFavoriteResponse {
  trainerId: string;
  firstName: string;
  lastName: string;
}

export type SortOption =
  | 'lastName,asc'
  | 'lastName,desc'
  | 'experienceYears,desc'
  | 'experienceYears,asc';

export interface TrainerPage {
  content: TrainerDiscoveryItem[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}
```

### New Utility (`frontend/src/utils/trainerPhoto.ts`)

```typescript
// Returns a displayable photo URL for a trainer card/profile image src.
export function resolveTrainerPhotoUrl(
  trainerId: string,
  profilePhotoUrl: string | null,
  hasPhoto: boolean  // derived from backend field if needed; not present in discovery DTO
): string | null {
  if (profilePhotoUrl) return profilePhotoUrl;
  // hasPhoto is not in TrainerDiscoveryItem — for the discovery endpoints, only
  // profilePhotoUrl is available. Return null (frontend shows placeholder avatar).
  return null;
}
```

Note: `hasPhoto` is a field from the existing admin `TrainerResponse` DTO, not from the
new discovery DTOs. The discovery endpoints resolve the photo URL server-side. Frontend
simply checks `trainer.profilePhotoUrl ?? <placeholder>`.

### New API Functions (`frontend/src/api/trainers.ts`)

```typescript
import axiosInstance from './axiosInstance';
import type { TrainerPage, TrainerProfile, TrainerFavoriteResponse, SortOption } from '../types/trainer';

export interface ListTrainersParams {
  specialization?: string[];
  sortField?: string;
  sortDir?: string;
  page?: number;
  size?: number;
}

export async function listTrainers(params: ListTrainersParams): Promise<TrainerPage> {
  const { data } = await axiosInstance.get('/trainers', { params });
  return data;
}

export async function getTrainerProfile(id: string): Promise<TrainerProfile> {
  const { data } = await axiosInstance.get(`/trainers/${id}`);
  return data;
}

export async function getMyFavoriteTrainers(params: {
  sortField?: string;
  sortDir?: string;
  page?: number;
  size?: number;
}): Promise<TrainerPage> {
  const { data } = await axiosInstance.get('/trainers/favorites', { params });
  return data;
}

export async function addFavorite(trainerId: string): Promise<TrainerFavoriteResponse> {
  const { data } = await axiosInstance.post(`/trainers/${trainerId}/favorites`);
  return data;
}

export async function removeFavorite(trainerId: string): Promise<void> {
  await axiosInstance.delete(`/trainers/${trainerId}/favorites`);
}

export async function getDistinctSpecializations(): Promise<string[]> {
  // Derived client-side from the full trainer list on first load or via a
  // dedicated endpoint if added later. For v1, fetch page 0 size=200 and
  // extract unique specializations from the result.
  // See Section 4 Open Questions for a future /specializations endpoint.
  const { data } = await axiosInstance.get<TrainerPage>('/trainers', {
    params: { size: 200, page: 0, sort: 'lastName,asc' }
  });
  const all = data.content.flatMap(t => t.specializations);
  return [...new Set(all.map(s => s.toLowerCase()))].sort()
    .map(lower => all.find(s => s.toLowerCase() === lower) ?? lower);
}
```

### Zustand Store (`frontend/src/store/trainerStore.ts`) — new file

```typescript
import { create } from 'zustand';
import type { TrainerDiscoveryItem, TrainerProfile, SortOption } from '../types/trainer';

interface TrainerState {
  // List page state
  trainers: TrainerDiscoveryItem[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
  selectedSpecializations: string[];
  sortOption: SortOption;
  isLoading: boolean;
  error: string | null;

  // Favorites state
  favoriteIds: Set<string>;   // trainer IDs favorited by the current user

  // Actions
  setTrainers: (page: { content: TrainerDiscoveryItem[]; totalPages: number; totalElements: number }) => void;
  setPage: (page: number) => void;
  setSpecializations: (specs: string[]) => void;
  setSortOption: (opt: SortOption) => void;
  setLoading: (v: boolean) => void;
  setError: (msg: string | null) => void;
  addFavoriteId: (id: string) => void;
  removeFavoriteId: (id: string) => void;
  setFavoriteIds: (ids: string[]) => void;
  resetFilters: () => void;
}

export const useTrainerStore = create<TrainerState>((set) => ({
  trainers: [],
  totalPages: 0,
  totalElements: 0,
  currentPage: 0,
  selectedSpecializations: [],
  sortOption: 'lastName,asc',
  isLoading: false,
  error: null,
  favoriteIds: new Set(),

  setTrainers: ({ content, totalPages, totalElements }) =>
    set({ trainers: content, totalPages, totalElements }),
  setPage: (page) => set({ currentPage: page }),
  setSpecializations: (specs) => set({ selectedSpecializations: specs, currentPage: 0 }),
  setSortOption: (opt) => set({ sortOption: opt, currentPage: 0 }),
  setLoading: (v) => set({ isLoading: v }),
  setError: (msg) => set({ error: msg }),
  addFavoriteId: (id) =>
    set((s) => ({ favoriteIds: new Set([...s.favoriteIds, id]) })),
  removeFavoriteId: (id) =>
    set((s) => {
      const next = new Set(s.favoriteIds);
      next.delete(id);
      return { favoriteIds: next };
    }),
  setFavoriteIds: (ids) => set({ favoriteIds: new Set(ids) }),
  resetFilters: () =>
    set({ selectedSpecializations: [], sortOption: 'lastName,asc', currentPage: 0 }),
}));
```

### Frontend Error Handling

| API Error Code | User-facing message |
|----------------|---------------------|
| `INVALID_SORT_FIELD` | "Invalid sort selection. Please refresh the page." |
| `TRAINER_NOT_FOUND` | "Trainer not found." (404 page on profile route) |
| `MEMBERSHIP_REQUIRED` | "An active membership is required. Upgrade your plan to save favorites." |
| `ALREADY_FAVORITED` | Silently ignored — button state already updated optimistically; revert if this fires |
| `FAVORITE_NOT_FOUND` | Silently ignored — treat as success (already not favorited); revert button state |
| Network/5xx | "Could not load trainers. Please try again." banner with Retry button |

**Optimistic update pattern for favorites (AC 36–37):**
1. On click: immediately update `favoriteIds` in the store (add or remove).
2. Issue the API call.
3. On success: no further action needed.
4. On failure: revert the store update and display a toast error.

---

## 5. Task List per Agent

### Backend-dev

- [ ] Run migration `V15__add_trainer_discovery_columns.sql` (Section 1).
      Verify: `experience_years` and `profile_photo_url` columns present on `trainers`;
      `user_trainer_favorites` table present with correct PK and FKs.
- [ ] Modify `domain/Trainer.kt` — add `experienceYears: Int? = null` and
      `profilePhotoUrl: String? = null` fields (Section 3 modified files).
- [ ] Modify `dto/TrainerRequest.kt` — add optional `experienceYears: Int?` and
      `profilePhotoUrl: String?` fields so Admin Scheduler can populate them (Section 3).
- [ ] Create `domain/UserTrainerFavorite.kt` with `UserTrainerFavoriteId` composite key class
      (Section 3 — class spec).
- [ ] Create `repository/UserTrainerFavoriteRepository.kt` with all methods in Section 3.
- [ ] Add `findByIdAndDeletedAtIsNull(id: UUID): Trainer?` to `repository/TrainerRepository.kt`.
- [ ] Add `countScheduledClassesForTrainers` native query to `repository/ClassInstanceRepository.kt`
      (Section 3 — N+1 avoidance).
- [ ] Add `findScheduledDayHoursByTrainer` native query to `repository/ClassInstanceRepository.kt`
      (Section 3 — availability preview query).
- [ ] Add specialization filter query `findBySpecializations` to `repository/TrainerRepository.kt`
      (Section 3).
- [ ] Create `service/TrainerDiscoveryService.kt` implementing `listTrainers`,
      `getFavoriteTrainers`, and `getTrainerProfile` (Section 3). Sort validation, N+1
      avoidance, and availability preview computation are all in this service.
- [ ] Create `service/TrainerFavoriteService.kt` implementing `addFavorite` and
      `removeFavorite` with membership gate (Section 3).
- [ ] Add `InvalidSortFieldException`, `AlreadyFavoritedException`, `FavoriteNotFoundException`,
      `MembershipRequiredException` exception classes (Section 3 — exception classes).
- [ ] Add handlers for the four new exceptions to
      `controller/GlobalExceptionHandler.kt` (Section 3 — GlobalExceptionHandler additions).
      Confirm `TrainerNotFoundException` already maps to `404 TRAINER_NOT_FOUND`; add if missing.
- [ ] Create `controller/TrainerDiscoveryController.kt` with `/favorites` mapped BEFORE `/{id}`
      (Section 3 — controller spec).
- [ ] Create `controller/TrainerFavoriteController.kt` (Section 3 — controller spec).
- [ ] Write unit tests for `TrainerDiscoveryService`:
      - Happy path: list with no filters, list with specialization filter, profile with
        availability, profile with no classes (all-empty preview).
      - Sort validation: valid sort fields pass, invalid field throws `InvalidSortFieldException`.
      - Availability preview: correct block assignment for MORNING/AFTERNOON/EVENING hours;
        hours outside blocks are ignored; all 7 day keys present even with zero classes.
- [ ] Write unit tests for `TrainerFavoriteService`:
      - Happy path: add favorite, remove favorite.
      - No active membership → `MembershipRequiredException`.
      - Trainer not found → `TrainerNotFoundException`.
      - Duplicate favorite → `AlreadyFavoritedException`.
      - Remove non-existent favorite → `FavoriteNotFoundException`.

### Frontend-dev

- [ ] Create `frontend/src/types/trainer.ts` with all types from Section 4.
- [ ] Create `frontend/src/api/trainers.ts` with all API functions from Section 4.
- [ ] Create `frontend/src/store/trainerStore.ts` with the Zustand store from Section 4.
- [ ] Create `frontend/src/utils/trainerPhoto.ts` utility.
- [ ] Build `FavoriteButton.tsx` — renders heart icon; disabled state + tooltip for Guests;
      loading spinner during API call.
- [ ] Build `TrainerCard.tsx` — photo/avatar, full name, up to 3 specialization tags with
      "+N more" overflow label, experience years (omit if null), `FavoriteButton`.
- [ ] Build `TrainerCardSkeleton.tsx` — same dimensions as `TrainerCard`, gray pulse animation.
- [ ] Build `SpecializationFilterPanel.tsx` — multi-select list of distinct specializations
      derived from the current trainer data; selecting triggers re-fetch (not full page reload).
- [ ] Build `SortDropdown.tsx` — four options per AC 28: "Name A-Z", "Name Z-A",
      "Most Experienced", "Least Experienced"; maps to `SortOption` type.
- [ ] Build `AvailabilityGrid.tsx` — 7 columns (Mon–Sun) × 3 rows (Morning/Afternoon/Evening);
      filled cell = trainer active in that block; empty cell = no classes.
- [ ] Build `TrainerListPage.tsx` at route `/trainers`:
      - Skeleton placeholders while loading (AC 29).
      - Error banner with Retry button (AC 30).
      - Empty state "No trainers match your filters." + Clear Filters button (AC 31).
      - `SpecializationFilterPanel` + `SortDropdown`.
      - Paginated grid of `TrainerCard` components.
- [ ] Build `TrainerProfilePage.tsx` at route `/trainers/:id`:
      - Full-size photo or placeholder avatar.
      - Bio (or "No bio available").
      - Specialization tags, experience years (or "Not specified").
      - Class count, `FavoriteButton`, `AvailabilityGrid`.
      - 404 message "Trainer not found." with link back to list (AC 34).
- [ ] Build `TrainerFavoritesPage.tsx` at route `/trainers/favorites`:
      - Redirect Guests to the membership purchase page (AC 38).
      - Empty state "You have no saved trainers yet." + link to trainer list.
      - Same paginated grid as `TrainerListPage` (no specialization filter; sort supported).
- [ ] Register routes in the React Router config: `/trainers/favorites` BEFORE `/trainers/:id`.
- [ ] Handle all API error codes listed in the Frontend Error Handling table above.
- [ ] Implement optimistic update for FavoriteButton with revert-on-failure and error toast.
- [ ] Add "My Favorites" nav link visible only to Members (hidden for Guests).

---

## 6. Risks & Notes

### Assumptions Made (resolved Open Questions)

**Q1 — Experience years:** `experience_years INT NULL` added to `trainers` table via V15.
Self-reported / admin-entered. Represents years as a professional trainer (not years at this
gym). Negative values rejected by a CHECK constraint.

**Q2 — Specialization taxonomy:** Kept as free-text `TEXT[]` (`specialisations` column).
Filtering uses LOWER() normalization at query time. The filter panel UI deduplicates options
client-side using case-insensitive comparison. If two trainers have "yoga" and "Yoga"
respectively, the panel shows one option and the filter returns both trainers.

**Q3 — Guest favorites gate:** Hard 403 gate. No localStorage fallback. Response body:
`{ "error": "Active membership required", "code": "MEMBERSHIP_REQUIRED" }`.

**Q4 — Availability preview:** Derived entirely from `class_instances` at query time.
"SCHEDULED" means `deleted_at IS NULL AND scheduled_at > NOW()` (the `class_instances`
table has no explicit `status` column). Empty array returned per day if no classes exist.

**Q5 — Profile photo:** `profile_photo_url TEXT NULL` column added to `trainers` in V15.
The existing `photo_data BYTEA` / `photo_mime_type` mechanism is retained for backward
compatibility. Server-side resolution priority: `profile_photo_url` (if non-null) →
`/api/v1/trainers/{id}/photo` URL (if `photo_data` is non-null) → null. Frontend uses a
placeholder avatar when the resolved URL is null.

### Known Risks

1. **`TO_CHAR(..., 'DAY')` locale sensitivity:** PostgreSQL's `TO_CHAR` day names depend
   on the server's `lc_time` locale. If the DB locale is not English, day names may not
   match the expected `MONDAY`..`SUNDAY` strings. Mitigation: use
   `EXTRACT(DOW FROM ci.scheduled_at AT TIME ZONE 'UTC')` (returns 0=Sunday..6=Saturday)
   and map to `DayOfWeek` enum in the service layer instead of relying on string names.
   Backend-dev should use the DOW integer approach rather than TO_CHAR for safety.

2. **Specialization filter + pagination count query performance:** Spring Data JPA's
   `Page<T>` runs a separate COUNT query for `totalElements`. With large datasets and
   `unnest`/`IN` predicates on an array column, this can be slow. Mitigate with the
   GIN index added in V15 if volume exceeds ~10 000 trainer rows (unlikely for a gym
   app but worth noting). For v1 the partial index on `deleted_at IS NULL` rows is
   sufficient.

3. **`/trainers/favorites` routing collision:** Both backend and frontend must register the
   `/favorites` sub-path BEFORE the `/{id}` dynamic path. Documented explicitly in both
   controller and frontend router sections.

4. **Soft-delete and favorites consistency:** If a trainer is soft-deleted (`deleted_at`
   set), their `user_trainer_favorites` rows are NOT removed (cascade only fires on hard
   delete). The list and profile endpoints filter by `deleted_at IS NULL`, so soft-deleted
   trainers will silently disappear from the favorites list response without an error.
   This is the intended behavior per the existing soft-delete pattern in the codebase.

5. **`isFavorited` for users with no favorites history:** The batch query in
   `UserTrainerFavoriteRepository.findFavoritedTrainerIds` returns an empty set for users
   with no favorites rows, so `isFavorited` will be `false` for all trainers — correct.

6. **Postgres MCP unavailable during schema inspection:** The Postgres MCP returned an
   authentication error (`password authentication failed for user "gymflow_readonly"`).
   Schema was reconstructed from Flyway migration files on disk. All column names and types
   stated in this SDD are sourced from the authoritative migration SQL files (V8, V11, V12).
   If the live schema has diverged from the migration files (e.g., a manual `ALTER TABLE`
   was run outside Flyway), backend-dev should verify with `\d trainers` before applying V15.

---

## 7. Implementation Decisions (post-audit)

The following decisions were made during the audit gap-fix pass (2026-04-05) and were not
documented in the original SDD.

### AC 38 — Guest redirect target is `/memberships`

`TrainerFavoritesPage.tsx` redirects non-Member users to `/memberships`, not `/plans`.
The design spec (Flow 9 and the `My Favorites` screen note) explicitly states: *"If the Guest
navigates directly to `/trainers/favorites`, they are redirected to `/memberships`."*
The prior implementation redirected to `/plans`, contradicting the design spec.

### AC 3 — Pagination envelope field: `number` instead of `page`

The SDD sample JSON in Section 2 (`GET /api/v1/trainers`) shows `"page": 0` in the
response envelope. The actual backend uses Spring Data's `Page<T>` serialized directly,
which produces `"number": 0` (Spring Data's native field name for the current page index).

**Decision:** Accept `number` as the canonical field name. The frontend TypeScript type
`PaginatedTrainerDiscoveryResponse` uses `number: number` to match the actual API response.
The SDD sample JSON is aspirational and diverges from Spring Data's native output.
Changing the field to `page` would require a custom response wrapper — a higher-risk
refactor with no user-facing benefit. Both the backend and frontend are internally consistent
using `number`.

### `parseSortForNative` vs `parseSortForEntity` branching

`TrainerDiscoveryService` contains two sort-parsing helpers:

- **`parseSortForEntity`** — used when no `specialization` filter is active. The query runs
  as a JPQL entity query (`Page<Trainer>`). Spring Data translates the `Sort` into SQL
  automatically, including `NULLS LAST` via `Sort.Order.nullsLast()`.

- **`parseSortForNative`** — used when a `specialization` filter is active. The query runs
  as a native SQL query (required for the `unnest()` array predicate). `NULLS LAST` is
  appended directly to the ORDER BY clause in the SQL string because Spring Data does not
  guarantee `NULLS LAST` propagation for native queries on all dialects.

Callers in the service select the helper based on whether `specializations` is non-empty.
This branching is internal to the service and not visible to controllers or the frontend.

### `getDistinctSpecializations` — client-side strategy with 200-trainer cap

No `/api/v1/trainers/specializations` endpoint exists. The function
`getDistinctSpecializations()` in `frontend/src/api/trainerDiscovery.ts` fetches the first
200 trainers sorted A–Z and derives distinct specializations entirely client-side.

**Rationale:** Adding a backend endpoint was deferred to avoid scope creep on the initial
delivery. For the expected gym scale (fewer than 200 trainers), the 200-trainer cap is
sufficient.

**Known limitation:** If the gym grows beyond 200 trainers, specializations from page 2+
will be silently omitted from the filter panel. The mitigation is to add a dedicated
`GET /api/v1/trainers/specializations` endpoint that queries `SELECT DISTINCT
unnest(specialisations) FROM trainers WHERE deleted_at IS NULL` and returns a sorted
string array. This is tracked as a tech debt item.
