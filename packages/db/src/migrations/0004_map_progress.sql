-- Migration: 0004_map_progress
-- Map marker collection progress sync for authenticated users

CREATE TABLE IF NOT EXISTS map_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES user(id),
  map_id TEXT NOT NULL,
  marker_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(user_id, map_id, marker_id)
);

CREATE INDEX IF NOT EXISTS idx_map_progress_user_map ON map_progress(user_id, map_id);
