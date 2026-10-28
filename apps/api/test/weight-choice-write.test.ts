/** S2b-07: explicit weights saved on pages/chapters assignments append to weight_choice, one row per child. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("weight choices written by assignment saves (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let kids: string[] = [];
  let subject = "";
  beforeAll(async () => {
    fam = await signedInFamily(pool, "Choices");
    req = inject(app, fam.cookies);
    const r = await rosterFor(app, fam.cookies, ["Ann", "Ben", "Cy"], ["Reading"]);
    kids = r.childIds;
    subject = r.subjectIds[0]!;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });

  const body = (over: Record<string, unknown> = {}) => ({
    subjectId: subject, title: "Book", unitType: "pages", totalUnits: 100,
    startDate: "2026-11-02", endDate: "2026-11-27", childIds: [kids[0], kids[1]], ...over,
  });
  const create = async (over: Record<string, unknown> = {}) => {
    const res = await req("POST", "/api/assignments", body(over));
    expect(res.statusCode, res.body).toBe(201);
    return res.json().id as string;
  };
  const patch = (id: string, b: Record<string, unknown>) => req("PATCH", `/api/assignments/${id}`, b);
  const choices = async (id: string) => (await pool.query(
    "SELECT child_id, unit_type, weight::float8 AS w FROM weight_choice WHERE assignment_id = $1 ORDER BY id", [id])).rows as
    { child_id: string; unit_type: string; w: number | null }[];
  const total = async () => (await pool.query("SELECT count(*)::int AS n FROM weight_choice WHERE family_id = $1", [fam.familyId])).rows[0].n as number;

  describe("create", () => {
    it("a two-child pages create with weight 2 → 2 rows", async () => {
      const id = await create({ weightPerUnit: 2 });
      expect(await choices(id)).toEqual([
        { child_id: kids[0], unit_type: "pages", w: 2 },
        { child_id: kids[1], unit_type: "pages", w: 2 },
      ]);
    });

    it("a chapters create → rows", async () => {
      const id = await create({ unitType: "chapters", totalUnits: 12, weightPerUnit: 8, childIds: [kids[0]] });
      expect(await choices(id)).toEqual([{ child_id: kids[0], unit_type: "chapters", w: 8 }]);
    });

    it("lessons with 15 and minutes with 1 → 0 rows", async () => {
      expect(await choices(await create({ unitType: "lessons", weightPerUnit: 15 }))).toEqual([]);
      expect(await choices(await create({ unitType: "minutes", totalUnits: 600, weightPerUnit: 1 }))).toEqual([]);
    });

    it("no weight, a null weight, or the legacy alias → 0 rows", async () => {
      expect(await choices(await create())).toEqual([]);
      expect(await choices(await create({ weightPerUnit: null }))).toEqual([]);
      expect(await choices(await create({ minutesPerUnit: 6 }))).toEqual([]);
    });
  });

  describe("PATCH", () => {
    it("2 → 3 → one row per child; resending 3 → none; clearing → NULL rows", async () => {
      const id = await create({ weightPerUnit: 2 });
      expect((await patch(id, { weightPerUnit: 3 })).statusCode).toBe(200);
      expect((await choices(id)).slice(2)).toEqual([
        { child_id: kids[0], unit_type: "pages", w: 3 },
        { child_id: kids[1], unit_type: "pages", w: 3 },
      ]);
      expect((await patch(id, { weightPerUnit: 3 })).statusCode).toBe(200);
      expect(await choices(id)).toHaveLength(4);
      expect((await patch(id, { weightPerUnit: null })).statusCode).toBe(200);
      expect((await choices(id)).slice(4).map((c) => c.w)).toEqual([null, null]);
    });

    it("pages → lessons with a weight → 0 rows; lessons → pages with a weight → pages rows", async () => {
      const id = await create({ weightPerUnit: 2, childIds: [kids[0]] });
      expect((await patch(id, { unitType: "lessons", weightPerUnit: 15 })).statusCode).toBe(200);
      expect(await choices(id)).toHaveLength(1);
      expect((await patch(id, { unitType: "pages", weightPerUnit: 15 })).statusCode).toBe(200);
      expect((await choices(id)).slice(1)).toEqual([{ child_id: kids[0], unit_type: "pages", w: 15 }]);
    });

    it("rows go to the children on the assignment after the patch", async () => {
      const id = await create({ weightPerUnit: 2 });
      expect((await patch(id, { weightPerUnit: 2.5, childIds: [kids[2]] })).statusCode).toBe(200);
      expect((await choices(id)).slice(2)).toEqual([{ child_id: kids[2], unit_type: "pages", w: 2.5 }]);
    });

    it("adding a child only, archive, unarchive, or title and date edits → 0 rows", async () => {
      const id = await create({ weightPerUnit: 2 });
      for (const b of [{ childIds: kids }, { archived: true }, { archived: false }, { title: "Renamed" }, { endDate: "2026-12-04" }, { minutesPerUnit: 8 }]) {
        expect((await patch(id, b)).statusCode).toBe(200);
      }
      expect(await choices(id)).toHaveLength(2);
    });
  });

  it("a failed save (400 or a bad reference) writes no rows", async () => {
    const before = await total();
    expect((await req("POST", "/api/assignments", body({ weightPerUnit: 2, endDate: "2026-10-01" }))).statusCode).toBe(400);
    expect((await req("POST", "/api/assignments", body({ weightPerUnit: 2, childIds: ["00000000-0000-4000-8000-000000000000"] }))).statusCode).toBe(400);
    const id = await create({ weightPerUnit: 2 });
    const after = await total();
    expect(after).toBe(before + 2);
    expect((await patch(id, { weightPerUnit: 3, childIds: ["00000000-0000-4000-8000-000000000000"] })).statusCode).toBe(400);
    expect((await patch(id, { weightPerUnit: 3, startDate: "2026-12-30" })).statusCode).toBe(400);
    expect(await total()).toBe(after);
  });
});
