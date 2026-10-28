// @ts-nocheck -- frozen verbatim copy of the prototype (proto-0.1) for regression tests. Do not edit or import from src.
export const ENGINE_VERSION = "proto-0.1";
export type Unit = "pages" | "chapters" | "lessons" | "minutes";
export type Rule = "skip" | "lighter" | "normal";
export type Mode = "keep" | "push";
export type SubjectId = "lit" | "math" | "hist" | "sci" | "music";
export type Assignment = { id: string; title: string; subject: SubjectId; kids: string[]; unit: Unit; total: number; start: string; end: string; mpu?: number; toc?: string[] };
export type RecEvent = { id: string; name: string; kids: string[]; weekday: number; portion: number; rules: Record<SubjectId, Rule> };
export type Override = { aid: string; week: number; units: number; mode: Mode };
export type Plan = { daily: number[]; rate0: number; rateAfter: number; end: number; plannedEnd: number; weekUnits0: number; done: number; overflow: boolean; noCap: boolean; capDay?: boolean[] };

export const DEFAULT_MPU: Record<Unit, number> = { pages: 2, chapters: 30, lessons: 20, minutes: 1 };
const BASE = Date.UTC(2026, 7, 31);
export const HORIZON = 336;
export const dayOf = (s: string): number => { const [y, m, d] = s.split("-").map((v: string) => Number(v)); return Math.round((Date.UTC(y, m - 1, d) - BASE) / 86400000); };
export const dateOf = (i: number): string => new Date(BASE + i * 86400000).toISOString().slice(0, 10);
export const weekdayOf = (i: number): number => ((i % 7) + 7) % 7;
export const BREAK = { start: dayOf("2026-12-21"), end: dayOf("2027-01-01"), name: "Christmas break" };
export const isBlocked = (d: number): boolean => d >= BREAK.start && d <= BREAK.end;
export const isSchoolDay = (d: number): boolean => weekdayOf(d) < 5 && !isBlocked(d);
export const mpuOf = (a: Assignment): number => a.mpu ?? DEFAULT_MPU[a.unit];

export function capacity(a: Assignment, events: RecEvent[], d: number): number {
  if (!isSchoolDay(d)) return 0;
  let c = 1;
  for (const ev of events) {
    if (ev.weekday !== weekdayOf(d)) continue;
    if (!ev.kids.some((k: string) => a.kids.includes(k))) continue;
    const r = ev.rules[a.subject];
    c *= r === "skip" ? 0 : r === "lighter" ? 1 - ev.portion : 1;
  }
  return c;
}

export function plan(a: Assignment, events: RecEvent[], ov?: Override): Plan {
  const p = planCore(a, events, ov);
  const S = dayOf(a.start);
  p.capDay = Array.from({ length: HORIZON }, (_: unknown, d: number) => d >= S && d <= p.end && capacity(a, events, d) > 0);
  return p;
}
function planCore(a: Assignment, events: RecEvent[], ov?: Override): Plan {
  const S = dayOf(a.start);
  const E = dayOf(a.end);
  const daily = new Array<number>(HORIZON).fill(0);
  const cap = new Array<number>(HORIZON).fill(0);
  for (let d = Math.max(0, S); d < HORIZON; d += 1) cap[d] = capacity(a, events, d);
  const sum = (from: number, to: number): number => { let s = 0; for (let d = Math.max(from, S, 0); d <= Math.min(to, HORIZON - 1); d += 1) s += cap[d]; return s; };
  const tot0 = sum(S, E);
  const base: Plan = { daily, rate0: 0, rateAfter: 0, end: E, plannedEnd: E, weekUnits0: 0, done: 0, overflow: false, noCap: tot0 <= 0 };
  if (tot0 <= 0) return base;
  const rate0 = a.total / tot0;
  base.rate0 = rate0; base.rateAfter = rate0;
  const W0 = ov ? ov.week : -1;
  const W1 = W0 + 6;
  const weekCap = ov ? sum(W0, Math.min(W1, E)) : 0;
  if (!ov || weekCap <= 0 || W0 > E || W1 < S) {
    for (let d = S; d <= E; d += 1) daily[d] = rate0 * cap[d];
    if (ov) base.weekUnits0 = rate0 * weekCap;
    return base;
  }
  const done = rate0 * sum(S, W0 - 1);
  const weekUnits0 = rate0 * weekCap;
  const units = Math.max(0, Math.min(ov.units, a.total - done));
  let remaining = a.total - done - units;
  base.done = done; base.weekUnits0 = weekUnits0;
  for (let d = Math.max(S, 0); d < W0; d += 1) daily[d] = rate0 * cap[d];
  for (let d = Math.max(S, W0); d <= Math.min(W1, E); d += 1) daily[d] = units * cap[d] / weekCap;
  const afterCap = sum(W1 + 1, E);
  if (ov.mode === "keep" && (afterCap > 0 || remaining <= 1e-9)) {
    const r = afterCap > 0 ? remaining / afterCap : 0;
    base.rateAfter = r;
    for (let d = W1 + 1; d <= E; d += 1) daily[d] = r * cap[d];
    return base;
  }
  // push: keep the old pace after this week; end moves to wherever the work runs out
  let last = Math.min(W1, E);
  for (let d = W1 + 1; d < HORIZON && remaining > 1e-9; d += 1) {
    const v = Math.min(rate0 * cap[d], remaining);
    if (v > 0) { daily[d] = v; remaining -= v; last = d; }
  }
  // trailing days in the original range get nothing when work finishes early
  base.end = last;
  base.overflow = remaining > 1e-6;
  return base;
}
export type Detail = "daily" | "weekly";
// Weekly value = week's work / number of that week's days with capacity > 0 (inside the assignment's dates),
// drawn flat across the week's school days. So weekly value x capacity days = the week's total.
export function aggregate(daily: number[], cols: number[], mode: Detail, capDay?: boolean[]): number[] {
  if (mode === "daily") return cols.map((d: number) => daily[d] ?? 0);
  return cols.map((d: number) => {
    if (!isSchoolDay(d)) return 0;
    const mon = d - weekdayOf(d);
    let s = 0, n = 0;
    for (let i = 0; i < 5; i += 1) { const x = mon + i; s += daily[x] ?? 0; if (capDay ? capDay[x] : (daily[x] ?? 0) > 0) n += 1; }
    return n ? s / n : 0;
  });
}
export const colsFor = (r0: number, r1: number): number[] => { const c: number[] = []; for (let d = r0; d <= r1; d += 1) if (weekdayOf(d) < 5) c.push(d); return c; };
