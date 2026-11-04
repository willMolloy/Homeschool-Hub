/** S9b-01: test fixtures for log entries. coveredDays is what the API sends: one chosen date, or the weekdays (Mon-Fri) of a run. */
import { addDays, weekdayOf } from "@hh/engine";
import type { RecordEntry } from "../../src/api/types";

export function weekdaysOf(start: string, end: string): string[] {
  if (start === end) return [start];
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) if (weekdayOf(d) !== 0 && weekdayOf(d) !== 6) out.push(d);
  return out;
}

/** An entry with its covered days filled in from its dates unless given. */
export function withCovered(e: Omit<RecordEntry, "coveredDays"> & { coveredDays?: string[] }): RecordEntry {
  return { ...e, coveredDays: e.coveredDays ?? weekdaysOf(e.startDate, e.endDate) };
}
