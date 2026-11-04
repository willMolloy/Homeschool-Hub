/** 021_tips_seen (S11-06): a family that exists has seen every hint; a new one has seen none; only the three hints are allowed. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_tips_seen_migration_test";
const OLD = "f0000000-0000-0000-0000-000000000001";
const NEW = "f0000000-0000-0000-0000-000000000002";

describe.skipIf(!hasDb)("021_tips_seen (integration)", () => {
  let url = "";
  const before = migrationsThrough("020");
  const after = migrationsThrough("021");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
    await q(url, `INSERT INTO family (id, name) VALUES ('${OLD}', 'Old')`);
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("upgrades from 020: an existing family has seen all three hints", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["021_tips_seen"]);
    expect(await q(url, "SELECT tips_seen FROM family WHERE id = $1", [OLD])).toEqual([{ tips_seen: ["bars", "edit", "icons"] }]);
  });

  it("a family created afterwards has seen none, and can be set back to none", async () => {
    await q(url, `INSERT INTO family (id, name) VALUES ('${NEW}', 'New')`);
    expect(await q(url, "SELECT tips_seen FROM family WHERE id = $1", [NEW])).toEqual([{ tips_seen: [] }]);
    await q(url, "UPDATE family SET tips_seen = '{bars}' WHERE id = $1", [NEW]);
    await q(url, "UPDATE family SET tips_seen = '{}' WHERE id = $1", [NEW]);
  });

  it("rejects a hint that does not exist", async () => {
    await expect(q(url, "UPDATE family SET tips_seen = '{tour}' WHERE id = $1", [NEW])).rejects.toMatchObject({ code: "23514" });
  });
});
