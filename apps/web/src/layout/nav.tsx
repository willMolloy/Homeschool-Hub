/**
 * S8-04: the app's tabs and Set up links, in one place, so DeeDee's choice of names and tabs changes here only.
 * S9-01 (Will, 2026-11-01): the two main jobs are Schedule and Records: Home, Schedule, Records. Schedule holds a Week | Year switch
 * and the optional weekly check-in; Records is attendance, estimated hours and books.
 * S10-09 (DeeDee, 2026-11-03): Set up joins them, so the bottom bar (under 600 px) and the rail (600 px and up) hold the same
 * four items; Home's Set up row is gone (2026-11-04). Set up is active on /setup and every /setup/* screen.
 */
import type { Icon } from "@phosphor-icons/react";
import { House, ListBullets, Notebook, SlidersHorizontal } from "@phosphor-icons/react";

export interface Tab {
  to: string;
  label: string;
  icon: Icon;
  /** Active only on exactly this path (Home). */
  end?: boolean;
}

export const TABS: readonly Tab[] = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/schedule", label: "Schedule", icon: ListBullets },
  { to: "/records", label: "Records", icon: Notebook },
  { to: "/setup", label: "Set up", icon: SlidersHorizontal },
];

export interface SetupLink {
  to: string;
  label: string;
  hint: string;
}

/** Every screen under /setup, with the one line that says what it is for. Family settings sit behind the avatar on Home. */
export const SETUP_LINKS: readonly SetupLink[] = [
  { to: "/setup/children", label: "Children", hint: "Who you teach." },
  { to: "/setup/subjects", label: "Subjects", hint: "Math, reading and the rest." },
  { to: "/setup/assignments", label: "Assignments", hint: "Books and lessons, and by when." },
  { to: "/setup/school-year", label: "School year", hint: "First and last day, and its terms." },
  { to: "/setup/days-off", label: "Days off and breaks", hint: "Vacations, holidays and sick days." },
  { to: "/setup/events", label: "Events", hint: "Weekly things like co-op or piano." },
];

/** Old routes and where they land now (S8-04). A search string is kept. */
export const REDIRECTS: readonly { from: string; to: string }[] = [
  // S9-01: Track work is no longer a page; its check-in lives in Schedule · Week.
  { from: "/track", to: "/schedule?view=week" },
  { from: "/timeline", to: "/schedule?view=year" },
  { from: "/kids", to: "/setup/children" },
  { from: "/subjects", to: "/setup/subjects" },
  { from: "/schedule/assignments", to: "/setup/assignments" },
  { from: "/schedule/days-off", to: "/setup/days-off" },
  { from: "/schedule/events", to: "/setup/events" },
  { from: "/schedule/settings", to: "/setup/settings" },
];
