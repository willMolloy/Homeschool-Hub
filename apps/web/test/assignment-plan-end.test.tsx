/** S7b-14 (F-13): the Assignments list shows the stored dates and says when the plan runs past the end. */
import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, planAll, type ChildPlan } from "@hh/engine";
import type { Assignment } from "../src/api/types";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { FRANK, MAGGIE, READING, rowId, withRoster } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const HOBBIT: Assignment = {
  id: rowId(1), subjectId: READING.id, title: "The Hobbit", unitType: "pages", totalUnits: 300, weightPerUnit: 2,
  startDate: "2026-10-26", endDate: "2026-11-13", childIds: [FRANK.id], archived: false, weekdays: null,
};
const planOf = (a: Assignment, childIds: string[], overrides: Parameters<typeof planAll>[1]["overrides"] = []): ChildPlan[] =>
  planAll([{ id: a.id, subjectId: a.subjectId, childIds, unitType: a.unitType, totalUnits: a.totalUnits, start: a.startDate, end: a.endDate }],
    { calendar: { weekStart: "mon", schoolDays: [1, 2, 3, 4, 5] }, asOf: DEMO_ME.today, overrides });

function stub(rows: Assignment[], plans: ChildPlan[] | null) {
  withRoster();
  fakeApi.on("GET /api/assignments", 200, rows);
  if (plans) fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: DEMO_ME.today, to: DEMO_ME.today, plans });
}
const card = async () => within(await screen.findByRole("list", { name: "Assignments" })).getAllByRole("listitem")[0]!;

describe("the Assignments list and the plan's end (S7b-14, F-13)", () => {
  it("shows the stored dates and 'plan ends' when a push adjustment moved the plan's end past the stored one", async () => {
    // Treasure-Island style: the parent did less in a week and chose to move the end date.
    const plans = planOf(HOBBIT, [FRANK.id], [{ assignmentId: HOBBIT.id, weekStart: "2026-11-02", plannedUnits: 10, mode: "pushEndDate" }]);
    expect(plans[0]!.end > HOBBIT.endDate).toBe(true);
    stub([HOBBIT], plans);
    renderAt("/schedule/assignments");
    const text = (await card()).textContent!;
    await waitFor(async () => expect((await card()).textContent).toMatch(/Oct 26, 2026 – Nov 13, 2026 · plan ends [A-Z][a-z]{2} \d+, 2026/));
    expect(text).toContain("The Hobbit");
  });

  it("says nothing when the plan ends on time, or when the plan can't be loaded", async () => {
    stub([HOBBIT], planOf(HOBBIT, [FRANK.id]));
    const { unmount } = renderAt("/schedule/assignments");
    await card();
    await waitFor(() => expect(fakeApi.calls.some((c) => c.path.startsWith("/api/plan"))).toBe(true));
    expect((await card()).textContent).not.toMatch(/plan ends/);
    unmount();
    stub([HOBBIT], null); // no plan route: the fake API answers 404
    renderAt("/schedule/assignments");
    expect((await card()).textContent).not.toMatch(/plan ends/);
  });

  it("for a shared assignment it uses the latest end across the children", async () => {
    const shared = { ...HOBBIT, childIds: [FRANK.id, MAGGIE.id] };
    const plans = planOf(shared, [FRANK.id, MAGGIE.id]).map((p, i) => (i === 1 ? { ...p, end: "2026-11-20" } : p));
    stub([shared], plans);
    renderAt("/schedule/assignments");
    await waitFor(async () => expect((await card()).textContent).toContain("plan ends Nov 20, 2026"));
  });
});
