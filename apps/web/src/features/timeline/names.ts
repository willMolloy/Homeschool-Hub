/**
 * T-06: names on the bars. Pure fit-and-truncate rules, used by layout.ts.
 *
 * S10-04b (mockup "Labels"): each piece of a bar gets its name by the first rule that works:
 *   1. inside, in full, where the bar is thick enough (NAME_PATCH_PX) to back the text (T-11c: the bar is its only backing);
 *   2. outside, to the right of the piece, in muted page text, if that part of the row is free up to the next bar;
 *   3. inside, cut with "…", keeping at least MIN_NAME_CHARS letters;
 *   4. no name (the tap still works; the title is in the lane list and, when selected, in the edit sheet).
 * A name sits straight on its bar, pinned to the bar's left edge (the first stretch thick enough to hold it).
 */
import type { BandColumn } from "./paths";

/** S10-04b (mockup: bar label 12 px / 700). */
export const NAME_FONT_PX = 12;
export const NAME_FONT_WEIGHT = 700;
/** The bar must be at least this thick under a name, so the 11 px text never leaves the bar (T-11c: the bar is its only backing). */
export const NAME_PATCH_PX = 13;
/** Space between the name's box edge and the text. */
export const NAME_PAD_PX = 4;
/** Space between the bar's left edge and the name's box. */
export const NAME_INSET_PX = 2;
/** S10-04b: a cut name keeps at least this many letters before the "…", or there is no name. */
export const MIN_NAME_CHARS = 6;
/** T-11: zoomed out, a later piece of a bar is named only if it is at least this many times its name's width. */
export const LATER_PIECE_NAME_FACTOR = 2;
export const ELLIPSIS = "…";

/** S12-04: the words drawn on an ended bar: a small check after a finished one's name, "Stopped" after a stopped one's. */
export function barTitle(title: string, endedAs?: "finished" | "stopped"): string {
  return endedAs === "finished" ? `${title} ✓` : endedAs === "stopped" ? `${title} · Stopped` : title;
}

/** Width of a string in CSS px at NAME_FONT_PX. */
export type MeasureText = (text: string) => number;

/**
 * Fallback measure for when no canvas is available (tests, very old browsers). It deliberately over-estimates
 * (0.6 em a character), so a name may be dropped or cut early but never overflows its box.
 */
export const estimateTextWidth: MeasureText = (text) => text.length * NAME_FONT_PX * 0.6;

/**
 * The full title if it fits in `room`, else (unless `fullOnly`) the longest "prefix…" with at least MIN_NAME_CHARS
 * characters, else null.
 */
