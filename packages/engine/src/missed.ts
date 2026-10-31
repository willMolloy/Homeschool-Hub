import { fromDayNumber, toDayNumber } from "./dates";
import type { BlockedPeriod } from "./types";

/**
 * The missed days (S4-00) that carry their work forward for one child: each `missed` day from `from` to `asOf`
 * that covers the child, in date order, plus the blocked periods with those days taken out (a missed day later
 * than asOf stays an ordinary day off). null when there are none.
 */
export function pastMissedDays(blocked: BlockedPeriod[] | undefined, childId: string, from: number, asOf: number): { days: number[]; rest: BlockedPeriod[] } | null {
  const days = new Set<number>();
  const rest: BlockedPeriod[] = [];
  for (const b of blocked ?? []) {
    if (b.kind !== "missed") {
      rest.push(b);
      continue;
    }
    if (b.childIds && b.childIds.length > 0 && !b.childIds.includes(childId)) {
      rest.push(b);
      continue;
    }
    const s = toDayNumber(b.start);
    const e = toDayNumber(b.end);
    for (let d = Math.max(s, from); d <= Math.min(e, asOf); d += 1) days.add(d);
    // The part later than asOf still blocks like any day off.
    if (e > asOf) rest.push({ ...b, start: fromDayNumber(Math.max(s, asOf + 1)) });
  }
  return days.size === 0 ? null : { days: [...days].sort((x, y) => x - y), rest };
}
