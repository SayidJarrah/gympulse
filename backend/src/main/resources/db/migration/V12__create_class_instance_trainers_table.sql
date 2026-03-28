CREATE TABLE class_instance_trainers (
  class_instance_id UUID        NOT NULL REFERENCES class_instances(id) ON DELETE CASCADE,
  trainer_id        UUID        NOT NULL REFERENCES trainers(id)        ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (class_instance_id, trainer_id)
);

CREATE INDEX idx_cit_trainer_id ON class_instance_trainers (trainer_id);
