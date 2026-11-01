/** 015_subject_icon (S8-11): subject.icon is a short lowercase key or NULL; existing subjects get the default their name suggests. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { defaultIconFor } from "../../apps/api/src/http/subjectIcons";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_subject_icon_migration_test";
const F = "f0000000-0000-0000-0000-000000000001";
const NAMES = [
  "Math", "Reading", "Literature", "Writing", "Spelling", "Grammar", "History", "Science", "Geography", "Art", "Music", "Foreign Language", "Bible", "PE",
  "Latin for Children", "Nature notebook", "Biology 101", "Piano practice", "Handwriting", "History spine", "Chess club", "Mathematics",
];

describe.skipIf(!hasDb)("015_subject_icon (integration)", () => {
  let url = "";
  const before = migrationsThrough("014");
  const after = migrationsThrough("015");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
    await q(url, `INSERT INTO family (id, name) VALUES ('${F}', 'F')`);
    for (const [i, n] of NAMES.entries()) await q(url, "INSERT INTO subject (family_id, name, sort_order) VALUES ($1, $2, $3)", [F, n, i]);
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("upgrades from 014 and gives each existing subject the same default the API gives a new one", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["015_subject_icon"]);
    const rows = await q<{ name: string; icon: string | null }>(url, "SELECT name, icon FROM subject ORDER BY sort_order");
    expect(rows.map((r) => [r.name, r.icon])).toEqual(NAMES.map((n) => [n, defaultIconFor(n)]));
  });

  it("the starter subjects get their defaults, and a subject nothing matches keeps the letter badge", async () => {
    const icon = async (n: string) => (await q<{ icon: string | null }>(url, "SELECT icon FROM subject WHERE name = $1", [n]))[0]!.icon;
    expect(await icon("Math")).toBe("calculator");
    expect(await icon("Science")).toBe("flask");
    expect(await icon("Music")).toBe("music");
    expect(await icon("Literature")).toBe("book");
    expect(await icon("History")).toBe("scroll");
    expect(await icon("Chess club")).toBeNull();
  });

  it("a new subject has no icon unless one is given; the shape is checked", async () => {
    await q(url, "INSERT INTO subject (family_id, name, sort_order) VALUES ($1, 'Plain', 99)", [F]);
    expect(await q(url, "SELECT icon FROM subject WHERE name = 'Plain'")).toEqual([{ icon: null }]);
    await q(url, "UPDATE subject SET icon = 'star' WHERE name = 'Plain'");
    await expect(q(url, "UPDATE subject SET icon = 'Not An Icon!' WHERE name = 'Plain'")).rejects.toMatchObject({ code: "23514" });
    await expect(q(url, "UPDATE subject SET icon = '' WHERE name = 'Plain'")).rejects.toMatchObject({ code: "23514" });
  });
});
