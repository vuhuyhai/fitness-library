PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- Danh mục
CREATE TABLE IF NOT EXISTS categories (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  icon      TEXT,
  color     TEXT,
  parent_id TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Tài liệu chính
CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK(type IN ('article','pdf','workout','video','note')),
  cat_id      TEXT NOT NULL,
  sub_cat_id  TEXT,
  file_path   TEXT,
  content     TEXT,
  summary     TEXT,
  cover_path  TEXT,
  tags        TEXT DEFAULT '[]',
  views       INTEGER DEFAULT 0,
  read_time   INTEGER DEFAULT 0,
  is_saved    INTEGER DEFAULT 0,
  author      TEXT DEFAULT 'Vũ Hải',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  FOREIGN KEY (cat_id) REFERENCES categories(id)
);

-- FTS5 full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  id UNINDEXED,
  title,
  content,
  summary,
  tags,
  content='documents',
  content_rowid='rowid'
);

-- Triggers đồng bộ FTS5
CREATE TRIGGER IF NOT EXISTS docs_ai AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, id, title, content, summary, tags)
  VALUES (new.rowid, new.id, new.title, new.content, new.summary, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS docs_au AFTER UPDATE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, id, title, content, summary, tags)
    VALUES('delete', old.rowid, old.id, old.title, old.content, old.summary, old.tags);
  INSERT INTO documents_fts(rowid, id, title, content, summary, tags)
    VALUES(new.rowid, new.id, new.title, new.content, new.summary, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS docs_ad AFTER DELETE ON documents BEGIN
  DELETE FROM documents_fts WHERE id = old.id;
END;

-- Giáo án tập luyện (structured)
CREATE TABLE IF NOT EXISTS workout_plans (
  id                TEXT PRIMARY KEY,
  doc_id            TEXT NOT NULL,
  goal              TEXT,
  level             TEXT,
  duration_weeks    INTEGER,
  sessions_per_week INTEGER,
  exercises         TEXT DEFAULT '[]',
  FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Import queue
CREATE TABLE IF NOT EXISTS import_queue (
  id         TEXT PRIMARY KEY,
  file_path  TEXT NOT NULL,
  status     TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','done','error')),
  error_msg  TEXT,
  created_at TEXT NOT NULL
);

-- App settings
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Seed danh mục chính
INSERT OR IGNORE INTO categories (id, name, icon, color, sort_order) VALUES
  ('cat-workout',   'Tập luyện',       'Dumbbell',    '#f97316', 1),
  ('cat-nutrition', 'Dinh dưỡng',      'Apple',       '#22c55e', 2),
  ('cat-recovery',  'Phục hồi',        'Heart',       '#3b82f6', 3),
  ('cat-mindset',   'Tâm lý',          'Brain',       '#a855f7', 4),
  ('cat-science',   'Khoa học thể thao','FlaskConical','#06b6d4', 5);

-- Seed default settings
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('ai.api_key', ''),
  ('ai.model', 'claude-sonnet-4-20250514'),
  ('ai.auto_tag', 'true'),
  ('ai.auto_summary', 'true'),
  ('library.dir', ''),
  ('ffmpeg.path', '');
