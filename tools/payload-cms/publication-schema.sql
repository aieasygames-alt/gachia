-- Additive, isolated publication storage; no account or existing content changes.
CREATE TABLE IF NOT EXISTS cms_starrail_publication (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL,
  payload TEXT NOT NULL
);
