/**
 * T-06: names inside the bars. Pure fit-and-truncate rules, used by layout.ts.
 *
 * A name sits straight on its bar (T-11c: no patch; every label meets AA on the bar as drawn), pinned to the
 * bar's left edge: the first stretch of the bar thick enough to hold the text. It is the full title when it fits, otherwise
 * the longest prefix plus "…" that fits, and only when at least MIN_NAME_CHARS characters survive.
 * T-11: every piece of a bar (split by a break) can carry its own name, always inside the piece (placePieceNames).
 * The T-10 labels past a bar's end are gone. A piece too narrow for one character and "…", or nowhere at least
 * NAME_PATCH_PX thick, has no name (the title is still in the lane list and, when selected, in the edit bar).
 */
import type { BandColumn } from "./paths";

export const NAME_FONT_PX = 11;
/** The bar must be at least this thick under a name, so the 11 px text never leaves the bar (T-11c: the bar is its only backing). */
export const NAME_PATCH_PX = 13;
/** Space between the name's box edge and the text. */
export const NAME_PAD_PX = 4;
/** Space between the bar's left edge and the name's box. */
export const NAME_INSET_PX = 2;
/** T-11 (DeeDee: "show what we can and append '…' as needed"): one character and the ellipsis is enough. */
export const MIN_NAME_CHARS = 1;
/** T-11: zoomed out, a later piece of a bar is named only if it is at least this many times its name's width. */
export const LATER_PIECE_NAME_FACTOR = 2;
export const ELLIPSIS = "…";

/** Width of a string in CSS px at NAME_FONT_PX. */
export type MeasureText = (text: string) => number;

/**
 * Fallback measure for when no canvas is available (tests, very old browsers). It deliberately over-estimates
 * (0.6 em a character), so a name may be dropped or cut early but never overflows its box.
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
    // The bar's thinnest point under the name, so the box never pokes out of the bar.
    const under = s.cols.filter((c) => c.x1 > x && c.x0 < x + width);
    const top = Math.max(...under.map((c) => c.top));
    const bottom = Math.min(...under.map((c) => c.bottom));
    return { text, x, y: top, width, height: bottom - top, textX: x + NAME_PAD_PX, textY: cy };
  }
  return null;
}

/**
 * T-11: a name for one piece (a run of touching columns), wherever the piece is thick enough to hold the text.
 * T-11c: the thin-piece fallback (a patch taller than the piece) is gone with the patch: there, text would
 * spill onto the page, where its label colour can't meet AA.
 */
export function placePieceName(title: string, piece: readonly BandColumn[], cy: number, measure: MeasureText = estimateTextWidth): NamePlacement | null {
  return placeName(title, piece, cy, measure);
}

/** T-11e: the lowest ink of an outside name (its baseline, or its descenders) ends this far above its bar. */
export const OUTSIDE_GAP_PX = 2;
/** T-11e: the room an outside name needs, from its lowest ink up past its tallest letters (11 px text). */
export const OUTSIDE_NAME_PX = 12;
/** T-11e: how far descenders (g, j, p, q, y, commas) reach below the baseline at 11 px (measured about 2.5 px). */
export const DESCENDER_PX = 3;

/**
 * T-11d: a name for a piece too thin to hold it, written just above the piece: left-aligned with its start and cut
 * with "…" to its width, so it never runs over the next piece. T-11e: its lowest ink ends OUTSIDE_GAP_PX above the
 * piece's top. `textY` is the alphabetic baseline, raised by DESCENDER_PX when the text has descenders.
 */
export function placeOutsideName(title: string, piece: readonly BandColumn[], measure: MeasureText = estimateTextWidth): NamePlacement | null {
  const x = piece[0]!.x0;
  const text = fitName(title, piece[piece.length - 1]!.x1 - x, measure);
  if (!text) return null;
  const bottom = Math.min(...piece.map((c) => c.top)) - OUTSIDE_GAP_PX;
  const textY = bottom - (/[gjpqy,;]/.test(text) ? DESCENDER_PX : 0);
  return { text, x, y: bottom - OUTSIDE_NAME_PX, width: measure(text), height: OUTSIDE_NAME_PX, textX: x, textY };
}

export type PieceName = NamePlacement & { piece: number; outside: boolean };

/**
 * T-11: names for every piece of one bar. With daily detail every piece is named, so the piece after a break is
 * not mistaken for another assignment; zoomed out (`sparse`), the first named piece plus any later piece at least
 * LATER_PIECE_NAME_FACTOR times its name's width. Returns the piece index with each placement.
 * T-11d: with `outside`, a piece thinner than NAME_PATCH_PX gets its name just above it (T-11e).
 */
export function placePieceNames(
  title: string, pieces: readonly (readonly BandColumn[])[], cy: number, sparse: boolean, measure: MeasureText = estimateTextWidth,
  outside = false,
): PieceName[] {
  const out: PieceName[] = [];
  pieces.forEach((piece, i) => {
    const inside = placePieceName(title, piece, cy, measure);
    // Only a thin piece (nowhere NAME_PATCH_PX thick) goes outside; a thick piece too short for its name stays unnamed.
    const thin = piece.every((c) => c.bottom - c.top < NAME_PATCH_PX);
    const name = inside ?? (!outside || !thin ? null : placeOutsideName(title, piece, measure));
    if (!name) return;
    const width = piece[piece.length - 1]!.x1 - piece[0]!.x0;
    if (sparse && out.length > 0 && width < LATER_PIECE_NAME_FACTOR * name.width) return;
    out.push({ ...name, piece: i, outside: !inside });
  });
  return out;
}
