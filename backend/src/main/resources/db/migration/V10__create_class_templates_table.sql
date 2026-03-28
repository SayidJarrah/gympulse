CREATE TABLE class_templates (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(100) NOT NULL,
  description          VARCHAR(500),
  category             VARCHAR(20)  NOT NULL,
  default_duration_min INTEGER      NOT NULL,
  default_capacity     INTEGER      NOT NULL,
  difficulty           VARCHAR(20)  NOT NULL,
  room_id              UUID         REFERENCES rooms(id) ON DELETE SET NULL,
  is_seeded            BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_class_templates_name UNIQUE (name),
  CONSTRAINT chk_class_templates_category
    CHECK (category IN (
      'Cardio','Strength','Flexibility','Mind & Body','Cycling',
      'Combat','Dance','Functional','Aqua','Wellness','Other')),
  CONSTRAINT chk_class_templates_difficulty
    CHECK (difficulty IN ('Beginner','Intermediate','Advanced','All Levels')),
  CONSTRAINT chk_class_templates_duration
    CHECK (default_duration_min >= 15 AND default_duration_min <= 240),
  CONSTRAINT chk_class_templates_capacity
    CHECK (default_capacity >= 1 AND default_capacity <= 500),
  CONSTRAINT chk_class_templates_name_nonempty
    CHECK (char_length(trim(name)) >= 1)
);

CREATE INDEX idx_class_templates_category   ON class_templates (category);
CREATE INDEX idx_class_templates_name       ON class_templates (name);

CREATE TRIGGER trg_class_templates_updated_at
  BEFORE UPDATE ON class_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
