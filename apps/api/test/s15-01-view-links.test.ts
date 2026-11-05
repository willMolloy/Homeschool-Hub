/** S15-01: view-only sign-up links and viewer accounts, and one login in several accounts. */
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { DEMO_LOGIN_EMAIL } from "../src/auth/demo";
import { INVITE_UNAVAILABLE_MESSAGE } from "../src/services/invites";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { createFamily, sessionCookie } from "./helpers/family";
import { sessionFor, viewerOf } from "./helpers/members";

const PW = "view-links-password";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
type Cookies = { hh_session: string };

describe.skipIf(!hasDb)("view-only links and viewer accounts (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const lines: string[] = [];
  const app = hasDb ? buildApp(testConfig({ LOG_LEVEL: "info" }), { db: pool, logStream: { write: (l) => { lines.push(l); } } }) : null!;
  let coop = ""; let famB = ""; let famC = ""; let famD = ""; let famE = ""; let demoFam = "";
  let coopParent: Cookies; let bParent: Cookies; let demoParent: Cookies;
  let ip = 0;
  const addr = () => `10.15.${Math.floor(++ip / 250)}.${(ip % 250) + 1}`;
  const login = async (email: string, password = PW) => app.inject({ method: "POST", url: "/api/auth/login", remoteAddress: addr(), payload: { email, password } });
  const call = (method: "GET" | "POST" | "DELETE", url: string, cookies?: Cookies, payload?: object) =>
    app.inject({ method, url, cookies, remoteAddress: addr(), ...(payload ? { payload } : {}) });
  const makeLink = async (cookies: Cookies, label?: string) => (await call("POST", "/api/family/view-links", cookies, label === undefined ? {} : { label })).json() as { id: string; token: string; expiresAt: string };
  const join = (token: string, payload: object, cookies?: Cookies) => app.inject({ method: "POST", url: `/api/join/${token}`, remoteAddress: addr(), cookies, payload });
  const newPerson = (token: string, email: string, name = "Pat Viewer") => join(token, { name, email, password: PW });
  const clean = () => pool.query("DELETE FROM parent WHERE lower(email) LIKE 's15-01-%'").then(() => pool.query("DELETE FROM family WHERE name LIKE 'S15-01 %'"));

  beforeAll(async () => {
    await clean();
    await pool.query("DELETE FROM family WHERE id IN (SELECT family_id FROM parent WHERE lower(email) = $1)", [DEMO_LOGIN_EMAIL]);
    coop = await createFamily(pool, "s15-01-coop@example.com", PW, "S15-01 Co-op");
    famB = await createFamily(pool, "s15-01-b@example.com", PW, "S15-01 Family B");
    famC = await createFamily(pool, "s15-01-c@example.com", PW, "S15-01 Family C");
    famD = await createFamily(pool, "s15-01-d@example.com", PW, "S15-01 Family D");
    famE = await createFamily(pool, "s15-01-e@example.com", PW, "S15-01 Family E");
    demoFam = await createFamily(pool, DEMO_LOGIN_EMAIL, PW, "S15-01 Demo");
    await pool.query("UPDATE family SET setup_done = true WHERE id = ANY($1)", [[coop, famB, famC, famD, famE, demoFam]]);
    coopParent = { hh_session: sessionCookie(await login("s15-01-coop@example.com"))! };
    bParent = { hh_session: sessionCookie(await login("s15-01-b@example.com"))! };
    demoParent = { hh_session: sessionCookie(await login(DEMO_LOGIN_EMAIL))! };
  });
  afterAll(async () => {
    await clean();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[coop, famB, famC, famD, famE, demoFam]]);
    await app.close();
    await pool.end();
  });

  it("migration: every parent is a parent member of their own family", async () => {
    const m = await pool.query("SELECT role FROM family_member WHERE family_id = $1", [coop]);
    expect(m.rows).toEqual([{ role: "parent" }]);
  });

  describe("making and listing links (parents only)", () => {
    it("a parent makes a link: random token shown once, only its hash stored, a label, 7 days, role viewer", async () => {
      const res = await call("POST", "/api/family/view-links", coopParent, { label: "  Co-op  " });
      expect(res.statusCode).toBe(201);
      const { id, token, expiresAt } = res.json();
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const row = (await pool.query("SELECT * FROM invite WHERE id = $1", [id])).rows[0];
      expect(row.token_hash).toBe(sha(token));
      expect(row.role).toBe("viewer");
      expect(row.family_id).toBe(coop);
      expect(row.label).toBe("Co-op");
      expect(JSON.stringify(row)).not.toContain(token);
      const days = (new Date(expiresAt).getTime() - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(6.99); expect(days).toBeLessThan(7.01);
      const other = await makeLink(coopParent);
      expect(other.token).not.toBe(token);
    });

    it("the list shows links (label, dates) and viewers (name, email, joined), never a token", async () => {
      const link = await makeLink(coopParent, "Listed");
      const list = (await call("GET", "/api/family/viewers", coopParent)).json();
      const mine = list.links.find((l: { id: string }) => l.id === link.id);
      expect(mine).toEqual({ id: link.id, label: "Listed", createdAt: expect.any(String), expiresAt: expect.any(String) });
      expect(JSON.stringify(list)).not.toContain(link.token);
    });

    it("has no cap: twelve links at once", async () => {
      const made = await Promise.all(Array.from({ length: 12 }, () => call("POST", "/api/family/view-links", coopParent)));
      expect(made.every((r) => r.statusCode === 201)).toBe(true);
    });

    it("rejects a label that is too long, and the demo family can't make one", async () => {
      expect((await call("POST", "/api/family/view-links", coopParent, { label: "x".repeat(61) })).statusCode).toBe(400);
      expect((await call("POST", "/api/family/view-links", coopParent, { other: 1 })).statusCode).toBe(400);
      const res = await call("POST", "/api/family/view-links", demoParent);
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe("demo_read_only");
    });

    it("needs a session, and a viewer cannot make, list or cancel anything", async () => {
      expect((await call("POST", "/api/family/view-links")).statusCode).toBe(401);
      expect((await call("GET", "/api/family/viewers")).statusCode).toBe(401);
      const v = await viewerOf(pool, coop, "s15-01-v-denied@example.com");
      expect((await call("POST", "/api/family/view-links", v.cookies)).statusCode).toBe(403);
      expect((await call("GET", "/api/family/viewers", v.cookies)).statusCode).toBe(403);
      expect((await call("GET", "/api/family/parents", v.cookies)).statusCode).toBe(403);
      expect((await call("DELETE", `/api/family/viewers/${v.parentId}`, v.cookies)).statusCode).toBe(403);
    });

    it("cancel: the link then answers like any bad link; another family's id finds nothing and the link still works", async () => {
      const link = await makeLink(coopParent);
      expect((await call("DELETE", `/api/family/view-links/${link.id}`, bParent)).statusCode).toBe(404);
      expect((await call("GET", `/api/join/${link.token}`)).statusCode).toBe(200);
      expect((await call("DELETE", `/api/family/view-links/${link.id}`, coopParent)).statusCode).toBe(204);
      const gone = await call("GET", `/api/join/${link.token}`);
      expect(gone.statusCode).toBe(404);
      expect(gone.json().message).toBe(INVITE_UNAVAILABLE_MESSAGE);
      expect((await call("DELETE", `/api/family/view-links/${link.id}`, coopParent)).statusCode).toBe(404);
      expect((await call("DELETE", "/api/family/view-links/not-an-id", coopParent)).statusCode).toBe(404);
    });

    it("a parent invite id is not a view link: view-link cancel never cancels a parent invite, and parents' invite list never shows view links", async () => {
      const invite = (await call("POST", "/api/family/invites", coopParent)).json();
      expect((await call("DELETE", `/api/family/view-links/${invite.id}`, coopParent)).statusCode).toBe(404);
      const link = await makeLink(coopParent);
      const parents = (await call("GET", "/api/family/parents", coopParent)).json();
      expect(parents.invites.map((i: { id: string }) => i.id)).toContain(invite.id);
      expect(parents.invites.map((i: { id: string }) => i.id)).not.toContain(link.id);
      expect((await call("DELETE", `/api/family/invites/${link.id}`, coopParent)).statusCode).toBe(404);
    });
  });

  describe("joining as a new person", () => {
    it("what the link is for: a viewer link of the co-op", async () => {
      const link = await makeLink(coopParent);
      expect((await call("GET", `/api/join/${link.token}`)).json()).toEqual({ kind: "viewer", familyName: "S15-01 Co-op" });
    });

    it("makes a viewer: no home family, a viewer membership, a session in the co-op, the link used up", async () => {
      const link = await makeLink(coopParent);
      const res = await newPerson(link.token, "S15-01-New@Example.com", "Nora New");
      expect(res.statusCode).toBe(201);
      expect(res.json()).toEqual({ familyId: coop, familyName: "S15-01 Co-op", parentName: "Nora New", kind: "viewer", role: "viewer" });
      const p = (await pool.query("SELECT id, family_id, password_hash FROM parent WHERE lower(email) = 's15-01-new@example.com'")).rows[0];
      expect(p.family_id).toBeNull();
      expect(p.password_hash).not.toContain(PW);
      expect((await pool.query("SELECT role FROM family_member WHERE family_id = $1 AND parent_id = $2", [coop, p.id])).rows).toEqual([{ role: "viewer" }]);
      const cookies = { hh_session: sessionCookie(res)! };
      const me = (await call("GET", "/api/me", cookies)).json();
      expect(me).toMatchObject({ familyId: coop, role: "viewer", parentName: "Nora New", setupDone: true });
      expect(JSON.stringify(me)).not.toContain("@");
      expect((await pool.query("SELECT used_at FROM invite WHERE id = $1", [link.id])).rows[0].used_at).not.toBeNull();
    });

    it("single use: the second try gets the plain message, the same bytes as an unknown link", async () => {
      const link = await makeLink(coopParent);
      expect((await newPerson(link.token, "s15-01-once@example.com")).statusCode).toBe(201);
      const again = await newPerson(link.token, "s15-01-once2@example.com");
      const unknown = await newPerson("z".repeat(43), "s15-01-once3@example.com");
      const malformed = await newPerson("short", "s15-01-once4@example.com");
      expect(again.statusCode).toBe(404);
      expect(again.json().message).toBe(INVITE_UNAVAILABLE_MESSAGE);
      expect(again.body).toBe(unknown.body);
      expect(again.body).toBe(malformed.body);
      expect((await pool.query("SELECT 1 FROM parent WHERE lower(email) LIKE 's15-01-once%@example.com'")).rowCount).toBe(1);
    });

    it("an unused link expires after 7 days with the same message", async () => {
      const link = await makeLink(coopParent);
      await pool.query("UPDATE invite SET created_at = now() - interval '8 days', expires_at = now() - interval '1 day' WHERE id = $1", [link.id]);
      const res = await newPerson(link.token, "s15-01-late@example.com");
      expect(res.statusCode).toBe(404);
      expect(res.body).toBe((await newPerson("y".repeat(43), "s15-01-late2@example.com")).body);
      expect((await call("GET", `/api/join/${link.token}`)).statusCode).toBe(404);
    });

    it("a taken email is refused without using up the link", async () => {
      const link = await makeLink(coopParent);
      const res = await newPerson(link.token, "s15-01-b@example.com");
      expect(res.statusCode).toBe(409);
      expect((await call("GET", `/api/join/${link.token}`)).statusCode).toBe(200);
    });

    it("is throttled per address, and a link guess counts", async () => {
      const link = await makeLink(coopParent);
      const results = [];
      for (let i = 0; i < 12; i++) results.push((await app.inject({ method: "POST", url: `/api/join/${link.token}`, remoteAddress: "10.15.250.250", payload: { name: "x", email: "bad", password: "x" } })).statusCode);
      expect(results.slice(0, 10).every((c) => c === 400)).toBe(true);
      expect(results[11]).toBe(429);
    });

    it("never logs the token or the password", async () => {
      lines.length = 0;
      const link = await makeLink(coopParent);
      await newPerson(link.token, "s15-01-logs@example.com");
      await call("GET", `/api/join/${link.token}`);
      const all = lines.join("\n");
      expect(all).toContain("/join/[redacted]");
      expect(all).not.toContain(link.token);
      expect(all).not.toContain(PW);
    });
  });

  describe("one login in several accounts", () => {
    it("someone who already has a login joins by signing in: a viewer membership beside their own family", async () => {
      const link = await makeLink(coopParent);
      const bad = await join(link.token, { existing: true, email: "s15-01-b@example.com", password: "wrong-password-here" });
      expect(bad.statusCode).toBe(401);
      expect((await call("GET", `/api/join/${link.token}`)).statusCode).toBe(200); // a wrong password does not burn the link
      const res = await join(link.token, { existing: true, email: "S15-01-B@example.com", password: PW });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ familyId: coop, kind: "viewer", role: "viewer" });
      const cookies = { hh_session: sessionCookie(res)! };
      const me = (await call("GET", "/api/me", cookies)).json();
      expect(me.role).toBe("viewer");
      expect(me.accounts.map((a: { familyId: string; role: string; current: boolean }) => [a.familyId, a.role, a.current]).sort()).toEqual(
        [[coop, "viewer", true], [famB, "parent", false]].sort());
      // The link is used: nobody else can use it.
      expect((await join(link.token, { existing: true, email: "s15-01-c@example.com", password: PW })).statusCode).toBe(404);
    });

    it("an existing login with a bad link gets the plain message before any password is checked", async () => {
      const res = await join("q".repeat(43), { existing: true, email: "s15-01-b@example.com", password: "wrong-password-here" });
      expect(res.statusCode).toBe(404);
      expect(res.json().message).toBe(INVITE_UNAVAILABLE_MESSAGE);
    });

    it("signing in opens the account used last; switching re-checks membership", async () => {
      // B (a parent of Family B) is a viewer of the co-op since the last test, which opened it: so a new sign-in opens the co-op.
      const si = await login("s15-01-b@example.com");
      expect(si.json()).toMatchObject({ familyId: coop, role: "viewer", familyName: "S15-01 Co-op", parentName: "Test parent" });
      const cookies = { hh_session: sessionCookie(si)! };
      // Switch to their own family.
      const sw = await call("POST", "/api/auth/switch", cookies, { familyId: famB });
      expect(sw.statusCode).toBe(200);
      expect(sw.json()).toEqual({ familyId: famB, familyName: "S15-01 Family B", role: "parent" });
      expect((await call("GET", "/api/me", cookies)).json()).toMatchObject({ familyId: famB, role: "parent" });
      // A new sign-in now opens Family B (used last).
      expect((await login("s15-01-b@example.com")).json()).toMatchObject({ familyId: famB, role: "parent" });
      // Back to the co-op: viewer rules again.
      expect((await call("POST", "/api/auth/switch", cookies, { familyId: coop })).json().role).toBe("viewer");
      expect((await call("POST", "/api/family/view-links", cookies)).statusCode).toBe(403);
    });

    it("a person can never reach an account they don't belong to: the same answer for another family and for one that doesn't exist", async () => {
      const cookies = { hh_session: sessionCookie(await login("s15-01-b@example.com"))! };
      const other = await call("POST", "/api/auth/switch", cookies, { familyId: famC });
      const none = await call("POST", "/api/auth/switch", cookies, { familyId: "00000000-0000-4000-8000-000000000000" });
      const junk = await call("POST", "/api/auth/switch", cookies, { familyId: "nope" });
      expect(other.statusCode).toBe(404);
      expect(other.body).toBe(none.body);
      expect(other.body).toBe(junk.body);
      // Nothing moved.
      expect((await call("GET", "/api/me", cookies)).json().familyId).not.toBe(famC);
      expect((await call("POST", "/api/auth/switch", undefined, { familyId: famB })).statusCode).toBe(401);
    });

    it("the account list holds only the person's own accounts", async () => {
      const cookies = { hh_session: sessionCookie(await login("s15-01-c@example.com"))! };
      const me = (await call("GET", "/api/me", cookies)).json();
      expect(me.accounts).toEqual([{ familyId: famC, familyName: "S15-01 Family C", role: "parent", current: true }]);
    });

    it("joining while signed in adds the account to the same login and opens it", async () => {
      const link = await makeLink(coopParent);
      const cookies = { hh_session: sessionCookie(await login("s15-01-c@example.com"))! };
      const res = await join(link.token, { useSession: true }, cookies);
      expect(res.statusCode).toBe(201);
      expect(res.headers["set-cookie"]).toBeUndefined(); // the same session, moved
      const me = (await call("GET", "/api/me", cookies)).json();
      expect(me).toMatchObject({ familyId: coop, role: "viewer" });
      expect(me.accounts).toHaveLength(2);
      expect((await join((await makeLink(coopParent)).token, { useSession: true })).statusCode).toBe(401);
    });

    it("someone who already has access (as a parent or a viewer) is told so and the link is not used up", async () => {
      const link = await makeLink(coopParent);
      const res = await join(link.token, { existing: true, email: "s15-01-coop@example.com", password: PW });
      expect(res.statusCode).toBe(409);
      expect(res.json().error).toBe("already_member");
      expect((await call("GET", `/api/join/${link.token}`)).statusCode).toBe(200);
    });

    it("a parent-invite link can't be redeemed by an existing login", async () => {
      const invite = (await call("POST", "/api/family/invites", coopParent)).json();
      const res = await join(invite.token, { existing: true, email: "s15-01-b@example.com", password: PW });
      expect(res.statusCode).toBe(404);
      expect(res.json().message).toBe(INVITE_UNAVAILABLE_MESSAGE);
      expect((await call("GET", `/api/join/${invite.token}`)).statusCode).toBe(200);
    });
  });

  describe("removing and leaving", () => {
    it("removing a viewer ends their access at the next request, in that family only", async () => {
      const link = await makeLink(coopParent);
      const joined = await join(link.token, { existing: true, email: "s15-01-d@example.com", password: PW });
      const cookies = { hh_session: sessionCookie(joined)! };
      expect((await call("GET", "/api/me", cookies)).statusCode).toBe(200);
      const list = (await call("GET", "/api/family/viewers", coopParent)).json();
      const mine = list.viewers.find((v: { email: string }) => v.email === "s15-01-d@example.com");
      expect(mine).toMatchObject({ name: "Test parent", email: "s15-01-d@example.com", joinedAt: expect.any(String) });
      // Another family's parent can't remove them.
      expect((await call("DELETE", `/api/family/viewers/${mine.id}`, bParent)).statusCode).toBe(404);
      expect((await call("GET", "/api/me", cookies)).statusCode).toBe(200);
      expect((await call("DELETE", `/api/family/viewers/${mine.id}`, coopParent)).statusCode).toBe(204);
      expect((await call("GET", "/api/me", cookies)).statusCode).toBe(401);
      expect((await call("GET", "/api/schedule-anything", cookies)).statusCode).not.toBe(200);
      // Their own family is untouched, and they can sign in to it.
      expect((await login("s15-01-d@example.com")).json()).toMatchObject({ familyId: famD, role: "parent" });
      // A parent member can't be removed this way.
      const parentId = (await pool.query("SELECT id FROM parent WHERE lower(email) = 's15-01-coop@example.com'")).rows[0].id;
      expect((await call("DELETE", `/api/family/viewers/${parentId}`, coopParent)).statusCode).toBe(404);
    });

    it("a viewer with no other account leaves no login behind when removed, and the email can sign up again", async () => {
      const link = await makeLink(coopParent);
      const res = await newPerson(link.token, "s15-01-orphan@example.com");
      const id = (await pool.query("SELECT id FROM parent WHERE lower(email) = 's15-01-orphan@example.com'")).rows[0].id;
      expect((await call("DELETE", `/api/family/viewers/${id}`, coopParent)).statusCode).toBe(204);
      expect((await call("GET", "/api/me", { hh_session: sessionCookie(res)! })).statusCode).toBe(401);
      expect((await pool.query("SELECT 1 FROM parent WHERE id = $1", [id])).rowCount).toBe(0);
      expect((await login("s15-01-orphan@example.com")).statusCode).toBe(401);
      expect((await newPerson((await makeLink(coopParent)).token, "s15-01-orphan@example.com")).statusCode).toBe(201);
    });

    it("a viewer can leave: this device stays signed in to their other account", async () => {
      const link = await makeLink(coopParent);
      const joined = await join(link.token, { existing: true, email: "s15-01-e@example.com", password: PW });
      const cookies = { hh_session: sessionCookie(joined)! };
      const left = await call("POST", "/api/auth/leave", cookies);
      expect(left.statusCode).toBe(200);
      expect(left.json().next).toMatchObject({ familyId: famE, role: "parent" });
      expect((await call("GET", "/api/me", cookies)).json()).toMatchObject({ familyId: famE, role: "parent" });
      expect((await pool.query("SELECT 1 FROM family_member WHERE family_id = $1 AND parent_id = (SELECT id FROM parent WHERE lower(email) = 's15-01-e@example.com')", [coop])).rowCount).toBe(0);
    });

    it("a viewer with nothing else who leaves is signed out; a parent can't 'leave'", async () => {
      const v = await viewerOf(pool, coop, "s15-01-leaver@example.com");
      const left = await call("POST", "/api/auth/leave", v.cookies);
      expect(left.statusCode).toBe(200);
      expect(left.json().next).toBeNull();
      expect((await call("GET", "/api/me", v.cookies)).statusCode).toBe(401);
      expect((await call("POST", "/api/auth/leave", coopParent)).statusCode).toBe(403);
      expect((await pool.query("SELECT 1 FROM family_member WHERE family_id = $1 AND role = 'parent'", [coop])).rowCount).toBe(1);
    });

    it("a session can't name an account its person doesn't belong to (database)", async () => {
      const p = (await pool.query("SELECT id FROM parent WHERE lower(email) = 's15-01-b@example.com'")).rows[0].id;
      await expect(sessionFor(pool, famC, p)).rejects.toMatchObject({ code: "23503" });
    });
  });
});
