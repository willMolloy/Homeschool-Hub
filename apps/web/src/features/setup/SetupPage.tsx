/** S8-04: /setup, one list of every set-up screen with a line on what each is for. */
import { Link } from "react-router-dom";
import { SETUP_LINKS } from "../../layout/nav";
import { Card, ListRow } from "../../ui/components";
import "../home/home.css";

export function SetupPage() {
  return (
    <section className="setup">
      <h1>Set up</h1>
      <Card className="setup-list">
        <ul aria-label="Set up">
          {SETUP_LINKS.map((l) => (
            <li key={l.to}><ListRow to={l.to} title={l.label} description={l.hint} /></li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

/** "‹ Set up" at the top of every set-up screen. */
export function BackToSetup() {
  return (
    <p className="schedule-back">
      <Link to="/setup">‹ Set up</Link>
    </p>
  );
}
