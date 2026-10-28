import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listMigrations, migrate, MIGRATIONS_DIR, reset } from "../migrate";
import { createScratch, dropScratch, hasDb, q } from "./scratch";

const DB = "hh_migrate_test";

describe.skipIf(!hasDb)("migration runner (integration)", () => {
  let url = "";
  beforeAll(async () => {
    url = await createScratch(DB);
  });
  afterAll(() => dropScratch(DB));

  it("applies every migration on a fresh database, then is a no-op", async () => {
    const all = listMigrations().map((f) => f.replace(/\.sql$/, ""));
    const logs: string[] = [];
    expect((await migrate(url, MIGRATIONS_DIR, (s) => logs.push(s))).applied).toEqual(all);
    expect(logs).toEqual(all.map((v) => `applied ${v}`));
    const rows = await q<{ version: string }>(url, "select version from schema_migration order by version");
    expect(rows.map((r) => r.version)).toEqual(all);

    const again: string[] = [];
    expect((await migrate(url, MIGRATIONS_DIR, (s) => again.push(s))).applied).toEqual([]);
    expect(again).toEqual(["nothing to do"]);
  });

  it("fails on a broken migration and leaves schema_migration unchanged", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hh-mig-"));
    for (const f of listMigrations()) fs.copyFileSync(path.join(MIGRATIONS_DIR, f), path.join(dir, f));
    fs.writeFileSync(path.join(dir, "998_broken.sql"),
      "BEGIN;\nCREATE TABLE half_done (id int);\nSELECT * FROM no_such_table;\nINSERT INTO schema_migration (version) VALUES ('998_broken');\nCOMMIT;\n");
    const before = await q(url, "select version from schema_migration order by version");
    await expect(migrate(url, dir)).rejects.toThrow(/998_broken\.sql failed/);
    expect(await q(url, "select version from schema_migration order by version")).toEqual(before);
    expect(await q(url, "select to_regclass('public.half_done') as t")).toEqual([{ t: null }]);
  });

  it("fails loudly when a migration forgets its schema_migration row", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hh-mig-"));
    for (const f of listMigrations()) fs.copyFileSync(path.join(MIGRATIONS_DIR, f), path.join(dir, f));
    fs.writeFileSync(path.join(dir, "999_forgot.sql"), "BEGIN;\nCREATE TABLE forgot (id int);\nCOMMIT;\n");
    await expect(migrate(url, dir)).rejects.toThrow(/did not insert its schema_migration row/);
  });

  it("reset wipes the schema and re-applies everything", async () => {
    await q(url, "create table leftover (id int)");
    const res = await reset(url);
    expect(res.applied).toEqual(listMigrations().map((f) => f.replace(/\.sql$/, "")));
    expect(await q(url, "select to_regclass('public.leftover') as t")).toEqual([{ t: null }]);
  });

  it("reset refuses databases not ending in _dev or _test", async () => {
    await expect(reset("postgres://hh:hh@localhost:5432/hh_prod")).rejects.toThrow(/refusing to reset/);
    await expect(reset("postgres://hh:hh@localhost:5432/homeschool")).rejects.toThrow(/refusing to reset/);
  });
});
