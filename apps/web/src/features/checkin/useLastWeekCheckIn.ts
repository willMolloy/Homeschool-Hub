/**
 * Data and mutations for the "How did last week go?" card (S2b-25): GET /api/check-ins (last week) and the
 * PUT that confirms, skips or saves it. The card shows only while the week is unreviewed and had work.
 */
import { useState } from "react";
import { apiPut } from "../../api/client";
import type { SaveWeekBody, SaveWeekResponse, WeekCheckIn } from "../../api/types";
import { useApi } from "../../api/useApi";

export interface LastWeekCheckIn {
  /** The week to ask about, or null when there's nothing to ask (loading, error, already reviewed, no work). */
  week: WeekCheckIn | null;
  busy: boolean;
  error: string | null;
  /** True right after this device reviewed or skipped the week ("Thanks!"). */
  thanked: boolean;
  save: (body: SaveWeekBody) => Promise<SaveWeekResponse | null>;
}

export function useLastWeekCheckIn(): LastWeekCheckIn {
  const api = useApi<WeekCheckIn>("/api/check-ins");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanked, setThanked] = useState(false);
  const data = api.data;
  const week = data && !api.error && data.status === null && data.items.length > 0 ? data : null;

  const save = async (body: SaveWeekBody): Promise<SaveWeekResponse | null> => {
    if (!data) return null;
    setBusy(true);
    setError(null);
    try {
      const res = await apiPut<SaveWeekResponse>(`/api/check-ins/${data.weekStart}`, body);
      api.setData(res);
      setThanked(true);
      return res;
    } catch {
      setError("Couldn't save that. Please try again.");
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { week, busy, error, thanked, save };
}
