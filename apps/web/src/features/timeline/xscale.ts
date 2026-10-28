/**
 * T-03: the timeline's x scale. Columns are the family's school weekdays only (as in the prototype), all
 * the same width; other days have no width and sit on the boundary between their neighbours.
 */
import type { DayGrid } from "./grid";

export interface XScale {
  /** Grid indices shown, inclusive. */
  first: number;
  last: number;
  /** Left edge of the plot and its width. */
  x: number;
  width: number;
  /** School-day columns shown, and each one's width. */
  columns: number;
  columnWidth: number;
  /** Left edge of grid day i (for a non-school day: the boundary it sits on). */
  start(i: number): number;
  /** Right edge of grid day i (equal to start for a non-school day). */
  end(i: number): number;
  /** Whether grid day i has a column. */
  isColumn(i: number): boolean;
}

export function makeXScale(grid: Pick<DayGrid, "schoolDay">, first: number, last: number, x: number, width: number): XScale {
  const before: number[] = [];
  let n = 0;
  for (let i = first; i <= last; i++) {
    before.push(n);
    if (grid.schoolDay[i]) n++;
  }
  const columnWidth = n > 0 ? width / n : 0;
  const clamp = (i: number) => Math.min(last, Math.max(first, i));
  const isColumn = (i: number) => i >= first && i <= last && Boolean(grid.schoolDay[i]);
  const start = (i: number) => (i > last ? x + width : x + before[clamp(i) - first]! * columnWidth);
  return {
    first,
    last,
    x,
    width,
    columns: n,
    columnWidth,
    start,
    end: (i) => start(i) + (isColumn(i) ? columnWidth : 0),
    isColumn,
  };
}
