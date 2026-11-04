/** S12-04: finished and stopped work on the schedule: bar styling, the edit sheet's words, and no warnings for ended work. */
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, planAll, planChild, type Assignment as EngineAssignment, type ChildPlan, type ProgressCheckIn } from "@hh/engine";
import type { Assignment } from "../src/api/types";
import { finishGlance, weekGlance } from "../src/features/home/homeSummary";
import { buildBriefing, lateAssignments } from "../src/features/plan/briefingLines";
import { barsFromPlans } from "../src/features/week/weekBars";
import { layoutTimeline } from "../src/features/timeline/layout";
import { barTitle } from "../src/features/timeline/names";
import { buildTimelineModel } from "../src/features/timeline/model";
import { endedWords } from "../src/features/completion/ended";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_EVENTS, SAMPLE_SUBJECTS, SAMPLE_TODAY, sampleInput, samplePlans } from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

const CAL = { weekStart: "mon" as const, schoolDays: [1, 2, 3, 4, 5] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[] };
const BOOK: EngineAssignment = { id: "ti", subjectId: "lit", childIds: ["c1"], unitType: "pages", totalUnits: 200, start: "2026-09-07", end: "2026-10-30" };
const SLOW: ProgressCheckIn[] = [
  { assignmentId: "ti", childId: "c1", weekStart: "2026-09-07", position: 15, mode: "keepEndDate" },
  { assignmentId: "ti", childId: "c1", weekStart: "2026-09-14", position: 30, mode: "keepEndDate" },
];
const plans = (a: EngineAssignment, extra: object = {}): ChildPlan[] => planAll([a], { calendar: CAL, asOf: "2026-11-04", checkIns: SLOW, ...extra });
const briefing = (ps: ChildPlan[], weekStart = "2026-11-02") =>
  buildBriefing({ plans: ps, children: [{ id: "c1", name: "Frank" }], titleOf: () => "Treasure Island", weekStart, calendar: CAL });

describe("no warnings for ended work (S12-04)", () => {
  it("an open book that is behind has a late line (the control)", () => {
    const g = briefing(plans(BOOK));
    expect(g[0]!.lines.map((l) => l.key)).toEqual(["late-ti"]);
    expect(lateAssignments(g)).toBe(1);
  });
  it("finished: no late line, no problem, no heavy week", () => {
    expect(briefing(plans({ ...BOOK, endedAs: "finished", endedOn: "2026-10-30" }))).toEqual([]);
    expect(briefing(plans({ ...BOOK, endedAs: "finished", endedOn: "2026-10-30", weekdays: [0] }))).toEqual([]);
  });
  it("stopped: no late line, no problem, no heavy week", () => {
    expect(briefing(plans({ ...BOOK, endedAs: "stopped", endedOn: "2026-10-02" }))).toEqual([]);
    expect(briefing(plans({ ...BOOK, endedAs: "stopped", endedOn: "2026-10-02" }), "2026-09-28")).toEqual([]);
  });
  it("a finished book's days after its day aren't a heavy week", () => {
    // Two books: a light one, and one that would make the week of Oct 12 heavy if it still counted.
    const light: EngineAssignment = { id: "l", subjectId: "lit", childIds: ["c1"], unitType: "pages", totalUnits: 10, start: "2026-09-07", end: "2026-12-18" };
    const heavy: EngineAssignment = { id: "h", subjectId: "lit", childIds: ["c1"], unitType: "pages", totalUnits: 400, start: "2026-10-12", end: "2026-10-16" };
    const open = buildBriefing({ plans: planAll([light, heavy], { calendar: CAL, asOf: "2026-10-12" }), children: [{ id: "c1", name: "Frank" }], titleOf: (id) => id, weekStart: "2026-10-12", calendar: CAL });
    expect(open[0]?.lines.map((l) => l.key)).toContain("heavy");
    const closed = buildBriefing({ plans: planAll([light, { ...heavy, endedAs: "finished", endedOn: "2026-10-09" }], { calendar: CAL, asOf: "2026-10-12" }), children: [{ id: "c1", name: "Frank" }], titleOf: (id) => id, weekStart: "2026-10-12", calendar: CAL });
    expect(closed).toEqual([]);
  });
  it("Home's finish glance and this week's glance leave ended work out", () => {
    const stopped = plans({ ...BOOK, endedAs: "stopped", endedOn: "2026-10-02" });
    expect(finishGlance(stopped)).toBeNull();
    expect(finishGlance(plans({ ...BOOK, endedAs: "finished", endedOn: "2026-10-30" }))).toBeNull();
    expect(finishGlance(plans(BOOK))).not.toBeNull();
    expect(weekGlance(plans({ ...BOOK, end: "2026-12-18", endedAs: "stopped", endedOn: "2026-10-02" }), "c1", "2026-11-02", "2026-11-04")).toMatchObject({ planned: false, left: 0 });
  });
  it("this week's Week bars: none after the day it ended, still there before it", () => {
    const l = { children: SAMPLE_CHILDREN.slice(0, 1).map((c) => ({ ...c, id: "c1" })), subjects: SAMPLE_SUBJECTS, titleOf: () => "Treasure Island", subjectOf: () => "lit" };
    const long: EngineAssignment = { ...BOOK, end: "2026-12-18" };
    expect(barsFromPlans(plans(long), "2026-11-02", l)).toHaveLength(1);
    expect(barsFromPlans(plans({ ...long, endedAs: "finished", endedOn: "2026-10-30" }), "2026-11-02", l)).toHaveLength(0);
    expect(barsFromPlans(plans({ ...long, endedAs: "stopped", endedOn: "2026-10-30" }), "2026-11-02", l)).toHaveLength(0);
    expect(barsFromPlans(plans({ ...long, endedAs: "stopped", endedOn: "2026-10-30" }), "2026-10-26", l)).toHaveLength(1);
  });
});

