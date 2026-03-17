-- Add category assignment to import queue items
ALTER TABLE import_queue ADD COLUMN cat_id TEXT NOT NULL DEFAULT '';
