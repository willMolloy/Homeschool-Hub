/**
 * S8-04: the app's tabs and Set up links, in one place, so DeeDee's choice of names and tabs changes here only.
 * S9-01 (Will, 2026-11-01): the two main jobs are Schedule and Records: Home, Schedule, Records. Schedule holds a Week | Year switch
 * and the optional weekly check-in; Records is attendance, estimated hours and books.
 */
import type { Icon } from "@phosphor-icons/react";
import { House, ListBullets, Notebook } from "@phosphor-icons/react";

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
