import { LastWeekCheckIn } from "../features/checkin/LastWeekCheckIn";
import { PastWeekReview } from "../features/checkin/PastWeekReview";
import { PlanDebugView } from "../features/plan/PlanDebugView";
import { PlanRefreshProvider } from "../features/plan/planRefresh";

export function PlanPage() {
  return (
    <PlanRefreshProvider>
      <h1>Plan</h1>
      <LastWeekCheckIn />
      <PlanDebugView />
      <PastWeekReview />
    </PlanRefreshProvider>
  );
}
