/** T-02: the timeline view model (features/timeline/model.ts, grid.ts, marks.ts). */
import { describe, expect, it } from "vitest";
import { STEP_NAMES, SUBJECT_COUNT } from "../scripts/palette";
import type { BlockedRange, ScheduleEvent, Subject } from "../src/api/types";
import { buildDayGrid, clipSpan, gridIndex, weekAlignedRange } from "../src/features/timeline/grid";
import { SWATCH_SLOTS, slotOfColor } from "../src/features/roster/palette";
import { buildTimelineModel, CHILD_STEPS, PALETTE_SLOTS, subjectSlots } from "../src/features/timeline/model";
import { SAMPLE_EVENTS, SAMPLE_SUBJECTS, sampleInput, samplePlans } from "./helpers/timeline-fixtures";

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

describe("day grid", () => {
  it("widens a range to whole weeks for either week start", () => {
    expect(weekAlignedRange("2026-09-02", "2026-09-10", "mon")).toEqual({ from: "2026-08-31", to: "2026-09-13" });
    expect(weekAlignedRange("2026-09-02", "2026-09-10", "sun")).toEqual({ from: "2026-08-30", to: "2026-09-12" });
  });

  it("has one entry per calendar day and flags the family's school weekdays", () => {
    const g = buildDayGrid("2026-08-31", "2026-09-06", [1, 2, 3, 4, 5]);
    expect(g.dates).toHaveLength(7);
    expect(g.schoolDay).toEqual([true, true, true, true, true, false, false]);
    expect(gridIndex(g, "2026-09-02")).toBe(2);
    expect(gridIndex(g, "2026-09-07")).toBe(-1);
    expect(clipSpan(g, "2026-08-01", "2026-09-01")).toEqual([0, 1]);
    expect(clipSpan(g, "2026-09-10", "2026-09-12")).toBeNull();
    expect(clipSpan(g, "2026-09-03", "2026-09-02")).toBeNull();
  });

  it("is empty when the range is backwards", () => {
    const m = buildTimelineModel(sampleInput({ from: "2026-09-10", to: "2026-09-01" }));
    expect(m.dates).toEqual([]);
    expect(m.todayIndex).toBe(-1);
    expect(m.lanes.every((l) => l.children.every((c) => c.daily.length === 0))).toBe(true);
  });
});

