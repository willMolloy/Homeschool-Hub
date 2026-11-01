/** Test helper: the days a log entry counts (S9b-01): one date is itself; a run is its Monday-to-Friday days. */
export function daysOf(start: string, end: string, counts = true): string[] {
  if (!counts) return [];
  if (start === end) return [start];
  const out: string[] = [];
  for (let t = Date.parse(`${start}T00:00:00Z`); t <= Date.parse(`${end}T00:00:00Z`); t += 86_400_000) {
    const d = new Date(t);
    if (d.getUTCDay() >= 1 && d.getUTCDay() <= 5) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
