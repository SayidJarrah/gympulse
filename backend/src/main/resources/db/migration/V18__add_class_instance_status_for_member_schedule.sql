ALTER TABLE class_instances
  ADD COLUMN status VARCHAR(10);

UPDATE class_instances
SET status = 'SCHEDULED'
WHERE status IS NULL;

ALTER TABLE class_instances
  ALTER COLUMN status SET DEFAULT 'SCHEDULED';

ALTER TABLE class_instances
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE class_instances
  ADD CONSTRAINT chk_class_instances_status
    CHECK (status IN ('SCHEDULED', 'CANCELLED', 'COMPLETED'));

CREATE INDEX idx_class_instances_visible_group_schedule
  ON class_instances (scheduled_at)
  WHERE deleted_at IS NULL
    AND type = 'GROUP'
    AND status = 'SCHEDULED';

CREATE INDEX idx_class_templates_room_id
  ON class_templates (room_id)
  WHERE room_id IS NOT NULL;
