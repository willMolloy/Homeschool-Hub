/** S4-03: subjects accept and return `defaultWeekdays: number[] | null`; S4-01b: a change records history on started assignments that follow it. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("subject default weekdays (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  // Wednesday 2026-10-28: the current week (Monday start) begins 2026-10-26.
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2026-10-28T15:00:00Z") }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  beforeAll(async () => {
    a = await signedInFamily(pool, "Weekdays A");
    b = await signedInFamily(pool, "Weekdays B");
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  const post = (payload: unknown, cookies = a.cookies) => app.inject({ method: "POST", url: "/api/subjects", payload: payload as object, cookies });
  const patch = (id: string, payload: unknown, cookies = a.cookies) =>
    app.inject({ method: "PATCH", url: `/api/subjects/${id}`, payload: payload as object, cookies });
  const get = async (id: string, cookies = a.cookies) =>
    (await app.inject({ method: "GET", url: "/api/subjects", cookies })).json().find((s: { id: string }) => s.id === id);

  it("create with days (stored sorted), without, or with null", async () => {
    const res = await post({ name: "Piano", defaultWeekdays: [4, 2] });
    expect(res.statusCode, res.body).toBe(201);
    expect(res.json().defaultWeekdays).toEqual([2, 4]);
    expect((await get(res.json().id)).defaultWeekdays).toEqual([2, 4]);
    expect((await post({ name: "Plain" })).json().defaultWeekdays).toBeNull();
    expect((await post({ name: "Null", defaultWeekdays: null })).json().defaultWeekdays).toBeNull();
    expect((await post({ name: "Weekend", defaultWeekdays: [0, 6] })).json().defaultWeekdays).toEqual([0, 6]);
  });

  it("PATCH sets, leaves when omitted, and clears with null; it alone counts as a field", async () => {
    const id = (await post({ name: "Art" })).json().id;
    const set = await patch(id, { defaultWeekdays: [5] });
    expect(set.statusCode, set.body).toBe(200);
    expect(set.json().defaultWeekdays).toEqual([5]);
    expect((await patch(id, { name: "Art class" })).json().defaultWeekdays).toEqual([5]);
    expect((await get(id)).defaultWeekdays).toEqual([5]);
    const cleared = await patch(id, { defaultWeekdays: null });
    expect(cleared.statusCode).toBe(200);
    expect(cleared.json().defaultWeekdays).toBeNull();
    expect((await get(id)).defaultWeekdays).toBeNull();
  });

  it.each([
    ["7", [1, 7]],
    ["-1", [-1]],
    ["a duplicate", [2, 2]],
    ["an empty array", []],
    ["a fraction", [1.5]],
    ["a string", ["mon"]],
    ["not a list", 5],
    ["eight days", [0, 1, 2, 3, 4, 5, 6, 0]],
  ])("rejects %s with 400 on create and PATCH", async (_label, defaultWeekdays) => {
    const bad = await post({ name: "Bad", defaultWeekdays });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error).toBeDefined();
    const id = (await post({ name: `Bad ${_label}` })).json().id;
    const badPatch = await patch(id, { defaultWeekdays });
    expect(badPatch.statusCode).toBe(400);
    expect((await get(id)).defaultWeekdays).toBeNull();
  });

  it("the messages say what is wrong, and unknown fields are still rejected", async () => {
    expect((await post({ name: "M1", defaultWeekdays: [8] })).json().message).toMatch(/Sunday/);
    expect((await post({ name: "M2", defaultWeekdays: [] })).json().message).toMatch(/at least one day/i);
    expect((await post({ name: "M3", defaultWeekdays: [1, 1] })).json().message).toMatch(/repeat/i);
    expect((await post({ name: "M4", weekdays: [1] })).statusCode).toBe(400);
    const id = (await post({ name: "M5" })).json().id;
    expect((await patch(id, { default_weekdays: [1] })).statusCode).toBe(400);
  });

  it("another family cannot change it", async () => {
    const id = (await post({ name: "Mine", defaultWeekdays: [1] })).json().id;
    expect((await patch(id, { defaultWeekdays: [2] }, b.cookies)).statusCode).toBe(404);
    expect((await get(id)).defaultWeekdays).toEqual([1]);
  });

  describe("history on started assignments (S4-01b)", () => {
    const history = async (id: string) =>
      (await pool.query("SELECT weekdays_from::text AS f, previous_weekdays AS p FROM assignment WHERE id = $1", [id])).rows[0] as { f: string | null; p: number[] | null };

    it("records the current week's start and the old default only on started, uncustomised assignments", async () => {
      const { childIds } = await rosterFor(app, a.cookies, ["Hist kid"], []);
      const subject = (await post({ name: "History", defaultWeekdays: [1, 3] })).json().id;
      const other = (await post({ name: "Other subject" })).json().id;
      const mk = async (title: string, subjectId: string, startDate: string, weekdays: number[] | null = null) => {
        const { rows } = await pool.query<{ id: string }>(
          `INSERT INTO assignment (family_id, subject_id, title, unit_type, total_units, start_date, end_date, weekdays)
           VALUES ($1, $2, $3, 'pages', 100, $4, '2026-12-18', $5) RETURNING id`, [a.familyId, subjectId, title, startDate, weekdays]);
        await pool.query("INSERT INTO assignment_child (assignment_id, child_id, family_id) VALUES ($1, $2, $3)", [rows[0]!.id, childIds[0], a.familyId]);
        return rows[0]!.id;
      };
      const started = await mk("started", subject, "2026-10-05");
      const startedLastWeek = await mk("last week", subject, "2026-10-25");
      const startsThisWeek = await mk("this week", subject, "2026-10-26");
      const future = await mk("future", subject, "2026-11-02");
      const customised = await mk("customised", subject, "2026-10-05", [5]);
      const elsewhere = await mk("other subject", other, "2026-10-05");

      expect((await patch(subject, { defaultWeekdays: [5] })).statusCode).toBe(200);
      expect(await history(started)).toEqual({ f: "2026-10-26", p: [1, 3] });
      expect(await history(startedLastWeek)).toEqual({ f: "2026-10-26", p: [1, 3] });
      for (const id of [startsThisWeek, future, customised, elsewhere]) expect(await history(id)).toEqual({ f: null, p: null });

      // S4b-02: a second change in the same week keeps the days before the first ([1, 3]).
      expect((await patch(subject, { defaultWeekdays: null })).statusCode).toBe(200);
      expect(await history(started)).toEqual({ f: "2026-10-26", p: [1, 3] });
      // Same value again (any order), or a patch without the field, changes nothing.
      await pool.query("UPDATE assignment SET previous_weekdays = '{2}' WHERE id = $1", [started]);
      expect((await patch(subject, { defaultWeekdays: null })).statusCode).toBe(200);
      expect((await patch(subject, { name: "History 2" })).statusCode).toBe(200);
      expect(await history(started)).toEqual({ f: "2026-10-26", p: [2] });
    });

    it("S4b-02: a second change in a week keeps the original days; going back clears; a later week starts over", async () => {
      const { childIds } = await rosterFor(app, a.cookies, ["Hist kid 3"], []);
      const subject = (await post({ name: "History 4", defaultWeekdays: [1, 2, 3, 4, 5] })).json().id;
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO assignment (family_id, subject_id, title, unit_type, total_units, start_date, end_date)
         VALUES ($1, $2, 'y', 'pages', 10, '2026-10-05', '2026-12-18') RETURNING id`, [a.familyId, subject]);
      await pool.query("INSERT INTO assignment_child (assignment_id, child_id, family_id) VALUES ($1, $2, $3)", [rows[0]!.id, childIds[0], a.familyId]);
      const id = rows[0]!.id;
      await patch(subject, { defaultWeekdays: [5] });
      await patch(subject, { defaultWeekdays: [4, 2] });
      expect(await history(id)).toEqual({ f: "2026-10-26", p: [1, 2, 3, 4, 5] });
      await patch(subject, { defaultWeekdays: [5, 4, 3, 2, 1] });
      expect(await history(id)).toEqual({ f: null, p: null });
      await pool.query("UPDATE assignment SET weekdays_from = '2026-10-19', previous_weekdays = '{5}' WHERE id = $1", [id]);
      await patch(subject, { defaultWeekdays: [2] });
      expect(await history(id)).toEqual({ f: "2026-10-26", p: [1, 2, 3, 4, 5] });
    });

    it("a first default on a subject records previous = null (every school day)", async () => {
      const { childIds } = await rosterFor(app, a.cookies, ["Hist kid 2"], []);
      const subject = (await post({ name: "History 3" })).json().id;
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO assignment (family_id, subject_id, title, unit_type, total_units, start_date, end_date)
         VALUES ($1, $2, 'x', 'pages', 10, '2026-10-05', '2026-12-18') RETURNING id`, [a.familyId, subject]);
      await pool.query("INSERT INTO assignment_child (assignment_id, child_id, family_id) VALUES ($1, $2, $3)", [rows[0]!.id, childIds[0], a.familyId]);
      expect((await patch(subject, { defaultWeekdays: [2, 4] })).statusCode).toBe(200);
      expect(await history(rows[0]!.id)).toEqual({ f: "2026-10-26", p: null });
    });
  });
});
