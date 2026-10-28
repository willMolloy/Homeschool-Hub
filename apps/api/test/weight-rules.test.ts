/**
 * Weight rules on assignment writes: S2b-06 (weightPerUnit is allowed everywhere; a unit change needs a new weight)
 * and S2b-13/15 (minutesPerUnit is gone from the API, and 007 dropped its column).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkUnitChange } from "../src/http/assignmentWeight";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("weights on minutes assignments (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let roster: { childIds: string[]; subjectIds: string[] };
  beforeAll(async () => {
    fam = await signedInFamily(pool, "Minutes unit");
    req = inject(app, fam.cookies);
    roster = await rosterFor(app, fam.cookies, ["Ann"], ["Music"]);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });

  const body = (over: Record<string, unknown>) => ({
    subjectId: roster.subjectIds[0], title: "Piano", unitType: "minutes", totalUnits: 600, startDate: "2026-11-02", endDate: "2026-11-27", childIds: roster.childIds, ...over,
  });
  const count = async () => (await pool.query("SELECT count(*)::int AS n FROM assignment WHERE family_id = $1", [fam.familyId])).rows[0].n as number;
  const stored = async (id: string) => (await pool.query("SELECT unit_type FROM assignment WHERE id = $1", [id])).rows[0];
  const weight = async (id: string) => (await pool.query("SELECT weight_per_unit::float8 AS w FROM assignment WHERE id = $1", [id])).rows[0].w as number | null;

  it("POST minutes with no weight → 201; the response has no minutesPerUnit", async () => {
    const before = await count();
    const ok = await req("POST", "/api/assignments", body({}));
    expect(ok.statusCode).toBe(201);
    expect(ok.json()).not.toHaveProperty("minutesPerUnit");
    expect(await count()).toBe(before + 1);
  });

  it("PATCH pages→minutes with a stored weight: 400 alone (D7), 200 with weightPerUnit: null", async () => {
    const id = (await req("POST", "/api/assignments", body({ unitType: "pages", totalUnits: 100, weightPerUnit: 2 }))).json().id;
    const bad = await req("PATCH", `/api/assignments/${id}`, { unitType: "minutes" });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().message).toBe("weightPerUnit: send a weight (or null) when changing unitType.");
    expect(await stored(id)).toEqual({ unit_type: "pages" });
    const ok = await req("PATCH", `/api/assignments/${id}`, { unitType: "minutes", weightPerUnit: null });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ unitType: "minutes", weightPerUnit: null });
    expect(await stored(id)).toEqual({ unit_type: "minutes" });
  });

  it("other edits to a minutes row still work", async () => {
    const id = (await req("POST", "/api/assignments", body({}))).json().id;
    expect((await req("PATCH", `/api/assignments/${id}`, { title: "Piano 2" })).statusCode).toBe(200);
    expect((await req("PATCH", `/api/assignments/${id}`, { weightPerUnit: null })).statusCode).toBe(200);
  });

  it("weightPerUnit is allowed on minutes rows (D21), on create and on edit", async () => {
    const res = await req("POST", "/api/assignments", body({ weightPerUnit: 0.75 }));
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ unitType: "minutes", weightPerUnit: 0.75 });
    const id = res.json().id;
    expect((await req("PATCH", `/api/assignments/${id}`, { weightPerUnit: 1 })).json()).toMatchObject({ weightPerUnit: 1 });
    expect(await stored(id)).toEqual({ unit_type: "minutes" });
  });

  it("switching to minutes with a new weight keeps it; with no weight stored no weight is needed", async () => {
    const id = (await req("POST", "/api/assignments", body({ unitType: "pages", totalUnits: 100, weightPerUnit: 2 }))).json().id;
    expect((await req("PATCH", `/api/assignments/${id}`, { unitType: "minutes", weightPerUnit: 0.5 })).statusCode).toBe(200);
    expect(await stored(id)).toEqual({ unit_type: "minutes" });
    expect(await weight(id)).toBe(0.5);
    const bare = (await req("POST", "/api/assignments", body({ unitType: "pages", totalUnits: 100 }))).json().id;
    expect((await req("PATCH", `/api/assignments/${bare}`, { unitType: "minutes" })).statusCode).toBe(200);
    expect(await weight(bare)).toBeNull();
  });
});

describe("assignment weight rules (unit)", () => {
  it("a unit change needs a weight only when one is stored", () => {
    const cur = { unitType: "pages" as const, weightPerUnit: 2 };
    expect(() => checkUnitChange(cur, "chapters", {})).toThrow(/send a weight \(or null\) when changing unitType/);
    expect(() => checkUnitChange(cur, "chapters", { weightPerUnit: 12 })).not.toThrow();
    expect(() => checkUnitChange(cur, "minutes", { weightPerUnit: null })).not.toThrow();
    expect(() => checkUnitChange(cur, "pages", {})).not.toThrow();
    expect(() => checkUnitChange(cur, undefined, {})).not.toThrow();
    expect(() => checkUnitChange({ unitType: "pages", weightPerUnit: null }, "lessons", {})).not.toThrow();
  });
});
