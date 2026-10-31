/** S6-05: creating an assignment (single and bulk) stores its values as `original`; a family has at most one undo entry. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("assignment.original (S6-05, integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let kids: string[] = [];
  let subject = "";
  const body = (over: object = {}) => ({
    subjectId: subject, title: "Spelling", unitType: "pages", totalUnits: 40, weightPerUnit: 1.5, weekdays: [1, 3],
    startDate: "2026-11-02", endDate: "2026-11-13", childIds: kids, ...over,
  });
  const originalOf = async (id: string) => (await pool.query("SELECT original FROM assignment WHERE id = $1", [id])).rows[0].original;

  beforeAll(async () => {
    a = await signedInFamily(pool, "Original A");
    req = inject(app, a.cookies);
    const r = await rosterFor(app, a.cookies, ["Ada", "Ben"], ["Spelling"]);
    kids = r.childIds;
    subject = r.subjectIds[0]!;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [a.familyId]);
    await pool.end();
  });

  it("a created assignment keeps its created values", async () => {
    const res = await req("POST", "/api/assignments", body());
    expect(res.statusCode).toBe(201);
    expect(await originalOf(res.json().id)).toEqual({
      title: "Spelling", subjectId: subject, unitType: "pages", totalUnits: 40, weightPerUnit: 1.5, weekdays: [1, 3],
      startDate: "2026-11-02", endDate: "2026-11-13", childIds: kids,
    });
  });

  it("no weight and no days are stored as null", async () => {
    const res = await req("POST", "/api/assignments", body({ weightPerUnit: null, weekdays: undefined }));
    expect(await originalOf(res.json().id)).toMatchObject({ weightPerUnit: null, weekdays: null });
  });

  it("bulk create stores each item's own original", async () => {
    const res = await req("POST", "/api/assignments/bulk", { assignments: [body({ title: "One", totalUnits: 5 }), body({ title: "Two", childIds: [kids[0]], unitType: "lessons" })] });
    expect(res.statusCode).toBe(201);
    const [one, two] = res.json();
    expect(await originalOf(one.id)).toMatchObject({ title: "One", totalUnits: 5, childIds: kids });
    expect(await originalOf(two.id)).toMatchObject({ title: "Two", unitType: "lessons", childIds: [kids[0]] });
  });

  it("editing later leaves the original alone", async () => {
    const id = (await req("POST", "/api/assignments", body({ title: "Stays" }))).json().id;
    await req("PATCH", `/api/assignments/${id}`, { title: "Changed", endDate: "2026-11-20", totalUnits: 80 });
    expect(await originalOf(id)).toMatchObject({ title: "Stays", endDate: "2026-11-13", totalUnits: 40 });
  });
});
