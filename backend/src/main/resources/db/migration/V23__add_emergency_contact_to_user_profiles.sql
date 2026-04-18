-- V23: Add emergency contact fields to user_profiles table.
-- Both columns are nullable. The service layer enforces that either both are set or both are null.

ALTER TABLE user_profiles
    ADD COLUMN emergency_contact_name  VARCHAR(100),
    ADD COLUMN emergency_contact_phone VARCHAR(30);

ALTER TABLE user_profiles
    ADD CONSTRAINT chk_user_profiles_ec_name
        CHECK (emergency_contact_name IS NULL OR char_length(btrim(emergency_contact_name)) BETWEEN 1 AND 100),
    ADD CONSTRAINT chk_user_profiles_ec_phone
        CHECK (emergency_contact_phone IS NULL OR char_length(emergency_contact_phone) BETWEEN 1 AND 30);