describe("timeline model", () => {
  const model = buildTimelineModel(sampleInput());

  it("lays out one lane per subject in roster order, then one sub-lane per child in roster order", () => {
    expect(model.lanes.map((l) => l.name)).toEqual(["Literature", "Math", "History", "Science", "Music"]);
    for (const lane of model.lanes) expect(lane.children.map((c) => c.childName)).toEqual(["Frank", "Margaret"]);
    expect(model.lanes[0]!.children[1]!.key).toBe("lit:margaret");
  });

  it("deals palette slots in subject order and repeats them after the palette runs out", () => {
    expect(model.lanes.map((l) => l.paletteSlot)).toEqual([1, 2, 3, 4, 5]);
    const many: Subject[] = Array.from({ length: 12 }, (_, i) => ({ ...SAMPLE_SUBJECTS[0]!, id: `s${i}`, name: `S${i}`, sortOrder: i }));
    const plans = samplePlans().slice(0, 1).flatMap((p) => many.map((s) => ({ ...p, subjectId: s.id, assignmentId: `${p.assignmentId}-${s.id}` })));
    const m = buildTimelineModel(sampleInput({ subjects: many, plans }));
    expect(m.lanes.map((l) => l.paletteSlot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4]);
  });

  it("puts archived subjects after active ones and gives unknown ids a fallback name", () => {
    const subjects = SAMPLE_SUBJECTS.map((s) => (s.id === "lit" ? { ...s, archived: true } : s)).filter((s) => s.id !== "music");
    const m = buildTimelineModel(sampleInput({ subjects, assignments: [] }));
    expect(m.lanes.map((l) => l.name)).toEqual(["Math", "History", "Science", "Literature", "Subject"]);
    expect(m.lanes[0]!.children[0]!.assignments[0]!.title).toBe("Assignment");
  });

  it("matches the palette's slot count and step names", () => {
    expect(PALETTE_SLOTS).toBe(SUBJECT_COUNT);
    expect([...CHILD_STEPS]).toEqual([...STEP_NAMES]);
    expect(model.lanes[0]!.children.map((c) => c.step)).toEqual(["base", "light"]);
  });

  it("stacks a sub-lane's assignments earliest-first and keeps every planned day's thickness", () => {
    const frankLit = model.lanes[0]!.children[0]!;
    expect(frankLit.assignments.map((a) => a.title)).toEqual(["Aesop's Fables", "Treasure Island", "Robinson Crusoe"]);
    const plans = samplePlans().filter((p) => p.subjectId === "lit" && p.childId === "frank");
    const inRange = sum(plans.flatMap((p) => p.days.filter((d) => d.date >= model.from && d.date <= model.to).map((d) => d.thickness)));
    expect(sum(frankLit.daily)).toBeCloseTo(inRange, 6);
    expect(frankLit.daily).toEqual(frankLit.assignments.reduce((acc, a) => acc.map((v, i) => v + a.daily[i]!), model.dates.map(() => 0)));
  });

  it("weekly smoothing keeps each week's total and is flat across that week's school days", () => {
    const math = model.lanes[1]!.children[1]!.assignments[0]!; // Margaret's Math 3
    for (let w = 0; w < model.dates.length; w += 7) {
      const daily = math.daily.slice(w, w + 7);
      const weekly = math.weekly.slice(w, w + 7);
      expect(sum(weekly)).toBeCloseTo(sum(daily), 6);
      const drawn = weekly.filter((v) => v > 0);
      for (const v of drawn) expect(v).toBeCloseTo(drawn[0]!, 9);
    }
  });

  it("shows a shared assignment in each child's sub-lane", () => {
    const hist = model.lanes.find((l) => l.subjectId === "hist")!;
    expect(hist.children.map((c) => c.assignments.map((a) => a.assignmentId))).toEqual([["hist"], ["hist"]]);
  });

  it("totals every sub-lane, daily and weekly", () => {
    const subs = model.lanes.flatMap((l) => l.children);
    model.dates.forEach((_, i) => {
      expect(model.totals.daily[i]).toBeCloseTo(sum(subs.map((c) => c.daily[i]!)), 9);
      expect(model.totals.weekly[i]).toBeCloseTo(sum(subs.map((c) => c.weekly[i]!)), 9);
    });
  });

  it("finds today on the grid, or -1 off it", () => {
    expect(model.dates[model.todayIndex]).toBe("2026-10-14");
    expect(buildTimelineModel(sampleInput({ today: "2027-07-01" })).todayIndex).toBe(-1);
  });

  it("clips breaks to the grid and keeps who they cover", () => {
    const blocked: BlockedRange[] = [
      { id: "sick", label: null, kind: "sick", startDate: "2026-08-20", endDate: "2026-09-01", childIds: ["frank"] },
      { id: "summer", label: "Summer", kind: "vacation", startDate: "2027-06-01", endDate: "2027-08-01", childIds: [] },
    ];
    const m = buildTimelineModel(sampleInput({ blocked }));
    expect(m.breaks).toEqual([{ id: "sick", label: null, kind: "sick", first: 0, last: 1, childIds: ["frank"] }]);
    expect(model.breaks.map((b) => [b.id, model.dates[b.first], model.dates[b.last], b.childIds])).toEqual([
      ["xmas", "2026-12-21", "2027-01-01", []],
    ]);
  });

  it("marks event days on school days outside family-wide breaks, and drops archived or off-grid events", () => {
    const coop = model.events.find((e) => e.id === "coop")!;
    expect(coop.days.length).toBeGreaterThan(30);
    for (const i of coop.days) {
      expect(model.schoolDay[i]).toBe(true);
      expect(model.breaks.some((b) => b.childIds.length === 0 && i >= b.first && i <= b.last)).toBe(false);
    }
    const events: ScheduleEvent[] = [
      { ...SAMPLE_EVENTS[0]!, id: "gone", archived: true },
      { ...SAMPLE_EVENTS[0]!, id: "later", startDate: "2027-09-01", endDate: null },
      { ...SAMPLE_EVENTS[0]!, id: "short", startDate: "2026-09-01", endDate: "2026-09-14" },
    ];
    const m = buildTimelineModel(sampleInput({ events }));
    expect(m.events.map((e) => e.id)).toEqual(["short"]);
    expect(m.events[0]!.days.length).toBe(2);
  });

  it("carries thickness, never minutes (S2b-14)", () => {
    expect(JSON.stringify(model)).not.toMatch(/minute/i);
  });
});

