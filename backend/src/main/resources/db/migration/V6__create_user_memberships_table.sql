-- V6__create_user_memberships_table.sql

CREATE TABLE user_memberships (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID        NOT NULL REFERENCES users(id),
  plan_id                   UUID        NOT NULL REFERENCES membership_plans(id),
  status                    VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
  start_date                DATE        NOT NULL,
  end_date                  DATE        NOT NULL,
  bookings_used_this_month  INTEGER     NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at                TIMESTAMPTZ,
  CONSTRAINT chk_user_memberships_status
    CHECK (status IN ('ACTIVE', 'CANCELLED', 'EXPIRED')),
  CONSTRAINT chk_user_memberships_dates
    CHECK (end_date >= start_date),
  CONSTRAINT chk_user_memberships_bookings_used
    CHECK (bookings_used_this_month >= 0)
);

-- Composite index covers both the most common user query (filter by user_id and
-- status = 'ACTIVE' for GET /me, DELETE /me, and the partial unique index support)
-- and the most common admin query (all memberships for a given user, optionally
-- filtered by status). The composite leading column (user_id) also satisfies any
-- query on user_id alone, making a separate idx_user_memberships_user_id redundant.
CREATE INDEX idx_user_memberships_user_id_status ON user_memberships(user_id, status);

-- Supports admin list filtered by status (e.g. ?status=ACTIVE) and the active-
-- subscriber count used by MembershipPlanService.updatePlan price-change guard.
CREATE INDEX idx_user_memberships_status ON user_memberships(status);

-- Composite index covers the admin list filtered by plan
-- (GET /api/v1/admin/memberships?planId=... if added later).
CREATE INDEX idx_user_memberships_plan_id ON user_memberships(plan_id);

-- THE CRITICAL CONSTRAINT: prevents a user from ever holding two ACTIVE memberships
-- simultaneously. The partial index applies only to rows where status = 'ACTIVE', so
-- CANCELLED and EXPIRED rows do not participate and re-purchase is allowed immediately
-- after cancellation. The DB enforces this as a last-resort guard against race
-- conditions that bypass the application-layer check.
CREATE UNIQUE INDEX uidx_user_memberships_one_active_per_user
  ON user_memberships(user_id)
  WHERE status = 'ACTIVE';

CREATE TRIGGER trg_user_memberships_updated_at
  BEFORE UPDATE ON user_memberships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
