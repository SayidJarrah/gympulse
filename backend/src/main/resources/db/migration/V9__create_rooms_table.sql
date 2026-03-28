CREATE TABLE rooms (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  capacity    INT,
  description VARCHAR(500),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_room_name UNIQUE (name),
  CONSTRAINT chk_room_capacity CHECK (capacity IS NULL OR capacity >= 1)
);

CREATE INDEX idx_rooms_name ON rooms(name);

CREATE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
