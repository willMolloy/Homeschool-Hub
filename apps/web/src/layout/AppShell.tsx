import type { ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { TABS } from "./nav";
import { railLabelsShown } from "./railLabels";
import "./app-shell.css";

export interface AppShellProps {
  /** Footer content (e.g. engine version). */
  footer?: ReactNode;
  /** Above the main content (e.g. a warning banner). */
  banner?: ReactNode;
  /** S6-08: changing it remounts the page (after an undo, so every list reloads). */
  contentKey?: number;
}

/**
 * S8-04: the page and the navigation (Home, Schedule, Records, Set up: names and icons live in `nav.tsx`). No header: Home
 * holds the logo and the family button. S10-09: one `nav`, drawn as the bottom bar under 600 px and as an 80 px icon rail on
 * the left from 600 px (app-shell.css), so the two are never shown together and always hold the same items.
 */
export function AppShell({ footer, banner, contentKey }: AppShellProps) {
  const { search } = useLocation();
  const labels = railLabelsShown(search);
  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>
      {banner}
      <main id="main" className="shell-main" tabIndex={-1}>
        <Outlet key={contentKey} />
      </main>
      <footer className="shell-footer">{footer}</footer>
      <nav className="shell-nav" aria-label="Main" data-rail-labels={labels ? "on" : "off"}>
        <ul>
          {TABS.map((t) => (
            <li key={t.to}>
              <NavLink to={t.to} end={t.end}>
                <span className="shell-nav-pill"><t.icon size={24} weight="light" aria-hidden="true" /></span>
                <span className="shell-nav-label">{t.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
