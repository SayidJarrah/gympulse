CREATE TABLE refresh_tokens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   VARCHAR(64) NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  invalidated  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  CONSTRAINT uq_refresh_tokens_token_hash UNIQUE (token_hash)
);

-- token_hash: UNIQUE constraint already creates a B-tree index; no separate index needed.
-- user_id: index supports FK lookups and cascade operations.
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);

-- Partial index for active (non-invalidated) tokens per user; used by cleanup and
-- "list active sessions" queries.
CREATE INDEX idx_refresh_tokens_user_id_active
    ON refresh_tokens (user_id)
    WHERE invalidated = FALSE;

-- Supports background cleanup of expired tokens.
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
