/** S14-01: parents have their own logins; a family can have several; every query stays scoped to the session's family. */
import { execFile } from "node:child_process";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { hashPassword, verifyPassword } from "../src/auth/password";
import { hashSessionToken } from "../src/auth/session";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { createFamily, sessionCookie } from "./helpers/family";

const PW = "parents-test-password";
const cliPath = path.resolve(__dirname, "../src/cli/set-parent-login.ts");
const tsx = path.resolve(__dirname, "../../../node_modules/.bin/tsx");
const runCli = (args: string[], stdin: string) => new Promise<{ code: number; out: string; err: string }>((resolve) => {
  const child = execFile(tsx, [cliPath, ...args], { env: { ...process.env, SESSION_SECRET: "test-secret-test-secret-test-secret-123", NODE_ENV: "test" } },
    (error, out, err) => resolve({ code: error ? (error.code as number) ?? 1 : 0, out, err }));
  child.stdin!.end(stdin);
});

describe.skipIf(!hasDb)("parent logins (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let famA = ""; let famB = ""; let secondParentId = "";
  let ip = 0; // the sign-in throttle is per address: each try comes from its own
  const login = (email: string, password = PW) => app.inject({ method: "POST", url: "/api/auth/login", remoteAddress: `10.14.1.${++ip}`, payload: { email, password } });
  const get = (url: string, cookie: string) => app.inject({ method: "GET", url, cookies: { hh_session: cookie } });
  beforeAll(async () => {
    famA = await createFamily(pool, "s14-01-a1@example.com", PW, "Family A");
    famB = await createFamily(pool, "s14-01-b1@example.com", PW, "Family B");
    await pool.query("DELETE FROM parent WHERE lower(email) = 's14-01-a2@example.com'");
    secondParentId = (await pool.query("INSERT INTO parent (family_id, name, email, password_hash) VALUES ($1, 'Second Parent', 'S14-01-A2@example.com', $2) RETURNING id", [famA, await hashPassword(PW)])).rows[0].id;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[famA, famB]]);
    await pool.end();
  });

  it("signs in by the parent's email (any case) and /api/me names the family and that parent", async () => {
    const res = await login("S14-01-A1@EXAMPLE.com");
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ familyId: famA, familyName: "Family A", parentName: "Test parent", role: "parent" });
    const me = await get("/api/me", sessionCookie(res)!);
    expect(me.json()).toMatchObject({ familyId: famA, name: "Family A", parentName: "Test parent", demo: false });
  });

  it("the session points at the parent, and the stored id is only the token's hash", async () => {
    const token = sessionCookie(await login("s14-01-a2@example.com"))!;
    const { rows } = await pool.query("SELECT family_id, parent_id FROM session WHERE id = $1", [hashSessionToken(token)]);
    expect(rows[0]).toEqual({ family_id: famA, parent_id: secondParentId });
    expect((await pool.query("SELECT 1 FROM session WHERE id = $1", [token])).rowCount).toBe(0);
  });

  it("two parents of one family sign in separately and see the same data", async () => {
    const one = sessionCookie(await login("s14-01-a1@example.com"))!;
    const two = sessionCookie(await login("s14-01-a2@example.com"))!;
    expect((await get("/api/me", two)).json().parentName).toBe("Second Parent");
    const made = await app.inject({ method: "POST", url: "/api/children", payload: { name: "Shared kid" }, cookies: { hh_session: one } });
    expect(made.statusCode).toBe(201);
    const seenByTwo = (await get("/api/children", two)).json().map((c: { id: string }) => c.id);
    expect(seenByTwo).toContain(made.json().id);
    // And the second parent's changes are the first parent's.
    await app.inject({ method: "PATCH", url: `/api/children/${made.json().id}`, payload: { name: "Renamed by two" }, cookies: { hh_session: two } });
    expect((await get("/api/children", one)).json().find((c: { id: string }) => c.id === made.json().id).name).toBe("Renamed by two");
  });

  it("a parent of one family never sees or changes another family's data", async () => {
    const a = sessionCookie(await login("s14-01-a2@example.com"))!;
    const b = sessionCookie(await login("s14-01-b1@example.com"))!;
    const bKid = (await app.inject({ method: "POST", url: "/api/children", payload: { name: "B kid" }, cookies: { hh_session: b } })).json().id;
    expect((await get("/api/children", a)).json().map((c: { id: string }) => c.id)).not.toContain(bKid);
    const patch = await app.inject({ method: "PATCH", url: `/api/children/${bKid}`, payload: { name: "Hijacked" }, cookies: { hh_session: a } });
    expect(patch.statusCode).toBe(404);
    expect((await get("/api/children", b)).json().find((c: { id: string }) => c.id === bKid).name).toBe("B kid");
    expect((await get("/api/me", a)).json().familyId).toBe(famA);
  });

  it("a wrong password and an unknown email get the same answer", async () => {
    const wrong = await login("s14-01-a1@example.com", "not-the-password");
    const unknown = await login("nobody-s14-01@example.com");
    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrong.json()).toEqual(unknown.json());
  });

  it("the database refuses a session that names a parent of another family", async () => {
    await expect(pool.query("INSERT INTO session (id, family_id, parent_id, expires_at) VALUES ('s14-01-x', $1, $2, now() + interval '1 day')", [famB, secondParentId]))
      .rejects.toMatchObject({ code: "23503" });
  });

  it("set-parent-login resets a parent's password by email and signs only that parent out", async () => {
    const one = sessionCookie(await login("s14-01-a1@example.com"))!;
    const two = sessionCookie(await login("s14-01-a2@example.com"))!;
    const r = await runCli(["S14-01-A2@example.com"], "a-brand-new-password\n");
    expect(r).toMatchObject({ code: 0, err: "" });
    expect(r.out).not.toContain("a-brand-new-password");
    expect((await get("/api/me", two)).statusCode).toBe(401);
    expect((await get("/api/me", one)).statusCode).toBe(200);
    expect((await login("s14-01-a2@example.com", PW)).statusCode).toBe(401);
    expect((await login("s14-01-a2@example.com", "a-brand-new-password")).statusCode).toBe(200);
    const { rows } = await pool.query("SELECT password_hash FROM parent WHERE id = $1", [secondParentId]);
    expect(await verifyPassword("a-brand-new-password", rows[0].password_hash)).toBe(true);
  }, 30000);

  it("set-parent-login rejects a short password, a bad email and an unknown parent", async () => {
    expect((await runCli(["s14-01-a2@example.com"], "short\n")).code).toBe(1);
    expect((await runCli(["not-an-email"], "a-good-password\n")).code).toBe(2);
    const r = await runCli(["nobody-s14-01@example.com"], "a-good-password\n");
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/No parent/);
  }, 30000);
});
