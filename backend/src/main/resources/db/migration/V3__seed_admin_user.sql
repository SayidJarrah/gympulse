-- Password below is the bcrypt hash (cost 10) of the value in ADMIN_SEED_PASSWORD.
-- Replace the hash before deploying if a different seed password is required.
-- The hash shown here corresponds to the placeholder value "Admin@1234".

INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@gymflow.local',
  '$2a$10$7EqJtq98hPqEX7fNZaFWoOa4Z1GpSgaFjxuqFkEqLzYmI2lHvk3yS',
  'ADMIN',
  NOW(),
  NOW()
);
