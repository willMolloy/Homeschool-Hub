/**
 * T-11: keep different assignments apart and one assignment together. Pure geometry, used by layout.ts.
 *
 * - Each assignment's outer ends are pulled in by half of ASSIGNMENT_GAP_PX, so two neighbours in a row never
 *   touch (visual only: the dates do not change).
 * - A piece is a run of touching columns; consecutive pieces of the same assignment (split by a break) are joined
 *   by a connector along the row's centre. Connectors are only ever built from one assignment's own pieces.
 */
import type { BandColumn } from "./paths";

/** The visible gap between two neighbouring assignments in a row, at every zoom. */
export const ASSIGNMENT_GAP_PX = 2.5;
/** An assignment never shrinks below this width because of the gap. */
const MIN_WIDTH_PX = 1;

/** The columns with the assignment's first and last drawn edges pulled in by `inset` (columns wholly inside it are dropped). */
export function insetEnds(columns: readonly (BandColumn | null)[], inset = ASSIGNMENT_GAP_PX / 2): (BandColumn | null)[] {
  const drawn = columns.flatMap((c, i) => (c ? [i] : []));
  if (drawn.length === 0) return [...columns];
  const left = columns[drawn[0]!]!.x0;
  const right = columns[drawn[drawn.length - 1]!]!.x1;
  const g = Math.max(0, Math.min(inset, (right - left - MIN_WIDTH_PX) / 2));
  if (g === 0) return [...columns];
  return columns.map((c) => {
    if (!c) return null;
    const x0 = Math.max(c.x0, left + g);
    const x1 = Math.min(c.x1, right - g);
    return x1 > x0 ? { ...c, x0, x1 } : null;
  });
}

/** Runs of touching columns (null splits a run). */
export function piecesOf(columns: readonly (BandColumn | null)[]): BandColumn[][] {
  const pieces: BandColumn[][] = [];
  let run: BandColumn[] = [];
  for (const c of columns) {
    if (c) run.push(c);
    else if (run.length) {
      pieces.push(run);
      run = [];
    }
  }
  if (run.length) pieces.push(run);
  return pieces;
}

/** The spans between consecutive pieces of one assignment, where its connector goes. */
export function connectorsOf(pieces: readonly (readonly BandColumn[])[]): { x0: number; x1: number }[] {
  const out: { x0: number; x1: number }[] = [];
  for (let i = 1; i < pieces.length; i++) {
    const x0 = pieces[i - 1]![pieces[i - 1]!.length - 1]!.x1;
    const x1 = pieces[i]![0]!.x0;
    if (x1 > x0) out.push({ x0, x1 });
  }
  return out;
}
