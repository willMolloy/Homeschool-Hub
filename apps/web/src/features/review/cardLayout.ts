/**
 * S13-05: the Term in review card, laid out as drawing items on a fixed 1080 x 1350 canvas (4:5), after the UX mockup
 * (`docs/design/mockups/term-review.html`, notes in `docs/design/term-review-notes.md`). One layout feeds both the on-screen
 * preview and the saved PNG, so what you see is what is saved. Pure: text is measured with the `measure` it is given.
 *
 * - Three or more parts: three stat tiles (school days, finished, books read), time by subject as bars, then two lists.
 * - One or two parts (and not both lists): the roomy card: one large number, large rows, a closing sprig.
 * - A list never scrolls, never shrinks its text and never runs onto a second image: it shows the rows that fit, and the last row
 *   becomes "and N more". The tiles keep the true totals. A part with no data is left out, never shown as 0.
 */
import type { Subject } from "../../api/types";
import { formatRangeYears } from "../../lib/dates";
import { formatMinutes } from "../records/entryText";
import { subjectSlots } from "../timeline/model";
import { cardColors, slotHue, type CardColors, type CardTheme, type Hue } from "./cardPalette";
import type { TermReview } from "./termReview";

export const CARD_W = 1080;
export const CARD_H = 1350;
const PAD = 72;
const BODY_W = CARD_W - 2 * PAD;
const BAND_H = 290;
const BOTTOM = CARD_H - 52;
const GAP = 34;

export type Font = "serif" | "sans";
export type IconName = "book" | "leaf" | "plant" | string;
export type Item =
  | { k: "rect"; x: number; y: number; w: number; h: number; r: number; fill: string; stroke?: string; sw?: number }
  | { k: "text"; x: number; y: number; text: string; size: number; weight: number; fill: string; font: Font; anchor?: "start" | "end"; ls?: number }
  | { k: "badge"; cx: number; cy: number; d: number; hue: Hue; icon: string | null | undefined; letter: string }
  | { k: "icon"; x: number; y: number; size: number; name: IconName; fill: string };

export interface CardInput {
  review: TermReview;
  /** "Fall", "Year" … the family's name for the range. */
  rangeLabel: string;
  /** True for the whole school year ("Year in review", "2026–27"). */
  isYear: boolean;
  subjects: readonly Subject[];
  theme: CardTheme;
  /** Width in px of a string at a font size and weight, in the card's fonts. */
  measure: (text: string, size: number, weight: number, font: Font) => number;
}
export interface CardLayout { width: number; height: number; colors: CardColors; items: Item[]; roomy: boolean; title: string; moreCount: number }

