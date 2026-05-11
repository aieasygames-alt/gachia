-- Migration: 0002_better_auth_schema
-- Recreate auth tables to match Better Auth expected schema

-- Drop old tables and indexes
DROP INDEX IF EXISTS idx_sessions_user;
DROP INDEX IF EXISTS idx_sessions_token;
DROP INDEX IF EXISTS idx_accounts_user;
DROP TABLE IF EXISTS verifications;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

-- Users (Better Auth managed)
CREATE TABLE user (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  email_verified INTEGER DEFAULT 0,
  image TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Sessions (Better Auth managed)
CREATE TABLE session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id),
  token TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Accounts (Better Auth managed, OAuth)
CREATE TABLE account (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id),
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

-- Verifications (Better Auth managed)
CREATE TABLE verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER,
  updated_at INTEGER
);

-- Recreate indexes for new table names
CREATE INDEX idx_session_user ON session(user_id);
CREATE INDEX idx_session_token ON session(token);
CREATE INDEX idx_account_user ON account(user_id);

-- Drop and recreate app tables that reference user table
DROP INDEX IF EXISTS idx_favorites_user;
DROP INDEX IF EXISTS idx_favorites_user_game;
DROP INDEX IF EXISTS idx_characters_user_game;
DROP INDEX IF EXISTS idx_builds_user;
DROP INDEX IF EXISTS idx_builds_character;
DROP TABLE IF EXISTS user_favorites;
DROP TABLE IF EXISTS user_characters;
DROP TABLE IF EXISTS shared_builds;

-- User Favorites
CREATE TABLE user_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES user(id),
  game_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(user_id, game_id, character_id)
);

-- User Characters (Character Box)
CREATE TABLE user_characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES user(id),
  game_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  constellation INTEGER DEFAULT 0,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(user_id, game_id, character_id)
);

-- Shared Builds
CREATE TABLE shared_builds (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES user(id),
  game_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  build_data TEXT NOT NULL,
  view_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER
);

-- App table indexes
CREATE INDEX idx_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_favorites_user_game ON user_favorites(user_id, game_id);
CREATE INDEX idx_characters_user_game ON user_characters(user_id, game_id);
CREATE INDEX idx_builds_user ON shared_builds(user_id);
CREATE INDEX idx_builds_character ON shared_builds(game_id, character_id);
