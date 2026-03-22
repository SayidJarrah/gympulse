-- The bcrypt hash in V3 was incorrect and did not match the documented seed
-- password "Admin@1234". This migration corrects it.
-- Hash below is bcrypt cost-10 of "Admin@1234".
UPDATE users
SET password_hash = '$2b$10$OQH4cV23NXzwprPHn87xt.iYov1OeBVIyqkQLdn3z484BGPn4/Bky'
WHERE email = 'admin@gymflow.local';
