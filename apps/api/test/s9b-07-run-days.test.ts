/** S9b-07: a run of days counts exactly the days the parent ticked; the form pre-ticks the family's school days less days off. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("S9b-07 ticked days for a run (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2026-11-04T15:00:00Z") }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let frank = "";
  let margaret = "";

  beforeAll(async () => {
    a = await signedInFamily(pool, "Run days");
    req = inject(app, a.cookies);
    [frank, margaret] = (await rosterFor(app, a.cookies, ["Frank", "Margaret"], [])).childIds as [string, string];
  });
  beforeEach(async () => {
    await pool.query("DELETE FROM record_entry WHERE family_id = $1", [a.familyId]);
    await pool.query("DELETE FROM undo_entry WHERE family_id = $1", [a.familyId]);
    await pool.query("DELETE FROM blocked_range WHERE family_id = $1", [a.familyId]);
    await req("PATCH", "/api/family", { schoolDays: [1, 2, 3, 4, 5] });
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [a.familyId]);
    await pool.end();
  });

  const MON_SUN = { startDate: "2026-11-02", endDate: "2026-11-08" };
  const MON_SAT = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"];
  const log = async (body: Record<string, unknown>) => req("POST", "/api/log-entries", { childIds: [frank], ...MON_SUN, ...body });

  it("a Mon–Fri family logs Mon–Sun with Saturday ticked and gets 6 school days, stored as those dates", async () => {
    const res = await log({ days: [...MON_SAT].reverse() });
    expect(res.statusCode, res.body).toBe(201);
    expect(res.json()[0]).toMatchObject({ schoolDays: 6, coveredDays: MON_SAT, days: MON_SAT });
    expect((await pool.query("SELECT days::text[] AS days, school_days FROM record_entry WHERE family_id = $1", [a.familyId])).rows).toEqual([{ days: MON_SAT, school_days: 6 }]);
    // without ticked days a run still counts the school calendar (S9b-01), as entries saved before S9b-07 do
    const plain = (await log({})).json()[0];
    expect(plain).toMatchObject({ schoolDays: 5, days: null });
  });

  it("the run's days for the form: a Tue–Sat family's run pre-selects Tue–Sat", async () => {
    await req("PATCH", "/api/family", { schoolDays: [2, 3, 4, 5, 6] });
    const res = await req("GET", `/api/log-entries/run-days?from=2026-11-02&to=2026-11-08&childIds=${frank}`);
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toEqual({ weekdays: [2, 3, 4, 5, 6], schoolDays: ["2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"], daysOff: [] });
  });

  it("days off: left out of the pre-selection, for the children picked (off for all = a day off)", async () => {
    await req("POST", "/api/blocked-ranges", { startDate: "2026-11-04", endDate: "2026-11-04", kind: "holiday" });
    await req("POST", "/api/blocked-ranges", { startDate: "2026-11-05", endDate: "2026-11-05", kind: "sick", childIds: [frank] });
    const days = async (kids: string[]) => (await req("GET", `/api/log-entries/run-days?from=2026-11-02&to=2026-11-06${kids.length ? `&childIds=${kids.join(",")}` : ""}`)).json();
    expect(await days([frank])).toEqual({ weekdays: [1, 2, 3, 4, 5], schoolDays: ["2026-11-02", "2026-11-03", "2026-11-06"], daysOff: ["2026-11-04", "2026-11-05"] });
    expect(await days([frank, margaret])).toEqual({ weekdays: [1, 2, 3, 4, 5], schoolDays: ["2026-11-02", "2026-11-03", "2026-11-05", "2026-11-06"], daysOff: ["2026-11-04"] });
    expect(await days([])).toMatchObject({ daysOff: ["2026-11-04"] });
  });

  it("ticked days count as ticked: a ticked day off counts, and a day off added later does not change them", async () => {
    await req("POST", "/api/blocked-ranges", { startDate: "2026-11-03", endDate: "2026-11-03", kind: "holiday" });
    const e = (await log({ days: ["2026-11-02", "2026-11-03"] })).json()[0];
    expect(e.schoolDays).toBe(2);
    await req("POST", "/api/blocked-ranges", { startDate: "2026-11-02", endDate: "2026-11-02", kind: "holiday" });
    expect((await (await req("GET", "/api/log-entries")).json())[0]).toMatchObject({ schoolDays: 2, coveredDays: ["2026-11-02", "2026-11-03"] });
  });

  it("Records totals follow the ticked days, inside a range too", async () => {
    await log({ days: MON_SAT });
    const totals = async (q: string) => (await req("GET", `/api/records/totals?childId=${frank}${q}`)).json();
    expect((await totals("")).schoolDays).toBe(6);
    expect((await totals("&from=2026-11-06&to=2026-11-08")).schoolDays).toBe(2);
  });

  it("checks the days: only for a run, inside its dates, at least one with the switch on; repeats are dropped", async () => {
    const one = await req("POST", "/api/log-entries", { childIds: [frank], startDate: "2026-11-02", days: ["2026-11-02"] });
    expect(one.statusCode).toBe(400);
    expect(one.json().error).toBe("invalid_days");
    const outside = await log({ days: ["2026-11-09"] });
    expect([outside.statusCode, outside.json().error]).toEqual([400, "invalid_days"]);
    const none = await log({ days: [] });
    expect([none.statusCode, none.json().message]).toEqual([400, "Tick at least one day, or turn off \"Count as a school day\"."]);
    expect((await log({ days: [], countsSchoolDay: false, totalMinutes: 30 })).json()[0]).toMatchObject({ schoolDays: 0, days: [] });
    expect((await log({ days: ["2026-11-03", "2026-11-02", "2026-11-03"] })).json()[0]).toMatchObject({ schoolDays: 2, days: ["2026-11-02", "2026-11-03"] });
    expect((await log({ days: ["2026-11-31"] })).statusCode).toBe(400);
  });

  it("an edit can change the days (undoable); new dates without days go back to the school calendar", async () => {
    const e = (await log({ days: MON_SAT })).json()[0];
    const changed = await req("PATCH", `/api/log-entries/${e.id}`, { days: ["2026-11-07", "2026-11-08"] });
    expect(changed.statusCode, changed.body).toBe(200);
    expect(changed.json()).toMatchObject({ schoolDays: 2, days: ["2026-11-07", "2026-11-08"] });
    expect((await req("POST", "/api/undo")).statusCode).toBe(200);
    expect((await (await req("GET", "/api/log-entries")).json())[0]).toMatchObject({ schoolDays: 6, days: MON_SAT });
    const kept = (await req("PATCH", `/api/log-entries/${e.id}`, { totalMinutes: 60 })).json();
    expect(kept).toMatchObject({ days: MON_SAT, schoolDays: 6 });
    const moved = (await req("PATCH", `/api/log-entries/${e.id}`, { startDate: "2026-11-09", endDate: "2026-11-13" })).json();
    expect(moved).toMatchObject({ days: null, schoolDays: 5 });
    const single = (await req("PATCH", `/api/log-entries/${e.id}`, { endDate: "2026-11-09", days: null })).json();
    expect(single).toMatchObject({ startDate: "2026-11-09", endDate: "2026-11-09", days: null, schoolDays: 1 });
  });

  it("an undo step saved before S9b-07 (no days) still puts an entry back", async () => {
    const e = (await log({})).json()[0];
    await req("DELETE", `/api/log-entries/${e.id}`);
    const { rows } = await pool.query<{ inverse: { steps: Array<{ set: Record<string, unknown> }> } }>("SELECT inverse FROM undo_entry WHERE family_id = $1", [a.familyId]);
    expect(rows[0]!.inverse.steps[0]!.set).toHaveProperty("days", null);
    const inverse = { ...rows[0]!.inverse, steps: rows[0]!.inverse.steps.map((s) => { const { days: _d, ...rest } = s.set; return { ...s, set: rest }; }) };
    await pool.query("UPDATE undo_entry SET inverse = $2::jsonb WHERE family_id = $1", [a.familyId, JSON.stringify(inverse)]);
    expect((await req("POST", "/api/undo")).statusCode).toBe(200);
    expect((await (await req("GET", "/api/log-entries")).json())[0]).toMatchObject({ id: e.id, days: null, schoolDays: 5 });
  });
});
