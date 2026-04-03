ALTER TABLE user_profiles
  ADD COLUMN profile_photo_data BYTEA,
  ADD COLUMN profile_photo_mime_type VARCHAR(50);

ALTER TABLE user_profiles
  ADD CONSTRAINT chk_user_profiles_profile_photo_consistency
    CHECK (
      (profile_photo_data IS NULL AND profile_photo_mime_type IS NULL) OR
      (profile_photo_data IS NOT NULL AND profile_photo_mime_type IS NOT NULL)
    );

ALTER TABLE rooms
  ADD COLUMN photo_data BYTEA,
  ADD COLUMN photo_mime_type VARCHAR(50);

ALTER TABLE rooms
  ADD CONSTRAINT chk_rooms_photo_consistency
    CHECK (
      (photo_data IS NULL AND photo_mime_type IS NULL) OR
      (photo_data IS NOT NULL AND photo_mime_type IS NOT NULL)
    );

ALTER TABLE class_templates
  ADD COLUMN photo_data BYTEA,
  ADD COLUMN photo_mime_type VARCHAR(50);

ALTER TABLE class_templates
  ADD CONSTRAINT chk_class_templates_photo_consistency
    CHECK (
      (photo_data IS NULL AND photo_mime_type IS NULL) OR
      (photo_data IS NOT NULL AND photo_mime_type IS NOT NULL)
    );
