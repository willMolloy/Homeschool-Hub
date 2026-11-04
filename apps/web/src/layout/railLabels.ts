/**
 * S10-09: the rail's small labels under its icons are on by default (DeeDee, 2026-11-03). A config flag turns them off
 * so screenshots can compare labels on and off:
 * - build or dev config: `VITE_RAIL_LABELS=off`;
 * - a dev build only: `?rail-labels=off` (or `on`) on any page, remembered on this device (`hh.dev.railLabels`).
 * The bottom bar always shows its labels. With labels off they stay in the link for screen readers.
 */
const KEY = "hh.dev.railLabels";
type Setting = "on" | "off";
const isSetting = (v: unknown): v is Setting => v === "on" || v === "off";

export function railLabelsShown(search: string, env: { DEV: boolean; VITE_RAIL_LABELS?: string } = import.meta.env): boolean {
  const configured: Setting = env.VITE_RAIL_LABELS === "off" ? "off" : "on";
  if (!env.DEV) return configured === "on";
  const asked = new URLSearchParams(search).get("rail-labels");
  try {
    if (isSetting(asked)) window.localStorage.setItem(KEY, asked);
    const saved = window.localStorage.getItem(KEY);
    return (isSetting(asked) ? asked : isSetting(saved) ? saved : configured) === "on";
  } catch {
    return (isSetting(asked) ? asked : configured) === "on";
  }
}
