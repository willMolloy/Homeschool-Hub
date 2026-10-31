/** S6-07: POST /api/assignments/:id/reset. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("POST /api/assignments/:id/reset (S6-07, integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2026-10-28T15:00:00Z") }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let theirs: ReturnType<typeof inject>;
  let kids: string[] = [];
  let subjects: string[] = [];
  let id = "";
  const NEXT = "2026-11-02";
  const CREATED = { title: "Treasure Island", unitType: "pages", totalUnits: 100, weightPerUnit: 2, weekdays: [1, 2, 3], startDate: "2026-10-26", endDate: "2026-11-27" };

  const reset = (target = id, who = req) => who("POST", `/api/assignments/${target}/reset`);
  const current = async () => (await req("GET", "/api/assignments?includeArchived=true")).json().find((x: { id: string }) => x.id === id);
  const plan = async () => (await req("GET", "/api/plan?from=2026-10-26&to=2026-12-31")).json().plans;
  const overrides = async () => (await req("GET", `/api/week-overrides?weekStart=${NEXT}`)).json().overrides;
  const put = (body: object) => app.inject({ method: "PUT", url: "/api/week-overrides", cookies: a.cookies, payload: body });

  beforeAll(async () => {
    a = await signedInFamily(pool, "Reset A");
    b = await signedInFamily(pool, "Reset B");
    req = inject(app, a.cookies);
    theirs = inject(app, b.cookies);
    const r = await rosterFor(app, a.cookies, ["Ada", "Ben"], ["Reading", "Math"]);
    kids = r.childIds;
    subjects = r.subjectIds;
  });
  beforeEach(async () => {
    await pool.query("DELETE FROM undo_entry WHERE family_id = $1", [a.familyId]);
    await pool.query("DELETE FROM assignment WHERE family_id = $1", [a.familyId]);
    await pool.query("UPDATE subject SET archived_at = NULL WHERE family_id = $1", [a.familyId]);
    await pool.query("UPDATE child SET archived_at = NULL WHERE family_id = $1", [a.familyId]);
    id = (await req("POST", "/api/assignments", { ...CREATED, subjectId: subjects[0], childIds: kids })).json().id;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  it("401 without a session", async () => {
    expect((await inject(app, null)("POST", `/api/assignments/${id}/reset`)).statusCode).toBe(401);
  });

  it("a dragged, re-weighted, re-dated and adjusted assignment returns to its created dates, weight and plan", async () => {
    const before = await plan();
    await req("PATCH", `/api/assignments/${id}`, { startDate: "2026-11-02", endDate: "2026-12-11" });
    await req("PATCH", `/api/assignments/${id}`, { weightPerUnit: 3.5, title: "Treasure Isle", totalUnits: 150, weekdays: [4], subjectId: subjects[1], childIds: [kids[0]] });
    await put({ assignmentId: id, childId: kids[0], weekStart: NEXT, plannedUnits: 5, mode: "keepEndDate" });
    expect(await plan()).not.toEqual(before);

    const res = await reset();
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toMatchObject({ kept: [], assignment: { id, ...CREATED, subjectId: subjects[0], childIds: kids } });
    expect(await current()).toMatchObject({ ...CREATED, subjectId: subjects[0], childIds: kids });
    expect(await overrides()).toEqual([]);
    expect(await plan()).toEqual(before);
  });

  it("the weekday history is cleared with the days", async () => {
    await pool.query("UPDATE assignment SET weekdays_from = '2026-10-26', previous_weekdays = '{5}' WHERE id = $1", [id]);
    await reset();
    expect((await pool.query("SELECT weekdays_from, previous_weekdays FROM assignment WHERE id = $1", [id])).rows[0]).toEqual({ weekdays_from: null, previous_weekdays: null });
  });

  it("only this assignment's adjustments go; others stay", async () => {
    const other = (await req("POST", "/api/assignments", { ...CREATED, title: "Other", subjectId: subjects[0], childIds: kids })).json().id;
    await put({ assignmentId: id, childId: kids[0], weekStart: NEXT, plannedUnits: 5, mode: "keepEndDate" });
    await put({ assignmentId: other, childId: null, weekStart: NEXT, plannedUnits: 7, mode: "pushEndDate" });
    await reset();
    expect(await overrides()).toMatchObject([{ assignmentId: other }]);
  });

  it("check-ins stay", async () => {
    await pool.query("INSERT INTO progress_checkin (family_id, assignment_id, child_id, week_start, position) VALUES ($1, $2, $3, '2026-10-26', 12)", [a.familyId, id, kids[0]]);
    await req("PATCH", `/api/assignments/${id}`, { totalUnits: 90 });
    expect((await reset()).statusCode).toBe(200);
    expect((await pool.query("SELECT position::float AS p FROM progress_checkin WHERE assignment_id = $1", [id])).rows).toEqual([{ p: 12 }]);
  });

  it("an archived original subject stays as the current one and is reported", async () => {
    await req("PATCH", `/api/assignments/${id}`, { subjectId: subjects[1], title: "Moved on" });
    await pool.query("UPDATE subject SET archived_at = now() WHERE id = $1", [subjects[0]]);
    const res = await reset();
    expect(res.json().kept).toEqual(["subject"]);
    expect(await current()).toMatchObject({ title: "Treasure Island", subjectId: subjects[1] });
  });

  it("an archived original child keeps the current children and is reported", async () => {
    await req("PATCH", `/api/assignments/${id}`, { childIds: [kids[0]], title: "Only Ada" });
    await pool.query("UPDATE child SET archived_at = now() WHERE id = $1", [kids[1]]);
    const res = await reset();
    expect(res.json().kept).toEqual(["children"]);
    expect(await current()).toMatchObject({ title: "Treasure Island", childIds: [kids[0]] });
  });

  it("an archived subject that is already the current one is not reported", async () => {
    await pool.query("UPDATE subject SET archived_at = now() WHERE id = $1", [subjects[0]]);
    await req("PATCH", `/api/assignments/${id}`, { title: "Changed" });
    expect((await reset()).json().kept).toEqual([]);
  });

  it("an archived assignment stays archived", async () => {
    await req("PATCH", `/api/assignments/${id}`, { archived: true, title: "Shelved" });
    expect((await reset()).statusCode).toBe(200);
    expect(await current()).toMatchObject({ title: "Treasure Island", archived: true });
  });

  it("the reset can be undone: edits, weight choices and adjustments come back", async () => {
    await req("PATCH", `/api/assignments/${id}`, { weightPerUnit: 3, startDate: "2026-11-02", endDate: "2026-12-04" });
    const kept = await put({ assignmentId: id, childId: kids[0], weekStart: NEXT, plannedUnits: 5, mode: "keepEndDate" });
    const edited = await current();
    const planBefore = await plan();
    const choices = async () => Number((await pool.query("SELECT count(*) FROM weight_choice WHERE assignment_id = $1", [id])).rows[0].count);
    const n = await choices();
    await reset();
    expect((await req("GET", "/api/undo")).json()).toMatchObject({ label: "Reset Treasure Island" });
    expect(await choices()).toBe(n + 2); // the weight went back to 2: a choice for each child
    expect((await req("POST", "/api/undo")).statusCode).toBe(200);
    expect(await current()).toEqual(edited);
    expect(await overrides()).toEqual([kept.json()]);
    expect(await plan()).toEqual(planBefore);
    expect(await choices()).toBe(n);
    expect((await req("POST", "/api/undo")).statusCode).toBe(404);
  });

  it("resetting an untouched assignment changes nothing and records no undo", async () => {
    expect((await reset()).json().kept).toEqual([]);
    expect((await req("GET", "/api/undo")).json()).toBeNull();
  });

  it("an assignment with no saved original is a 409", async () => {
    await pool.query("UPDATE assignment SET original = NULL WHERE id = $1", [id]);
    const res = await reset();
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("no_original");
  });

  it("the original dates must still allow the latest check-in: a 409 and nothing changes", async () => {
    await req("PATCH", `/api/assignments/${id}`, { startDate: "2026-10-20", endDate: "2026-12-11" });
    await pool.query("INSERT INTO progress_checkin (family_id, assignment_id, child_id, week_start, position) VALUES ($1, $2, $3, '2026-12-07', 12)", [a.familyId, id, kids[0]]);
    const res = await reset();
    expect(res.statusCode).toBe(409);
    expect((await current()).endDate).toBe("2026-12-11");
  });

  it("another family's id, an unknown id and a malformed id are 404s", async () => {
    expect((await reset(id, theirs)).statusCode).toBe(404);
    expect((await reset("00000000-0000-4000-8000-000000000000")).statusCode).toBe(404);
    expect((await reset("nope")).statusCode).toBe(404);
  });
});
