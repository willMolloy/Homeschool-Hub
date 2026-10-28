/** One small week switcher for the page header (T-03b): ‹ week › . Replaces Prev/Next and "Review a past week". */
import { addDays } from "@hh/engine";
import { weekRangeText } from "../checkin/checkinText";
import type { ShownWeek } from "./useShownWeek";

export function WeekSwitcher({ week }: { week: ShownWeek }) {
  const label = week.weekStart === week.currentWeekStart ? "This week" : weekRangeText(week.weekStart, week.weekEnd);
  return (
    <div className="week-switcher" role="group" aria-label="Week">
      <button type="button" className="week-switcher-step" aria-label="Previous week" onClick={() => week.go(addDays(week.weekStart, -7))}>
        <span aria-hidden="true">‹</span>
      </button>
      <span className="week-switcher-label" aria-live="polite">{label}</span>
      <button type="button" className="week-switcher-step" aria-label="Next week" onClick={() => week.go(addDays(week.weekStart, 7))}>
        <span aria-hidden="true">›</span>
      </button>
    </div>
  );
}
