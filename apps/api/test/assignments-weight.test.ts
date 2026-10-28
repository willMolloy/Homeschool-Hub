/** S2b-06: weightPerUnit on POST/PATCH /api/assignments, its bounds, and the unit-change rule (D7). (The legacy minutesPerUnit alias went in S2b-13.) */
import type { ChildPlan } from "@hh/engine";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("weightPerUnit on the assignment endpoints (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let roster: { childIds: string[]; subjectIds: string[] };
  beforeAll(async () => {
    fam = await signedInFamily(pool, "Weights");
    req = inject(app, fam.cookies);
    roster = await rosterFor(app, fam.cookies, ["Ann"], ["Reading"]);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });

  const body = (over: Record<string, unknown> = {}) => ({
    subjectId: roster.subjectIds[0], title: "Book", unitType: "pages", totalUnits: 100,
    startDate: "2026-11-02", endDate: "2026-11-27", childIds: roster.childIds, ...over,
  });
  const create = async (over: Record<string, unknown> = {}) => {
    const res = await req("POST", "/api/assignments", body(over));
    expect(res.statusCode, res.body).toBe(201);
    return res.json() as { id: string; weightPerUnit: number | null };
  };
  const getOne = async (id: string) => ((await req("GET", "/api/assignments")).json() as { id: string }[]).find((a) => a.id === id) as Record<string, unknown>;
  const patch = (id: string, b: Record<string, unknown>) => req("PATCH", `/api/assignments/${id}`, b);
  const planOf = async (id: string) => {
    const res = await req("GET", "/api/plan?from=2026-11-02&to=2026-11-27&asOf=2026-11-02");
    expect(res.statusCode).toBe(200);
    return (res.json().plans as ChildPlan[]).find((p) => p.assignmentId === id)!;
  };

  it("round trip: POST pages with 1.4 → 201, and GET shows 1.4", async () => {
    const a = await create({ weightPerUnit: 1.4 });
    expect(a.weightPerUnit).toBe(1.4);
    expect((await getOne(a.id)).weightPerUnit).toBe(1.4);
    const p = await planOf(a.id);
    expect([p.weightPerUnit, p.weightSource]).toEqual([1.4, "assignment"]);
  });

  it.each([0, -1, 0.001, 100.01, 1e9, "1.4"])("weightPerUnit %s → 400", async (w) => {
    const res = await req("POST", "/api/assignments", body({ weightPerUnit: w }));
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_request");
    expect(res.json().message).toMatch(/^weightPerUnit/);
  });

  it.each([0.01, 100, null])("weightPerUnit %s → 201", async (w) => {
    expect((await create({ weightPerUnit: w })).weightPerUnit).toBe(w);
  });

  it("minutes with 0.75 → 201, and the plan's thickness is minutes × 0.75 (30 min → 22.5)", async () => {
    const a = await create({ unitType: "minutes", totalUnits: 600, weightPerUnit: 0.75 });
    expect(a).toMatchObject({ weightPerUnit: 0.75 });
    const p = await planOf(a.id);
    expect([p.weightPerUnit, p.weightSource]).toEqual([0.75, "assignment"]);
    for (const d of p.days) expect(d.thickness).toBeCloseTo(d.units * 0.75, 9);
    expect(30 * p.weightPerUnit).toBe(22.5);
  });

  describe("a unit change on a pages row with weight 2", () => {
    it("{unitType: chapters} alone → 400 and nothing changes", async () => {
      const a = await create({ weightPerUnit: 2 });
      const res = await patch(a.id, { unitType: "chapters" });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: "invalid_request", message: "weightPerUnit: send a weight (or null) when changing unitType." });
      expect(await getOne(a.id)).toMatchObject({ unitType: "pages", weightPerUnit: 2 });
    });

    it("{unitType: chapters, weightPerUnit: 12} → 200", async () => {
      const a = await create({ weightPerUnit: 2 });
      const res = await patch(a.id, { unitType: "chapters", weightPerUnit: 12 });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ unitType: "chapters", weightPerUnit: 12 });
    });

    it("{unitType: minutes, weightPerUnit: null} → 200, and the plan uses the built-in 0.5", async () => {
      const a = await create({ weightPerUnit: 2 });
      const res = await patch(a.id, { unitType: "minutes", weightPerUnit: null });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ unitType: "minutes", weightPerUnit: null });
      const p = await planOf(a.id);
      expect([p.weightPerUnit, p.weightSource]).toEqual([0.5, "default"]);
    });

    it("a unit change on a row with no weight needs no weight", async () => {
      const a = await create();
      expect((await patch(a.id, { unitType: "lessons" })).statusCode).toBe(200);
    });
  });

  it("a title or archive edit leaves the weight unchanged", async () => {
    const a = await create({ weightPerUnit: 1.25 });
    expect((await patch(a.id, { title: "Renamed" })).json().weightPerUnit).toBe(1.25);
    expect((await patch(a.id, { archived: true })).json().weightPerUnit).toBe(1.25);
    expect((await patch(a.id, { archived: false })).json().weightPerUnit).toBe(1.25);
  });
});
