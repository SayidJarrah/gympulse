-- e2e-seed/baseline.sql
-- Minimal reference data for the E2E stack.
-- Applied automatically by the Postgres init script on first container start
-- (mounted at /docker-entrypoint-initdb.d/02-baseline.sql).
--
-- Uses INSERT ... ON CONFLICT DO NOTHING throughout so it is safe to apply
-- against a DB that already has data (idempotent).
--
-- This seed creates ONLY reference data (plans, trainers, rooms, class templates,
-- class instances). It does NOT create any member users — tests create their own
-- users via ApiClient.registerUser().
--
-- Class instances use relative dates (current ISO week Mon–Fri) so the schedule
-- page always shows upcoming classes regardless of when the suite is run.
-- Instances are created at 09:00 and 11:00 UTC on each day.

-- ============================================================
-- Membership plans
-- ============================================================

INSERT INTO membership_plans (id, name, description, price_in_cents, duration_days, max_bookings_per_month, status)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Starter Monthly',
   'Access to all group classes, up to 8 bookings per month.',
   2999, 30, 8, 'ACTIVE'),
  ('a1000000-0000-0000-0000-000000000002', 'Unlimited Monthly',
   'Unlimited access to all classes and facilities.',
   5999, 30, 0, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Rooms
-- ============================================================

INSERT INTO rooms (id, name, capacity, description)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Studio A', 20, 'Main group fitness studio'),
  ('b1000000-0000-0000-0000-000000000002', 'Studio B', 15, 'Yoga and mind-body studio')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Trainers
-- ============================================================

INSERT INTO trainers (id, first_name, last_name, email, bio, specialisations, experience_years)
VALUES
  ('c1000000-0000-0000-0000-000000000001',
   'Alex', 'Carter', 'alex.carter@seed.gympulse.local',
   'High-energy HIIT and functional fitness coach with 8 years of experience.',
   ARRAY['HIIT', 'Functional Fitness', 'Strength'], 8),
  ('c1000000-0000-0000-0000-000000000002',
   'Jordan', 'Lee', 'jordan.lee@seed.gympulse.local',
   'Certified yoga instructor specialising in Vinyasa and mindfulness.',
   ARRAY['Yoga', 'Mind & Body', 'Flexibility'], 5),
  ('c1000000-0000-0000-0000-000000000003',
   'Sam', 'Rivera', 'sam.rivera@seed.gympulse.local',
   'Spin and cardio specialist with a background in competitive cycling.',
   ARRAY['Cycling', 'Cardio', 'Endurance'], 6)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Class templates
-- ============================================================

INSERT INTO class_templates (id, name, description, category, default_duration_min, default_capacity, difficulty, room_id, is_seeded)
VALUES
  ('d1000000-0000-0000-0000-000000000001',
   'HIIT Bootcamp',
   'High-intensity interval training for all fitness levels.',
   'Cardio', 45, 20, 'Intermediate',
   'b1000000-0000-0000-0000-000000000001', TRUE),
  ('d1000000-0000-0000-0000-000000000002',
   'Yoga Flow',
   'Vinyasa yoga session focused on breath and movement.',
   'Mind & Body', 60, 15, 'All Levels',
   'b1000000-0000-0000-0000-000000000002', TRUE),
  ('d1000000-0000-0000-0000-000000000003',
   'Spin Cycle',
   'Indoor cycling class set to energising music.',
   'Cycling', 45, 20, 'All Levels',
   'b1000000-0000-0000-0000-000000000001', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Class instances — current ISO week Mon–Fri, 09:00 and 11:00 UTC
-- ============================================================
-- date_trunc('week', NOW() AT TIME ZONE 'UTC') gives the Monday of the current ISO week.
-- Each day gets two instances (09:00 and 11:00) alternating across the three templates.

DO $$
DECLARE
  week_start TIMESTAMPTZ := date_trunc('week', NOW() AT TIME ZONE 'UTC');
  day_offset INT;
BEGIN
  FOR day_offset IN 0..4 LOOP
    -- 09:00 UTC — HIIT Bootcamp with Alex Carter
    INSERT INTO class_instances
      (id, template_id, name, type, scheduled_at, duration_min, capacity, room_id, status)
    VALUES (
      gen_random_uuid(),
      'd1000000-0000-0000-0000-000000000001',
      'HIIT Bootcamp',
      'GROUP',
      week_start + (day_offset || ' days')::INTERVAL + '09:00:00'::INTERVAL,
      45, 20,
      'b1000000-0000-0000-0000-000000000001',
      'SCHEDULED'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 11:00 UTC — Yoga Flow (Mon/Wed/Fri) or Spin Cycle (Tue/Thu)
    IF day_offset IN (0, 2, 4) THEN
      INSERT INTO class_instances
        (id, template_id, name, type, scheduled_at, duration_min, capacity, room_id, status)
      VALUES (
        gen_random_uuid(),
        'd1000000-0000-0000-0000-000000000002',
        'Yoga Flow',
        'GROUP',
        week_start + (day_offset || ' days')::INTERVAL + '11:00:00'::INTERVAL,
        60, 15,
        'b1000000-0000-0000-0000-000000000002',
        'SCHEDULED'
      )
      ON CONFLICT (id) DO NOTHING;
    ELSE
      INSERT INTO class_instances
        (id, template_id, name, type, scheduled_at, duration_min, capacity, room_id, status)
      VALUES (
        gen_random_uuid(),
        'd1000000-0000-0000-0000-000000000003',
        'Spin Cycle',
        'GROUP',
        week_start + (day_offset || ' days')::INTERVAL + '11:00:00'::INTERVAL,
        45, 20,
        'b1000000-0000-0000-0000-000000000001',
        'SCHEDULED'
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- Wire trainers to class instances
-- ============================================================
-- Assign Alex Carter to all HIIT Bootcamp instances,
-- Jordan Lee to all Yoga Flow instances,
-- Sam Rivera to all Spin Cycle instances.

INSERT INTO class_instance_trainers (class_instance_id, trainer_id)
SELECT ci.id, 'c1000000-0000-0000-0000-000000000001'
FROM class_instances ci
WHERE ci.template_id = 'd1000000-0000-0000-0000-000000000001'
ON CONFLICT (class_instance_id, trainer_id) DO NOTHING;

INSERT INTO class_instance_trainers (class_instance_id, trainer_id)
SELECT ci.id, 'c1000000-0000-0000-0000-000000000002'
FROM class_instances ci
WHERE ci.template_id = 'd1000000-0000-0000-0000-000000000002'
ON CONFLICT (class_instance_id, trainer_id) DO NOTHING;

INSERT INTO class_instance_trainers (class_instance_id, trainer_id)
SELECT ci.id, 'c1000000-0000-0000-0000-000000000003'
FROM class_instances ci
WHERE ci.template_id = 'd1000000-0000-0000-0000-000000000003'
ON CONFLICT (class_instance_id, trainer_id) DO NOTHING;
