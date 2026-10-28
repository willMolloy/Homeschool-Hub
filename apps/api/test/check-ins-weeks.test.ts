/** S2b-27: GET /api/check-ins/weeks — finished weeks a parent can reopen, newest first. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { PastWeekJson } from "../src/services/checkInService";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { seedFamily } from "./helpers/seed";
import { signedInFamily } from "./helpers/session";
import { hashSessionToken, newSessionToken } from "../src/auth/session";

describe.skipIf(!hasDb)("GET /api/check-ins/weeks (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  // Wed Oct 28 in Chicago: last week is Oct 19–25; the earliest assignments start Mon Aug 31.
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2026-10-28T15:00:00Z") }) : null!;
  // Wed Jan 6 2027: the Christmas vacation weeks are finished.
  const january = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2027-01-06T15:00:00Z") }) : null!;
  let fam: Awaited<ReturnType<typeof seedFamily>>;
  let cookies: { hh_session: string };
  let other: Awaited<ReturnType<typeof signedInFamily>>;

  const weeks = async (on = app, c = cookies, qs = "") => {
    const res = await on.inject({ method: "GET", url: `/api/check-ins/weeks${qs}`, cookies: c });
    expect(res.statusCode, res.body).toBe(200);
    return res.json<{ weeks: PastWeekJson[] }>().weeks;
  };

  beforeAll(async () => {
    fam = await seedFamily("check-ins-weeks@example.com");
    const token = newSessionToken();
    await pool.query("INSERT INTO session (id, family_id, expires_at) VALUES ($1, $2, now() + interval '1 day')",
      [hashSessionToken(token), fam.familyId]);
    cookies = { hh_session: token };
    other = await signedInFamily(pool, "Check-in weeks other");
  });
  afterAll(async () => {
    await Promise.all([app.close(), january.close()]);
    await pool.query("DELETE FROM family WHERE id = ANY($1::uuid[])", [[fam.familyId, other.familyId]]);
    await pool.end();
  });

  it("401 when signed out", async () => {
    const res = await app.inject({ method: "GET", url: "/api/check-ins/weeks" });
    expect(res.statusCode).toBe(401);
  });

  it("lists finished weeks with work, newest first, unreviewed; not the current week", async () => {
    const w = await weeks();
    expect(w.map((x) => x.weekStart)).toEqual([
      "2026-10-19", "2026-10-12", "2026-10-05", "2026-09-28", "2026-09-21", "2026-09-14", "2026-09-07", "2026-08-31",
    ]);
    expect(w[0]).toEqual({ weekStart: "2026-10-19", weekEnd: "2026-10-25", status: null, hasCheckIns: false });
    expect(w.some((x) => x.weekStart >= "2026-10-26")).toBe(false);
  });

  it("shows reviewed/skipped and which weeks have check-ins", async () => {
    await pool.query("INSERT INTO week_review (family_id, week_start, status) VALUES ($1, '2026-10-12', 'skipped'), ($1, '2026-10-05', 'reviewed')", [fam.familyId]);
    await pool.query(
      "INSERT INTO progress_checkin (family_id, assignment_id, child_id, week_start, position, mode) VALUES ($1, $2, $3, '2026-10-05', 3, 'keepEndDate')",
      [fam.familyId, fam.ids.assignment.math5, fam.ids.child.frank]);
    try {
      const w = await weeks();
      const by = new Map(w.map((x) => [x.weekStart, x]));
      expect(by.get("2026-10-12")).toMatchObject({ status: "skipped", hasCheckIns: false });
      expect(by.get("2026-10-05")).toMatchObject({ status: "reviewed", hasCheckIns: true });
      expect(by.get("2026-10-19")).toMatchObject({ status: null, hasCheckIns: false });
    } finally {
      await pool.query("DELETE FROM progress_checkin WHERE family_id = $1", [fam.familyId]);
      await pool.query("DELETE FROM week_review WHERE family_id = $1", [fam.familyId]);
    }
  });

  it("leaves out fully blocked weeks (Christmas vacation)", async () => {
    const w = (await weeks(january)).map((x) => x.weekStart);
    expect(w[0]).toBe("2026-12-14"); // Dec 21 and Dec 28 are vacation
    expect(w).not.toContain("2026-12-21");
    expect(w).not.toContain("2026-12-28");
    expect(w).toContain("2026-12-14");
  });

  it("is family-scoped: another family has no weeks", async () => {
    expect(await weeks(app, other.cookies)).toEqual([]);
  });

  it("rejects unknown query keys", async () => {
    const res = await app.inject({ method: "GET", url: "/api/check-ins/weeks?x=1", cookies });
    expect(res.statusCode).toBe(400);
  });
});
