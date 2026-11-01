/**
 * Tester round 2 (Sprint 2a): cross-family access on every new route, validation edge cases, time-zone aliases,
 * plan-vs-engine on tricky combinations and concurrency. Independent of the developer's own suites.
 */
import { planAll, type Assignment, type BlockedPeriod, type ChildPlan, type FamilyCalendar, type RecurringEvent } from "@hh/engine";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { PlanResponse } from "../src/routes/plan";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

type Fam = Awaited<ReturnType<typeof signedInFamily>>;
const MISSING = "00000000-0000-4000-8000-000000000000";

describe.skipIf(!hasDb)("tester round 2: Sprint 2a schedule API (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  const fams: Fam[] = [];
  const newFam = async (name: string) => {
    const f = await signedInFamily(pool, name);
    fams.push(f);
    return { ...f, req: inject(app, f.cookies) };
  };
  afterAll(async () => {
    await app.close();
    for (const f of fams) await pool.query("DELETE FROM family WHERE id = $1", [f.familyId]);
    await pool.end();
  });

  const assignmentBody = (subjectId: string, childIds: string[], over: Record<string, unknown> = {}) => ({
    subjectId, title: "Book", unitType: "pages", totalUnits: 40, weightPerUnit: 2.5, startDate: "2026-11-02", endDate: "2026-11-27", childIds, ...over,
  });

  describe("cross-family access on every new route", () => {
    let A: Awaited<ReturnType<typeof newFam>>;
    let B: Awaited<ReturnType<typeof newFam>>;
    let aRoster: { childIds: string[]; subjectIds: string[] };
    let bRoster: { childIds: string[]; subjectIds: string[] };
    let aAssignment = "";
    let aEvent = "";
    let aBlocked = "";
    beforeAll(async () => {
      A = await newFam("Tester2 A");
      B = await newFam("Tester2 B");
      aRoster = await rosterFor(app, A.cookies, ["Ann"], ["Art"]);
      bRoster = await rosterFor(app, B.cookies, ["Bob"], ["Bio"]);
      aAssignment = (await A.req("POST", "/api/assignments", assignmentBody(aRoster.subjectIds[0]!, aRoster.childIds))).json().id;
      aEvent = (await A.req("POST", "/api/events", { name: "Co-op", weekdays: [3], subjectRules: { [aRoster.subjectIds[0]!]: "skip" }, childIds: aRoster.childIds })).json().id;
      aBlocked = (await A.req("POST", "/api/blocked-ranges", { startDate: "2026-11-09", endDate: "2026-11-10", childIds: aRoster.childIds })).json().id;
      expect([aAssignment, aEvent, aBlocked].every(Boolean)).toBe(true);
    });

    it("lists never show the other family's rows (incl. archived)", async () => {
      for (const url of ["/api/assignments?includeArchived=true", "/api/events?includeArchived=true", "/api/blocked-ranges"]) {
        const res = await B.req("GET", url);
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual([]);
      }
    });

    it("PATCH/DELETE on the other family's ids → 404 (also upper-cased), and A's rows are unchanged", async () => {
      for (const id of [aAssignment, aAssignment.toUpperCase()]) {
        expect((await B.req("PATCH", `/api/assignments/${id}`, { title: "pwned" })).statusCode).toBe(404);
        expect((await B.req("PATCH", `/api/assignments/${id}`, { archived: true })).statusCode).toBe(404);
      }
      for (const id of [aEvent, aEvent.toUpperCase()]) {
        expect((await B.req("PATCH", `/api/events/${id}`, { name: "pwned" })).statusCode).toBe(404);
      }
      for (const id of [aBlocked, aBlocked.toUpperCase()]) {
        expect((await B.req("PATCH", `/api/blocked-ranges/${id}`, { label: "pwned" })).statusCode).toBe(404);
        expect((await B.req("DELETE", `/api/blocked-ranges/${id}`)).statusCode).toBe(404);
      }
      const a = (await A.req("GET", "/api/assignments")).json();
      expect(a.map((x: { title: string }) => x.title)).toEqual(["Book"]);
      expect((await A.req("GET", "/api/events")).json()[0].name).toBe("Co-op");
      expect((await A.req("GET", "/api/blocked-ranges")).json()[0].label).toBeNull();
    });

    it("B can't reference A's subject or child in any create or update → 400 invalid_reference", async () => {
      const [aS, aC] = [aRoster.subjectIds[0]!, aRoster.childIds[0]!];
      const [bS, bC] = [bRoster.subjectIds[0]!, bRoster.childIds[0]!];
      const cases: [string, string, unknown][] = [
        ["POST", "/api/assignments", assignmentBody(aS, [bC])],
        ["POST", "/api/assignments", assignmentBody(bS, [aC])],
        ["POST", "/api/assignments", assignmentBody(bS, [bC, aC])],
        ["POST", "/api/events", { name: "X", weekdays: [1], subjectRules: { [aS]: "skip" } }],
        ["POST", "/api/events", { name: "X", weekdays: [1], childIds: [aC] }],
        ["POST", "/api/blocked-ranges", { startDate: "2026-11-02", endDate: "2026-11-02", childIds: [aC] }],
      ];
      for (const [m, url, body] of cases) {
        const res = await B.req(m as "POST", url, body);
        expect(res.statusCode, `${m} ${url}`).toBe(400);
        expect(res.json().error).toBe("invalid_reference");
      }
      const bA = (await B.req("POST", "/api/assignments", assignmentBody(bS, [bC]))).json().id;
      const bE = (await B.req("POST", "/api/events", { name: "Y", weekdays: [1] })).json().id;
      const bR = (await B.req("POST", "/api/blocked-ranges", { startDate: "2026-11-02", endDate: "2026-11-02" })).json().id;
      for (const [url, body] of [
        [`/api/assignments/${bA}`, { subjectId: aS }], [`/api/assignments/${bA}`, { childIds: [aC] }],
        [`/api/events/${bE}`, { subjectRules: { [aS]: "lighter" } }], [`/api/events/${bE}`, { childIds: [aC] }],
        [`/api/blocked-ranges/${bR}`, { childIds: [aC] }],
      ] as const) {
        const res = await B.req("PATCH", url, body);
        expect(res.statusCode, url).toBe(400);
        expect(res.json().error).toBe("invalid_reference");
      }
    });

    it("family_id smuggled in a body is rejected everywhere (RF-09: strict bodies)", async () => {
      const res = await B.req("POST", "/api/assignments", { ...assignmentBody(bRoster.subjectIds[0]!, bRoster.childIds), family_id: A.familyId, familyId: A.familyId });
      expect(res.statusCode).toBe(400);
      expect((await B.req("PATCH", "/api/family", { name: "x", familyId: A.familyId })).statusCode).toBe(400);
    });

    it("PATCH /api/family only changes the session family", async () => {
      expect((await B.req("PATCH", "/api/family", { name: "Renamed B", schoolDays: [0] })).statusCode).toBe(200);
      expect((await A.req("GET", "/api/family")).json()).toMatchObject({ name: "Tester2 A", schoolDays: [1, 2, 3, 4, 5] });
    });

    it("an expired or revoked session gets 401 on every new route", async () => {
      await pool.query("UPDATE session SET expires_at = now() - interval '1 second' WHERE family_id = $1", [A.familyId]);
      const calls: [string, string, unknown?][] = [
        ["GET", "/api/family"], ["PATCH", "/api/family", { name: "x" }],
        ["GET", "/api/assignments"], ["POST", "/api/assignments", {}], ["PATCH", `/api/assignments/${aAssignment}`, { title: "x" }],
        ["GET", "/api/events"], ["POST", "/api/events", {}], ["PATCH", `/api/events/${aEvent}`, { name: "x" }],
        ["GET", "/api/blocked-ranges"], ["POST", "/api/blocked-ranges", {}], ["PATCH", `/api/blocked-ranges/${aBlocked}`, { label: "x" }],
        ["DELETE", `/api/blocked-ranges/${aBlocked}`],
      ];
      for (const [m, url, body] of calls) {
        expect((await A.req(m as "GET", url, body)).statusCode, `${m} ${url}`).toBe(401);
        expect((await inject(app, null)(m as "GET", url, body)).statusCode, `anon ${m} ${url}`).toBe(401);
      }
      await pool.query("UPDATE session SET expires_at = now() + interval '1 day' WHERE family_id = $1", [A.familyId]);
      expect((await A.req("GET", "/api/blocked-ranges")).json()).toHaveLength(1);
    });
  });

  describe("validation edge cases", () => {
    let F: Awaited<ReturnType<typeof newFam>>;
    let kids: string[] = [];
    let subj: string[] = [];
    beforeAll(async () => {
      F = await newFam("Tester2 V");
      ({ childIds: kids, subjectIds: subj } = await rosterFor(app, F.cookies, ["K1", "K2", "K3"], ["S1", "S2"]));
    });
    const post = (over: Record<string, unknown>) => F.req("POST", "/api/assignments", assignmentBody(subj[0]!, [kids[0]!], over));

    it("dates at the 2000/2100 limits and leap days", async () => {
      expect((await post({ startDate: "2000-01-01", endDate: "2000-02-29" })).statusCode).toBe(201);
      expect((await post({ startDate: "2098-01-01", endDate: "2100-12-31" })).statusCode).toBe(201);
      for (const [s, e] of [["1999-12-31", "2000-01-05"], ["2100-12-31", "2101-01-01"], ["2100-02-01", "2100-02-29"], ["2026-02-29", "2026-03-01"], ["2026-1-02", "2026-01-05"], ["2026-01-02T00:00", "2026-01-05"], [" 2026-01-02", "2026-01-05"], ["+02026-01-02", "2026-01-05"], ["2026-13-01", "2026-12-01"], ["2026-00-10", "2026-01-05"]]) {
        expect((await post({ startDate: s, endDate: e })).statusCode, `${s}..${e}`).toBe(400);
      }
      expect((await F.req("POST", "/api/events", { name: "Far", weekdays: [1], startDate: "2000-01-01", endDate: "2100-12-31" })).statusCode).toBe(201);
      expect((await F.req("POST", "/api/blocked-ranges", { startDate: "2100-12-31", endDate: "2100-12-31" })).statusCode).toBe(201);
      expect((await F.req("POST", "/api/blocked-ranges", { startDate: "2000-01-01", endDate: "2000-01-01" })).statusCode).toBe(201);
    });

    it("span limits are exact: assignment 1096 ok / 1097 no; blocked 366 ok / 367 no; one-day ranges ok", async () => {
      expect((await post({ startDate: "2026-01-01", endDate: "2028-12-31" })).statusCode).toBe(201); // 365+365+366 = 1096
      const r = await post({ startDate: "2026-01-01", endDate: "2029-01-01" });
      expect(r.statusCode).toBe(400);
      expect(r.json().error).toBe("invalid_range");
      expect((await post({ startDate: "2026-11-02", endDate: "2026-11-02" })).statusCode).toBe(201);
      expect((await F.req("POST", "/api/blocked-ranges", { startDate: "2028-01-01", endDate: "2028-12-31" })).statusCode).toBe(201); // leap year: 366
      expect((await F.req("POST", "/api/blocked-ranges", { startDate: "2027-01-01", endDate: "2028-01-01" })).statusCode).toBe(201); // 366
      expect((await F.req("POST", "/api/blocked-ranges", { startDate: "2027-01-01", endDate: "2028-01-02" })).statusCode).toBe(400);
    });

    it("end < start → 400 invalid_range on every create and on merged PATCHes", async () => {
      expect((await post({ startDate: "2026-11-10", endDate: "2026-11-09" })).json().error).toBe("invalid_range");
      expect((await F.req("POST", "/api/events", { name: "E", weekdays: [1], startDate: "2026-11-10", endDate: "2026-11-09" })).json().error).toBe("invalid_range");
      expect((await F.req("POST", "/api/blocked-ranges", { startDate: "2026-11-10", endDate: "2026-11-09" })).json().error).toBe("invalid_range");
      const a = (await post({})).json().id;
      expect((await F.req("PATCH", `/api/assignments/${a}`, { startDate: "2026-11-28" })).json().error).toBe("invalid_range");
      expect((await F.req("PATCH", `/api/assignments/${a}`, { startDate: "2026-12-01", endDate: "2026-11-30" })).json().error).toBe("invalid_range");
      // both ends moved together past the old end is fine
      expect((await F.req("PATCH", `/api/assignments/${a}`, { startDate: "2026-12-01", endDate: "2026-12-05" })).statusCode).toBe(200);
      // moving one end so the merged span exceeds the limit
      expect((await F.req("PATCH", `/api/assignments/${a}`, { endDate: "2030-01-01" })).json().error).toBe("invalid_range");
      const e = (await F.req("POST", "/api/events", { name: "E", weekdays: [1], startDate: "2026-11-01" })).json().id;
      expect((await F.req("PATCH", `/api/events/${e}`, { endDate: "2026-10-31" })).json().error).toBe("invalid_range");
      expect((await F.req("PATCH", `/api/events/${e}`, { startDate: null, endDate: "2026-10-31" })).statusCode).toBe(200);
      expect((await F.req("PATCH", `/api/events/${e}`, { startDate: "2026-11-01" })).json().error).toBe("invalid_range");
      const b = (await F.req("POST", "/api/blocked-ranges", { startDate: "2026-11-02", endDate: "2026-11-03" })).json().id;
      expect((await F.req("PATCH", `/api/blocked-ranges/${b}`, { endDate: "2026-11-01" })).json().error).toBe("invalid_range");
      expect((await F.req("PATCH", `/api/blocked-ranges/${b}`, { startDate: "2025-11-01" })).json().error).toBe("invalid_range"); // 368 days
    });

    it("shared assignments: ids deduped case-insensitively, max 20, every child planned", async () => {
      expect((await post({ childIds: [kids[0], kids[0]!.toUpperCase()] })).statusCode).toBe(400);
      expect((await post({ childIds: [] })).statusCode).toBe(400);
      expect((await post({ childIds: Array.from({ length: 21 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`) })).statusCode).toBe(400);
      const res = await post({ childIds: [kids[2], kids[0]!.toUpperCase(), kids[1]], title: "Shared" });
      expect(res.statusCode).toBe(201);
      // returned in roster order, lower-cased
      expect(res.json().childIds).toEqual(kids);
    });

    it("number edge cases: strings, booleans, exponent forms, -0 and limits", async () => {
      for (const over of [{ totalUnits: "40" }, { totalUnits: true }, { totalUnits: -0 }, { totalUnits: 1e-2 / 3 }, { weightPerUnit: 100.001 }, { weightPerUnit: "2.5" }, { minutesPerUnit: 5 }, { totalUnits: null }]) {
        expect((await post(over)).statusCode, JSON.stringify(over)).toBe(400);
      }
      const big = await post({ totalUnits: 100000, weightPerUnit: 100, startDate: "2026-11-02", endDate: "2026-11-02" });
      expect(big.statusCode).toBe(201);
      expect(big.json()).toMatchObject({ totalUnits: 100000, weightPerUnit: 100 });
      expect((await post({ totalUnits: 0.01, weightPerUnit: 0.01 })).statusCode).toBe(201);
      expect((await post({ totalUnits: 99999.99 })).json().totalUnits).toBe(99999.99);
      // raw JSON exponent overflow
      const raw = await app.inject({ method: "POST", url: "/api/assignments", cookies: F.cookies, headers: { "content-type": "application/json" },
        payload: JSON.stringify(assignmentBody(subj[0]!, [kids[0]!])).replace('"totalUnits":40', '"totalUnits":1e309') });
      expect(raw.statusCode).toBe(400);
      for (const cf of [0, 1, 0.125]) expect((await F.req("POST", "/api/events", { name: "C", weekdays: [2], capacityFraction: cf })).statusCode).toBe(201);
      for (const cf of [-0.001, 1.001, 0.1234, "0.5", null]) expect((await F.req("POST", "/api/events", { name: "C", weekdays: [2], capacityFraction: cf })).statusCode, String(cf)).toBe(400);
    });

    it("non-object bodies → 400, never 500", async () => {
      for (const url of ["/api/assignments", "/api/events", "/api/blocked-ranges"]) {
        for (const payload of ["[]", "null", "\"x\"", "42", "{\"a\":"]) {
          const res = await app.inject({ method: "POST", url, cookies: F.cookies, headers: { "content-type": "application/json" }, payload });
          expect(res.statusCode, `${url} ${payload}`).toBe(400);
        }
      }
      for (const payload of ["[]", "null"]) {
        const res = await app.inject({ method: "PATCH", url: "/api/family", cookies: F.cookies, headers: { "content-type": "application/json" }, payload });
        expect(res.statusCode).toBe(400);
      }
    });

    it("event subjectRules: archived subject rejected on write, kept on read, ignored by the plan", async () => {
      const [s1, s2] = subj as [string, string];
      const e = (await F.req("POST", "/api/events", { name: "Rules", weekdays: [4], subjectRules: { [s1]: "skip", [s2.toUpperCase()]: "lighter" } })).json();
      expect(e.subjectRules).toEqual({ [s1]: "skip", [s2]: "lighter" });
      // same id twice by case → 400
      expect((await F.req("POST", "/api/events", { name: "Dup", weekdays: [4], subjectRules: { [s1]: "skip", [s1.toUpperCase()]: "normal" } })).statusCode).toBe(400);
      // 101 rules → 400 before any lookup; prototype keys → 400
      const many = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, "skip"]));
      expect((await F.req("POST", "/api/events", { name: "Many", weekdays: [4], subjectRules: many })).statusCode).toBe(400);
      const proto = await app.inject({ method: "POST", url: "/api/events", cookies: F.cookies, headers: { "content-type": "application/json" },
        payload: `{"name":"P","weekdays":[4],"subjectRules":{"__proto__":"skip"}}` });
      expect(proto.statusCode).toBe(400);
      for (const sr of [[], "skip", null, { [s1]: "SKIP" }, { [s1]: null }]) {
        expect((await F.req("POST", "/api/events", { name: "Bad", weekdays: [4], subjectRules: sr })).statusCode, JSON.stringify(sr)).toBe(400);
      }

      // archive s2: the rule is still listed, name-only edits still work, re-sending it is refused
      expect((await F.req("PATCH", `/api/subjects/${s2}`, { archived: true })).statusCode).toBe(200);
      try {
        expect((await F.req("GET", "/api/events")).json().find((x: { id: string }) => x.id === e.id).subjectRules[s2]).toBe("lighter");
        expect((await F.req("PATCH", `/api/events/${e.id}`, { name: "Rules 2" })).statusCode).toBe(200);
        const resend = await F.req("PATCH", `/api/events/${e.id}`, { subjectRules: { [s1]: "skip", [s2]: "lighter" } });
        expect(resend.statusCode).toBe(400);
        expect(resend.json().error).toBe("invalid_reference");
        expect((await F.req("POST", "/api/events", { name: "New", weekdays: [4], subjectRules: { [s2]: "skip" } })).json().error).toBe("invalid_reference");
        expect((await F.req("POST", "/api/assignments", assignmentBody(s2, [kids[0]!]))).json().error).toBe("invalid_reference");
      } finally {
        await F.req("PATCH", `/api/subjects/${s2}`, { archived: false });
      }
    });

    it("unknown ids in a path → 404 for all PATCH/DELETE routes, malformed ids too", async () => {
      for (const id of [MISSING, "nope", "1", "%00", "00000000-0000-4000-8000-00000000000g"]) {
        expect((await F.req("PATCH", `/api/assignments/${id}`, { title: "x" })).statusCode).toBe(404);
        expect((await F.req("PATCH", `/api/events/${id}`, { name: "x" })).statusCode).toBe(404);
        expect((await F.req("PATCH", `/api/blocked-ranges/${id}`, { label: "x" })).statusCode).toBe(404);
        expect((await F.req("DELETE", `/api/blocked-ranges/${id}`)).statusCode).toBe(404);
      }
    });

    it("blocked-range labels: blank → null, null clears, 60 ok, 61 no, NUL no", async () => {
      const b = (await F.req("POST", "/api/blocked-ranges", { label: "   ", startDate: "2026-12-21", endDate: "2026-12-31", kind: "holiday" })).json();
      expect(b.label).toBeNull();
      expect((await F.req("PATCH", `/api/blocked-ranges/${b.id}`, { label: "x".repeat(60) })).json().label).toHaveLength(60);
      expect((await F.req("PATCH", `/api/blocked-ranges/${b.id}`, { label: null })).json().label).toBeNull();
      expect((await F.req("PATCH", `/api/blocked-ranges/${b.id}`, { label: "x".repeat(61) })).statusCode).toBe(400);
      expect((await F.req("PATCH", `/api/blocked-ranges/${b.id}`, { label: "a\u0000b" })).statusCode).toBe(400);
      expect((await F.req("PATCH", `/api/blocked-ranges/${b.id}`, { kind: "party" })).statusCode).toBe(400);
    });
  });

  describe("editing rows that still name an archived child (what the forms send)", () => {
    let F: Awaited<ReturnType<typeof newFam>>;
    let kids: string[] = [];
    let subj: string[] = [];
    beforeAll(async () => {
      F = await newFam("Tester2 Archived");
      ({ childIds: kids, subjectIds: subj } = await rosterFor(app, F.cookies, ["Old", "Stay", "New"], ["S"]));
    });

    // T2-1 (fixed). The forms keep an archived child ticked ("archived ones show only while selected") and send the whole set
    // when the selection changes. Adding a child while the archived one stays ticked must not be refused.
    it("assignment: adding a child while an archived one stays linked → 200", async () => {
      const a = (await F.req("POST", "/api/assignments", assignmentBody(subj[0]!, [kids[0]!, kids[1]!]))).json().id;
      await F.req("PATCH", `/api/children/${kids[0]}`, { archived: true });
      try {
        const res = await F.req("PATCH", `/api/assignments/${a}`, { childIds: [kids[0], kids[1], kids[2]] });
        expect(res.statusCode).toBe(200);
        expect(res.json().childIds).toEqual(kids);
        // a newly named archived child is still refused
        const b = (await F.req("POST", "/api/assignments", assignmentBody(subj[0]!, [kids[1]!]))).json().id;
        expect((await F.req("PATCH", `/api/assignments/${b}`, { childIds: [kids[0], kids[1]] })).json().error).toBe("invalid_reference");
      } finally {
        await F.req("PATCH", `/api/children/${kids[0]}`, { archived: false });
      }
    });

    it("event: adding a child while an archived one stays linked → 200", async () => {
      const e = (await F.req("POST", "/api/events", { name: "Ev", weekdays: [2], childIds: [kids[0], kids[1]] })).json().id;
      await F.req("PATCH", `/api/children/${kids[0]}`, { archived: true });
      try {
        const res = await F.req("PATCH", `/api/events/${e}`, { childIds: [kids[0], kids[1], kids[2]] });
        expect(res.statusCode).toBe(200);
        expect(res.json().childIds).toEqual(kids);
      } finally {
        await F.req("PATCH", `/api/children/${kids[0]}`, { archived: false });
      }
    });

    it("day off: adding a child while an archived one stays linked → 200", async () => {
      const b = (await F.req("POST", "/api/blocked-ranges", { startDate: "2026-11-02", endDate: "2026-11-03", childIds: [kids[0], kids[1]] })).json().id;
      await F.req("PATCH", `/api/children/${kids[0]}`, { archived: true });
      try {
        const res = await F.req("PATCH", `/api/blocked-ranges/${b}`, { childIds: [kids[0], kids[1], kids[2]] });
        expect(res.statusCode).toBe(200);
        expect(res.json().childIds).toEqual(kids);
      } finally {
        await F.req("PATCH", `/api/children/${kids[0]}`, { archived: false });
      }
    });

    it("assignment: re-sending its own (since archived) subject with another change → 200", async () => {
      const s2 = (await F.req("POST", "/api/subjects", { name: "Later archived" })).json().id;
      const a = (await F.req("POST", "/api/assignments", assignmentBody(s2, [kids[1]!]))).json().id;
      await F.req("PATCH", `/api/subjects/${s2}`, { archived: true });
      const res = await F.req("PATCH", `/api/assignments/${a}`, { subjectId: s2, title: "Renamed" });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("time zones", () => {
    let F: Awaited<ReturnType<typeof newFam>>;
    beforeAll(async () => { F = await newFam("Tester2 TZ"); });
    const setTz = (timeZone: unknown) => F.req("PATCH", "/api/family", { timeZone });

    // S2a-17 changed this from "stored as sent" to canonical storage (T2-2 fixed).
    it("aliases and links are accepted and stored canonically; /api/me agrees", async () => {
      const cases: [string, string][] = [["US/Central", "America/Chicago"], ["Asia/Kolkata", "Asia/Kolkata"], ["Asia/Calcutta", "Asia/Kolkata"], ["Europe/Kyiv", "Europe/Kyiv"],
        ["America/Argentina/Buenos_Aires", "America/Argentina/Buenos_Aires"], ["Etc/GMT-14", "Etc/GMT-14"], ["Etc/GMT+12", "Etc/GMT+12"], ["Etc/UTC", "UTC"], ["UTC", "UTC"], ["America/Port-au-Prince", "America/Port-au-Prince"]];
      for (const [tz, stored] of cases) {
        const res = await setTz(tz);
        expect(res.statusCode, tz).toBe(200);
        expect(res.json().timeZone, tz).toBe(stored);
        expect((await F.req("GET", "/api/me")).json().timeZone).toBe(stored);
      }
    });

    it("non-IANA spellings are rejected (incl. ICU-only abbreviations and offsets)", async () => {
      for (const tz of ["EST", "GMT", "CST6CDT", "Zulu", "+05:00", "UTC+5", "Etc/GMT+15", "Mars/Olympus_Mons", "", " America/Chicago", "America/Chicago\u0000", 5, null]) {
        expect((await setTz(tz)).statusCode, String(tz)).toBe(400);
      }
    });

    it("T2-2 fixed: ALL-CAPS and lower-case zones are stored in IANA casing", async () => {
      for (const tz of ["AMERICA/CHICAGO", "america/chicago"]) {
        const res = await setTz(tz);
        expect(res.statusCode).toBe(200);
        expect(res.json().timeZone).toBe("America/Chicago");
      }
    });

    /** asOf from /api/plan for F in `timeZone`, with the API clock pinned at `iso`. */
    const asOfAt = async (iso: string, timeZone: string) => {
      expect((await setTz(timeZone)).statusCode).toBe(200);
      const pinned = buildApp(testConfig(), { db: pool, now: () => new Date(iso) });
      try {
        const res = await pinned.inject({ method: "GET", url: "/api/plan?from=2026-11-01&to=2026-11-07", cookies: F.cookies });
        expect(res.statusCode).toBe(200);
        return res.json().asOf as string;
      } finally {
        await pinned.close();
      }
    };

    it("asOf follows the zone at the date line (fixed clock 2026-11-02T10:30Z)", async () => {
      expect(await asOfAt("2026-11-02T10:30:00Z", "Pacific/Kiritimati")).toBe("2026-11-03"); // UTC+14
      expect(await asOfAt("2026-11-02T10:30:00Z", "Pacific/Pago_Pago")).toBe("2026-11-01"); // UTC−11
      expect(await asOfAt("2026-11-02T10:30:00Z", "America/Chicago")).toBe("2026-11-02");
    });

    it("asOf turns over at local midnight in Chicago (CST, UTC−6)", async () => {
      expect(await asOfAt("2026-11-02T05:59:59Z", "America/Chicago")).toBe("2026-11-01");
      expect(await asOfAt("2026-11-02T06:00:00Z", "America/Chicago")).toBe("2026-11-02");
    });

    it("concurrent settings PATCHes never lose a column or 500", async () => {
      const res = await Promise.all([
        F.req("PATCH", "/api/family", { schoolDays: [1, 3, 5] }),
        F.req("PATCH", "/api/family", { timeZone: "Europe/London" }),
        F.req("PATCH", "/api/family", { weekStart: "sun" }),
        F.req("PATCH", "/api/family", { name: "Concurrent" }),
      ]);
      expect(res.map((r) => r.statusCode)).toEqual([200, 200, 200, 200]);
      expect((await F.req("GET", "/api/family")).json()).toEqual({ name: "Concurrent", weekStart: "sun", schoolDays: [1, 3, 5], timeZone: "Europe/London", weekStartLocked: false, zoomViews: { hidden: [], custom: [] } });
    });
  });

  describe("plan vs engine for tricky combinations", () => {
    const FROM = "2026-11-01";
    const TO = "2026-12-12";
    const AS_OF = "2026-11-02";
    const calendar: FamilyCalendar = { weekStart: "mon", schoolDays: [1, 2, 3, 4, 5] };
    let F: Awaited<ReturnType<typeof newFam>>;
    let kids: string[] = [];
    let subj: string[] = [];
    const assignments: Assignment[] = [];
    const events: RecurringEvent[] = [];
    const blocked: BlockedPeriod[] = [];

    const apiPlan = async (): Promise<ChildPlan[]> => {
      const res = await F.req("GET", `/api/plan?from=${FROM}&to=${TO}&asOf=${AS_OF}`);
      expect(res.statusCode).toBe(200);
      return (res.json() as PlanResponse).plans as ChildPlan[];
    };
    const predicted = (): ChildPlan[] =>
      JSON.parse(JSON.stringify(planAll(assignments, { calendar, events, blocked, asOf: AS_OF })
        .map((p) => ({ ...p, days: p.days.filter((d) => d.date >= FROM && d.date <= TO) }))));
    const byChild = (plans: ChildPlan[]) => [...plans].sort((a, b) => a.childId.localeCompare(b.childId) || a.assignmentId.localeCompare(b.assignmentId));

    const addAssignment = async (body: ReturnType<typeof assignmentBody>) => {
      const res = await F.req("POST", "/api/assignments", body);
      expect(res.statusCode).toBe(201);
      const j = res.json();
      assignments.push({ id: j.id, childIds: j.childIds, subjectId: j.subjectId, title: j.title, unitType: j.unitType, totalUnits: j.totalUnits,
        start: j.startDate, end: j.endDate, weightPerUnit: j.weightPerUnit });
    };
    const addEvent = async (body: { name: string; weekdays: number[]; startDate?: string | null; endDate?: string | null; capacityFraction?: number; defaultRule?: "skip" | "lighter" | "normal"; subjectRules?: Record<string, string>; childIds?: string[] }) => {
      const res = await F.req("POST", "/api/events", body);
      expect(res.statusCode).toBe(201);
      const j = res.json();
      events.push({ id: j.id, name: j.name, childIds: j.childIds, weekdays: j.weekdays, start: j.startDate, end: j.endDate,
        capacityFraction: j.capacityFraction, subjectRules: { ...j.subjectRules }, defaultRule: j.defaultRule });
      return j.id as string;
    };
    const addBlocked = async (body: { startDate: string; endDate: string; childIds?: string[] }) => {
      const res = await F.req("POST", "/api/blocked-ranges", body);
      expect(res.statusCode).toBe(201);
      const j = res.json();
      blocked.push({ id: j.id, start: j.startDate, end: j.endDate, childIds: j.childIds.length ? j.childIds : null, kind: j.kind });
    };

    beforeAll(async () => {
      F = await newFam("Tester2 Plan");
      ({ childIds: kids, subjectIds: subj } = await rosterFor(app, F.cookies, ["Ava", "Ben", "Cy"], ["Math", "Read", "Music"]));
      const [ava, ben, cy] = kids as [string, string, string];
      const [math, read, music] = subj as [string, string, string];
      // shared across all three, a two-child one, a tiny one, a minutes-unit one with no override, and one that starts mid-window
      await addAssignment(assignmentBody(math, [ava, ben, cy], { title: "Shared math", totalUnits: 90, weightPerUnit: 1.5, startDate: "2026-11-02", endDate: "2026-12-11" }));
      await addAssignment(assignmentBody(read, [ava, ben], { title: "Novel", unitType: "chapters", totalUnits: 17, weightPerUnit: null, startDate: "2026-11-04", endDate: "2026-11-25" }));
      await addAssignment(assignmentBody(music, [cy], { title: "Scales", unitType: "minutes", totalUnits: 333.33, weightPerUnit: null, startDate: "2026-11-01", endDate: "2026-12-12" }));
      await addAssignment(assignmentBody(read, [cy], { title: "One day", unitType: "lessons", totalUnits: 0.01, weightPerUnit: 0.01, startDate: "2026-11-11", endDate: "2026-11-11" }));
      await addAssignment(assignmentBody(math, [ben], { title: "Weekend only", totalUnits: 10, startDate: "2026-11-07", endDate: "2026-11-08" }));
      // overlapping events: whole-family lighter Wed + Ava-only lighter Wed (×0.25), skip for Music on Tue/Thu, a capacity-0 lighter day,
      // an open-ended-start event ending mid-window, one with a default 'skip' and a 'normal' override
      await addEvent({ name: "Co-op", weekdays: [3], capacityFraction: 0.5, defaultRule: "lighter" });
      await addEvent({ name: "Ava lessons", weekdays: [3, 5], capacityFraction: 0.5, defaultRule: "lighter", childIds: [ava] });
      await addEvent({ name: "Band", weekdays: [2, 4], subjectRules: { [music]: "skip" } });
      await addEvent({ name: "Zero", weekdays: [1], capacityFraction: 0, defaultRule: "normal", subjectRules: { [read]: "lighter" }, childIds: [ben] });
      await addEvent({ name: "Until mid", weekdays: [1, 2, 3, 4, 5], startDate: null, endDate: "2026-11-13", defaultRule: "skip", subjectRules: { [math]: "normal" }, childIds: [cy] });
      // overlapping days off: whole-family week, a Ben-only range overlapping it, a duplicate of the first, and one on a weekend
      await addBlocked({ startDate: "2026-11-23", endDate: "2026-11-27" });
      await addBlocked({ startDate: "2026-11-25", endDate: "2026-12-02", childIds: [ben] });
      await addBlocked({ startDate: "2026-11-23", endDate: "2026-11-27" });
      await addBlocked({ startDate: "2026-11-14", endDate: "2026-11-15", childIds: [cy, ava] });
    });

    it("every child's days and warnings match planAll exactly", async () => {
      const api = byChild(await apiPlan());
      const eng = byChild(predicted());
      expect(api.map((p) => p.childId)).toEqual(eng.map((p) => p.childId));
      expect(api).toEqual(eng);
      // sanity on the combos: overlapping days off zero out, and there is real work to compare
      for (const ben of api.filter((p) => p.childId === kids[1])) {
        for (const d of ["2026-11-24", "2026-11-30", "2026-12-02"]) expect(ben.days.find((x) => x.date === d)?.thickness ?? 0).toBe(0);
      }
      expect(api.flatMap((p) => p.days).some((d) => d.thickness > 0)).toBe(true);
    });

    it("still matches after archiving a subject named in rules, archiving a child named in events/days off, and deleting a duplicate day off", async () => {
      const [ava, , cy] = kids as [string, string, string];
      const [, read] = subj as [string, string, string];
      expect((await F.req("PATCH", `/api/subjects/${read}`, { archived: true })).statusCode).toBe(200);
      expect((await F.req("PATCH", `/api/children/${ava}`, { archived: true })).statusCode).toBe(200);
      expect((await F.req("DELETE", `/api/blocked-ranges/${blocked[2]!.id}`)).statusCode).toBe(204);
      try {
        // Mirror loadPlanInputs: archived children and subjects' assignments drop out; per-child rows lose the archived child,
        // and rows only for archived children vanish (never widen to the whole family).
        const keepAssignments = assignments.filter((a) => a.subjectId !== read)
          .map((a) => ({ ...a, childIds: a.childIds.filter((c) => c !== ava) })).filter((a) => a.childIds.length > 0);
        const keepEvents = events.filter((e) => !(e.childIds.length === 1 && e.childIds[0] === ava));
        const keepBlocked = blocked.filter((_, i) => i !== 2).map((b) => (b.childIds ? { ...b, childIds: b.childIds.filter((c) => c !== ava) } : b));
        const eng = byChild(JSON.parse(JSON.stringify(planAll(keepAssignments, { calendar, events: keepEvents, blocked: keepBlocked, asOf: AS_OF })
          .map((p) => ({ ...p, days: p.days.filter((d) => d.date >= FROM && d.date <= TO) })))));
        const api = byChild(await apiPlan());
        expect(api).toEqual(eng);
        expect(api.map((p) => p.childId)).not.toContain(ava);
        for (const p of api.filter((x) => x.childId === cy)) expect(p.days.find((d) => d.date === "2026-11-14")?.thickness ?? 0).toBe(0);
      } finally {
        await F.req("PATCH", `/api/subjects/${read}`, { archived: false });
        await F.req("PATCH", `/api/children/${ava}`, { archived: false });
      }
    });

    it("the largest accepted assignment plans to finite numbers", async () => {
      const G = await newFam("Tester2 Big");
      const r = await rosterFor(app, G.cookies, ["Max"], ["Max"]);
      expect((await G.req("POST", "/api/assignments", assignmentBody(r.subjectIds[0]!, r.childIds, { totalUnits: 100000, weightPerUnit: 100, startDate: "2026-11-02", endDate: "2026-11-02" }))).statusCode).toBe(201);
      expect((await G.req("POST", "/api/events", { name: "Tiny", weekdays: [1], capacityFraction: 0.001, defaultRule: "lighter" })).statusCode).toBe(201);
      const res = await G.req("GET", "/api/plan?from=2026-11-01&to=2026-11-07&asOf=2026-11-02");
      expect(res.statusCode).toBe(200);
      const days = (res.json() as PlanResponse).plans[0]!.days;
      for (const d of days) {
        expect(Number.isFinite(d.thickness)).toBe(true);
        expect(Number.isFinite(d.capacity)).toBe(true);
      }
    });
  });

  describe("concurrency", () => {
    let F: Awaited<ReturnType<typeof newFam>>;
    let kids: string[] = [];
    let subj: string[] = [];
    beforeAll(async () => {
      F = await newFam("Tester2 Race");
      ({ childIds: kids, subjectIds: subj } = await rosterFor(app, F.cookies, ["R1", "R2", "R3", "R4"], ["RS1", "RS2", "RS3"]));
    });

    it("10 concurrent childIds replacements on one assignment: all 200, final set is exactly one of them", async () => {
      const a = (await F.req("POST", "/api/assignments", assignmentBody(subj[0]!, [kids[0]!]))).json().id;
      const sets = Array.from({ length: 10 }, (_, i) => kids.filter((_, j) => ((i + 1) >> j) & 1));
      const res = await Promise.all(sets.map((childIds) => F.req("PATCH", `/api/assignments/${a}`, { childIds })));
      expect(res.map((r) => r.statusCode)).toEqual(Array(10).fill(200));
      const final = (await F.req("GET", "/api/assignments")).json().find((x: { id: string }) => x.id === a).childIds;
      expect(sets.map((s) => JSON.stringify(s))).toContain(JSON.stringify(final));
      const { rows } = await pool.query("SELECT count(*)::int AS n FROM assignment_child WHERE assignment_id = $1", [a]);
      expect(rows[0].n).toBe(final.length);
    });

    it("10 concurrent rule/child replacements on one event: no 500, rules never merged", async () => {
      const e = (await F.req("POST", "/api/events", { name: "Race", weekdays: [1] })).json().id;
      const bodies = Array.from({ length: 10 }, (_, i) => ({ subjectRules: { [subj[i % 3]!]: (["skip", "lighter", "normal"] as const)[i % 3] }, childIds: [kids[i % 4]] }));
      const res = await Promise.all(bodies.map((b) => F.req("PATCH", `/api/events/${e}`, b)));
      expect(res.map((r) => r.statusCode)).toEqual(Array(10).fill(200));
      const final = (await F.req("GET", "/api/events")).json().find((x: { id: string }) => x.id === e);
      expect(Object.keys(final.subjectRules)).toHaveLength(1);
      expect(final.childIds).toHaveLength(1);
    });

    it("concurrent DELETEs of one day off: exactly one 204, the rest 404", async () => {
      const b = (await F.req("POST", "/api/blocked-ranges", { startDate: "2026-11-02", endDate: "2026-11-02", childIds: [kids[0]] })).json().id;
      const res = await Promise.all(Array.from({ length: 8 }, () => F.req("DELETE", `/api/blocked-ranges/${b}`)));
      expect(res.filter((r) => r.statusCode === 204)).toHaveLength(1);
      expect(res.filter((r) => r.statusCode === 404)).toHaveLength(7);
    });

    it("PATCH racing a DELETE of the same day off: 200 or 404, never 500", async () => {
      for (let i = 0; i < 5; i++) {
        const b = (await F.req("POST", "/api/blocked-ranges", { startDate: "2026-11-02", endDate: "2026-11-02", childIds: [kids[0]] })).json().id;
        const [p, d] = await Promise.all([F.req("PATCH", `/api/blocked-ranges/${b}`, { childIds: [kids[1]], label: "x" }), F.req("DELETE", `/api/blocked-ranges/${b}`)]);
        expect([200, 404]).toContain(p.statusCode);
        expect(d.statusCode).toBe(204);
      }
      const { rows } = await pool.query("SELECT count(*)::int AS n FROM blocked_range_child bc LEFT JOIN blocked_range b ON b.id = bc.blocked_range_id WHERE b.id IS NULL");
      expect(rows[0].n).toBe(0);
    });

    it("20 concurrent creates across the three tables all succeed", async () => {
      const res = await Promise.all(Array.from({ length: 20 }, (_, i) =>
        i % 3 === 0 ? F.req("POST", "/api/assignments", assignmentBody(subj[0]!, kids.slice(0, 1 + (i % 4))))
          : i % 3 === 1 ? F.req("POST", "/api/events", { name: `E${i}`, weekdays: [i % 7], childIds: kids.slice(0, i % 4) })
            : F.req("POST", "/api/blocked-ranges", { startDate: "2026-11-02", endDate: "2026-11-03", childIds: kids.slice(i % 4) })));
      expect(res.map((r) => r.statusCode)).toEqual(Array(20).fill(201));
    });

    it("archiving a child while it's being linked never 500s", async () => {
      const a = (await F.req("POST", "/api/assignments", assignmentBody(subj[0]!, [kids[0]!]))).json().id;
      const [link, arch] = await Promise.all([
        F.req("PATCH", `/api/assignments/${a}`, { childIds: [kids[0], kids[3]] }),
        F.req("PATCH", `/api/children/${kids[3]}`, { archived: true }),
      ]);
      expect([200, 400]).toContain(link.statusCode);
      expect(arch.statusCode).toBe(200);
      await F.req("PATCH", `/api/children/${kids[3]}`, { archived: false });
    });
  });
});
