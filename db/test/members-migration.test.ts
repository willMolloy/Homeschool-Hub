/** 027_members (S15-01): every parent becomes a parent member, sessions follow the membership, a viewer needs no home family. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_members_migration_test";
const A = "f0000000-0000-0000-0000-0000000000a1";
const B = "f0000000-0000-0000-0000-0000000000b1";

describe.skipIf(!hasDb)("027_members (integration)", () => {
  let url = "";
  const before = migrationsThrough("026");
  const after = migrationsThrough("027");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
    await q(url, `INSERT INTO family (id, name) VALUES ('${A}', 'A'), ('${B}', 'B')`);
    await q(url, `INSERT INTO parent (id, family_id, name, email, password_hash) VALUES
      ('e0000000-0000-0000-0000-0000000000a1', '${A}', 'Ann', 'ann@example.com', 'h'), ('e0000000-0000-0000-0000-0000000000b1', '${B}', 'Bea', 'bea@example.com', 'h')`);
    await q(url, `INSERT INTO session (id, family_id, parent_id, expires_at) VALUES ('s-ann', '${A}', 'e0000000-0000-0000-0000-0000000000a1', now() + interval '1 day')`);
    await q(url, `INSERT INTO invite (token_hash, family_id, expires_at) VALUES ('${"a".repeat(64)}', '${A}', now() + interval '1 day')`);
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("makes each existing parent a parent member of their family, and keeps their session and invites", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["027_members"]);
    expect(await q(url, "SELECT family_id, parent_id, role FROM family_member ORDER BY family_id")).toEqual([
      { family_id: A, parent_id: "e0000000-0000-0000-0000-0000000000a1", role: "parent" },
      { family_id: B, parent_id: "e0000000-0000-0000-0000-0000000000b1", role: "parent" },
    ]);
    expect(await q(url, "SELECT id FROM session")).toEqual([{ id: "s-ann" }]);
    expect(await q(url, "SELECT role, label FROM invite")).toEqual([{ role: "parent", label: null }]);
  });

  it("a later parent row with a family becomes a parent member too; one with no family is just a person", async () => {
    await q(url, `INSERT INTO parent (id, family_id, name, email, password_hash) VALUES ('e0000000-0000-0000-0000-0000000000c1', '${A}', 'Cy', 'cy@example.com', 'h')`);
    await q(url, `INSERT INTO parent (id, family_id, name, email, password_hash) VALUES ('e0000000-0000-0000-0000-0000000000d1', NULL, 'Di', 'di@example.com', 'h')`);
    expect(await q(url, "SELECT role FROM family_member WHERE parent_id = 'e0000000-0000-0000-0000-0000000000c1'")).toEqual([{ role: "parent" }]);
    expect(await q(url, "SELECT 1 FROM family_member WHERE parent_id = 'e0000000-0000-0000-0000-0000000000d1'")).toEqual([]);
  });

  it("a session must name an account its person belongs to", async () => {
    const insert = (id: string, fam: string, who: string) =>
      q(url, `INSERT INTO session (id, family_id, parent_id, expires_at) VALUES ('${id}', '${fam}', '${who}', now() + interval '1 day')`);
    await expect(insert("s-x", B, "e0000000-0000-0000-0000-0000000000a1")).rejects.toMatchObject({ code: "23503" });
    await q(url, `INSERT INTO family_member (family_id, parent_id, role) VALUES ('${B}', 'e0000000-0000-0000-0000-0000000000d1', 'viewer')`);
    await insert("s-di", B, "e0000000-0000-0000-0000-0000000000d1");
  });

  it("removing a membership removes that person's sessions for the account only", async () => {
    await q(url, `INSERT INTO family_member (family_id, parent_id, role) VALUES ('${B}', 'e0000000-0000-0000-0000-0000000000a1', 'viewer')`);
    await q(url, `INSERT INTO session (id, family_id, parent_id, expires_at) VALUES ('s-ann-b', '${B}', 'e0000000-0000-0000-0000-0000000000a1', now() + interval '1 day')`);
    await q(url, `DELETE FROM family_member WHERE family_id = '${B}' AND parent_id = 'e0000000-0000-0000-0000-0000000000a1'`);
    expect(await q(url, "SELECT id FROM session WHERE parent_id = 'e0000000-0000-0000-0000-0000000000a1' ORDER BY id")).toEqual([{ id: "s-ann" }]);
  });

  it("roles are parent or viewer, and a view link must belong to a family", async () => {
    await expect(q(url, `INSERT INTO family_member (family_id, parent_id, role) VALUES ('${B}', 'e0000000-0000-0000-0000-0000000000c1', 'admin')`)).rejects.toMatchObject({ code: "23514" });
    await expect(q(url, `INSERT INTO invite (token_hash, family_id, role, expires_at) VALUES ('${"b".repeat(64)}', NULL, 'viewer', now() + interval '1 day')`)).rejects.toMatchObject({ code: "23514" });
    await expect(q(url, `INSERT INTO invite (token_hash, family_id, role, expires_at) VALUES ('${"c".repeat(64)}', '${A}', 'viewer', now() + interval '1 day')`)).resolves.toBeDefined();
  });

  it("deleting a family removes its memberships", async () => {
    await q(url, `DELETE FROM family WHERE id = '${B}'`);
    expect(await q(url, `SELECT 1 FROM family_member WHERE family_id = '${B}'`)).toEqual([]);
  });
});
