CREATE TABLE user_profiles (
  user_id                 UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name              VARCHAR(50),
  last_name               VARCHAR(50),
  phone                   VARCHAR(20),
  date_of_birth           DATE,
  fitness_goals           JSONB       NOT NULL DEFAULT '[]'::jsonb,
  preferred_class_types   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ,
  CONSTRAINT chk_user_profiles_first_name
    CHECK (first_name IS NULL OR char_length(btrim(first_name)) BETWEEN 1 AND 50),
  CONSTRAINT chk_user_profiles_last_name
    CHECK (last_name IS NULL OR char_length(btrim(last_name)) BETWEEN 1 AND 50),
  CONSTRAINT chk_user_profiles_phone
    CHECK (phone IS NULL OR char_length(phone) BETWEEN 1 AND 20),
  CONSTRAINT chk_user_profiles_date_of_birth
    CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE),
  CONSTRAINT chk_user_profiles_fitness_goals_array
    CHECK (jsonb_typeof(fitness_goals) = 'array'),
  CONSTRAINT chk_user_profiles_preferred_class_types_array
    CHECK (jsonb_typeof(preferred_class_types) = 'array'),
  CONSTRAINT chk_user_profiles_fitness_goals_size
    CHECK (jsonb_array_length(fitness_goals) <= 5),
  CONSTRAINT chk_user_profiles_preferred_class_types_size
    CHECK (jsonb_array_length(preferred_class_types) <= 5)
);

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
