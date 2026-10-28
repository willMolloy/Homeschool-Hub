import { LastWeekCheckIn } from "../features/checkin/LastWeekCheckIn";
import { PlanDebugView } from "../features/plan/PlanDebugView";

export function PlanPage() {
  return (
    <>
      <h1>Plan</h1>
      <LastWeekCheckIn />
      <PlanDebugView />
    </>
  );
}
