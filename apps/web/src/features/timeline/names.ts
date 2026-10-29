/**
 * T-06: names inside the bars. Pure fit-and-truncate rules, used by layout.ts.
 *
 * A name sits on a solid (opacity 1) patch of its bar's own swatch, inside the bar, pinned to the bar's left
 * edge: the first stretch of the bar thick enough for the patch. It is the full title when it fits, otherwise
 * the longest prefix plus "…" that fits, and only when at least MIN_NAME_CHARS characters survive.
 * T-10: a bar too short for an inside name gets a plain label just past its end instead (placeOutsideName), when
 * its row is thick enough to hold the text and there is room before the next bar. Otherwise the bar has no name
 * (the title is still in the lane list and, when selected, in full in the edit bar).
 */
import type { BandColumn } from "./paths";

export const NAME_FONT_PX = 11;
/** The bar must be at least this thick under a name. The solid patch fills the bar's full thickness there, so it reads as part of the bar, not a badge. */
export const NAME_PATCH_PX = 13;
/** Space between the patch edge and the text. */
export const NAME_PAD_PX = 4;
/** Space between the bar's left edge and the patch. */
export const NAME_INSET_PX = 2;
export const MIN_NAME_CHARS = 4;
export const ELLIPSIS = "…";

/** Width of a string in CSS px at NAME_FONT_PX. */
export type MeasureText = (text: string) => number;

/**
 * Fallback measure for when no canvas is available (tests, very old browsers). It deliberately over-estimates
 * (0.6 em a character), so a name may be dropped or cut early but never overflows its patch.
 */
export const estimateTextWidth: MeasureText = (text) => text.length * NAME_FONT_PX * 0.6;

/** The full title if it fits in `room`, else the longest "prefix…" with at least MIN_NAME_CHARS characters, else null. */
export function fitName(title: string, room: number, measure: MeasureText = estimateTextWidth): string | null {
  const text = title.trim();
  if (!text) return null;
  if (measure(text) <= room) return text;
  for (let n = text.length - 1; n >= MIN_NAME_CHARS; n--) {
    const prefix = text.slice(0, n).trimEnd();
    if (prefix.length < MIN_NAME_CHARS) break;
    const candidate = `${prefix}${ELLIPSIS}`;
    if (measure(candidate) <= room) return candidate;
  }
  return null;
}

export interface NamePlacement {
  text: string;
  /** The patch. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Text start and its vertical centre. */
  textX: number;
  textY: number;
}

const TOUCH_EPS = 0.5;

/**
 * Where a bar's name goes: the leftmost stretch of touching columns all at least NAME_PATCH_PX thick that can
 * hold a fitted name. Columns are the bar's drawn columns in order (null = not drawn), centred on cy.
 */
export function placeName(title: string, columns: readonly (BandColumn | null)[], cy: number, measure: MeasureText = estimateTextWidth): NamePlacement | null {
  type Stretch = { x0: number; x1: number; cols: BandColumn[] };
  const stretches: Stretch[] = [];
  let open: Stretch | null = null;
  for (const c of columns) {
    const thick = c !== null && c.bottom - c.top >= NAME_PATCH_PX;
    if (thick && open && Math.abs(c.x0 - open.x1) <= TOUCH_EPS) {
      open.x1 = c.x1;
      open.cols.push(c);
    } else if (thick) stretches.push((open = { x0: c.x0, x1: c.x1, cols: [c] }));
    else open = null;
  }
  for (const s of stretches) {
    const room = s.x1 - s.x0 - 2 * NAME_INSET_PX - 2 * NAME_PAD_PX;
    if (room <= 0) continue;
    const text = fitName(title, room, measure);
    if (!text) continue;
    const width = measure(text) + 2 * NAME_PAD_PX;
    const x = s.x0 + NAME_INSET_PX;
    // The bar's thinnest point under the patch, so the patch never pokes out of the bar.
    const under = s.cols.filter((c) => c.x1 > x && c.x0 < x + width);
    const top = Math.max(...under.map((c) => c.top));
    const bottom = Math.min(...under.map((c) => c.bottom));
    return { text, x, y: top, width, height: bottom - top, textX: x + NAME_PAD_PX, textY: cy };
  }
  return null;
}

/**
 * T-10: a label just right of the bar's last drawn column, for a bar with no inside name. Only in rows at least
 * NAME_PATCH_PX thick (so the text stays inside its own row) and only up to `limit` (the next bar, or the plot's
 * right edge). No patch: the returned box is just the text's extent.
 */
export function placeOutsideName(
  title: string, columns: readonly (BandColumn | null)[], rowTop: number, rowHeight: number, cy: number, limit: number,
  measure: MeasureText = estimateTextWidth,
): NamePlacement | null {
  if (rowHeight < NAME_PATCH_PX) return null;
  const drawn = columns.filter((c): c is BandColumn => c !== null);
  if (drawn.length === 0) return null;
  const end = Math.max(...drawn.map((c) => c.x1));
  const x = end + NAME_PAD_PX;
  const room = limit - x - NAME_PAD_PX;
  if (room <= 0) return null;
  const text = fitName(title, room, measure);
  if (!text) return null;
  return { text, x, y: rowTop, width: measure(text), height: rowHeight, textX: x, textY: cy };
}
