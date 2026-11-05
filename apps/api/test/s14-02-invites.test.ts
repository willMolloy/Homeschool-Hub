/** S14-02: family invites made with the command, and the join page's API. */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { INVITE_UNAVAILABLE_MESSAGE, createInvite } from "../src/services/invites";
import { redactInviteUrl } from "../src/http/logging";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { createFamily, sessionCookie } from "./helpers/family";

const cliPath = path.resolve(__dirname, "../src/cli/create-family-invite.ts");
const tsx = path.resolve(__dirname, "../../../node_modules/.bin/tsx");
const runCli = (args: string[], env: Record<string, string> = {}) => new Promise<{ code: number; out: string; err: string }>((resolve) => {
  execFile(tsx, [cliPath, ...args], { env: { ...process.env, SESSION_SECRET: "test-secret-test-secret-test-secret-123", NODE_ENV: "test", ...env } },
    (error, out, err) => resolve({ code: error ? (error.code as number) ?? 1 : 0, out, err }));
});
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const tokenOf = (link: string) => link.trim().split("/join/")[1]!;

const GOOD = { name: "Dana Parent", email: "s14-02-dana@example.com", password: "a-long-enough-password" };

describe.skipIf(!hasDb)("family invites (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const lines: string[] = [];
  const app = hasDb ? buildApp(testConfig({ LOG_LEVEL: "info" }), { db: pool, logStream: { write: (l) => { lines.push(l); } } }) : null!;
  const madeFamilies: string[] = [];
  let ip = 0; // the join throttle is per address; most tests use a fresh one
  const peek = (token: string) => app.inject({ method: "GET", url: `/api/join/${token}`, remoteAddress: `10.14.2.${++ip}` });
  const join = (token: string, body: unknown = GOOD, address = `10.14.2.${++ip}`) => app.inject({ method: "POST", url: `/api/join/${token}`, remoteAddress: address, payload: body as object });
  const cleanEmails = () => pool.query("DELETE FROM family WHERE id IN (SELECT family_id FROM parent WHERE lower(email) LIKE 's14-02-%')");
  beforeAll(cleanEmails);
  afterAll(async () => {
    await cleanEmails();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [madeFamilies]);
    await pool.query("DELETE FROM invite WHERE family_id IS NULL AND used_at IS NULL");
    await app.close();
    await pool.end();
  });
  const fresh = async () => (await createInvite(pool, { familyId: null, createdBy: null })).token;

  describe("the command", () => {
    it("prints the link once, stores only the token's SHA-256, and the invite lasts 7 days", async () => {
      const r = await runCli(["create"].slice(1), { PUBLIC_BASE_URL: "http://localhost:5173/" });
      expect(r.code).toBe(0);
      const link = r.out.split("\n").find((l) => l.includes("/join/"))!;
      expect(link).toMatch(/^http:\/\/localhost:5173\/join\/[A-Za-z0-9_-]{43}$/);
      const token = tokenOf(link);
      const row = (await pool.query("SELECT * FROM invite WHERE token_hash = $1", [sha(token)])).rows[0];
      expect(row).toBeTruthy();
      expect(JSON.stringify(row)).not.toContain(token);
      expect(row.family_id).toBeNull();
      const days = (row.expires_at.getTime() - row.created_at.getTime()) / 86400000;
      expect(days).toBeCloseTo(7, 2);
      // The link is shown once: `list` has the id, never the token.
      const list = await runCli(["list"]);
      expect(list.out).toContain(row.id);
      expect(list.out).not.toContain(token);
      expect(r.err).toBe("");
    }, 30000);

    it("lists open invites and revokes one by its id prefix; a revoked link answers like any bad link", async () => {
      const made = await runCli([]);
      const token = tokenOf(made.out.split("\n").find((l) => l.includes("/join/"))!);
      const id = (await pool.query("SELECT id FROM invite WHERE token_hash = $1", [sha(token)])).rows[0].id as string;
      const bad = await runCli(["revoke", "zz"]);
      expect(bad.code).toBe(2);
      expect((await runCli(["revoke", "00000000"])).code).toBe(1);
      const r = await runCli(["revoke", id.slice(0, 8)]);
      expect(r.code).toBe(0);
      expect((await runCli(["list"])).out).not.toContain(id);
      const res = await peek(token);
      expect(res.statusCode).toBe(404);
      expect(res.json()).toEqual({ error: "invite_unavailable", message: INVITE_UNAVAILABLE_MESSAGE });
      expect((await join(token)).statusCode).toBe(404);
    }, 60000);

    it("rejects an unknown subcommand", async () => {
      expect((await runCli(["make"])).code).toBe(2);
    }, 30000);
  });

  describe("the join page's API", () => {
    it("a link creates a new family and its first parent, signs them in, and starts the setup flow", async () => {
      const token = await fresh();
      expect((await peek(token)).json()).toEqual({ kind: "new_family", familyName: null });
      const res = await join(token);
      expect(res.statusCode).toBe(201);
      const body = res.json();
      madeFamilies.push(body.familyId);
      expect(body).toMatchObject({ parentName: "Dana Parent", kind: "new_family" });
      const cookie = sessionCookie(res)!;
      expect(cookie).toBeTruthy();
      const me = (await app.inject({ method: "GET", url: "/api/me", cookies: { hh_session: cookie } })).json();
      expect(me).toMatchObject({ familyId: body.familyId, parentName: "Dana Parent", setupDone: false, setupStep: 1, demo: false });
      // The password was stored hashed, and the new parent can sign in with it.
      const login = await app.inject({ method: "POST", url: "/api/auth/login", remoteAddress: `10.14.2.${++ip}`, payload: { email: GOOD.email, password: GOOD.password } });
      expect(login.statusCode).toBe(200);
      expect((await pool.query("SELECT password_hash FROM parent WHERE lower(email) = $1", [GOOD.email])).rows[0].password_hash).not.toContain(GOOD.password);
    });

    it("the same link fails the second time, with the one plain message", async () => {
      const token = await fresh();
      const first = await join(token, { ...GOOD, email: "s14-02-once@example.com" });
      expect(first.statusCode).toBe(201);
      madeFamilies.push(first.json().familyId);
      const again = await join(token, { ...GOOD, email: "s14-02-twice@example.com" });
      expect(again.statusCode).toBe(404);
      expect(again.json()).toEqual({ error: "invite_unavailable", message: INVITE_UNAVAILABLE_MESSAGE });
      expect((await peek(token)).statusCode).toBe(404);
      expect((await pool.query("SELECT 1 FROM parent WHERE lower(email) = 's14-02-twice@example.com'")).rowCount).toBe(0);
    });

    it("unknown, expired, used and cancelled links all answer the same bytes", async () => {
      const unknown = await join("A".repeat(43));
      const garbage = await join("not-a-token");
      const expired = await fresh();
      await pool.query("UPDATE invite SET created_at = now() - interval '8 days', expires_at = now() - interval '1 day' WHERE token_hash = $1", [sha(expired)]);
      const cancelled = await fresh();
      await pool.query("UPDATE invite SET revoked_at = now() WHERE token_hash = $1", [sha(cancelled)]);
      const used = await fresh();
      await pool.query("UPDATE invite SET used_at = now() WHERE token_hash = $1", [sha(used)]);
      const answers = [unknown, garbage, await join(expired), await join(cancelled), await join(used), await peek(expired), await peek(cancelled), await peek(used)];
      for (const a of answers) {
        expect(a.statusCode).toBe(404);
        expect(a.body).toBe(unknown.body);
      }
      expect(unknown.json().message).toBe(INVITE_UNAVAILABLE_MESSAGE);
      expect(unknown.json().message).not.toMatch(/unknown|invalid|revoked|cancel/i);
    });

    it("a link that is 7 days old is gone; one just under is usable", async () => {
      const token = await fresh();
      await pool.query("UPDATE invite SET created_at = now() - interval '7 days 1 minute', expires_at = now() - interval '1 minute' WHERE token_hash = $1", [sha(token)]);
      expect((await join(token)).statusCode).toBe(404);
      const ok = await fresh();
      await pool.query("UPDATE invite SET created_at = now() - interval '6 days 23 hours', expires_at = now() + interval '1 hour' WHERE token_hash = $1", [sha(ok)]);
      const res = await join(ok, { ...GOOD, email: "s14-02-edge@example.com" });
      expect(res.statusCode).toBe(201);
      madeFamilies.push(res.json().familyId);
    });

    it("a bad form changes nothing and does not use up the link", async () => {
      const token = await fresh();
      for (const body of [{ ...GOOD, name: "  " }, { ...GOOD, email: "nope" }, { ...GOOD, password: "short" }, { ...GOOD, extra: 1 }, { name: "x" }]) {
        const res = await join(token, body);
        expect(res.statusCode).toBe(400);
      }
      expect((await join(token, { ...GOOD, password: "short" })).json().message).toBe("Use at least 8 characters.");
      expect((await peek(token)).statusCode).toBe(200);
    });

    it("an email already in use is refused and does not use up the link", async () => {
      const owner = await createFamily(pool, "s14-02-taken@example.com", "some-password-here");
      madeFamilies.push(owner);
      const token = await fresh();
      const res = await join(token, { ...GOOD, email: "S14-02-TAKEN@example.com" });
      expect(res.statusCode).toBe(409);
      expect(res.json().error).toBe("email_in_use");
      expect((await pool.query("SELECT count(*)::int AS n FROM family WHERE name = 'Our family' AND id IN (SELECT family_id FROM parent WHERE lower(email) = 's14-02-taken@example.com')")).rows[0].n).toBe(0);
      const ok = await join(token, { ...GOOD, email: "s14-02-other@example.com" });
      expect(ok.statusCode).toBe(201);
      madeFamilies.push(ok.json().familyId);
    });

    it("two people using one link at the same moment: exactly one gets in", async () => {
      const token = await fresh();
      const results = await Promise.all([1, 2, 3].map((n) => join(token, { ...GOOD, email: `s14-02-race${n}@example.com` })));
      expect(results.map((r) => r.statusCode).sort()).toEqual([201, 404, 404]);
      for (const r of results) if (r.statusCode === 201) madeFamilies.push(r.json().familyId);
      expect((await pool.query("SELECT count(*)::int AS n FROM parent WHERE lower(email) LIKE 's14-02-race%'")).rows[0].n).toBe(1);
    });

    it("redeeming is throttled per address, guesses included", async () => {
      const address = "10.14.3.1";
      const codes: number[] = [];
      for (let i = 0; i < 12; i++) codes.push((await join("B".repeat(43), GOOD, address)).statusCode);
      expect(codes.slice(0, 10).every((c) => c === 404)).toBe(true);
      expect(codes.slice(10)).toEqual([429, 429]);
      expect((await join("B".repeat(43), GOOD, address)).json().error).toBe("rate_limited");
    });

    it("an invite for a family adds a parent to that family only, and sets up nothing new", async () => {
      const fam = await createFamily(pool, "s14-02-host@example.com", "host-password-123", "Host family");
      madeFamilies.push(fam);
      const other = await createFamily(pool, "s14-02-bystander@example.com", "bystander-password", "Bystander family");
      madeFamilies.push(other);
      const { token } = await createInvite(pool, { familyId: fam, createdBy: null });
      expect((await peek(token)).json()).toEqual({ kind: "parent", familyName: "Host family" });
      const res = await join(token, { ...GOOD, email: "s14-02-second@example.com" });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ familyId: fam, kind: "parent" });
      expect((await pool.query("SELECT count(*)::int AS n FROM parent WHERE family_id = $1", [fam])).rows[0].n).toBe(2);
      expect((await pool.query("SELECT count(*)::int AS n FROM parent WHERE family_id = $1", [other])).rows[0].n).toBe(1);
    });

    it("logs never hold a token or a password", async () => {
      const token = await fresh();
      await peek(token);
      const res = await join(token, { ...GOOD, email: "s14-02-logs@example.com" });
      madeFamilies.push(res.json().familyId);
      await join(token, { ...GOOD, email: "s14-02-logs2@example.com" });
      const all = lines.join("\n");
      expect(all).toContain("/join/[redacted]");
      expect(all).not.toContain(token);
      expect(all).not.toContain(GOOD.password);
    });

    it("redactInviteUrl hides the token and keeps the rest of the path", () => {
      expect(redactInviteUrl("/api/join/abc_DEF-123?x=1")).toBe("/api/join/[redacted]?x=1");
      expect(redactInviteUrl("/join/abc")).toBe("/join/[redacted]");
      expect(redactInviteUrl("/api/children")).toBe("/api/children");
    });
  });
});
