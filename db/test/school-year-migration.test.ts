/** 020_school_year (S11-03): both days or neither, the last not before the first; existing families have none. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_school_year_migration_test";
const F = "f0000000-0000-0000-0000-000000000001";

describe.skipIf(!hasDb)("020_school_year (integration)", () => {
  let url = "";
  const before = migrationsThrough("019");
  const after = migrationsThrough("020");
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

  it("upgrades from 019: an existing family has no school year", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["020_school_year"]);
    expect(await q(url, "SELECT school_year_start, school_year_end FROM family WHERE id = $1", [F])).toEqual([{ school_year_start: null, school_year_end: null }]);
  });

  it("stores both days and reads them back", async () => {
    await q(url, "UPDATE family SET school_year_start = '2026-08-17', school_year_end = '2027-05-21' WHERE id = $1", [F]);
    expect((await q<{ s: string; e: string }>(url, "SELECT school_year_start::text AS s, school_year_end::text AS e FROM family WHERE id = $1", [F]))[0]).toEqual({ s: "2026-08-17", e: "2027-05-21" });
  });

  it.each([
    ["only a first day", "school_year_start = '2026-08-17', school_year_end = NULL"],
    ["only a last day", "school_year_start = NULL, school_year_end = '2027-05-21'"],
    ["a last day before the first", "school_year_start = '2027-05-21', school_year_end = '2026-08-17'"],
  ])("rejects %s", async (_l, set) => {
    await expect(q(url, `UPDATE family SET ${set} WHERE id = $1`, [F])).rejects.toMatchObject({ code: "23514" });
  });
});
