/** S14-03: inviting another parent from Family settings. Everything is scoped to the session's family, invites included. */
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { DEMO_LOGIN_EMAIL } from "../src/auth/demo";
import { INVITE_UNAVAILABLE_MESSAGE } from "../src/services/invites";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { createFamily, sessionCookie } from "./helpers/family";

const PW = "parent-invites-password";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

describe.skipIf(!hasDb)("invite another parent (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let famA = ""; let famB = ""; let demoFam = "";
  let a: { hh_session: string }; let b: { hh_session: string }; let demo: { hh_session: string };
  const made: string[] = [];
  let ip = 0;
  const login = async (email: string) => ({ hh_session: sessionCookie(await app.inject({ method: "POST", url: "/api/auth/login", remoteAddress: `10.14.4.${++ip}`, payload: { email, password: PW } }))! });
  const call = (method: "GET" | "POST" | "DELETE", url: string, cookies?: { hh_session: string }, payload?: object) =>
    app.inject({ method, url, cookies, remoteAddress: `10.14.5.${++ip}`, ...(payload ? { payload } : {}) });
  const join = (token: string, email: string) => app.inject({ method: "POST", url: `/api/join/${token}`, remoteAddress: `10.14.6.${++ip}`, payload: { name: "Pat Second", email, password: PW } });
  const clean = () => pool.query("DELETE FROM family WHERE id IN (SELECT family_id FROM parent WHERE lower(email) LIKE 's14-03-%')");
  beforeAll(async () => {
    await clean();
    await pool.query("DELETE FROM family WHERE id IN (SELECT family_id FROM parent WHERE lower(email) = $1)", [DEMO_LOGIN_EMAIL]);
    famA = await createFamily(pool, "s14-03-a@example.com", PW, "Family A");
    famB = await createFamily(pool, "s14-03-b@example.com", PW, "Family B");
    demoFam = await createFamily(pool, DEMO_LOGIN_EMAIL, PW, "Demo");
    await pool.query("UPDATE family SET setup_done = true WHERE id = ANY($1)", [[famA, famB]]);
    a = await login("s14-03-a@example.com"); b = await login("s14-03-b@example.com"); demo = await login(DEMO_LOGIN_EMAIL);
  });
  afterAll(async () => {
    await clean();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[famA, famB, demoFam, ...made]]);
    await app.close();
    await pool.end();
  });

  it("needs a session", async () => {
    expect((await call("GET", "/api/family/parents")).statusCode).toBe(401);
    expect((await call("POST", "/api/family/invites")).statusCode).toBe(401);
    expect((await call("DELETE", "/api/family/invites/00000000-0000-4000-8000-000000000000")).statusCode).toBe(401);
  });

  it("lists the family's parents by name (marking you) and its open invites, never a link or an email", async () => {
    const res = await call("GET", "/api/family/parents", a);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ parents: [{ id: expect.any(String), name: "Test parent", you: true }], invites: [] });
    expect(res.body).not.toContain("@");
  });

  it("makes a link for THIS family: single use, 7 days, only its hash stored", async () => {
    const res = await call("POST", "/api/family/invites", a);
    expect(res.statusCode).toBe(201);
    const { id, token, expiresAt } = res.json();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const row = (await pool.query("SELECT * FROM invite WHERE id = $1", [id])).rows[0];
    expect(row.family_id).toBe(famA);
    expect(row.token_hash).toBe(sha(token));
    expect(JSON.stringify(row)).not.toContain(token);
    expect(row.created_by).toBeTruthy();
    expect((new Date(expiresAt).getTime() - Date.now()) / 86400000).toBeGreaterThan(6.99);
    const list = (await call("GET", "/api/family/parents", a)).json();
    expect(list.invites).toEqual([{ id, createdAt: expect.any(String), expiresAt }]);
    expect(JSON.stringify(list)).not.toContain(token);
    // The other family sees none of it.
    expect((await call("GET", "/api/family/parents", b)).json().invites).toEqual([]);
    await call("DELETE", `/api/family/invites/${id}`, a);
  });

  it("parent 1 invites parent 2; parent 2 joins, sees the same family, no setup flow; the link can't be used twice", async () => {
    const { token } = (await call("POST", "/api/family/invites", a)).json();
    expect((await app.inject({ method: "GET", url: `/api/join/${token}`, remoteAddress: `10.14.6.${++ip}` })).json()).toEqual({ kind: "parent", familyName: "Family A" });
    const kid = (await call("POST", "/api/children", a, { name: "Shared kid" })).json();
    const res = await join(token, "s14-03-second@example.com");
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ familyId: famA, familyName: "Family A", parentName: "Pat Second", kind: "parent" });
    const two = { hh_session: sessionCookie(res)! };
    const me = (await call("GET", "/api/me", two)).json();
    expect(me).toMatchObject({ familyId: famA, name: "Family A", parentName: "Pat Second", setupDone: true });
    expect((await call("GET", "/api/children", two)).json().map((c: { id: string }) => c.id)).toContain(kid.id);
    // Both parents are listed, each seeing themselves as "you"; the used invite is gone from the open list.
    const listOne = (await call("GET", "/api/family/parents", a)).json();
    expect(listOne.parents.map((p: { name: string; you: boolean }) => [p.name, p.you])).toEqual([["Test parent", true], ["Pat Second", false]]);
    expect(listOne.invites).toEqual([]);
    expect((await call("GET", "/api/family/parents", two)).json().parents.find((p: { you: boolean }) => p.you).name).toBe("Pat Second");
    // The second parent can sign in on their own, and the link is spent.
    expect((await login("s14-03-second@example.com")).hh_session).toBeTruthy();
    const again = await join(token, "s14-03-third@example.com");
    expect(again.statusCode).toBe(404);
    expect(again.json().message).toBe(INVITE_UNAVAILABLE_MESSAGE);
  });

  it("the new parent is in family A only: no way into family B", async () => {
    const two = await login("s14-03-second@example.com");
    const bKid = (await call("POST", "/api/children", b, { name: "B kid" })).json();
    expect((await call("GET", "/api/children", two)).json().map((c: { id: string }) => c.id)).not.toContain(bKid.id);
    expect((await call("PATCH" as never, `/api/children/${bKid.id}`, two, { name: "Hijack" })).statusCode).toBe(404);
    expect((await call("GET", "/api/family/parents", b)).json().parents).toHaveLength(1);
  });

  it("cancelling an invite makes its link fail with the plain message", async () => {
    const { id, token } = (await call("POST", "/api/family/invites", a)).json();
    expect((await call("DELETE", `/api/family/invites/${id}`, a)).statusCode).toBe(204);
    expect((await call("GET", "/api/family/parents", a)).json().invites).toEqual([]);
    const res = await join(token, "s14-03-cancelled@example.com");
    expect(res.statusCode).toBe(404);
    expect(res.json().message).toBe(INVITE_UNAVAILABLE_MESSAGE);
    // Cancelling again finds nothing.
    expect((await call("DELETE", `/api/family/invites/${id}`, a)).statusCode).toBe(404);
  });

  it("another family can neither see nor cancel this family's invite", async () => {
    const { id, token } = (await call("POST", "/api/family/invites", a)).json();
    const del = await call("DELETE", `/api/family/invites/${id}`, b);
    expect(del.statusCode).toBe(404);
    expect((await call("DELETE", "/api/family/invites/not-a-uuid", b)).statusCode).toBe(404);
    expect((await pool.query("SELECT revoked_at FROM invite WHERE id = $1", [id])).rows[0].revoked_at).toBeNull();
    expect((await call("GET", "/api/family/parents", b)).json().invites).toEqual([]);
    // Still usable by its real family.
    const res = await join(token, "s14-03-stillworks@example.com");
    expect(res.statusCode).toBe(201);
    expect(res.json().familyId).toBe(famA);
  });

  it("a signed-in parent of family B who opens family A's link joins A, and gains nothing in B", async () => {
    const { token } = (await call("POST", "/api/family/invites", a)).json();
    const res = await join(token, "s14-03-crossover@example.com");
    expect(res.json().familyId).toBe(famA);
    expect((await pool.query("SELECT count(*)::int AS n FROM parent WHERE family_id = $1", [famB])).rows[0].n).toBe(1);
  });

  it("a family holds at most five open invites", async () => {
    const c = await createFamily(pool, "s14-03-cap@example.com", PW, "Cap family");
    made.push(c);
    const cap = await login("s14-03-cap@example.com");
    for (let i = 0; i < 5; i++) expect((await call("POST", "/api/family/invites", cap)).statusCode).toBe(201);
    const res = await call("POST", "/api/family/invites", cap);
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("too_many_invites");
  });

  it("the demo family can't invite", async () => {
    const res = await call("POST", "/api/family/invites", demo);
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("demo_read_only");
  });
});
