/** 014_zoom_views (S7-03): family.zoom_views defaults to nothing hidden and no custom views, and must keep its shape. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_zoom_views_migration_test";
const F = "f0000000-0000-0000-0000-000000000001";
const VIEW = { id: "70000000-0000-4000-8000-000000000001", name: "Term 1", start: "2026-08-17", end: "2026-11-06" };

describe.skipIf(!hasDb)("014_zoom_views (integration)", () => {
  let url = "";
  const before = migrationsThrough("013");
  const after = migrationsThrough("014");
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

  it("upgrades from 013 and gives an existing family the default", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["014_zoom_views"]);
    expect(await q(url, "SELECT zoom_views FROM family WHERE id = $1", [F])).toEqual([{ zoom_views: { hidden: [], custom: [] } }]);
  });

  it("a new family starts with the default", async () => {
    await q(url, "INSERT INTO family (id, name) VALUES ('f0000000-0000-0000-0000-000000000002', 'New')");
    expect(await q(url, "SELECT zoom_views FROM family WHERE id = 'f0000000-0000-0000-0000-000000000002'")).toEqual([{ zoom_views: { hidden: [], custom: [] } }]);
  });

  it("stores hidden views and custom views and reads the JSON back", async () => {
    await q(url, "UPDATE family SET zoom_views = $2::jsonb WHERE id = $1", [F, JSON.stringify({ hidden: ["fall", "month"], custom: [VIEW] })]);
    expect(await q(url, "SELECT zoom_views FROM family WHERE id = $1", [F])).toEqual([{ zoom_views: { hidden: ["fall", "month"], custom: [VIEW] } }]);
  });

  it.each([
    ["null", "null"],
    ["a list", "[]"],
    ["no custom", '{"hidden":[]}'],
    ["no hidden", '{"custom":[]}'],
    ["hidden not a list", '{"hidden":{},"custom":[]}'],
    ["custom not a list", '{"hidden":[],"custom":"x"}'],
  ])("rejects %s", async (_label, json) => {
    await expect(q(url, "UPDATE family SET zoom_views = $2::jsonb WHERE id = $1", [F, json])).rejects.toMatchObject({ code: "23514" });
  });

  it("can't be set to SQL NULL", async () => {
    await expect(q(url, "UPDATE family SET zoom_views = NULL WHERE id = $1", [F])).rejects.toMatchObject({ code: "23502" });
  });
});
