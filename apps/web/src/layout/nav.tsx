/**
 * S8-04: the app's tabs and Set up links, in one place, so DeeDee's choice of names and tabs changes here only.
 * (Decided by Will, 2026-10-31: Home, Track work, Schedule; Schedule holds a Week | Year switch.)
 */
import type { Icon } from "@phosphor-icons/react";
import { CheckSquare, House, ListBullets } from "@phosphor-icons/react";

export interface Tab {
  to: string;
  label: string;
  icon: Icon;
  /** Active only on exactly this path (Home). */
  end?: boolean;
}

export const TABS: readonly Tab[] = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/track", label: "Track work", icon: CheckSquare },
  { to: "/schedule", label: "Schedule", icon: ListBullets },
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
  { from: "/timeline", to: "/schedule?view=year" },
  { from: "/kids", to: "/setup/children" },
  { from: "/subjects", to: "/setup/subjects" },
  { from: "/schedule/assignments", to: "/setup/assignments" },
  { from: "/schedule/days-off", to: "/setup/days-off" },
  { from: "/schedule/events", to: "/setup/events" },
  { from: "/schedule/settings", to: "/setup/settings" },
];
