// placeholder for S8-04: the existing This Week content, replaced by pastel bars in S8-05.
import { ChildAdjustment } from "../checkin/ChildAdjustment";
import { LastWeekCheckIn } from "../checkin/LastWeekCheckIn";
import { Briefing } from "../plan/Briefing";
import { PlanDebugView } from "../plan/PlanDebugView";
import { PlanRefreshProvider } from "../plan/planRefresh";
import { useDebugFlag, useShownWeek } from "../plan/useShownWeek";
import { WeekSwitcher } from "../plan/WeekSwitcher";
import { addDays } from "@hh/engine";

export function WeekView() {
  const week = useShownWeek();
  const debug = useDebugFlag();
  const checkIn = { start: week.checkInWeekStart, end: addDays(week.checkInWeekStart, 6) };
  const ahead = week.weekStart >= week.currentWeekStart;
  return (
    <PlanRefreshProvider>
      <header className="plan-header"><WeekSwitcher week={week} /></header>
      <Briefing weekStart={week.weekStart} />
      <LastWeekCheckIn />
      <PlanDebugView weekStart={week.weekStart} debug={debug}
        childAction={(childId, childName) => (
          ahead
            ? <ChildAdjustment childId={childId} childName={childName} weekStart={week.weekStart} weekEnd={week.weekEnd}
                ahead={{ current: week.weekStart === week.currentWeekStart }} />
            : <ChildAdjustment childId={childId} childName={childName} weekStart={checkIn.start} weekEnd={checkIn.end}
                lastWeek={checkIn.start === addDays(week.currentWeekStart, -7)} />
        )} />
    </PlanRefreshProvider>
  );
}
