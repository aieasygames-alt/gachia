-- Migration: 0001_init
-- Initial schema for gachia-db

-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  provider TEXT DEFAULT 'credential',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Sessions (Better Auth)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Accounts (OAuth)
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
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

-- Verifications (email verification)
CREATE TABLE verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER,
  updated_at INTEGER
);

-- User Favorites
CREATE TABLE user_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  game_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(user_id, game_id, character_id)
);

-- User Characters (Character Box)
CREATE TABLE user_characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
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
  user_id TEXT REFERENCES users(id),
  game_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  build_data TEXT NOT NULL,
  view_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER
);

-- Indexes
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_favorites_user_game ON user_favorites(user_id, game_id);
CREATE INDEX idx_characters_user_game ON user_characters(user_id, game_id);
CREATE INDEX idx_builds_user ON shared_builds(user_id);
CREATE INDEX idx_builds_character ON shared_builds(game_id, character_id);
