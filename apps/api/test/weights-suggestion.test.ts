/** S2b-09: GET /api/weights/suggestion — learned (pages/chapters) → subject → built-in. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { weightSuggestion } from "../src/services/weightSuggestionService";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("GET /api/weights/suggestion (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  let other: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let ann = "", ben = "", cy = "", plain = "", withDefault = "", foreignKid = "", foreignSubject = "";

  const suggestion = (qs: string, cookies: { hh_session: string } | null = fam.cookies) =>
    app.inject({ method: "GET", url: `/api/weights/suggestion?${qs}`, ...(cookies ? { cookies } : {}) });
  const ok = async (qs: string) => {
    const res = await suggestion(qs);
    expect(res.statusCode, res.body).toBe(200);
    return res.json();
  };
  const create = async (childIds: string[], unitType: string, weightPerUnit: number) => {
    const res = await req("POST", "/api/assignments", {
      subjectId: plain, title: "Book", unitType, totalUnits: 40, startDate: "2026-11-02", endDate: "2026-11-27", childIds, weightPerUnit,
    });
    expect(res.statusCode, res.body).toBe(201);
  };

  beforeAll(async () => {
    fam = await signedInFamily(pool, "Suggest");
    other = await signedInFamily(pool, "Suggest other");
    req = inject(app, fam.cookies);
    const r = await rosterFor(app, fam.cookies, ["Ann", "Ben", "Cy"], ["Reading"]);
    [ann, ben, cy] = r.childIds as [string, string, string];
    plain = r.subjectIds[0]!;
    const s = await req("POST", "/api/subjects", { name: "Math", defaultWeight: { unitType: "pages", weightPerUnit: 2 } });
    withDefault = s.json().id;
    const o = await rosterFor(app, other.cookies, ["Zed"], ["Theirs"]);
    foreignKid = o.childIds[0]!;
    foreignSubject = o.subjectIds[0]!;
    for (const w of [1, 1.2, 1.4, 1.6, 9]) await create([ann], "pages", w);
    await create([ben], "pages", 2);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1::uuid[])", [[fam.familyId, other.familyId]]);
    await pool.end();
  });

  it.each([["pages", 1], ["chapters", 10], ["lessons", 15], ["minutes", 0.5]])("no history: %s → built-in %s", async (unitType, w) => {
    expect(await ok(`unitType=${unitType}&childIds=${cy}`)).toEqual({
      unitType, weightPerUnit: w, source: "builtin", builtInDefault: w, subjectDefault: null,
      learned: unitType === "pages" || unitType === "chapters",
      children: [{ childId: cy, name: "Cy", usual: null, choices: 0 }],
    });
  });

  it("no children at all → built-in, empty children", async () => {
    expect(await ok("unitType=pages")).toMatchObject({ weightPerUnit: 1, source: "builtin", children: [] });
    expect(await ok("unitType=pages&childIds=")).toMatchObject({ weightPerUnit: 1, children: [] });
  });

  it("history 1, 1.2, 1.4, 1.6, 9 → 1.4 child", async () => {
    expect(await ok(`unitType=pages&childIds=${ann}`)).toMatchObject({
      weightPerUnit: 1.4, source: "child", learned: true, children: [{ childId: ann, name: "Ann", usual: 1.4, choices: 5 }],
    });
  });

  it("two children → the median of their usual weights; a child without history is listed", async () => {
    const res = await ok(`unitType=pages&childIds=${ben},${ann},${cy}`);
    expect(res).toMatchObject({ weightPerUnit: 1.7, source: "children" });
    expect(res.children.map((c: { childId: string; usual: number | null }) => [c.childId, c.usual])).toEqual([[ben, 2], [ann, 1.4], [cy, null]]);
  });

  it("subject default pages 2: no history → subject; with history → learned (D19)", async () => {
    expect(await ok(`unitType=pages&childIds=${cy}&subjectId=${withDefault}`)).toMatchObject({
      weightPerUnit: 2, source: "subject", subjectDefault: { unitType: "pages", weightPerUnit: 2 },
    });
    expect(await ok(`unitType=pages&childIds=${ann}&subjectId=${withDefault}`)).toMatchObject({ weightPerUnit: 1.4, source: "child" });
    expect(await ok(`unitType=chapters&childIds=${cy}&subjectId=${withDefault}`)).toMatchObject({ weightPerUnit: 10, source: "builtin" });
  });

  it("lessons ignore history rows faked in the DB", async () => {
    // weight_choice rejects lessons, so drop that CHECK inside a transaction that's rolled back, and call the
    // service on the same client.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("ALTER TABLE weight_choice DROP CONSTRAINT weight_choice_unit_type_check");
      const a = (await client.query("SELECT assignment_id FROM weight_choice WHERE child_id = $1 LIMIT 1", [ann])).rows[0].assignment_id;
      await client.query(
        "INSERT INTO weight_choice (family_id, child_id, assignment_id, unit_type, weight) VALUES ($1, $2, $3, 'lessons', 40)",
        [fam.familyId, ann, a]);
      const lessons = await weightSuggestion(client, fam.familyId, { unitType: "lessons", childIds: [ann] });
      expect(lessons).toMatchObject({ weightPerUnit: 15, source: "builtin", learned: false, children: [{ childId: ann, usual: null, choices: 0 }] });
      await client.query("UPDATE subject SET default_weight_unit = 'lessons', default_weight = 20 WHERE id = $1", [plain]);
      const withSubject = await weightSuggestion(client, fam.familyId, { unitType: "lessons", childIds: [ann], subjectId: plain });
      expect(withSubject).toMatchObject({ weightPerUnit: 20, source: "subject", learned: false });
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("archived children and subjects are still used", async () => {
    const s = (await req("POST", "/api/subjects", { name: "Old", defaultWeight: { unitType: "chapters", weightPerUnit: 6 } })).json().id;
    const k = (await req("POST", "/api/children", { name: "Gone" })).json().id;
    expect((await req("PATCH", `/api/subjects/${s}`, { archived: true })).statusCode).toBe(200);
    expect((await req("PATCH", `/api/children/${k}`, { archived: true })).statusCode).toBe(200);
    expect(await ok(`unitType=chapters&childIds=${k}&subjectId=${s}`)).toMatchObject({
      weightPerUnit: 6, source: "subject", children: [{ childId: k, name: "Gone" }],
    });
  });

  it.each([
    ["a foreign child", () => `unitType=pages&childIds=${foreignKid}`],
    ["a foreign subject", () => `unitType=pages&subjectId=${foreignSubject}`],
    ["an unknown child id", () => "unitType=pages&childIds=00000000-0000-4000-8000-000000000000"],
  ])("%s → 400 invalid_reference", async (_l, qs) => {
    const res = await suggestion(qs());
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_reference");
  });

  it.each([
    ["no unitType", () => `childIds=${ann}`],
    ["a junk unitType", () => "unitType=hours"],
    ["a malformed child id", () => "unitType=pages&childIds=nope"],
    ["a repeated child id", () => `unitType=pages&childIds=${ann},${ann}`],
    ["a trailing comma", () => `unitType=pages&childIds=${ann},`],
    ["the param twice", () => `unitType=pages&childIds=${ann}&childIds=${ben}`],
    ["21 children", () => `unitType=pages&childIds=${Array.from({ length: 21 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`).join(",")}`],
    ["a malformed subject", () => "unitType=pages&subjectId=nope"],
    ["an extra param", () => "unitType=pages&includeArchived=true"],
  ])("%s → 400 invalid_request", async (_l, qs) => {
    const res = await suggestion(qs());
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_request");
  });

  it("signed out → 401", async () => {
    expect((await suggestion("unitType=pages", null)).statusCode).toBe(401);
  });

  it("writes nothing", async () => {
    const count = async () => (await pool.query(
      "SELECT (SELECT count(*) FROM weight_choice WHERE family_id = $1)::int AS c, (SELECT max(updated_at) FROM subject WHERE family_id = $1) AS s",
      [fam.familyId])).rows[0];
    const before = await count();
    await ok(`unitType=pages&childIds=${ann},${ben}&subjectId=${withDefault}`);
    expect(await count()).toEqual(before);
  });
});
