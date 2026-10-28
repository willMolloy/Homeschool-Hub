import { RosterPage } from "../features/roster/RosterPage";

export function KidsPage() {
  return <RosterPage title="Kids" endpoint="/api/children" emptyText="No children yet." />;
}
