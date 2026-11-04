/** S12-01: an assignment records how it ended (PATCH endedAs / endedOn): round trip, validation, undo, the plan input. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { readPlanInputs } from "../src/plan/loadPlanInputs";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("assignment ended (S12-01, integration)", () => {
  const pool = hasDb ? testPool() : null!;
  // 2026-11-04 12:00 in US Central is the family's today.
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2026-11-04T18:00:00Z") }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let theirs: ReturnType<typeof inject>;
  let kids: string[] = [];
  let subject = "";
  let id = "";

  const get = async () => (await req("GET", "/api/assignments")).json().find((x: { id: string }) => x.id === id);
  const patch = (payload: unknown, target = id) => req("PATCH", `/api/assignments/${target}`, payload);

  beforeAll(async () => {
    a = await signedInFamily(pool, "Ended A");
    b = await signedInFamily(pool, "Ended B");
    req = inject(app, a.cookies);
    theirs = inject(app, b.cookies);
    const r = await rosterFor(app, a.cookies, ["Frank"], ["Reading"]);
    kids = r.childIds;
    subject = r.subjectIds[0]!;
  });
  beforeEach(async () => {
    await pool.query("DELETE FROM undo_entry WHERE family_id = $1", [a.familyId]);
    await pool.query("DELETE FROM assignment WHERE family_id = $1", [a.familyId]);
    id = (await req("POST", "/api/assignments", {
      subjectId: subject, title: "Treasure Island", unitType: "pages", totalUnits: 100, weightPerUnit: 2, startDate: "2026-10-12", endDate: "2026-10-30", childIds: kids,
    })).json().id;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  it("a new assignment is open: the list says endedAs and endedOn are null", async () => {
    expect(await get()).toMatchObject({ endedAs: null, endedOn: null });
  });

  it("finished takes the stored end date unless a day is given", async () => {
    const res = await patch({ endedAs: "finished" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ endedAs: "finished", endedOn: "2026-10-30", endDate: "2026-10-30" });
    expect(await get()).toMatchObject({ endedAs: "finished", endedOn: "2026-10-30" });
    expect((await patch({ endedAs: "finished", endedOn: "2026-10-28" })).json()).toMatchObject({ endedOn: "2026-10-28" });
  });

  it("stopped takes today (the family's day) unless a day is given", async () => {
    expect((await patch({ endedAs: "stopped" })).json()).toMatchObject({ endedAs: "stopped", endedOn: "2026-11-04" });
    expect((await patch({ endedAs: "stopped", endedOn: "2026-10-20" })).json()).toMatchObject({ endedAs: "stopped", endedOn: "2026-10-20" });
  });

  it("stopped before the start is today or the start, whichever is later", async () => {
    const future = (await req("POST", "/api/assignments", {
      subjectId: subject, title: "Next year", unitType: "pages", totalUnits: 10, weightPerUnit: 2, startDate: "2027-01-04", endDate: "2027-02-01", childIds: kids,
    })).json().id;
    expect((await patch({ endedAs: "stopped" }, future)).json()).toMatchObject({ endedOn: "2027-01-04" });
  });

  it("endedOn alone moves the day of one already ended, and is refused for an open one", async () => {
    expect((await patch({ endedOn: "2026-10-25" })).statusCode).toBe(400);
    await patch({ endedAs: "finished" });
    const res = await patch({ endedOn: "2026-10-25" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ endedAs: "finished", endedOn: "2026-10-25" });
  });

  it("endedAs null reopens it (both cleared); a day with null is refused", async () => {
    await patch({ endedAs: "stopped" });
    expect((await patch({ endedAs: null, endedOn: "2026-11-01" })).statusCode).toBe(400);
    const res = await patch({ endedAs: null });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ endedAs: null, endedOn: null });
  });

  it("validates: another outcome, a bad day, a day before the start, a start after the day it ended", async () => {
    expect((await patch({ endedAs: "done" })).statusCode).toBe(400);
    expect((await patch({ endedAs: "finished", endedOn: "soon" })).statusCode).toBe(400);
    const early = await patch({ endedAs: "finished", endedOn: "2026-10-01" });
    expect(early.statusCode).toBe(400);
    expect(early.json().error).toBe("invalid_range");
    expect(await get()).toMatchObject({ endedAs: null });
    await patch({ endedAs: "finished", endedOn: "2026-10-20" });
    expect((await patch({ startDate: "2026-10-25" })).statusCode).toBe(400);
    expect((await patch({ startDate: "2026-10-15" })).statusCode).toBe(200);
  });

  it("is the family's own: another family's assignment is a 404", async () => {
    expect((await theirs("PATCH", `/api/assignments/${id}`, { endedAs: "finished" })).statusCode).toBe(404);
    expect(await get()).toMatchObject({ endedAs: null });
  });

  it("can be undone, with its own label, and so can reopening", async () => {
    await patch({ endedAs: "finished" });
    expect((await req("GET", "/api/undo")).json()).toMatchObject({ label: "Marked Treasure Island finished" });
    expect((await req("POST", "/api/undo")).statusCode).toBe(200);
    expect(await get()).toMatchObject({ endedAs: null, endedOn: null });

    await patch({ endedAs: "stopped" });
    expect((await req("GET", "/api/undo")).json()).toMatchObject({ label: "Marked Treasure Island stopped" });
    await req("POST", "/api/undo");
    await patch({ endedAs: "stopped" });
    await patch({ endedAs: null });
    expect((await req("GET", "/api/undo")).json()).toMatchObject({ label: "Reopened Treasure Island" });
    await req("POST", "/api/undo");
    expect(await get()).toMatchObject({ endedAs: "stopped", endedOn: "2026-11-04" });
  });

  it("is not a log entry and changes no check-in or log", async () => {
    await patch({ endedAs: "finished" });
    const { rows } = await pool.query("SELECT (SELECT count(*) FROM log_entry WHERE family_id = $1)::int AS logs, (SELECT count(*) FROM record_entry WHERE family_id = $1)::int AS records", [a.familyId]);
    expect(rows[0]).toEqual({ logs: 0, records: 0 });
  });

  it("reaches the plan input", async () => {
    await patch({ endedAs: "stopped", endedOn: "2026-10-20" });
    const inputs = await readPlanInputs(pool, a.familyId);
    expect(inputs.assignments.find((x) => x.id === id)).toMatchObject({ endedAs: "stopped", endedOn: "2026-10-20" });
  });
});
