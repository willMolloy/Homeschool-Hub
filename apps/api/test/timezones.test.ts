import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { canonicalTimeZone, isIanaTimeZone, timeZoneList } from "../src/http/timeZone";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { signedInFamily } from "./helpers/session";

// S2a-17: the server serves the zone list and stores one canonical spelling (tester T2-2, T2-3).
describe("canonicalTimeZone", () => {
  it.each([
    ["America/Chicago", "America/Chicago"],
    ["AMERICA/CHICAGO", "America/Chicago"],
    ["america/chicago", "America/Chicago"],
    ["US/Central", "America/Chicago"],
    ["us/central", "America/Chicago"],
    ["Asia/Kolkata", "Asia/Kolkata"],
    ["Asia/Calcutta", "Asia/Kolkata"],
    ["Europe/Kyiv", "Europe/Kyiv"],
    ["Europe/Kiev", "Europe/Kyiv"],
    ["America/Argentina/Buenos_Aires", "America/Argentina/Buenos_Aires"],
    ["America/Buenos_Aires", "America/Argentina/Buenos_Aires"],
    ["UTC", "UTC"],
    ["utc", "UTC"],
    ["Etc/UTC", "UTC"],
    ["Etc/GMT-14", "Etc/GMT-14"],
    ["Etc/GMT+5", "Etc/GMT+5"],
  ])("%s → %s", (input, out) => {
    expect(canonicalTimeZone(input)).toBe(out);
  });
  it.each(["EST", "GMT", "Zulu", "CST6CDT", "+05:00", "UTC+5", "Etc/GMT+15", "Mars/Olympus_Mons", "", " America/Chicago", "America/Chicago\u0000", "Chicago", 5, null, undefined])(
    "rejects %j", (z) => {
      expect(canonicalTimeZone(z)).toBeNull();
      expect(isIanaTimeZone(z)).toBe(false);
    });
});

describe("timeZoneList", () => {
  const list = timeZoneList();
  it("is sorted, unique, and uses current IANA names", () => {
    expect(list).toEqual([...new Set(list)].sort());
    for (const z of ["UTC", "America/Chicago", "Asia/Kolkata", "Europe/Kyiv", "America/Argentina/Buenos_Aires", "Asia/Kathmandu"]) expect(list).toContain(z);
    for (const z of ["Asia/Calcutta", "Europe/Kiev", "America/Buenos_Aires", "Asia/Katmandu", "US/Central"]) expect(list).not.toContain(z);
    expect(list.length).toBeGreaterThan(300);
  });
  it("every entry is already canonical (round-trips unchanged)", () => {
    expect(list.filter((z) => canonicalTimeZone(z) !== z)).toEqual([]);
  });
});

describe.skipIf(!hasDb)("GET /api/timezones and canonical storage (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let f: Awaited<ReturnType<typeof signedInFamily>>;
  beforeAll(async () => { f = await signedInFamily(pool, "TZ list family"); });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [f.familyId]);
    await pool.end();
  });
  const setTz = (timeZone: unknown) => app.inject({ method: "PATCH", url: "/api/family", payload: { timeZone }, cookies: f.cookies });

  it("GET → 200 { zones } with the server's list", async () => {
    const res = await app.inject({ method: "GET", url: "/api/timezones", cookies: f.cookies });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ zones: timeZoneList() });
  });

  it("signed out → 401", async () => {
    expect((await app.inject({ method: "GET", url: "/api/timezones" })).statusCode).toBe(401);
  });

  it("aliases and other casings are stored canonically; /api/me agrees", async () => {
    for (const [sent, stored] of [["AMERICA/CHICAGO", "America/Chicago"], ["america/new_york", "America/New_York"], ["US/Pacific", "America/Los_Angeles"], ["Asia/Calcutta", "Asia/Kolkata"], ["Europe/Kiev", "Europe/Kyiv"]]) {
      const res = await setTz(sent);
      expect(res.statusCode, sent).toBe(200);
      expect(res.json().timeZone, sent).toBe(stored);
      expect((await app.inject({ method: "GET", url: "/api/me", cookies: f.cookies })).json().timeZone).toBe(stored);
      const { rows } = await pool.query("SELECT time_zone FROM family WHERE id = $1", [f.familyId]);
      expect(rows[0].time_zone).toBe(stored);
    }
  });

  it("every listed zone is accepted and stored unchanged", async () => {
    const zones: string[] = (await app.inject({ method: "GET", url: "/api/timezones", cookies: f.cookies })).json().zones;
    for (const z of zones) {
      const res = await setTz(z);
      expect(res.statusCode, z).toBe(200);
      expect(res.json().timeZone).toBe(z);
    }
  });
});
