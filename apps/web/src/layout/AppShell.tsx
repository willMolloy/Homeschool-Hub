import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import "./app-shell.css";

export interface AppShellProps {
  /** Shown next to the app name (the signed-in family). */
  familyName?: ReactNode;
  /** Right side of the header (e.g. Sign out). */
  headerActions?: ReactNode;
  /** Footer content (e.g. engine version). */
  footer?: ReactNode;
  /** Above the main content (e.g. a warning banner). */
  banner?: ReactNode;
}

const NAV = [
  { to: "/", label: "Plan", end: true },
  { to: "/kids", label: "Kids", end: false },
  { to: "/subjects", label: "Subjects", end: false },
  { to: "/schedule", label: "Schedule", end: false },
];

export function AppShell({ familyName, headerActions, footer, banner }: AppShellProps) {
  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="shell-header">
        <div className="shell-brand">
          <span className="shell-app">Homeschool Hub</span>
          {familyName ? <span className="shell-family">{familyName}</span> : null}
        </div>
        <nav className="shell-nav" aria-label="Main">
          <ul>
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end}>{n.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
        {headerActions ? <div className="shell-actions">{headerActions}</div> : null}
      </header>
      {banner}
      <main id="main" className="shell-main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="shell-footer">{footer}</footer>
    </div>
  );
}
