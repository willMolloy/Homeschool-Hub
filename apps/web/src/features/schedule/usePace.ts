/**
 * S7b-10: the full days of work a draft assignment really has (school days on its own days, minus days off, event skips
 * and lighter days), from POST /api/plan/pace, so "About N pages a day" and the minutes a parent picks match what the plan
 * does. Requests made in the same moment (a list of cards, a form) go out as one POST. Nothing is saved.
 */
import { useEffect, useMemo, useState } from "react";
import { isValidLocalDate, toDayNumber, type LocalDate } from "@hh/engine";
import { apiPost } from "../../api/client";

export interface PaceDraft {
  subjectId: string | null;
  childIds: readonly string[];
  startDate: string;
  endDate: string;
  /** The days the work is on (explicit); null follows the subject's, else every school day. */
  weekdays: readonly number[] | null;
}
export interface PaceResult {
  /** The smallest across the children: the busiest child sets the pace. */
  capacityDays: number;
  perChild: { childId: string; capacityDays: number }[];
}

const MAX_DAYS = 1096;
const MAX_BATCH = 500;

/** True when the server would accept the draft (real dates in order, within the longest assignment, a child). */
export function usableDraft(d: PaceDraft): boolean {
  if (d.childIds.length === 0 || !isValidLocalDate(d.startDate) || !isValidLocalDate(d.endDate)) return false;
  const span = toDayNumber(d.endDate as LocalDate) - toDayNumber(d.startDate as LocalDate) + 1;
  return span >= 1 && span <= MAX_DAYS && (d.weekdays === null || d.weekdays.length > 0);
}

interface Waiting { draft: PaceDraft; resolve: (r: PaceResult) => void; reject: (e: unknown) => void }
const queue: Waiting[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  const batch = queue.splice(0, MAX_BATCH);
  if (queue.length > 0) timer = setTimeout(flush, 0);
  if (batch.length === 0) return;
  apiPost<{ paces: PaceResult[] }>("/api/plan/pace", { drafts: batch.map((w) => w.draft) }).then(
    (r) => batch.forEach((w, i) => (r.paces[i] ? w.resolve(r.paces[i]!) : w.reject(new Error("no answer")))),
    (e) => batch.forEach((w) => w.reject(e)),
  );
}

/** One draft's days; asks together with every other request made in the same tick. */
export function requestPace(draft: PaceDraft): Promise<PaceResult> {
  return new Promise((resolve, reject) => {
    queue.push({ draft, resolve, reject });
    timer ??= setTimeout(flush, 0);
  });
}

/**
 * The days for `draft` (null: nothing to ask yet), or undefined while it loads or when the request fails (callers fall back
 * to counting weekdays). `delayMs` waits for typing to settle.
 */
export function usePace(draft: PaceDraft | null, delayMs = 0): PaceResult | undefined {
  const key = draft && usableDraft(draft) ? JSON.stringify(draft) : null;
  const [got, setGot] = useState<{ key: string; result: PaceResult } | null>(null);
  useEffect(() => {
    if (key === null) return;
    let live = true;
    const t = setTimeout(() => {
      requestPace(JSON.parse(key) as PaceDraft).then((result) => live && setGot({ key, result }), () => { /* fall back to weekdays */ });
    }, delayMs);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [key, delayMs]);
  return useMemo(() => (key !== null && got?.key === key ? got.result : undefined), [key, got]);
}
