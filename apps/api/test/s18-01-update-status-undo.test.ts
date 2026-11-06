/** S18-01 / S18-02: an Update status save is one undoable change: check-ins, review status and (S18-02) the end date together. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { hashSessionToken, newSessionToken } from "../src/auth/session";
import { viewerMayCall } from "../src/auth/viewerAccess";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { seedFamily } from "./helpers/seed";

describe.skipIf(!hasDb)("Update status undo (S18-01, S18-02, integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2026-10-28T15:00:00Z") }) : null!;
  let fam: Awaited<ReturnType<typeof seedFamily>>;
  let cookies: { hh_session: string };
  let ti = "", frank = "";
  const W = "2026-10-19";
  const call = (method: "GET" | "PUT" | "POST" | "PATCH", url: string, payload?: object) => app.inject({ method, url, cookies, payload });
  const item = (position: number, mode: string | null) => ({ assignmentId: ti, childId: frank, position, mode });
  const rows = async () => (await pool.query("SELECT position::float AS position, mode FROM progress_checkin WHERE family_id = $1 ORDER BY assignment_id, child_id", [fam.familyId])).rows;
  const review = async () => (await pool.query("SELECT status FROM week_review WHERE family_id = $1 AND week_start = $2", [fam.familyId, W])).rows[0]?.status ?? null;
  const endOf = async () => (await pool.query("SELECT end_date::text AS e FROM assignment WHERE id = $1", [ti])).rows[0].e as string;
  const undoEntry = async () => (await call("GET", "/api/undo")).json();

  beforeAll(async () => {
    fam = await seedFamily("s18-01-status-undo@example.com");
    const token = newSessionToken();
    await pool.query("INSERT INTO session (id, family_id, expires_at) VALUES ($1, $2, now() + interval '1 day')", [hashSessionToken(token), fam.familyId]);
    cookies = { hh_session: token };
    ti = fam.ids.assignment.ti!; frank = fam.ids.child.frank!;
  });
  beforeEach(async () => {
    await pool.query("DELETE FROM progress_checkin WHERE family_id = $1", [fam.familyId]);
    await pool.query("DELETE FROM week_review WHERE family_id = $1", [fam.familyId]);
    await pool.query("DELETE FROM undo_entry WHERE family_id = $1", [fam.familyId]);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });

  it("a save leaves one undo entry named for the assignment; Undo takes the check-in and the review back", async () => {
    const original = await endOf();
    expect((await call("PUT", `/api/check-ins/${W}`, { status: "reviewed", items: [item(75, "keepEndDate")] })).statusCode).toBe(200);
    expect(await undoEntry()).toEqual({ label: "Updated Treasure Island", createdAt: expect.any(String) });
    expect(await rows()).toEqual([{ position: 75, mode: "keepEndDate" }]);
    const res = await call("POST", "/api/undo");
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toEqual({ label: "Updated Treasure Island" });
    expect(await rows()).toEqual([]);
    expect(await review()).toBeNull();
    expect(await endOf()).toBe(original);
    expect(await undoEntry()).toBeNull();
  });

  it("a second save replaces the first entry, and its Undo restores the first save's check-in exactly", async () => {
    await call("PUT", `/api/check-ins/${W}`, { status: "reviewed", items: [item(75, "keepEndDate")] });
    await call("PUT", `/api/check-ins/${W}`, { status: "reviewed", items: [item(60, "pushEndDate")] });
    expect(await rows()).toEqual([{ position: 60, mode: "pushEndDate" }]);
    await call("POST", "/api/undo");
    expect(await rows()).toEqual([{ position: 75, mode: "keepEndDate" }]);
    expect(await review()).toBe("reviewed");
    expect((await call("POST", "/api/undo")).statusCode).toBe(404);
  });

  it("S18-02: the end date moves with the save, the label says so, and one Undo puts back both the date and the check-in", async () => {
    const original = await endOf();
    const res = await call("PUT", `/api/check-ins/${W}`, { status: "reviewed", items: [item(75, "keepEndDate")], endDate: { assignmentId: ti, endDate: "2027-02-01" } });
    expect(res.statusCode, res.body).toBe(200);
    expect(await endOf()).toBe("2027-02-01");
    expect((await undoEntry()).label).toBe("Updated Treasure Island, end moved to Feb 1");
    expect((await call("POST", "/api/undo")).statusCode).toBe(200);
    expect(await endOf()).toBe(original);
    expect(await rows()).toEqual([]);
    expect(await review()).toBeNull();
  });

  it("S18-02: an end date that is refused (before the saved check-in week) changes nothing at all", async () => {
    const original = await endOf();
    await pool.query("UPDATE assignment SET start_date = '2026-09-01' WHERE id = $1", [ti]); // so Oct 12 is a valid range, just before the week
    const res = await call("PUT", `/api/check-ins/${W}`, { status: "reviewed", items: [item(270, null)], endDate: { assignmentId: ti, endDate: "2026-10-12" } });
    expect(res.statusCode, res.body).toBe(409);
    expect(await endOf()).toBe(original);
    expect(await rows()).toEqual([]);
    expect(await undoEntry()).toBeNull();
    const other = await call("PUT", `/api/check-ins/${W}`, { status: "reviewed", items: [], endDate: { assignmentId: "00000000-0000-4000-8000-000000000000", endDate: "2027-02-01" } });
    expect(other.statusCode).toBe(400);
  });

  it("the save stays a parent-only write: no check-in route is on the viewer allow-list", () => {
    expect(viewerMayCall("PUT", "/api/check-ins/:weekStart")).toBe(false);
    expect(viewerMayCall("POST", "/api/undo")).toBe(false);
  });
});
