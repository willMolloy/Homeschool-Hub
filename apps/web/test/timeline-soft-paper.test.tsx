/** S8-07: the Year timeline in Soft Paper: subject badges in a narrow gutter, outlined pastel bars, a dotted fern Today, a bottom-sheet edit bar. */
import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import { CHROME, THEME_NAMES, contrast, swatches } from "../scripts/palette";
import { BAR_DRAG_ENABLED } from "../src/features/timeline/drag";
import { layoutTimeline } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { Timeline, nameFill } from "../src/features/timeline/Timeline";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { SAMPLE_ASSIGNMENTS, SAMPLE_CHILDREN, SAMPLE_SUBJECTS, sampleInput, samplePlans } from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

const css = readFileSync("src/features/timeline/timeline.css", "utf8");
const rule = (selector: string) => css.match(new RegExp(`${selector.replace(/[.[\]]/g, "\\$&")}\\s*\\{[^}]*\\}`))?.[0] ?? "";

function stub(subjects: unknown[] = SAMPLE_SUBJECTS) {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, subjects);
  fakeApi.on("GET /api/assignments", 200, SAMPLE_ASSIGNMENTS);
  fakeApi.on("GET /api/blocked-ranges", 200, []);
  fakeApi.on("GET /api/events", 200, []);
}
async function openYear() {
  const r = renderAt("/schedule?view=year");
  const svg = await screen.findByRole("img", { name: "Year timeline" });
  return { ...r, svg, wrap: svg.closest(".tl-wrap") as HTMLElement };
}

describe("lane badges", () => {
  it("one named badge per lane in the gutter, the subject's icon on its pastel with a strong ring, and no names on the picture", async () => {
    stub(SAMPLE_SUBJECTS.map((s) => (s.id === "math" ? { ...s, icon: "calculator" } : s)));
    const { svg, wrap } = await openYear();
    const model = buildTimelineModel(sampleInput({ today: DEMO_ME.today, events: [] }));
    const lanes = layoutTimeline(model, { zoom: "year", width: 360 }).badges;
    const badges = [...wrap.querySelectorAll("button.tl-badge")];
    expect(badges.map((b) => b.getAttribute("aria-label"))).toEqual(lanes.map((l) => l.label));
    expect(svg.querySelectorAll("text.tl-lane-label")).toHaveLength(0);
    const math = [...wrap.querySelectorAll("button.tl-badge")].find((b) => b.getAttribute("aria-label")!.startsWith("Math"))!;
    expect(math.querySelector(".subject-badge svg")).not.toBeNull(); // the icon
    expect(math.querySelector(".subject-badge")!.getAttribute("style")).toMatch(/--c: var\(--tl-subject-\d\).*--cs: var\(--tl-subject-\d-strong\)/);
    const other = [...wrap.querySelectorAll("button.tl-badge")].find((b) => !b.getAttribute("aria-label")!.startsWith("Math"))!;
    expect(other.querySelector(".subject-letter")).not.toBeNull(); // no icon yet: the letter
    expect(wrap.querySelector(".tl-total-icon")).toBeNull(); // S10-02: the children's ribbons replace All subjects
  });

  it("tapping a badge names the subject in a small popover and highlights its lane; tapping again or Escape puts it away", async () => {
    stub();
    const user = userEvent.setup();
    const { svg, wrap } = await openYear();
    const badge = within(wrap).getAllByRole("button", { name: /^Math/ })[0]!;
    expect(wrap.querySelector(".tl-lane-pop")).toBeNull();
    await user.click(badge);
    expect(within(wrap).getByRole("status")).toHaveTextContent(/^Math/);
    expect(badge).toHaveAttribute("aria-pressed", "true");
    const dimmed = svg.querySelectorAll("path.tl-band.tl-dim");
    const lit = [...svg.querySelectorAll("path.tl-band")].filter((p) => !p.classList.contains("tl-dim"));
    expect(dimmed.length).toBeGreaterThan(0);
    expect(lit.length).toBeGreaterThan(0);
    await user.click(badge);
    expect(wrap.querySelector(".tl-lane-pop")).toBeNull();
    expect(svg.querySelectorAll("path.tl-band.tl-dim")).toHaveLength(0);
    await user.click(badge);
    await user.keyboard("{Escape}");
    expect(wrap.querySelector(".tl-lane-pop")).toBeNull();
  });

  it("S8b-02: the popover sizes to its text (it was clipped to the 24 px gutter) and stays on the screen", () => {
    const pop = rule(".tl-lane-pop");
    expect(pop).toMatch(/width: max-content/);
    expect(pop).toMatch(/max-width: calc\(100vw - 44px\)/);
    expect(pop).not.toMatch(/overflow: hidden;[^}]*width: \d+px/);
  });

  it("S8b-02 / S10-15: every badge's tap area is at least 44 x 44 px, centred on its badge, the centres in lane order", async () => {
    stub();
    const { wrap } = await openYear();
    const buttons = [...wrap.querySelectorAll<HTMLElement>("button.tl-badge")];
    const spans = buttons.map((b) => [parseFloat(b.style.top), parseFloat(b.style.height), parseFloat(b.style.width)] as const);
    expect(spans.length).toBeGreaterThan(3);
    for (const [, h, w] of spans) { expect(h).toBeGreaterThanOrEqual(44); expect(w).toBeGreaterThanOrEqual(44); }
    for (let i = 1; i < spans.length; i++) expect(spans[i]![0]).toBeGreaterThan(spans[i - 1]![0]);
  });

  it("the gutter never blocks a tap on a bar: only the badges take the pointer", () => {
    expect(rule(".tl-gutter")).toMatch(/pointer-events: none/);
    expect(rule(".tl-badge")).toMatch(/pointer-events: auto/);
  });
});

