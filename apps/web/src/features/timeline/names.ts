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

/** The longest "prefix…" with at least MIN_NAME_CHARS characters that fits, else null. */
function cutToRoom(text: string, room: number, measure: MeasureText): string | null {
  for (let n = text.length - 1; n >= MIN_NAME_CHARS; n--) {
    const prefix = text.slice(0, n).trimEnd();
    if (prefix.length < MIN_NAME_CHARS) break;
    const candidate = `${prefix}${ELLIPSIS}`;
    if (measure(candidate) <= room) return candidate;
  }
  return null;
}

/** The days a label must still show. "Mon–Thu · E C" and "Tue–Fri ✓" both give the days. */
export function daysToken(keep: string): string {
  return keep.split(" · ")[0]!.replace(/ ✓$/, "");
}

/**
 * S18c-03: `keep` (the days, then a together-bar's initials or a finished check) stays when it fits.
 * The title in front of it may shorten. When the initials no longer fit, the days themselves stay.
 * Null only when even those days do not fit in `room`.
 */
export function fitKeepingSuffix(text: string, keep: string, room: number, measure: MeasureText): string | null {
  const days = daysToken(keep);
  if (!days || !text.includes(days)) return null;
  if (measure(text) <= room) return text;
  const tails = text.endsWith(keep) && keep !== days ? [keep, days] : [days];
  for (const ending of tails) {
    if (measure(ending) > room) continue;
    const at = text.lastIndexOf(ending);
    const prefix = at < 0 ? "" : text.slice(0, at).replace(/\s*·\s*$/, "");
    if (!prefix) return ending;
    const joiner = ` · ${ending}`;
    for (let n = prefix.length; n >= 1; n--) {
      const head = prefix.slice(0, n).trimEnd();
      if (!head) continue;
      const candidate = `${head}${ELLIPSIS}${joiner}`;
      if (measure(candidate) <= room) return candidate;
    }
    const short = `${ELLIPSIS}${joiner}`;
    if (measure(short) <= room) return short;
    return ending;
  }
  return null;
}

/** The days ending of a drawn bar title, including a check or "Stopped" that follows the days. */
export function daysEnding(drawn: string, daysLabel: string | undefined): string | undefined {
  if (!daysLabel) return undefined;
  const mark = ` · ${daysLabel}`;
  const at = drawn.lastIndexOf(mark);
  if (at < 0) return daysLabel;
  return drawn.slice(at + " · ".length) || undefined;
}

/**
 * The full title if it fits in `room`, else (unless `fullOnly`) the longest "prefix…" with at least MIN_NAME_CHARS
 * characters, else null. S18c-03: when `keep` is set, that ending is not the part that is cut.
 */
