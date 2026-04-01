-- V17__seed_qa_reference_data.sql

WITH seeded_plans (
  id,
  name,
  description,
  price_in_cents,
  duration_days,
  status,
  max_bookings_per_month
) AS (
  VALUES
    (
      '22222222-2222-2222-2222-222222222201'::uuid,
      'Starter Monthly',
      'Entry-level access with a limited monthly booking allowance.',
      3900,
      30,
      'ACTIVE',
      8
    ),
    (
      '22222222-2222-2222-2222-222222222202'::uuid,
      'Standard Monthly',
      'Balanced monthly plan for regular class attendance.',
      5900,
      30,
      'ACTIVE',
      16
    ),
    (
      '22222222-2222-2222-2222-222222222203'::uuid,
      'Unlimited Monthly',
      'Unlimited class bookings with full schedule access.',
      7900,
      30,
      'ACTIVE',
      0
    ),
    (
      '22222222-2222-2222-2222-222222222204'::uuid,
      'Quarterly Saver',
      'Prepay for 3 months and save on the monthly rate.',
      16500,
      90,
      'ACTIVE',
      48
    ),
    (
      '22222222-2222-2222-2222-222222222205'::uuid,
      'Annual Unlimited',
      'Best value annual plan with unlimited bookings.',
      69900,
      365,
      'ACTIVE',
      0
    ),
    (
      '22222222-2222-2222-2222-222222222206'::uuid,
      'Off-Peak Monthly',
      'Discounted plan for midday and early afternoon bookings.',
      3500,
      30,
      'ACTIVE',
      8
    ),
    (
      '22222222-2222-2222-2222-222222222207'::uuid,
      'Student Flex',
      'Flexible plan for students with capped monthly bookings.',
      3200,
      30,
      'ACTIVE',
      10
    ),
    (
      '22222222-2222-2222-2222-222222222208'::uuid,
      'Family Duo',
      'Shared plan intended for two household members.',
      9900,
      30,
      'ACTIVE',
      20
    ),
    (
      '22222222-2222-2222-2222-222222222209'::uuid,
      'Recovery & Wellness',
      'Lower intensity plan focused on mobility, yoga, and recovery.',
      4500,
      30,
      'ACTIVE',
      8
    ),
    (
      '22222222-2222-2222-2222-222222222210'::uuid,
      'Trial Week',
      'Short-term trial plan for new members.',
      1500,
      7,
      'ACTIVE',
      2
    )
)
INSERT INTO membership_plans (
  id,
  name,
  description,
  price_in_cents,
  duration_days,
  status,
  max_bookings_per_month
)
SELECT
  sp.id,
  sp.name,
  sp.description,
  sp.price_in_cents,
  sp.duration_days,
  sp.status,
  sp.max_bookings_per_month
FROM seeded_plans AS sp
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_in_cents = EXCLUDED.price_in_cents,
  duration_days = EXCLUDED.duration_days,
  status = EXCLUDED.status,
  max_bookings_per_month = EXCLUDED.max_bookings_per_month;

