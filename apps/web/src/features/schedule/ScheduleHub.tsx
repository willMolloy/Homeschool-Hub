/** /schedule (S2a-12): links to the plain list/form screens. The timeline stays out until the pilots decide its shape. */
import { Link } from "react-router-dom";
import "./schedule.css";

const LINKS = [
  { to: "/schedule/assignments", label: "Assignments", hint: "Curricula and how much to cover by when." },
  { to: "/schedule/days-off", label: "Days off", hint: "Vacations, holidays and sick days." },
  { to: "/schedule/events", label: "Events", hint: "Weekly things like co-op or piano that change a day." },
  { to: "/schedule/settings", label: "Family settings", hint: "Name, school days, week start and time zone." },
];

export function ScheduleHub() {
  return (
    <section className="schedule">
      <h1>Schedule</h1>
      <ul className="schedule-hub" aria-label="Schedule">
        {LINKS.map((l) => (
          <li key={l.to}>
            <Link className="schedule-hub-link card" to={l.to}>
              <span className="schedule-hub-label">{l.label}</span>
              <span className="schedule-hub-hint">{l.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "‹ Schedule" link at the top of every schedule screen. */
export function BackToSchedule() {
  return (
    <p className="schedule-back">
      <Link to="/schedule">‹ Schedule</Link>
    </p>
  );
}

/** Stand-in for a screen whose ticket hasn't landed yet. */
export function SchedulePlaceholder({ title }: { title: string }) {
  return (
    <section className="schedule">
      <BackToSchedule />
      <h1>{title}</h1>
      <p>Coming soon.</p>
    </section>
  );
}
