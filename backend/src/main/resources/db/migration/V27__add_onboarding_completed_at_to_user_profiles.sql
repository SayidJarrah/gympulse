-- V27__add_onboarding_completed_at_to_user_profiles.sql
ALTER TABLE user_profiles
  ADD COLUMN onboarding_completed_at TIMESTAMPTZ DEFAULT NULL;
