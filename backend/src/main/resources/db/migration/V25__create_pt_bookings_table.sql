CREATE TABLE pt_bookings (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id   UUID         NOT NULL REFERENCES trainers(id) ON DELETE RESTRICT,
  member_id    UUID         NOT NULL REFERENCES users(id)    ON DELETE RESTRICT,
  start_at     TIMESTAMPTZ  NOT NULL,
  end_at       TIMESTAMPTZ  NOT NULL,
  room         VARCHAR(100) NOT NULL DEFAULT '',
  note         VARCHAR(500),
  status       VARCHAR(10)  NOT NULL DEFAULT 'CONFIRMED',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  CONSTRAINT chk_pt_bookings_status
    CHECK (status IN ('CONFIRMED', 'CANCELLED')),
  CONSTRAINT chk_pt_bookings_end_after_start
    CHECK (end_at > start_at),
  CONSTRAINT chk_pt_bookings_cancelled_at_consistency
    CHECK (
      (status = 'CANCELLED' AND cancelled_at IS NOT NULL) OR
      (status = 'CONFIRMED' AND cancelled_at IS NULL)
    )
);

CREATE INDEX idx_pt_bookings_trainer_status_start
  ON pt_bookings (trainer_id, status, start_at);

CREATE INDEX idx_pt_bookings_member_status_start
  ON pt_bookings (member_id, status, start_at);

CREATE INDEX idx_pt_bookings_trainer_window
  ON pt_bookings (trainer_id, start_at, end_at)
  WHERE status = 'CONFIRMED';
