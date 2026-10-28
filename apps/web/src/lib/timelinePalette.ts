// T-01b: which subject palette the page uses. "safe" (colour-blind safe) is the default and
// needs no attribute; "vivid" sets data-palette="vivid", which tokens.css keys on.
// There is no settings UI yet: the toggle (and where the choice is saved) arrives with a later
// settings/timeline ticket, which will call this.
export type TimelinePalette = "safe" | "vivid";

export const DEFAULT_TIMELINE_PALETTE: TimelinePalette = "safe";

const defaultRoot = (): HTMLElement => document.documentElement;

export function applyTimelinePalette(palette: TimelinePalette, root: HTMLElement = defaultRoot()): void {
  if (palette === "vivid") root.dataset.palette = "vivid";
  else delete root.dataset.palette;
}

export function currentTimelinePalette(root: HTMLElement = defaultRoot()): TimelinePalette {
  return root.dataset.palette === "vivid" ? "vivid" : DEFAULT_TIMELINE_PALETTE;
}
