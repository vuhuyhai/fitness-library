-- Migration 002: Share-to-unlock, reading progress, anti-download
-- All statements are idempotent (IF NOT EXISTS / INSERT OR IGNORE).

-- Lock settings per document (admin controls; default = locked)
CREATE TABLE IF NOT EXISTS document_locks (
  doc_id        TEXT PRIMARY KEY,
  is_locked     INTEGER DEFAULT 1,
  preview_lines INTEGER DEFAULT 5,
  FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Device-level unlock records (Facebook share → unlocked on this device)
CREATE TABLE IF NOT EXISTS user_unlocks (
  doc_id      TEXT NOT NULL,
  unlocked_at TEXT NOT NULL,
  PRIMARY KEY (doc_id)
);

-- Detailed reading progress per document
CREATE TABLE IF NOT EXISTS reading_progress (
  doc_id                TEXT PRIMARY KEY,
  scroll_percent        REAL    DEFAULT 0,
  page_number           INTEGER DEFAULT 1,
  total_pages           INTEGER DEFAULT 0,
  last_read_at          TEXT,
  reading_time_seconds  INTEGER DEFAULT 0
);

-- Default share base URL setting
INSERT OR IGNORE INTO settings (key, value) VALUES ('share.base_url', 'https://fitnesslibrary.vuhai.app');
