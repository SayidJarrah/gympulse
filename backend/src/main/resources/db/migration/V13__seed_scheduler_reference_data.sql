INSERT INTO class_templates (name, description, category, default_duration_min, default_capacity, difficulty, room_id, is_seeded)
VALUES
  ('HIIT Bootcamp', NULL, 'Cardio', 60, 20, 'All Levels', NULL, TRUE),
  ('Yoga Flow', NULL, 'Flexibility', 60, 15, 'All Levels', NULL, TRUE),
  ('Spin Cycle', NULL, 'Cardio', 45, 25, 'Intermediate', NULL, TRUE),
  ('Strength & Conditioning', NULL, 'Strength', 60, 12, 'Intermediate', NULL, TRUE),
  ('Pilates Core', NULL, 'Flexibility', 50, 10, 'Beginner', NULL, TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO rooms (name, capacity, description)
VALUES
  ('Studio A', 30, 'Main group fitness studio'),
  ('Studio B', 20, 'Spin and cycling studio'),
  ('Weight Room', 15, 'Strength training area')
ON CONFLICT (name) DO NOTHING;
