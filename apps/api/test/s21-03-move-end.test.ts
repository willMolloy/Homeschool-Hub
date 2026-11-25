/** S21-03: pushing an end saves that date; a day inside the break does not; the other book can stay. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { countWeekdays, listBreakOverlaps } from "@hh/engine";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("move the end when a break overlaps (S21-03)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let familyId = "";
  let req: ReturnType<typeof inject>;
  let childId = "";
  let subjectId = "";

  beforeAll(async () => {
    const fam = await signedInFamily(pool, "Move end");
    familyId = fam.familyId;
    req = inject(app, fam.cookies);
    const roster = await rosterFor(app, fam.cookies, ["Frank"], ["Literature"]);
    childId = roster.childIds[0]!;
    subjectId = roster.subjectIds[0]!;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [familyId]);
    await pool.end();
  });

  const make = (title: string) => req("POST", "/api/assignments", {
    subjectId, title, unitType: "pages", totalUnits: 100, startDate: "2026-01-05", endDate: "2026-05-21", childIds: [childId],
  });

  it("refuses a day inside the break and does not save it", async () => {
    const id = (await make("Inside")).json().id as string;
    const refused = await req("POST", "/api/blocked-ranges", {
      label: "February", startDate: "2026-02-01", endDate: "2026-02-28",
      adjustments: [{ assignmentId: id, endDate: "2026-02-10" }],
    });
    expect(refused.statusCode).toBe(400);
    expect(refused.json().message).toBe("Pick a day after Feb 28, 2026.");
    expect((await req("GET", "/api/blocked-ranges")).json()).toEqual([]);
    expect((await req("GET", "/api/assignments")).json().find((a: { id: string }) => a.id === id).endDate).toBe("2026-05-21");
  });

  it("refuses a Saturday, which is not a family school day", async () => {
    const id = (await make("Weekend")).json().id as string;
    const refused = await req("POST", "/api/blocked-ranges", {
      label: "February", startDate: "2026-02-01", endDate: "2026-02-28",
      adjustments: [{ assignmentId: id, endDate: "2026-03-07" }],
    });
    expect(refused.statusCode).toBe(400);
    expect(refused.json().message).toBe("Pick a school day.");
    expect((await req("GET", "/api/blocked-ranges")).json().some((b: { label: string }) => b.label === "February")).toBe(false);
  });

  it("pushes one book by its overlapped school days and leaves the other on May 21", async () => {
    const kept = (await make("Kept")).json().id as string;
    const moved = (await make("Moved")).json().id as string;
    const [row] = listBreakOverlaps({
      breaks: [{ start: "2026-02-01", end: "2026-02-28", childIds: [] }],
      assignments: [{ id: moved, title: "Moved", start: "2026-01-05", end: "2026-05-21", childIds: [childId], weekdays: null, subjectId }],
      existing: [],
      schoolDays: [1, 2, 3, 4, 5],
    });
    expect(row!.schoolDays).toBe(20);
    expect(countWeekdays("2026-05-21", row!.pushedEnd, [1, 2, 3, 4, 5]) - 1).toBe(20);
    const saved = await req("POST", "/api/blocked-ranges", {
      label: "February", startDate: "2026-02-01", endDate: "2026-02-28",
      adjustments: [{ assignmentId: moved, endDate: row!.pushedEnd }],
    });
    expect(saved.statusCode).toBe(201);
    const ends = new Map(((await req("GET", "/api/assignments")).json() as { id: string; endDate: string }[]).map((a) => [a.id, a.endDate]));
    expect(ends.get(kept)).toBe("2026-05-21");
    expect(ends.get(moved)).toBe(row!.pushedEnd);
    const plan = (await req("GET", "/api/plan?from=2026-01-05&to=2026-08-01&asOf=2026-01-05")).json();
    const days = plan.plans.find((p: { assignmentId: string }) => p.assignmentId === moved).days;
    expect(days.find((d: { date: string }) => d.date === "2026-02-02").units).toBe(0);
    expect(plan.plans.find((p: { assignmentId: string }) => p.assignmentId === moved).end).toBe(row!.pushedEnd);
    const keptPlan = plan.plans.find((p: { assignmentId: string }) => p.assignmentId === kept);
    const pushedPlan = plan.plans.find((p: { assignmentId: string }) => p.assignmentId === moved);
    expect(pushedPlan.baseRate).toBeLessThan(keptPlan.baseRate);
  });

  it("a custom day becomes the end, and a minutes book keeps its minutes a day", async () => {
    const pages = (await make("Custom")).json().id as string;
    const daily = await req("POST", "/api/assignments", {
      subjectId, title: "Piano", unitType: "minutes", totalUnits: 3000, minutesPerDay: 30, startDate: "2026-01-05", endDate: "2026-05-21", childIds: [childId],
    });
    expect(daily.statusCode).toBe(201);
    const piano = daily.json().id as string;
    const saved = await req("POST", "/api/blocked-ranges", {
      label: "March", startDate: "2026-03-02", endDate: "2026-03-06",
      adjustments: [
        { assignmentId: pages, endDate: "2026-06-15" },
        { assignmentId: piano, endDate: "2026-06-15" },
      ],
    });
    expect(saved.statusCode).toBe(201);
    const rows = (await req("GET", "/api/assignments")).json() as { id: string; endDate: string; minutesPerDay: number | null; totalUnits: number }[];
    expect(rows.find((a) => a.id === pages)).toMatchObject({ endDate: "2026-06-15" });
    const pianoRow = rows.find((a) => a.id === piano)!;
    expect(pianoRow.endDate).toBe("2026-06-15");
    expect(pianoRow.minutesPerDay).toBe(30);
    expect(pianoRow.totalUnits).toBeGreaterThan(3000);
  });
});