WITH seeded_templates (
  id,
  name,
  description,
  category,
  default_duration_min,
  default_capacity,
  difficulty
) AS (
  VALUES
    (
      '33333333-3333-3333-3333-333333333301'::uuid,
      'Sunrise Stretch',
      'Gentle flexibility and mobility class to start the day.',
      'Flexibility',
      45,
      18,
      'Beginner'
    ),
    (
      '33333333-3333-3333-3333-333333333302'::uuid,
      'Power Yoga',
      'Dynamic vinyasa flow with strength and balance sequences.',
      'Mind & Body',
      60,
      20,
      'Intermediate'
    ),
    (
      '33333333-3333-3333-3333-333333333303'::uuid,
      'Functional Circuit',
      'Timed stations focused on full-body functional movement.',
      'Functional',
      50,
      24,
      'All Levels'
    ),
    (
      '33333333-3333-3333-3333-333333333304'::uuid,
      'Boxing Fundamentals',
      'Skill-based boxing combinations and footwork drills.',
      'Combat',
      55,
      22,
      'Beginner'
    ),
    (
      '33333333-3333-3333-3333-333333333305'::uuid,
      'Dance Cardio Blast',
      'High-energy dance workout with simple choreography.',
      'Dance',
      45,
      30,
      'All Levels'
    ),
    (
      '33333333-3333-3333-3333-333333333306'::uuid,
      'Aqua Flow',
      'Low-impact pool class focused on joint-friendly conditioning.',
      'Aqua',
      40,
      16,
      'Beginner'
    ),
    (
      '33333333-3333-3333-3333-333333333307'::uuid,
      'Cycle Endurance',
      'Longer ride format that builds aerobic capacity.',
      'Cycling',
      60,
      28,
      'Intermediate'
    ),
    (
      '33333333-3333-3333-3333-333333333308'::uuid,
      'Core Ignite',
      'Targeted core strength and stability training.',
      'Strength',
      40,
      20,
      'All Levels'
    ),
    (
      '33333333-3333-3333-3333-333333333309'::uuid,
      'Meditation Reset',
      'Guided breathwork and meditation for recovery and focus.',
      'Wellness',
      30,
      25,
      'Beginner'
    ),
    (
      '33333333-3333-3333-3333-333333333310'::uuid,
      'Mobility Lab',
      'Joint mobility and movement prep for better training quality.',
      'Flexibility',
      50,
      18,
      'All Levels'
    )
)
INSERT INTO class_templates (
  id,
  name,
  description,
  category,
  default_duration_min,
  default_capacity,
  difficulty,
  room_id,
  is_seeded
)
SELECT
  st.id,
  st.name,
  st.description,
  st.category,
  st.default_duration_min,
  st.default_capacity,
  st.difficulty,
  NULL,
  TRUE
FROM seeded_templates AS st
ON CONFLICT (name) DO UPDATE
SET
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  default_duration_min = EXCLUDED.default_duration_min,
  default_capacity = EXCLUDED.default_capacity,
  difficulty = EXCLUDED.difficulty,
  is_seeded = TRUE;

WITH seeded_users (
  id,
  email,
  password_hash,
  role
) AS (
  VALUES
    (
      '44444444-4444-4444-4444-444444444401'::uuid,
      'qa.user01@gymflow.local',
      '$2a$10$7EqJtq98hPqEX7fNZaFWoOa4Z1GpSgaFjxuqFkEqLzYmI2lHvk3yS',
      'USER'
    ),
    (
      '44444444-4444-4444-4444-444444444402'::uuid,
      'qa.user02@gymflow.local',
      '$2a$10$7EqJtq98hPqEX7fNZaFWoOa4Z1GpSgaFjxuqFkEqLzYmI2lHvk3yS',
      'USER'
    ),
    (
      '44444444-4444-4444-4444-444444444403'::uuid,
      'qa.user03@gymflow.local',
      '$2a$10$7EqJtq98hPqEX7fNZaFWoOa4Z1GpSgaFjxuqFkEqLzYmI2lHvk3yS',
      'USER'
    ),
    (
      '44444444-4444-4444-4444-444444444404'::uuid,
      'qa.user04@gymflow.local',
      '$2a$10$7EqJtq98hPqEX7fNZaFWoOa4Z1GpSgaFjxuqFkEqLzYmI2lHvk3yS',
      'USER'
    ),
    (
      '44444444-4444-4444-4444-444444444405'::uuid,
      'qa.user05@gymflow.local',
      '$2a$10$7EqJtq98hPqEX7fNZaFWoOa4Z1GpSgaFjxuqFkEqLzYmI2lHvk3yS',
      'USER'
    ),
    (
      '44444444-4444-4444-4444-444444444406'::uuid,
      'qa.user06@gymflow.local',
      '$2a$10$7EqJtq98hPqEX7fNZaFWoOa4Z1GpSgaFjxuqFkEqLzYmI2lHvk3yS',
      'USER'
    ),
    (
      '44444444-4444-4444-4444-444444444407'::uuid,
      'qa.user07@gymflow.local',
      '$2a$10$7EqJtq98hPqEX7fNZaFWoOa4Z1GpSgaFjxuqFkEqLzYmI2lHvk3yS',
      'USER'
    ),
    (
      '44444444-4444-4444-4444-444444444408'::uuid,
      'qa.user08@gymflow.local',
      '$2a$10$7EqJtq98hPqEX7fNZaFWoOa4Z1GpSgaFjxuqFkEqLzYmI2lHvk3yS',
      'USER'
    ),
    (
      '44444444-4444-4444-4444-444444444409'::uuid,
      'qa.user09@gymflow.local',
      '$2a$10$7EqJtq98hPqEX7fNZaFWoOa4Z1GpSgaFjxuqFkEqLzYmI2lHvk3yS',
      'USER'
    ),
    (
      '44444444-4444-4444-4444-444444444410'::uuid,
      'qa.user10@gymflow.local',
      '$2a$10$7EqJtq98hPqEX7fNZaFWoOa4Z1GpSgaFjxuqFkEqLzYmI2lHvk3yS',
      'USER'
    )
)
INSERT INTO users (
  id,
  email,
  password_hash,
  role
)
SELECT
  su.id,
  su.email,
  su.password_hash,
  su.role
