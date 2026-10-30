import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("POST /api/assignments/bulk (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let kids: string[] = [];
  let subject = "";
  let foreignKid = "";
  let req: ReturnType<typeof inject>;
  beforeAll(async () => {
    a = await signedInFamily(pool, "Bulk A");
    b = await signedInFamily(pool, "Bulk B");
    req = inject(app, a.cookies);
    const r = await rosterFor(app, a.cookies, ["Frank", "Ada"], ["Math"]);
    kids = r.childIds;
    subject = r.subjectIds[0]!;
    foreignKid = (await rosterFor(app, b.cookies, ["Theirs"], ["TheirMath"])).childIds[0]!;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  const item = (title: string, over: object = {}) => ({
    subjectId: subject, title, unitType: "lessons", totalUnits: 20, weightPerUnit: null,
    startDate: "2026-11-02", endDate: "2026-11-27", childIds: [kids[0]], ...over,
  });
  const count = async () => (await pool.query("SELECT count(*)::int AS n FROM assignment WHERE family_id = $1", [a.familyId])).rows[0].n as number;
  const bulk = (assignments: unknown, extra: object = {}) => req("POST", "/api/assignments/bulk", { assignments, ...extra });

  it("3 valid items → 201 with 3 rows, in request order", async () => {
    const before = await count();
    const res = await bulk([item("One"), item("Two", { childIds: kids }), item("Three", { weightPerUnit: 15 })]);
    expect(res.statusCode).toBe(201);
    const j = res.json();
    expect(j.map((x: { title: string }) => x.title)).toEqual(["One", "Two", "Three"]);
    expect(j[1]).toEqual({ id: expect.any(String), subjectId: subject, title: "Two", unitType: "lessons", totalUnits: 20, weightPerUnit: null,
      startDate: "2026-11-02", endDate: "2026-11-27", childIds: kids, archived: false });
    expect(await count()).toBe(before + 3);
    const list = (await req("GET", "/api/assignments")).json().map((x: { id: string }) => x.id);
    for (const x of j) expect(list).toContain(x.id);
  });

  it("one bad item → 400 naming its position; nothing is created", async () => {
    const before = await count();
    const res = await bulk([item("One"), item("Two"), item("Three", { endDate: "2026-11-01" })]);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_range");
    expect(res.json().message).toMatch(/^Assignment 3: /);
    const shape = await bulk([item("One"), item("", {})]);
    expect(shape.statusCode).toBe(400);
    expect(shape.json().error).toBe("invalid_request");
    expect(shape.json().message).toMatch(/^Assignment 2: title/);
    expect(await count()).toBe(before);
  });

  it("an item with an unknown field → 400 naming the item", async () => {
    const before = await count();
    const res = await bulk([item("One"), item("Two", { family_id: b.familyId })]);
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/^Assignment 2: .*family_id/);
    expect(await count()).toBe(before);
  });

  it("a foreign child id fails the whole request and rolls back earlier items", async () => {
    const before = await count();
    const res = await bulk([item("One"), item("Two", { childIds: [foreignKid] })]);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_reference");
    expect(res.json().message).toMatch(/^Assignment 2: childIds:/);
    expect(await count()).toBe(before);
  });

  it("0 items, 51 items, a missing or non-list body → 400", async () => {
    const before = await count();
    expect((await bulk([])).statusCode).toBe(400);
    expect((await bulk(Array.from({ length: 51 }, (_, i) => item(`N${i}`)))).statusCode).toBe(400);
    expect((await bulk("nope")).statusCode).toBe(400);
    expect((await req("POST", "/api/assignments/bulk", {})).statusCode).toBe(400);
    expect(await count()).toBe(before);
  });

  it("50 items is accepted", async () => {
    const before = await count();
    const res = await bulk(Array.from({ length: 50 }, (_, i) => item(`Fifty ${i + 1}`)));
    expect(res.statusCode).toBe(201);
    expect(res.json()).toHaveLength(50);
    expect(await count()).toBe(before + 50);
  });

  it("an unknown top-level field → 400", async () => {
    const before = await count();
    const res = await bulk([item("One")], { familyId: b.familyId });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/familyId/);
    expect(await count()).toBe(before);
  });

  it("signed out → 401", async () => {
    expect((await inject(app, null)("POST", "/api/assignments/bulk", { assignments: [item("One")] })).statusCode).toBe(401);
  });

  it("records weight choices like a single create: one row per child for an item with a weight", async () => {
    const before = (await pool.query("SELECT count(*)::int AS n FROM weight_choice WHERE family_id = $1", [a.familyId])).rows[0].n as number;
    const res = await bulk([item("Weighted", { unitType: "pages", weightPerUnit: 1.4, childIds: kids }), item("Default")]);
    expect(res.statusCode).toBe(201);
    const id = res.json()[0].id as string;
    const { rows } = await pool.query("SELECT child_id, unit_type, weight::float8 AS w FROM weight_choice WHERE assignment_id = $1", [id]);
    expect(rows.map((r) => r.child_id).sort()).toEqual([...kids].sort());
    expect(rows.every((r) => r.unit_type === "pages" && r.w === 1.4)).toBe(true);
    const after = (await pool.query("SELECT count(*)::int AS n FROM weight_choice WHERE family_id = $1", [a.familyId])).rows[0].n as number;
    expect(after).toBe(before + 2);
  });
});
