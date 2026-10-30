/**
 * T-06: names inside the bars. Pure fit-and-truncate rules, used by layout.ts.
 *
 * A name sits on a solid (opacity 1) patch of its bar's own swatch, inside the bar, pinned to the bar's left
 * edge: the first stretch of the bar thick enough for the patch. It is the full title when it fits, otherwise
 * the longest prefix plus "…" that fits, and only when at least MIN_NAME_CHARS characters survive.
 * T-11: every piece of a bar (split by a break) can carry its own name, always inside the piece (placePieceNames).
 * The T-10 labels past a bar's end are gone. A piece too narrow for one character and "…", or in a row thinner
 * than NAME_PATCH_PX, has no name (the title is still in the lane list and, when selected, in the edit bar).
 */
import type { BandColumn } from "./paths";

export const NAME_FONT_PX = 11;
/** The bar must be at least this thick under a name. The solid patch fills the bar's full thickness there, so it reads as part of the bar, not a badge. */
export const NAME_PATCH_PX = 13;
/** Space between the patch edge and the text. */
export const NAME_PAD_PX = 4;
/** Space between the bar's left edge and the patch. */
export const NAME_INSET_PX = 2;
/** T-11 (DeeDee: "show what we can and append '…' as needed"): one character and the ellipsis is enough. */
export const MIN_NAME_CHARS = 1;
/** T-11: zoomed out, a later piece of a bar is named only if it is at least this many times its name's width. */
export const LATER_PIECE_NAME_FACTOR = 3;
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
  // T-11: the leftmost stretch that holds the most of the title (the full title wins outright).
  let best: { s: Stretch; text: string } | null = null;
  for (const s of stretches) {
    const room = s.x1 - s.x0 - 2 * NAME_INSET_PX - 2 * NAME_PAD_PX;
    if (room <= 0) continue;
    const text = fitName(title, room, measure);
    if (text && (!best || text.length > best.text.length)) best = { s, text };
    if (text === title.trim()) break;
  }
  if (best) {
    const { s, text } = best;
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
 * T-11: a name for one piece (a run of touching columns). Prefers placeName (a stretch thick enough for the
 * patch). Otherwise the name is pinned to the piece's left edge on a patch NAME_PATCH_PX tall, centred on the
 * bar, as long as the row (rowTop..rowTop + rowHeight) can hold it; the patch never leaves the piece's x span.
 */
export function placePieceName(
  title: string, piece: readonly BandColumn[], cy: number, rowTop: number, rowHeight: number, measure: MeasureText = estimateTextWidth,
): NamePlacement | null {
  const inside = placeName(title, piece, cy, measure);
  if (inside?.text === title.trim() || piece.length === 0 || rowHeight < NAME_PATCH_PX) return inside;
  const x0 = piece[0]!.x0;
  const x1 = piece[piece.length - 1]!.x1;
  const room = x1 - x0 - 2 * NAME_INSET_PX - 2 * NAME_PAD_PX;
  if (room <= 0) return inside;
  const text = fitName(title, room, measure);
  if (!text || (inside && inside.text.length >= text.length)) return inside;
  const x = x0 + NAME_INSET_PX;
  const top = Math.min(Math.max(cy - NAME_PATCH_PX / 2, rowTop), rowTop + rowHeight - NAME_PATCH_PX);
  return { text, x, y: top, width: measure(text) + 2 * NAME_PAD_PX, height: NAME_PATCH_PX, textX: x + NAME_PAD_PX, textY: cy };
}

/**
 * T-11: names for every piece of one bar. With daily detail every piece is named, so the piece after a break is
 * not mistaken for another assignment; zoomed out (`sparse`), the first named piece plus any later piece at least
 * LATER_PIECE_NAME_FACTOR times its name's width. Returns the piece index with each placement.
 */
export function placePieceNames(
  title: string, pieces: readonly (readonly BandColumn[])[], cy: number, rowTop: number, rowHeight: number, sparse: boolean,
  measure: MeasureText = estimateTextWidth,
): (NamePlacement & { piece: number })[] {
  const out: (NamePlacement & { piece: number })[] = [];
  pieces.forEach((piece, i) => {
    const name = placePieceName(title, piece, cy, rowTop, rowHeight, measure);
    if (!name) return;
    const width = piece[piece.length - 1]!.x1 - piece[0]!.x0;
    if (sparse && out.length > 0 && width < LATER_PIECE_NAME_FACTOR * name.width) return;
    out.push({ ...name, piece: i });
  });
  return out;
}
