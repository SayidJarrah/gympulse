# Assumptions Applied — Scheduler (Admin)

Date: 2026-03-27

## Backend
- **Pilates Core category mapping:** "Pilates Core" is seeded with category `Strength` because "Core" is not in the allowed category enum.
- **Copy-week conflict checks:** Copy-week does not enforce trainer overlap validation; conflicts are handled in the normal edit flow.
- **CSV export multi-trainer duplication:** Instances with multiple trainers are exported as one row per trainer, which can re-import as duplicates.
- **Template seeding approach:** Default templates are seeded in application code when `class_template` count is zero (no Flyway seed migration).
- **Validation status codes:** Bean validation errors currently return HTTP 400 with `VALIDATION_ERROR` (not 422).
- **Room delete behavior:** `DELETE /rooms/{id}` immediately deletes when there are no assigned instances; the confirmation UI only appears when the API returns `ROOM_HAS_INSTANCES`.
- **Room clear via PATCH:** `roomId: null` is used to clear the room assignment; the API does not distinguish between an omitted field and `null` in the patch payload.

## Frontend
- **Room delete confirmation:** When the API deletes immediately (204), no separate confirmation step is shown.
- **Tag input constraints:** Specialisations use a tag input limited to 10 tags with 50-character max per tag.