/** "Fall 2026"; "2026–27" for a year that spans two calendar years. */
export function termTitle(rangeLabel: string, isYear: boolean, start: string, end: string): string {
  const y1 = start.slice(0, 4), y2 = end.slice(0, 4);
  if (isYear) return y1 === y2 ? y1 : `${y1}–${y2.slice(2)}`;
  return /\b\d{4}\b/.test(rangeLabel) ? rangeLabel : `${rangeLabel} ${y1}`;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function layoutCard(input: CardInput): CardLayout {
  const { review: r, subjects, theme, measure } = input;
  const colors = cardColors(theme, r.childColor);
  const slot = subjectSlots(subjects);
  const subjectOf = (id: string) => subjects.find((s) => s.id === id);
  const hueOf = (id: string) => slotHue(theme, slot(id));
  const items: Item[] = [];
  let moreCount = 0;
  const text = (x: number, y: number, t: string, size: number, weight: number, fill: string, font: Font = "sans", extra: { anchor?: "start" | "end"; ls?: number } = {}) =>
    items.push({ k: "text", x, y, text: t, size, weight, fill, font, ...extra });
  const fit = (t: string, size: number, weight: number, font: Font, room: number): string => {
    if (measure(t, size, weight, font) <= room) return t;
    let s = t;
    while (s.length > 1 && measure(`${s.trimEnd()}…`, size, weight, font) > room) s = s.slice(0, -1);
    return `${s.trimEnd()}…`;
  };
  const badgeFor = (id: string, cx: number, cy: number, d: number) => {
    const s = subjectOf(id);
    items.push({ k: "badge", cx, cy, d, hue: hueOf(id), icon: s?.icon, letter: (s?.name.trim()[0] ?? "?").toUpperCase() });
  };

  // The band.
  const title = `${r.childName} · ${termTitle(input.rangeLabel, input.isYear, r.start, r.end)}`;
  items.push({ k: "rect", x: 0, y: 0, w: CARD_W, h: BAND_H, r: 0, fill: colors.band });
  text(PAD, 80, input.isYear ? "YEAR IN REVIEW" : "TERM IN REVIEW", 24, 800, colors.kid.strong, "sans", { ls: 3.84 });
  const markW = measure("Homeschool Hub", 22, 700, "sans");
  text(CARD_W - PAD, 80, "Homeschool Hub", 22, 700, colors.muted, "sans", { anchor: "end" });
  items.push({ k: "icon", x: CARD_W - PAD - markW - 10 - 26, y: 59, size: 26, name: "leaf", fill: colors.kid.strong });
  const size = [88, 72, 60].find((s) => measure(title, s, 600, "serif") <= BODY_W) ?? 60;
  text(PAD, 187, fit(title, size, 600, "serif", BODY_W), size, 600, colors.kid.strong, "serif");
  text(PAD, 243, formatRangeYears(r.start, r.end), 28, 600, colors.muted);

  // What there is to show.
  const hasHours = r.bySubject.length > 0;
  const hasTotalOnly = !hasHours && r.totalMinutes !== null;
  const hasFinished = r.finished.length > 0;
  const hasBooks = r.books.length > 0;
  const hasDays = r.schoolDays !== null;
  const parts = [hasDays, hasFinished, hasBooks, hasHours || hasTotalOnly].filter(Boolean).length;
  const roomy = parts <= 2 && !(hasFinished && hasBooks);

  /** Bars: time by subject, capped at 8 rows (the rest as "and N more"). Returns the next y. */
  const bars = (y0: number): number => {
    const rows = r.bySubject.slice(0, 8);
    let y = y0;
    text(PAD, y + 22, "TIME BY SUBJECT", 22, 800, colors.muted, "sans", { ls: 3.08 });
    if (r.totalMinutes !== null) text(CARD_W - PAD, y + 22, `${formatMinutes(r.totalMinutes)} in all`, 24, 700, colors.muted, "sans", { anchor: "end" });
    y += 48;
    const nameW = Math.max(...rows.map((s) => 36 + 14 + measure(s.name, 26, 700, "sans")));
    const valW = Math.max(...rows.map((s) => measure(formatMinutes(s.minutes), 26, 700, "sans")));
    const trackX = PAD + nameW + 20, trackW = BODY_W - nameW - valW - 40;
    const most = Math.max(...rows.map((s) => s.minutes));
    rows.forEach((s, i) => {
      const cy = y + i * 46 + 18;
      badgeFor(s.subjectId, PAD + 18, cy, 36);
      text(PAD + 50, cy + 9, fit(s.name, 26, 700, "sans", nameW - 50), 26, 700, colors.ink);
      items.push({ k: "rect", x: trackX, y: cy - 14, w: Math.max(28, (s.minutes / most) * trackW), h: 28, r: 14, fill: hueOf(s.subjectId).pastel });
      text(CARD_W - PAD, cy + 9, formatMinutes(s.minutes), 26, 700, colors.ink, "sans", { anchor: "end" });
    });
    y += rows.length * 46 - 10;
    if (r.bySubject.length > rows.length) { y += 36; text(PAD + 50, y - 8, `and ${r.bySubject.length - rows.length} more`, 24, 700, colors.muted); }
    return y;
  };

  /** The rows that fit in `capacity` slots; when they don't all fit, the last slot is "and N more". */
  const slots = <T,>(all: readonly T[], capacity: number): { shown: T[]; more: number } => {
    const cap = Math.max(1, capacity);
    return all.length <= cap ? { shown: [...all], more: 0 } : { shown: all.slice(0, cap - 1), more: all.length - (cap - 1) };
  };

  if (!roomy) {
    let y = BAND_H + 36;
    const tiles: { value: string; label: string }[] = [];
    if (hasDays) tiles.push({ value: String(r.schoolDays), label: plural(r.schoolDays!, "school day", "school days") });
    if (hasFinished) tiles.push({ value: String(r.finished.length), label: "finished" });
    if (hasBooks) tiles.push({ value: String(r.books.length), label: plural(r.books.length, "book finished", "books finished") });
    if (hasTotalOnly) tiles.push({ value: formatMinutes(r.totalMinutes!), label: "hours in all" });
    if (tiles.length > 0) {
      const w = (BODY_W - 20 * (tiles.length - 1)) / tiles.length;
      tiles.forEach((t, i) => {
        const x = PAD + i * (w + 20);
        items.push({ k: "rect", x: x + 1, y: y + 1, w: w - 2, h: 176, r: 28, fill: colors.card, stroke: colors.line, sw: 2 });
        const vs = [88, 72, 60, 48].find((s) => measure(t.value, s, 600, "serif") <= w - 56) ?? 48;
        text(x + 30, y + 98, t.value, vs, 600, colors.ink, "serif");
        text(x + 30, y + 149, fit(t.label, 26, 700, "sans", w - 56), 26, 700, colors.muted);
      });
      y += 178 + GAP;
    }
    if (hasHours) y = bars(y) + GAP;
    if (hasFinished || hasBooks) {
      const both = hasFinished && hasBooks;
      const colW = both ? (BODY_W - 48) / 2 : BODY_W;
      const rowsTop = y + 48;
      const avail = BOTTOM - rowsTop;
      const list = (x: number, head: string, n: number, rowH: number, draw: (i: number, cy: number) => void, moreIndent: number) => {
        text(x, y + 22, head, 22, 800, colors.muted, "sans", { ls: 3.08 });
        const { shown, more } = slots(Array.from({ length: n }, (_, i) => i), Math.floor(avail / rowH));
        shown.forEach((i, row) => draw(i, rowsTop + row * rowH + rowH / 2));
        if (more > 0) { moreCount += more; text(x + moreIndent, rowsTop + shown.length * rowH + rowH / 2 + 8, `and ${more} more`, 24, 700, colors.muted); }
      };
      if (hasFinished) list(PAD, "FINISHED", r.finished.length, 48, (i, cy) => {
        const f = r.finished[i]!;
        badgeFor(f.subjectId, PAD + 18, cy, 36);
        text(PAD + 50, cy + 9, fit(f.title, 26, 700, "sans", colW - 50), 26, 700, colors.ink);
      }, 50);
      if (hasBooks) {
        const x = both ? PAD + colW + 48 : PAD;
        list(x, "BOOKS FINISHED", r.books.length, 40, (i, cy) => {
          items.push({ k: "icon", x, y: cy - 12, size: 24, name: "book", fill: colors.muted });
          text(x + 38, cy + 9, fit(r.books[i]!, 27, 500, "serif", colW - 38), 27, 500, colors.ink, "serif");
        }, 38);
      }
    }
  } else {
    let y = BAND_H + 56;
    // The hero: one large number and its words.
    const hero = hasFinished ? { value: String(r.finished.length), words: [plural(r.finished.length, "assignment", "assignments"), "finished"] }
      : hasBooks ? { value: String(r.books.length), words: [plural(r.books.length, "book", "books"), "finished"] }
      : hasHours || hasTotalOnly ? { value: formatMinutes(r.totalMinutes!), words: ["in all"] }
      : hasDays ? { value: String(r.schoolDays), words: ["school", plural(r.schoolDays!, "day", "days")] }
      : null;
    const heroIsDays = !hasFinished && !hasBooks && !hasHours && !hasTotalOnly;
    if (hero) {
      const hs = [200, 150, 110, 80].find((s) => measure(hero.value, s, 600, "serif") <= BODY_W - 260) ?? 80;
      text(PAD, y + hs * 0.8, hero.value, hs, 600, colors.kid.strong, "serif");
      const wx = PAD + measure(hero.value, hs, 600, "serif") + 28;
      hero.words.forEach((w, i) => text(wx, y + hs * 0.8 - (hero.words.length - 1 - i) * 48, w, 40, 700, colors.ink));
      y += hs * 0.8 + 44;
    }
    if (hasDays && !heroIsDays) {
      text(PAD, y + 30, `across ${r.schoolDays} ${plural(r.schoolDays!, "school day", "school days")}`, 32, 700, colors.muted);
      y += 30 + GAP + 10;
    }
    if (hasHours) y = bars(y) + GAP + 10;
    const closeTop = BOTTOM - 40;
    const area = closeTop - 44 - y;
    if (hasFinished) {
      const two = r.finished.length > 6;
      const rowH = two ? 80 : 106, cols = two ? 2 : 1, colW = two ? (BODY_W - 48) / 2 : BODY_W;
      const perCol = Math.max(1, Math.floor(area / rowH));
      const { shown, more } = slots(r.finished, perCol * cols);
      const draw = (f: TermReview["finished"][number] | null, idx: number) => {
        const col = Math.floor(idx / perCol), row = idx % perCol;
        const x = PAD + col * (colW + 48), top = y + row * rowH;
        if (!two && row > 0) items.push({ k: "rect", x: PAD, y: top - 1, w: BODY_W, h: 2, r: 0, fill: colors.line });
        if (!f) return;
        badgeFor(f.subjectId, x + (two ? 28 : 32), top + rowH / 2, two ? 56 : 64);
        const tx = x + (two ? 28 : 32) + (two ? 28 : 32) + 24, room = colW - (tx - x);
        const when = `${subjectOf(f.subjectId)?.name ?? f.subjectName} · finished ${shortDate(f.finishedOn)}`;
        text(tx, top + rowH / 2 - (two ? 4 : 6), fit(f.title, two ? 30 : 36, 700, "sans", room), two ? 30 : 36, 700, colors.ink);
        text(tx, top + rowH / 2 + (two ? 26 : 34), fit(when, two ? 24 : 26, 600, "sans", room), two ? 24 : 26, 600, colors.muted);
      };
      shown.forEach((f, i) => draw(f, i));
      if (more > 0) {
        moreCount += more;
        const idx = shown.length, col = Math.floor(idx / perCol), row = idx % perCol;
        const x = PAD + col * (colW + 48), top = y + row * rowH;
        text(x + (two ? 88 : 96), top + rowH / 2 + 10, `and ${more} more`, 28, 700, colors.muted);
      }
    } else if (hasBooks) {
      const two = r.books.length > 8;
      const rowH = two ? 64 : 80, cols = two ? 2 : 1, colW = two ? (BODY_W - 48) / 2 : BODY_W;
      const perCol = Math.max(1, Math.floor(area / rowH));
      const { shown, more } = slots(r.books, perCol * cols);
      const at = (idx: number) => ({ x: PAD + Math.floor(idx / perCol) * (colW + 48), top: y + (idx % perCol) * rowH });
      shown.forEach((b, i) => {
        const { x, top } = at(i);
        items.push({ k: "icon", x, y: top + rowH / 2 - 16, size: 32, name: "book", fill: colors.muted });
        text(x + 52, top + rowH / 2 + 12, fit(b, two ? 30 : 36, 500, "serif", colW - 52), two ? 30 : 36, 500, colors.ink, "serif");
      });
      if (more > 0) { moreCount += more; const { x, top } = at(shown.length); text(x + 52, top + rowH / 2 + 10, `and ${more} more`, 28, 700, colors.muted); }
    }
    // The closing sprig, so the page ends on purpose.
    items.push({ k: "rect", x: PAD, y: closeTop + 19, w: (BODY_W - 40 - 48) / 2, h: 2, r: 0, fill: colors.line });
    items.push({ k: "rect", x: CARD_W - PAD - (BODY_W - 40 - 48) / 2, y: closeTop + 19, w: (BODY_W - 40 - 48) / 2, h: 2, r: 0, fill: colors.line });
    items.push({ k: "icon", x: CARD_W / 2 - 20, y: closeTop, size: 40, name: "plant", fill: colors.kid.strong });
  }
  return { width: CARD_W, height: CARD_H, colors, items, roomy, title, moreCount };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Oct 16" from a YYYY-MM-DD. */
const shortDate = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;
