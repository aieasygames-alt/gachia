-- Migration: 0006_atomic_rate_limits
-- One counter per IP/route key is required by the atomic UPSERT limiter.

DELETE FROM rate_limits
WHERE id NOT IN (
  SELECT MAX(id)
  FROM rate_limits
  GROUP BY key
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_key_unique ON rate_limits(key);
