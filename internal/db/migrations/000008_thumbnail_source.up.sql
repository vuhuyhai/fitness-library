-- Add thumbnail source tracking to documents
ALTER TABLE documents ADD COLUMN thumbnail_source TEXT NOT NULL DEFAULT 'svg';
