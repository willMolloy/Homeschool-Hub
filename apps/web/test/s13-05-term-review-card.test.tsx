/** S13-05: the Term in review card: its layout (parts only with data, roomy, long lists), the page, Save image and Print, and that nothing leaves the device. */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Assignment, Child, FamilySettings, RecordEntry, RecordTotals, Subject } from "../src/api/types";
import { layoutCard, termTitle, type CardInput, type Item } from "../src/features/review/cardLayout";
import { CHROME, SUBJECT_HUES } from "../scripts/palette";
import { cardColors, HUES } from "../src/features/review/cardPalette";
import { cardSvgMarkup, fileNameFor } from "../src/features/review/exportCard";
import type { TermReview } from "../src/features/review/termReview";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const exportSpies = vi.hoisted(() => ({ saveImages: vi.fn(), cardToPng: vi.fn() }));
vi.mock("../src/features/review/exportCard", async (orig) => ({ ...(await orig<typeof import("../src/features/review/exportCard")>()), saveImages: exportSpies.saveImages, cardToPng: exportSpies.cardToPng }));

const SUBJECTS = [
  { id: "lit", name: "Literature", color: "#7a5cc2", sortOrder: 0, archived: false, icon: "book" },
  { id: "math", name: "Math", color: "#2f8f6f", sortOrder: 1, archived: false, icon: "calculator" },
  { id: "hist", name: "History", color: "#b08a2f", sortOrder: 2, archived: false, icon: "scroll" },
] as Subject[];
const measure: CardInput["measure"] = (t, size) => t.length * size * 0.5;
const review = (over: Partial<TermReview> = {}): TermReview => ({
  childId: "c1", childName: "Frank", childColor: "#2f6fb0", start: "2026-08-31", end: "2026-12-31", finished: [], books: [], bySubject: [], totalMinutes: null, schoolDays: null, ...over,
});
const fin = (n: number) => Array.from({ length: n }, (_, i) => ({ assignmentId: `a${i}`, title: `Book number ${i + 1}`, subjectId: i % 2 ? "math" : "lit", subjectName: i % 2 ? "Math" : "Literature", finishedOn: `2026-10-${String(1 + (i % 28)).padStart(2, "0")}` }));
const layout = (r: TermReview, over: Partial<CardInput> = {}) => layoutCard({ review: r, rangeLabel: "Fall", isYear: false, subjects: SUBJECTS, theme: "light", measure, ...over });
const texts = (items: readonly Item[]) => items.flatMap((i) => (i.k === "text" ? [i.text] : []));
const FULL = review({
  finished: fin(6), books: ["Treasure Island", "Heidi", "Pagoo"], schoolDays: 72, totalMinutes: 3600,
  bySubject: [{ subjectId: "lit", name: "Literature", minutes: 2100 }, { subjectId: "math", name: "Math", minutes: 1500 }],
});

