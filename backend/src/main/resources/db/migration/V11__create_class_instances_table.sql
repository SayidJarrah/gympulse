CREATE TABLE class_instances (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID         REFERENCES class_templates(id) ON DELETE SET NULL,
  name            VARCHAR(100) NOT NULL,
  type            VARCHAR(10)  NOT NULL DEFAULT 'GROUP',
  scheduled_at    TIMESTAMPTZ  NOT NULL,
  duration_min    INTEGER      NOT NULL,
  capacity        INTEGER      NOT NULL,
  room_id         UUID         REFERENCES rooms(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT chk_class_instances_type
    CHECK (type IN ('GROUP','PERSONAL')),
  CONSTRAINT chk_class_instances_duration
    CHECK (duration_min >= 15 AND duration_min <= 240),
  CONSTRAINT chk_class_instances_capacity
    CHECK (capacity >= 1 AND capacity <= 500),
  CONSTRAINT chk_class_instances_slot
    CHECK (EXTRACT(MINUTE FROM scheduled_at AT TIME ZONE 'UTC') IN (0, 30)),
  CONSTRAINT chk_class_instances_name_nonempty
    CHECK (char_length(trim(name)) >= 1)
);

CREATE INDEX idx_class_instances_scheduled_at ON class_instances (scheduled_at);
CREATE INDEX idx_class_instances_template_id  ON class_instances (template_id);
CREATE INDEX idx_class_instances_deleted_at   ON class_instances (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_class_instances_room_id ON class_instances (room_id) WHERE room_id IS NOT NULL;

CREATE TRIGGER trg_class_instances_updated_at
  BEFORE UPDATE ON class_instances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
