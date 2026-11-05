/** S14-05: Add several and CSV import are one undo, like the copy panels (S7b-11); refused once anything depends on a created assignment. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("undo for Add several and CSV import (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2026-10-28T15:00:00Z") }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let theirs: ReturnType<typeof inject>;
  let kids: string[] = [];
  let subject = "";
  const body = (title: string) => ({ subjectId: subject, title, unitType: "pages", totalUnits: 50, weightPerUnit: null, startDate: "2026-11-02", endDate: "2026-12-18", childIds: kids, weekdays: null });
  const bulk = (titles: string[], undo?: object, as = req) => as("POST", "/api/assignments/bulk", { assignments: titles.map(body), ...(undo ? { undo } : {}) });
  const titles = async (as = req) => (await as("GET", "/api/assignments")).json().map((x: { title: string }) => x.title).sort();
  const entry = async (as = req) => (await as("GET", "/api/undo")).json();

  beforeAll(async () => {
    a = await signedInFamily(pool, "Bulk undo A");
    b = await signedInFamily(pool, "Bulk undo B");
    req = inject(app, a.cookies);
    theirs = inject(app, b.cookies);
    const r = await rosterFor(app, a.cookies, ["Ada"], ["Reading"]);
    kids = r.childIds;
    subject = r.subjectIds[0]!;
  });
  beforeEach(async () => {
    await pool.query("DELETE FROM undo_entry WHERE family_id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.query("DELETE FROM assignment WHERE family_id = $1", [a.familyId]);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  it("Add several: six at once are one 'Added 6 assignments', and one undo removes exactly those six", async () => {
    expect((await bulk(["Keep me"])).statusCode).toBe(201);
    expect((await bulk(["One", "Two", "Three", "Four", "Five", "Six"], { label: "Added 6 assignments" })).statusCode).toBe(201);
    expect(await entry()).toMatchObject({ label: "Added 6 assignments" });
    expect(await titles()).toHaveLength(7);
    const undone = await req("POST", "/api/undo");
    expect(undone.statusCode).toBe(200);
    expect(undone.json()).toEqual({ label: "Added 6 assignments" });
    expect(await titles()).toEqual(["Keep me"]);
    expect((await req("POST", "/api/undo")).statusCode).toBe(404);
  });

  it("CSV import: a 60-row import is two requests of 50 and 10, one 'Imported 60 assignments', one undo", async () => {
    const all = Array.from({ length: 60 }, (_, i) => `Row ${String(i + 1).padStart(2, "0")}`);
    expect((await bulk(all.slice(0, 50), { label: "Imported 50 assignments" })).statusCode).toBe(201);
    expect((await bulk(all.slice(50), { label: "Imported 60 assignments", append: true })).statusCode).toBe(201);
    expect((await entry()).label).toBe("Imported 60 assignments");
    expect(await titles()).toHaveLength(60);
    expect((await req("POST", "/api/undo")).statusCode).toBe(200);
    expect(await titles()).toEqual([]);
  });

  it("is refused (409, a plain message) once one has a check-in, a completion answer or a log entry; nothing is removed", async () => {
    const make = async (label: string) => (await bulk(["Alpha", "Beta"], { label })).json() as { id: string }[];
    const attempt = async () => {
      const r = await req("POST", "/api/undo");
      expect(r.statusCode).toBe(409);
      expect(r.json()).toEqual({ error: "cannot_undo", message: "That change can't be undone any more." });
      expect(await titles()).toEqual(["Alpha", "Beta"]);
      await pool.query("DELETE FROM assignment WHERE family_id = $1", [a.familyId]);
    };
    let [x] = await make("Added 2 assignments");
    await pool.query("INSERT INTO progress_checkin (family_id, assignment_id, child_id, week_start, position) VALUES ($1, $2, $3, '2026-11-02', 5)", [a.familyId, x!.id, kids[0]]);
    await attempt();
    [x] = await make("Imported 2 assignments");
    await pool.query("UPDATE assignment SET ended_as = 'finished', ended_on = '2026-11-20' WHERE id = $1", [x!.id]);
    await attempt();
    [x] = await make("Added 2 assignments");
    await pool.query("INSERT INTO log_entry (id, family_id, assignment_id, log_date, kind) VALUES (gen_random_uuid(), $1, $2, '2026-11-03', 'checkoff')", [a.familyId, x!.id]);
    await attempt();
  });

  it("the entry is the family's own: another family neither sees it nor can undo it", async () => {
    await bulk(["Mine 1", "Mine 2"], { label: "Added 2 assignments" });
    expect(await entry(theirs)).toBeNull();
    expect((await theirs("POST", "/api/undo")).statusCode).toBe(404);
    expect(await titles()).toEqual(["Mine 1", "Mine 2"]);
    // Their own bulk add has its own entry, and undoing it removes none of A's.
    const rb = await rosterFor(app, b.cookies, ["Bo"], ["Art"]);
    await theirs("POST", "/api/assignments/bulk", { assignments: [{ ...body("Theirs"), subjectId: rb.subjectIds[0], childIds: rb.childIds }], undo: { label: "Added 1 assignment" } });
    expect((await theirs("POST", "/api/undo")).statusCode).toBe(200);
    expect(await titles()).toEqual(["Mine 1", "Mine 2"]);
    expect(await titles(theirs)).toEqual([]);
  });

  it("the undo covers the last change only: a later edit replaces it", async () => {
    const [first] = (await bulk(["Edit me", "Other"], { label: "Added 2 assignments" })).json() as { id: string }[];
    await req("PATCH", `/api/assignments/${first!.id}`, { title: "Edited" });
    expect(await entry()).toMatchObject({ label: "Changed Edited" });
    expect((await req("POST", "/api/undo")).statusCode).toBe(200); // undoes the edit, not the add
    expect(await titles()).toEqual(["Edit me", "Other"]);
  });
});