export function fitName(title: string, room: number, measure: MeasureText = estimateTextWidth, fullOnly = false): string | null {
  const text = title.trim();
  if (!text) return null;
  if (measure(text) <= room) return text;
  if (fullOnly) return null;
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
  /** The name's box: always inside the bar (nothing is drawn for it since T-11c). */
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
export function placeName(
  title: string, columns: readonly (BandColumn | null)[], cy: number, measure: MeasureText = estimateTextWidth, fullOnly = false,
): NamePlacement | null {
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
  // T-11: the leftmost stretch that holds the most of the title (the full title wins outright).
  let best: { s: Stretch; text: string } | null = null;
  for (const s of stretches) {
    const room = s.x1 - s.x0 - 2 * NAME_INSET_PX - 2 * NAME_PAD_PX;
    if (room <= 0) continue;
    const text = fitName(title, room, measure, fullOnly);
    if (text && (!best || text.length > best.text.length)) best = { s, text };
    if (text === title.trim()) break;
  }
  if (best) {
    const { s, text } = best;
    const width = measure(text) + 2 * NAME_PAD_PX;
    const x = s.x0 + NAME_INSET_PX;
    // The bar's thinnest point under the name, so the box never pokes out of the bar.
    const under = s.cols.filter((c) => c.x1 > x && c.x0 < x + width);
    const top = Math.max(...under.map((c) => c.top));
    const bottom = Math.min(...under.map((c) => c.bottom));
    return { text, x, y: top, width, height: bottom - top, textX: x + NAME_PAD_PX, textY: cy };
  }
  return null;
}

/** T-11: a name inside one piece (a run of touching columns), wherever the piece is thick enough to hold the text. */
export function placePieceName(
  title: string, piece: readonly BandColumn[], cy: number, measure: MeasureText = estimateTextWidth, fullOnly = false,
): NamePlacement | null {
  return placeName(title, piece, cy, measure, fullOnly);
}

/** S10-04b (mockup): an outside name starts this far right of its piece's end. */
export const OUTSIDE_GAP_PX = 6;
/** S10-04b: and ends at least this far before the next bar in the row (or the plot's right edge). */
export const OUTSIDE_CLEAR_PX = 4;

/**
 * S10-04b: a name for a piece that can't hold it in full, written in full to the right of the piece, centred on the
 * row, when the row is free up to `limitX` (the next bar's start, or the plot's right edge). Never cut.
 */
export function placeRightName(
  title: string, piece: readonly BandColumn[], cy: number, limitX: number, measure: MeasureText = estimateTextWidth,
): NamePlacement | null {
  const text = title.trim();
  if (!text) return null;
  const x = piece[piece.length - 1]!.x1 + OUTSIDE_GAP_PX;
  const width = measure(text);
  if (x + width > limitX - OUTSIDE_CLEAR_PX) return null;
  return { text, x, y: cy - NAME_FONT_PX / 2, width, height: NAME_FONT_PX, textX: x, textY: cy };
}

export type PieceName = NamePlacement & { piece: number; outside: boolean };

/** S13-00 (N1): the word a stopped bar always shows. */
export const STOPPED_WORD = "Stopped";

/** The plot's horizontal extent, for the stopped word's last fallbacks. */
export interface PlotBounds { left: number; right: number }

/**
 * S13-00 (N1): "Stopped" on its own for a stopped bar whose full name (with the word) did not fit: inside the piece in full, else
 * outside to its right while the row is free, else outside to its right up to the plot's edge, else outside to its left. Never a
 * bare stub. Null only when the plot has no room at all for it.
 */
export function placeStoppedWord(
  piece: readonly BandColumn[], cy: number, limitX: number, bounds: PlotBounds, measure: MeasureText = estimateTextWidth,
): (NamePlacement & { outside: boolean }) | null {
  const inside = placePieceName(STOPPED_WORD, piece, cy, measure, true);
  if (inside) return { ...inside, outside: false };
  const right = placeRightName(STOPPED_WORD, piece, cy, limitX, measure) ?? placeRightName(STOPPED_WORD, piece, cy, bounds.right, measure);
  if (right) return { ...right, outside: true };
  const width = measure(STOPPED_WORD);
  const x = piece[0]!.x0 - OUTSIDE_GAP_PX - width;
  if (x < bounds.left) return null;
  return { text: STOPPED_WORD, x, y: cy - NAME_FONT_PX / 2, width, height: NAME_FONT_PX, textX: x, textY: cy, outside: true };
}

/**
 * T-11: names for every piece of one bar. With daily detail every piece is named, so the piece after a break is
 * not mistaken for another assignment; zoomed out (`sparse`), the first named piece plus any later piece at least
 * LATER_PIECE_NAME_FACTOR times its name's width. Returns the piece index with each placement.
 * S10-04b: `limits[i]` is how far right piece i's row is free (omit it to keep every name inside); the rules are
 * in the file comment.
 */
export function placePieceNames(
  title: string, pieces: readonly (readonly BandColumn[])[], cy: number, sparse: boolean, measure: MeasureText = estimateTextWidth,
  limits?: readonly number[], stopped?: PlotBounds,
): PieceName[] {
  const out: PieceName[] = [];
  pieces.forEach((piece, i) => {
    const full = placePieceName(title, piece, cy, measure, true);
    const right = full || !limits ? null : placeRightName(title, piece, cy, limits[i] ?? Number.NEGATIVE_INFINITY, measure);
    const name = full ?? right ?? placePieceName(title, piece, cy, measure);
    if (!name) return;
    const width = piece[piece.length - 1]!.x1 - piece[0]!.x0;
    if (sparse && out.length > 0 && width < LATER_PIECE_NAME_FACTOR * name.width) return;
    out.push({ ...name, piece: i, outside: name === right });
  });
  // S13-00: a stopped bar always says so. If no name carries the word (cut, or none at all), "Stopped" stands alone on the last piece.
  if (stopped && pieces.length > 0 && !out.some((n) => n.text.endsWith(STOPPED_WORD))) {
    const last = pieces.length - 1;
    const word = placeStoppedWord(pieces[last]!, cy, limits?.[last] ?? stopped.right, stopped, measure);
    if (word) return [{ ...word, piece: last }];
  }
  return out;
}
