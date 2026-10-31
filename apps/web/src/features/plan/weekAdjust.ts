/** S6-03: the rows of the "Make an adjustment" sheet for a current or coming week, from the plan. Pure. */
import type { ChildPlan, OverrideMode, UnitType } from "@hh/engine";
import { stepOf } from "../checkin/amount";

export interface AdjustRow {
  assignmentId: string;
  title: string;
  unitType: UnitType;
  /** What the plan has this child doing this week now (an earlier adjustment is already in it). */
  planned: number;
  /** The most the amount can be: what is left of the assignment, never less than `planned`. */
  max: number;
  /** This child's saved adjustment for the week, if any. */
  overrideId: string | null;
}

export interface StoredOverride {
  id: string;
  assignmentId: string;
  childId: string | null;
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * One row per assignment this child has work on in the week, or an adjustment for it. Only the child's own adjustment
 * can be taken back here: one for every child (`childId` null) is left to whoever set it.
 */
export function adjustRows(
  plans: readonly ChildPlan[], childId: string, from: string, to: string,
  overrides: readonly StoredOverride[], titleOf: (assignmentId: string) => string,
): AdjustRow[] {
  const rows: AdjustRow[] = [];
  for (const p of plans) {
    if (p.childId !== childId) continue;
    const planned = round(p.days.filter((d) => d.date >= from && d.date <= to).reduce((s, d) => s + d.units, 0));
    const overrideId = overrides.find((o) => o.assignmentId === p.assignmentId && o.childId === childId)?.id ?? null;
    if (planned <= 0 && overrideId === null) continue;
    rows.push({
      assignmentId: p.assignmentId, title: titleOf(p.assignmentId), unitType: p.unitType, planned,
      max: Math.max(planned, round(p.remainingUnits)), overrideId,
    });
  }
  return rows.sort((a, b) => a.title.localeCompare(b.title) || a.assignmentId.localeCompare(b.assignmentId));
}

/** One step down or up, landing on whole steps (5 for minutes, 1 otherwise) within 0 to `max`. */
export function stepAmount(unitType: UnitType, amount: number, dir: -1 | 1, max: number): number {
  const s = stepOf(unitType);
  const next = dir < 0 ? (Math.ceil(amount / s - 1e-9) - 1) * s : (Math.floor(amount / s + 1e-9) + 1) * s;
  return Math.min(max, Math.max(0, round(next)));
}

export type Change = { kind: "set"; row: AdjustRow; units: number } | { kind: "remove"; overrideId: string };

/** What Save sends: a removal for a row taken back to the plan, a PUT for each amount that moved. */
export function changesFor(rows: readonly AdjustRow[], amounts: Readonly<Record<string, number>>, taken: ReadonlySet<string>): Change[] {
  const out: Change[] = [];
  for (const r of rows) {
    if (taken.has(r.assignmentId) && r.overrideId) out.push({ kind: "remove", overrideId: r.overrideId });
    else if (amounts[r.assignmentId] !== undefined && Math.abs(amounts[r.assignmentId]! - r.planned) > 1e-9) {
      out.push({ kind: "set", row: r, units: amounts[r.assignmentId]! });
    }
  }
  return out;
}

export const END_DATE_CHOICES: readonly { mode: OverrideMode; label: string; hint: string }[] = [
  { mode: "keepEndDate", label: "Keep the end date", hint: "The other weeks take a little more or less." },
  { mode: "pushEndDate", label: "Move the end date", hint: "Later if you do less, sooner if you do more." },
];
