/** The list of finished weeks to reopen (S2b-27). Presentational: weeks and the choice come in as props. */
import type { PastWeek } from "../../api/types";
import { reviewStatusText, weekRangeText } from "./checkinText";

export interface PastWeekPickerProps {
  weeks: readonly PastWeek[];
  selected: string | null;
  onChoose: (weekStart: string) => void;
}

export function PastWeekPicker({ weeks, selected, onChoose }: PastWeekPickerProps) {
  if (weeks.length === 0) return <p className="past-week-empty">No finished weeks with planned work yet.</p>;
  return (
    <ul className="past-week-list" aria-label="Past weeks">
      {weeks.map((w) => (
        <li key={w.weekStart}>
          <button type="button" className="btn-link past-week" aria-current={w.weekStart === selected ? "true" : undefined}
            onClick={() => onChoose(w.weekStart)}>
            {weekRangeText(w.weekStart, w.weekEnd)}
          </button>{" "}
          <span className={`past-week-status past-week-${w.status ?? "none"}`}>{reviewStatusText(w.status)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Whether a week after `weekStart` has its own check-ins, which keep applying from their weeks on. */
export const laterCheckInsExist = (weeks: readonly PastWeek[], weekStart: string) =>
  weeks.some((w) => w.weekStart > weekStart && w.hasCheckIns);
