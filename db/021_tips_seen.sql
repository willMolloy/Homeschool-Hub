-- 021_tips_seen (S11-06): which one-time hints on Schedule a family has seen ('bars', 'edit', 'icons'), so they don't repeat on
-- another device. Families that exist when this runs have seen them all (they know the screens); a family created afterwards
-- starts with none. "Show tips again" in Family settings sets it back to none.
BEGIN;

ALTER TABLE family ADD COLUMN tips_seen text[] NOT NULL DEFAULT '{}';
ALTER TABLE family ADD CONSTRAINT family_tips_seen_values CHECK (tips_seen <@ ARRAY['bars', 'edit', 'icons']::text[]);

UPDATE family SET tips_seen = ARRAY['bars', 'edit', 'icons'];

INSERT INTO schema_migration (version) VALUES ('021_tips_seen');
COMMIT;
