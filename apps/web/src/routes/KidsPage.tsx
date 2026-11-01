import { RosterPage } from "../features/roster/RosterPage";

export function KidsPage() {
  return <RosterPage title="Children" endpoint="/api/children" emptyText="No children yet." noun="child" />;
}
