CREATE TABLE IF NOT EXISTS term_cache (
    term       TEXT PRIMARY KEY,           -- lowercase, trimmed
    cat_id     TEXT NOT NULL DEFAULT '',
    simple     TEXT NOT NULL DEFAULT '',
    detail     TEXT NOT NULL DEFAULT '',
    example    TEXT NOT NULL DEFAULT '',
    related    TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
    is_offline INTEGER NOT NULL DEFAULT 0, -- 1 = from pre-built dictionary
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
