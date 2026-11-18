/** S20-01: moving a minutes assignment's end date keeps the minutes a day. Pages still thicken. */
import { countWeekdays, roundUnits, type ChildPlan, type LocalDate } from "@hh/engine";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("minutes stay a daily amount when the end date moves (S20-01)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let roster: { childIds: string[]; subjectIds: string[] };
  beforeAll(async () => {
    fam = await signedInFamily(pool, "Minutes span");
    req = inject(app, fam.cookies);
    roster = await rosterFor(app, fam.cookies, ["Ada"], ["Music"]);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });

  const create = async (over: Record<string, unknown>) => {
    const res = await req("POST", "/api/assignments", {
      subjectId: roster.subjectIds[0], title: "Piano", unitType: "minutes", totalUnits: 300, weightPerUnit: 0.5,
      startDate: "2026-09-07", endDate: "2026-09-18", childIds: roster.childIds, ...over,
    });
    expect(res.statusCode, res.body).toBe(201);
    return res.json() as { id: string; totalUnits: number; minutesPerDay: number | null };
  };
  const planOf = async (id: string, to: string) => {
    const res = await req("GET", `/api/plan?from=2026-09-07&to=${to}&asOf=2026-09-07`);
    expect(res.statusCode).toBe(200);
    return (res.json().plans as ChildPlan[]).find((p) => p.assignmentId === id)!;
  };

  it("shortening the end date rescales the hidden total and leaves 30 minutes a day", async () => {
    const a = await create({});
    expect(a.minutesPerDay).toBe(30);
    const before = await planOf(a.id, "2026-09-18");
    expect(before.baseRate).toBeCloseTo(30);
    const res = await req("PATCH", `/api/assignments/${a.id}`, { endDate: "2026-09-11" });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json().totalUnits).toBe(150);
    expect(res.json().minutesPerDay).toBe(30);
    const after = await planOf(a.id, "2026-09-11");
    expect(after.baseRate).toBeCloseTo(30);
    expect(after.weightPerUnit).toBe(0.5);
  });

  it("a pages assignment keeps its total, so the same shorter span is thicker", async () => {
    const a = await create({ title: "Reader", unitType: "pages", totalUnits: 100, weightPerUnit: 1 });
    const before = await planOf(a.id, "2026-09-18");
    const res = await req("PATCH", `/api/assignments/${a.id}`, { endDate: "2026-09-11" });
    expect(res.statusCode).toBe(200);
    expect(res.json().totalUnits).toBe(100);
    const after = await planOf(a.id, "2026-09-11");
    expect(after.baseRate).toBeGreaterThan(before.baseRate);
  });

  it("an awkward total keeps the same minutes a day when nothing else is saved (M1)", async () => {
    const start = "2026-08-18";
    const end = "2026-12-15";
    const days = countWeekdays(start as LocalDate, end as LocalDate, [2]);
    const daily = roundUnits(1200 / days);
    const a = await create({ title: "Nature walk and notebook", totalUnits: 1200, startDate: start, endDate: end, weekdays: [2] });
    expect(a.minutesPerDay).toBe(daily);
    expect(daily).not.toBe(60);
    const res = await req("PATCH", `/api/assignments/${a.id}`, { title: "Nature walk" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ totalUnits: 1200, minutesPerDay: daily, title: "Nature walk" });
  });

  it("a lessons total above 100,000 is still rejected", async () => {
    const res = await req("POST", "/api/assignments", {
      subjectId: roster.subjectIds[0], title: "Too many", unitType: "lessons", totalUnits: 100001, weightPerUnit: null,
      startDate: "2026-09-07", endDate: "2026-09-18", childIds: roster.childIds,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_request");
  });
});
