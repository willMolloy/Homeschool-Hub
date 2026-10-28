/**
 * Pure grouping for the temporary plan debug table (S1-36): child → subject → thickness per date.
 * Thickness is relative effort (units × weight, S2b-12). Cells are rounded to 1 decimal and the totals
 * are sums of the rounded cells, so they visibly add up.
 */
import { mergeLane, type ChildPlan, type DisplayDay, type LocalDate, type PlanWarning, type WeightSource } from "@hh/engine";

/** A weight that didn't come from the assignment itself: the cell's number rests on a default. */
export type DefaultSource = Exclude<WeightSource, "assignment">;

export interface DebugCell {
  date: LocalDate;
  /** Thickness rounded to 1 decimal. */
  value: number;
  /** Defaults behind this cell's work, in a fixed order (built-in, then subject); empty when all weights are the assignments' own. */
  defaults: DefaultSource[];
}

export interface DebugRow {
  subjectId: string;
  /** One per column. */
  cells: DebugCell[];
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

const DEFAULT_ORDER: readonly DefaultSource[] = ["default", "subject"];

/** 1 decimal, and sums of 1-decimal values stay clean (0.1 + 0.2 shows 0.3). */
export const round1 = (n: number): number => Math.round(n * 10) / 10;

const sum = (xs: number[]): number => round1(xs.reduce((s, x) => s + x, 0));

function defaultsOn(group: ChildPlan[], date: LocalDate): DefaultSource[] {
  const used = new Set(group
    .filter((p) => p.days.some((d) => d.date === date && d.thickness > 0))
    .map((p) => p.weightSource));
  return DEFAULT_ORDER.filter((s) => used.has(s));
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
      const lane = new Map(mergeLane(group).map((d) => [d.date, d.thickness]));
      const cells = dates.map((date): DebugCell => {
        const value = round1(lane.get(date) ?? 0);
        return { date, value, defaults: value > 0 ? defaultsOn(group, date) : [] };
      });
      return { subjectId, cells, total: sum(cells.map((c) => c.value)) };
    });
    const columnTotals = dates.map((date, i): DisplayDay => ({ date, value: sum(rows.map((r) => r.cells[i]!.value)) }));
    const warnings = [...subjects.values()].flat().flatMap((p) =>
      p.warnings.map((warning) => ({ assignmentId: p.assignmentId, subjectId: p.subjectId, warning })));
    return { childId, rows, columnTotals, total: sum(rows.map((r) => r.total)), warnings };
  });
}
