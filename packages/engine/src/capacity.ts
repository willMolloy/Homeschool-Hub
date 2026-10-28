import { toDayNumber, weekdayOfDayNumber } from "./dates";
import type { BlockedPeriod, FamilyCalendar, RecurringEvent, SubjectRule } from "./types";

const clamp01 = (x: number): number => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);

function appliesToChild(childIds: string[] | null | undefined, childId: string): boolean {
  return !childIds || childIds.length === 0 || childIds.includes(childId);
}

/** Pre-parsed calendar inputs so per-day capacity is cheap. */
export interface CapacityModel {
  schoolDay(day: number, childId: string): boolean;
  capacity(day: number, childId: string, subjectId: string): number;
}

export function ruleFactor(rule: SubjectRule, capacityFraction: number): number {
  if (rule === "skip") return 0;
  if (rule === "lighter") return 1 - clamp01(capacityFraction);
  return 1;
}

export function buildCapacityModel(calendar: FamilyCalendar, events: RecurringEvent[] = [], blocked: BlockedPeriod[] = []): CapacityModel {
  const schoolDays = new Set(calendar.schoolDays);
  const blocks = blocked.map((b) => ({ s: toDayNumber(b.start), e: toDayNumber(b.end), childIds: b.childIds }));
  const evs = events.map((ev) => ({
    ev,
    s: ev.start ? toDayNumber(ev.start) : -Infinity,
    e: ev.end ? toDayNumber(ev.end) : Infinity,
    weekdays: new Set(ev.weekdays),
  }));

  const schoolDay = (day: number, childId: string): boolean => {
    if (!schoolDays.has(weekdayOfDayNumber(day))) return false;
    for (const b of blocks) if (day >= b.s && day <= b.e && appliesToChild(b.childIds, childId)) return false;
    return true;
  };

  return {
    schoolDay,
    /**
     * 0 if not a school day or blocked for this child; otherwise 1 multiplied by every event that
     * day that includes this child: skip = 0, lighter = 1 - capacityFraction, normal = 1.
     */
    capacity(day, childId, subjectId) {
      if (!schoolDay(day, childId)) return 0;
      const wd = weekdayOfDayNumber(day);
      let c = 1;
      for (const { ev, s, e, weekdays } of evs) {
        if (day < s || day > e || !weekdays.has(wd)) continue;
        if (!appliesToChild(ev.childIds, childId)) continue;
        // Own keys only: a subject id like "constructor" must not pick up Object.prototype members.
        const own = ev.subjectRules && Object.prototype.hasOwnProperty.call(ev.subjectRules, subjectId) ? ev.subjectRules[subjectId] : undefined;
        const rule = own ?? ev.defaultRule ?? "normal";
        c *= ruleFactor(rule, ev.capacityFraction);
      }
      return c;
    },
  };
}
