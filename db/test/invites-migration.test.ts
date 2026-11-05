/** 026_invites (S14-02): only a token hash is stored; an invite is for a new family or one family; it dies with its family. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_invites_migration_test";
const F = "f0000000-0000-0000-0000-00000000001a";
const HASH = "a".repeat(64);

describe.skipIf(!hasDb)("026_invites (integration)", () => {
  let url = "";
  const before = migrationsThrough("025");
  const after = migrationsThrough("026");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
    await q(url, `INSERT INTO family (id, name) VALUES ('${F}', 'F')`);
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("applies on top of 025", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["026_invites"]);
  });

  it("stores a 64-character hex hash, once", async () => {
    await q(url, `INSERT INTO invite (token_hash, expires_at) VALUES ('${HASH}', now() + interval '7 days')`);
    await expect(q(url, `INSERT INTO invite (token_hash, expires_at) VALUES ('${HASH}', now() + interval '7 days')`)).rejects.toMatchObject({ code: "23505" });
    await expect(q(url, "INSERT INTO invite (token_hash, expires_at) VALUES ('a-raw-looking-token', now() + interval '7 days')")).rejects.toMatchObject({ code: "23514" });
  });

  it("must expire after it is made", async () => {
    await expect(q(url, `INSERT INTO invite (token_hash, expires_at) VALUES ('${"b".repeat(64)}', now() - interval '1 day')`)).rejects.toMatchObject({ code: "23514" });
  });

  it("a family's invites go with the family; a new-family invite has no family", async () => {
    await q(url, `INSERT INTO invite (token_hash, family_id, expires_at) VALUES ('${"c".repeat(64)}', '${F}', now() + interval '7 days')`);
    await expect(q(url, `INSERT INTO invite (token_hash, family_id, expires_at) VALUES ('${"d".repeat(64)}', 'f0000000-0000-0000-0000-0000000000ff', now() + interval '7 days')`)).rejects.toMatchObject({ code: "23503" });
    await q(url, `DELETE FROM family WHERE id = '${F}'`);
    expect(await q(url, "SELECT family_id FROM invite")).toEqual([{ family_id: null }]);
  });
});