FROM seeded_users AS su
ON CONFLICT (email) DO UPDATE
SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  deleted_at = NULL;

WITH seeded_profiles (
  email,
  first_name,
  last_name,
  phone,
  date_of_birth,
  fitness_goals,
  preferred_class_types
) AS (
  VALUES
    (
      'qa.user01@gymflow.local',
      'Avery',
      'West',
      '+14155551001',
      DATE '1993-02-10',
      '["Build strength","Improve posture"]'::jsonb,
      '["Strength","Mind & Body"]'::jsonb
    ),
    (
      'qa.user02@gymflow.local',
      'Jordan',
      'Reed',
      '+14155551002',
      DATE '1988-11-05',
      '["Increase endurance","Lose weight"]'::jsonb,
      '["Cardio","Cycling"]'::jsonb
    ),
    (
      'qa.user03@gymflow.local',
      'Casey',
      'Nguyen',
      '+14155551003',
      DATE '1996-07-19',
      '["Improve flexibility","Reduce stress"]'::jsonb,
      '["Flexibility","Wellness"]'::jsonb
    ),
    (
      'qa.user04@gymflow.local',
      'Taylor',
      'Diaz',
      '+14155551004',
      DATE '1990-03-24',
      '["Build muscle","Improve balance"]'::jsonb,
      '["Strength","Functional"]'::jsonb
    ),
    (
      'qa.user05@gymflow.local',
      'Morgan',
      'Patel',
      '+14155551005',
      DATE '1992-12-02',
      '["Increase energy","Stay consistent"]'::jsonb,
      '["Cardio","Dance"]'::jsonb
    ),
    (
      'qa.user06@gymflow.local',
      'Riley',
      'Chen',
      '+14155551006',
      DATE '1985-09-14',
      '["Recover from injury","Improve mobility"]'::jsonb,
      '["Wellness","Flexibility"]'::jsonb
    ),
    (
      'qa.user07@gymflow.local',
      'Quinn',
      'Lopez',
      '+14155551007',
      DATE '1998-01-29',
      '["Improve athleticism","Build power"]'::jsonb,
      '["Functional","Strength"]'::jsonb
    ),
    (
      'qa.user08@gymflow.local',
      'Sydney',
      'Foster',
      '+14155551008',
      DATE '1994-05-11',
      '["Stay active","Reduce stress"]'::jsonb,
      '["Mind & Body","Wellness"]'::jsonb
    ),
    (
      'qa.user09@gymflow.local',
      'Parker',
      'Singh',
      '+14155551009',
      DATE '1989-08-30',
      '["Increase stamina","Improve speed"]'::jsonb,
      '["Cardio","Combat"]'::jsonb
    ),
    (
      'qa.user10@gymflow.local',
      'Drew',
      'Santos',
      '+14155551010',
      DATE '1991-06-08',
      '["Build core strength","Improve flexibility"]'::jsonb,
      '["Strength","Flexibility"]'::jsonb
    )
)
INSERT INTO user_profiles (
  user_id,
  first_name,
  last_name,
  phone,
  date_of_birth,
  fitness_goals,
  preferred_class_types
)
SELECT
  u.id,
  sp.first_name,
  sp.last_name,
  sp.phone,
  sp.date_of_birth,
  sp.fitness_goals,
  sp.preferred_class_types
FROM seeded_profiles AS sp
JOIN users AS u
  ON u.email = sp.email
ON CONFLICT (user_id) DO UPDATE
SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone = EXCLUDED.phone,
  date_of_birth = EXCLUDED.date_of_birth,
  fitness_goals = EXCLUDED.fitness_goals,
  preferred_class_types = EXCLUDED.preferred_class_types,
  deleted_at = NULL;
