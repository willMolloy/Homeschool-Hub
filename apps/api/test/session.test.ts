import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { hashSessionToken } from "../src/auth/session";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { createFamily, sessionCookie } from "./helpers/family";

const EMAIL = "session-test@example.com";
const PASSWORD = "session-test-password";

describe.skipIf(!hasDb)("session check on protected routes (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let familyId = "";
  let token = "";
  beforeAll(async () => {
    app.get("/api/test-whoami", async (req) => ({ familyId: req.familyId }));
    familyId = await createFamily(pool, EMAIL, PASSWORD);
    const res = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: EMAIL, password: PASSWORD } });
    token = sessionCookie(res)!;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [familyId]);
    await pool.end();
  });
  const whoami = (cookie?: string) =>
    app.inject({ method: "GET", url: "/api/test-whoami", cookies: cookie ? { hh_session: cookie } : {} });

  it("no cookie → 401", async () => {
    const res = await whoami();
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "unauthenticated" });
  });

  it("garbage cookie → 401", async () => {
    expect((await whoami("garbage")).statusCode).toBe(401);
  });

  it("expired session → 401", async () => {
    const expired = "expired-token-for-test";
    await pool.query("INSERT INTO session (id, family_id, expires_at) VALUES ($1, $2, now() - interval '1 second')", [hashSessionToken(expired), familyId]);
    expect((await whoami(expired)).statusCode).toBe(401);
  });

  it("valid session → 200 and the handler sees the right familyId", async () => {
    const res = await whoami(token);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ familyId });
    expect(sessionCookie(res)).toBeUndefined(); // fresh session: no sliding refresh yet
  });

  it("slides the expiry at most once an hour", async () => {
    const id = hashSessionToken(token);
    await pool.query("UPDATE session SET last_seen_at = now() - interval '2 hours', expires_at = now() + interval '1 day' WHERE id = $1", [id]);
    const res = await whoami(token);
    expect(res.statusCode).toBe(200);
    expect(sessionCookie(res)).toBe(token);
    const { rows } = await pool.query("SELECT expires_at > now() + interval '29 days' AS slid, last_seen_at > now() - interval '1 minute' AS seen FROM session WHERE id = $1", [id]);
    expect(rows[0]).toEqual({ slid: true, seen: true });
  });

  it("health stays public", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
  });

  it("unknown /api routes still 404 (not 401)", async () => {
    expect((await app.inject({ method: "GET", url: "/api/nope" })).statusCode).toBe(404);
  });
});
