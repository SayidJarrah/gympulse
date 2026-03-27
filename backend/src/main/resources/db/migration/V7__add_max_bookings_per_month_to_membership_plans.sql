-- V7__add_max_bookings_per_month_to_membership_plans.sql
--
-- Adds the max_bookings_per_month column to membership_plans.
-- This column was defined in the domain model (CLAUDE.md) but was omitted from V4.
-- It is required by the UserMembershipResponse DTO (user-membership-purchase feature)
-- which denormalises this value from the plan into the membership response.
-- Default value of 0 means "unlimited" for existing plans until they are explicitly updated.

ALTER TABLE membership_plans
  ADD COLUMN max_bookings_per_month INTEGER NOT NULL DEFAULT 0;

ALTER TABLE membership_plans
  ADD CONSTRAINT chk_membership_plans_max_bookings
    CHECK (max_bookings_per_month >= 0);
