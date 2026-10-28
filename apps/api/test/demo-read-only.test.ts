// Hand-test fixes: the demo family can look around but can't add events (UI hides the button; the API enforces it).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { DEMO_LOGIN_EMAIL, isDemoLogin } from "../src/auth/demo";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe("isDemoLogin", () => {
  it("matches the demo login only, ignoring case and spaces", () => {
    expect(isDemoLogin(DEMO_LOGIN_EMAIL)).toBe(true);
    expect(isDemoLogin("  Demo@Example.COM ")).toBe(true);
    expect(isDemoLogin("demo@example.org")).toBe(false);
    expect(isDemoLogin("parent@example.com")).toBe(false);
    expect(isDemoLogin(null)).toBe(false);
    expect(isDemoLogin(undefined)).toBe(false);
  });
});

describe.skipIf(!hasDb)("demo family is read-only for events (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let demo: Awaited<ReturnType<typeof signedInFamily>>;
  let other: Awaited<ReturnType<typeof signedInFamily>>;
  beforeAll(async () => {
    // Another run may have left a demo-login family behind; the login is unique, so clear it first.
    await pool.query("DELETE FROM family WHERE lower(login_email) = lower($1)", [DEMO_LOGIN_EMAIL]);
    demo = await signedInFamily(pool, "Demo read-only");
    await pool.query("UPDATE family SET login_email = $2 WHERE id = $1", [demo.familyId, DEMO_LOGIN_EMAIL]);
    other = await signedInFamily(pool, "Not the demo");
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[demo.familyId, other.familyId]]);
    await pool.end();
  });

  it("GET /api/me says demo: true for the demo and false otherwise", async () => {
    expect((await inject(app, demo.cookies)("GET", "/api/me")).json().demo).toBe(true);
    expect((await inject(app, other.cookies)("GET", "/api/me")).json().demo).toBe(false);
  });

  it("POST /api/events → 403 demo_read_only and nothing is saved", async () => {
    const res = await inject(app, demo.cookies)("POST", "/api/events", { name: "Co-op", weekdays: [3] });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: "demo_read_only", message: "The demo family can't add events." });
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM event WHERE family_id = $1", [demo.familyId]);
    expect(rows[0].n).toBe(0);
  });

  it("other families still add events", async () => {
    const res = await inject(app, other.cookies)("POST", "/api/events", { name: "Co-op", weekdays: [3] });
    expect(res.statusCode).toBe(201);
  });
});
