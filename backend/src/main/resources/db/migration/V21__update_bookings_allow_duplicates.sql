-- Drop the partial unique index that prevented a user from holding more than one
-- CONFIRMED booking on the same class instance. The PRD explicitly removes this
-- restriction: a member may hold multiple confirmed bookings for the same class.
--
-- Also adds two indexes to support the new admin read queries introduced in this
-- feature. Both are non-unique and safe to add without data changes.

DROP INDEX IF EXISTS uidx_bookings_one_confirmed_per_user_class;

-- Supports GET /api/v1/admin/users/{userId}/bookings:
-- fetches all bookings for a specific user across class instances,
-- filtered optionally by status, ordered by scheduled_at.
-- The join is bookings.class_id -> class_instances.id, so the leading column
-- on bookings is user_id; status is added for the filter push-down.
CREATE INDEX IF NOT EXISTS idx_bookings_user_id_class_id
  ON bookings (user_id, class_id);

-- Supports GET /api/v1/admin/classes/{classId}/attendees:
-- fetches all CONFIRMED bookings for a specific class instance.
-- idx_bookings_class_id_status already exists from V20 and covers this query;
-- no additional index is needed here.
-- (No-op section — kept as documentation that V20 already covers this access pattern.)
