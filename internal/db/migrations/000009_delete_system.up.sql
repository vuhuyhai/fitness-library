-- Soft delete support on documents
ALTER TABLE documents ADD COLUMN deleted_at TEXT DEFAULT NULL;
ALTER TABLE documents ADD COLUMN deleted_opts TEXT DEFAULT NULL;

-- Undo queue: 30-second grace window before hard delete
CREATE TABLE IF NOT EXISTS undo_queue (
  token      TEXT PRIMARY KEY,
  doc_id     TEXT NOT NULL,
  opts_json  TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

-- Audit log for every delete (including undone ones)
CREATE TABLE IF NOT EXISTS delete_log (
  id          TEXT PRIMARY KEY,
  doc_id      TEXT NOT NULL,
  doc_title   TEXT NOT NULL,
  deleted_by  TEXT NOT NULL DEFAULT 'admin',
  opts_json   TEXT,
  freed_bytes INTEGER NOT NULL DEFAULT 0,
  was_undone  INTEGER NOT NULL DEFAULT 0,
  deleted_at  TEXT NOT NULL
);
