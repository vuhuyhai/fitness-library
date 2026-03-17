CREATE TABLE IF NOT EXISTS share_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id     TEXT    NOT NULL,
    doc_title  TEXT    NOT NULL DEFAULT '',
    tone       TEXT    NOT NULL DEFAULT '',
    visibility TEXT    NOT NULL DEFAULT 'unknown',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_share_events_doc_id    ON share_events (doc_id);
CREATE INDEX IF NOT EXISTS idx_share_events_created_at ON share_events (created_at DESC);
