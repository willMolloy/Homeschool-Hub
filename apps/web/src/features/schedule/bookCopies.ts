/**
 * S18b-02: an assignment has one set of school days for every child on it. A child with different days gets another
 * assignment of that book (a separate workbook). These helpers find those workbooks and name their days. They do not
 * give one assignment different days per child.
 */
import { sameSet, weekdayRanges } from "./formBits";

/** The book's name for matching copies. Case and extra spaces are ignored, and a trailing " (copy)" is the same book. */
export function bookTitle(title: string): string {
  let t = title.trim().toLowerCase().replace(/\s+/g, " ");
  const suffix = " (copy)";
  while (t.endsWith(suffix)) t = t.slice(0, -suffix.length).trimEnd();
  return t;
}

export function sameBook(a: { subjectId: string; title: string }, b: { subjectId: string; title: string }): boolean {
  return a.subjectId === b.subjectId && bookTitle(a.title) === bookTitle(b.title);
}

/** The other open workbooks of this book. An archived row is not one of them. */
export function otherCopies<T extends { id: string; subjectId: string; title: string; archived?: boolean }>(
  list: readonly T[], a: { id: string; subjectId: string; title: string },
): T[] {
  return list.filter((x) => x.archived !== true && x.id !== a.id && sameBook(x, a));
}

/** Assignment ids that have at least one other open workbook of the same book. */
export function twinIds(list: readonly { id: string; subjectId: string; title: string; archived?: boolean }[]): Set<string> {
  const ids = new Set<string>();
  for (const a of list) {
    if (a.archived === true) continue;
    if (otherCopies(list, a).length > 0) ids.add(a.id);
  }
  return ids;
}

/** The days this workbook runs: its own, else the subject's, else the family's school days. One list, for every child on it. */
export function resolvedWeekdays(
  a: { weekdays?: number[] | null },
  subjectDays: readonly number[] | null | undefined,
  schoolDays: readonly number[],
): number[] {
  if (a.weekdays && a.weekdays.length > 0) return [...a.weekdays];
  if (subjectDays && subjectDays.length > 0) return [...subjectDays];
  return [...schoolDays];
}

/** "Mon–Thu", the same words as the day chips. */
export const daysPhrase = (days: readonly number[]): string => weekdayRanges([...days]);

/** "Gospel of Luke · Tue–Fri" when `days` is set (this book has another workbook); otherwise the title alone. */
export function copyBarTitle(title: string, days: readonly number[] | null): string {
  return days && days.length > 0 ? `${title} · ${daysPhrase(days)}` : title;
}

/**
 * The days to start from when a parent sets the copies' own days: the set every chosen book already shares, else the
 * family's school days. Until they ask to set days, each copy keeps the book's stored days.
 */
export function startingCopyDays(books: readonly { weekdays: number[] | null }[], schoolDays: readonly number[]): number[] {
  const first = books[0]?.weekdays ?? null;
  if (first && first.length > 0 && books.every((b) => b.weekdays !== null && sameSet(b.weekdays, first))) return [...first].sort((a, b) => a - b);
  return [...schoolDays].sort((a, b) => a - b);
}
