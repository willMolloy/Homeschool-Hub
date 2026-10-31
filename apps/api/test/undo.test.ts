/** S6-06: record and undo the last change (GET/POST /api/undo). */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("/api/undo (S6-06, integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2026-10-28T15:00:00Z") }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let theirs: ReturnType<typeof inject>;
  let kids: string[] = [];
  let subject = "";
  let id = "";
  const NEXT = "2026-11-02";

  const assignment = async () => (await req("GET", "/api/assignments")).json().find((x: { id: string }) => x.id === id);
  const plan = async () => (await req("GET", "/api/plan?from=2026-10-26&to=2026-12-31")).json().plans;
  const undoEntry = async () => (await req("GET", "/api/undo")).json();
  const put = (body: object) => app.inject({ method: "PUT", url: "/api/week-overrides", cookies: a.cookies, payload: body });
  const override = (over: object = {}) => ({ assignmentId: id, childId: kids[0], weekStart: NEXT, plannedUnits: 10, mode: "keepEndDate", ...over });
  const choices = async () => Number((await pool.query("SELECT count(*) FROM weight_choice WHERE assignment_id = $1", [id])).rows[0].count);

  beforeAll(async () => {
    a = await signedInFamily(pool, "Undo A");
    b = await signedInFamily(pool, "Undo B");
    req = inject(app, a.cookies);
    theirs = inject(app, b.cookies);
    const r = await rosterFor(app, a.cookies, ["Ada", "Ben"], ["Spelling"]);
    kids = r.childIds;
    subject = r.subjectIds[0]!;
  });
  beforeEach(async () => {
    await pool.query("DELETE FROM undo_entry WHERE family_id = $1", [a.familyId]);
    await pool.query("DELETE FROM assignment WHERE family_id = $1", [a.familyId]);
    await pool.query("DELETE FROM blocked_range WHERE family_id = $1", [a.familyId]);
    id = (await req("POST", "/api/assignments", {
      subjectId: subject, title: "Treasure Island", unitType: "pages", totalUnits: 100, weightPerUnit: 2, startDate: "2026-10-26", endDate: "2026-11-27", childIds: kids,
    })).json().id;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  it("401 without a session", async () => {
    expect((await app.inject({ method: "GET", url: "/api/undo" })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/api/undo" })).statusCode).toBe(401);
  });

  it("nothing recorded: GET is null and POST is a 404", async () => {
    const res = await req("GET", "/api/undo");
    expect(res.statusCode).toBe(200);
    expect(res.json()).toBeNull();
    expect((await req("POST", "/api/undo")).statusCode).toBe(404);
  });

  it("an edit that moves the dates: label, undo restores the assignment and the plan, a second undo is a 404", async () => {
    const before = await plan();
    const original = await assignment();
    expect((await req("PATCH", `/api/assignments/${id}`, { startDate: "2026-11-02", endDate: "2026-12-04" })).statusCode).toBe(200);
    expect(await undoEntry()).toEqual({ label: "Moved Treasure Island", createdAt: expect.any(String) });
    expect(await plan()).not.toEqual(before);
    const res = await req("POST", "/api/undo");
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toEqual({ label: "Moved Treasure Island" });
    expect(await assignment()).toEqual(original);
    expect(await plan()).toEqual(before);
    expect(await undoEntry()).toBeNull();
    expect((await req("POST", "/api/undo")).statusCode).toBe(404);
  });

  it("other edits are labelled: changed, archived, restored, the weight", async () => {
    await req("PATCH", `/api/assignments/${id}`, { title: "Treasure Isle", totalUnits: 120 });
    expect((await undoEntry()).label).toBe("Changed Treasure Isle");
    await req("PATCH", `/api/assignments/${id}`, { weightPerUnit: 2.5 });
    expect((await undoEntry()).label).toBe("Changed the weight of Treasure Isle");
    await req("PATCH", `/api/assignments/${id}`, { archived: true });
    expect((await undoEntry()).label).toBe("Archived Treasure Isle");
    expect(await assignment()).toBeUndefined(); // the list hides archived ones
    await req("POST", "/api/undo");
    expect(await assignment()).toMatchObject({ archived: false });
    await req("PATCH", `/api/assignments/${id}`, { archived: true });
    await req("PATCH", `/api/assignments/${id}`, { archived: false });
    expect((await undoEntry()).label).toBe("Restored Treasure Isle");
  });

  it("an undo restores children, days, weight and the weight choice it recorded", async () => {
    await req("PATCH", `/api/assignments/${id}`, { weightPerUnit: 3 });
    expect(await choices()).toBe(4); // 2 from the create, 2 from the edit
    await req("PATCH", `/api/assignments/${id}`, { childIds: [kids[0]], weekdays: [1, 2], title: "Short" });
    await req("POST", "/api/undo");
    expect(await assignment()).toMatchObject({ title: "Treasure Island", childIds: kids, weekdays: null, weightPerUnit: 3 });
    // The nudge itself, undone: back to 2 and the choice is gone.
    await req("PATCH", `/api/assignments/${id}`, { weightPerUnit: 3.5 });
    expect(await choices()).toBe(6);
    await req("POST", "/api/undo");
    expect(await assignment()).toMatchObject({ weightPerUnit: 3 });
    expect(await choices()).toBe(4);
  });

  it("an edit that changes nothing leaves the earlier entry alone", async () => {
    await req("PATCH", `/api/assignments/${id}`, { title: "Renamed" });
    const first = await undoEntry();
    await req("PATCH", `/api/assignments/${id}`, { title: "Renamed" });
    expect(await undoEntry()).toEqual(first);
  });

  it("a day off created, bulk created, changed and deleted can each be undone", async () => {
    const mk = (over: object = {}) => ({ label: "Trip", kind: "vacation", startDate: "2026-11-09", endDate: "2026-11-13", childIds: [], ...over });
    const dayId = (await req("POST", "/api/blocked-ranges", mk())).json().id;
    expect(await undoEntry()).toMatchObject({ label: "Added a day off" });
    expect((await req("POST", "/api/undo")).statusCode).toBe(200);
    expect((await req("GET", "/api/blocked-ranges")).json()).toEqual([]);

    await req("POST", "/api/blocked-ranges/bulk", { blockedRanges: [mk(), mk({ startDate: "2026-11-16", endDate: "2026-11-17" })] });
    expect(await undoEntry()).toMatchObject({ label: "Added 2 days off" });
    await req("POST", "/api/undo");
    expect((await req("GET", "/api/blocked-ranges")).json()).toEqual([]);

    const day = (await req("POST", "/api/blocked-ranges", mk({ childIds: [kids[1]] }))).json();
    const before = await plan();
    await req("PATCH", `/api/blocked-ranges/${day.id}`, { label: "Longer", endDate: "2026-11-20", childIds: kids });
    expect(await undoEntry()).toMatchObject({ label: "Changed a day off" });
    await req("POST", "/api/undo");
    expect((await req("GET", "/api/blocked-ranges")).json()).toEqual([day]);

    expect((await req("DELETE", `/api/blocked-ranges/${day.id}`)).statusCode).toBe(204);
    expect(await undoEntry()).toMatchObject({ label: "Removed a day off" });
    expect(await plan()).not.toEqual(before);
    await req("POST", "/api/undo");
    expect((await req("GET", "/api/blocked-ranges")).json()).toEqual([day]); // same id, fields and children
    expect(await plan()).toEqual(before);
    void dayId;
  });

  it("a week adjustment set, replaced and removed can each be undone", async () => {
    const before = await plan();
    const first = (await put(override())).json();
    expect(await undoEntry()).toMatchObject({ label: "Adjusted Treasure Island" });
    expect(await plan()).not.toEqual(before);
    await req("POST", "/api/undo");
    expect((await req("GET", `/api/week-overrides?weekStart=${NEXT}`)).json()).toEqual({ overrides: [] });
    expect(await plan()).toEqual(before);

    const one = (await put(override())).json();
    await put(override({ plannedUnits: 4, mode: "pushEndDate" }));
    await req("POST", "/api/undo");
    // The earlier amount is back with its own place in the edit order.
    expect((await req("GET", `/api/week-overrides?weekStart=${NEXT}`)).json()).toEqual({ overrides: [one] });

    expect((await req("DELETE", `/api/week-overrides/${one.id}`)).statusCode).toBe(204);
    expect(await undoEntry()).toMatchObject({ label: "Removed an adjustment to Treasure Island" });
    await req("POST", "/api/undo");
    expect((await req("GET", `/api/week-overrides?weekStart=${NEXT}`)).json()).toEqual({ overrides: [one] });
    void first;
  });

  it("only the last change is kept: a new change replaces the entry", async () => {
    await req("PATCH", `/api/assignments/${id}`, { title: "First" });
    await req("POST", "/api/blocked-ranges", { label: "Trip", kind: "vacation", startDate: "2026-11-09", endDate: "2026-11-09", childIds: [] });
    expect((await undoEntry()).label).toBe("Added a day off");
    expect((await pool.query("SELECT count(*)::int AS n FROM undo_entry WHERE family_id = $1", [a.familyId])).rows[0].n).toBe(1);
    await req("POST", "/api/undo");
    expect((await assignment()).title).toBe("First"); // the earlier edit stays: undo is one step
  });

  it("writes that are not plan changes leave the entry alone", async () => {
    await req("PATCH", `/api/assignments/${id}`, { title: "Kept" });
    const entry = await undoEntry();
    await req("POST", "/api/children", { name: "Cy" });
    await req("POST", "/api/subjects", { name: "Latin" });
    await req("PATCH", `/api/children/${kids[0]}`, { name: "Ada B" });
    await req("POST", "/api/assignments", { subjectId: subject, title: "Another", unitType: "lessons", totalUnits: 3, startDate: NEXT, endDate: "2026-11-06", childIds: kids });
    expect(await undoEntry()).toEqual(entry);
  });

  it("a stale entry is a 409 and is dropped: the assignment is gone", async () => {
    await req("PATCH", `/api/assignments/${id}`, { title: "Gone soon" });
    await pool.query("DELETE FROM assignment WHERE id = $1", [id]);
    const res = await req("POST", "/api/undo");
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: "cannot_undo", message: "That change can't be undone any more." });
    expect(await undoEntry()).toBeNull();
    expect((await req("POST", "/api/undo")).statusCode).toBe(404);
  });

  it("a stale entry is a 409: the day off is gone, or a check-in now pins the dates", async () => {
    await req("POST", "/api/blocked-ranges", { label: "Trip", kind: "vacation", startDate: "2026-11-09", endDate: "2026-11-09", childIds: [] });
    await pool.query("DELETE FROM blocked_range WHERE family_id = $1", [a.familyId]);
    expect((await req("POST", "/api/undo")).statusCode).toBe(409);

    await req("PATCH", `/api/assignments/${id}`, { startDate: "2026-10-27", endDate: "2026-11-27" });
    // A check-in in the last week: the original end (Nov 27) would still allow it; make the undo's dates conflict instead.
    await pool.query("INSERT INTO progress_checkin (family_id, assignment_id, child_id, week_start, position) VALUES ($1, $2, $3, '2026-11-23', 5)", [a.familyId, id, kids[0]]);
    await pool.query("UPDATE undo_entry SET inverse = jsonb_set(inverse, '{steps,0,set,endDate}', '\"2026-11-16\"') WHERE family_id = $1", [a.familyId]);
    expect((await req("POST", "/api/undo")).statusCode).toBe(409);
    expect((await assignment()).startDate).toBe("2026-10-27"); // nothing half-applied
  });

  it("each family has its own entry", async () => {
    await req("PATCH", `/api/assignments/${id}`, { title: "Mine" });
    expect((await theirs("GET", "/api/undo")).json()).toBeNull();
    expect((await theirs("POST", "/api/undo")).statusCode).toBe(404);
    expect((await undoEntry()).label).toBe("Changed Mine");
  });
});
