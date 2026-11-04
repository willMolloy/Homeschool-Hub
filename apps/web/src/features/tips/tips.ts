/**
 * S11-06: the three one-time hints on Schedule, in the parent's words, instead of a tour. Each shows the first time its thing
 * appears, one at a time, and never returns once "Got it" is tapped. The ones seen are stored on the family (`tipsSeen`).
 */
import type { TipId } from "../../api/types";

export const TIP_IDS: readonly TipId[] = ["bars", "edit", "icons"];

export const TIP_TEXT: Record<TipId, string> = {
  bars: "Thicker bars mean more work each day. Tap one to change it.",
  edit: "Change the start or end and the rest of the plan adjusts.",
  // S12-09 (N9): the banner sits above the picture, not beside an icon, so it says where to look.
  icons: "Tap an icon in the left column to see the subject's name.",
};

/**
 * Which hint to show now, or none: one at a time, never stacked. Opening a bar is its own moment, so the edit hint comes first
 * when a bar is open; then the bars hint; then the icons (which first show together with the bars, so they wait their turn).
 * `here` says which things are on screen now.
 */
export function activeTip(seen: readonly TipId[], here: { bars: boolean; edit: boolean; icons: boolean }): TipId | null {
  const unseen = (id: TipId) => !seen.includes(id);
  if (here.edit && unseen("edit")) return "edit";
  if (here.bars && !here.edit && unseen("bars")) return "bars";
  if (here.icons && !here.edit && unseen("icons") && !(here.bars && unseen("bars"))) return "icons";
  return null;
}
