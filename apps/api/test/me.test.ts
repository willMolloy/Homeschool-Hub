import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { sessionCookie } from "./helpers/family";
import { seedFamily } from "./helpers/seed";

describe.skipIf(!hasDb)("GET /api/me (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const NOW = new Date("2026-11-02T10:30:00Z");
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => NOW }) : null!;
  let familyId = "";
  let token = "";
  beforeAll(async () => {
    const s = await seedFamily("me-test@example.com");
    familyId = s.familyId;
    token = sessionCookie(await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: s.email, password: s.password } }))!;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [familyId]);
    await pool.end();
  });

  it("signed in → the seeded family, camelCase", async () => {
    const res = await app.inject({ method: "GET", url: "/api/me", cookies: { hh_session: token } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ familyId, name: "Demo family", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", today: "2026-11-02" });
  });

  it("today follows the family's zone at the injected instant (2026-11-02T10:30Z)", async () => {
    const meIn = async (tz: string) => {
      await pool.query("UPDATE family SET time_zone = $2 WHERE id = $1", [familyId, tz]);
      const res = await app.inject({ method: "GET", url: "/api/me", cookies: { hh_session: token } });
      expect(res.statusCode).toBe(200);
      return res.json().today;
    };
    try {
      expect(await meIn("America/Chicago")).toBe("2026-11-02");
      expect(await meIn("Pacific/Kiritimati")).toBe("2026-11-03");
      expect(await meIn("Pacific/Pago_Pago")).toBe("2026-11-01");
      // a bad stored zone falls back to the default (America/Chicago) instead of a 500
      expect(await meIn("Mars/Olympus_Mons")).toBe("2026-11-02");
    } finally {
      await pool.query("UPDATE family SET time_zone = 'America/Chicago' WHERE id = $1", [familyId]);
    }
  });

  it("signed out → 401", async () => {
    const res = await app.inject({ method: "GET", url: "/api/me" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "unauthenticated" });
  });
});
