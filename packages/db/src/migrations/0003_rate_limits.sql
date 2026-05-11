-- Migration: 0003_rate_limits
-- Rate limiting counter table

CREATE TABLE rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start INTEGER NOT NULL
);

CREATE INDEX idx_rate_limits_key ON rate_limits(key);
