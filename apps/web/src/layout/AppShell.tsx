import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { TABS } from "./nav";
import "./app-shell.css";

export interface AppShellProps {
  /** Footer content (e.g. engine version). */
  footer?: ReactNode;
  /** Above the main content (e.g. a warning banner). */
  banner?: ReactNode;
  /** S6-08: changing it remounts the page (after an undo, so every list reloads). */
  contentKey?: number;
}

/** S8-04: the page and the bottom bar (Home, Schedule, Records: names and icons live in `nav.tsx`). No header: Home holds the logo and the family button. */
export function AppShell({ footer, banner, contentKey }: AppShellProps) {
  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>
      {banner}
      <main id="main" className="shell-main" tabIndex={-1}>
        <Outlet key={contentKey} />
      </main>
      <footer className="shell-footer">{footer}</footer>
      <nav className="shell-nav" aria-label="Main">
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
