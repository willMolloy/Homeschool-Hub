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

/** T-05c: an end plateau narrower than this joins its neighbour, so a bar starts and ends without a jog. */
export const SMOOTH_END_MIN_PX = 12;

/**
 * T-05c: a smooth closed outline for one run of touching columns. Each stretch of equal thickness (a plateau)
 * contributes its centre; monotone cubic curves (no overshoot) join the centres, so a change in thickness eases
 * across the two plateaus either side of it. The run starts and ends square at full thickness.
 */
export function smoothRunPath(run: readonly BandColumn[]): string {
  if (run.length === 0) return "";
  const plateaus: { x0: number; x1: number; top: number; bottom: number }[] = [];
  for (const c of run) {
    const p = plateaus[plateaus.length - 1];
    if (p && p.top === c.top && p.bottom === c.bottom) p.x1 = c.x1;
    else plateaus.push({ x0: c.x0, x1: c.x1, top: c.top, bottom: c.bottom });
  }
  // A sliver of a plateau at either end would be a jog at the start or end: it takes its neighbour's thickness.
  while (plateaus.length > 1 && plateaus[0]!.x1 - plateaus[0]!.x0 < SMOOTH_END_MIN_PX) plateaus[1]!.x0 = plateaus.shift()!.x0;
  while (plateaus.length > 1 && plateaus.at(-1)!.x1 - plateaus.at(-1)!.x0 < SMOOTH_END_MIN_PX) plateaus.at(-2)!.x1 = plateaus.pop()!.x1;
  const first = plateaus[0]!;
  const last = plateaus[plateaus.length - 1]!;
  const pts = [
    { x: first.x0, top: first.top, bottom: first.bottom },
    ...(plateaus.length > 1 ? plateaus.map((p) => ({ x: (p.x0 + p.x1) / 2, top: p.top, bottom: p.bottom })) : []),
    { x: last.x1, top: last.top, bottom: last.bottom },
  ];
  const top = pts.map((p) => [p.x, p.top] as const);
  const bottom = pts.map((p) => [p.x, p.bottom] as const).reverse();
  return [`M${f(top[0]![0])},${f(top[0]![1])}`, monotoneCurve(top), `V${f(bottom[0]![1])}`, monotoneCurve(bottom), "Z"].join(" ");
}

/** Smooth outlines for every run (the zoomed-out counterpart of bandPath). */
export function smoothBandPath(columns: readonly (BandColumn | null)[]): string {
  const runs: BandColumn[][] = [];
  let run: BandColumn[] = [];
  for (const c of columns) {
    if (c && run.length && Math.abs(c.x0 - run[run.length - 1]!.x1) > 0.5) {
      runs.push(run);
      run = [];
    }
    if (c) run.push(c);
    else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  return runs.map(smoothRunPath).join(" ");
}

/** Cubic segments through points (x monotonic, either direction) with Fritsch–Carlson monotone tangents. */
function monotoneCurve(p: ReadonlyArray<readonly [number, number]>): string {
  const n = p.length;
  if (n < 2) return "";
  const dx = (i: number) => p[i + 1]![0] - p[i]![0];
  const secant = (i: number) => (dx(i) === 0 ? 0 : (p[i + 1]![1] - p[i]![1]) / dx(i));
  const m: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i === 0) m.push(secant(0));
    else if (i === n - 1) m.push(secant(n - 2));
    else {
      const a = secant(i - 1);
      const b = secant(i);
      m.push(a * b <= 0 ? 0 : (3 * (dx(i - 1) + dx(i))) / ((2 * dx(i) + dx(i - 1)) / a + (dx(i) + 2 * dx(i - 1)) / b));
    }
  }
  const out: string[] = [];
  for (let i = 0; i < n - 1; i++) {
    const h = dx(i) / 3;
    const [x0, y0] = p[i]!;
    const [x1, y1] = p[i + 1]!;
    if (y0 === y1 && m[i] === 0 && m[i + 1] === 0) out.push(`L${f(x1)},${f(y1)}`);
    else out.push(`C${f(x0 + h)},${f(y0 + m[i]! * h)} ${f(x1 - h)},${f(y1 - m[i + 1]! * h)} ${f(x1)},${f(y1)}`);
  }
  return out.join(" ");
}
