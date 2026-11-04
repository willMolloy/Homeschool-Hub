/**
 * S13-01: the print page's address. `/print/week?week=2026-11-02&children=all` or `/print/day?date=2026-11-03&children=a,b`.
 * `children` is `all` (every active child) or a comma list of child ids; `print=1` makes the page open the browser's print dialog.
 */
import { isValidLocalDate, type LocalDate } from "@hh/engine";

export type SheetKind = "week" | "day";
export interface PrintChoice {
  kind: SheetKind;
  /** The week's first day for a week sheet, the day for a day sheet. */
  date: LocalDate;
  /** Child ids, or "all". */
  children: readonly string[] | "all";
}

export function printUrl(c: PrintChoice, opts: { print?: boolean } = {}): string {
  const q = new URLSearchParams();
  q.set(c.kind === "week" ? "week" : "date", c.date);
  q.set("children", c.children === "all" ? "all" : c.children.join(","));
  if (opts.print) q.set("print", "1");
  return `/print/${c.kind}?${q.toString()}`;
}

/** Reads the address back; null when the date is missing or isn't a date. */
export function parsePrintParams(kind: SheetKind, params: URLSearchParams): PrintChoice | null {
  const date = params.get(kind === "week" ? "week" : "date");
  if (!date || !isValidLocalDate(date)) return null;
  const raw = params.get("children");
  const ids = raw && raw !== "all" ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  return { kind, date, children: ids.length > 0 ? ids : "all" };
}
