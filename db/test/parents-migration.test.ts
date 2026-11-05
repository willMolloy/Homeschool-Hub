/** 025_parents (S14-01): each family's login becomes its first parent, sessions follow, emails stay unique, the old columns go. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_parents_migration_test";
const A = "f0000000-0000-0000-0000-00000000000a";
const B = "f0000000-0000-0000-0000-00000000000b";
const NO_LOGIN = "f0000000-0000-0000-0000-00000000000c";

describe.skipIf(!hasDb)("025_parents (integration)", () => {
  let url = "";
  const before = migrationsThrough("024");
  const after = migrationsThrough("025");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
    await q(url, `INSERT INTO family (id, name, login_email, password_hash) VALUES ('${A}', 'A', 'Alice.Smith@Example.com', 'scrypt$hashA'), ('${B}', 'B', '@odd.example', 'scrypt$hashB')`);
    await q(url, `INSERT INTO family (id, name) VALUES ('${NO_LOGIN}', 'No login')`);
    await q(url, `INSERT INTO session (id, family_id, expires_at) VALUES ('s-a', '${A}', now() + interval '1 day'), ('s-none', '${NO_LOGIN}', now() + interval '1 day')`);
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("moves every login into a first parent, with the same email and password hash", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["025_parents"]);
    // Ordered by family id, not email: email order depends on the database's collation (C puts "@" first, en_US does not).
    expect(await q(url, "SELECT family_id, name, email, password_hash FROM parent ORDER BY family_id")).toEqual([
      { family_id: A, name: "Alice.Smith", email: "Alice.Smith@Example.com", password_hash: "scrypt$hashA" },
      { family_id: B, name: "Parent", email: "@odd.example", password_hash: "scrypt$hashB" },
    ]);
    expect(await q(url, "SELECT count(*)::int AS n FROM parent")).toEqual([{ n: 2 }]);
  });

  it("points existing sessions at their family's first parent, and leaves a family with no login alone", async () => {
    expect(await q(url, "SELECT s.id, p.email FROM session s LEFT JOIN parent p ON p.id = s.parent_id ORDER BY s.id")).toEqual([
      { id: "s-a", email: "Alice.Smith@Example.com" }, { id: "s-none", email: null },
    ]);
  });

  it("drops the old columns", async () => {
    const cols = await q<{ column_name: string }>(url, "SELECT column_name FROM information_schema.columns WHERE table_name = 'family'");
    expect(cols.map((c) => c.column_name)).not.toContain("login_email");
    expect(cols.map((c) => c.column_name)).not.toContain("password_hash");
  });

  it("keeps emails unique across families, ignoring case, and lets a family have two parents", async () => {
    await expect(q(url, `INSERT INTO parent (family_id, name, email, password_hash) VALUES ('${B}', 'Dup', 'alice.smith@example.COM', 'x')`)).rejects.toMatchObject({ code: "23505" });
    await q(url, `INSERT INTO parent (family_id, name, email, password_hash) VALUES ('${A}', 'Bob', 'bob@example.com', 'x')`);
    expect(await q(url, `SELECT count(*)::int AS n FROM parent WHERE family_id = '${A}'`)).toEqual([{ n: 2 }]);
  });

  it("a session can only name a parent of its own family", async () => {
    const [bob] = await q<{ id: string }>(url, "SELECT id FROM parent WHERE email = 'bob@example.com'");
    await expect(q(url, `INSERT INTO session (id, family_id, parent_id, expires_at) VALUES ('s-x', '${B}', $1, now() + interval '1 day')`, [bob!.id])).rejects.toMatchObject({ code: "23503" });
    await q(url, `INSERT INTO session (id, family_id, parent_id, expires_at) VALUES ('s-bob', '${A}', $1, now() + interval '1 day')`, [bob!.id]);
  });

  it("deleting a parent ends its sessions; deleting a family removes its parents", async () => {
    await q(url, "DELETE FROM parent WHERE email = 'bob@example.com'");
    expect(await q(url, "SELECT 1 FROM session WHERE id = 's-bob'")).toEqual([]);
    await q(url, `DELETE FROM family WHERE id = '${A}'`);
    expect(await q(url, `SELECT 1 FROM parent WHERE family_id = '${A}'`)).toEqual([]);
  });

  it("rejects a blank name", async () => {
    await expect(q(url, `INSERT INTO parent (family_id, name, email, password_hash) VALUES ('${B}', '  ', 'blank@example.com', 'x')`)).rejects.toMatchObject({ code: "23514" });
  });
});
