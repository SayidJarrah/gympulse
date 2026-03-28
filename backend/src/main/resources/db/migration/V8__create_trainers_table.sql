CREATE TABLE trainers (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name      VARCHAR(100)  NOT NULL,
  last_name       VARCHAR(100)  NOT NULL,
  email           VARCHAR(255)  NOT NULL,
  phone           VARCHAR(30),
  bio             VARCHAR(1000),
  specialisations TEXT[]        NOT NULL DEFAULT '{}',
  photo_data      BYTEA,
  photo_mime_type VARCHAR(50),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT uq_trainers_email UNIQUE (email),
  CONSTRAINT chk_trainers_bio_length CHECK (char_length(bio) <= 1000),
  CONSTRAINT chk_trainers_photo_consistency
    CHECK (
      (photo_data IS NULL AND photo_mime_type IS NULL) OR
      (photo_data IS NOT NULL AND photo_mime_type IS NOT NULL)
    )
);

CREATE INDEX idx_trainers_last_name ON trainers (last_name);
CREATE INDEX idx_trainers_email     ON trainers (email);
CREATE INDEX idx_trainers_deleted_at ON trainers (deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_trainers_updated_at
  BEFORE UPDATE ON trainers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
