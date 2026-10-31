/** 013_undo (S6-05): assignment.original filled for existing rows, and undo_entry (one row per family). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_undo_migration_test";
const F = "f0000000-0000-0000-0000-000000000001";
const F2 = "f0000000-0000-0000-0000-000000000002";
const S = "50000000-0000-0000-0000-000000000001";
const K1 = "c0000000-0000-0000-0000-000000000001";
const K2 = "c0000000-0000-0000-0000-000000000002";
const A = "a0000000-0000-0000-0000-000000000001";

describe.skipIf(!hasDb)("013_undo (integration)", () => {
  let url = "";
  const before = migrationsThrough("012");
  const after = migrationsThrough("013");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
    await q(url, `
      INSERT INTO family (id, name) VALUES ('${F}', 'F'), ('${F2}', 'Other');
      INSERT INTO child (id, family_id, name, sort_order) VALUES ('${K1}', '${F}', 'Ada', 1), ('${K2}', '${F}', 'Ben', 0);
      INSERT INTO subject (id, family_id, name) VALUES ('${S}', '${F}', 'Math');
      INSERT INTO assignment (id, family_id, subject_id, title, unit_type, total_units, start_date, end_date, weight_per_unit, weekdays)
        VALUES ('${A}', '${F}', '${S}', 'Book', 'pages', 100.5, '2026-09-07', '2026-09-18', 3.25, '{1,3}');
      INSERT INTO assignment_child (assignment_id, child_id, family_id) VALUES ('${A}', '${K1}', '${F}'), ('${A}', '${K2}', '${F}');`);
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("upgrades from 012 and fills original from the current values", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["013_undo"]);
    const [row] = await q<{ original: unknown }>(url, "SELECT original FROM assignment WHERE id = $1", [A]);
    expect(row!.original).toEqual({
      title: "Book", subjectId: S, unitType: "pages", totalUnits: 100.5, weightPerUnit: 3.25, weekdays: [1, 3],
      startDate: "2026-09-07", endDate: "2026-09-18", childIds: [K2, K1],
    });
  });

  it("an existing row with no weight or days gets nulls", async () => {
    await q(url, `INSERT INTO assignment (id, family_id, subject_id, title, unit_type, total_units, start_date, end_date)
                  VALUES ('a0000000-0000-0000-0000-000000000002', '${F}', '${S}', 'Plain', 'lessons', 4, '2026-09-07', '2026-09-08')`);
    await q(url, "UPDATE assignment SET original = NULL WHERE id = 'a0000000-0000-0000-0000-000000000002'");
    expect(await q(url, "SELECT original IS NULL AS none FROM assignment WHERE id = 'a0000000-0000-0000-0000-000000000002'")).toEqual([{ none: true }]);
  });

  it("original must be an object when set", async () => {
    await expect(q(url, "UPDATE assignment SET original = '[1]'::jsonb WHERE id = $1", [A])).rejects.toMatchObject({ code: "23514" });
  });

  it("a family has at most one undo entry", async () => {
    await q(url, "INSERT INTO undo_entry (family_id, label, inverse) VALUES ($1, 'Moved Book', '{\"steps\": []}')", [F]);
    await expect(q(url, "INSERT INTO undo_entry (family_id, label, inverse) VALUES ($1, 'Again', '{}')", [F])).rejects.toMatchObject({ code: "23505" });
    await q(url, "INSERT INTO undo_entry (family_id, label, inverse) VALUES ($1, 'Theirs', '{}')", [F2]);
  });

  it.each([
    ["an empty label", "''", "'{}'"],
    ["a label over 300 characters", "repeat('x', 301)", "'{}'"],
    ["an inverse that is not an object", "'x'", "'[]'"],
  ])("rejects %s", async (_n, label, inverse) => {
    await expect(q(url, `UPDATE undo_entry SET label = ${label}, inverse = ${inverse}::jsonb WHERE family_id = '${F2}'`)).rejects.toMatchObject({ code: "23514" });
  });

  it("needs a real family and goes with it", async () => {
    await expect(q(url, "INSERT INTO undo_entry (family_id, label, inverse) VALUES ('f0000000-0000-0000-0000-0000000000ff', 'x', '{}')")).rejects.toMatchObject({ code: "23503" });
    await q(url, "DELETE FROM family WHERE id = $1", [F2]);
    expect(await q(url, "SELECT family_id FROM undo_entry")).toEqual([{ family_id: F }]);
  });
});
