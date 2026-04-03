-- V15__add_trainer_discovery_columns.sql
ALTER TABLE trainers
  ADD COLUMN IF NOT EXISTS experience_years   INT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS profile_photo_url  TEXT         DEFAULT NULL;

ALTER TABLE trainers
  ADD CONSTRAINT chk_trainers_experience_years
    CHECK (experience_years IS NULL OR experience_years >= 0);

CREATE INDEX idx_trainers_experience_years
  ON trainers (experience_years NULLS LAST)
  WHERE experience_years IS NOT NULL;

CREATE TABLE user_trainer_favorites (
  user_id    UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  trainer_id UUID        NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, trainer_id)
);

CREATE INDEX idx_utf_user_id    ON user_trainer_favorites (user_id);
CREATE INDEX idx_utf_trainer_id ON user_trainer_favorites (trainer_id);