describe("the look", () => {
  it("bars are the subject's fill with a 1 px strong outline at 40%", async () => {
    stub();
    const { svg } = await openYear();
    const band = svg.querySelector("path.tl-band") as SVGPathElement;
    expect(band.style.fill).toMatch(/^var\(--tl-subject-\d+(-light|-dark)?\)$/);
    expect(band.style.stroke).toMatch(/^var\(--tl-subject-\d+-strong\)$/);
    expect(rule(".tl-band")).toMatch(/stroke-width: 1;/);
    expect(rule(".tl-band")).toMatch(/stroke-opacity: 0\.4;/);
  });

  it("S10-02: a child's load ribbon is the page ink at low opacity; Today is a dotted fern line, not red; axis labels are secondary text", () => {
    expect(rule(".tl-ribbon path")).toMatch(/fill: var\(--tl-foreground\); fill-opacity: 0\.11/);
    expect(rule(".tl-today line")).toMatch(/stroke: var\(--tl-today\)/);
    expect(rule(".tl-today line")).toMatch(/stroke-dasharray/);
    expect(CHROME.light.today).toBe(CHROME.light.primary);
    expect(CHROME.dark.today).toBe(CHROME.dark.primary);
    expect(rule(".tl-axis-label")).toMatch(/fill: var\(--tl-muted-foreground\)/);
  });

  it.each(THEME_NAMES)("%s: a name inside a bar (the theme's ink) reads on every fill at AA", (theme) => {
    for (const s of swatches(theme)) expect(contrast(CHROME[theme].foreground!, s.color), `${s.subject}/${s.step}`).toBeGreaterThanOrEqual(4.5);
    expect(nameFill(3, "light")).toBe("var(--tl-subject-3-light-label)");
  });

  it("no drag handles: dragging stays off (S7-20) and the grips are not drawn", async () => {
    expect(BAR_DRAG_ENABLED).toBe(false);
    stub();
    const { svg } = await openYear();
    expect(svg.querySelectorAll(".tl-handle")).toHaveLength(0);
  });

  it("the edit bar is a bottom sheet in the Soft Paper style (its Start, End, Copy and More are unchanged: timeline-edit-bar tests)", () => {
    stub();
    expect(rule(".tl-edit")).toMatch(/border-radius: var\(--tl-radius-sheet\) var\(--tl-radius-sheet\) 0 0/);
    expect(rule(".tl-edit")).toMatch(/box-shadow: var\(--tl-sheet-shadow\)/);
    expect(css).toMatch(/\.tl-edit-grab \{/);
    expect(readFileSync("src/features/timeline/EditBar.tsx", "utf8")).toContain('className="tl-edit-grab"');
  });
});

describe("the edit bar clears the tab bar at every width (S8b-03)", () => {
  const shell = readFileSync("src/layout/app-shell.css", "utf8");
  const undo = readFileSync("src/features/undo/undo.css", "utf8");
  it("one variable holds the tab bar's height, and the nav, the edit bar and the undo bar all use it", () => {
    expect(shell).toMatch(/:root \{\s*--tab-bar-height: 70px;/);
    expect(shell).toMatch(/\.shell-nav \{[^}]*height: calc\(var\(--tab-bar-height\)/);
    expect(rule(".tl-edit")).toMatch(/bottom: calc\(var\(--tab-bar-height, 70px\) \+ env\(safe-area-inset-bottom\)\)/);
    expect(undo).toMatch(/bottom: calc\(var\(--tab-bar-height, 70px\)/);
  });
  it("there is no desktop override that drops the edit bar to the bottom edge, behind the tab bar", () => {
    expect(css).not.toMatch(/min-width: 640px\)\s*\{\s*\.tl-edit \{ bottom: 0/);
    expect(css).not.toMatch(/\.tl-edit \{ bottom:/);
  });
});

describe("Timeline on its own", () => {
  it("draws badges from the subjects it is given, and the letter for one it doesn't know", () => {
    const model = buildTimelineModel(sampleInput({ today: DEMO_ME.today, events: [] }));
    const layout = layoutTimeline(model, { zoom: "year", width: 360 });
    const { container } = render(<Timeline layout={layout} label="t" subjects={[{ id: layout.badges[0]!.subjectId, name: "X", icon: "flask" }]} />);
    const badges = [...container.querySelectorAll("button.tl-badge")];
    const known = layout.badges.findIndex((b) => b.subjectId === layout.badges[0]!.subjectId);
    const unknown = layout.badges.findIndex((b) => b.subjectId !== layout.badges[0]!.subjectId);
    expect(badges[known]!.querySelector("svg")).not.toBeNull();
    expect(badges[unknown]!.querySelector(".subject-letter")).not.toBeNull();
    expect(container.querySelector(".tl-gutter")).toHaveStyle({ width: `${layout.metrics.gutter}px` });
  });
});