describe("the bars (S12-04)", () => {
  const ended = (id: string, endedAs: "finished" | "stopped", endedOn: string) => {
    const base = samplePlans();
    return base.map((p) => (p.assignmentId === id ? planChildAs(p, endedAs, endedOn) : p));
  };
  /** The sample plan with one assignment closed, as the engine would answer. */
  function planChildAs(p: ChildPlan, endedAs: "finished" | "stopped", endedOn: string): ChildPlan {
    return { ...p, endedAs, endedOn, complete: endedAs === "finished", warnings: [], days: endedAs === "stopped" ? p.days.filter((d) => d.date <= endedOn) : p.days };
  }
  const wide = (plansIn: ChildPlan[]) => layoutTimeline(buildTimelineModel(sampleInput({ plans: plansIn })), { zoom: "year", width: 1280 });

  it("words: a check after a finished name, 'Stopped' after a stopped one", () => {
    expect(barTitle("Heidi")).toBe("Heidi");
    expect(barTitle("Heidi", "finished")).toBe("Heidi ✓");
    expect(barTitle("Heidi", "stopped")).toBe("Heidi · Stopped");
  });
  it("the layout marks the ended assignment's bands and names, and no other", () => {
    const l = wide(ended("heidi", "finished", "2027-04-30"));
    const heidi = l.bands.filter((b) => b.assignmentId === "heidi");
    expect(heidi.length).toBeGreaterThan(0);
    for (const b of heidi) expect(b.ended).toBe("finished");
    expect(l.bands.filter((b) => b.assignmentId !== "heidi").every((b) => b.ended === undefined)).toBe(true);
    expect(l.names.filter((n) => n.assignmentId === "heidi").every((n) => n.ended === "finished" && n.text.endsWith("✓") || n.text.includes("…"))).toBe(true);
    expect(l.names.filter((n) => n.assignmentId === "heidi").some((n) => n.text.includes("Heidi"))).toBe(true);
  });
  it("a stopped bar ends at the day it stopped", () => {
    const open = wide(samplePlans());
    const closed = wide(ended("heidi", "stopped", "2027-02-26"));
    const right = (l: ReturnType<typeof wide>) => Math.max(...l.bands.filter((b) => b.assignmentId === "heidi").flatMap((b) => b.runs.map((r) => r.x1)));
    expect(right(closed)).toBeLessThan(right(open));
    for (const b of closed.bands.filter((x) => x.assignmentId === "heidi")) expect(b.ended).toBe("stopped");
  });
  it("an open family's layout is exactly as before (no ended fields)", () => {
    const l = wide(samplePlans());
    expect(l.bands.every((b) => !("ended" in b))).toBe(true);
    expect(l.names.every((n) => !("ended" in n))).toBe(true);
  });
});

