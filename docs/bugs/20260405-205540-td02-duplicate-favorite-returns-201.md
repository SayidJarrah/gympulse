# Bug Brief: trainer-discovery — TD-02 duplicate favorite POST returns 201 instead of 409 ALREADY_FAVORITED

Date: 2026-04-05 20:55

## Failing Test
Spec: `frontend/e2e/trainer-discovery.spec.ts`
Test name: `Trainer Discovery › TD-02 duplicate favorite returns 409 ALREADY_FAVORITED`

## Failure
```
Error: expect(received).toBe(expected) // Object.is equality
Expected: 409
Received: 201

at frontend/e2e/trainer-discovery.spec.ts:253
```

## Steps to Reproduce
1. Create a trainer as admin.
2. Register a user and purchase a membership.
3. POST to `GET /api/v1/trainers/{trainerId}/favorites` (first save) — receives 201.
4. POST to the same endpoint again (duplicate) — also receives 201 instead of 409.
5. Confirmed manually via curl: three consecutive POST calls all return 201.
6. Only one row appears in the DB (`user_trainer_favorites` has PK constraint), but no error is surfaced.

## Evidence
Direct API test:
```
First POST: 201
Second POST: 201
Third POST: 201
```

DB after three calls:
```sql
SELECT COUNT(*) FROM user_trainer_favorites WHERE user_id = '...';
-- count: 1
```

The DB correctly rejects the duplicate at the PK level — only one row is stored — but the application returns 201 for all calls.

Source code — `TrainerFavoriteService.kt` lines 28–35:
```kotlin
if (userTrainerFavoriteRepository.existsByUserIdAndTrainerId(userId, trainerId)) {
    throw AlreadyFavoritedException(trainerId)
}
try {
    userTrainerFavoriteRepository.save(UserTrainerFavorite(userId = userId, trainerId = trainerId))
} catch (e: DataIntegrityViolationException) {
    throw AlreadyFavoritedException(trainerId)
}
```

Root cause hypothesis: `UserTrainerFavorite` uses `@IdClass(UserTrainerFavoriteId::class)` with a composite PK that is always populated (never null). Spring Data JPA's `SimpleJpaRepository.save()` calls `entityInformation.isNew(entity)`. For entities with non-null IDs that do not implement `Persistable`, Spring Data JPA infers the entity is "existing" (not new) and calls `entityManager.merge()` instead of `entityManager.persist()`. `merge()` performs an upsert-style operation: it loads by PK, sees the existing row from the first call, and silently returns the managed entity without throwing a `DataIntegrityViolationException`. The `existsByUserIdAndTrainerId` pre-check also returns false in a subsequent request if the transaction or persistence context cache is not flushed, though this is less likely across separate HTTP requests.

The result: the `AlreadyFavoritedException` is never thrown and the DB constraint is never violated from JPA's perspective because `merge()` handles the existing-entity case silently.

## Severity
Critical — a user can favorite the same trainer multiple times from the API perspective (each call returns success), even though the DB correctly stores only one row.

## Files to Change
(leave blank — developer fills after root cause analysis)

## Proposed Fix
(leave blank — developer fills after root cause analysis)
