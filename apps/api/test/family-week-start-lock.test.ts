/** S2c-01 (D25): the week start can't change once a week has a check-in or a review. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { hashSessionToken, newSessionToken } from "../src/auth/session";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { seedFamily } from "./helpers/seed";

describe.skipIf(!hasDb)("PATCH /api/family weekStart with stored weeks (S2c-01)", () => {
  const pool = hasDb ? testPool() : null!;
  // Wed Oct 28 in Chicago: last week is Oct 19–25.
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2026-10-28T15:00:00Z") }) : null!;
  let fam: Awaited<ReturnType<typeof seedFamily>>;
  let cookies: { hh_session: string };
  const W = "2026-10-19";

  const req = (method: "GET" | "PATCH" | "PUT", url: string, payload?: object) => app.inject({ method, url, cookies, payload });
  const weekStart = async () => (await pool.query("SELECT week_start FROM family WHERE id = $1", [fam.familyId])).rows[0].week_start;

  beforeAll(async () => {
    fam = await seedFamily("family-week-start-lock@example.com");
    const token = newSessionToken();
    await pool.query("INSERT INTO session (id, family_id, expires_at) VALUES ($1, $2, now() + interval '1 day')", [hashSessionToken(token), fam.familyId]);
    cookies = { hh_session: token };
  });
  beforeEach(async () => {
    await pool.query("DELETE FROM progress_checkin WHERE family_id = $1", [fam.familyId]);
    await pool.query("DELETE FROM week_review WHERE family_id = $1", [fam.familyId]);
    await pool.query("UPDATE family SET week_start = 'mon' WHERE id = $1", [fam.familyId]);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });

  const expectLocked = async () => {
    const res = await req("PATCH", "/api/family", { weekStart: "sun", name: "Renamed" });
    expect(res.statusCode, res.body).toBe(409);
    expect(res.json()).toMatchObject({ error: "week_start_locked" });
    expect(res.json().message).toMatch(/can't change after weeks have been checked in/);
    // The whole PATCH is refused: neither field changed.
    expect(await weekStart()).toBe("mon");
    expect((await req("GET", "/api/family")).json()).toMatchObject({ weekStart: "mon", weekStartLocked: true });
    expect((await req("GET", "/api/family")).json().name).not.toBe("Renamed");
  };

  it("unlocked with nothing stored: the change works and GET says unlocked", async () => {
    expect((await req("GET", "/api/family")).json().weekStartLocked).toBe(false);
    const res = await req("PATCH", "/api/family", { weekStart: "sun" });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toMatchObject({ weekStart: "sun", weekStartLocked: false });
  });

  it("a stored check-in locks it", async () => {
    const ti = fam.ids.assignment.ti!; const frank = fam.ids.child.frank!;
    const put = await req("PUT", `/api/check-ins/${W}`, { status: "reviewed", items: [{ assignmentId: ti, childId: frank, position: 60, mode: "keepEndDate" }] });
    expect(put.statusCode, put.body).toBe(200);
    await expectLocked();
  });

  it("a review alone (a skipped week) locks it", async () => {
    expect((await req("PUT", `/api/check-ins/${W}`, { status: "skipped", items: [] })).statusCode).toBe(200);
    await expectLocked();
  });

  it("while locked, the same week start and other fields still save", async () => {
    expect((await req("PUT", `/api/check-ins/${W}`, { status: "reviewed", items: [] })).statusCode).toBe(200);
    const res = await req("PATCH", "/api/family", { weekStart: "mon", schoolDays: [1, 2, 3, 4] });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toMatchObject({ weekStart: "mon", schoolDays: [1, 2, 3, 4], weekStartLocked: true });
    await pool.query("UPDATE family SET school_days = '{1,2,3,4,5}' WHERE id = $1", [fam.familyId]);
  });

  it("the stored week stays readable afterwards (no orphaned weeks)", async () => {
    expect((await req("PUT", `/api/check-ins/${W}`, { status: "reviewed", items: [] })).statusCode).toBe(200);
    expect((await req("PATCH", "/api/family", { weekStart: "sun" })).statusCode).toBe(409);
    const last = (await req("GET", "/api/check-ins")).json();
    expect(last).toMatchObject({ weekStart: W, status: "reviewed" });
  });
});
