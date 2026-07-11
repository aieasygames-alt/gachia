-- Migration: 0005_safe_better_auth_migration
--
-- Migration 0002 already moved Better Auth to the singular table names.
-- Keep this migration additive and idempotent so both fresh databases and
-- databases that have already applied 0002 can advance safely.

CREATE INDEX IF NOT EXISTS idx_session_user ON session(user_id);
CREATE INDEX IF NOT EXISTS idx_session_token ON session(token);
CREATE INDEX IF NOT EXISTS idx_account_user ON account(user_id);
CREATE INDEX IF NOT EXISTS idx_account_provider ON account(account_id, provider_id);
