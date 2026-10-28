import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { hashSessionToken } from "../src/auth/session";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { createFamily, sessionCookie } from "./helpers/family";

const EMAIL = "login-test@example.com";
const PASSWORD = "login-test-password";

describe.skipIf(!hasDb)("POST /api/auth/login (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  let familyId = "";
  beforeAll(async () => {
    familyId = await createFamily(pool, EMAIL, PASSWORD, "Login family");
  });
  afterAll(async () => {
    await pool.query("DELETE FROM family WHERE id = $1", [familyId]);
    await pool.end();
  });
  const login = (app: ReturnType<typeof buildApp>, email: string, password: string) =>
    app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password } });

  it("correct credentials → 200, Set-Cookie, and a session row keyed by the token's hash", async () => {
    const app = buildApp(testConfig(), { db: pool });
    const res = await login(app, EMAIL, PASSWORD);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ familyId, familyName: "Login family" });
    const c = res.cookies.find((x) => x.name === "hh_session")!;
    expect(c).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/", maxAge: 30 * 24 * 3600 });
    expect(c.secure).toBeFalsy(); // only in production
    const token = c.value;
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const raw = await pool.query("SELECT 1 FROM session WHERE id = $1", [token]);
    expect(raw.rowCount).toBe(0);
    const { rows } = await pool.query("SELECT family_id, expires_at > now() + interval '29 days' AS long FROM session WHERE id = $1", [hashSessionToken(token)]);
    expect(rows).toEqual([{ family_id: familyId, long: true }]);
    await app.close();
  });

  it("wrong password and unknown email → 401 with the identical body", async () => {
    const app = buildApp(testConfig(), { db: pool });
    const wrong = await login(app, EMAIL, "nope-nope");
    const unknown = await login(app, "nobody-here@example.com", PASSWORD);
    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrong.json()).toEqual({ error: "invalid_credentials", message: expect.any(String) });
    expect(unknown.body).toBe(wrong.body);
    expect(sessionCookie(wrong)).toBeUndefined();
    await app.close();
  });

  it("matches the email case-insensitively", async () => {
    const app = buildApp(testConfig(), { db: pool });
    const res = await login(app, "  Login-TEST@Example.COM ", PASSWORD);
    expect(res.statusCode).toBe(200);
    expect(sessionCookie(res)).toBeTruthy();
    await app.close();
  });

  it("rejects a malformed body with 400", async () => {
    const app = buildApp(testConfig(), { db: pool });
    const res = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: EMAIL } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_request");
    await app.close();
  });

  it("sets Secure on the cookie in production", async () => {
    const app = buildApp(testConfig({ NODE_ENV: "production" }), { db: pool });
    const res = await login(app, EMAIL, PASSWORD);
    expect(res.cookies.find((x) => x.name === "hh_session")?.secure).toBe(true);
    await app.close();
  });

  it("11th attempt in a minute → 429", async () => {
    const app = buildApp(testConfig(), { db: pool });
    for (let i = 0; i < 10; i++) expect((await login(app, EMAIL, "wrong-" + i)).statusCode).toBe(401);
    const res = await login(app, EMAIL, PASSWORD);
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ error: "rate_limited" });
    await app.close();
  }, 20000);
});
