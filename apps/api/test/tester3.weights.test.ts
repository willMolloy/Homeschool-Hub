/**
 * Tester round 3 (S2b-16): weight edge cases end to end through the API and the DB. Independent of the developer's
 * assignments-weight / weight-choice-write / weights-suggestion suites. Engine side: packages/engine/test/tester.weights.test.ts.
 */
import type { ChildPlan } from "@hh/engine";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("tester round 3: weights (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let margaret = "", frank = "", subject = "";
  beforeAll(async () => {
    fam = await signedInFamily(pool, "Tester3 weights");
    req = inject(app, fam.cookies);
    const r = await rosterFor(app, fam.cookies, ["Margaret", "Frank"], ["Reading"]);
    [margaret, frank] = r.childIds as [string, string];
    subject = r.subjectIds[0]!;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });

  const body = (over: Record<string, unknown> = {}) => ({
    subjectId: subject, title: "Book", unitType: "pages", totalUnits: 100, startDate: "2026-11-02", endDate: "2026-11-27", childIds: [margaret], ...over,
  });
  const create = async (over: Record<string, unknown> = {}) => {
    const res = await req("POST", "/api/assignments", body(over));
    expect(res.statusCode, res.body).toBe(201);
    return res.json().id as string;
  };
  const patch = (id: string, b: Record<string, unknown>) => req("PATCH", `/api/assignments/${id}`, b);
  /** A raw JSON body, so -0 and 3-decimal literals reach the server exactly as typed. */
  const raw = (method: "POST" | "PATCH", url: string, json: string) =>
    app.inject({ method, url, payload: json, headers: { "content-type": "application/json" }, cookies: fam.cookies });
  const suggest = async (qs: string) => {
    const res = await req("GET", `/api/weights/suggestion?${qs}`);
    expect(res.statusCode, res.body).toBe(200);
    return res.json();
  };
  const historyOf = async (assignmentId: string) => (await pool.query(
    "SELECT child_id, unit_type, weight::float8 AS w FROM weight_choice WHERE assignment_id = $1 ORDER BY id", [assignmentId])).rows;
  const count = async () => (await pool.query("SELECT count(*)::int AS n FROM assignment WHERE family_id = $1", [fam.familyId])).rows[0].n as number;
  const plans = async () => {
    const res = await req("GET", "/api/plan?from=2026-11-02&to=2026-11-27&asOf=2026-11-02");
    expect(res.statusCode).toBe(200);
    return res.json().plans as ChildPlan[];
  };

  describe("case 1: zero, negative or huge weights", () => {
    const BAD = ["0", "-1", "-0", "0.001", "100.01", "1e308", "\"1.4\"", "1.234", "1e999"];
    it.each(BAD)("POST weightPerUnit %s → 400, nothing written", async (lit) => {
      const before = await count();
      const json = JSON.stringify(body({ weightPerUnit: "__W__" })).replace("\"__W__\"", lit);
      const res = await raw("POST", "/api/assignments", json);
      expect(res.statusCode, res.body).toBe(400);
      expect(res.json().message).toMatch(/^weightPerUnit/);
      expect(await count()).toBe(before);
    });
    it.each(BAD)("PATCH weightPerUnit %s → 400, the stored weight is unchanged", async (lit) => {
      const id = await create({ weightPerUnit: 2 });
      const res = await raw("PATCH", `/api/assignments/${id}`, `{"weightPerUnit":${lit}}`);
      expect(res.statusCode, res.body).toBe(400);
      expect((await pool.query("SELECT weight_per_unit::float8 AS w FROM assignment WHERE id = $1", [id])).rows[0].w).toBe(2);
    });

    it("the DB CHECK rejects 0, -1, -0, 0.001 (rounds to 0) and 100.01; 1e308 overflows the column", async () => {
      const id = await create();
      const set = (v: string) => pool.query(`UPDATE assignment SET weight_per_unit = ${v} WHERE id = $1`, [id]);
      for (const v of ["0", "-1", "-0", "0.001", "100.01", "100.005"]) await expect(set(v)).rejects.toMatchObject({ code: "23514" });
      await expect(set("1e308")).rejects.toMatchObject({ code: "22003" });
    });

    it("finding T3-1: the DB rounds 3 decimals instead of rejecting them (numeric(6,2)); only the API stops them", async () => {
      const id = await create();
      await pool.query("UPDATE assignment SET weight_per_unit = 1.234 WHERE id = $1", [id]);
      expect((await pool.query("SELECT weight_per_unit::float8 AS w FROM assignment WHERE id = $1", [id])).rows[0].w).toBe(1.23);
    });

    it("weight 100 × 100 000 units → 201 and a finite plan", async () => {
      const id = await create({ totalUnits: 100_000, weightPerUnit: 100 });
      const p = (await plans()).find((x) => x.assignmentId === id)!;
      expect(p.weightPerUnit).toBe(100);
      for (const d of p.days) {
        expect(Number.isFinite(d.thickness)).toBe(true);
        expect(d.thickness).toBeCloseTo(d.units * 100, 6);
      }
      expect(p.days.reduce((s, d) => s + d.units, 0)).toBeCloseTo(100_000, 6);
    });
  });

  describe("case 2: scale (D1) through /api/plan", () => {
    it("30 min a day of piano (no weight) and 15 pages a day at weight 1 → 15 vs 15", async () => {
      // 2026-11-02..27 Mon–Fri = 20 school days
      const piano = await create({ title: "Piano", unitType: "minutes", totalUnits: 600, childIds: [frank] });
      const pages = await create({ title: "Read", unitType: "pages", totalUnits: 300, weightPerUnit: 1, childIds: [frank] });
      const all = await plans();
      const on = (id: string) => all.find((p) => p.assignmentId === id)!.days.find((d) => d.date === "2026-11-04")!;
      expect(on(piano)).toMatchObject({ units: 30, thickness: 15 });
      expect(on(pages)).toMatchObject({ units: 15, thickness: 15 });
      expect(all.find((p) => p.assignmentId === piano)).toMatchObject({ weightPerUnit: 0.5, weightSource: "default" });
    });
  });

  describe("case 3: archived child", () => {
    it("a suggestion uses their history, a create for them is 400, and unarchiving keeps the history", async () => {
      const kid = (await req("POST", "/api/children", { name: "Archie" })).json().id as string;
      await create({ childIds: [kid], weightPerUnit: 3 });
      expect((await req("PATCH", `/api/children/${kid}`, { archived: true })).statusCode).toBe(200);
      expect(await suggest(`unitType=pages&childIds=${kid}`)).toMatchObject({ weightPerUnit: 3, source: "child", children: [{ childId: kid, usual: 3, choices: 1 }] });
      const res = await req("POST", "/api/assignments", body({ childIds: [kid], weightPerUnit: 2 }));
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("invalid_reference");
      expect((await req("PATCH", `/api/children/${kid}`, { archived: false })).statusCode).toBe(200);
      expect(await suggest(`unitType=pages&childIds=${kid}`)).toMatchObject({ weightPerUnit: 3, children: [{ usual: 3, choices: 1 }] });
    });
  });

  describe("case 4: no history", () => {
    let fresh = "";
    beforeAll(async () => { fresh = (await req("POST", "/api/children", { name: "Newbie" })).json().id; });
    it.each([["pages", 1], ["chapters", 10], ["lessons", 15], ["minutes", 0.5]])("%s → the built-in %s", async (unitType, w) => {
      expect(await suggest(`unitType=${unitType}&childIds=${fresh}`)).toMatchObject({ weightPerUnit: w, source: "builtin", builtInDefault: w, children: [{ usual: null, choices: 0 }] });
    });
    it("the first explicit pages save creates history, and the next add suggests it", async () => {
      await create({ childIds: [fresh] }); // no weight: no history
      expect(await suggest(`unitType=pages&childIds=${fresh}`)).toMatchObject({ source: "builtin" });
      const id = await create({ childIds: [fresh], weightPerUnit: 1.6 });
      expect(await historyOf(id)).toEqual([{ child_id: fresh, unit_type: "pages", w: 1.6 }]);
      expect(await suggest(`unitType=pages&childIds=${fresh}`)).toMatchObject({ weightPerUnit: 1.6, source: "child" });
    });
  });

  describe("case 5: trimmed mean through real saves", () => {
    let kid = "";
    const next = async () => (await suggest(`unitType=chapters&childIds=${kid}`)).weightPerUnit as number;
    beforeAll(async () => { kid = (await req("POST", "/api/children", { name: "Trim" })).json().id; });
    it("3 → plain mean; 4 → middle two; 5 with an outlier → ignored; 6 → oldest ignored", async () => {
      const ids: string[] = [];
      for (const w of [50, 2, 4]) ids.push(await create({ unitType: "chapters", totalUnits: 10, childIds: [kid], weightPerUnit: w }));
      expect(await next()).toBe(18.67);
      ids.push(await create({ unitType: "chapters", totalUnits: 10, childIds: [kid], weightPerUnit: 6 }));
      expect(await next()).toBe(5); // [2,4,6,50] → mean(4,6)
      ids.push(await create({ unitType: "chapters", totalUnits: 10, childIds: [kid], weightPerUnit: 5 }));
      expect(await next()).toBe(5); // [2,4,5,6,50] → mean(4,5,6)
      ids.push(await create({ unitType: "chapters", totalUnits: 10, childIds: [kid], weightPerUnit: 3 }));
      expect(await next()).toBe(4); // oldest 50 out: [2,3,4,5,6] → mean(3,4,5)
      // repeated edits of one assignment count once
      for (const w of [9, 9.5, 3]) expect((await patch(ids[5]!, { weightPerUnit: w })).statusCode).toBe(200);
      expect(await next()).toBe(4);
      // a clear removes that vote: [2,4,5,6] (+ 50 back in the window of 5) → [2,4,5,6,50] → 5
      expect((await patch(ids[5]!, { weightPerUnit: null })).statusCode).toBe(200);
      expect(await next()).toBe(5);
    });
  });

  describe("case 6: learned units only (D17)", () => {
    it("lessons and minutes saves write no history; chapters do", async () => {
      expect(await historyOf(await create({ unitType: "lessons", totalUnits: 20, weightPerUnit: 20 }))).toEqual([]);
      expect(await historyOf(await create({ unitType: "minutes", totalUnits: 600, weightPerUnit: 1 }))).toEqual([]);
      const ch = await create({ unitType: "chapters", totalUnits: 10, weightPerUnit: 7 });
      expect(await historyOf(ch)).toEqual([{ child_id: margaret, unit_type: "chapters", w: 7 }]);
      const id = await create({ unitType: "lessons", totalUnits: 20, weightPerUnit: 20 });
      expect((await patch(id, { weightPerUnit: 22 })).statusCode).toBe(200);
      expect(await historyOf(id)).toEqual([]);
      expect(await suggest(`unitType=lessons&childIds=${margaret}`)).toMatchObject({ weightPerUnit: 15, source: "builtin", learned: false });
    });
    it("the DB refuses a lessons or minutes history row", async () => {
      const a = await create();
      for (const u of ["lessons", "minutes"]) {
        await expect(pool.query("INSERT INTO weight_choice (family_id, child_id, assignment_id, unit_type, weight) VALUES ($1,$2,$3,$4,2)",
          [fam.familyId, margaret, a, u])).rejects.toMatchObject({ code: "23514" });
      }
    });
  });

  describe("case 7: multi-child", () => {
    let m = "", f = "", g = "";
    beforeAll(async () => {
      [m, f, g] = (await Promise.all(["M7", "F7", "G7"].map(async (name) => (await req("POST", "/api/children", { name })).json().id as string))) as [string, string, string];
      await create({ childIds: [m], weightPerUnit: 1.4 });
      await create({ childIds: [g], weightPerUnit: 2.2 });
    });
    it("history + none → that child's value; the other is listed without", async () => {
      expect(await suggest(`unitType=pages&childIds=${m},${f}`)).toMatchObject({
        weightPerUnit: 1.4, source: "child", children: [{ childId: m, usual: 1.4 }, { childId: f, usual: null }],
      });
    });
    it("both with history → the median of their values", async () => {
      expect(await suggest(`unitType=pages&childIds=${m},${g}`)).toMatchObject({ weightPerUnit: 1.8, source: "children" });
    });
    it("saving 2.0 records a choice for both", async () => {
      const id = await create({ childIds: [m, f], weightPerUnit: 2.0 });
      expect((await historyOf(id)).map((r) => [r.child_id, r.w]).sort()).toEqual([[m, 2], [f, 2]].sort());
      expect(await suggest(`unitType=pages&childIds=${f}`)).toMatchObject({ weightPerUnit: 2, source: "child" });
    });
  });

  describe("case 8: unit change on edit", () => {
    it("pages(2) → chapters: alone 400; with a weight 200 and filed under chapters", async () => {
      const id = await create({ weightPerUnit: 2 });
      expect((await patch(id, { unitType: "chapters" })).statusCode).toBe(400);
      expect(await historyOf(id)).toEqual([{ child_id: margaret, unit_type: "pages", w: 2 }]);
      const ok = await patch(id, { unitType: "chapters", weightPerUnit: 12 });
      expect(ok.statusCode).toBe(200);
      expect(ok.json()).toMatchObject({ unitType: "chapters", weightPerUnit: 12 });
      expect((await historyOf(id)).at(-1)).toEqual({ child_id: margaret, unit_type: "chapters", w: 12 });
    });
    it("pages(2) → minutes with null → 200 and no new history row", async () => {
      const id = await create({ weightPerUnit: 2 });
      const before = await historyOf(id);
      const ok = await patch(id, { unitType: "minutes", weightPerUnit: null });
      expect(ok.statusCode).toBe(200);
      expect(ok.json()).toMatchObject({ unitType: "minutes", weightPerUnit: null });
      expect((await historyOf(id)).filter((r) => r.unit_type === "minutes")).toEqual([]);
      expect((await historyOf(id)).length).toBeLessThanOrEqual(before.length + 1); // at most a pages clear
    });
  });

  describe("case 10: logged hours", () => {
    it("no field anywhere in /api/plan or /api/assignments mentions minutes (the unit value \"minutes\" is data)", async () => {
      const keys = new Set<string>();
      const walk = (v: unknown) => {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { keys.add(k); walk(x); }
      };
      walk(await plans());
      walk((await req("GET", "/api/assignments?includeArchived=true")).json());
      expect(keys.size).toBeGreaterThan(10);
      expect([...keys].filter((k) => /minute/i.test(k))).toEqual([]);
    });
  });
});
