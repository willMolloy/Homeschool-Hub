import type { ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { TABS, type Tab } from "./nav";
import { railLabelsShown } from "./railLabels";
import { homeLabel } from "../features/completion/NeedsYou";
import "./app-shell.css";

export interface AppShellProps {
  /** Footer content (e.g. engine version). */
  footer?: ReactNode;
  /** Above the main content (e.g. a warning banner). */
  banner?: ReactNode;
  /** S6-08: changing it remounts the page (after an undo, so every list reloads). */
  contentKey?: number;
  /** S12-05: how many things need the parent's answer; above 0, Home shows the needs-you dot. */
  needsYou?: number;
  /** S15-03: the tabs to show (a viewer gets Schedule and Records only). Default: all four. */
  tabs?: readonly Tab[];
}

/**
 * S8-04: the page and the navigation (Home, Schedule, Records, Set up: names and icons live in `nav.tsx`). No header: Home
 * holds the logo and the family button. S10-09: one `nav`, drawn as the bottom bar under 600 px and as an 80 px icon rail on
 * the left from 600 px (app-shell.css), so the two are never shown together and always hold the same items. S12-05: while a question
 * waits, Home carries a small fern dot and the name "Home, 1 thing needs you".
 */
export function AppShell({ footer, banner, contentKey, needsYou = 0, tabs = TABS }: AppShellProps) {
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
          {tabs.map((t) => (
            <li key={t.to}>
              <NavLink to={t.to} end={t.end} {...(t.to === "/" && needsYou > 0 ? { "aria-label": homeLabel(needsYou) } : {})}>
                <span className="shell-nav-pill">
                  <t.icon size={24} weight="light" aria-hidden="true" />
                  {t.to === "/" && needsYou > 0 ? <span className="shell-nav-dot" data-needs-you={needsYou} aria-hidden="true" /> : null}
                </span>
                <span className="shell-nav-label">{t.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
