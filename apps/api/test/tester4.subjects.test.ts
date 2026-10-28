/**
 * Tester round 4 (S2b-37): subject default weights and the full precedence, end to end through the API and the DB.
 * Plan precedence: assignment → subject (same unit) → built-in. Suggestion precedence (D6, D19): learned
 * (pages/chapters only) → subject → built-in. Engine half: packages/engine/test/tester.subjects.test.ts; picker
 * presets: apps/web/test/tester4.picker.test.ts.
 */
import type { ChildPlan } from "@hh/engine";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { loadPlanInputs } from "../src/plan/loadPlanInputs";
import { weightSuggestion } from "../src/services/weightSuggestionService";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

type Unit = "pages" | "chapters" | "lessons" | "minutes";

describe.skipIf(!hasDb)("tester round 4: subject defaults and precedence (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let ann = "", ben = "", plain = "";
  beforeAll(async () => {
    fam = await signedInFamily(pool, "Tester4 subjects");
    req = inject(app, fam.cookies);
    const r = await rosterFor(app, fam.cookies, ["Ann", "Ben"], ["Plain"]);
    [ann, ben] = r.childIds as [string, string];
    plain = r.subjectIds[0]!;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });

  const subject = async (name: string, defaultWeight: { unitType: Unit; weightPerUnit: number } | null) => {
    const res = await req("POST", "/api/subjects", { name, defaultWeight });
    expect(res.statusCode, res.body).toBe(201);
    return res.json().id as string;
  };
  const create = async (subjectId: string, unitType: Unit, childIds: string[], weightPerUnit?: number | null) => {
    const res = await req("POST", "/api/assignments", {
      subjectId, title: `${unitType} book`, unitType, totalUnits: 40, startDate: "2026-11-02", endDate: "2026-11-27", childIds,
      ...(weightPerUnit !== undefined ? { weightPerUnit } : {}),
    });
    expect(res.statusCode, res.body).toBe(201);
    return res.json().id as string;
  };
  const suggest = async (qs: string) => {
    const res = await req("GET", `/api/weights/suggestion?${qs}`);
    expect(res.statusCode, res.body).toBe(200);
    return res.json();
  };
  const plans = async () => {
    const res = await req("GET", "/api/plan?from=2026-11-02&to=2026-11-27&asOf=2026-11-02");
    expect(res.statusCode, res.body).toBe(200);
    return res.json().plans as ChildPlan[];
  };
  const planOf = async (assignmentId: string) => (await plans()).find((p) => p.assignmentId === assignmentId);
  const resolved = async (assignmentId: string) => {
    const p = await planOf(assignmentId);
    expect(p, "assignment should be planned").toBeDefined();
    for (const d of p!.days) expect(d.thickness).toBeCloseTo(d.units * p!.weightPerUnit, 6);
    return { weightPerUnit: p!.weightPerUnit, weightSource: p!.weightSource };
  };

  describe("case 1: precedence matrix", () => {
    it.each([["pages", 2, 1.4, 1], ["chapters", 8, 12, 10]] as const)(
      "%s: explicit > learned > subject > built-in",
      async (unit, subjectW, learnedW, builtIn) => {
        const withDefault = await subject(`Default ${unit}`, { unitType: unit, weightPerUnit: subjectW });
        const kid = (await req("POST", "/api/children", { name: `Hist ${unit}` })).json().id as string;
        const fresh = (await req("POST", "/api/children", { name: `Fresh ${unit}` })).json().id as string;
        await create(plain, unit, [kid], learnedW); // history for kid only

        // history + subject → learned (D19): the suggestion prefills the child's value, which saves as explicit
        expect(await suggest(`unitType=${unit}&childIds=${kid}&subjectId=${withDefault}`))
          .toMatchObject({ weightPerUnit: learnedW, source: "child", learned: true, subjectDefault: { unitType: unit, weightPerUnit: subjectW } });
        // history + subject + explicit → explicit (in the plan; this save also becomes history)
        const explicit = await create(withDefault, unit, [kid], 3);
        expect(await resolved(explicit)).toEqual({ weightPerUnit: 3, weightSource: "assignment" });
        // subject only → subject (suggestion and plan)
        expect(await suggest(`unitType=${unit}&childIds=${fresh}&subjectId=${withDefault}`)).toMatchObject({ weightPerUnit: subjectW, source: "subject" });
        expect(await resolved(await create(withDefault, unit, [fresh], null))).toEqual({ weightPerUnit: subjectW, weightSource: "subject" });
        // nothing → built-in
        expect(await suggest(`unitType=${unit}&childIds=${fresh}&subjectId=${plain}`)).toMatchObject({ weightPerUnit: builtIn, source: "builtin" });
        expect(await resolved(await create(plain, unit, [fresh]))).toEqual({ weightPerUnit: builtIn, weightSource: "default" });
      });

    it.each([["lessons", 15, 20], ["minutes", 0.5, 0.75]] as const)(
      "%s: history rows faked in the DB are ignored (subject, else built-in)",
      async (unit, builtIn, subjectW) => {
        const withDefault = await subject(`Default ${unit}`, { unitType: unit, weightPerUnit: subjectW });
        const target = await create(plain, unit, [ann], null);
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await client.query("ALTER TABLE weight_choice DROP CONSTRAINT weight_choice_unit_type_check");
          for (const w of [40, 41, 42]) {
            await client.query("INSERT INTO weight_choice (family_id, child_id, assignment_id, unit_type, weight) VALUES ($1, $2, $3, $4, $5)",
              [fam.familyId, ann, target, unit, w]);
          }
          expect(await weightSuggestion(client, fam.familyId, { unitType: unit, childIds: [ann] }))
            .toMatchObject({ weightPerUnit: builtIn, source: "builtin", learned: false, children: [{ childId: ann, usual: null }] });
          expect(await weightSuggestion(client, fam.familyId, { unitType: unit, childIds: [ann], subjectId: withDefault }))
            .toMatchObject({ weightPerUnit: subjectW, source: "subject", learned: false });
        } finally {
          await client.query("ROLLBACK");
          client.release();
        }
        // the plan never reads history: built-in in Plain, subject default in the subject
        expect(await resolved(target)).toEqual({ weightPerUnit: builtIn, weightSource: "default" });
        expect(await resolved(await create(withDefault, unit, [ann], null))).toEqual({ weightPerUnit: subjectW, weightSource: "subject" });
      });
  });

  describe("case 2: live subject default (D20)", () => {
    it("a null-weight assignment follows a subject change on the next plan; learned or explicit ones don't", async () => {
      const s = await subject("Live", { unitType: "pages", weightPerUnit: 2 });
      const kid = (await req("POST", "/api/children", { name: "Live kid" })).json().id as string;
      await create(plain, "pages", [kid], 1.6); // history 1.6
      const follows = await create(s, "pages", [ben], null);
      const learned = (await suggest(`unitType=pages&childIds=${kid}&subjectId=${s}`)).weightPerUnit as number;
      expect(learned).toBe(1.6);
      const tookLearned = await create(s, "pages", [kid], learned);
      const explicit = await create(s, "pages", [ben], 4);
      expect(await resolved(follows)).toEqual({ weightPerUnit: 2, weightSource: "subject" });

      expect((await req("PATCH", `/api/subjects/${s}`, { defaultWeight: { unitType: "pages", weightPerUnit: 3.5 } })).statusCode).toBe(200);
      expect(await resolved(follows)).toEqual({ weightPerUnit: 3.5, weightSource: "subject" });
      expect(await resolved(tookLearned)).toEqual({ weightPerUnit: 1.6, weightSource: "assignment" });
      expect(await resolved(explicit)).toEqual({ weightPerUnit: 4, weightSource: "assignment" });

      // switching the default to another unit, then clearing it → built-in
      expect((await req("PATCH", `/api/subjects/${s}`, { defaultWeight: { unitType: "lessons", weightPerUnit: 20 } })).statusCode).toBe(200);
      expect(await resolved(follows)).toEqual({ weightPerUnit: 1, weightSource: "default" });
      expect((await req("PATCH", `/api/subjects/${s}`, { defaultWeight: null })).statusCode).toBe(200);
      expect(await resolved(follows)).toEqual({ weightPerUnit: 1, weightSource: "default" });
      expect(await resolved(explicit)).toEqual({ weightPerUnit: 4, weightSource: "assignment" });
    });
  });

  describe("case 3: unit mismatch", () => {
    it("Math's lessons default doesn't apply to a Math pages assignment (plan or suggestion)", async () => {
      const math = await subject("Math", { unitType: "lessons", weightPerUnit: 20 });
      const fresh = (await req("POST", "/api/children", { name: "Mismatch" })).json().id as string;
      expect(await resolved(await create(math, "pages", [fresh], null))).toEqual({ weightPerUnit: 1, weightSource: "default" });
      expect(await resolved(await create(math, "lessons", [fresh], null))).toEqual({ weightPerUnit: 20, weightSource: "subject" });
      expect(await suggest(`unitType=pages&childIds=${fresh}&subjectId=${math}`))
        .toMatchObject({ weightPerUnit: 1, source: "builtin", subjectDefault: { unitType: "lessons", weightPerUnit: 20 } });
    });
  });

  describe("case 4: bad subject values", () => {
    const BAD = [
      ["0", '{"unitType":"pages","weightPerUnit":0}'],
      ["-1", '{"unitType":"pages","weightPerUnit":-1}'],
      ["101", '{"unitType":"pages","weightPerUnit":101}'],
      ["3 decimals", '{"unitType":"pages","weightPerUnit":1.234}'],
      ["a missing unit", '{"weightPerUnit":2}'],
      ["a null unit", '{"unitType":null,"weightPerUnit":2}'],
      ["a string weight", '{"unitType":"pages","weightPerUnit":"2"}'],
    ] as const;
    const raw = (method: "POST" | "PATCH", url: string, json: string) =>
      app.inject({ method, url, payload: json, headers: { "content-type": "application/json" }, cookies: fam.cookies });
    const stored = async (id: string) => (await pool.query(
      "SELECT default_weight_unit AS u, default_weight::float8 AS w FROM subject WHERE id = $1", [id])).rows[0];

    it.each(BAD)("%s → 400 on create (nothing written) and on PATCH (unchanged)", async (_label, dw) => {
      const before = (await pool.query("SELECT count(*)::int AS n FROM subject WHERE family_id = $1", [fam.familyId])).rows[0].n;
      const res = await raw("POST", "/api/subjects", `{"name":"Bad","defaultWeight":${dw}}`);
      expect(res.statusCode, res.body).toBe(400);
      expect((await pool.query("SELECT count(*)::int AS n FROM subject WHERE family_id = $1", [fam.familyId])).rows[0].n).toBe(before);
      const id = await subject(`Keep ${_label}`, { unitType: "chapters", weightPerUnit: 6 });
      expect((await raw("PATCH", `/api/subjects/${id}`, `{"defaultWeight":${dw}}`)).statusCode).toBe(400);
      expect(await stored(id)).toEqual({ u: "chapters", w: 6 });
    });

    it("the DB CHECKs reject 0, -1, 101, a weight without a unit, a unit without a weight, and an unknown unit", async () => {
      const id = await subject("DB checks", null);
      const set = (u: string, w: string) => pool.query(`UPDATE subject SET default_weight_unit = ${u}, default_weight = ${w} WHERE id = $1`, [id]);
      for (const [u, w] of [["'pages'", "0"], ["'pages'", "-1"], ["'pages'", "101"], ["NULL", "2"], ["'pages'", "NULL"]]) {
        await expect(set(u!, w!)).rejects.toMatchObject({ code: "23514" });
      }
      await expect(set("'hours'", "2")).rejects.toMatchObject({ code: "23514" });
      expect(await stored(id)).toEqual({ u: null, w: null });
    });

    it("finding T4-1: like assignments (T3-1), the DB rounds a 3-decimal subject weight instead of rejecting it", async () => {
      const id = await subject("Rounds", null);
      await pool.query("UPDATE subject SET default_weight_unit = 'pages', default_weight = 1.234 WHERE id = $1", [id]);
      expect(await stored(id)).toEqual({ u: "pages", w: 1.23 });
    });
  });

  describe("case 5: archived subject", () => {
    it("its default is still loaded and used by suggestions; its assignments sit out of the plan until unarchived, then use it", async () => {
      const s = await subject("Archived", { unitType: "chapters", weightPerUnit: 6 });
      const a = await create(s, "chapters", [ben], null);
      expect(await resolved(a)).toEqual({ weightPerUnit: 6, weightSource: "subject" });
      expect((await req("PATCH", `/api/subjects/${s}`, { archived: true })).statusCode).toBe(200);

      // Sprint 1 rule: archived subjects' assignments aren't planned. S2b-33 still loads the default.
      expect(await planOf(a)).toBeUndefined();
      const inputs = await loadPlanInputs(pool, fam.familyId);
      expect(inputs.ctx.subjectWeights).toContainEqual({ subjectId: s, unitType: "chapters", weightPerUnit: 6 });
      expect(await suggest(`unitType=chapters&childIds=${ben}&subjectId=${s}`)).toMatchObject({ weightPerUnit: 6, source: "subject" });

      expect((await req("PATCH", `/api/subjects/${s}`, { archived: false })).statusCode).toBe(200);
      expect(await resolved(a)).toEqual({ weightPerUnit: 6, weightSource: "subject" });
    });
  });

  describe("case 6: multi-child + subject, neither child has history", () => {
    it("→ the subject default, with both children listed without history (the hint's input)", async () => {
      const s = await subject("Together", { unitType: "pages", weightPerUnit: 2.5 });
      const [x, y] = [
        (await req("POST", "/api/children", { name: "Xan" })).json().id as string,
        (await req("POST", "/api/children", { name: "Yan" })).json().id as string,
      ];
      expect(await suggest(`unitType=pages&childIds=${x},${y}&subjectId=${s}`)).toEqual({
        unitType: "pages", weightPerUnit: 2.5, source: "subject", builtInDefault: 1, subjectDefault: { unitType: "pages", weightPerUnit: 2.5 },
        learned: true, children: [{ childId: x, name: "Xan", usual: null, choices: 0 }, { childId: y, name: "Yan", usual: null, choices: 0 }],
      });
      const id = await create(s, "pages", [x, y], null);
      const both = (await plans()).filter((p) => p.assignmentId === id);
      expect(both.map((p) => [p.childId, p.weightPerUnit, p.weightSource]).sort()).toEqual([[x, 2.5, "subject"], [y, 2.5, "subject"]].sort());
    });
  });
});
