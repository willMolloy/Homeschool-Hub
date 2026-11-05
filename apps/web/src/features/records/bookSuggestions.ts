/**
 * S16-06: quicker book logging. Pure. Suggestions come from titles the family already has (earlier log entries and assignment titles),
 * never from a guess and never pre-filled: the parent's own tap or typing is the only thing that adds a title.
 * "Reading" assignments (their unit is pages or chapters) come first, then titles from earlier log entries (newest first), then the
 * family's other assignment titles. Matching is anywhere in the title, ignoring case; titles are the same when case and spacing agree.
 */
import type { Assignment, RecordEntry } from "../../api/types";
import { READING_UNITS } from "./booksFinished";

export const MAX_SUGGESTIONS = 6;
export const MAX_RECENT = 5;
const norm = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ");

/** Distinct titles in order (first spelling wins), leaving out any in `skip`. */
function distinct(titles: readonly string[], skip: readonly string[] = []): string[] {
  const seen = new Set(skip.map(norm));
  const out: string[] = [];
  for (const t of titles) { const k = norm(t); if (k && !seen.has(k)) { seen.add(k); out.push(t.trim()); } }
  return out;
}

const newestFirst = (entries: readonly RecordEntry[]) => [...entries].sort((a, b) => b.startDate.localeCompare(a.startDate) || b.id.localeCompare(a.id));

/** Up to six titles containing `typed` (case ignored), not already added to this entry. Nothing when nothing is typed. */
export function suggestBooks(typed: string, entries: readonly RecordEntry[], assignments: readonly Assignment[], added: readonly string[]): string[] {
  const q = norm(typed);
  if (!q) return [];
  const live = assignments.filter((a) => !a.archived);
  const pool = distinct([
    ...live.filter((a) => READING_UNITS.includes(a.unitType)).map((a) => a.title),
    ...newestFirst(entries).flatMap((e) => e.books),
    ...live.filter((a) => !READING_UNITS.includes(a.unitType)).map((a) => a.title),
  ], added);
  return pool.filter((t) => norm(t).includes(q)).slice(0, MAX_SUGGESTIONS);
}

/** The last five titles logged for these children, newest first, not already added: the one-tap row under an empty field. */
export function recentBooks(entries: readonly RecordEntry[], childIds: readonly string[], added: readonly string[]): string[] {
  if (childIds.length === 0) return [];
  return distinct(newestFirst(entries.filter((e) => childIds.includes(e.childId))).flatMap((e) => e.books), added).slice(0, MAX_RECENT);
}
