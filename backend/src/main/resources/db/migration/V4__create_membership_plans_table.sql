CREATE TABLE membership_plans (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  description     TEXT         NOT NULL,
  price_in_cents  INTEGER      NOT NULL,
  duration_days   INTEGER      NOT NULL,
  status          VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE',
  version         INTEGER      NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_membership_plans_status
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT chk_membership_plans_price
    CHECK (price_in_cents > 0),
  CONSTRAINT chk_membership_plans_duration
    CHECK (duration_days > 0)
);

-- Supports public list endpoint filtering on status (the most common query).
CREATE INDEX idx_membership_plans_status ON membership_plans (status);

-- Supports default sort by creation time on both public and admin list endpoints.
CREATE INDEX idx_membership_plans_created_at ON membership_plans (created_at);

-- Composite index covers the combined filter + sort pattern used by both the public
-- list (WHERE status = 'ACTIVE' ORDER BY created_at DESC) and the admin filtered list
-- (WHERE status = 'INACTIVE' ORDER BY created_at DESC). Without this composite index
-- the planner must use the status index for the filter and perform a separate sort step.
-- The two single-column indexes above are retained: idx_membership_plans_status supports
-- index-only COUNT(*) WHERE status = 'ACTIVE' scans; idx_membership_plans_created_at
-- supports ORDER BY created_at DESC queries with no status filter (admin list, no filter).
CREATE INDEX idx_membership_plans_status_created_at
    ON membership_plans (status, created_at DESC);

-- Create the shared trigger function if it was not created by V2b
-- (V2b may have been added after this database was first initialised).
CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_membership_plans_updated_at
  BEFORE UPDATE ON membership_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
