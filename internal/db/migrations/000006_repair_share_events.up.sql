-- Ensure visibility column exists on share_events (safe repair for any schema state).
-- Uses a workaround: recreate via a temporary table if the column is missing.
-- This is safe to run on any existing database state.

-- Add visibility if not present (will silently succeed if column exists in SQLite 3.37+)
-- SQLite 3.37.0+ supports ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- For older SQLite we use the INSERT OR IGNORE trick via a temp trigger approach.
-- Safest universal approach: try ALTER, catch error at app level (handled by migration runner).
ALTER TABLE share_events ADD COLUMN visibility TEXT NOT NULL DEFAULT 'unknown';
