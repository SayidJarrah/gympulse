CREATE TABLE bookings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  class_id      UUID        NOT NULL REFERENCES class_instances(id) ON DELETE RESTRICT,
  status        VARCHAR(10) NOT NULL DEFAULT 'CONFIRMED',
  booked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  CONSTRAINT chk_bookings_status
    CHECK (status IN ('CONFIRMED', 'CANCELLED', 'ATTENDED')),
  CONSTRAINT chk_bookings_cancelled_at_consistency
    CHECK (
      (status = 'CANCELLED' AND cancelled_at IS NOT NULL) OR
      (status IN ('CONFIRMED', 'ATTENDED') AND cancelled_at IS NULL)
    ),
  CONSTRAINT chk_bookings_cancelled_after_booked
    CHECK (cancelled_at IS NULL OR cancelled_at >= booked_at)
);

CREATE INDEX idx_bookings_user_id_status_booked_at
  ON bookings (user_id, status, booked_at DESC);

CREATE INDEX idx_bookings_class_id_status
  ON bookings (class_id, status);

CREATE UNIQUE INDEX uidx_bookings_one_confirmed_per_user_class
  ON bookings (user_id, class_id)
  WHERE status = 'CONFIRMED';

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
