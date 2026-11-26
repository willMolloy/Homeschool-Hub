/** S22-06: a shared book stays one Together bar while the ends match, and splits when they do not. */
import { describe, expect, it } from "vitest";
import { TOGETHER_KEY, layoutTimeline, togetherAssignmentIds } from "../src/features/timeline/layout";
import { buildTimelineModel, type TimelineModel } from "../src/features/timeline/model";
import { sampleInput } from "./helpers/timeline-fixtures";

const family = buildTimelineModel(sampleInput());

function fork(model: TimelineModel, id: string, childId: string, plannedEnd: string, endedAs?: "finished" | "stopped"): TimelineModel {
  return {
    ...model,
    lanes: model.lanes.map((l) => ({
      ...l,
      children: l.children.map((c) => ({
        ...c,
        assignments: c.assignments.map((a) => a.assignmentId === id && a.childId === childId
          ? { ...a, plannedEnd, end: plannedEnd, ...(endedAs ? { endedAs } : {}) }
          : a),
      })),
    })),
  };
}

describe("a shared year bar (S22-06)", () => {
  const shared = [...togetherAssignmentIds(family)][0]!;

  it("keeps one Together bar while the planned ends match", () => {
    const l = layoutTimeline(family, { zoom: "year", width: 1280 });
    const bands = l.bands.filter((b) => b.assignmentId === shared);
    expect(bands).toHaveLength(1);
    expect(l.rows.find((r) => r.key === bands[0]!.rowKey)!.groupKey).toBe(TOGETHER_KEY);
  });

  it("draws one bar in each child's group when the planned ends differ", () => {
    const moved = fork(family, shared, "margaret", "2027-06-01");
    expect(togetherAssignmentIds(moved).has(shared)).toBe(false);
    const l = layoutTimeline(moved, { zoom: "year", width: 1280 });
    const bands = l.bands.filter((b) => b.assignmentId === shared);
    expect(bands.map((b) => b.childId).sort()).toEqual(["frank", "margaret"]);
    for (const b of bands) expect(l.rows.find((r) => r.key === b.rowKey)!.groupKey).not.toBe(TOGETHER_KEY);
  });

  it("splits when one child is finished and the other is open", () => {
    const done = fork(family, shared, "frank", family.lanes.flatMap((l) => l.children).flatMap((c) => c.assignments).find((a) => a.assignmentId === shared)!.plannedEnd, "finished");
    const l = layoutTimeline(done, { zoom: "year", width: 1280 });
    const bands = l.bands.filter((b) => b.assignmentId === shared);
    expect(bands).toHaveLength(2);
    expect(bands.find((b) => b.childId === "frank")!.ended).toBe("finished");
    expect(bands.find((b) => b.childId === "margaret")!.ended).toBeUndefined();
  });
});
