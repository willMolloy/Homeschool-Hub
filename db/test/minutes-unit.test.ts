/**
 * 003_minutes_unit (RF-10): existing minutes rows lose their (ignored) minutes_per_unit, then a CHECK keeps it that way.
 * 007 drops the column (S2b-15), but this still runs: it migrates a temp dir holding only 001–003.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_minutes_unit_test";

describe.skipIf(!hasDb)("003_minutes_unit (integration)", () => {
  let url = "";
  const before = migrationsThrough("002");
  const after = migrationsThrough("003");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("clears minutes_per_unit on minutes rows only, then rejects new ones", async () => {
    await q(url, `
      INSERT INTO family (id, name) VALUES ('f0000000-0000-0000-0000-000000000001', 'F');
      INSERT INTO subject (id, family_id, name) VALUES ('50000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Music');
      INSERT INTO assignment (id, family_id, subject_id, title, unit_type, total_units, minutes_per_unit, start_date, end_date) VALUES
        ('a0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Piano', 'minutes', 600, 30, '2026-11-02', '2026-11-27'),
        ('a0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Book', 'pages', 100, 4, '2026-11-02', '2026-11-27');`);
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["003_minutes_unit"]);
    const rows = await q<{ title: string; minutes_per_unit: number | null }>(url, "SELECT title, minutes_per_unit::float8 AS minutes_per_unit FROM assignment ORDER BY title");
    expect(rows).toEqual([{ title: "Book", minutes_per_unit: 4 }, { title: "Piano", minutes_per_unit: null }]);
    await expect(q(url, "UPDATE assignment SET minutes_per_unit = 5 WHERE title = 'Piano'")).rejects.toMatchObject({ code: "23514" });
  });
});
