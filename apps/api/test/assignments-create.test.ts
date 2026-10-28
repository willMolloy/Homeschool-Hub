import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { PlanResponse } from "../src/routes/plan";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("POST /api/assignments (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let kids: string[] = [];
  let subject = "";
  let archivedKid = "";
  let archivedSubject = "";
  let foreignKid = "";
  let foreignSubject = "";
  let req: ReturnType<typeof inject>;
  beforeAll(async () => {
    a = await signedInFamily(pool, "Create A");
    b = await signedInFamily(pool, "Create B");
    req = inject(app, a.cookies);
    const r = await rosterFor(app, a.cookies, ["Frank", "Ada", "Old"], ["Math", "Latin"]);
    kids = r.childIds.slice(0, 2);
    subject = r.subjectIds[0]!;
    archivedKid = r.childIds[2]!;
    archivedSubject = r.subjectIds[1]!;
    await req("PATCH", `/api/children/${archivedKid}`, { archived: true });
    await req("PATCH", `/api/subjects/${archivedSubject}`, { archived: true });
    const f = await rosterFor(app, b.cookies, ["Theirs"], ["TheirMath"]);
    foreignKid = f.childIds[0]!;
    foreignSubject = f.subjectIds[0]!;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  const valid = () => ({
    subjectId: subject, title: "Saxon 5/4", unitType: "lessons", totalUnits: 20, weightPerUnit: 15,
    startDate: "2026-11-02", endDate: "2026-11-27", childIds: [kids[0]],
  });

  it("valid → 201 with the list shape, rows in assignment + assignment_child", async () => {
    const res = await req("POST", "/api/assignments", valid());
    expect(res.statusCode).toBe(201);
    const j = res.json();
    expect(j).toEqual({ id: expect.any(String), subjectId: subject, title: "Saxon 5/4", unitType: "lessons", totalUnits: 20, weightPerUnit: 15,
      startDate: "2026-11-02", endDate: "2026-11-27", childIds: [kids[0]], archived: false });
    const { rows } = await pool.query("SELECT family_id FROM assignment_child WHERE assignment_id = $1", [j.id]);
    expect(rows).toEqual([{ family_id: a.familyId }]);
    const list = (await req("GET", "/api/assignments")).json();
    expect(list.map((x: { id: string }) => x.id)).toContain(j.id);
  });

  it("two children → both linked (roster order); weightPerUnit omitted → null", async () => {
    const { weightPerUnit: _w, ...rest } = valid();
    const res = await req("POST", "/api/assignments", { ...rest, title: "Shared read-aloud", unitType: "pages", totalUnits: 200, childIds: [kids[1], kids[0]] });
    expect(res.statusCode).toBe(201);
    expect(res.json().childIds).toEqual(kids);
    expect(res.json().weightPerUnit).toBeNull();
  });

  it("appears in /api/plan for each child", async () => {
    const res = await req("POST", "/api/assignments", { ...valid(), title: "Plan me", childIds: kids });
    const id = res.json().id;
    const plan: PlanResponse = (await req("GET", "/api/plan?from=2026-11-02&to=2026-11-08&asOf=2026-11-02")).json();
    const mine = plan.plans.filter((p) => p.assignmentId === id);
    expect(mine.map((p) => p.childId).sort()).toEqual([...kids].sort());
    expect(mine[0]!.days.some((d) => d.thickness > 0)).toBe(true);
  });

  it("unknown keys (family_id, familyId, archived) → 400 naming them; nothing inserted (RF-09)", async () => {
    const count = async () => (await pool.query("SELECT count(*)::int AS n FROM assignment WHERE family_id = ANY($1::uuid[])", [[a.familyId, b.familyId]])).rows[0].n as number;
    const before = await count();
    const res = await req("POST", "/api/assignments", { ...valid(), title: "Keys", family_id: b.familyId, familyId: b.familyId, archived: true });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_request");
    expect(res.json().message).toMatch(/family_id/);
    expect(res.json().message).toMatch(/archived/);
    expect(await count()).toBe(before);
  });

  it.each([
    ["unknown subject", () => ({ subjectId: "00000000-0000-4000-8000-000000000000" })],
    ["archived subject", () => ({ subjectId: archivedSubject })],
    ["foreign subject", () => ({ subjectId: foreignSubject })],
    ["unknown child", () => ({ childIds: ["00000000-0000-4000-8000-000000000000"] })],
    ["archived child", () => ({ childIds: [kids[0], archivedKid] })],
    ["foreign child", () => ({ childIds: [foreignKid] })],
  ])("%s → 400 invalid_reference", async (_l, over) => {
    const before = (await pool.query("SELECT count(*)::int AS n FROM assignment WHERE family_id = $1", [a.familyId])).rows[0].n;
    const res = await req("POST", "/api/assignments", { ...valid(), ...over() });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_reference");
    const after = (await pool.query("SELECT count(*)::int AS n FROM assignment WHERE family_id = $1", [a.familyId])).rows[0].n;
    expect(after).toBe(before);
  });

  it.each([
    ["end before start", { endDate: "2026-11-01" }, "invalid_range"],
    ["span 1097 days", { startDate: "2026-01-01", endDate: "2029-01-01" }, "invalid_range"],
    ["totalUnits 0", { totalUnits: 0 }, "invalid_request"],
    ["totalUnits 100001", { totalUnits: 100001 }, "invalid_request"],
    ["totalUnits 1.234", { totalUnits: 1.234 }, "invalid_request"],
    ["totalUnits string", { totalUnits: "20" }, "invalid_request"],
    ["weightPerUnit 0", { weightPerUnit: 0 }, "invalid_request"],
    ["weightPerUnit 100.01", { weightPerUnit: 100.01 }, "invalid_request"],
    ["bad unitType", { unitType: "verses" }, "invalid_request"],
    ["bad date", { startDate: "11/02/2026" }, "invalid_request"],
    ["Feb 30", { endDate: "2027-02-30" }, "invalid_request"],
    ["year 1999", { startDate: "1999-12-31" }, "invalid_request"],
    ["no children", { childIds: [] }, "invalid_request"],
    ["malformed child id", { childIds: ["x"] }, "invalid_request"],
    ["missing subject", { subjectId: undefined }, "invalid_request"],
    ["malformed subject", { subjectId: "abc" }, "invalid_request"],
    ["blank title", { title: "  " }, "invalid_request"],
    ["NUL title", { title: "a\u0000" }, "invalid_request"],
  ])("%s → 400 %s", async (_l, over, code) => {
    const res = await req("POST", "/api/assignments", { ...valid(), ...over });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe(code);
  });

  it("totalUnits 1e309 in raw JSON (parses to Infinity) → 400", async () => {
    const raw = JSON.stringify(valid()).replace('"totalUnits":20', '"totalUnits":1e309');
    const res = await app.inject({ method: "POST", url: "/api/assignments", payload: raw, headers: { "content-type": "application/json" }, cookies: a.cookies });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_request");
  });

  it("the same child twice → 400 invalid_request", async () => {
    expect((await req("POST", "/api/assignments", { ...valid(), childIds: [kids[0], kids[0]] })).json().error).toBe("invalid_request");
  });

  it("21 children → 400", async () => {
    const ids = Array.from({ length: 21 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    expect((await req("POST", "/api/assignments", { ...valid(), childIds: ids })).statusCode).toBe(400);
  });

  it("signed out → 401", async () => {
    expect((await inject(app, null)("POST", "/api/assignments", valid())).statusCode).toBe(401);
  });
});
