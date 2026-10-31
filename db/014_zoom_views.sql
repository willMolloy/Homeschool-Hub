-- 014_zoom_views (S7-03): which built-in timeline zoom views a family hides and the views it names itself.
-- zoom_views is { "hidden": [...], "custom": [...] }; the database checks only that it is an object holding those two lists.
-- The API checks what is in them (which views may hide, up to 5 custom views, names, dates, at most 6 shown).
BEGIN;

ALTER TABLE family ADD COLUMN zoom_views jsonb NOT NULL DEFAULT '{"hidden":[],"custom":[]}'::jsonb;
ALTER TABLE family ADD CONSTRAINT family_zoom_views_shape
  CHECK (jsonb_typeof(zoom_views) = 'object'
         AND coalesce(jsonb_typeof(zoom_views -> 'hidden'), '') = 'array'
         AND coalesce(jsonb_typeof(zoom_views -> 'custom'), '') = 'array');

INSERT INTO schema_migration (version) VALUES ('014_zoom_views');
COMMIT;
