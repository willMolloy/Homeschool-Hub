import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { EventJson } from "../src/repos/eventRepo";
import type { PlanResponse } from "../src/routes/plan";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("PATCH /api/events/:id (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let kids: string[] = [];
  let subjects: string[] = [];
  let foreignEvent = "";
  let foreignSubject = "";
  let req: ReturnType<typeof inject>;
  let ev: EventJson;
  beforeAll(async () => {
    a = await signedInFamily(pool, "Events patch A");
    b = await signedInFamily(pool, "Events patch B");
    req = inject(app, a.cookies);
    const r = await rosterFor(app, a.cookies, ["Frank", "Ada"], ["Math", "Music"]);
    kids = r.childIds;
    subjects = r.subjectIds;
    const f = await rosterFor(app, b.cookies, [], ["Theirs"]);
    foreignSubject = f.subjectIds[0]!;
    foreignEvent = (await inject(app, b.cookies)("POST", "/api/events", { name: "Theirs", weekdays: [1] })).json().id;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  const fresh = async () => {
    ev = (await req("POST", "/api/events", {
      name: "Co-op", weekdays: [3], startDate: "2026-09-01", endDate: "2027-05-28", capacityFraction: 0.5,
      subjectRules: { [subjects[0]!]: "skip" }, childIds: [kids[0]],
    })).json();
    return ev;
  };
  const patch = (id: string, body: unknown) => req("PATCH", `/api/events/${id}`, body);

  it.each([
    ["name", { name: " Piano " }, { name: "Piano" }],
    ["weekdays", { weekdays: [4, 2] }, { weekdays: [2, 4] }],
    ["startDate", { startDate: "2026-10-01" }, { startDate: "2026-10-01" }],
    ["endDate", { endDate: "2027-01-01" }, { endDate: "2027-01-01" }],
    ["startDate null", { startDate: null }, { startDate: null }],
    ["endDate null", { endDate: null }, { endDate: null }],
    ["capacityFraction", { capacityFraction: 0.125 }, { capacityFraction: 0.125 }],
    ["defaultRule", { defaultRule: "lighter" }, { defaultRule: "lighter" }],
  ] as const)("%s alone", async (_, body, want) => {
    const e = await fresh();
    const res = await patch(e.id, body);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ...e, ...want });
  });

  it("subjectRules replaced (not merged); {} clears them", async () => {
    const e = await fresh();
    expect((await patch(e.id, { subjectRules: { [subjects[1]!]: "lighter" } })).json().subjectRules).toEqual({ [subjects[1]!]: "lighter" });
    expect((await patch(e.id, { subjectRules: {} })).json().subjectRules).toEqual({});
  });

  it("childIds replaced; [] = whole family", async () => {
    const e = await fresh();
    expect((await patch(e.id, { childIds: [kids[1], kids[0]] })).json().childIds).toEqual([kids[0], kids[1]]);
    expect((await patch(e.id, { childIds: [] })).json().childIds).toEqual([]);
  });

  it("archive round-trip removes and restores its effect on /api/plan", async () => {
    const fam = await signedInFamily(pool, "Events patch plan");
    const r = inject(app, fam.cookies);
    const { childIds, subjectIds } = await rosterFor(app, fam.cookies, ["Frank"], ["Math"]);
    const asg = (await r("POST", "/api/assignments", {
      subjectId: subjectIds[0], title: "Math", unitType: "lessons", totalUnits: 10, startDate: "2026-11-02", endDate: "2026-11-13", childIds,
    })).json().id;
    const wed = async () => {
      const p: PlanResponse = (await r("GET", "/api/plan?from=2026-11-02&to=2026-11-13&asOf=2026-11-02")).json();
      return p.plans.find((x) => x.assignmentId === asg)!.days.find((d) => d.date === "2026-11-04")!.capacity;
    };
    const e = (await r("POST", "/api/events", { name: "Co-op", weekdays: [3], defaultRule: "skip" })).json();
    expect(await wed()).toBe(0);
    const off = await r("PATCH", `/api/events/${e.id}`, { archived: true });
    expect(off.json().archived).toBe(true);
    expect((await r("GET", "/api/events")).json()).toEqual([]);
    expect(await wed()).toBe(1);
    expect((await r("PATCH", `/api/events/${e.id}`, { archived: false })).json().archived).toBe(false);
    expect(await wed()).toBe(0);
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
  });

  it("an archived event can still be edited", async () => {
    const e = await fresh();
    await patch(e.id, { archived: true });
    expect((await patch(e.id, { name: "Renamed" })).json()).toMatchObject({ name: "Renamed", archived: true });
  });

  it("merged dates: moving one end past the other → 400", async () => {
    const e = await fresh();
    expect((await patch(e.id, { endDate: "2026-08-01" })).statusCode).toBe(400);
    expect((await patch(e.id, { startDate: "2027-06-01" })).statusCode).toBe(400);
    // ...but fine once the other end is cleared.
    expect((await patch(e.id, { endDate: null, startDate: "2027-06-01" })).statusCode).toBe(200);
  });

  it.each([
    ["empty body", {}],
    ["only unknown keys", { colour: "red" }],
    ["weekday 7", { weekdays: [7] }],
    ["capacity 1.5", { capacityFraction: 1.5 }],
    ["rule maybe", { defaultRule: "maybe" }],
    ["blank name", { name: " " }],
    ["archived as text", { archived: "yes" }],
  ])("%s → 400", async (_, body) => {
    const e = await fresh();
    expect((await patch(e.id, body)).statusCode).toBe(400);
  });

  it("foreign subject in rules → 400 invalid_reference, rules unchanged", async () => {
    const e = await fresh();
    const res = await patch(e.id, { subjectRules: { [foreignSubject]: "skip" } });
    expect(res.json().error).toBe("invalid_reference");
    expect((await req("GET", "/api/events")).json().find((x: EventJson) => x.id === e.id).subjectRules).toEqual(e.subjectRules);
  });

  it.each([["foreign", () => foreignEvent], ["unknown", () => "00000000-0000-4000-8000-000000000000"], ["malformed", () => "nope"]])(
    "%s id → 404", async (_, id) => {
      expect((await patch(id(), { name: "x" })).statusCode).toBe(404);
    });

  it("the other family's event is untouched", async () => {
    await patch(foreignEvent, { name: "Hijacked" });
    expect((await inject(app, b.cookies)("GET", "/api/events")).json()[0].name).toBe("Theirs");
  });

  it("signed out → 401", async () => {
    expect((await inject(app, null)("PATCH", `/api/events/${foreignEvent}`, { name: "x" })).statusCode).toBe(401);
  });
});
