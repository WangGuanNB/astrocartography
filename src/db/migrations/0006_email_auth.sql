ALTER TABLE users_astrocarto ADD COLUMN password_hash text;
ALTER TABLE users_astrocarto ADD COLUMN email_verified_at integer;

CREATE TABLE IF NOT EXISTS email_auth_tokens_astrocarto (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  email text NOT NULL,
  token_hash text NOT NULL,
  purpose text NOT NULL,
  password_hash text,
  expires_at integer NOT NULL,
  used_at integer,
  created_at integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS email_auth_tokens_hash_unique_idx
  ON email_auth_tokens_astrocarto (token_hash);

CREATE INDEX IF NOT EXISTS email_auth_tokens_email_idx
  ON email_auth_tokens_astrocarto (email, purpose);

CREATE TABLE IF NOT EXISTS email_auth_attempts_astrocarto (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  action text NOT NULL,
  attempt_key text NOT NULL,
  created_at integer NOT NULL
);

CREATE INDEX IF NOT EXISTS email_auth_attempts_key_idx
  ON email_auth_attempts_astrocarto (attempt_key, created_at);
