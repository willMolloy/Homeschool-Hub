/** S8-04: /track. For now the last-week check-in as it was on Plan; S8-06 replaces it with one question, checks and Update status. */
import { LastWeekCheckIn } from "../features/checkin/LastWeekCheckIn";
import { PlanRefreshProvider } from "../features/plan/planRefresh";

export function TrackPage() {
  return (
    <PlanRefreshProvider>
      <h1>Track work</h1>
      <LastWeekCheckIn />
    </PlanRefreshProvider>
  );
}
