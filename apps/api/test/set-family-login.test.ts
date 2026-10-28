import { execFile } from "node:child_process";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verifyPassword } from "../src/auth/password";
import { hasDb, testPool } from "./helpers/db";

const cli = path.resolve(__dirname, "../src/cli/set-family-login.ts");
const tsx = path.resolve(__dirname, "../../../node_modules/.bin/tsx");

function run(args: string[], stdin: string): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve) => {
    const child = execFile(tsx, [cli, ...args], {
      env: { ...process.env, SESSION_SECRET: "test-secret-test-secret-test-secret-123", NODE_ENV: "test" },
    }, (error, out, err) => resolve({ code: error ? (error.code as number) ?? 1 : 0, out, err }));
    child.stdin!.end(stdin);
  });
}

describe.skipIf(!hasDb)("set-family-login CLI (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  let familyId = "";
  beforeAll(async () => {
    await pool.query("DELETE FROM family WHERE name = 'CLI test family'");
    familyId = (await pool.query("INSERT INTO family (name) VALUES ('CLI test family') RETURNING id")).rows[0].id;
    await pool.query("INSERT INTO session (id, family_id, expires_at) VALUES ('cli-old-session', $1, now() + interval '1 day')", [familyId]);
  });
  afterAll(async () => {
    await pool.query("DELETE FROM family WHERE id = $1", [familyId]);
    await pool.end();
  });

  it("sets login_email and a verifiable password hash, and drops old sessions", async () => {
    const r = await run([familyId, "cli-test@example.com"], "a-good-password\n");
    expect(r.err).toBe("");
    expect(r.code).toBe(0);
    const row = (await pool.query("SELECT login_email, password_hash FROM family WHERE id = $1", [familyId])).rows[0];
    expect(row.login_email).toBe("cli-test@example.com");
    expect(await verifyPassword("a-good-password", row.password_hash)).toBe(true);
    expect((await pool.query("SELECT 1 FROM session WHERE family_id = $1", [familyId])).rowCount).toBe(0);
  }, 20000);

  it("rejects bad arguments, short passwords and unknown families", async () => {
    expect((await run(["not-a-uuid", "x@example.com"], "a-good-password\n")).code).toBe(2);
    expect((await run([familyId, "x@example.com"], "short\n")).code).toBe(1);
    const r = await run(["00000000-0000-0000-0000-000000000000", "x@example.com"], "a-good-password\n");
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/No family/);
  }, 30000);
});
