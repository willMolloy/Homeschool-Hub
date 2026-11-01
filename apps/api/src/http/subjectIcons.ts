/**
 * S8-11: the fixed list of subject icons (Phosphor Light names in the web app, apps/web/src/features/subjects/icons.ts)
 * and the default a subject gets from its name. A subject with no icon shows its first letter.
 * The same name matching runs in SQL in db/015_subject_icon.sql for subjects that already exist: keep them in step.
 */
export const SUBJECT_ICONS = [
  "book", "calculator", "globe", "flask", "leaf", "music", "palette", "pencil", "language", "cross",
  "running", "map", "scroll", "microscope", "star", "heart", "puzzle", "rocket", "paw", "camera",
] as const;
export type SubjectIcon = (typeof SUBJECT_ICONS)[number];

/** In order: the first row that matches decides (so "Biology" is a microscope before it is a flask). */
const DEFAULTS: ReadonlyArray<readonly [icon: SubjectIcon, words: RegExp]> = [
  ["calculator", /(^|[^a-z])(math|maths|arithmetic|algebra|geometry|calculus)([^a-z]|$)/i],
  ["microscope", /(^|[^a-z])(biology|anatomy)([^a-z]|$)/i],
  ["leaf", /(^|[^a-z])(nature|botany|gardening|garden)([^a-z]|$)/i],
  ["flask", /(^|[^a-z])(science|chemistry|physics|astronomy)([^a-z]|$)/i],
  ["music", /(^|[^a-z])(music|piano|violin|guitar|singing|choir)([^a-z]|$)/i],
  ["scroll", /(^|[^a-z])(history|social studies|civics)([^a-z]|$)/i],
  ["globe", /(^|[^a-z])(geography)([^a-z]|$)/i],
  ["palette", /(^|[^a-z])(art|drawing|painting|crafts?)([^a-z]|$)/i],
  ["language", /(^|[^a-z])(foreign language|languages?|latin|spanish|french|german|greek|italian|hebrew)([^a-z]|$)/i],
  ["cross", /(^|[^a-z])(bible|scripture|religion|catechism|theology)([^a-z]|$)/i],
  ["running", /(^|[^a-z])(pe|p\.e\.|gym|sports?|physical education)([^a-z]|$)/i],
  ["pencil", /(^|[^a-z])(writing|spelling|grammar|handwriting|copywork|composition|dictation)([^a-z]|$)/i],
  ["book", /(^|[^a-z])(reading|literature|read|books?|poetry|phonics)([^a-z]|$)/i],
];

/** The icon a subject of this name starts with, or null (the first-letter badge). */
export function defaultIconFor(name: string): SubjectIcon | null {
  return DEFAULTS.find(([, words]) => words.test(name))?.[0] ?? null;
}
