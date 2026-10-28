import { RosterPage } from "../features/roster/RosterPage";

export function SubjectsPage() {
  return <RosterPage title="Subjects" endpoint="/api/subjects" emptyText="No subjects yet." noun="subject" />;
}
