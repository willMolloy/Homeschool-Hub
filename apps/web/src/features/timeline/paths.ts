/** T-03: SVG path strings for bands. Pure string building, so the renderer only sets `d`. */

/** One drawn column of a band: x from x0 to x1, y from top to bottom. */
export interface BandColumn {
  x0: number;
  x1: number;
  top: number;
  bottom: number;
}

/** Bars get slightly rounded ends (agreed), never more than half their height or width. */
export const CORNER_RADIUS_PX = 2;

const f = (n: number) => (Math.round(n * 10) / 10).toString();

/**
 * A closed path for one run of touching columns: stepped top and bottom edges, rounded only at the run's
 * four outer corners. An empty run draws nothing.
 */
export function runPath(run: readonly BandColumn[], radius = CORNER_RADIUS_PX): string {
  if (run.length === 0) return "";
  const first = run[0]!;
  const last = run[run.length - 1]!;
  const r = (c: BandColumn) => Math.max(0, Math.min(radius, (c.bottom - c.top) / 2, (c.x1 - c.x0) / 2));
  const r0 = r(first);
  const rn = r(last);
  const d: string[] = [`M${f(first.x0)},${f(first.top + r0)}`, `Q${f(first.x0)},${f(first.top)} ${f(first.x0 + r0)},${f(first.top)}`];
  run.forEach((c, i) => {
    if (i > 0) d.push(`V${f(c.top)}`);
    d.push(`H${f(i === run.length - 1 ? c.x1 - rn : c.x1)}`);
  });
  d.push(`Q${f(last.x1)},${f(last.top)} ${f(last.x1)},${f(last.top + rn)}`, `V${f(last.bottom - rn)}`, `Q${f(last.x1)},${f(last.bottom)} ${f(last.x1 - rn)},${f(last.bottom)}`);
  for (let i = run.length - 1; i >= 0; i--) {
    const c = run[i]!;
    d.push(`H${f(i === 0 ? c.x0 + r0 : c.x0)}`);
    if (i > 0) d.push(`V${f(run[i - 1]!.bottom)}`);
  }
  d.push(`Q${f(first.x0)},${f(first.bottom)} ${f(first.x0)},${f(first.bottom - r0)}`, "Z");
  return d.join(" ");
}

/** Split columns (null = not drawn) into runs of touching columns and join their paths. */
export function bandPath(columns: readonly (BandColumn | null)[], radius = CORNER_RADIUS_PX): string {
  const runs: BandColumn[][] = [];
  let run: BandColumn[] = [];
  for (const c of columns) {
    if (c) {
      run.push(c);
    } else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  return runs.map((r) => runPath(r, radius)).join(" ");
}

/** Plain rectangles as one path (event marks), so a strip is a single SVG node. */
export const rectsPath = (rects: readonly { x: number; y: number; w: number; h: number }[]): string =>
  rects.map((r) => `M${f(r.x)},${f(r.y)} h${f(r.w)} v${f(r.h)} h${f(-r.w)} Z`).join(" ");
