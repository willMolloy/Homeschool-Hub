/** S10-06: the Year edit sheet as mocked: date tiles (the shared DateField), a rounded pace line, a 2 px outline, Copy · More. */
import { readFileSync } from "node:fs";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import type { Assignment } from "../src/api/types";
import { paceLine, roundedMinutes, roundedUnits } from "../src/features/schedule/effort";
import { formatDate } from "../src/lib/dates";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_EVENTS, SAMPLE_SUBJECTS, samplePlans } from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

function stub(capacityDays = 7) {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, SAMPLE_ASSIGNMENTS);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, SAMPLE_EVENTS);
  fakeApi.on("POST /api/plan/pace", (body) => [200, {
    paces: (body as { drafts: { childIds: string[] }[] }).drafts.map((d) => ({ capacityDays, perChild: d.childIds.map((childId) => ({ childId, capacityDays })) })),
  }]);
  for (const a of SAMPLE_ASSIGNMENTS) fakeApi.on(`PATCH /api/assignments/${a.id}`, (body) => [200, { ...a, ...(body as Partial<Assignment>) }]);
}

async function pick() {
  renderAt("/timeline");
  const svg = await screen.findByRole("img", { name: "Year timeline" });
  const band = svg.querySelectorAll("path.tl-band")[0]!;
  const [x, y] = band.getAttribute("d")!.slice(1).split(/[ ,LCQVHZ]+/).filter(Boolean).map(Number);
  fireEvent.click(svg, { clientX: x! + 1, clientY: y! + 1 });
  const id = band.getAttribute("data-assignment")!;
  return { svg, id, a: SAMPLE_ASSIGNMENTS.find((s) => s.id === id)!, panel: await screen.findByRole("region", { name: /^Edit / }) };
}

describe("the pace line rounds (S10-06)", () => {
  it("whole units from 1 up, one decimal below, minutes to 5 from 10 up", () => {
    expect(roundedUnits(20.4)).toBe(20);
    expect(roundedUnits(4.6)).toBe(5);
    expect(roundedUnits(0.34)).toBe(0.3);
    expect(roundedUnits(0.01)).toBe(0.1);
    expect(roundedMinutes(38.2)).toBe(40);
    expect(roundedMinutes(7.4)).toBe(7);
    expect(roundedMinutes(0.2)).toBe(1);
    expect(paceLine(20.4, "pages", 38.2)).toBe("About 20 pages a day · 40 min");
    expect(paceLine(1.2, "chapters", null)).toBe("About 1 chapter a day");
  });
});

describe("the Year edit sheet (S10-06)", () => {
  it("shows Start and End as tiles holding the shared DateField, and a date picked there saves", async () => {
    stub();
    const { a, panel } = await pick();
    const tiles = panel.querySelectorAll(".tl-tile");
    expect([...tiles].map((t) => t.querySelector(".tl-tile-label")!.textContent)).toEqual(["Start", "End"]);
    for (const t of tiles) expect(t.querySelector(".date-field .date-field-box input")).not.toBeNull();
    expect(within(panel).getByLabelText("End")).toHaveValue(formatDate(a.endDate));
    // The End tile's calendar: the day after the current end.
    fireEvent.click(within(tiles[1] as HTMLElement).getByRole("button", { name: "Choose a date" }));
    const next = new Date(`${a.endDate}T12:00:00`);
    next.setDate(next.getDate() + 1);
    const iso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    if (iso.slice(0, 7) !== a.endDate.slice(0, 7)) fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    fireEvent.click(screen.getByRole("button", { name: formatDate(iso) }));
    await waitFor(() => expect(fakeApi.calls.some((c) => c.method === "PATCH" && (c.body as { endDate?: string })?.endDate === iso)).toBe(true));
  });

  it("shows a rounded pace line over the days the plan has", async () => {
    stub(7);
    const { a, panel } = await pick();
    const line = await waitFor(() => {
      const p = panel.querySelector("[data-pace]");
      expect(p).not.toBeNull();
      return p!;
    });
    const perDay = roundedUnits(a.totalUnits / 7);
    await waitFor(() => expect(line.textContent).toMatch(new RegExp(`^About ${perDay.toLocaleString("en-US")} \\w+ a day · \\d+ min$`)));
    const minutes = Number(/· (\d+) min/.exec(line.textContent!)![1]);
    expect(minutes < 10 || minutes % 5 === 0).toBe(true);
  });

  it("outlines the chosen bar 2 px and keeps Copy · More", async () => {
    stub();
    const { svg, id, panel } = await pick();
    const mine = [...svg.querySelectorAll("path.tl-band")].filter((b) => b.getAttribute("data-assignment") === id);
    expect(mine.length).toBeGreaterThan(0);
    for (const b of mine) expect(b).toHaveClass("tl-selected");
    const css = readFileSync("src/features/timeline/timeline.css", "utf8");
    expect(css).toMatch(/\.tl-band\.tl-selected \{ stroke-width: 2; stroke-opacity: 1; \}/);
    // The tile's date sits on the tile: the rule must out-rank the global input rule (three :not()s = 0,3,1).
    expect(css).toMatch(/\.tl-tile \.date-field \.date-field-box input\[type="text"\] \{[^}]*background: transparent/);
    expect([...panel.querySelectorAll(".tl-edit-ends > button, .tl-edit-ends .tl-more-btn")].map((b) => b.textContent)).toEqual(["Copy", "More"]);
  });
});
