/**
 * T-03: no-overlap rows (DeeDee's hand-test rule). Two bars never share a row where they overlap in
 * time, even within one subject and child. A child's assignments are packed greedily into rows:
 * ordered by first drawn day, then assignment id, each goes in the first row whose last bar ends before
 * it starts; if none, a new row. The result is stable and never moves between zooms, because the
 * extent covers both the daily and the weekly-smoothed series.
 */
import type { TimelineAssignment } from "./model";

/** First and last grid index an assignment draws on at any zoom, or null when it draws nothing. */
export function drawnExtent(a: Pick<TimelineAssignment, "daily" | "weekly">): [number, number] | null {
  let first = -1;
  let last = -1;
  const n = Math.max(a.daily.length, a.weekly.length);
  for (let i = 0; i < n; i++) {
    if ((a.daily[i] ?? 0) > 0 || (a.weekly[i] ?? 0) > 0) {
      if (first < 0) first = i;
      last = i;
    }
  }
  return first < 0 ? null : [first, last];
}

/**
 * Rows of assignments, none overlapping within a row. Assignments that draw nothing go in the first row
 * (they take no room), so a child always has at least one row.
 */
export function packRows<T extends Pick<TimelineAssignment, "assignmentId" | "daily" | "weekly">>(assignments: readonly T[]): T[][] {
  const drawn = assignments
    .map((a) => ({ a, span: drawnExtent(a) }))
    .filter((x): x is { a: T; span: [number, number] } => x.span !== null)
    .sort((x, y) => x.span[0] - y.span[0] || (x.a.assignmentId < y.a.assignmentId ? -1 : x.a.assignmentId > y.a.assignmentId ? 1 : 0));
  const rows: T[][] = [];
  const ends: number[] = [];
  for (const { a, span } of drawn) {
    const r = ends.findIndex((end) => end < span[0]);
    if (r < 0) {
      rows.push([a]);
      ends.push(span[1]);
    } else {
      rows[r]!.push(a);
      ends[r] = span[1];
    }
  }
  const empty = assignments.filter((a) => drawnExtent(a) === null);
  if (rows.length === 0) return [[...empty]];
  rows[0]!.push(...empty);
  return rows;
}
