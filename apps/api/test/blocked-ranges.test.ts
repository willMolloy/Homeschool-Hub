import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { PlanResponse } from "../src/routes/plan";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("/api/blocked-ranges (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let kids: string[] = [];
  let subject = "";
  let foreignKid = "";
  let foreignRange = "";
  let req: ReturnType<typeof inject>;
  beforeAll(async () => {
    a = await signedInFamily(pool, "Blocked A");
    b = await signedInFamily(pool, "Blocked B");
    req = inject(app, a.cookies);
    const r = await rosterFor(app, a.cookies, ["Frank", "Ada", "Old"], ["Math"]);
    kids = r.childIds;
    subject = r.subjectIds[0]!;
    await req("PATCH", `/api/children/${kids[2]}`, { archived: true });
    const f = await rosterFor(app, b.cookies, ["Theirs"], []);
    foreignKid = f.childIds[0]!;
    foreignRange = (await inject(app, b.cookies)("POST", "/api/blocked-ranges", { startDate: "2026-12-21", endDate: "2027-01-01" })).json().id;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  it("CRUD round-trip: create → list → patch → delete (204) → gone", async () => {
    const c = await req("POST", "/api/blocked-ranges", { label: " Thanksgiving ", kind: "holiday", startDate: "2026-11-25", endDate: "2026-11-27" });
    expect(c.statusCode).toBe(201);
    const row = c.json();
    expect(row).toEqual({ id: expect.any(String), label: "Thanksgiving", kind: "holiday", startDate: "2026-11-25", endDate: "2026-11-27", childIds: [] });
    expect((await req("GET", "/api/blocked-ranges")).json()).toEqual([row]);
    const p = await req("PATCH", `/api/blocked-ranges/${row.id}`, { endDate: "2026-11-30", childIds: [kids[1]] });
    expect(p.statusCode).toBe(200);
    expect(p.json()).toEqual({ ...row, endDate: "2026-11-30", childIds: [kids[1]] });
    expect((await req("PATCH", `/api/blocked-ranges/${row.id}`, { label: "" })).json().label).toBeNull();
    expect((await req("PATCH", `/api/blocked-ranges/${row.id}`, { childIds: [] })).json().childIds).toEqual([]);
    const d = await req("DELETE", `/api/blocked-ranges/${row.id}`);
    expect(d.statusCode).toBe(204);
    expect(d.body).toBe("");
    expect((await req("GET", "/api/blocked-ranges")).json()).toEqual([]);
    expect((await req("DELETE", `/api/blocked-ranges/${row.id}`)).statusCode).toBe(404);
  });

  it("defaults: kind vacation, label null, whole family; specific children stored in roster order", async () => {
    const r1 = (await req("POST", "/api/blocked-ranges", { startDate: "2027-03-15", endDate: "2027-03-19" })).json();
    expect(r1).toMatchObject({ kind: "vacation", label: null, childIds: [] });
    const r2 = (await req("POST", "/api/blocked-ranges", { kind: "sick", startDate: "2027-03-22", endDate: "2027-03-22", childIds: [kids[1], kids[0]] })).json();
    expect(r2.childIds).toEqual([kids[0], kids[1]]);
    const list = (await req("GET", "/api/blocked-ranges")).json();
    expect(list.map((x: { id: string }) => x.id)).toEqual([r1.id, r2.id]);
    await req("DELETE", `/api/blocked-ranges/${r1.id}`);
    await req("DELETE", `/api/blocked-ranges/${r2.id}`);
  });

  it("a vacation shows up as blocked days in /api/plan", async () => {
    const asg = (await req("POST", "/api/assignments", {
      subjectId: subject, title: "Math", unitType: "lessons", totalUnits: 10, startDate: "2026-11-02", endDate: "2026-11-13", childIds: [kids[0]],
    })).json().id;
    const day = async (date: string) => {
      const p: PlanResponse = (await req("GET", "/api/plan?from=2026-11-02&to=2026-11-13&asOf=2026-11-02")).json();
      return p.plans.find((x) => x.assignmentId === asg)!.days.find((d) => d.date === date)!;
    };
    expect(await day("2026-11-04")).toMatchObject({ schoolDay: true });
    expect((await day("2026-11-04")).minutes).toBeGreaterThan(0);
    const v = (await req("POST", "/api/blocked-ranges", { startDate: "2026-11-04", endDate: "2026-11-06" })).json();
    expect(await day("2026-11-04")).toMatchObject({ schoolDay: false, capacity: 0, minutes: 0 });
    expect(await day("2026-11-06")).toMatchObject({ schoolDay: false, minutes: 0 });
    // Only for Ada → Frank's plan is unaffected.
    await req("PATCH", `/api/blocked-ranges/${v.id}`, { childIds: [kids[1]] });
    expect((await day("2026-11-04")).schoolDay).toBe(true);
    await req("DELETE", `/api/blocked-ranges/${v.id}`);
    await req("PATCH", `/api/assignments/${asg}`, { archived: true });
  });

  it.each([
    ["bad kind", { kind: "party" }, "invalid_request"],
    ["end before start", { endDate: "2026-11-01" }, "invalid_range"],
    ["367-day span", { startDate: "2026-01-01", endDate: "2027-01-02" }, "invalid_range"],
    ["missing endDate", { endDate: undefined }, "invalid_request"],
    ["Feb 30", { startDate: "2027-02-30" }, "invalid_request"],
    ["61-char label", { label: "x".repeat(61) }, "invalid_request"],
    ["NUL label", { label: "a\u0000" }, "invalid_request"],
    ["malformed child", { childIds: ["x"] }, "invalid_request"],
  ])("%s → 400 %s", async (_l, over, code) => {
    const res = await req("POST", "/api/blocked-ranges", { startDate: "2026-11-02", endDate: "2026-11-06", ...over });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe(code);
  });

  it("366 days is allowed (counting both ends)", async () => {
    const res = await req("POST", "/api/blocked-ranges", { startDate: "2028-01-01", endDate: "2028-12-31" });
    expect(res.statusCode).toBe(201);
    await req("DELETE", `/api/blocked-ranges/${res.json().id}`);
  });

  it("foreign or archived child → 400 invalid_reference", async () => {
    for (const childIds of [[foreignKid], [kids[2]]]) {
      const res = await req("POST", "/api/blocked-ranges", { startDate: "2026-11-02", endDate: "2026-11-06", childIds });
      expect(res.json().error).toBe("invalid_reference");
    }
  });

  it("PATCH: merged dates are checked; empty body → 400", async () => {
    const id = (await req("POST", "/api/blocked-ranges", { startDate: "2027-05-03", endDate: "2027-05-07" })).json().id;
    expect((await req("PATCH", `/api/blocked-ranges/${id}`, { endDate: "2027-05-01" })).json().error).toBe("invalid_range");
    expect((await req("PATCH", `/api/blocked-ranges/${id}`, {})).json().error).toBe("invalid_request");
    await req("DELETE", `/api/blocked-ranges/${id}`);
  });

  it("foreign, unknown or malformed id → 404 on PATCH and DELETE; their row survives", async () => {
    for (const id of [foreignRange, "00000000-0000-4000-8000-000000000000", "nope"]) {
      expect((await req("PATCH", `/api/blocked-ranges/${id}`, { label: "x" })).statusCode).toBe(404);
      expect((await req("DELETE", `/api/blocked-ranges/${id}`)).statusCode).toBe(404);
    }
    const { rows } = await pool.query("SELECT label FROM blocked_range WHERE id = $1", [foreignRange]);
    expect(rows).toEqual([{ label: null }]);
    expect((await req("GET", "/api/blocked-ranges")).json().map((x: { id: string }) => x.id)).not.toContain(foreignRange);
  });

  it("signed out → 401", async () => {
    const anon = inject(app, null);
    expect((await anon("GET", "/api/blocked-ranges")).statusCode).toBe(401);
    expect((await anon("POST", "/api/blocked-ranges", { startDate: "2026-11-02", endDate: "2026-11-02" })).statusCode).toBe(401);
    expect((await anon("DELETE", `/api/blocked-ranges/${foreignRange}`)).statusCode).toBe(401);
  });
});