describe("one colour per subject (S8b-04)", () => {
  const withColors = (colors: Record<string, string | null>) => SAMPLE_SUBJECTS.map((s) => ({ ...s, color: colors[s.id] ?? null }));

  it("a subject's stored colour decides its slot: the same slot Set up's badge and dot use", () => {
    const m = buildTimelineModel(sampleInput({ subjects: withColors({ lit: "#7a5cc2", math: "#2f6fb0", hist: "#b0482f", sci: "#2f8f6f", music: "#b08a2f" }) }));
    const slot = (name: string) => m.lanes.find((l) => l.name === name)!.paletteSlot;
    expect([slot("Literature"), slot("Math"), slot("History"), slot("Science"), slot("Music")]).toEqual([7, 5, 6, 3, 1]);
    for (const [hex, n] of Object.entries(SWATCH_SLOTS)) expect(subjectSlots([{ ...SAMPLE_SUBJECTS[0]!, color: hex }])(SAMPLE_SUBJECTS[0]!.id), hex).toBe(n);
  });

  it("is case-blind, and Week, Track and Home deal the same slot through subjectSlots", () => {
    const subjects = withColors({ lit: "#7A5CC2" });
    expect(subjectSlots(subjects)("lit")).toBe(7);
    expect(buildTimelineModel(sampleInput({ subjects })).lanes.find((l) => l.subjectId === "lit")!.paletteSlot).toBe(7);
  });

  it("dealing by display order is only the default for a subject with no colour, or one with no hue", () => {
    const m = buildTimelineModel(sampleInput({ subjects: withColors({ lit: "not-a-colour", math: null }) }));
    expect(m.lanes.map((l) => l.paletteSlot)).toEqual([1, 2, 3, 4, 5]);
  });

  it("any other stored #rrggbb takes the hue of the nearest swatch, so no stored colour is left without a hue", () => {
    expect(slotOfColor("#1f6f43")).toBe(3); // a dark green: mint
    expect(slotOfColor("#2F6FB1")).toBe(5); // a hair off blue
    expect(slotOfColor("#fff")).toBeNull();
    expect(slotOfColor(null)).toBeNull();
    expect(buildTimelineModel(sampleInput({ subjects: withColors({ lit: "#1f6f43" }) })).lanes.find((l) => l.name === "Literature")!.paletteSlot).toBe(3);
  });

  it("changing a subject's colour moves its lane to that hue and leaves the others alone", () => {
    const before = buildTimelineModel(sampleInput({ subjects: withColors({}) }));
    const after = buildTimelineModel(sampleInput({ subjects: withColors({ sci: "#7a5cc2" }) }));
    expect(after.lanes.find((l) => l.name === "Science")!.paletteSlot).toBe(7);
    expect(after.lanes.filter((l) => l.name !== "Science").map((l) => l.paletteSlot)).toEqual(before.lanes.filter((l) => l.name !== "Science").map((l) => l.paletteSlot));
  });
});