describe("the Year view (S12-04)", () => {
  const stub = (assignments: Assignment[], plans: ChildPlan[]) => {
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans });
    fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
    fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
    fakeApi.on("GET /api/assignments", 200, assignments);
    fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
    fakeApi.on("GET /api/events", 200, SAMPLE_EVENTS);
  };
  const closePlans = (id: string, endedAs: "finished" | "stopped", endedOn: string) =>
    samplePlans().map((p) => (p.assignmentId === id ? { ...p, endedAs, endedOn, complete: endedAs === "finished", warnings: [] } : p));
  const tap = (svg: Element, id: string) => {
    const band = svg.querySelector(`path.tl-band[data-assignment="${id}"]`)!;
    const [x, y] = band.getAttribute("d")!.slice(1).split(/[ ,LCQVHZ]+/).filter(Boolean).map(Number);
    fireEvent.click(svg, { clientX: x! + 1, clientY: y! + 1 });
  };

  it("draws a finished bar in the lighter step with a check, and its edit sheet says 'Finished Oct 2'", async () => {
    const id = SAMPLE_ASSIGNMENTS[1]!.id;
    const asg = SAMPLE_ASSIGNMENTS.map((a) => (a.id === id ? { ...a, endedAs: "finished" as const, endedOn: "2026-10-02" } : a));
    stub(asg, closePlans(id, "finished", "2026-10-02"));
    renderAt("/timeline");
    const svg = await screen.findByRole("img", { name: "Year timeline" });
    const band = svg.querySelector(`path.tl-band[data-assignment="${id}"]`)!;
    expect(band).toHaveAttribute("data-ended", "finished");
    expect(band.getAttribute("style")).toContain("-light");
    expect(svg.querySelectorAll('path.tl-band[data-ended]')).toHaveLength(svg.querySelectorAll(`path.tl-band[data-assignment="${id}"]`).length);
    tap(svg, id);
    const sheet = await screen.findByRole("region", { name: /^Edit / });
    expect(within(sheet).getByText("Finished Oct 2")).toBeInTheDocument();
  });

  it("a stopped bar is marked stopped and its sheet says 'Stopped Oct 2'; an open one has no such line", async () => {
    const [a, b] = SAMPLE_ASSIGNMENTS as [Assignment, Assignment];
    const asg = SAMPLE_ASSIGNMENTS.map((x) => (x.id === a.id ? { ...x, endedAs: "stopped" as const, endedOn: "2026-10-02" } : x));
    stub(asg, closePlans(a.id, "stopped", "2026-10-02"));
    renderAt("/timeline");
    const svg = await screen.findByRole("img", { name: "Year timeline" });
    expect(svg.querySelector(`path.tl-band[data-assignment="${a.id}"]`)).toHaveAttribute("data-ended", "stopped");
    expect(svg.querySelector(`path.tl-band[data-assignment="${b.id}"]`)).not.toHaveAttribute("data-ended");
    tap(svg, a.id);
    expect(await screen.findByText("Stopped Oct 2")).toBeInTheDocument();
  });

  it("the lanes list for screen readers says finished or stopped", async () => {
    const id = SAMPLE_ASSIGNMENTS[1]!.id;
    stub(SAMPLE_ASSIGNMENTS, closePlans(id, "finished", "2026-10-02"));
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    expect(document.querySelector(`.tl-lane-pick[data-assignment="${id}"]`)!.textContent).toMatch(/, finished$/);
  });

  it("words for an ended assignment", () => {
    expect(endedWords("finished", "2026-11-02")).toBe("Finished Nov 2");
    expect(endedWords("stopped", "2026-10-30")).toBe("Stopped Oct 30");
    expect(SAMPLE_TODAY).toBeTruthy();
  });
});

describe("the plan (S12-04)", () => {
  it("is engine 0.13.0 and an ended plan is closed as the engine says", () => {
    expect(ENGINE_VERSION).toBe("0.13.0");
    expect(planChild({ ...BOOK, endedAs: "stopped", endedOn: "2026-10-02" }, "c1", { calendar: CAL, asOf: "2026-11-04" })).toMatchObject({ endedAs: "stopped", complete: false, warnings: [] });
  });
});
