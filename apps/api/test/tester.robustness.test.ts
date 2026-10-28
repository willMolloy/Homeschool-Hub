/** Independent tester: plan-route robustness edges (Oct 28, 2026). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { localToday } from "../src/http/today";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("tester: plan route edges", () => {
  const pool = hasDb ? testPool() : null!;
  const NOW = new Date("2026-10-28T15:00:00Z");
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => NOW }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  beforeAll(async () => { fam = await signedInFamily(pool, "Plan edges"); });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });
  const plan = (qs: string) => app.inject({ method: "GET", url: `/api/plan?${qs}`, cookies: fam.cookies });

  it("range length: 400 days inclusive is OK, 401 is 400; a single day is OK; leap day is OK", async () => {
    expect((await plan("from=2027-01-01&to=2028-02-04")).statusCode).toBe(200); // 400 days incl. leap day
    expect((await plan("from=2027-01-01&to=2028-02-05")).statusCode).toBe(400);
    expect((await plan("from=2028-02-29&to=2028-02-29")).statusCode).toBe(200);
    expect((await plan("from=2027-02-29&to=2027-03-01")).statusCode).toBe(400);
  });

  it("an empty family plans to an empty, well-formed response", async () => {
    const res = await plan("from=2026-09-01&to=2026-09-30");
    expect(res.statusCode).toBe(200);
    expect(res.json().plans).toEqual([]);
  });

  // T-API-3, fixed in S2a-01: a bad zone in the row used to make localToday() throw (500).
  // Now it falls back to America/Chicago.
  it("a family row with an invalid time_zone still plans (no 500)", async () => {
    await pool.query("UPDATE family SET time_zone = 'Mars/Olympus_Mons' WHERE id = $1", [fam.familyId]);
    try {
      const res = await plan("from=2026-09-01&to=2026-09-30");
      expect(res.statusCode).toBe(200);
      expect(res.json().asOf).toBe(localToday("America/Chicago", NOW));
    } finally {
      await pool.query("UPDATE family SET time_zone = 'America/Chicago' WHERE id = $1", [fam.familyId]);
    }
  });
});
