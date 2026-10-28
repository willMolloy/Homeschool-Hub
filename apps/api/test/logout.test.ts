import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { hashSessionToken } from "../src/auth/session";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { createFamily, sessionCookie } from "./helpers/family";

const EMAIL = "logout-test@example.com";
const PASSWORD = "logout-test-password";

describe.skipIf(!hasDb)("POST /api/auth/logout (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let familyId = "";
  beforeAll(async () => {
    app.get("/api/test-whoami", async (req) => ({ familyId: req.familyId }));
    familyId = await createFamily(pool, EMAIL, PASSWORD);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [familyId]);
    await pool.end();
  });

  it("with a valid session → 204, row deleted, cookie cleared, old cookie now 401", async () => {
    const login = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: EMAIL, password: PASSWORD } });
    const token = sessionCookie(login)!;
    expect((await app.inject({ method: "GET", url: "/api/test-whoami", cookies: { hh_session: token } })).statusCode).toBe(200);

    const res = await app.inject({ method: "POST", url: "/api/auth/logout", cookies: { hh_session: token } });
    expect(res.statusCode).toBe(204);
    expect(res.body).toBe("");
    const cleared = res.cookies.find((c) => c.name === "hh_session");
    expect(cleared?.value).toBe("");
    expect(cleared?.path).toBe("/");
    expect((await pool.query("SELECT 1 FROM session WHERE id = $1", [hashSessionToken(token)])).rowCount).toBe(0);
    expect((await app.inject({ method: "GET", url: "/api/test-whoami", cookies: { hh_session: token } })).statusCode).toBe(401);
  });

  it("without a cookie (or with a dead one) → 204", async () => {
    expect((await app.inject({ method: "POST", url: "/api/auth/logout" })).statusCode).toBe(204);
    expect((await app.inject({ method: "POST", url: "/api/auth/logout", cookies: { hh_session: "gone" } })).statusCode).toBe(204);
  });
});
