/**
 * Data and mutations for the "How did last week go?" card (S2b-25): GET /api/check-ins (last week) and the
 * PUT that confirms, skips or saves it. The card shows only while the week is unreviewed and had work.
 * A save that changed the plan tells the plan views to refetch (S2b-26).
 */
import { useState } from "react";
import { ApiError, apiPut } from "../../api/client";
import type { SaveWeekBody, SaveWeekResponse, WeekCheckIn } from "../../api/types";
import { useApi } from "../../api/useApi";
import { usePlanRefresh } from "../plan/planRefresh";
import { itemKey } from "./absorb";

export interface LastWeekCheckIn {
  /** The week to ask about, or null when there's nothing to ask (loading, error, already reviewed, no work). */
  week: WeekCheckIn | null;
  busy: boolean;
  error: string | null;
  /** 400s about one item, by itemKey. */
  itemErrors: Record<string, string>;
  /** Set right after this device reviewed or skipped the week: "Thanks!" or "Thanks — plan updated". */
  thanks: string | null;
  save: (body: SaveWeekBody) => Promise<SaveWeekResponse | null>;
}

/** "items.2.position: can't be more…" → item 2 and the readable part. */
export function itemErrorOf(message: string): { index: number; text: string } | null {
  const m = /^items\.(\d+)(?:\.[a-zA-Z]+)?: (.*)$/.exec(message);
  return m ? { index: Number(m[1]), text: m[2]! } : null;
}

export function useLastWeekCheckIn(): LastWeekCheckIn {
  const api = useApi<WeekCheckIn>("/api/check-ins");
  const { invalidate } = usePlanRefresh();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [thanks, setThanks] = useState<string | null>(null);
  const data = api.data;
  const week = data && !api.error && data.status === null && data.items.length > 0 ? data : null;

  const save = async (body: SaveWeekBody): Promise<SaveWeekResponse | null> => {
    if (!data) return null;
    setBusy(true);
    setError(null);
    setItemErrors({});
    try {
      const res = await apiPut<SaveWeekResponse>(`/api/check-ins/${data.weekStart}`, body);
      const updated = body.items.length > 0 || res.planChanged;
      if (updated) invalidate();
      api.setData(res);
      setThanks(updated ? "Thanks — plan updated" : "Thanks!");
      return res;
    } catch (e) {
      const row = e instanceof ApiError && e.status === 400 ? itemErrorOf(e.message) : null;
      const item = row ? body.items[row.index] : undefined;
      if (row && item) setItemErrors({ [itemKey(item)]: row.text });
      else if (e instanceof ApiError && e.status === 400) setError(e.message.replace(/^[a-zA-Z.\d]+: /, ""));
      else setError("Couldn't save that. Please try again.");
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { week, busy, error, itemErrors, thanks, save };
}
