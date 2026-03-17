-- Add visibility column to share_events.
-- Safe to re-run: "duplicate column name" errors are tolerated by the migration runner.
ALTER TABLE share_events ADD COLUMN visibility TEXT NOT NULL DEFAULT 'unknown';
