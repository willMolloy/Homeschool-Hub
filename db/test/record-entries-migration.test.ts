/** 017_record_entries (S9-07): a log entry is one child's typed day or run of days; the database keeps its shape. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_record_entries_migration_test";
const F = "f0000000-0000-0000-0000-000000000001";
const OTHER_F = "f0000000-0000-0000-0000-000000000002";
const KID = "c0000000-0000-0000-0000-000000000001";
const OTHER_KID = "c0000000-0000-0000-0000-000000000002";
const insert = (over = "") => `INSERT INTO record_entry (family_id, child_id, start_date, end_date, counts_school_day, school_days${over ? ", " + over.split("=")[0] : ""}) VALUES ('${F}', '${KID}', '2026-11-02', '2026-11-06', true, 5${over ? ", " + over.split("=")[1] : ""})`;

describe.skipIf(!hasDb)("017_record_entries (integration)", () => {
  let url = "";
  const before = migrationsThrough("016");
  const after = migrationsThrough("017");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
    await q(url, `INSERT INTO family (id, name) VALUES ('${F}', 'F'), ('${OTHER_F}', 'G')`);
    await q(url, `INSERT INTO child (id, family_id, name) VALUES ('${KID}', '${F}', 'Frank'), ('${OTHER_KID}', '${OTHER_F}', 'Theirs')`);
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("upgrades from 016 and stores a typed entry with empty defaults", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["017_record_entries"]);
    await q(url, insert());
    expect(await q(url, "SELECT subject_minutes, total_minutes, notes, books, school_days FROM record_entry")).toEqual([{ subject_minutes: {}, total_minutes: null, notes: null, books: [], school_days: 5 }]);
  });

  it("keeps minutes, notes and books as typed", async () => {
    await q(url, "DELETE FROM record_entry");
    await q(url, insert(`subject_minutes='{"s1":210}'::jsonb`));
    await q(url, `UPDATE record_entry SET notes = 'Walk', books = '["Heidi"]', home_minutes = 30, away_minutes = 0`);
    expect(await q(url, "SELECT subject_minutes, notes, books, home_minutes, away_minutes FROM record_entry")).toEqual([{ subject_minutes: { s1: 210 }, notes: "Walk", books: ["Heidi"], home_minutes: 30, away_minutes: 0 }]);
  });

  it.each([
    ["an end before its start", `INSERT INTO record_entry (family_id, child_id, start_date, end_date, counts_school_day, school_days) VALUES ('${F}', '${KID}', '2026-11-06', '2026-11-02', true, 1)`, "23514"],
    ["negative minutes", insert("total_minutes=-1"), "23514"],
    ["negative school days", `INSERT INTO record_entry (family_id, child_id, start_date, end_date, counts_school_day, school_days) VALUES ('${F}', '${KID}', '2026-11-02', '2026-11-02', true, -1)`, "23514"],
    ["empty notes", insert("notes=''"), "23514"],
    ["subject minutes that are not an object", insert("subject_minutes='[]'::jsonb"), "23514"],
    ["books that are not a list", insert("books='{}'::jsonb"), "23514"],
    ["another family's child", `INSERT INTO record_entry (family_id, child_id, start_date, end_date, counts_school_day, school_days) VALUES ('${F}', '${OTHER_KID}', '2026-11-02', '2026-11-02', true, 1)`, "23503"],
  ])("rejects %s", async (_label, sql, code) => {
    await expect(q(url, sql)).rejects.toMatchObject({ code });
  });

  it("goes with its child, and with its family", async () => {
    await q(url, "DELETE FROM child WHERE id = $1", [KID]);
    expect(await q(url, "SELECT count(*)::int AS n FROM record_entry")).toEqual([{ n: 0 }]);
  });
});
