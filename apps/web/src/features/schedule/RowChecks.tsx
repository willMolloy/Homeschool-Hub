/**
 * S18-04 (E9): what Add several and CSV import say about a row before it is saved, the same as the single form says: a pace that looks
 * too high (`paceWarning`), and a row that looks like one the family already has (same title and subject for a child it already has it for),
 * or that appears twice in the same batch. Both are quiet notes; neither blocks Save or Import.
 */
import { minutesPerDayFromWeight, weightPerUnitOf } from "@hh/engine";
import type { Assignment, UnitType } from "../../api/types";
import { useMe } from "../../auth/AuthProvider";
import { paceWarning, unitsPerCapacityDay, unitsPerDay } from "./effort";
import type { Lookups } from "./lookups";
import { usePace } from "./usePace";

export interface RowFacts {
  subjectId: string;
  title: string;
  childIds: readonly string[];
  unitType: UnitType;
  totalUnits: number;
  startDate: string;
  endDate: string;
}

const norm = (t: string) => t.trim().replace(/\s+/g, " ").toLowerCase();

/** The assignment the family already has that this row repeats: same subject and title, and a child in common. Archived ones do not count. */
export function alreadyHave(existing: readonly Assignment[], row: Pick<RowFacts, "subjectId" | "title" | "childIds">): Assignment | undefined {
  const title = norm(row.title);
  return existing.find((a) => !a.archived && a.subjectId === row.subjectId && norm(a.title) === title && a.childIds.some((c) => row.childIds.includes(c)));
}

/** For each row, the number (1-based) of the earlier row in the same batch that repeats it, or 0. */
export function repeatsOfEarlier(rows: readonly Pick<RowFacts, "subjectId" | "title" | "childIds">[]): number[] {
  return rows.map((r, i) => {
    const j = rows.findIndex((o, k) => k < i && o.subjectId === r.subjectId && norm(o.title) === norm(r.title) && o.childIds.some((c) => r.childIds.includes(c)));
    return j + 1;
  });
}

/** The words for a row's duplicate note, or null. `existing` is what the family has; `earlier` is `repeatsOfEarlier`'s answer for the row. */
export function duplicateNote(l: Lookups, existing: readonly Assignment[], row: RowFacts, earlier: number, label: (n: number) => string): string | null {
  if (earlier > 0) return `Same title as ${label(earlier)}. It would be added twice.`;
  const have = alreadyHave(existing, row);
  if (have) return `You already have ${have.title} for ${have.childIds.filter((c) => row.childIds.includes(c)).map(l.childName).join(", ")}. It would be added again.`;
  return null;
}

/** The pace note for one row (nothing while the total or dates are not usable, or when the pace is fine). */
export function RowPaceNote({ l, row, weekdays }: { l: Lookups; row: RowFacts; weekdays: readonly number[] | null }) {
  const { schoolDays } = useMe();
  const real = usePace(row.totalUnits > 0 ? { subjectId: row.subjectId || null, childIds: row.childIds, startDate: row.startDate, endDate: row.endDate, weekdays } : null, 250);
  const perDay = !(row.totalUnits > 0) ? null : real ? unitsPerCapacityDay(row.totalUnits, real.capacityDays) : unitsPerDay(row.totalUnits, row.startDate, row.endDate, weekdays ?? schoolDays);
  if (perDay === null || !Number.isFinite(perDay)) return null;
  const weight = weightPerUnitOf({ unitType: row.unitType, weightPerUnit: null }, row.subjectId ? l.subjectDefault(row.subjectId) : null).weight;
  const text = paceWarning(perDay, row.unitType, minutesPerDayFromWeight(weight, perDay));
  return text ? <p className="hint pace-note" role="note">{text}</p> : null;
}

/** A quiet duplicate line. */
export function DuplicateNote({ text }: { text: string | null }) {
  return text ? <p className="hint dup-note" role="note">{text}</p> : null;
}
