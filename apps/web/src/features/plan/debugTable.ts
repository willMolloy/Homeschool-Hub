/**
 * Pure grouping for the temporary plan debug table (S1-36): child → subject → minutes per date.
 * Cells are rounded to whole minutes and the totals are sums of the rounded cells, so they visibly add up.
 */
import { mergeLane, sumByDate, type ChildPlan, type DisplayDay, type LocalDate, type PlanWarning } from "@hh/engine";

export interface DebugRow {
  subjectId: string;
  /** Rounded minutes per date, one per column. */
  cells: { date: LocalDate; minutes: number; estimated: boolean }[];
  total: number;
}

export interface DebugTable {
  childId: string;
  rows: DebugRow[];
  /** Column totals (rounded cells summed), one per date. */
  columnTotals: DisplayDay[];
  total: number;
  warnings: { assignmentId: string; subjectId: string; warning: PlanWarning }[];
}

/**
 * @param childOrder / subjectOrder  ids in display order; ids not listed go last, in first-seen order.
 */
export function buildDebugTables(
  plans: ChildPlan[], dates: LocalDate[], childOrder: string[] = [], subjectOrder: string[] = [],
): DebugTable[] {
  const byChild = new Map<string, Map<string, ChildPlan[]>>();
  for (const p of plans) {
    const subjects = byChild.get(p.childId) ?? new Map<string, ChildPlan[]>();
    byChild.set(p.childId, subjects);
    subjects.set(p.subjectId, [...(subjects.get(p.subjectId) ?? []), p]);
  }
  const rank = (order: string[]) => (id: string) => {
    const i = order.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const sortBy = <T>(xs: T[], key: (x: T) => string, order: string[]) => {
    const r = rank(order);
    return xs.map((x, i) => ({ x, i })).sort((a, b) => r(key(a.x)) - r(key(b.x)) || a.i - b.i).map((e) => e.x);
  };

  return sortBy([...byChild.entries()], ([id]) => id, childOrder).map(([childId, subjects]) => {
    const rows = sortBy([...subjects.entries()], ([id]) => id, subjectOrder).map(([subjectId, group]): DebugRow => {
      const lane = new Map(mergeLane(group).map((d) => [d.date, d.minutes]));
      const cells = dates.map((date) => {
        const minutes = Math.round(lane.get(date) ?? 0);
        const estimated = minutes > 0 && group.some((p) => p.minutesPerUnitEstimated && p.days.some((d) => d.date === date && d.minutes > 0));
        return { date, minutes, estimated };
      });
      return { subjectId, cells, total: cells.reduce((s, c) => s + c.minutes, 0) };
    });
    const columnTotals = sumByDate([
      dates.map((date) => ({ date, value: 0 })),
      ...rows.map((r) => r.cells.map((c) => ({ date: c.date, value: c.minutes }))),
    ]);
    const warnings = [...subjects.values()].flat().flatMap((p) =>
      p.warnings.map((warning) => ({ assignmentId: p.assignmentId, subjectId: p.subjectId, warning })));
    return { childId, rows, columnTotals, total: rows.reduce((s, r) => s + r.total, 0), warnings };
  });
}
