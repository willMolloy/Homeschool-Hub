/** S15-00: the five-invite cap under parallel requests (N1) and the remove-parent command (N3). */
import { execFile } from "node:child_process";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { createFamily, sessionCookie } from "./helpers/family";

const PW = "s15-00-password";
const cli = path.resolve(__dirname, "../src/cli/remove-parent.ts");
const tsx = path.resolve(__dirname, "../../../node_modules/.bin/tsx");
const run = (args: string[]) => new Promise<{ code: number; out: string; err: string }>((resolve) => {
  execFile(tsx, [cli, ...args], { env: { ...process.env, SESSION_SECRET: "test-secret-test-secret-test-secret-123", NODE_ENV: "test" } },
    (error, out, err) => resolve({ code: error ? (error.code as number) ?? 1 : 0, out, err }));
});

describe.skipIf(!hasDb)("Sprint 14 leftovers (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam = "";
  const clean = () => pool.query("DELETE FROM family WHERE id IN (SELECT family_id FROM parent WHERE lower(email) LIKE 's15-00-%')");
  beforeAll(async () => { await clean(); fam = await createFamily(pool, "s15-00-a@example.com", PW, "Leftovers family"); });
  afterAll(async () => { await clean(); await app.close(); await pool.end(); });

  it("N1: eight invites at once leave at most five open", async () => {
    const login = await app.inject({ method: "POST", url: "/api/auth/login", remoteAddress: "10.15.0.1", payload: { email: "s15-00-a@example.com", password: PW } });
    const cookies = { hh_session: sessionCookie(login)! };
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => app.inject({ method: "POST", url: "/api/family/invites", cookies, remoteAddress: `10.15.1.${i + 1}` })));
    expect(results.filter((r) => r.statusCode === 201)).toHaveLength(5);
    expect(results.filter((r) => r.statusCode === 409)).toHaveLength(3);
    const open = await pool.query("SELECT count(*)::int AS n FROM invite WHERE family_id = $1 AND used_at IS NULL AND revoked_at IS NULL", [fam]);
    expect(open.rows[0].n).toBe(5);
  });

  it("N3: remove-parent removes that parent and their sessions, and refuses a family's last parent", async () => {
    await pool.query("INSERT INTO parent (family_id, name, email, password_hash) VALUES ($1, 'Second', 's15-00-b@example.com', 'x')", [fam]);
    const second = (await pool.query("SELECT id FROM parent WHERE lower(email) = 's15-00-b@example.com'")).rows[0].id;
    await pool.query("INSERT INTO session (id, family_id, parent_id, expires_at) VALUES ('s15-00-sess', $1, $2, now() + interval '1 day')", [fam, second]);

    expect((await run(["not-an-email"])).code).toBe(2);
    expect((await run(["nobody-s15-00@example.com"])).code).toBe(1);

    const gone = await run(["S15-00-B@example.com"]);
    expect(gone.code).toBe(0);
    expect((await pool.query("SELECT 1 FROM parent WHERE id = $1", [second])).rowCount).toBe(0);
    expect((await pool.query("SELECT 1 FROM session WHERE id = 's15-00-sess'")).rowCount).toBe(0);
    expect((await pool.query("SELECT 1 FROM family WHERE id = $1", [fam])).rowCount).toBe(1);

    const last = await run(["s15-00-a@example.com"]);
    expect(last.code).toBe(1);
    expect(last.err).toMatch(/last parent/);
    expect((await pool.query("SELECT 1 FROM parent WHERE lower(email) = 's15-00-a@example.com'")).rowCount).toBe(1);
  }, 30000);
});
