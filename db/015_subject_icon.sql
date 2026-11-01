-- 015_subject_icon (S8-11): subject.icon, a key from a fixed list of icons (the API checks which keys are allowed;
-- the database checks only its shape). NULL means the first-letter badge. Existing subjects get the same default the
-- API gives a new one, by matching the name (the list is in apps/api/src/http/subjectIcons.ts: keep them in step).
BEGIN;

ALTER TABLE subject ADD COLUMN icon text;
ALTER TABLE subject ADD CONSTRAINT subject_icon_shape CHECK (icon IS NULL OR icon ~ '^[a-z]{1,24}$');

UPDATE subject SET icon = CASE
  WHEN name ~* '(^|[^a-z])(math|maths|arithmetic|algebra|geometry|calculus)([^a-z]|$)' THEN 'calculator'
  WHEN name ~* '(^|[^a-z])(biology|anatomy)([^a-z]|$)' THEN 'microscope'
  WHEN name ~* '(^|[^a-z])(nature|botany|gardening|garden)([^a-z]|$)' THEN 'leaf'
  WHEN name ~* '(^|[^a-z])(science|chemistry|physics|astronomy)([^a-z]|$)' THEN 'flask'
  WHEN name ~* '(^|[^a-z])(music|piano|violin|guitar|singing|choir)([^a-z]|$)' THEN 'music'
  WHEN name ~* '(^|[^a-z])(history|social studies|civics)([^a-z]|$)' THEN 'scroll'
  WHEN name ~* '(^|[^a-z])(geography)([^a-z]|$)' THEN 'globe'
  WHEN name ~* '(^|[^a-z])(art|drawing|painting|crafts?)([^a-z]|$)' THEN 'palette'
  WHEN name ~* '(^|[^a-z])(foreign language|languages?|latin|spanish|french|german|greek|italian|hebrew)([^a-z]|$)' THEN 'language'
  WHEN name ~* '(^|[^a-z])(bible|scripture|religion|catechism|theology)([^a-z]|$)' THEN 'cross'
  WHEN name ~* '(^|[^a-z])(pe|p\.e\.|gym|sports?|physical education)([^a-z]|$)' THEN 'running'
  WHEN name ~* '(^|[^a-z])(writing|spelling|grammar|handwriting|copywork|composition|dictation)([^a-z]|$)' THEN 'pencil'
  WHEN name ~* '(^|[^a-z])(reading|literature|read|books?|poetry|phonics)([^a-z]|$)' THEN 'book'
  ELSE NULL END;

INSERT INTO schema_migration (version) VALUES ('015_subject_icon');
COMMIT;
