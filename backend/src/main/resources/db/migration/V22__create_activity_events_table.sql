-- V22__create_activity_events_table.sql
-- Creates the activity_events table that backs the landing-page live feed.

CREATE TABLE activity_events (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    kind        VARCHAR(10)  NOT NULL,
    actor_id    UUID         REFERENCES users(id) ON DELETE SET NULL,
    actor_name  VARCHAR(200) NOT NULL,
    text        VARCHAR(500) NOT NULL,
    text_public VARCHAR(500) NOT NULL,
    occurred_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_activity_events_kind
        CHECK (kind IN ('checkin', 'booking', 'pr', 'class'))
);

CREATE INDEX idx_activity_events_occurred_at
    ON activity_events (occurred_at DESC);
