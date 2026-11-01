import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("POST /api/blocked-ranges/bulk (S5-04, integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let kids: string[] = [];
  let foreignKid = "";
  let req: ReturnType<typeof inject>;
  beforeAll(async () => {
    a = await signedInFamily(pool, "Days bulk A");
    b = await signedInFamily(pool, "Days bulk B");
    req = inject(app, a.cookies);
    kids = (await rosterFor(app, a.cookies, ["Frank", "Ada"], [])).childIds;
    foreignKid = (await rosterFor(app, b.cookies, ["Theirs"], [])).childIds[0]!;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  const item = (label: string, over: object = {}) => ({ label, kind: "holiday", startDate: "2026-11-26", endDate: "2026-11-27", childIds: [], ...over });
  const count = async () => (await pool.query("SELECT count(*)::int AS n FROM blocked_range WHERE family_id = $1", [a.familyId])).rows[0].n as number;
  const bulk = (blockedRanges: unknown, extra: object = {}) => req("POST", "/api/blocked-ranges/bulk", { blockedRanges, ...extra });

  it("3 valid items → 201 with 3 rows, in request order, and they show in the list", async () => {
    const before = await count();
    const res = await bulk([item("One"), item("Two", { kind: "vacation", startDate: "2026-12-24", endDate: "2027-01-01", childIds: [kids[1]] }), item("Three", { label: null })]);
    expect(res.statusCode).toBe(201);
    const j = res.json();
    expect(j.map((x: { label: string | null }) => x.label)).toEqual(["One", "Two", null]);
    expect(j[1]).toEqual({ id: expect.any(String), label: "Two", kind: "vacation", startDate: "2026-12-24", endDate: "2027-01-01", childIds: [kids[1]] });
    expect(j[0]).toMatchObject({ kind: "holiday", childIds: [] });
    expect(await count()).toBe(before + 3);
    const list = (await req("GET", "/api/blocked-ranges")).json().map((x: { id: string }) => x.id);
    for (const x of j) expect(list).toContain(x.id);
  });

  it("kind defaults to vacation like the single create", async () => {
    const res = await bulk([{ startDate: "2026-10-05", endDate: "2026-10-09" }]);
    expect(res.statusCode).toBe(201);
    expect(res.json()[0]).toMatchObject({ kind: "vacation", label: null, childIds: [] });
  });

  it("one bad item → 400 naming its position; nothing is created", async () => {
    const before = await count();
    const res = await bulk([item("One"), item("Two"), item("Three", { endDate: "2026-11-01" })]);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_range");
    expect(res.json().message).toMatch(/^Day off 3: /);
    const shape = await bulk([item("One"), item("Two", { kind: "someday" })]);
    expect(shape.statusCode).toBe(400);
    expect(shape.json().message).toMatch(/^Day off 2: kind/);
    const unknown = await bulk([item("One", { family_id: b.familyId })]);
    expect(unknown.statusCode).toBe(400);
    expect(unknown.json().message).toMatch(/^Day off 1: .*family_id/);
    expect(await count()).toBe(before);
  });

  it("a foreign child id fails the whole request and rolls back earlier items", async () => {
    const before = await count();
    const res = await bulk([item("One"), item("Two", { childIds: [foreignKid] })]);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_reference");
    expect(res.json().message).toMatch(/^Day off 2: childIds:/);
    expect(await count()).toBe(before);
  });

  it("0 items, 101 items, a missing or non-list body, an unknown field → 400; 100 is accepted", async () => {
    const before = await count();
    expect((await bulk([])).statusCode).toBe(400);
    expect((await bulk(Array.from({ length: 101 }, (_, i) => item(`N${i}`)))).statusCode).toBe(400);
    expect((await bulk("nope")).statusCode).toBe(400);
    expect((await req("POST", "/api/blocked-ranges/bulk", {})).statusCode).toBe(400);
    const extra = await bulk([item("One")], { familyId: b.familyId });
    expect(extra.statusCode).toBe(400);
    expect(extra.json().message).toMatch(/familyId/);
    expect(await count()).toBe(before);
    const ok = await bulk(Array.from({ length: 100 }, (_, i) => item(`Hundred ${i + 1}`)));
    expect(ok.statusCode).toBe(201);
    expect(ok.json()).toHaveLength(100);
    expect(await count()).toBe(before + 100);
  });

  it("signed out → 401", async () => {
    expect((await inject(app, null)("POST", "/api/blocked-ranges/bulk", { blockedRanges: [item("One")] })).statusCode).toBe(401);
  });
});
