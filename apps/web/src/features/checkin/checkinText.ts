/** Words for the "How did last week go?" card (S2b-25). Pure. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const md = (d: string) => ({ m: MONTHS[Number(d.slice(5, 7)) - 1]!, d: Number(d.slice(8, 10)) });

/** A week as "Oct 12–18", or "Sep 28 – Oct 4" across a month (S2b-27). Locale-free so tests are stable. */
export function weekRangeText(weekStart: string, weekEnd: string): string {
  const a = md(weekStart);
  const b = md(weekEnd);
  return a.m === b.m ? `${a.m} ${a.d}–${b.d}` : `${a.m} ${a.d} – ${b.m} ${b.d}`;
}
