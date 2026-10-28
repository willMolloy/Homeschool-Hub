/**
 * The week the This Week page shows (T-03b): `?week=` when valid, else the family's today. One source for the
 * switcher, the plan view and the adjustment sheet, so they always agree.
 */
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { addDays, isValidLocalDate, weekStartOf, type LocalDate, type WeekStart } from "@hh/engine";
import { useMe } from "../../auth/AuthProvider";

/** The device's local date as YYYY-MM-DD. Only a fallback: the family's `me.today` decides the default week. */
export function deviceToday(now: Date = new Date()): LocalDate {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export interface ShownWeek {
  weekStart: LocalDate;
  weekEnd: LocalDate;
  /** The week containing the family's today. */
  currentWeekStart: LocalDate;
  /** The week that a check-in for this page goes to: the shown week once it's over, otherwise last week. */
  checkInWeekStart: LocalDate;
  go: (weekStart: LocalDate) => void;
}

/** Pure: the shown and check-in weeks from the param and the family's today. */
export function shownWeek(param: string | null, today: LocalDate, weekStartsOn: WeekStart) {
  const currentWeekStart = weekStartOf(today, weekStartsOn);
  const weekStart = weekStartOf(param && isValidLocalDate(param) ? param : today, weekStartsOn);
  const checkInWeekStart = weekStart < currentWeekStart ? weekStart : addDays(currentWeekStart, -7);
  return { weekStart, weekEnd: addDays(weekStart, 6), currentWeekStart, checkInWeekStart };
}

export function useShownWeek(): ShownWeek {
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const today = isValidLocalDate(me.today) ? me.today : deviceToday();
  const week = shownWeek(params.get("week"), today, me.weekStart);
  const go = useCallback((weekStart: LocalDate) => {
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set("week", weekStart);
      return next;
    }, { replace: true });
  }, [setParams]);
  return { ...week, go };
}

export { useDebugFlag } from "../../lib/useDebugFlag";
