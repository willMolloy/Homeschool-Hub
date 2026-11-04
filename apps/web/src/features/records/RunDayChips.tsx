/**
 * S9b-07: the days a run of dates counts. Pre-selected from the school calendar (the picked children's school days, without
 * days off); the parent ticks or unticks. Up to two weeks: one chip per date ("Mon 2"). Longer: one chip per weekday, and
 * the run's dates on those weekdays count, days off left out. Reports the resulting dates (or null while nothing is known yet).
 *
 * S10-10b (M2): the parent's ticks live with the form (`ticks`), not here, so changing the dates keeps every tick for a date
 * still in the run; only dates without a tick are pre-selected from the calendar.
 */
import { useEffect, useMemo } from "react";
import { useApi } from "../../api/useApi";
import { Chip } from "../../ui/components";
import {
  WEEK_ORDER, WEEKDAY_LETTER, WEEKDAY_PLURAL, chipMode, dateChipLabel, dateChipName, datesBetween, daysSummary, runDaysPath,
  partlyOffHint, tickedDays, type DayTicks, type RunDays,
} from "./runDays";
import { weekdayOf } from "@hh/engine";

export interface RunDayChipsProps {
  start: string;
  end: string;
  childIds: string[];
  /** The parent's choices so far (an edited entry starts with its own days). */
  ticks: DayTicks;
  /** A chip was pressed: the new choices. */
  onTicks: (ticks: Map<string, boolean>) => void;
  /** S10-10b (L3): a child's name, for the hint about a ticked day that is only some children's day off. */
  nameOf?: (childId: string) => string;
  /** The dates that count, or null while the calendar is still needed and unknown. */
  onChange: (days: string[] | null) => void;
}

export function RunDayChips({ start, end, childIds, ticks, onTicks, nameOf = (id) => id, onChange }: RunDayChipsProps) {
  const mode = chipMode(start, end);
  const run = useApi<RunDays>(runDaysPath(start, end, childIds));
  // the last answer is kept while a new one loads: only trust it for the dates and children it was asked for
  const cal = run.loading ? undefined : run.data;
  const dates = useMemo(() => datesBetween(start, end), [start, end]);
  const schoolDays = useMemo(() => (cal ? new Set(cal.schoolDays) : undefined), [cal]);
  const daysOff = useMemo(() => new Set(cal?.daysOff ?? []), [cal]);
  const result = useMemo(() => tickedDays(dates, ticks, schoolDays), [dates, ticks, schoolDays]);
  const picked = useMemo(() => new Set(result ?? []), [result]);
  const partlyOff = childIds.length > 1 && cal?.partlyOff ? partlyOffHint(cal.partlyOff, picked, nameOf) : "";
  const key = result ? result.join(",") : "";

  useEffect(() => { onChange(result); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const known = (d: string) => ticks.has(d) || schoolDays !== undefined;
  const toggleDate = (d: string) => onTicks(new Map(ticks).set(d, !picked.has(d)));
  const onWeekday = (w: number) => dates.some((d) => weekdayOf(d) === w && picked.has(d));
  const toggleWeekday = (w: number) => {
    const on = !onWeekday(w);
    const next = new Map(ticks);
    for (const d of dates) if (weekdayOf(d) === w) next.set(d, on && !daysOff.has(d));
    onTicks(next);
  };
  const weekdaysReady = result !== null && (schoolDays !== undefined || dates.every((d) => ticks.has(d)));

  return (
    <fieldset className="log-days">
      <legend>{mode === "dates" ? "School days in these dates" : "School days each week"}</legend>
      {run.loading && result === null ? <p className="hint">Checking the school calendar…</p> : null}
      {run.error && result === null ? <p className="hint">Couldn't read the school calendar; school days from the calendar will count.</p> : null}
      {mode === "dates" ? (
        <div className="log-chips log-day-chips">
          {dates.map((d) => (
            <Chip key={d} selected={picked.has(d) || (result === null && ticks.get(d) === true)} aria-label={dateChipName(d)} disabled={!known(d)} onClick={() => toggleDate(d)}>
              {dateChipLabel(d)}
            </Chip>
          ))}
        </div>
      ) : (
        <div className="log-chips log-day-chips">
          {WEEK_ORDER.map((w) => (
            <Chip key={w} selected={onWeekday(w)} aria-label={WEEKDAY_PLURAL[w]} disabled={!weekdaysReady} onClick={() => toggleWeekday(w)}>
              {WEEKDAY_LETTER[w]}
            </Chip>
          ))}
        </div>
      )}
      <p className="hint" aria-live="polite">
        {result ? `Counts ${daysSummary(result)}.` : ""}
        {mode === "weekdays" ? " Days off are left out." : dates.some((d) => daysOff.has(d) && !ticks.has(d)) ? " Days off start unticked." : ""}
      </p>
      {partlyOff ? <p className="hint" aria-live="polite">{partlyOff}</p> : null}
    </fieldset>
  );
}