describe("the card's layout (S13-05)", () => {
  it("is 1080 x 1350, titled with the child and the term, with the real numbers on the tiles", () => {
    const l = layout(FULL);
    expect([l.width, l.height]).toEqual([1080, 1350]);
    expect(l.title).toBe("Frank · Fall 2026");
    const t = texts(l.items);
    expect(t).toEqual(expect.arrayContaining(["TERM IN REVIEW", "Homeschool Hub", "Frank · Fall 2026", "Aug 31 – Dec 31, 2026", "72", "school days", "6", "finished", "3", "books finished", "TIME BY SUBJECT", "60 h in all", "35 h", "25 h", "FINISHED"])); // S16-09 (N4): books finished is a number only, no second list
    expect(t).not.toContain("BOOKS FINISHED");
    expect(l.roomy).toBe(false);
  });
  it("a year says so: 'Year in review' and 2026–27", () => {
    expect(termTitle("Year", true, "2026-08-31", "2027-05-28")).toBe("2026–27");
    expect(termTitle("Year", true, "2026-01-01", "2026-12-31")).toBe("2026");
    expect(termTitle("Fall", false, "2026-08-31", "2026-12-31")).toBe("Fall 2026");
    expect(termTitle("Fall 2026", false, "2026-08-31", "2026-12-31")).toBe("Fall 2026");
    const l = layout(FULL, { isYear: true, rangeLabel: "Year", review: { ...FULL, end: "2027-05-28" } });
    expect(texts(l.items)).toContain("YEAR IN REVIEW");
    expect(l.title).toBe("Frank · 2026–27");
  });
  it("a part with no data is left out, never shown as 0", () => {
    const l = layout(review({ finished: fin(3), books: ["Heidi"], schoolDays: null }));
    const t = texts(l.items);
    expect(t).not.toContain("TIME BY SUBJECT");
    expect(t).not.toContain("0");
    expect(t).not.toContain("school days");
    expect(t).toEqual(expect.arrayContaining(["3", "finished", "1", "book finished"]));
  });
  it("one or two parts is the roomy card: a large number, big rows with subject and date, a sprig", () => {
    const l = layout(review({ finished: fin(3) }));
    expect(l.roomy).toBe(true);
    const t = texts(l.items);
    expect(t).toEqual(expect.arrayContaining(["3", "assignments", "finished", "Book number 1", "Literature · finished Oct 1"]));
    expect(l.items.some((i) => i.k === "icon" && i.name === "plant")).toBe(true);
    expect(layout(review({ schoolDays: 72 })).roomy).toBe(true);
    expect(layout(review({ finished: fin(2), schoolDays: 72 })).roomy).toBe(true);
    expect(texts(layout(review({ finished: fin(2), schoolDays: 72 })).items)).toContain("across 72 school days");
    expect(layout(review({ finished: fin(2), books: ["Heidi"] })).roomy).toBe(false); // a finished list and a books tile use the full layout
  });
  it("long lists show the rows that fit, then 'and N more'; the tiles keep the true totals; nothing is shrunk", () => {
    const books = Array.from({ length: 40 }, (_, i) => `Book ${i + 1}`);
    const l = layout(review({ finished: fin(30), books, schoolDays: 160, totalMinutes: 6000, bySubject: [{ subjectId: "lit", name: "Literature", minutes: 6000 }] }));
    const t = texts(l.items);
    expect(t).toContain("30");
    expect(t).toContain("40");
    const more = t.filter((x) => /^and \d+ more$/.test(x));
    expect(more).toHaveLength(1); // only the finished list is drawn (S16-09, N4)
    const shownFinished = t.filter((x) => /^Book number \d+$/.test(x)).length;
    expect(shownFinished + Number(more[0]!.match(/\d+/)![0])).toBe(30);
    expect(t.some((x) => /^Book \d+$/.test(x))).toBe(false); // the books' titles are not written a second time
    // Row text never shrinks: every list row is drawn at its size (26 for finished, 27 for books).
    for (const i of l.items) if (i.k === "text" && /^Book number/.test(i.text)) expect(i.size).toBe(26);
    // Nothing is drawn below the card.
    for (const i of l.items) if (i.k === "text") expect(i.y).toBeLessThanOrEqual(1350 - 52 + 4);
  });
  it("the heading steps down for a long name and ends in an ellipsis if it still doesn't fit", () => {
    const sizeOf = (name: string) => layout(review({ childName: name, finished: fin(1) })).items.find((i) => i.k === "text" && i.text.startsWith(name.slice(0, 6)) && i.size >= 60);
    expect((sizeOf("Frank") as Extract<Item, { k: "text" }>).size).toBe(88);
    expect((sizeOf("Bartholomew") as Extract<Item, { k: "text" }>).size).toBeLessThan(88);
    const huge = texts(layout(review({ childName: "Maximilian Bartholomew Wolfeschlegelstein", finished: fin(1) })).items).find((x) => x.includes("Maximilian"))!;
    expect(huge.endsWith("…")).toBe(true);
  });
  it("no favourites, no notes, no estimates, no grades on the card", () => {
    const all = texts(layout(FULL).items).join(" ");
    expect(all).not.toMatch(/favou?rite|note|estimate|grade|%|streak|about|around/i);
  });
  it("the subject colours are the family's (stored colour, drawn as the app draws it); the child's colour drives the band", () => {
    const l = layout(FULL);
    expect(l.colors.kid.strong).toBe(cardColors("light", "#2f6fb0").kid.strong);
    const badge = l.items.find((i) => i.k === "badge" && i.letter === "L") as Extract<Item, { k: "badge" }>;
    expect(badge.icon).toBe("book");
    expect(badge.hue).toEqual({ pastel: "#E5C8DB", strong: "#9B4F80" });
    expect(l.colors.bg).toBe("#FAF6EE");
    expect(cardColors("dark", null).bg).toBe("#1C1A17");
  });
});

describe("the card's colours (S13-05)", () => {
  it("are the app's: the twelve hues and the fern accent equal scripts/palette.ts, from which tokens.css is generated", () => {
    expect(HUES.map((h) => [h.light.pastel, h.light.strong, h.dark.pastel, h.dark.strong].map((x) => x.toLowerCase())))
      .toEqual(SUBJECT_HUES.map((h) => [h.light.fill, h.light.strong, h.dark.fill, h.dark.strong].map((x) => x.toLowerCase())));
    for (const t of ["light", "dark"] as const) {
      expect(cardColors(t, null).kid).toEqual({ pastel: CHROME[t]["primary-soft"], strong: CHROME[t].primary });
      expect([cardColors(t, null).bg, cardColors(t, null).ink, cardColors(t, null).card].map((x) => x.toLowerCase()))
        .toEqual([CHROME[t].background, CHROME[t].foreground, CHROME[t].card].map((x) => x!.toLowerCase()));
    }
  });
});

