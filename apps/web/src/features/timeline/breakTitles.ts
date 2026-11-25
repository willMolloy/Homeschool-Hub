/**
 * S18c-05: neighbouring long-break titles on the year view. A title with nothing beside it is left as placed.
 */
import { fitName, type MeasureText } from "./names";

/** Neighbouring break titles keep at least this many px between their boxes. */
export const BREAK_TITLE_GAP_PX = 4;
/** When a title cannot shorten enough, the later one drops by this much. */
export const BREAK_TITLE_STAGGER_PX = 16;

export interface PlacedBreakTitle {
  text: string;
  x: number;
  y: number;
  width: number;
  /** The uncut name, so a later pass shortens from the real words. */
  full: string;
}

/**
 * Two titles that would draw on top of each other are shortened, or the later one is staggered down,
 * until their boxes are clear.
 */
export function separateBreakTitles(titles: PlacedBreakTitle[], measure: MeasureText, plotRight: number): void {
  const sameLine = (a: { y: number }, b: { y: number }) => Math.abs(a.y - b.y) < 1;
  const overlaps = (a: { x: number; width: number }, b: { x: number; width: number }) =>
    a.x < b.x + b.width + BREAK_TITLE_GAP_PX - 0.5 && b.x < a.x + a.width + BREAK_TITLE_GAP_PX - 0.5;
  for (let pass = 0; pass < titles.length + 2; pass++) {
    const sorted = [...titles].sort((a, b) => a.y - b.y || a.x - b.x);
    let changed = false;
    for (let i = 0; i < sorted.length; i++) {
      const left = sorted[i]!;
      for (let j = i + 1; j < sorted.length; j++) {
        const right = sorted[j]!;
        if (!sameLine(left, right) || !overlaps(left, right)) continue;
        const room = right.x - BREAK_TITLE_GAP_PX - left.x;
        const fitted = room > 0 ? fitName(left.full, room, measure) : null;
        if (fitted && left.x + measure(fitted) <= right.x - BREAK_TITLE_GAP_PX + 0.5) {
          if (left.text !== fitted) {
            left.text = fitted;
            left.width = measure(fitted);
            changed = true;
          }
          continue;
        }
        const restoredRoom = Math.max(0, plotRight - 2 - left.x);
        const restored = fitName(left.full, restoredRoom, measure) ?? left.full;
        if (left.text !== restored) {
          left.text = restored;
          left.width = measure(restored);
        }
        right.y += BREAK_TITLE_STAGGER_PX;
        changed = true;
      }
    }
    if (!changed) return;
  }
}
