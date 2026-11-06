/** S18-04 (E7): adding a log entry leaves one undo entry; Undo takes away exactly the entries that save made. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { viewerMayCall } from "../src/auth/viewerAccess";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("a new log entry is undoable (S18-04, integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2026-11-04T15:00:00Z") }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let kids: string[] = [];
  const WEEK = { startDate: "2026-11-02", endDate: "2026-11-06" };
  const list = async () => (await req("GET", "/api/log-entries")).json() as Array<{ id: string }>;
  const undoLabel = async () => (await req("GET", "/api/undo")).json()?.label as string | undefined;

  beforeAll(async () => {
    a = await signedInFamily(pool, "Log undo A");
    req = inject(app, a.cookies);
    kids = (await rosterFor(app, a.cookies, ["Clara", "Elias"], ["Math"])).childIds;
  });
  beforeEach(async () => {
    await pool.query("DELETE FROM record_entry WHERE family_id = $1", [a.familyId]);
    await pool.query("DELETE FROM undo_entry WHERE family_id = $1", [a.familyId]);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [a.familyId]);
    await pool.end();
  });

  it("one child: 'Added Clara's log for Nov 2 to Nov 6', and Undo removes it", async () => {
    const res = await req("POST", "/api/log-entries", { childIds: [kids[0]], ...WEEK, notes: "x" });
    expect(res.statusCode, res.body).toBe(201);
    expect(await undoLabel()).toBe("Added Clara's log for Nov 2 to Nov 6");
    expect((await req("POST", "/api/undo")).statusCode).toBe(200);
    expect(await list()).toEqual([]);
    expect(await undoLabel()).toBeUndefined();
  });

  it("two children and one day: one entry in the undo, 'Added 2 log entries for Nov 3', and Undo removes both but not an earlier entry", async () => {
    const before = (await req("POST", "/api/log-entries", { childIds: [kids[0]], ...WEEK, notes: "earlier" })).json()[0];
    await req("POST", "/api/log-entries", { childIds: kids, startDate: "2026-11-03", notes: "field trip" });
    expect(await undoLabel()).toBe("Added 2 log entries for Nov 3");
    expect(await list()).toHaveLength(3);
    expect((await req("POST", "/api/undo")).statusCode).toBe(200);
    expect((await list()).map((e) => e.id)).toEqual([before.id]);
  });

  it("an entry that is refused leaves no undo entry", async () => {
    expect((await req("POST", "/api/log-entries", { childIds: [kids[0]], startDate: "2026-11-06", endDate: "2026-11-02" })).statusCode).toBe(400);
    expect(await undoLabel()).toBeUndefined();
  });

  it("a viewer still cannot add an entry or undo", () => {
    expect(viewerMayCall("POST", "/api/log-entries")).toBe(false);
    expect(viewerMayCall("POST", "/api/undo")).toBe(false);
  });
});
