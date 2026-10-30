/**
 * This Week (T-03b): the title with one small week switcher, last week's check-in prompt, and the week's plan
 * with a "Make an adjustment" button per student. S4-09: a short briefing under the title, only when something needs attention. S4-10: "Missed a day?" in the header. Debug extras need a dev build and `?debug=1`.
 */
import { Briefing } from "../features/plan/Briefing";
import { ChildAdjustment } from "../features/checkin/ChildAdjustment";
import { LastWeekCheckIn } from "../features/checkin/LastWeekCheckIn";
import { MissedDay } from "../features/plan/MissedDay";
import { PlanDebugView } from "../features/plan/PlanDebugView";
import { PlanRefreshProvider } from "../features/plan/planRefresh";
import { useDebugFlag, useShownWeek } from "../features/plan/useShownWeek";
import { WeekSwitcher } from "../features/plan/WeekSwitcher";
import { addDays } from "@hh/engine";

export function PlanPage() {
  const week = useShownWeek();
  const debug = useDebugFlag();
  const checkIn = { start: week.checkInWeekStart, end: addDays(week.checkInWeekStart, 6) };
  return (
    <PlanRefreshProvider>
      <header className="plan-header">
        <h1>Plan</h1>
        <WeekSwitcher week={week} />
        <MissedDay weekStart={week.weekStart} />
      </header>
      <Briefing weekStart={week.weekStart} />
      <LastWeekCheckIn />
      <PlanDebugView weekStart={week.weekStart} debug={debug}
        childAction={(childId, childName) => (
          <ChildAdjustment childId={childId} childName={childName} weekStart={checkIn.start} weekEnd={checkIn.end}
            lastWeek={checkIn.start === addDays(week.currentWeekStart, -7)} />
        )} />
    </PlanRefreshProvider>
  );
}
