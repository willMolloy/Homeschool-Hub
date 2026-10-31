/** S4-04: assignments accept and return `weekdays: number[] | null` (single, bulk and patch); S4-01b: a change records history on started assignments. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("assignment weekdays (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  // Wednesday 2026-10-28: the current week (Monday start) begins 2026-10-26.
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2026-10-28T15:00:00Z") }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let kids: string[] = [];
  let subjects: string[] = [];
  let req: ReturnType<typeof inject>;
  beforeAll(async () => {
    a = await signedInFamily(pool, "Weekdays asg A");
    b = await signedInFamily(pool, "Weekdays asg B");
    req = inject(app, a.cookies);
    const r = await rosterFor(app, a.cookies, ["Frank"], ["Math", "Latin"]);
    kids = r.childIds;
    subjects = r.subjectIds;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  const valid = (over: object = {}) => ({
    subjectId: subjects[0], title: "Saxon", unitType: "lessons", totalUnits: 20, startDate: "2026-11-02", endDate: "2026-11-27", childIds: [kids[0]], ...over,
  });
  const history = async (id: string) =>
    (await pool.query("SELECT weekdays_from::text AS f, previous_weekdays AS p FROM assignment WHERE id = $1", [id])).rows[0] as { f: string | null; p: number[] | null };
  const none = { f: null, p: null };

  it("create with Fridays only round-trips (sorted); without or null follows the subject", async () => {
    const res = await req("POST", "/api/assignments", valid({ weekdays: [5] }));
    expect(res.statusCode, res.body).toBe(201);
    expect(res.json().weekdays).toEqual([5]);
    expect((await req("POST", "/api/assignments", valid({ weekdays: [4, 2] }))).json().weekdays).toEqual([2, 4]);
    expect((await req("POST", "/api/assignments", valid())).json().weekdays).toBeNull();
    expect((await req("POST", "/api/assignments", valid({ weekdays: null }))).json().weekdays).toBeNull();
    const list = (await req("GET", "/api/assignments")).json();
    expect(list.find((x: { id: string }) => x.id === res.json().id).weekdays).toEqual([5]);
  });

  it("bulk: one item with days, one null", async () => {
    const res = await req("POST", "/api/assignments/bulk", { assignments: [valid({ title: "One", weekdays: [5] }), valid({ title: "Two", weekdays: null })] });
    expect(res.statusCode, res.body).toBe(201);
    expect(res.json().map((x: { weekdays: number[] | null }) => x.weekdays)).toEqual([[5], null]);
  });

  it.each([
    ["7", [7]],
    ["-1", [-1]],
    ["a duplicate", [3, 3]],
    ["an empty array", []],
    ["a fraction", [2.5]],
    ["a string", ["fri"]],
  ])("rejects %s with 400 on create, PATCH and in a bulk item (naming it)", async (_label, weekdays) => {
    expect((await req("POST", "/api/assignments", valid({ weekdays }))).statusCode).toBe(400);
    const id = (await req("POST", "/api/assignments", valid({ title: `Bad ${_label}` }))).json().id;
    expect((await req("PATCH", `/api/assignments/${id}`, { weekdays })).statusCode).toBe(400);
    const bulk = await req("POST", "/api/assignments/bulk", { assignments: [valid(), valid({ weekdays })] });
    expect(bulk.statusCode).toBe(400);
    expect(bulk.json().message).toMatch(/^Assignment 2: /);
    expect((await req("GET", `/api/assignments`)).json().filter((x: { title: string; weekdays: number[] | null }) => x.title === "Saxon" && x.weekdays === null).length).toBeGreaterThan(0);
  });

  it("PATCH sets, leaves when omitted, and clears with null", async () => {
    const id = (await req("POST", "/api/assignments", valid({ title: "Patch me" }))).json().id;
    expect((await req("PATCH", `/api/assignments/${id}`, { weekdays: [1, 3] })).json().weekdays).toEqual([1, 3]);
    expect((await req("PATCH", `/api/assignments/${id}`, { title: "Patched" })).json().weekdays).toEqual([1, 3]);
    expect((await req("PATCH", `/api/assignments/${id}`, { weekdays: null })).json().weekdays).toBeNull();
    expect((await req("PATCH", `/api/assignments/${id}`, { weekdays: [2] })).statusCode).toBe(200);
  });

  it("an unknown field is still rejected", async () => {
    expect((await req("POST", "/api/assignments", valid({ weekday: [1] }))).statusCode).toBe(400);
  });

  describe("history on started assignments (S4-01b)", () => {
    it("a started assignment records this week's start and the days before; an unstarted one doesn't", async () => {
      const started = (await req("POST", "/api/assignments", valid({ title: "Started", startDate: "2026-10-05", endDate: "2026-12-18" }))).json().id;
      const thisWeek = (await req("POST", "/api/assignments", valid({ title: "This week", startDate: "2026-10-26", endDate: "2026-12-18" }))).json().id;
      const later = (await req("POST", "/api/assignments", valid({ title: "Later", startDate: "2026-11-09", endDate: "2026-12-18" }))).json().id;
      expect(await history(started)).toEqual(none);
      for (const id of [started, thisWeek, later]) expect((await req("PATCH", `/api/assignments/${id}`, { weekdays: [5] })).statusCode).toBe(200);
      expect(await history(started)).toEqual({ f: "2026-10-26", p: null });
      expect(await history(thisWeek)).toEqual(none);
      expect(await history(later)).toEqual(none);
      // S4b-02: a second change in the same week keeps the days before the first ([5] is not "before").
      await req("PATCH", `/api/assignments/${started}`, { weekdays: [1, 2] });
      expect(await history(started)).toEqual({ f: "2026-10-26", p: null });
      // The same days again, or a patch without them, leaves the record alone.
      await req("PATCH", `/api/assignments/${started}`, { weekdays: [2, 1] });
      await req("PATCH", `/api/assignments/${started}`, { title: "Started again" });
      expect(await history(started)).toEqual({ f: "2026-10-26", p: null });
    });

    it("S4b-02: a second change in a week keeps the original days; going back clears; a later week starts over", async () => {
      const mk = async (title: string, weekdays: number[] | null) =>
        (await req("POST", "/api/assignments", valid({ title, startDate: "2026-10-05", endDate: "2026-12-18", weekdays }))).json().id as string;
      // Mon-Fri -> Fri -> Tue/Thu keeps Mon-Fri.
      const a1 = await mk("Twice", [1, 2, 3, 4, 5]);
      await req("PATCH", `/api/assignments/${a1}`, { weekdays: [5] });
      await req("PATCH", `/api/assignments/${a1}`, { weekdays: [2, 4] });
      expect(await history(a1)).toEqual({ f: "2026-10-26", p: [1, 2, 3, 4, 5] });
      // ... and back to Mon-Fri clears the history.
      await req("PATCH", `/api/assignments/${a1}`, { weekdays: [5, 4, 3, 2, 1] });
      expect(await history(a1)).toEqual(none);
      // Following the subject (null = every school day) is the same: null -> Fri -> null clears.
      const a2 = await mk("Undo", null);
      await req("PATCH", `/api/assignments/${a2}`, { weekdays: [5] });
      expect(await history(a2)).toEqual({ f: "2026-10-26", p: null });
      await req("PATCH", `/api/assignments/${a2}`, { weekdays: null });
      expect(await history(a2)).toEqual(none);
      // A record from an earlier week is replaced as before: the days before are the days now.
      const a3 = await mk("Later week", [1, 3]);
      await pool.query("UPDATE assignment SET weekdays_from = '2026-10-19', previous_weekdays = '{5}' WHERE id = $1", [a3]);
      await req("PATCH", `/api/assignments/${a3}`, { weekdays: [2] });
      expect(await history(a3)).toEqual({ f: "2026-10-26", p: [1, 3] });
    });

    it("S4b-02: a subject default change after an assignment change in the same week keeps the original days", async () => {
      const subject = (await req("POST", "/api/subjects", { name: "Twice subject" })).json().id as string;
      const id = (await req("POST", "/api/assignments", valid({ title: "Follows", subjectId: subject, startDate: "2026-10-05", endDate: "2026-12-18" }))).json().id as string;
      await req("PATCH", `/api/subjects/${subject}`, { defaultWeekdays: [5] });
      await req("PATCH", `/api/subjects/${subject}`, { defaultWeekdays: [2, 4] });
      expect(await history(id)).toEqual({ f: "2026-10-26", p: null });
      await req("PATCH", `/api/subjects/${subject}`, { defaultWeekdays: null });
      expect(await history(id)).toEqual(none);
    });

    it("clearing the days goes back to the subject's default, recorded as the days before", async () => {
      await req("PATCH", `/api/subjects/${subjects[1]}`, { defaultWeekdays: [2, 4] });
      const id = (await req("POST", "/api/assignments", valid({ title: "Latin", subjectId: subjects[1], startDate: "2026-10-05", endDate: "2026-12-18", weekdays: [5] }))).json().id;
      expect((await req("PATCH", `/api/assignments/${id}`, { weekdays: null })).statusCode).toBe(200);
      expect(await history(id)).toEqual({ f: "2026-10-26", p: [5] });
      // Setting the subject's own days to the same list the default gives is no change.
      await pool.query("UPDATE assignment SET weekdays_from = NULL, previous_weekdays = NULL WHERE id = $1", [id]);
      await req("PATCH", `/api/assignments/${id}`, { weekdays: [4, 2] });
      expect(await history(id)).toEqual(none);
    });

    it("moving an uncustomised assignment to a subject with another default records it", async () => {
      await req("PATCH", `/api/subjects/${subjects[1]}`, { defaultWeekdays: [3] });
      const id = (await req("POST", "/api/assignments", valid({ title: "Mover", startDate: "2026-10-05", endDate: "2026-12-18" }))).json().id;
      expect((await req("PATCH", `/api/assignments/${id}`, { subjectId: subjects[1] })).statusCode).toBe(200);
      expect(await history(id)).toEqual({ f: "2026-10-26", p: null });
    });
  });

  it("another family's assignment is not found", async () => {
    const id = (await req("POST", "/api/assignments", valid({ title: "Mine" }))).json().id;
    expect((await inject(app, b.cookies)("PATCH", `/api/assignments/${id}`, { weekdays: [1] })).statusCode).toBe(404);
  });
});
