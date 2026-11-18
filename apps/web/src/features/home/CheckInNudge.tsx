/**
 * S20-03: one card on Home when last week still needs a check-in. It is not a gate: Schedule, Records and the
 * rest of Home stay usable, and checking in does not write a log entry.
 */
import { Link } from "react-router-dom";

export function CheckInNudge({ weekStart }: { weekStart: string }) {
  return (
    <section className="home-question" aria-label="Last week">
      <p>How did last week go? Updating it keeps the schedule honest.</p>
      <Link className="btn" to={`/schedule?view=week&week=${weekStart}`}>Update last week</Link>
    </section>
  );
}
