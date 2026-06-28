-- Migration: 0005_safe_better_auth_migration.sql
-- Safe migration to Better Auth schema, preserving existing data
-- This replaces the destructive 0002 migration

-- Step 1: Create new tables with different names to avoid conflicts
CREATE TABLE IF NOT EXISTS user_new (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  email_verified INTEGER DEFAULT 0,
  image TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Step 2: Migrate existing user data if table exists
-- This will only do something if users table exists from 0001
INSERT INTO user_new (id, name, email, image, created_at, updated_at)
SELECT id, name, email, avatar_url, created_at, updated_at
FROM users
WHERE email IS NOT NULL;

-- Step 3: Create session_new table
CREATE TABLE IF NOT EXISTS session_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_new(id),
  token TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Step 4: Migrate existing session data
INSERT INTO session_new
SELECT id, user_id, token, expires_at, ip_address, user_agent, created_at, updated_at
FROM sessions;

-- Step 5: Create account_new table
CREATE TABLE IF NOT EXISTS account_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_new(id),
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  access_token_expires_at INTEGER,
  refresh_token_expires_at INTEGER,
  scope TEXT,
  id_token TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Step 6: Migrate existing account data
INSERT INTO account_new
SELECT id, user_id, account_id, provider_id, access_token, refresh_token,
       access_token_expires_at, refresh_token_expires_at, scope, id_token,
       created_at, updated_at
FROM accounts;

-- Step 7: Create verification_new table
CREATE TABLE IF NOT EXISTS verification_new (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER,
  updated_at INTEGER
);

-- Step 8: Migrate existing verification data
INSERT INTO verification_new
SELECT id, identifier, value, expires_at, created_at, updated_at
FROM verifications;

-- Step 9: Drop old tables (if they exist)
DROP TABLE IF EXISTS verifications;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

-- Step 10: Rename new tables to final names
ALTER TABLE user_new RENAME TO user;
ALTER TABLE session_new RENAME TO session;
ALTER TABLE account_new RENAME TO account;
ALTER TABLE verification_new RENAME TO verification;

-- Step 11: Rebuild indexes for Better Auth
CREATE INDEX IF NOT EXISTS idx_session_user ON session(user_id);
CREATE INDEX IF NOT EXISTS idx_session_token ON session(token);
CREATE INDEX IF NOT EXISTS idx_account_user ON account(user_id);
CREATE INDEX IF NOT EXISTS idx_account_provider ON account(account_id, provider_id);
