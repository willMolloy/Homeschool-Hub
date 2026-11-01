/**
 * S6b-08: the common subjects a family can add in one tap (the assignment form's "Add a common subject" and the
 * Subjects screen's empty state). One named list, easy to edit.
 */
export const COMMON_SUBJECTS: readonly string[] = [
  "Math", "Reading", "Literature", "Writing", "Spelling", "Grammar", "History",
  "Science", "Geography", "Art", "Music", "Foreign Language", "Bible", "PE",
];

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The common subjects not already in `existing` (archived ones count: their name is taken). */
export const missingCommonSubjects = (existing: readonly { name: string }[]): string[] =>
  COMMON_SUBJECTS.filter((c) => !existing.some((s) => same(s.name, c)));

/** The subject named `name` (any case), if there is one. */
export const findSubjectNamed = <T extends { name: string }>(existing: readonly T[], name: string): T | undefined =>
  existing.find((s) => same(s.name, name));
