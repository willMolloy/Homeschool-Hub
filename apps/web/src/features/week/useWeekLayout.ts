/**
 * S16-01/02: Schedule · Week as Bars or Days. Bars is the default until Will has seen Days in practice. The choice is remembered on this
 * device (`hh.week.layout`; storage may be blocked); `?layout=days` in the address opens Days (and wins, so a link can show one).
 */
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export type WeekLayout = "bars" | "days";
export const LAYOUT_KEY = "hh.week.layout";
const isLayout = (v: unknown): v is WeekLayout => v === "bars" || v === "days";

function saved(): WeekLayout {
  try {
    const v = window.localStorage.getItem(LAYOUT_KEY);
    return isLayout(v) ? v : "bars";
  } catch {
    return "bars";
  }
}

export function useWeekLayout(): [WeekLayout, (next: WeekLayout) => void] {
  const [params, setParams] = useSearchParams();
  const asked = params.get("layout");
  const layout: WeekLayout = isLayout(asked) ? asked : saved();
  const choose = useCallback((next: WeekLayout) => {
    try { window.localStorage.setItem(LAYOUT_KEY, next); } catch { /* not remembered */ }
    setParams((p) => { const q = new URLSearchParams(p); q.set("layout", next); return q; }, { replace: true });
  }, [setParams]);
  return [layout, choose];
}
