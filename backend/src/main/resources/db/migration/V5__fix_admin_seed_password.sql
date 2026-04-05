-- The bcrypt hash in V3 was incorrect and did not match the seed password.
-- This migration replaces it with the correct bcrypt cost-10 hash.
-- PRODUCTION NOTE: regenerate this hash with a unique password before provisioning
-- any non-local environment. The hash committed here is for local dev only.
-- Never commit the plaintext seed password.
UPDATE users
SET password_hash = '$2b$10$OQH4cV23NXzwprPHn87xt.iYov1OeBVIyqkQLdn3z484BGPn4/Bky'
WHERE email = 'admin@gymflow.local';
