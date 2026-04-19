-- V28__widen_user_memberships_status_for_plan_pending.sql

-- 1. Drop the existing status check constraint by name.
ALTER TABLE user_memberships
  DROP CONSTRAINT chk_user_memberships_status;

-- 2. Widen the column to fit PLAN_PENDING (12 chars).
ALTER TABLE user_memberships
  ALTER COLUMN status TYPE VARCHAR(20);

-- 3. Re-add the constraint with the new allowed value.
ALTER TABLE user_memberships
  ADD CONSTRAINT chk_user_memberships_status
    CHECK (status IN ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PLAN_PENDING'));