export function fitName(title: string, room: number, measure: MeasureText = estimateTextWidth, fullOnly = false, keep?: string): string | null {
  const text = title.trim();
  if (!text) return null;
  if (measure(text) <= room) return text;
  if (fullOnly) return null;
  if (keep) return fitKeepingSuffix(text, keep, room, measure);
  return cutToRoom(text, room, measure);
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
  title: string, columns: readonly (BandColumn | null)[], cy: number, measure: MeasureText = estimateTextWidth, fullOnly = false, keep?: string,
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
    const text = fitName(title, room, measure, fullOnly, fullOnly ? undefined : keep);
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
  title: string, piece: readonly BandColumn[], cy: number, measure: MeasureText = estimateTextWidth, fullOnly = false, keep?: string,
): NamePlacement | null {
  return placeName(title, piece, cy, measure, fullOnly, keep);
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
 * outside to its right while the row is free (`limitX`: the next bar's start, or the plot's edge), else outside to its left when no
 * bar sits earlier in the row (`bounds.left` is then the plot's edge, else infinite). Never over another bar's label (S14-00, N1)
 * and never a bare stub. Null when there is no free room for it.
 */
export function placeStoppedWord(
  piece: readonly BandColumn[], cy: number, limitX: number, bounds: PlotBounds, measure: MeasureText = estimateTextWidth,
): (NamePlacement & { outside: boolean }) | null {
  const inside = placePieceName(STOPPED_WORD, piece, cy, measure, true);
  if (inside) return { ...inside, outside: false };
  const right = placeRightName(STOPPED_WORD, piece, cy, limitX, measure);
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
  limits?: readonly number[], stopped?: PlotBounds, keep?: string,
): PieceName[] {
  const out: PieceName[] = [];
  pieces.forEach((piece, i) => {
    const full = placePieceName(title, piece, cy, measure, true);
    const right = full || !limits ? null : placeRightName(title, piece, cy, limits[i] ?? Number.NEGATIVE_INFINITY, measure);
    const name = full ?? right ?? placePieceName(title, piece, cy, measure, false, keep);
    if (!name) return;
    const width = piece[piece.length - 1]!.x1 - piece[0]!.x0;
    if (sparse && out.length > 0 && width < LATER_PIECE_NAME_FACTOR * name.width) return;
    out.push({ ...name, piece: i, outside: name === right });
  });
  // S18c-03: a thin bar (under the inside-name thickness) or a bar whose full title will not fit beside it
  // was left with no name at all. The days still have to be readable. Draw them on the longest piece even
  // when that piece is too thin for an ordinary inside name.
  if (keep) {
    const days = daysToken(keep);
    if (days && !out.some((n) => n.text.includes(days)) && pieces.length > 0) {
      let best = 0;
      let bestW = -1;
      pieces.forEach((p, i) => {
        const w = p[p.length - 1]!.x1 - p[0]!.x0;
        if (w > bestW) { bestW = w; best = i; }
      });
      const piece = pieces[best]!;
      const x0 = piece[0]!.x0;
      const x1 = piece[piece.length - 1]!.x1;
      const insideRoom = x1 - x0 - 2 * NAME_INSET_PX - 2 * NAME_PAD_PX;
      const inside = insideRoom > 0 ? fitKeepingSuffix(title, keep, insideRoom, measure) : null;
      if (inside) {
        const width = measure(inside) + 2 * NAME_PAD_PX;
        const x = x0 + NAME_INSET_PX;
        out.push({ text: inside, x, y: cy - NAME_FONT_PX / 2, width, height: NAME_FONT_PX, textX: x + NAME_PAD_PX, textY: cy, piece: best, outside: false });
      } else if (limits) {
        const x = x1 + OUTSIDE_GAP_PX;
        const room = (limits[best] ?? Number.NEGATIVE_INFINITY) - OUTSIDE_CLEAR_PX - x;
        const beside = room > 0 ? fitKeepingSuffix(title, keep, room, measure) : null;
        if (beside) {
          out.push({ text: beside, x, y: cy - NAME_FONT_PX / 2, width: measure(beside), height: NAME_FONT_PX, textX: x, textY: cy, piece: best, outside: true });
        }
      }
    }
  }
  // S13-00: a stopped bar always says so. If no name carries the word (cut, or none at all), "Stopped" stands alone on the last piece.
  if (stopped && pieces.length > 0 && !out.some((n) => n.text.endsWith(STOPPED_WORD))) {
    const last = pieces.length - 1;
    const word = placeStoppedWord(pieces[last]!, cy, limits?.[last] ?? stopped.right, stopped, measure);
    if (word) return [{ ...word, piece: last }];
  }
  return out;
}

/** S17-01 (Sprint 15 N2): the height a row gains for its name when its blocks are too thin for any name (daily detail only). */
export const ABOVE_NAME_PX = 14;

/**
 * S17-01 (Sprint 15 N2, Will): a thin row's name on its own small muted line just above the row, left-aligned with the row's first
 * visible block (`x0`), centred on `cy`. Never cut; kept inside the plot by sliding left when it would run past the right edge. Null
 * when it cannot fit in the plot at all.
 */
export function placeNameAbove(title: string, x0: number, cy: number, plotLeft: number, plotRight: number, measure: MeasureText = estimateTextWidth): NamePlacement | null {
  const text = title.trim();
  if (!text) return null;
  const width = measure(text);
  const x = Math.max(plotLeft, Math.min(x0, plotRight - width));
  if (x < plotLeft || x + width > plotRight) return null;
  return { text, x, y: cy - NAME_FONT_PX / 2, width, height: NAME_FONT_PX, textX: x, textY: cy };
}
