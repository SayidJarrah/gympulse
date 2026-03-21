CREATE TABLE users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(72)  NOT NULL,
  role          VARCHAR(10)  NOT NULL DEFAULT 'USER',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT chk_users_role CHECK (role IN ('USER', 'ADMIN'))
);

-- Note: the UNIQUE constraint on email already creates a B-tree index;
-- no separate CREATE INDEX on email is needed.
