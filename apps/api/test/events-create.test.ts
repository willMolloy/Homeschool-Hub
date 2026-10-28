import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { PlanResponse } from "../src/routes/plan";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("POST /api/events (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let kids: string[] = [];
  let subjects: string[] = [];
  let foreignKid = "";
  let foreignSubject = "";
  let req: ReturnType<typeof inject>;
  beforeAll(async () => {
    a = await signedInFamily(pool, "Events A");
    b = await signedInFamily(pool, "Events B");
    req = inject(app, a.cookies);
    const r = await rosterFor(app, a.cookies, ["Frank", "Ada"], ["Math", "Music", "Old"]);
    kids = r.childIds;
    subjects = r.subjectIds;
    await req("PATCH", `/api/subjects/${subjects[2]}`, { archived: true });
    const f = await rosterFor(app, b.cookies, ["Theirs"], ["Theirs"]);
    foreignKid = f.childIds[0]!;
    foreignSubject = f.subjectIds[0]!;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  const ok = () => ({ name: "Co-op", weekdays: [3] });

  it("valid → 201 with rules and children, and shows up in the list", async () => {
    const res = await req("POST", "/api/events", {
      name: "  Piano ", weekdays: [5, 2], startDate: "2026-09-01", endDate: "2027-05-28", capacityFraction: 0.25, defaultRule: "lighter",
      subjectRules: { [subjects[1]!.toUpperCase()]: "skip", [subjects[0]!]: "normal" }, childIds: [kids[1]],
    });
    expect(res.statusCode).toBe(201);
    const e = res.json();
    expect(e).toEqual({
      id: expect.any(String), name: "Piano", weekdays: [2, 5], startDate: "2026-09-01", endDate: "2027-05-28", capacityFraction: 0.25,
      defaultRule: "lighter", subjectRules: { [subjects[1]!]: "skip", [subjects[0]!]: "normal" }, childIds: [kids[1]], archived: false,
    });
    expect((await req("GET", "/api/events")).json()).toContainEqual(e);
  });

  it("defaults: open-ended, capacity 0.5, rule normal, no rules, whole family", async () => {
    const e = (await req("POST", "/api/events", ok())).json();
    expect(e).toMatchObject({ startDate: null, endDate: null, capacityFraction: 0.5, defaultRule: "normal", subjectRules: {}, childIds: [] });
  });

  it("only a start or only an end is allowed (open-ended on the other side)", async () => {
    expect((await req("POST", "/api/events", { ...ok(), startDate: "2026-09-01" })).statusCode).toBe(201);
    expect((await req("POST", "/api/events", { ...ok(), endDate: "2026-09-01", startDate: null })).statusCode).toBe(201);
  });

  const bad: [string, Record<string, unknown>][] = [
    ["empty weekdays", { weekdays: [] }],
    ["weekday 7", { weekdays: [7] }],
    ["repeated weekday", { weekdays: [1, 1] }],
    ["capacity 1.5", { capacityFraction: 1.5 }],
    ["capacity -0.1", { capacityFraction: -0.1 }],
    ["capacity as text", { capacityFraction: "0.5" }],
    ["rule 'maybe'", { defaultRule: "maybe" }],
    ["subject rule 'maybe'", { subjectRules: { "00000000-0000-4000-8000-000000000001": "maybe" } }],
    ["rules as array", { subjectRules: ["skip"] }],
    ["rules null", { subjectRules: null }],
    ["rule key not a uuid", { subjectRules: { math: "skip" } }],
    ["constructor key", { subjectRules: { constructor: "skip" } }],
    ["blank name", { name: "   " }],
    ["name 121 chars", { name: "x".repeat(121) }],
    ["no name", { name: undefined }],
    ["end < start", { startDate: "2026-09-02", endDate: "2026-09-01" }],
    ["bad date", { startDate: "2026-02-30" }],
    ["21 children", { childIds: Array.from({ length: 21 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`) }],
  ];
  it.each(bad)("%s → 400", async (_, patch) => {
    const res = await req("POST", "/api/events", { ...ok(), ...patch });
    expect(res.statusCode).toBe(400);
  });

  it("101 rules → 400", async () => {
    const rules = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, "skip"]));
    expect((await req("POST", "/api/events", { ...ok(), subjectRules: rules })).statusCode).toBe(400);
  });

  it("the same subject twice (differing only in case) → 400", async () => {
    const s = subjects[0]!;
    const res = await req("POST", "/api/events", { ...ok(), subjectRules: { [s]: "skip", [s.toUpperCase()]: "normal" } });
    expect(res.statusCode).toBe(400);
  });

  it("__proto__ key in raw JSON → 400, and Object.prototype untouched", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/events", cookies: a.cookies, headers: { "content-type": "application/json" },
      payload: `{"name":"x","weekdays":[1],"subjectRules":{"__proto__":{"polluted":"skip"}}}`,
    });
    expect(res.statusCode).toBe(400);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it.each([
    ["foreign subject", () => ({ subjectRules: { [foreignSubject]: "skip" } })],
    ["archived subject", () => ({ subjectRules: { [subjects[2]!]: "skip" } })],
    ["foreign child", () => ({ childIds: [foreignKid] })],
  ])("%s → 400 invalid_reference, nothing written", async (_, extra) => {
    const before = (await req("GET", "/api/events?includeArchived=true")).json().length;
    const res = await req("POST", "/api/events", { ...ok(), ...extra() });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_reference");
    expect((await req("GET", "/api/events?includeArchived=true")).json()).toHaveLength(before);
  });

  it("a created event changes /api/plan on its weekdays", async () => {
    const fresh = await signedInFamily(pool, "Events plan");
    const r = inject(app, fresh.cookies);
    const { childIds, subjectIds } = await rosterFor(app, fresh.cookies, ["Frank"], ["Math", "Music"]);
    const asg = (await r("POST", "/api/assignments", {
      subjectId: subjectIds[0], title: "Math", unitType: "lessons", totalUnits: 10, startDate: "2026-11-02", endDate: "2026-11-13", childIds,
    })).json().id;
    const day = async (date: string) => {
      const p: PlanResponse = (await r("GET", "/api/plan?from=2026-11-02&to=2026-11-13&asOf=2026-11-02")).json();
      return p.plans.find((x) => x.assignmentId === asg)!.days.find((d) => d.date === date)!;
    };
    expect((await day("2026-11-04")).capacity).toBe(1);
    // Wednesday co-op that skips Math.
    await r("POST", "/api/events", { name: "Co-op", weekdays: [3], subjectRules: { [subjectIds[0]!]: "skip" } });
    expect(await day("2026-11-04")).toMatchObject({ schoolDay: true, capacity: 0, units: 0, minutes: 0 });
    expect(await day("2026-11-11")).toMatchObject({ capacity: 0, units: 0 });
    expect((await day("2026-11-05")).capacity).toBe(1);
    // A rule for another subject leaves Math's Thursdays alone.
    await r("POST", "/api/events", { name: "Piano", weekdays: [4], subjectRules: { [subjectIds[1]!]: "skip" } });
    expect((await day("2026-11-05")).capacity).toBe(1);
    await pool.query("DELETE FROM family WHERE id = $1", [fresh.familyId]);
  });

  it("signed out → 401", async () => {
    expect((await inject(app, null)("POST", "/api/events", ok())).statusCode).toBe(401);
  });
});
