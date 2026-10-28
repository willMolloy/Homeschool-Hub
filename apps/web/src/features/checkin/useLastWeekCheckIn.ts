/**
 * Data and mutations for a week's check-in card: GET /api/check-ins (last week, or `?weekStart=` for a past
 * week, S2b-27) and the PUT that confirms, skips or saves it. The home-screen card shows only while last week
 * is unreviewed and had work. A save that changed the plan tells the plan views to refetch (S2b-26).
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

export interface WeekCheckInState extends Omit<LastWeekCheckIn, "week"> {
  /** The loaded week whatever its status, or null while loading or after a load error. */
  data: WeekCheckIn | null;
  loading: boolean;
  loadError: string | null;
}

/** One week's check-in: last week when `weekStart` is undefined. `onSaved` runs after a successful PUT. */
export function useWeekCheckIn(weekStart?: string, onSaved?: (res: SaveWeekResponse) => void): WeekCheckInState {
  const api = useApi<WeekCheckIn>(weekStart ? `/api/check-ins?weekStart=${weekStart}` : "/api/check-ins");
  const { invalidate } = usePlanRefresh();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [thanks, setThanks] = useState<string | null>(null);
  const data = api.error ? null : api.data ?? null;

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
      onSaved?.(res);
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
  return { data, loading: api.loading, loadError: api.error ? "Couldn't load that week." : null, busy, error, itemErrors, thanks, save };
}

/** The home-screen prompt: last week, only while unreviewed and it had work. */
export function useLastWeekCheckIn(): LastWeekCheckIn {
  const { data, busy, error, itemErrors, thanks, save } = useWeekCheckIn();
  const week = data && data.status === null && data.items.length > 0 ? data : null;
  return { week, busy, error, itemErrors, thanks, save };
}
