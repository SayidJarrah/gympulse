# Review: e2e-cleanup-fk-constraint — 2026-04-05

## Summary

Fix for `POST /api/v1/test-support/e2e/cleanup` returning 500 on FK constraint violation when
deleting `membership_plans` rows that still had `user_memberships` children.

Two files changed:
- `backend/src/main/kotlin/com/gymflow/repository/UserMembershipRepository.kt` — new `deleteAllByPlanIds`
- `backend/src/main/kotlin/com/gymflow/service/E2eTestSupportService.kt` — calls it before plan deletion

---

## Blockers (must fix before PR)

- [x] `E2eTestSupportService.kt:37-44` — User-path deletion still violates `bookings.user_id REFERENCES users(id) ON DELETE RESTRICT`. The plan-path FK was fixed but the user-path FK was not. When test users have `bookings` rows (any E2E spec that tests class booking creates them), deleting users via `userRepository.deleteAllByEmailPrefixes` will throw the same 500. Add a `bookingRepository.deleteAllByUserIds(userIds)` call before `userMembershipRepository.deleteAllByUserIds(userIds)` in the user-deletion block, mirroring the pattern now used for the plan path. `BookingRepository` currently has no bulk-delete method — one must be added in the same PR, matching the `@Modifying @Query` pattern of `deleteAllByUserIds`.
  **Fixed:** `BookingRepository.kt` now declares `@Modifying @Query("DELETE FROM Booking b WHERE b.userId IN :userIds") fun deleteAllByUserIds(...)`. `E2eTestSupportService.kt:40` calls it before `userMembershipRepository.deleteAllByUserIds(userIds)`. Full FK chain verified — no remaining RESTRICT-blocked paths.

---

## Suggestions (non-blocking)

- `E2eTestSupportService.kt:52-54` — The plan-path membership deletions are not reflected in `deletedMemberships` in the returned `E2eCleanupResponse`. The counter accumulates only memberships deleted via the user path. Capture the return value of `userMembershipRepository.deleteAllByPlanIds(planIds)` and add it to a running total so the response accurately reports all rows removed. Low value for a test-support endpoint but avoids confusing log output when debugging cleanup failures.

- `UserMembershipRepository.kt:44` — `deleteAllByPlanIds` has no `@Transactional` annotation on the repository method itself. It is safe today because the service method is `@Transactional`, but a bare call from a non-transactional context (e.g., a future test helper) would throw `javax.persistence.TransactionRequiredException`. Adding `@Transactional` directly on the method is defensive and consistent with how `deleteAllByUserIds` is declared on the same interface (line 41 — neither has it, so this is a pre-existing pattern; mentioning for visibility only).

- `E2eTestSupportService.kt:18` — Consider adding a log line at DEBUG level reporting how many rows were deleted per entity type. Test-support endpoints are hard to introspect when cleanup silently does nothing; a single structured log line would surface prefix mismatches immediately in CI output.

---

## Re-review note — 2026-04-05

FK chain audit of V1–V20 migrations confirms all RESTRICT-constrained paths are now covered:

| Table | FK target | ON DELETE | Status |
|---|---|---|---|
| `bookings` | `users(id)` | RESTRICT | Handled — `bookingRepository.deleteAllByUserIds` called first |
| `user_memberships` | `users(id)` | RESTRICT (default) | Handled — `userMembershipRepository.deleteAllByUserIds` called after bookings |
| `user_memberships` | `membership_plans(id)` | RESTRICT (default) | Handled — `userMembershipRepository.deleteAllByPlanIds` called before plan deletion |
| `refresh_tokens` | `users(id)` | CASCADE | Safe — DB handles automatically |
| `user_profiles` | `users(id)` | CASCADE | Safe — DB handles automatically |
| `user_trainer_favorites` | `users(id)` | CASCADE | Safe — DB handles automatically |

No new issues introduced by the fix. The `@Modifying @Query` is correct JPQL. No additional files need changing.

## Verdict

APPROVED

All FK constraints are properly ordered in the cleanup service. The one blocker is resolved with no regressions.
