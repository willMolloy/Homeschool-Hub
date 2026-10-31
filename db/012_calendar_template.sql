-- 012_calendar_template (S5-06): a family's saved calendar templates ("Save this year as a template", S5-07).
-- breaks is a JSON list of { offsetDays, lengthDays, label, kind }, offsets counted from the year's first day.
-- The database only checks that it is a list of 1-100; each break's fields are checked by the API.
BEGIN;

CREATE TABLE calendar_template (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   uuid NOT NULL REFERENCES family (id) ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  breaks      jsonb NOT NULL CONSTRAINT calendar_template_breaks_list
              CHECK (jsonb_typeof(breaks) = 'array' AND jsonb_array_length(breaks) BETWEEN 1 AND 100),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX calendar_template_family_idx ON calendar_template (family_id, created_at, id);

INSERT INTO schema_migration (version) VALUES ('012_calendar_template');
COMMIT;
