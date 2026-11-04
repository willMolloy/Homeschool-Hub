/**
 * S9b-07: the days a run of dates counts. Pre-selected from the school calendar (the picked children's school days, without
 * days off); the parent ticks or unticks. Up to two weeks: one chip per date ("Mon 2"). Longer: one chip per weekday, and
 * the run's dates on those weekdays count, days off left out. Reports the resulting dates (or null while nothing is known yet).
 * Remount (key) it when the dates change so the pre-selection starts again.
 */
import { useEffect, useMemo, useState } from "react";
import { useApi } from "../../api/useApi";
import { Chip } from "../../ui/components";
import {
  WEEK_ORDER, WEEKDAY_LETTER, WEEKDAY_PLURAL, chipMode, dateChipLabel, dateChipName, datesBetween, daysFromWeekdays,
  daysSummary, runDaysPath, weekdaysOf, type RunDays,
} from "./runDays";

export interface RunDayChipsProps {
  start: string;
  end: string;
  childIds: string[];
  /** Editing with unchanged dates: the days the entry counts now. */
  initial: string[] | null;
  onChange: (days: string[] | null, touched: boolean) => void;
}

export function RunDayChips({ start, end, childIds, initial, onChange }: RunDayChipsProps) {
  const mode = chipMode(start, end);
  const run = useApi<RunDays>(runDaysPath(start, end, childIds));
  const [dates, setDates] = useState<Set<string> | null>(initial ? new Set(initial) : null);
  const [weekdays, setWeekdays] = useState<Set<number> | null>(initial ? weekdaysOf(initial) : null);
  const [touched, setTouched] = useState(false);

  const daysOff = useMemo(() => run.data?.daysOff ?? [], [run.data]);
  const pickedDates = dates ?? (run.data ? new Set(run.data.schoolDays) : null);
  const pickedWeekdays = weekdays ?? (run.data ? new Set(run.data.weekdays) : null);
  const result = useMemo<string[] | null>(() => {
    if (mode === "dates") return pickedDates ? [...pickedDates].sort() : null;
    if (!pickedWeekdays) return null;
    // Editing untouched: keep exactly the days the entry counts (they may include a ticked day off).
    if (!touched && initial) return [...initial].sort();
    return daysFromWeekdays(start, end, pickedWeekdays, daysOff);
  }, [mode, pickedDates, pickedWeekdays, touched, initial, start, end, daysOff]);
  const key = result ? result.join(",") : "";

  useEffect(() => { onChange(result, touched); }, [key, touched]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDate = (d: string) => {
    const next = new Set(pickedDates ?? []);
    if (next.has(d)) next.delete(d); else next.add(d);
    setDates(next);
    setTouched(true);
  };
  const toggleWeekday = (w: number) => {
    const next = new Set(pickedWeekdays ?? []);
    if (next.has(w)) next.delete(w); else next.add(w);
    setWeekdays(next);
    setTouched(true);
  };

  return (
    <fieldset className="log-days">
      <legend>{mode === "dates" ? "School days in these dates" : "School days each week"}</legend>
      {run.loading && !pickedDates && !pickedWeekdays ? <p className="hint">Checking the school calendar…</p> : null}
      {run.error && !initial ? <p className="hint">Couldn't read the school calendar; school days from the calendar will count.</p> : null}
      {mode === "dates" ? (
        <div className="log-chips log-day-chips">
          {datesBetween(start, end).map((d) => (
            <Chip key={d} selected={pickedDates?.has(d) ?? false} aria-label={dateChipName(d)} disabled={!pickedDates} onClick={() => toggleDate(d)}>
              {dateChipLabel(d)}
            </Chip>
          ))}
        </div>
      ) : (
        <div className="log-chips log-day-chips">
          {WEEK_ORDER.map((w) => (
            <Chip key={w} selected={pickedWeekdays?.has(w) ?? false} aria-label={WEEKDAY_PLURAL[w]} disabled={!pickedWeekdays} onClick={() => toggleWeekday(w)}>
              {WEEKDAY_LETTER[w]}
            </Chip>
          ))}
        </div>
      )}
      <p className="hint" aria-live="polite">
        {result ? `Counts ${daysSummary(result)}.` : ""}
        {mode === "weekdays" ? " Days off are left out." : daysOff.length > 0 ? " Days off start unticked." : ""}
      </p>
    </fieldset>
  );
}
