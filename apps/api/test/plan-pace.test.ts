/** S7b-10: POST /api/plan/pace counts the days the plan will really use. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";
import type { PlanResponse } from "../src/routes/plan";

describe.skipIf(!hasDb)("POST /api/plan/pace (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2026-10-28T15:00:00Z") }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let kids: string[] = [];
  let subject = "";
  const draft = (over: object = {}) => ({ subjectId: subject, childIds: [kids[0]], startDate: "2026-11-02", endDate: "2027-01-29", weekdays: null, ...over });
  const pace = (drafts: object[]) => req("POST", "/api/plan/pace", { drafts });

  beforeAll(async () => {
    a = await signedInFamily(pool, "Pace A");
    b = await signedInFamily(pool, "Pace B");
    req = inject(app, a.cookies);
    const r = await rosterFor(app, a.cookies, ["Ada", "Ben"], ["Literature"]);
    kids = r.childIds;
    subject = r.subjectIds[0]!;
    // The review's year: Thanksgiving week and the Christmas break off for everyone, a Tuesday co-op that skips Literature for Ada.
    await req("POST", "/api/blocked-ranges", { label: "Thanksgiving", kind: "vacation", startDate: "2026-11-23", endDate: "2026-11-27", childIds: [] });
    await req("POST", "/api/blocked-ranges", { label: "Christmas", kind: "vacation", startDate: "2026-12-21", endDate: "2027-01-01", childIds: [] });
    await req("POST", "/api/events", { name: "Co-op", weekdays: [2], startDate: null, endDate: null, capacityFraction: 1, defaultRule: "normal", subjectRules: { [subject]: "skip" }, childIds: [kids[0]] });
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  it("401 without a session", async () => {
    expect((await app.inject({ method: "POST", url: "/api/plan/pace", payload: { drafts: [draft()] } })).statusCode).toBe(401);
  });

  it("counts the real days, and total over those days is the plan's own pace", async () => {
    const res = await pace([draft()]);
    expect(res.statusCode, res.body).toBe(200);
    const days = res.json().paces[0].capacityDays as number;
    // 65 weekdays, minus 5 + 10 break days and 11 Tuesdays (12 in the range, one inside a break).
    expect(days).toBeLessThan(65 - 15);
    const asg = (await req("POST", "/api/assignments", { subjectId: subject, title: "Science", unitType: "pages", totalUnits: 300, weightPerUnit: 2, startDate: "2026-11-02", endDate: "2027-01-29", childIds: [kids[0]] })).json();
    const plan = (await req("GET", "/api/plan?from=2026-11-02&to=2027-01-29")).json<PlanResponse>().plans.find((p) => p.assignmentId === asg.id)!;
    expect(plan.baseRate).toBeCloseTo(300 / days, 6);
  });

  it("answers per child and the smallest of them; the other child has no co-op", async () => {
    const r = (await pace([draft({ childIds: [kids[0], kids[1]] })])).json().paces[0];
    const byChild = Object.fromEntries(r.perChild.map((c: { childId: string; capacityDays: number }) => [c.childId, c.capacityDays]));
    expect(byChild[kids[1]!]).toBeGreaterThan(byChild[kids[0]!]);
    expect(r.capacityDays).toBe(byChild[kids[0]!]);
  });

  it("follows the assignment's own days, and several drafts answer in order", async () => {
    const r = (await pace([draft({ weekdays: [1] }), draft({ weekdays: [1, 3] }), draft({ startDate: "2026-11-23", endDate: "2026-11-27" })])).json().paces;
    expect(r[1].capacityDays).toBeGreaterThan(r[0].capacityDays);
    expect(r[2].capacityDays).toBe(0); // Thanksgiving week
  });

  it("validates like the other schedule routes", async () => {
    expect((await pace([])).statusCode).toBe(400);
    expect((await pace([draft({ childIds: [] })])).statusCode).toBe(400);
    expect((await pace([draft({ startDate: "2027-02-01" })])).statusCode).toBe(400);
    expect((await pace([draft({ weekdays: [] })])).statusCode).toBe(400);
    expect((await pace([{ ...draft(), extra: 1 }])).statusCode).toBe(400);
    expect((await req("POST", "/api/plan/pace", { drafts: [draft()], x: 1 })).statusCode).toBe(400);
  });

  it("another family's days off and events never count", async () => {
    const other = inject(app, b.cookies);
    const r = await rosterFor(app, b.cookies, ["Zed"], ["Art"]);
    const res = await other("POST", "/api/plan/pace", { drafts: [{ subjectId: r.subjectIds[0], childIds: [r.childIds[0]], startDate: "2026-11-02", endDate: "2026-11-27", weekdays: null }] });
    expect(res.json().paces[0].capacityDays).toBe(20);
  });
});