describe("the saved image (S13-05)", () => {
  it("is built from the light card as a standalone SVG: fonts embedded, nothing fetched from anywhere", () => {
    const svg = cardSvgMarkup(layout(FULL), "Frank, term in review", '@font-face{font-family:"HH Nunito";src:url(data:font/woff2;base64,AAAA)}');
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('viewBox="0 0 1080 1350"');
    expect(svg).toContain("data:font/woff2;base64");
    expect([...new Set([...svg.matchAll(/http[^"]*/g)].map((m) => m[0]))]).toEqual(["http://www.w3.org/2000/svg"]); // only the xmlns
    expect(svg).toContain("#FAF6EE");
    expect(svg).not.toContain("<image");
  });
  it("file names say who and which term", () => {
    expect(fileNameFor("Frank · Fall 2026", false)).toBe("Frank-Fall-2026-term-in-review.png");
    expect(fileNameFor("Margaret · 2026–27", true)).toBe("Margaret-2026-27-year-in-review.png");
  });
});

// The page, against the fake API.
const KIDS: Child[] = [
  { id: "c1", name: "Frank", color: "#2f6fb0", sortOrder: 0, archived: false },
  { id: "c2", name: "Margaret", color: "#b0482f", sortOrder: 1, archived: false },
];
const asg = (over: Partial<Assignment>): Assignment => ({
  id: "a", subjectId: "lit", title: "Treasure Island", unitType: "pages", totalUnits: 100, weightPerUnit: null, startDate: "2026-08-17", endDate: "2026-10-23",
  childIds: ["c1"], archived: false, weekdays: null, endedAs: "finished", endedOn: "2026-10-16", ...over,
});
const FAMILY = {
  name: "Demo", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews: { hidden: [], custom: [] },
  logSetup: { template: "detailed", fields: { subjectHours: true, coreSplit: false, totalHours: false, schoolDays: true, homeAway: false, notes: false, books: true } },
} as unknown as FamilySettings;
const totals = (childId: string): RecordTotals => ({
  from: "x", to: "y", childId, entries: 3, schoolDays: childId === "c1" ? 40 : 55, totalMinutes: 600, coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0,
  books: childId === "c1" ? ["Treasure Island", "Heidi"] : [], bySubject: [{ subjectId: "lit", minutes: 600 }],
});
function stub(opts: { family?: FamilySettings; assignments?: Assignment[] } = {}) {
  fakeApi.on("GET /api/family", 200, opts.family ?? FAMILY);
  fakeApi.on("GET /api/children", 200, KIDS);
  fakeApi.on("GET /api/subjects", 200, SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, opts.assignments ?? [asg({}), asg({ id: "b", title: "Secret Garden", childIds: ["c2"], endedOn: "2026-11-03" }), asg({ id: "long", title: "History spine", endedAs: null, endedOn: null, endDate: "2027-05-21", childIds: ["c1", "c2"] })]);
  fakeApi.on("GET /api/records/totals", (_b, _p, q) => [200, totals(q.get("childId") ?? "")]);
  fakeApi.on("GET /api/log-entries", 200, [] as RecordEntry[]);
}
const noWrites = () => fakeApi.calls.filter((c) => c.method !== "GET");

describe("Term in review page (S13-05)", () => {
  beforeEach(() => {
    exportSpies.saveImages.mockReset().mockResolvedValue("saved");
    exportSpies.cardToPng.mockReset().mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    window.print = vi.fn();
    HTMLCanvasElement.prototype.getContext = (() => null) as never; // jsdom has no canvas: the layout then measures by length
  });

  it("opens on the range and child from Records and shows the card from the real numbers", async () => {
    stub();
    renderAt("/records/review?range=fall&child=c1");
    const card = await screen.findByRole("img", { name: "Frank · Fall 2026, term in review" });
    const text = card.textContent ?? "";
    expect(text).toContain("40");
    expect(text).toContain("school days");
    expect(text).toContain("Treasure Island");
    expect(screen.getByRole("button", { name: "Fall" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: /Records/ })).toHaveAttribute("href", "/records?range=fall&child=c1");
    const asked = fakeApi.calls.filter((c) => c.path.startsWith("/api/records/totals")).map((c) => c.path);
    expect(asked.some((q) => q.includes("childId=c1") && q.includes("from=2026-08-17"))).toBe(true);
  });
  it("All children: one card each, with arrows between them, and 'Save 2 images' and 'Print 2 pages'", async () => {
    stub();
    const user = userEvent.setup();
    renderAt("/records/review?range=fall&child=all");
    expect(await screen.findByRole("img", { name: /^Frank · Fall 2026/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save 2 images" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print 2 pages" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next card" }));
    expect(await screen.findByRole("img", { name: /^Margaret · Fall 2026/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next card" })).toBeDisabled();
  });
  it("Save image makes the image on this device (one file per child), hands it to the share sheet or a download, and sends nothing anywhere", async () => {
    stub();
    const user = userEvent.setup();
    renderAt("/records/review?range=fall&child=all");
    await screen.findByRole("img", { name: /^Frank/ });
    await user.click(screen.getByRole("button", { name: "Save 2 images" }));
    await waitFor(() => expect(exportSpies.saveImages).toHaveBeenCalledTimes(1));
    const files = exportSpies.saveImages.mock.calls[0]![0] as File[];
    expect(files.map((f) => f.name)).toEqual(["Frank-Fall-2026-term-in-review.png", "Margaret-Fall-2026-term-in-review.png"]);
    expect(files.every((f) => f.type === "image/png")).toBe(true);
    // The image is always the light card, whatever the screen shows.
    for (const [layout] of exportSpies.cardToPng.mock.calls) expect(layout.colors.bg).toBe("#FAF6EE");
    expect(await screen.findByText("Saved 2 images to this device.")).toBeInTheDocument();
    expect(noWrites()).toEqual([]);
    expect(fakeApi.calls.every((c) => c.path.startsWith("/api/"))).toBe(true);
  });
  it("Print opens the print dialog; the print page holds one light card per child", async () => {
    stub();
    const user = userEvent.setup();
    const { container } = renderAt("/records/review?range=fall&child=all");
    await screen.findByRole("img", { name: /^Frank/ });
    await user.click(screen.getByRole("button", { name: "Print 2 pages" }));
    expect(window.print).toHaveBeenCalledTimes(1);
    const pages = container.querySelectorAll(".review-print .review-print-page");
    expect(pages).toHaveLength(2);
    expect(pages[0]!.querySelector("rect")!.getAttribute("fill")).toBe("#FAF6EE");
  });
  it("a child with nothing to show says so and gets no card; the other child still does", async () => {
    stub({ family: { ...FAMILY, logSetup: null } as FamilySettings, assignments: [asg({}), asg({ id: "long", endedAs: null, endedOn: null, endDate: "2027-05-21" })] });
    renderAt("/records/review?range=fall&child=all");
    expect(await screen.findByRole("img", { name: /^Frank/ })).toBeInTheDocument();
    expect(screen.getByText(/Nothing yet for Margaret/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save image" })).toBeInTheDocument();
  });
  it("nothing to show at all: a plain sentence, and Print and Save are off", async () => {
    stub({ assignments: [asg({ id: "long", endedAs: null, endedOn: null, endDate: "2027-05-21" })] });
    fakeApi.on("GET /api/records/totals", 200, { ...totals("c1"), schoolDays: 0, books: [], bySubject: [], totalMinutes: 0 });
    renderAt("/records/review?range=fall&child=c1");
    expect(await screen.findByText(/Nothing to show for Frank yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save image" })).toBeDisabled();
  });
  it("changing the range or child re-reads the numbers", async () => {
    stub();
    const user = userEvent.setup();
    renderAt("/records/review?range=fall&child=c1");
    await screen.findByRole("img", { name: /^Frank · Fall/ });
    await user.click(screen.getByRole("button", { name: "Year" }));
    expect(await screen.findByRole("img", { name: "Frank · 2026–27, term in review" })).toBeInTheDocument();
  });
  it("says it is made on this device", async () => {
    stub();
    renderAt("/records/review?range=fall&child=c1");
    expect(await screen.findByText("Made on this device. Nothing is uploaded.")).toBeInTheDocument();
  });
});

describe("Records offers Term in review (S13-05)", () => {
  it("a link after Export, opening on the range and child already picked", async () => {
    stub();
    fakeApi.on("GET /api/log-entries", 200, [{ id: "e1", childId: "c1", startDate: "2026-09-08", endDate: "2026-09-08", countsSchoolDay: true, schoolDays: 1, days: null, coveredDays: ["2026-09-08"], subjectMinutes: {}, totalMinutes: 60, homeMinutes: null, awayMinutes: null, notes: null, books: [] }]);
    renderAt("/records?range=fall&child=c2");
    const link = await screen.findByRole("link", { name: "Term in review" });
    expect(link).toHaveAttribute("href", "/records/review?range=fall&child=c2");
    const row = link.parentElement!;
    expect(within(row).getAllByRole("button").map((b) => b.textContent)).toEqual(["Log", "Export"]);
  });
});
