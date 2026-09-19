-- Non-destructive migration: adds optional metadata columns to announcement_images.
-- No column or row is ever dropped. Safe to run once.
--   wrangler d1 execute toutedesuite --remote --file=worker/migrations/0001_announcement_images_metadata.sql

ALTER TABLE announcement_images ADD COLUMN mime_type TEXT;
ALTER TABLE announcement_images ADD COLUMN file_size INTEGER;
ALTER TABLE announcement_images ADD COLUMN file_name TEXT;

CREATE INDEX IF NOT EXISTS idx_announcement_images_announcement
  ON announcement_images (announcement_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_announcement_images_key
  ON announcement_images (storage_key);
