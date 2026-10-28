import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { sessionCookie } from "./helpers/family";
import { seedFamily } from "./helpers/seed";

describe.skipIf(!hasDb)("GET /api/me (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
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
    expect(res.json()).toEqual({ familyId, name: "Demo family", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago" });
  });

  it("signed out → 401", async () => {
    const res = await app.inject({ method: "GET", url: "/api/me" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "unauthenticated" });
  });
});
